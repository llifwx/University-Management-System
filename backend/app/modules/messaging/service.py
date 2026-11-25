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
from app.modules.messaging import repository as messaging_repo
from app.modules.messaging.models import DirectMessage, MessageThread
from app.modules.messaging.schemas import ContactOut, DirectMessageOut

ATTACHMENTS_DIR = Path("media/direct_message_attachments")
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

    def connect(self, user_id: int, websocket: WebSocket) -> None:
        self._user_sockets[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        self._user_sockets.get(user_id, set()).discard(websocket)

    async def push(self, user_ids: tuple[int, int], payload: dict) -> None:
        sockets = [socket for user_id in user_ids for socket in self._user_sockets.get(user_id, ())]
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                pass  # The receive loop clears dead sockets on disconnect.


manager = ConnectionManager()


def _as_teacher_student(actor: UserOut, counterpart_id: int) -> tuple[int, int]:
    """Returns (teacher_id, student_id) for this actor/counterpart pair."""
    if actor.role == "STUDENT":
        return counterpart_id, actor.id
    if actor.role == "TEACHER":
        return actor.id, counterpart_id
    raise AppError(403, "FORBIDDEN", "Only teachers and students use direct messaging.")


async def _require_counterpart(db: AsyncSession, actor: UserOut, counterpart_id: int) -> User:
    expected_role = "TEACHER" if actor.role == "STUDENT" else "STUDENT"
    counterpart = await repo.require(db, User, counterpart_id)
    if counterpart.role != expected_role:
        raise AppError(
            400, "INVALID_COUNTERPART", f"The other participant must be a {expected_role.lower()}."
        )
    return counterpart


async def _contact_out(
    db: AsyncSession, actor: UserOut, counterpart: User, thread: MessageThread | None
) -> ContactOut:
    display_name = (
        await messaging_repo.display_name_for(db, counterpart.id)
        if counterpart.role == "STUDENT"
        else counterpart.full_name
    )
    unread = False
    if thread is not None:
        unread = thread.teacher_unread if actor.role == "TEACHER" else thread.student_unread
    return ContactOut(
        user_id=counterpart.id,
        email=counterpart.email,
        role=counterpart.role,
        display_name=display_name,
        thread_id=thread.id if thread else None,
        last_message_at=thread.last_message_at if thread else None,
        unread=unread,
    )


async def list_contacts(actor: UserOut, offset: int, limit: int) -> Page[ContactOut]:
    async def operation(db: AsyncSession):
        if actor.role == "STUDENT":
            counterparts = await messaging_repo.teachers_for_student(db, actor.id)
        elif actor.role == "TEACHER":
            counterparts = await messaging_repo.students_for_teacher(db, actor.id)
        else:
            raise AppError(403, "FORBIDDEN", "Only teachers and students use direct messaging.")

        contacts = []
        for counterpart in counterparts:
            teacher_id, student_id = _as_teacher_student(actor, counterpart.id)
            thread = await messaging_repo.thread_between(db, teacher_id, student_id)
            contacts.append(await _contact_out(db, actor, counterpart, thread))

        # Stable sort twice: conversations with history first (most recent on top), then
        # contacts with no thread yet, alphabetically.
        contacts.sort(key=lambda c: c.display_name or c.email)
        contacts.sort(
            key=lambda c: c.last_message_at or datetime.min.replace(tzinfo=UTC), reverse=True
        )
        total = len(contacts)
        return Page[ContactOut](
            items=contacts[offset : offset + limit], total=total, offset=offset, limit=limit
        )

    return await transact(operation)


async def list_messages(
    actor: UserOut, counterpart_id: int, offset: int, limit: int
) -> Page[DirectMessageOut]:
    async def operation(db: AsyncSession):
        await _require_counterpart(db, actor, counterpart_id)
        teacher_id, student_id = _as_teacher_student(actor, counterpart_id)
        thread = await messaging_repo.thread_between(db, teacher_id, student_id)
        if thread is None:
            return Page[DirectMessageOut](items=[], total=0, offset=offset, limit=limit)
        total = (
            await db.scalar(
                select(func.count())
                .select_from(DirectMessage)
                .where(DirectMessage.thread_id == thread.id)
            )
        ) or 0
        rows = await db.scalars(
            select(DirectMessage)
            .where(DirectMessage.thread_id == thread.id)
            .order_by(DirectMessage.created_at)
            .offset(offset)
            .limit(limit)
        )
        items = [DirectMessageOut.model_validate(row) for row in rows]
        return Page[DirectMessageOut](items=items, total=total, offset=offset, limit=limit)

    return await transact(operation)


async def send_message(
    actor: UserOut, counterpart_id: int, body: str | None, file: UploadFile | None
) -> DirectMessageOut:
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
        await _require_counterpart(db, actor, counterpart_id)
        teacher_id, student_id = _as_teacher_student(actor, counterpart_id)
        thread = await messaging_repo.thread_between(db, teacher_id, student_id, lock=True)
        if thread is None:
            if not await messaging_repo.is_eligible_pair(db, teacher_id, student_id):
                raise AppError(
                    403,
                    "NOT_A_TEACHER_OR_STUDENT_OF",
                    "This person is not one of your teachers or students.",
                )
            now = datetime.now(UTC)
            thread = MessageThread(
                teacher_id=teacher_id,
                student_id=student_id,
                last_message_at=now,
                teacher_last_read_at=now if actor.role == "TEACHER" else None,
                student_last_read_at=now if actor.role == "STUDENT" else None,
            )
            db.add(thread)
            await db.flush()
        message = DirectMessage(thread_id=thread.id, sender_id=actor.id, body=text)
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
        if actor.role == "TEACHER":
            thread.teacher_last_read_at = now
        else:
            thread.student_last_read_at = now
        await db.flush()
        await db.refresh(message, attribute_names=["sender"])
        return DirectMessageOut.model_validate(message), thread.teacher_id, thread.student_id

    message_out, teacher_id, student_id = await transact(operation)
    await manager.push(
        (teacher_id, student_id),
        {
            "type": "message",
            "message": message_out.model_dump(mode="json"),
            "counterpart_id": actor.id,
        },
    )
    return message_out


async def mark_read(actor: UserOut, counterpart_id: int) -> dict:
    async def operation(db: AsyncSession):
        teacher_id, student_id = _as_teacher_student(actor, counterpart_id)
        thread = await messaging_repo.thread_between(db, teacher_id, student_id, lock=True)
        if thread is None:
            return {"message": "No messages yet."}
        now = datetime.now(UTC)
        if actor.role == "TEACHER":
            thread.teacher_last_read_at = now
        else:
            thread.student_last_read_at = now
        return {"message": "Marked as read."}

    return await transact(operation)


async def attachment_path_for(actor: UserOut, message_id: int) -> tuple[Path, str]:
    async def operation(db: AsyncSession):
        message = await repo.require(db, DirectMessage, message_id)
        thread = await repo.require(db, MessageThread, message.thread_id)
        if actor.id not in (thread.teacher_id, thread.student_id):
            raise AppError(403, "FORBIDDEN", "Cannot view this attachment.")
        if not message.attachment_path:
            raise AppError(404, "ATTACHMENT_NOT_FOUND", "This message has no attachment.")
        return message.attachment_path, message.attachment_name or message.attachment_path

    filename, display_name = await transact(operation)
    return ATTACHMENTS_DIR / filename, display_name
