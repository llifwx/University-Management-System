from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.models import Course, CourseSection, Registration, Semester, Student
from app.modules.auth.schemas import UserOut
from app.modules.grades.schemas import (
    CourseGrade,
    GradeInput,
    GradeSheet,
    GradeSheetRow,
    SemesterGrades,
    StudentGrades,
    Summary,
)
from app.modules.students import repository as student_repo

# Minimum total (out of 100) -> letter, grade points, traditional mark.
SCALE = [
    (95, "A", 4.0, "Excellent"),
    (90, "A-", 3.67, "Excellent"),
    (85, "B+", 3.33, "Good"),
    (80, "B", 3.0, "Good"),
    (75, "B-", 2.67, "Good"),
    (70, "C+", 2.33, "Good"),
    (65, "C", 2.0, "Satisfactory"),
    (60, "C-", 1.67, "Satisfactory"),
    (55, "D+", 1.33, "Satisfactory"),
    (50, "D", 1.0, "Satisfactory"),
    (0, "F", 0.0, "Fail"),
]
FAIL = SCALE[-1][1:]
SCORES = ("attestation_1", "attestation_2", "final_exam")
# Attestation 1 + 2 (out of 60) a student needs to sit the final exam.
ADMISSION_MIN = 30


def total(reg) -> float:
    return round(sum(getattr(reg, key) or 0 for key in SCORES), 2)


def admitted(reg) -> bool:
    return (reg.attestation_1 or 0) + (reg.attestation_2 or 0) >= ADMISSION_MIN


def is_closed(semester: Semester) -> bool:
    # ponytail: server-local date; add a campus timezone setting if servers move off-region.
    return date.today() > semester.end_date


def letter(reg, closed: bool = False) -> tuple[str, float, str] | None:
    """Graded once the final exam is in or the semester is over; before that the total is progress.

    Not admitted, or no final exam by the end of the semester, is an F.
    """
    if reg.final_exam is None and not closed:
        return None
    if reg.final_exam is None or not admitted(reg):
        return FAIL
    points = total(reg)
    return next((name, gp, trad) for low, name, gp, trad in SCALE if points >= low)


def summarize(rows: list[tuple[Registration, Course, bool]]) -> Summary:
    graded = [(c, g) for r, c, closed in rows if (g := letter(r, closed))]
    passed = [c for c, g in graded if g[0] != "F"]
    weight = sum(c.credits for c, _ in graded)
    return Summary(
        credits_taken=sum(c.credits for _, c, _ in rows),
        credits_earned=sum(c.credits for c in passed),
        ects_taken=sum(c.ects or 0 for _, c, _ in rows),
        ects_earned=sum(c.ects or 0 for c in passed),
        gpa=round(sum(c.credits * g[1] for c, g in graded) / weight, 2) if weight else None,
    )


async def section_for(
    db: AsyncSession, actor: UserOut, section_id: int
) -> tuple[CourseSection, bool]:
    section = await repo.require(db, CourseSection, section_id)
    if actor.role == "TEACHER" and section.teacher_id != actor.id:
        raise AppError(403, "FORBIDDEN", "Section is assigned to another teacher.")
    return section, is_closed(await db.get(Semester, section.semester_id))


async def sheet(db: AsyncSession, actor: UserOut, section_id: int, closed: bool) -> GradeSheet:
    rows = await db.execute(
        select(Registration, Student)
        .join(Student, Student.student_id == Registration.student_id)
        .where(Registration.section_id == section_id, Registration.status == "Enrolled")
        .order_by(Student.last_name, Student.first_name, Student.student_id)
    )
    return GradeSheet(
        closed=closed,
        editable=actor.role == "ADMIN" or not closed,
        rows=[
            GradeSheetRow(
                registration_id=r.registration_id,
                student_id=s.student_id,
                student_number=s.student_number,
                full_name=s.full_name,
                attestation_1=r.attestation_1,
                attestation_2=r.attestation_2,
                final_exam=r.final_exam,
                total=total(r),
                admitted=admitted(r),
                letter=(g := letter(r, closed)) and g[0],
            )
            for r, s in rows.all()
        ],
    )


async def grade_sheet(actor: UserOut, section_id: int) -> GradeSheet:
    async def operation(db: AsyncSession):
        _, closed = await section_for(db, actor, section_id)
        return await sheet(db, actor, section_id, closed)

    return await transact(operation)


async def save_grades(actor: UserOut, section_id: int, payload: list[GradeInput]) -> GradeSheet:
    async def operation(db: AsyncSession):
        _, closed = await section_for(db, actor, section_id)
        if closed and actor.role != "ADMIN":
            raise AppError(
                409,
                "GRADING_CLOSED",
                "The semester has ended; ask an administrator to change grades.",
            )
        ids = [item.registration_id for item in payload]
        if len(set(ids)) != len(ids):
            raise AppError(422, "DUPLICATE_REGISTRATION", "Each registration may appear once.")
        regs = {
            r.registration_id: r
            for r in await db.scalars(
                select(Registration)
                .where(
                    Registration.registration_id.in_(ids),
                    Registration.section_id == section_id,
                    Registration.status == "Enrolled",
                )
                .with_for_update()
            )
        }
        if missing := set(ids) - regs.keys():
            raise AppError(404, "NOT_ENROLLED", f"Not enrolled in this section: {sorted(missing)}.")
        if blocked := [
            i.registration_id for i in payload if i.final_exam is not None and not admitted(i)
        ]:
            raise AppError(
                409,
                "NOT_ADMITTED",
                f"Attestations below {ADMISSION_MIN}; no final exam allowed for: {blocked}.",
            )
        now = datetime.now(UTC)
        for item in payload:
            reg = regs[item.registration_id]
            for key in SCORES:
                setattr(reg, key, getattr(item, key))
            reg.graded_at, reg.graded_by = now, actor.id
        await db.flush()
        return await sheet(db, actor, section_id, closed)

    return await transact(operation)


async def student_grades(db: AsyncSession, student_id: int) -> StudentGrades:
    rows = await db.execute(
        select(Registration, CourseSection, Course, Semester)
        .join(CourseSection, CourseSection.section_id == Registration.section_id)
        .join(Course, Course.course_id == CourseSection.course_id)
        .join(Semester, Semester.semester_id == Registration.semester_id)
        .where(Registration.student_id == student_id, Registration.status == "Enrolled")
        .order_by(Semester.start_date, Course.course_code)
    )
    by_semester: dict[int, tuple[Semester, list]] = {}
    for reg, section, course, semester in rows.all():
        by_semester.setdefault(semester.semester_id, (semester, []))[1].append(
            (reg, section, course)
        )
    semesters, everything = [], []
    for semester, items in by_semester.values():
        closed = is_closed(semester)
        courses = []
        for reg, section, course in items:
            grade = letter(reg, closed)
            courses.append(
                CourseGrade(
                    section_id=section.section_id,
                    course_code=course.course_code,
                    course_title=course.course_title,
                    credits=course.credits,
                    ects=course.ects,
                    attestation_1=reg.attestation_1,
                    attestation_2=reg.attestation_2,
                    final_exam=reg.final_exam,
                    total=total(reg),
                    admitted=admitted(reg),
                    letter=grade and grade[0],
                    grade_points=grade and grade[1],
                    traditional=grade and grade[2],
                )
            )
        rows_ = [(r, c, closed) for r, _, c in items]
        everything += rows_
        semesters.append(
            SemesterGrades(
                semester_id=semester.semester_id,
                name=semester.name,
                start_date=semester.start_date,
                courses=courses,
                summary=summarize(rows_),
            )
        )
    return StudentGrades(semesters=semesters, summary=summarize(everything))


async def my_grades(actor: UserOut) -> StudentGrades:
    async def operation(db: AsyncSession):
        student = await student_repo.student_for_user(db, actor.id)
        return await student_grades(db, student.student_id)

    return await transact(operation)


async def grades_of(student_id: int) -> StudentGrades:
    async def operation(db: AsyncSession):
        await repo.require(db, Student, student_id)
        return await student_grades(db, student_id)

    return await transact(operation)
