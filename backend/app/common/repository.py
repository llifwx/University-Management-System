from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError

# Shared during enrollment/cancellation; exclusive during administrative writes.
ACADEMIC_LOCK = 726491203


async def academic_lock(db: AsyncSession, *, exclusive: bool = False) -> None:
    function = "pg_advisory_xact_lock" if exclusive else "pg_advisory_xact_lock_shared"
    await db.execute(text(f"SELECT {function}(:key)"), {"key": ACADEMIC_LOCK})


async def require(db: AsyncSession, model: Any, identity: int, *, lock: bool = False):
    pk = list(model.__table__.primary_key)[0]
    query = select(model).where(pk == identity)
    if lock:
        query = query.with_for_update()
    entity = await db.scalar(query)
    if entity is None:
        raise AppError(404, "NOT_FOUND", f"{model.__name__} not found.")
    return entity


async def page(db: AsyncSession, model: Any, offset: int, limit: int):
    pk = list(model.__table__.primary_key)[0]
    total = await db.scalar(select(func.count()).select_from(model)) or 0
    rows = await db.scalars(select(model).order_by(pk).offset(offset).limit(limit))
    return list(rows), total
