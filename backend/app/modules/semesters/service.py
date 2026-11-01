from sqlalchemy.ext.asyncio import AsyncSession

from app.common.service import CatalogService
from app.core.exceptions import AppError
from app.modules.semesters.models import Semester
from app.modules.semesters.schemas import SemesterOut


class SemesterService(CatalogService):
    async def validate_patch(self, db: AsyncSession, entity: Semester, data: dict) -> None:
        if data.get("start_date", entity.start_date) >= data.get("end_date", entity.end_date):
            raise AppError(400, "INVALID_INTERVAL", "Semester start must precede end.")


catalog = SemesterService(Semester, SemesterOut)
