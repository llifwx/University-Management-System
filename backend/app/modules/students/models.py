from datetime import date

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    SmallInteger,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.auth.models import User


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint("year_level BETWEEN 1 AND 8", name="year_level"),
        CheckConstraint("student_number ~ '^[0-9]{2}ID[0-9]{6}$'", name="student_number_format"),
        CheckConstraint("gender IN ('MALE','FEMALE')", name="gender"),
        CheckConstraint(
            "marital_status IN ('SINGLE','MARRIED','DIVORCED','WIDOWED')", name="marital_status"
        ),
    )
    # Internal key for foreign keys; people see student_number instead.
    student_id: Mapped[int] = mapped_column(primary_key=True)
    # YY (enrollment year) + "ID" + 6 random digits, e.g. 24ID583019. Never changes.
    student_number: Mapped[str] = mapped_column(String(10), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    last_name: Mapped[str] = mapped_column(String(100))
    first_name: Mapped[str] = mapped_column(String(100))
    patronymic: Mapped[str | None] = mapped_column(String(100))
    program: Mapped[str | None] = mapped_column(String(80))
    year_level: Mapped[int] = mapped_column(SmallInteger)
    phone_number: Mapped[str | None] = mapped_column(String(20))
    # Filename only (e.g. "42.jpg") relative to the avatars directory; never exposed as-is.
    photo_path: Mapped[str | None] = mapped_column(String(255))
    birth_date: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(10))
    marital_status: Mapped[str | None] = mapped_column(String(10))
    nationality: Mapped[str | None] = mapped_column(String(80))
    citizenship: Mapped[str | None] = mapped_column(String(80))
    is_resident: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    personal_email: Mapped[str | None] = mapped_column(String(150))
    needs_dormitory: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    admission_year: Mapped[str | None] = mapped_column(String(9))
    advisor: Mapped[str | None] = mapped_column(String(100))
    study_form: Mapped[str | None] = mapped_column(String(80))
    winter_admission: Mapped[bool | None] = mapped_column(Boolean)
    user: Mapped[User] = relationship(lazy="selectin")

    @property
    def email(self) -> str:
        return self.user.email

    @property
    def full_name(self) -> str:
        parts = [self.last_name, self.first_name]
        if self.patronymic:
            parts.append(self.patronymic)
        return " ".join(parts)

    @property
    def photo_url(self) -> str | None:
        return f"/students/{self.student_id}/photo" if self.photo_path else None
