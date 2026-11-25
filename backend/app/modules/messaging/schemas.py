from datetime import datetime

from app.common.schemas import Output
from app.models import Role


class ContactOut(Output):
    user_id: int
    email: str
    role: Role
    display_name: str | None
    thread_id: int | None
    last_message_at: datetime | None
    unread: bool


class DirectMessageOut(Output):
    id: int
    thread_id: int
    sender_id: int
    sender_role: Role
    body: str | None
    attachment_url: str | None
    attachment_name: str | None
    attachment_content_type: str | None
    created_at: datetime


class MessagingTicketOut(Output):
    ticket: str
    expires_in: int
