from typing import Any

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.schemas import Page
from app.common.transactions import transact
from app.core.exceptions import AppError


def values(payload: BaseModel, nullable: set[str] | None = None) -> dict:
    result = payload.model_dump(exclude_unset=True)
    for key, value in result.items():
        if value is None and key not in (nullable or set()):
            raise AppError(422, "NULL_NOT_ALLOWED", f"{key} cannot be null.")
    return result


class CatalogService:
    """Shared CRUD mechanics; each domain declares its own model and output contract."""

    def __init__(self, model: Any, output: Any, nullable: set[str] | None = None):
        self.model, self.output, self.nullable = model, output, nullable

    async def validate_patch(self, db: AsyncSession, entity: Any, data: dict) -> None:
        """Domain services override this hook for cross-field validation."""

    async def list(self, offset: int, limit: int):
        async def operation(db: AsyncSession):
            rows, total = await repo.page(db, self.model, offset, limit)
            return Page[self.output](
                items=[self.output.model_validate(row) for row in rows],
                total=total or 0,
                offset=offset,
                limit=limit,
            )

        return await transact(operation)

    async def get(self, identity: int):
        async def operation(db: AsyncSession):
            return self.output.model_validate(await repo.require(db, self.model, identity))

        return await transact(operation)

    async def create(self, payload: BaseModel):
        async def operation(db: AsyncSession):
            await repo.academic_lock(db, exclusive=True)
            entity = self.model(**payload.model_dump())
            db.add(entity)
            await db.flush()
            return self.output.model_validate(entity)

        return await transact(operation)

    async def patch(self, identity: int, payload: BaseModel):
        async def operation(db: AsyncSession):
            await repo.academic_lock(db, exclusive=True)
            entity = await repo.require(db, self.model, identity, lock=True)
            data = values(payload, self.nullable)
            await self.validate_patch(db, entity, data)
            for key, value in data.items():
                setattr(entity, key, value)
            await db.flush()
            return self.output.model_validate(entity)

        return await transact(operation)

    async def delete(self, identity: int):
        async def operation(db: AsyncSession):
            await repo.academic_lock(db, exclusive=True)
            entity = await repo.require(db, self.model, identity, lock=True)
            await db.delete(entity)
            await db.flush()
            return {"message": f"{self.model.__name__} deleted."}

        return await transact(operation)
