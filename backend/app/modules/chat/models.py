from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.auth.models import User


class ChatThread(Base):
    """One support thread per non-admin user; any admin may read and reply."""

    __tablename__ = "chat_threads"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    user_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    admin_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user: Mapped[User] = relationship(lazy="selectin")

    @property
    def user_unread(self) -> bool:
        return self.user_last_read_at is None or self.user_last_read_at < self.last_message_at

    @property
    def admin_unread(self) -> bool:
        return self.admin_last_read_at is None or self.admin_last_read_at < self.last_message_at


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        CheckConstraint(
            "body IS NOT NULL OR attachment_path IS NOT NULL", name="has_content"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("chat_threads.id", ondelete="CASCADE"), index=True
    )
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str | None] = mapped_column(Text)
    # Filename only (e.g. "42.pdf") relative to the chat attachments directory; never exposed as-is.
    attachment_path: Mapped[str | None] = mapped_column(String(255))
    attachment_name: Mapped[str | None] = mapped_column(String(255))
    attachment_content_type: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sender: Mapped[User] = relationship(lazy="selectin")

    @property
    def sender_role(self) -> str:
        return self.sender.role

    @property
    def attachment_url(self) -> str | None:
        return f"/chat/messages/{self.id}/attachment" if self.attachment_path else None
