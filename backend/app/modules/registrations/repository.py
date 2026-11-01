from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.registrations.models import Registration


async def existing(
    db: AsyncSession,
    student_id: int,
    section_id: int,
    semester_id: int,
) -> Registration | None:
    return await db.scalar(
        select(Registration).where(
            Registration.student_id == student_id,
            Registration.section_id == section_id,
            Registration.semester_id == semester_id,
        )
    )


async def section_history_count(db: AsyncSession, section_id: int) -> int:
    return (
        await db.scalar(
            select(func.count())
            .select_from(Registration)
            .where(
                Registration.section_id == section_id,
            )
        )
        or 0
    )


async def student_registrations(db: AsyncSession, student_id: int) -> list[Registration]:
    return list(await db.scalars(select(Registration).where(Registration.student_id == student_id)))


async def registration_page(
    db: AsyncSession,
    offset: int,
    limit: int,
    student_id: int | None = None,
    semester_id: int | None = None,
    section_id: int | None = None,
) -> tuple[list[Registration], int]:
    query = select(Registration)
    for name, value in {
        "student_id": student_id,
        "semester_id": semester_id,
        "section_id": section_id,
    }.items():
        if value is not None:
            query = query.where(getattr(Registration, name) == value)
    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await db.scalars(
        query.order_by(Registration.registration_id).offset(offset).limit(limit)
    )
    return list(rows), total
