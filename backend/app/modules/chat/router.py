from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from app.api.deps import Admin, CurrentUser, Limit, Offset
from app.common.schemas import Page
from app.modules.chat import service
from app.modules.chat.schemas import MessageOut, ThreadOut, TicketOut

router = APIRouter(prefix="/chat", tags=["Support chat"])


@router.get("/threads/me", response_model=ThreadOut)
async def my_thread(user: CurrentUser):
    return await service.get_or_create_my_thread(user)


@router.get("/threads/me/messages", response_model=Page[MessageOut])
async def my_messages(user: CurrentUser, offset: Offset = 0, limit: Limit = 50):
    return await service.list_my_messages(user, offset, limit)


@router.post("/threads/me/messages", response_model=MessageOut, status_code=201)
async def send_my_message(
    user: CurrentUser,
    body: Annotated[str | None, Form()] = None,
    file: UploadFile | None = File(default=None),
):
    return await service.send_message(user, None, body, file)


@router.post("/threads/me/read")
async def mark_my_thread_read(user: CurrentUser):
    return await service.mark_read(user, None)


@router.post("/ws-ticket", response_model=TicketOut)
async def create_ws_ticket(user: CurrentUser):
    return TicketOut(ticket=service.issue_ticket(user.id), expires_in=30)


@router.get("/threads", response_model=Page[ThreadOut])
async def list_threads(admin: Admin, offset: Offset = 0, limit: Limit = 50):
    return await service.list_threads(offset, limit)


@router.get("/threads/{thread_id}/messages", response_model=Page[MessageOut])
async def thread_messages(thread_id: int, admin: Admin, offset: Offset = 0, limit: Limit = 50):
    return await service.list_thread_messages(thread_id, offset, limit)


@router.post("/threads/{thread_id}/messages", response_model=MessageOut, status_code=201)
async def reply_to_thread(
    thread_id: int,
    admin: Admin,
    body: Annotated[str | None, Form()] = None,
    file: UploadFile | None = File(default=None),
):
    return await service.send_message(admin, thread_id, body, file)


@router.post("/threads/{thread_id}/read")
async def mark_thread_read(thread_id: int, admin: Admin):
    return await service.mark_read(admin, thread_id)


@router.get("/messages/{message_id}/attachment")
async def get_attachment(message_id: int, user: CurrentUser):
    path, filename = await service.attachment_path_for(user, message_id)
    return FileResponse(path, filename=filename)


@router.websocket("/ws")
async def chat_ws(websocket: WebSocket):
    ticket = websocket.query_params.get("ticket")
    user = await service.authenticate_ticket(ticket) if ticket else None
    if user is None:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    service.manager.connect(user, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        service.manager.disconnect(user, websocket)
