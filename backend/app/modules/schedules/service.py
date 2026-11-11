from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.models import Semester, Student
from app.modules.auth.schemas import UserOut
from app.modules.schedules import repository as schedule_repo
from app.modules.schedules.schemas import ScheduleEntry, ScheduleOut
from app.modules.students import repository as student_repo


async def schedule(actor: UserOut, semester_id: int, student_id: int | None = None) -> ScheduleOut:
    async def operation(db: AsyncSession):
        student = (
            await repo.require(db, Student, student_id)
            if student_id
            else await student_repo.student_for_user(db, actor.id)
        )
        if actor.role != "ADMIN" and student.user_id != actor.id:
            raise AppError(403, "FORBIDDEN", "Cannot view another student's timetable.")
        await repo.require(db, Semester, semester_id)
        rows = await schedule_repo.timetable_rows(db, student.student_id, semester_id)
        return ScheduleOut(
            student_id=student.student_id,
            semester_id=semester_id,
            entries=[
                ScheduleEntry(
                    registration_id=r.registration_id,
                    section_id=s.section_id,
                    course_code=c.course_code,
                    course_title=c.course_title,
                    section_number=s.section_number,
                    teacher_id=s.teacher_id,
                    teacher_name=teacher_name,
                    meeting_day=m.meeting_day,
                    start_time=m.start_time,
                    end_time=m.end_time,
                )
                for r, s, c, m, teacher_name in rows
            ],
        )

    return await transact(operation)
