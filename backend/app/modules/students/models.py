from sqlalchemy import (
    CheckConstraint,
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
    )
    # Internal key for foreign keys; people see student_number instead.
    student_id: Mapped[int] = mapped_column(primary_key=True)
    # YY (enrollment year) + "ID" + 6 random digits, e.g. 24ID583019. Never changes.
    student_number: Mapped[str] = mapped_column(String(10), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    full_name: Mapped[str] = mapped_column(String(100))
    program: Mapped[str | None] = mapped_column(String(80))
    year_level: Mapped[int] = mapped_column(SmallInteger)
    user: Mapped[User] = relationship(lazy="selectin")

    @property
    def email(self) -> str:
        return self.user.email
