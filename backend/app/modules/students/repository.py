from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.modules.students.models import Student


async def student_for_user(db: AsyncSession, user_id: int, *, lock: bool = False) -> Student:
    query = select(Student).where(Student.user_id == user_id)
    if lock:
        query = query.with_for_update()
    student = await db.scalar(query)
    if student is None:
        raise AppError(404, "STUDENT_NOT_FOUND", "Student profile not found.")
    return student
