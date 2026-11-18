from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
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
        CheckConstraint("attestation_1 BETWEEN 0 AND 30", name="attestation_1"),
        CheckConstraint("attestation_2 BETWEEN 0 AND 30", name="attestation_2"),
        CheckConstraint("final_exam BETWEEN 0 AND 40", name="final_exam"),
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
    # Points out of 30 + 30 + 40; the total and letter grade are derived, never stored.
    attestation_1: Mapped[float | None] = mapped_column(Numeric(5, 2, asdecimal=False))
    attestation_2: Mapped[float | None] = mapped_column(Numeric(5, 2, asdecimal=False))
    final_exam: Mapped[float | None] = mapped_column(Numeric(5, 2, asdecimal=False))
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    graded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
