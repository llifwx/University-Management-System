from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Course, CourseSection, Registration, SectionMeeting, User


async def timetable_rows(db: AsyncSession, student_id: int, semester_id: int):
    return await db.execute(
        select(Registration, CourseSection, Course, SectionMeeting, User.full_name)
        .join(
            CourseSection,
            Registration.section_id == CourseSection.section_id,
        )
        .join(Course, CourseSection.course_id == Course.course_id)
        .join(
            SectionMeeting,
            CourseSection.section_id == SectionMeeting.section_id,
        )
        .outerjoin(User, CourseSection.teacher_id == User.id)
        .where(
            Registration.student_id == student_id,
            Registration.semester_id == semester_id,
            Registration.status == "Enrolled",
        )
        .order_by(SectionMeeting.meeting_day, SectionMeeting.start_time)
    )
