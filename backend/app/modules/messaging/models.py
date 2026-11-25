from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.auth.models import User


class MessageThread(Base):
    """One direct-message thread per (teacher, student) pair; each side is a specific user."""

    __tablename__ = "message_threads"
    __table_args__ = (UniqueConstraint("teacher_id", "student_id", name="uq_message_threads_pair"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    teacher_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    student_last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def teacher_unread(self) -> bool:
        return self.teacher_last_read_at is None or self.teacher_last_read_at < self.last_message_at

    @property
    def student_unread(self) -> bool:
        return self.student_last_read_at is None or self.student_last_read_at < self.last_message_at


class DirectMessage(Base):
    __tablename__ = "direct_messages"
    __table_args__ = (
        CheckConstraint("body IS NOT NULL OR attachment_path IS NOT NULL", name="has_content"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("message_threads.id", ondelete="CASCADE"), index=True
    )
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str | None] = mapped_column(Text)
    # Filename only (e.g. "42.pdf") relative to the attachments directory; never exposed as-is.
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
        return f"/messaging/messages/{self.id}/attachment" if self.attachment_path else None
