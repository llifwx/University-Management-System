from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, Limit, Offset, TeacherOrStudent
from app.common.schemas import Page
from app.modules.messaging import service
from app.modules.messaging.schemas import ContactOut, DirectMessageOut, MessagingTicketOut

router = APIRouter(prefix="/messaging", tags=["Direct messaging"])


@router.get("/contacts", response_model=Page[ContactOut])
async def list_contacts(user: TeacherOrStudent, offset: Offset = 0, limit: Limit = 50):
    return await service.list_contacts(user, offset, limit)


@router.get("/with/{counterpart_id}/messages", response_model=Page[DirectMessageOut])
async def messages_with(
    counterpart_id: int, user: TeacherOrStudent, offset: Offset = 0, limit: Limit = 50
):
    return await service.list_messages(user, counterpart_id, offset, limit)


@router.post("/with/{counterpart_id}/messages", response_model=DirectMessageOut, status_code=201)
async def send_message_to(
    counterpart_id: int,
    user: TeacherOrStudent,
    body: Annotated[str | None, Form()] = None,
    file: UploadFile | None = File(default=None),
):
    return await service.send_message(user, counterpart_id, body, file)


@router.post("/with/{counterpart_id}/read")
async def mark_thread_read(counterpart_id: int, user: TeacherOrStudent):
    return await service.mark_read(user, counterpart_id)


@router.post("/ws-ticket", response_model=MessagingTicketOut)
async def create_ws_ticket(user: TeacherOrStudent):
    return MessagingTicketOut(ticket=service.issue_ticket(user.id), expires_in=30)


@router.get("/messages/{message_id}/attachment")
async def get_attachment(message_id: int, user: CurrentUser):
    path, filename = await service.attachment_path_for(user, message_id)
    return FileResponse(path, filename=filename)


@router.websocket("/ws")
async def messaging_ws(websocket: WebSocket):
    ticket = websocket.query_params.get("ticket")
    user = await service.authenticate_ticket(ticket) if ticket else None
    if user is None or user.role not in ("TEACHER", "STUDENT"):
        await websocket.close(code=4401)
        return
    await websocket.accept()
    service.manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        service.manager.disconnect(user.id, websocket)
