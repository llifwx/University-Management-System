from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Room(Base):
    __tablename__ = "rooms"
    room_id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    building: Mapped[str | None] = mapped_column(String(80))
    capacity: Mapped[int | None]
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
