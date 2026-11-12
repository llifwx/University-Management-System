import secrets
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import UploadFile, WebSocket
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.schemas import Page
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.db.session import SessionFactory
from app.models import User
from app.modules.auth.schemas import UserOut
from app.modules.chat import repository as chat_repo
from app.modules.chat.models import ChatMessage, ChatThread
from app.modules.chat.schemas import MessageOut, ThreadOut

ATTACHMENTS_DIR = Path("media/chat_attachments")
MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024
ATTACHMENT_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
}

TICKET_TTL = timedelta(seconds=30)
_tickets: dict[str, tuple[int, datetime]] = {}


def issue_ticket(user_id: int) -> str:
    ticket = secrets.token_urlsafe(32)
    _tickets[ticket] = (user_id, datetime.now(UTC) + TICKET_TTL)
    return ticket


def _consume_ticket(ticket: str) -> int | None:
    entry = _tickets.pop(ticket, None)
    if entry is None:
        return None
    user_id, expires_at = entry
    if expires_at < datetime.now(UTC):
        return None
    return user_id


async def authenticate_ticket(ticket: str) -> UserOut | None:
    user_id = _consume_ticket(ticket)
    if user_id is None:
        return None
    async with SessionFactory() as db:
        user = await db.get(User, user_id)
        if not user or not user.is_active:
            return None
        return UserOut.model_validate(user)


class ConnectionManager:
    """In-process registry; a single backend replica is assumed (see compose.yaml)."""

    def __init__(self) -> None:
        self._user_sockets: dict[int, set[WebSocket]] = defaultdict(set)
        self._admin_sockets: set[WebSocket] = set()

    def connect(self, user: UserOut, websocket: WebSocket) -> None:
        if user.role == "ADMIN":
            self._admin_sockets.add(websocket)
        else:
            self._user_sockets[user.id].add(websocket)

    def disconnect(self, user: UserOut, websocket: WebSocket) -> None:
        if user.role == "ADMIN":
            self._admin_sockets.discard(websocket)
        else:
            self._user_sockets.get(user.id, set()).discard(websocket)

    async def push(self, thread_user_id: int, payload: dict) -> None:
        sockets = [*self._user_sockets.get(thread_user_id, ()), *self._admin_sockets]
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                pass  # The receive loop clears dead sockets on disconnect.


manager = ConnectionManager()


def _thread_out(thread: ChatThread, display_name: str | None) -> ThreadOut:
    return ThreadOut(
        id=thread.id,
        user_id=thread.user_id,
        user_email=thread.user.email,
        user_role=thread.user.role,
        display_name=display_name,
        created_at=thread.created_at,
        last_message_at=thread.last_message_at,
        user_unread=thread.user_unread,
        admin_unread=thread.admin_unread,
    )


async def _get_or_create_thread(
    db: AsyncSession, actor: UserOut, thread_id: int | None
) -> ChatThread:
    if thread_id is not None:
        if actor.role != "ADMIN":
            raise AppError(403, "FORBIDDEN", "Only admins can reply in another user's thread.")
        return await repo.require(db, ChatThread, thread_id, lock=True)
    if actor.role == "ADMIN":
        raise AppError(400, "ADMIN_HAS_NO_THREAD", "Admins reply within an existing thread.")
    thread = await db.scalar(
        select(ChatThread).where(ChatThread.user_id == actor.id).with_for_update()
    )
    if thread is None:
        user = await repo.require(db, User, actor.id)
        now = datetime.now(UTC)
        # Nothing to read yet: both sides start "caught up" instead of falsely unread.
        thread = ChatThread(
            user_id=actor.id,
            user=user,
            last_message_at=now,
            user_last_read_at=now,
            admin_last_read_at=now,
        )
        db.add(thread)
        await db.flush()
    return thread


async def get_or_create_my_thread(actor: UserOut) -> ThreadOut:
    async def operation(db: AsyncSession):
        thread = await _get_or_create_thread(db, actor, None)
        display_name = await chat_repo.display_name_for(db, thread.user_id)
        return _thread_out(thread, display_name)

    return await transact(operation)


async def list_threads(offset: int, limit: int) -> Page[ThreadOut]:
    async def operation(db: AsyncSession):
        total = await db.scalar(select(func.count()).select_from(ChatThread)) or 0
        rows = await db.scalars(
            select(ChatThread).order_by(ChatThread.last_message_at.desc()).offset(offset).limit(limit)
        )
        items = []
        for thread in rows:
            display_name = await chat_repo.display_name_for(db, thread.user_id)
            items.append(_thread_out(thread, display_name))
        return Page[ThreadOut](items=items, total=total, offset=offset, limit=limit)

    return await transact(operation)


async def _list_messages(thread_id: int, offset: int, limit: int) -> Page[MessageOut]:
    async def operation(db: AsyncSession):
        await repo.require(db, ChatThread, thread_id)
        count_query = select(func.count()).select_from(ChatMessage).where(
            ChatMessage.thread_id == thread_id
        )
        total = await db.scalar(count_query) or 0
        rows = await db.scalars(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at)
            .offset(offset)
            .limit(limit)
        )
        items = [MessageOut.model_validate(row) for row in rows]
        return Page[MessageOut](items=items, total=total, offset=offset, limit=limit)

    return await transact(operation)


async def list_my_messages(actor: UserOut, offset: int, limit: int) -> Page[MessageOut]:
    thread = await get_or_create_my_thread(actor)
    return await _list_messages(thread.id, offset, limit)


async def list_thread_messages(thread_id: int, offset: int, limit: int) -> Page[MessageOut]:
    return await _list_messages(thread_id, offset, limit)


async def send_message(
    actor: UserOut, thread_id: int | None, body: str | None, file: UploadFile | None
) -> MessageOut:
    text = (body or "").strip() or None
    content: bytes | None = None
    extension: str | None = None
    original_name: str | None = None
    content_type: str | None = None
    if file is not None and file.filename:
        content_type = file.content_type or ""
        extension = ATTACHMENT_EXTENSIONS.get(content_type)
        if extension is None:
            raise AppError(
                415, "UNSUPPORTED_MEDIA_TYPE", "Attach a JPEG, PNG, WebP, GIF image or PDF."
            )
        content = await file.read()
        if not content:
            raise AppError(422, "EMPTY_FILE", "The uploaded file is empty.")
        if len(content) > MAX_ATTACHMENT_BYTES:
            raise AppError(413, "FILE_TOO_LARGE", "Attachments must be 15 MB or smaller.")
        original_name = file.filename
    if text is None and content is None:
        raise AppError(422, "EMPTY_MESSAGE", "Write a message or attach a file.")

    async def operation(db: AsyncSession):
        thread = await _get_or_create_thread(db, actor, thread_id)
        message = ChatMessage(thread_id=thread.id, sender_id=actor.id, body=text)
        db.add(message)
        await db.flush()
        if content is not None:
            ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
            filename = f"{message.id}.{extension}"
            (ATTACHMENTS_DIR / filename).write_bytes(content)
            message.attachment_path = filename
            message.attachment_name = original_name
            message.attachment_content_type = content_type
        now = datetime.now(UTC)
        thread.last_message_at = now
        if actor.role == "ADMIN":
            thread.admin_last_read_at = now
        else:
            thread.user_last_read_at = now
        await db.flush()
        await db.refresh(message, attribute_names=["sender"])
        message_out = MessageOut.model_validate(message)
        display_name = await chat_repo.display_name_for(db, thread.user_id)
        return message_out, _thread_out(thread, display_name)

    message_out, thread_out = await transact(operation)
    await manager.push(
        thread_out.user_id,
        {
            "type": "message",
            "message": message_out.model_dump(mode="json"),
            "thread": thread_out.model_dump(mode="json"),
        },
    )
    return message_out


async def mark_read(actor: UserOut, thread_id: int | None) -> dict:
    async def operation(db: AsyncSession):
        now = datetime.now(UTC)
        if thread_id is None:
            thread = await db.scalar(
                select(ChatThread).where(ChatThread.user_id == actor.id).with_for_update()
            )
            if thread is None:
                return {"message": "No messages yet."}
            thread.user_last_read_at = now
        else:
            if actor.role != "ADMIN":
                raise AppError(403, "FORBIDDEN", "Admins only.")
            thread = await repo.require(db, ChatThread, thread_id, lock=True)
            thread.admin_last_read_at = now
        return {"message": "Marked as read."}

    return await transact(operation)


async def attachment_path_for(actor: UserOut, message_id: int) -> tuple[Path, str]:
    async def operation(db: AsyncSession):
        message = await repo.require(db, ChatMessage, message_id)
        thread = await repo.require(db, ChatThread, message.thread_id)
        if actor.role != "ADMIN" and thread.user_id != actor.id:
            raise AppError(403, "FORBIDDEN", "Cannot view this attachment.")
        if not message.attachment_path:
            raise AppError(404, "ATTACHMENT_NOT_FOUND", "This message has no attachment.")
        return message.attachment_path, message.attachment_name or message.attachment_path

    filename, display_name = await transact(operation)
    return ATTACHMENTS_DIR / filename, display_name
