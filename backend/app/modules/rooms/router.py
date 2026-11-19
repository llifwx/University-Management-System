from fastapi import APIRouter

from app.api.deps import Admin, CurrentUser, Limit, Offset
from app.common.schemas import Page
from app.modules.rooms.schemas import RoomCreate, RoomOut, RoomPatch
from app.modules.rooms.service import catalog

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("", response_model=Page[RoomOut])
async def list_rooms(user: CurrentUser, offset: Offset = 0, limit: Limit = 20):
    return await catalog.list(offset, limit)


@router.get("/{room_id}", response_model=RoomOut)
async def get_room(room_id: int, user: CurrentUser):
    return await catalog.get(room_id)


@router.post("", response_model=RoomOut, status_code=201)
async def create_room(payload: RoomCreate, admin: Admin):
    return await catalog.create(payload)


@router.patch("/{room_id}", response_model=RoomOut)
async def patch_room(room_id: int, payload: RoomPatch, admin: Admin):
    return await catalog.patch(room_id, payload)


@router.delete("/{room_id}")
async def delete_room(room_id: int, admin: Admin):
    return await catalog.delete(room_id)
