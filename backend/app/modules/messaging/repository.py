from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CourseSection, Registration, Student, User
from app.modules.messaging.models import MessageThread


async def thread_between(
    db: AsyncSession, teacher_id: int, student_id: int, *, lock: bool = False
) -> MessageThread | None:
    query = select(MessageThread).where(
        MessageThread.teacher_id == teacher_id, MessageThread.student_id == student_id
    )
    if lock:
        query = query.with_for_update()
    return await db.scalar(query)


async def teachers_for_student(db: AsyncSession, student_user_id: int) -> list[User]:
    """Teachers of any section the student is (or was) registered in."""
    rows = await db.scalars(
        select(User)
        .join(CourseSection, CourseSection.teacher_id == User.id)
        .join(Registration, Registration.section_id == CourseSection.section_id)
        .join(Student, Student.student_id == Registration.student_id)
        .where(Student.user_id == student_user_id)
        .distinct()
    )
    return list(rows)


async def students_for_teacher(db: AsyncSession, teacher_id: int) -> list[User]:
    """Students registered in any section taught by this teacher."""
    rows = await db.scalars(
        select(User)
        .join(Student, Student.user_id == User.id)
        .join(Registration, Registration.student_id == Student.student_id)
        .join(CourseSection, CourseSection.section_id == Registration.section_id)
        .where(CourseSection.teacher_id == teacher_id)
        .distinct()
    )
    return list(rows)


async def is_eligible_pair(db: AsyncSession, teacher_user_id: int, student_user_id: int) -> bool:
    exists = await db.scalar(
        select(Registration.registration_id)
        .join(CourseSection, CourseSection.section_id == Registration.section_id)
        .join(Student, Student.student_id == Registration.student_id)
        .where(CourseSection.teacher_id == teacher_user_id, Student.user_id == student_user_id)
        .limit(1)
    )
    return exists is not None


async def display_name_for(db: AsyncSession, user_id: int) -> str | None:
    student = await db.scalar(select(Student).where(Student.user_id == user_id))
    return student.full_name if student else None
