from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.scheduling import overlaps
from app.common.schemas import Page
from app.common.service import values
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.models import Course, CourseSection, SectionMeeting, Semester, User
from app.modules.auth.schemas import UserOut
from app.modules.registrations import repository as registration_repo
from app.modules.sections import repository as section_repo
from app.modules.sections.schemas import SectionCreate, SectionOut, SectionPatch
from app.modules.students.schemas import StudentOut


async def delete_section(identity: int) -> dict:
    from app.common.service import CatalogService

    return await CatalogService(CourseSection, SectionOut).delete(identity)


async def section_output(db: AsyncSession, section: CourseSection, count: int | None = None):
    count = await section_repo.seats(db, section.section_id) if count is None else count
    return SectionOut(
        **{
            key: getattr(section, key)
            for key in (
                "section_id",
                "course_id",
                "semester_id",
                "section_number",
                "capacity",
                "teacher_id",
                "created_at",
                "meetings",
            )
        },
        enrolled_count=count,
        remaining_capacity=section.capacity - count,
    )


async def list_sections(offset: int, limit: int, **filters) -> Page[SectionOut]:
    async def operation(db: AsyncSession):
        rows, total = await section_repo.section_page(db, offset, limit, **filters)
        return Page[SectionOut](
            items=[await section_output(db, s, n) for s, n in rows],
            total=total or 0,
            offset=offset,
            limit=limit,
        )

    return await transact(operation)


async def get_section(identity: int) -> SectionOut:
    async def operation(db: AsyncSession):
        return await section_output(db, await repo.require(db, CourseSection, identity))

    return await transact(operation)


async def validate_section(db: AsyncSession, data: dict) -> None:
    await repo.require(db, Course, data["course_id"])
    await repo.require(db, Semester, data["semester_id"])
    if data["teacher_id"] is not None:
        teacher = await repo.require(db, User, data["teacher_id"])
        if teacher.role != "TEACHER" or not teacher.is_active:
            raise AppError(400, "INVALID_TEACHER", "Assigned user must be an active teacher.")
    meetings = data["meetings"]
    if any(overlaps(a, b) for i, a in enumerate(meetings) for b in meetings[i + 1 :]):
        raise AppError(400, "INVALID_MEETINGS", "Section meetings overlap each other.")


async def create_section(payload: SectionCreate) -> SectionOut:
    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        data = payload.model_dump(exclude={"meetings"})
        data["meetings"] = [SectionMeeting(**m.model_dump()) for m in payload.meetings]
        await validate_section(db, data)
        section = CourseSection(**data)
        db.add(section)
        await db.flush()
        return await section_output(db, section, 0)

    return await transact(operation)


async def patch_section(identity: int, payload: SectionPatch) -> SectionOut:
    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        section = await repo.require(db, CourseSection, identity, lock=True)
        data = values(payload, {"teacher_id"})
        registrations = await registration_repo.section_history_count(db, identity)
        # Immutable academic identity once any history references this section.
        if registrations and any(
            key in data and data[key] != getattr(section, key)
            for key in ("semester_id", "course_id")
        ):
            raise AppError(
                409, "SECTION_HAS_HISTORY", "Cannot move a section with registration history."
            )
        count = await section_repo.seats(db, identity)
        if data.get("capacity", section.capacity) < count:
            raise AppError(
                409, "CAPACITY_BELOW_ENROLLMENT", "Capacity cannot be below enrolled count."
            )
        if "meetings" in data:
            # Conservative policy also avoids silently changing students' accepted timetable.
            if count:
                raise AppError(
                    409,
                    "SECTION_HAS_ENROLLMENTS",
                    "Cancel existing enrollments before replacing meeting times.",
                )
            data["meetings"] = [SectionMeeting(**m) for m in data["meetings"]]
        merged = {
            key: data.get(key, getattr(section, key))
            for key in (
                "course_id",
                "semester_id",
                "teacher_id",
                "meetings",
            )
        }
        await validate_section(db, merged)
        if "meetings" in data:
            # Delete first to allow replacement by an identical meeting under the unique key.
            section.meetings.clear()
            await db.flush()
        for key, value in data.items():
            setattr(section, key, value)
        await db.flush()
        return await section_output(db, section, count)

    return await transact(operation)


async def roster(actor: UserOut, section_id: int, offset: int, limit: int) -> Page[StudentOut]:
    async def operation(db: AsyncSession):
        section = await repo.require(db, CourseSection, section_id)
        if actor.role == "TEACHER" and section.teacher_id != actor.id:
            raise AppError(403, "FORBIDDEN", "Section is assigned to another teacher.")
        rows, total = await section_repo.roster_page(db, section_id, offset, limit)
        return Page[StudentOut](
            items=[StudentOut.model_validate(s) for s in rows],
            total=total or 0,
            offset=offset,
            limit=limit,
        )

    return await transact(operation)
