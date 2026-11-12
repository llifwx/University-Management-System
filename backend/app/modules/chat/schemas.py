from datetime import datetime

from app.common.schemas import Output
from app.models import Role


class ThreadOut(Output):
    id: int
    user_id: int
    user_email: str
    user_role: Role
    display_name: str | None
    created_at: datetime
    last_message_at: datetime
    user_unread: bool
    admin_unread: bool


class MessageOut(Output):
    id: int
    thread_id: int
    sender_id: int
    sender_role: Role
    body: str | None
    attachment_url: str | None
    attachment_name: str | None
    attachment_content_type: str | None
    created_at: datetime


class TicketOut(Output):
    ticket: str
    expires_in: int
