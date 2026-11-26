from datetime import date, datetime, time

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

STATUSES = ("PRESENT", "LATE", "ABSENT")


class Attendance(Base):
    """One mark per student per class (section meeting on a date).

    Keyed by date + start time rather than the meeting row: section edits recreate meetings,
    and attendance history must survive that.
    """

    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("registration_id", "class_date", "start_time"),
        CheckConstraint("status IN ('PRESENT','LATE','ABSENT')", name="status"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    registration_id: Mapped[int] = mapped_column(
        ForeignKey("registrations.registration_id", ondelete="CASCADE"), index=True
    )
    class_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time]
    end_time: Mapped[time]
    status: Mapped[str] = mapped_column(String(7))
    marked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    marked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
