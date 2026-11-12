from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Student


async def display_name_for(db: AsyncSession, user_id: int) -> str | None:
    student = await db.scalar(select(Student).where(Student.user_id == user_id))
    return student.full_name if student else None
