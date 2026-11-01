import asyncio
import random
from collections.abc import Awaitable, Callable
from typing import TypeVar

from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.db.session import SessionFactory

T = TypeVar("T")


async def transact[T](operation: Callable[[AsyncSession], Awaitable[T]]) -> T:
    """Retry the entire unit of work on PostgreSQL deadlock/serialization failure."""
    for attempt in range(3):
        try:
            async with SessionFactory() as db, db.begin():
                return await operation(db)
        except DBAPIError as exc:
            code = getattr(exc.orig, "sqlstate", None)
            if code not in {"40001", "40P01"}:
                raise
            if attempt == 2:
                raise AppError(
                    409, "TRANSACTION_RETRY", "Concurrent change; retry request."
                ) from exc
            await asyncio.sleep(random.uniform(0.02, 0.08) * (attempt + 1))
    raise AssertionError("unreachable")
