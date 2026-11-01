from datetime import datetime, time

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseSection(Base):
    __tablename__ = "course_sections"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="capacity"),
        UniqueConstraint("course_id", "semester_id", "section_number"),
        UniqueConstraint("section_id", "semester_id", name="uq_section_semester"),
    )
    section_id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.course_id"), index=True)
    semester_id: Mapped[int] = mapped_column(ForeignKey("semesters.semester_id"), index=True)
    section_number: Mapped[str] = mapped_column(String(20))
    capacity: Mapped[int]
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    meetings: Mapped[list["SectionMeeting"]] = relationship(
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="SectionMeeting.id",
    )


class SectionMeeting(Base):
    __tablename__ = "section_meetings"
    __table_args__ = (
        CheckConstraint("meeting_day BETWEEN 0 AND 6", name="weekday"),
        CheckConstraint("start_time < end_time", name="time_interval"),
        UniqueConstraint("section_id", "meeting_day", "start_time", "end_time"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("course_sections.section_id", ondelete="CASCADE"),
        index=True,
    )
    meeting_day: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[time]
    end_time: Mapped[time]
