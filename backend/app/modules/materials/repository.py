from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CourseSection, Registration, Student


async def section_ids_for_teacher(db: AsyncSession, teacher_id: int) -> list[int]:
    rows = await db.scalars(
        select(CourseSection.section_id).where(CourseSection.teacher_id == teacher_id)
    )
    return list(rows)


async def section_ids_for_student(db: AsyncSession, student_user_id: int) -> list[int]:
    rows = await db.scalars(
        select(Registration.section_id)
        .join(Student, Student.student_id == Registration.student_id)
        .where(Student.user_id == student_user_id, Registration.status != "Cancelled")
        .distinct()
    )
    return list(rows)


async def student_is_registered(db: AsyncSession, student_user_id: int, section_id: int) -> bool:
    exists = await db.scalar(
        select(Registration.registration_id)
        .join(Student, Student.student_id == Registration.student_id)
        .where(
            Student.user_id == student_user_id,
            Registration.section_id == section_id,
            Registration.status != "Cancelled",
        )
        .limit(1)
    )
    return exists is not None
