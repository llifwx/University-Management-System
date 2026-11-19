from app.common.service import CatalogService
from app.modules.rooms.models import Room
from app.modules.rooms.schemas import RoomOut

catalog = CatalogService(Room, RoomOut, nullable={"building", "capacity"})
