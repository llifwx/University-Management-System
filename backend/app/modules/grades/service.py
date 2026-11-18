from datetime import UTC, datetime

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
SCORES = ("attestation_1", "attestation_2", "final_exam")


def total(reg: Registration) -> float:
    return round(sum(getattr(reg, key) or 0 for key in SCORES), 2)


def letter(reg: Registration) -> tuple[str, float, str] | None:
    """A course is graded only once the final exam is in; before that the total is progress."""
    if reg.final_exam is None:
        return None
    points = total(reg)
    return next((name, gp, trad) for low, name, gp, trad in SCALE if points >= low)


def summarize(rows: list[tuple[Registration, Course]]) -> Summary:
    graded = [(c, g) for r, c in rows if (g := letter(r))]
    passed = [c for c, g in graded if g[0] != "F"]
    weight = sum(c.credits for c, _ in graded)
    return Summary(
        credits_taken=sum(c.credits for _, c in rows),
        credits_earned=sum(c.credits for c in passed),
        ects_taken=sum(c.ects or 0 for _, c in rows),
        ects_earned=sum(c.ects or 0 for c in passed),
        gpa=round(sum(c.credits * g[1] for c, g in graded) / weight, 2) if weight else None,
    )


async def section_for(db: AsyncSession, actor: UserOut, section_id: int) -> CourseSection:
    section = await repo.require(db, CourseSection, section_id)
    if actor.role == "TEACHER" and section.teacher_id != actor.id:
        raise AppError(403, "FORBIDDEN", "Section is assigned to another teacher.")
    return section


async def sheet_rows(db: AsyncSession, section_id: int) -> list[GradeSheetRow]:
    rows = await db.execute(
        select(Registration, Student)
        .join(Student, Student.student_id == Registration.student_id)
        .where(Registration.section_id == section_id, Registration.status == "Enrolled")
        .order_by(Student.last_name, Student.first_name, Student.student_id)
    )
    return [
        GradeSheetRow(
            registration_id=r.registration_id,
            student_id=s.student_id,
            student_number=s.student_number,
            full_name=s.full_name,
            attestation_1=r.attestation_1,
            attestation_2=r.attestation_2,
            final_exam=r.final_exam,
            total=total(r),
            letter=(g := letter(r)) and g[0],
        )
        for r, s in rows.all()
    ]


async def grade_sheet(actor: UserOut, section_id: int) -> list[GradeSheetRow]:
    async def operation(db: AsyncSession):
        await section_for(db, actor, section_id)
        return await sheet_rows(db, section_id)

    return await transact(operation)


async def save_grades(
    actor: UserOut, section_id: int, payload: list[GradeInput]
) -> list[GradeSheetRow]:
    async def operation(db: AsyncSession):
        await section_for(db, actor, section_id)
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
        now = datetime.now(UTC)
        for item in payload:
            reg = regs[item.registration_id]
            for key in SCORES:
                setattr(reg, key, getattr(item, key))
            reg.graded_at, reg.graded_by = now, actor.id
        await db.flush()
        return await sheet_rows(db, section_id)

    return await transact(operation)


async def my_grades(actor: UserOut) -> StudentGrades:
    async def operation(db: AsyncSession):
        student = await student_repo.student_for_user(db, actor.id)
        rows = await db.execute(
            select(Registration, CourseSection, Course, Semester)
            .join(CourseSection, CourseSection.section_id == Registration.section_id)
            .join(Course, Course.course_id == CourseSection.course_id)
            .join(Semester, Semester.semester_id == Registration.semester_id)
            .where(Registration.student_id == student.student_id, Registration.status == "Enrolled")
            .order_by(Semester.start_date, Course.course_code)
        )
        by_semester: dict[int, tuple[Semester, list]] = {}
        for reg, section, course, semester in rows.all():
            by_semester.setdefault(semester.semester_id, (semester, []))[1].append(
                (reg, section, course)
            )
        semesters = []
        for semester, items in by_semester.values():
            courses = []
            for reg, section, course in items:
                grade = letter(reg)
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
                        letter=grade and grade[0],
                        grade_points=grade and grade[1],
                        traditional=grade and grade[2],
                    )
                )
            semesters.append(
                SemesterGrades(
                    semester_id=semester.semester_id,
                    name=semester.name,
                    start_date=semester.start_date,
                    courses=courses,
                    summary=summarize([(r, c) for r, _, c in items]),
                )
            )
        everything = [(r, c) for _, items in by_semester.values() for r, _, c in items]
        return StudentGrades(semesters=semesters, summary=summarize(everything))

    return await transact(operation)
