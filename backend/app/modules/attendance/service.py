from datetime import date

from sqlalchemy import and_, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.models import Course, CourseSection, Registration, Room, SectionMeeting, Semester, Student
from app.modules.attendance.models import Attendance
from app.modules.attendance.schemas import (
    AttendanceInput,
    AttendanceRecord,
    AttendanceRow,
    AttendanceSheet,
    ClassOut,
    CourseAttendance,
    SemesterAttendance,
    StudentAttendance,
)
from app.modules.auth.schemas import UserOut
from app.modules.students import repository as student_repo


def _today() -> date:
    # ponytail: server-local date, same as grades; add a campus timezone setting if servers move.
    return date.today()


def _class_query(day: date):
    enrolled = (
        select(func.count())
        .where(
            Registration.section_id == CourseSection.section_id,
            Registration.status == "Enrolled",
        )
        .scalar_subquery()
    )
    marked = (
        select(func.count())
        .select_from(Attendance)
        .join(Registration, Registration.registration_id == Attendance.registration_id)
        .where(
            Registration.section_id == CourseSection.section_id,
            Registration.status == "Enrolled",
            Attendance.class_date == day,
            Attendance.start_time == SectionMeeting.start_time,
        )
        .scalar_subquery()
    )
    return (
        select(SectionMeeting, CourseSection, Course, Room.code, enrolled, marked)
        .join(CourseSection, CourseSection.section_id == SectionMeeting.section_id)
        .join(Course, Course.course_id == CourseSection.course_id)
        .join(Semester, Semester.semester_id == CourseSection.semester_id)
        .outerjoin(Room, Room.room_id == SectionMeeting.room_id)
        .where(
            SectionMeeting.meeting_day == day.weekday(),
            Semester.start_date <= day,
            Semester.end_date >= day,
        )
        .order_by(SectionMeeting.start_time, Course.course_code)
    )


def _class_out(day: date, meeting, section, course, room_code, enrolled, marked) -> ClassOut:
    return ClassOut(
        meeting_id=meeting.id,
        section_id=section.section_id,
        course_code=course.course_code,
        course_title=course.course_title,
        section_number=section.section_number,
        class_date=day,
        start_time=meeting.start_time,
        end_time=meeting.end_time,
        room_code=room_code,
        enrolled=enrolled,
        marked=marked,
    )


async def classes_on(actor: UserOut, day: date) -> list[ClassOut]:
    async def operation(db: AsyncSession):
        rows = await db.execute(_class_query(day).where(CourseSection.teacher_id == actor.id))
        return [_class_out(day, *row) for row in rows.all()]

    return await transact(operation)


async def _lesson(db: AsyncSession, actor: UserOut, meeting_id: int, day: date) -> ClassOut:
    await repo.require(db, SectionMeeting, meeting_id)
    row = (await db.execute(_class_query(day).where(SectionMeeting.id == meeting_id))).one_or_none()
    if row is None:
        # Wrong weekday or outside the semester: this meeting has no class on that date.
        raise AppError(404, "NO_CLASS", "This class does not take place on that date.")
    if row[1].teacher_id != actor.id:
        raise AppError(403, "FORBIDDEN", "Section is assigned to another teacher.")
    return _class_out(day, *row)


async def _sheet(db: AsyncSession, lesson: ClassOut) -> AttendanceSheet:
    rows = await db.execute(
        select(Registration.registration_id, Student, Attendance.status)
        .join(Student, Student.student_id == Registration.student_id)
        .outerjoin(
            Attendance,
            and_(
                Attendance.registration_id == Registration.registration_id,
                Attendance.class_date == lesson.class_date,
                Attendance.start_time == lesson.start_time,
            ),
        )
        .where(Registration.section_id == lesson.section_id, Registration.status == "Enrolled")
        .order_by(Student.last_name, Student.first_name, Student.student_id)
    )
    return AttendanceSheet(
        lesson=lesson,
        rows=[
            AttendanceRow(
                registration_id=reg_id,
                student_number=student.student_number,
                full_name=student.full_name,
                status=status,
            )
            for reg_id, student, status in rows.all()
        ],
    )


async def sheet(actor: UserOut, meeting_id: int, day: date) -> AttendanceSheet:
    async def operation(db: AsyncSession):
        return await _sheet(db, await _lesson(db, actor, meeting_id, day))

    return await transact(operation)


async def save(
    actor: UserOut, meeting_id: int, day: date, payload: list[AttendanceInput]
) -> AttendanceSheet:
    if day > _today():
        raise AppError(409, "CLASS_IN_FUTURE", "Attendance can't be taken before the class.")
    ids = [item.registration_id for item in payload]
    if len(set(ids)) != len(ids):
        raise AppError(422, "DUPLICATE_REGISTRATION", "Each registration may appear once.")

    async def operation(db: AsyncSession):
        lesson = await _lesson(db, actor, meeting_id, day)
        enrolled = set(
            await db.scalars(
                select(Registration.registration_id).where(
                    Registration.registration_id.in_(ids),
                    Registration.section_id == lesson.section_id,
                    Registration.status == "Enrolled",
                )
            )
        )
        if missing := set(ids) - enrolled:
            raise AppError(404, "NOT_ENROLLED", f"Not enrolled in this section: {sorted(missing)}.")
        key = {"class_date": day, "start_time": lesson.start_time}
        if cleared := [i.registration_id for i in payload if i.status is None]:
            await db.execute(
                delete(Attendance).where(
                    Attendance.registration_id.in_(cleared),
                    Attendance.class_date == day,
                    Attendance.start_time == lesson.start_time,
                )
            )
        if marks := [i for i in payload if i.status is not None]:
            statement = insert(Attendance).values(
                [
                    {
                        **key,
                        "registration_id": i.registration_id,
                        "end_time": lesson.end_time,
                        "status": i.status,
                        "marked_by": actor.id,
                    }
                    for i in marks
                ]
            )
            await db.execute(
                statement.on_conflict_do_update(
                    index_elements=["registration_id", "class_date", "start_time"],
                    set_={
                        "status": statement.excluded.status,
                        "end_time": statement.excluded.end_time,
                        "marked_by": statement.excluded.marked_by,
                        "marked_at": func.now(),
                    },
                )
            )
        # Recount "marked" for the response.
        return await _sheet(db, await _lesson(db, actor, meeting_id, day))

    return await transact(operation)


def course_attendance(section, course, records: list[Attendance]) -> CourseAttendance:
    counts = {s: sum(r.status == s for r in records) for s in ("PRESENT", "LATE", "ABSENT")}
    return CourseAttendance(
        section_id=section.section_id,
        course_code=course.course_code,
        course_title=course.course_title,
        present=counts["PRESENT"],
        late=counts["LATE"],
        absent=counts["ABSENT"],
        rate=round((counts["PRESENT"] + counts["LATE"]) * 100 / len(records), 1)
        if records
        else None,
        records=[AttendanceRecord.model_validate(r) for r in records],
    )


async def my_attendance(actor: UserOut) -> StudentAttendance:
    async def operation(db: AsyncSession):
        student = await student_repo.student_for_user(db, actor.id)
        rows = await db.execute(
            select(Registration, CourseSection, Course, Semester)
            .join(CourseSection, CourseSection.section_id == Registration.section_id)
            .join(Course, Course.course_id == CourseSection.course_id)
            .join(Semester, Semester.semester_id == Registration.semester_id)
            .where(
                Registration.student_id == student.student_id,
                Registration.status == "Enrolled",
            )
            .order_by(Semester.start_date.desc(), Course.course_code)
        )
        rows = rows.all()
        records: dict[int, list[Attendance]] = {}
        for record in await db.scalars(
            select(Attendance)
            .where(Attendance.registration_id.in_([r.registration_id for r, *_ in rows]))
            .order_by(Attendance.class_date.desc(), Attendance.start_time.desc())
        ):
            records.setdefault(record.registration_id, []).append(record)
        semesters: dict[int, SemesterAttendance] = {}
        for reg, section, course, semester in rows:
            semesters.setdefault(
                semester.semester_id,
                SemesterAttendance(
                    semester_id=semester.semester_id,
                    name=semester.name,
                    start_date=semester.start_date,
                    courses=[],
                ),
            ).courses.append(
                course_attendance(section, course, records.get(reg.registration_id, []))
            )
        return StudentAttendance(semesters=list(semesters.values()))

    return await transact(operation)
