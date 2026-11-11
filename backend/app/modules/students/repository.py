import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.modules.students.models import Student


def random_student_number(year: int) -> str:
    # Random, not sequential: a number does not reveal how many students enrolled or in what order.
    return f"{year % 100:02d}ID{secrets.randbelow(10**6):06d}"


async def new_student_number(db: AsyncSession, year: int) -> str:
    """Caller holds the exclusive academic lock, so check-then-insert cannot race."""
    # ponytail: retry on a hit; 1M numbers per year keep hits rare below ~100k students a year.
    while True:
        number = random_student_number(year)
        taken = await db.scalar(select(Student.student_id).where(Student.student_number == number))
        if taken is None:
            return number


async def student_for_user(db: AsyncSession, user_id: int, *, lock: bool = False) -> Student:
    query = select(Student).where(Student.user_id == user_id)
    if lock:
        query = query.with_for_update()
    student = await db.scalar(query)
    if student is None:
        raise AppError(404, "STUDENT_NOT_FOUND", "Student profile not found.")
    return student
