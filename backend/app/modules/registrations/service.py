from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.scheduling import overlaps
from app.common.schemas import Page
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.models import CourseSection, Registration, Semester, Student, User
from app.modules.auth.schemas import UserOut
from app.modules.registrations import repository as registration_repo
from app.modules.registrations.schemas import RegistrationOut
from app.modules.sections import repository as section_repo
from app.modules.students import repository as student_repo


async def cancel_authorized(actor: UserOut, registration_id: int) -> RegistrationOut:
    if actor.role not in {"ADMIN", "STUDENT"}:
        raise AppError(403, "FORBIDDEN", "Only students and administrators can cancel enrollment.")
    return await change_status(actor, registration_id, "Cancelled")


async def enroll(
    actor: UserOut,
    section_id: int,
    semester_id: int,
    student_id: int | None = None,
) -> RegistrationOut:
    async def operation(db: AsyncSession):
        await repo.academic_lock(db)
        student = (
            await repo.require(db, Student, student_id, lock=True)
            if student_id
            else await student_repo.student_for_user(db, actor.id, lock=True)
        )
        user = await db.get(User, student.user_id)
        if not user or not user.is_active:
            raise AppError(409, "INACTIVE_STUDENT", "Student account is inactive.")
        section = await repo.require(db, CourseSection, section_id, lock=True)
        semester = await repo.require(db, Semester, semester_id)
        if section.semester_id != semester_id:
            raise AppError(409, "SEMESTER_MISMATCH", "Section belongs to another semester.")
        if not semester.is_active:
            raise AppError(409, "REGISTRATION_CLOSED", "Semester registration is closed.")
        existing = await registration_repo.existing(db, student.student_id, section_id, semester_id)
        if existing and existing.status == "Enrolled":
            raise AppError(409, "DUPLICATE_REGISTRATION", "Student is already enrolled.")
        if await section_repo.seats(db, section_id) >= section.capacity:
            raise AppError(409, "SECTION_FULL", "No seats remain in this section.")
        meetings = await section_repo.enrolled_meetings(db, student.student_id, semester_id)
        if any(overlaps(old, new) for old in meetings for new in section.meetings):
            raise AppError(
                409, "SCHEDULE_CONFLICT", "The requested section overlaps with an existing class."
            )
        if not section.meetings:
            raise AppError(409, "UNSCHEDULED_SECTION", "Section has no meeting schedule.")
        if existing:
            existing.status = "Enrolled"
            existing.registered_at = datetime.now(UTC)
        else:
            existing = Registration(
                student_id=student.student_id,
                section_id=section_id,
                semester_id=semester_id,
                status="Enrolled",
            )
            db.add(existing)
        await db.flush()
        return RegistrationOut.model_validate(existing)

    return await transact(operation)


async def change_status(actor: UserOut, registration_id: int, status: str) -> RegistrationOut:
    if status not in {"Pending", "Rejected", "Cancelled"}:
        raise AppError(400, "INVALID_STATUS", "Use the enrollment service to enter Enrolled.")

    async def operation(db: AsyncSession):
        await repo.academic_lock(db)
        registration = await repo.require(db, Registration, registration_id)
        student = await repo.require(db, Student, registration.student_id, lock=True)
        if actor.role != "ADMIN" and student.user_id != actor.id:
            raise AppError(403, "FORBIDDEN", "This registration belongs to another student.")
        await repo.require(db, CourseSection, registration.section_id, lock=True)
        await db.refresh(registration)
        registration.status = status
        await db.flush()
        return RegistrationOut.model_validate(registration)

    return await transact(operation)


async def registrations(
    actor: UserOut,
    offset: int,
    limit: int,
    *,
    own: bool = False,
    semester_id: int | None = None,
    section_id: int | None = None,
) -> Page[RegistrationOut]:
    async def operation(db: AsyncSession):
        student_id = None
        if own:
            student = await student_repo.student_for_user(db, actor.id)
            student_id = student.student_id
        if section_id:
            section = await repo.require(db, CourseSection, section_id)
            if actor.role == "TEACHER" and section.teacher_id != actor.id:
                raise AppError(403, "FORBIDDEN", "Section is assigned to another teacher.")
        rows, total = await registration_repo.registration_page(
            db,
            offset,
            limit,
            student_id=student_id,
            semester_id=semester_id,
            section_id=section_id,
        )
        return Page[RegistrationOut](
            items=[RegistrationOut.model_validate(row) for row in rows],
            total=total or 0,
            offset=offset,
            limit=limit,
        )

    return await transact(operation)
