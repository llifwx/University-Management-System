from pydantic import Field

from app.common.schemas import Input, Output


class RoomCreate(Input):
    code: str = Field(min_length=1, max_length=20)
    building: str | None = Field(default=None, max_length=80)
    capacity: int | None = Field(default=None, gt=0)
    is_active: bool = True


class RoomPatch(Input):
    code: str | None = Field(default=None, min_length=1, max_length=20)
    building: str | None = Field(default=None, max_length=80)
    capacity: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


class RoomOut(Output):
    room_id: int
    code: str
    building: str | None
    capacity: int | None
    is_active: bool
