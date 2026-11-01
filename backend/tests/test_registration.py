import pytest
from sqlalchemy import func, select

from app.core.exceptions import AppError
from app.models import Registration
from app.modules.registrations.service import change_status, enroll
from app.modules.sections.schemas import MeetingInput, SectionPatch
from app.modules.sections.service import patch_section


async def test_success_duplicate_cancel_reactivate(data):
    actor, section, semester = data.actors[0], data.sections[0], data.semesters[0]
    first = await enroll(actor, section, semester)
    assert first.status == "Enrolled"
    with pytest.raises(AppError, match="already enrolled"):
        await enroll(actor, section, semester)
    assert (await change_status(actor, first.registration_id, "Cancelled")).status == "Cancelled"
    assert (await enroll(actor, section, semester)).registration_id == first.registration_id


@pytest.mark.parametrize(
    "first,second,allowed",
    [
        (0, 1, False),
        (0, 2, True),
        (0, 3, True),
        (0, 4, True),
        (5, 6, False),
    ],
)
async def test_meeting_rules(data, first, second, allowed, db_factory):
    await enroll(data.actors[0], data.sections[first], data.semesters[0])
    semester = data.semesters[1 if second == 4 else 0]
    if allowed:
        assert (await enroll(data.actors[0], data.sections[second], semester)).status == "Enrolled"
    else:
        with pytest.raises(AppError) as error:
            await enroll(data.actors[0], data.sections[second], semester)
        assert error.value.code == "SCHEDULE_CONFLICT"
        async with db_factory() as db:
            assert await db.scalar(select(func.count()).select_from(Registration)) == 1


async def test_capacity_and_cancellation(data):
    first = await enroll(data.actors[0], data.sections[7], data.semesters[0])
    with pytest.raises(AppError) as error:
        await enroll(data.actors[1], data.sections[7], data.semesters[0])
    assert error.value.code == "SECTION_FULL"
    await change_status(data.actors[0], first.registration_id, "Cancelled")
    assert (await enroll(data.actors[1], data.sections[7], data.semesters[0])).status == "Enrolled"


@pytest.mark.parametrize("status", ["Pending", "Rejected", "Cancelled"])
async def test_non_enrolled_does_not_block(data, status):
    registration = await enroll(data.actors[0], data.sections[0], data.semesters[0])
    await change_status(data.admin, registration.registration_id, status)
    assert (await enroll(data.actors[0], data.sections[1], data.semesters[0])).status == "Enrolled"


@pytest.mark.parametrize("status", ["Pending", "Rejected", "Cancelled"])
async def test_non_enrolled_can_reactivate(data, status):
    registration = await enroll(data.actors[0], data.sections[0], data.semesters[0])
    await change_status(data.admin, registration.registration_id, status)
    assert (
        await enroll(data.actors[0], data.sections[0], data.semesters[0])
    ).registration_id == registration.registration_id


async def test_semester_mismatch(data):
    with pytest.raises(AppError) as error:
        await enroll(data.actors[0], data.sections[0], data.semesters[1])
    assert error.value.code == "SEMESTER_MISMATCH"


async def test_admin_edit_protections(data):
    for actor in data.actors[:2]:
        await enroll(actor, data.sections[0], data.semesters[0])
    for payload, code in [
        (SectionPatch(capacity=1), "CAPACITY_BELOW_ENROLLMENT"),
        (SectionPatch(semester_id=data.semesters[1]), "SECTION_HAS_HISTORY"),
        (
            SectionPatch(
                meetings=[MeetingInput(meeting_day=1, start_time="10:00", end_time="11:00")]
            ),
            "SECTION_HAS_ENROLLMENTS",
        ),
    ]:
        with pytest.raises(AppError) as error:
            await patch_section(data.sections[0], payload)
        assert error.value.code == code
    assert (await patch_section(data.sections[0], SectionPatch(capacity=10))).capacity == 10


async def test_closed_semester_and_inactive_student(data, db_factory):
    from app.models import Semester, User

    async with db_factory() as db, db.begin():
        semester = await db.get(Semester, data.semesters[0])
        semester.is_active = False
    with pytest.raises(AppError) as error:
        await enroll(data.actors[0], data.sections[0], data.semesters[0])
    assert error.value.code == "REGISTRATION_CLOSED"
    async with db_factory() as db, db.begin():
        user = await db.get(User, data.actors[0].id)
        user.is_active = False
    with pytest.raises(AppError) as error:
        await enroll(data.actors[0], data.sections[0], data.semesters[0])
    assert error.value.code == "INACTIVE_STUDENT"
