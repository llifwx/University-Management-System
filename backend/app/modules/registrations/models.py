from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Registration(Base):
    __tablename__ = "registrations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["section_id", "semester_id"],
            ["course_sections.section_id", "course_sections.semester_id"],
            name="fk_registration_section_semester",
        ),
        UniqueConstraint("student_id", "section_id", "semester_id"),
        CheckConstraint(
            "status IN ('Pending','Enrolled','Rejected','Cancelled')",
            name="status",
        ),
        Index("ix_registration_schedule", "student_id", "semester_id", "status"),
        Index("ix_registration_seats", "section_id", "status"),
    )
    registration_id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.student_id"), index=True)
    section_id: Mapped[int] = mapped_column(Integer)
    semester_id: Mapped[int] = mapped_column(ForeignKey("semesters.semester_id"), index=True)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    status: Mapped[str] = mapped_column(String(10), default="Enrolled", server_default="Enrolled")
