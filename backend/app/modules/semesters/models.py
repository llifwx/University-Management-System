from datetime import date

from sqlalchemy import (
    CheckConstraint,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Semester(Base):
    __tablename__ = "semesters"
    __table_args__ = (CheckConstraint("start_date < end_date", name="date_interval"),)
    semester_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    start_date: Mapped[date]
    end_date: Mapped[date]
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
