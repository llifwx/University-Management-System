from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.registrations.models import Registration
from app.modules.sections.models import CourseSection, SectionMeeting
from app.modules.students.models import Student


async def roster_page(db: AsyncSession, section_id: int, offset: int, limit: int):
    query = (
        select(Student)
        .join(Registration)
        .where(
            Registration.section_id == section_id,
            Registration.status == "Enrolled",
        )
    )
    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await db.scalars(query.order_by(Student.student_id).offset(offset).limit(limit))
    return list(rows), total


async def seats(db: AsyncSession, section_id: int) -> int:
    return (
        await db.scalar(
            select(func.count())
            .select_from(Registration)
            .where(
                Registration.section_id == section_id,
                Registration.status == "Enrolled",
            )
        )
        or 0
    )


async def enrolled_meetings(db: AsyncSession, student_id: int, semester_id: int):
    return (
        await db.scalars(
            select(SectionMeeting)
            .join(
                Registration,
                Registration.section_id == SectionMeeting.section_id,
            )
            .where(
                Registration.student_id == student_id,
                Registration.semester_id == semester_id,
                Registration.status == "Enrolled",
            )
        )
    ).all()


async def section_page(db: AsyncSession, offset: int, limit: int, **filters):
    count = (
        select(func.count(Registration.registration_id))
        .where(
            Registration.section_id == CourseSection.section_id,
            Registration.status == "Enrolled",
        )
        .correlate(CourseSection)
        .scalar_subquery()
    )
    query = select(CourseSection, count.label("enrolled_count"))
    for key in ("semester_id", "course_id", "teacher_id"):
        if filters.get(key) is not None:
            query = query.where(getattr(CourseSection, key) == filters[key])
    if filters.get("available_only"):
        query = query.where(count < CourseSection.capacity)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    rows = await db.execute(query.order_by(CourseSection.section_id).offset(offset).limit(limit))
    return rows.all(), total
