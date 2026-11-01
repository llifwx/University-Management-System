import asyncio

import pytest
from sqlalchemy import func, select, text

from app.common import repository as repo
from app.core.exceptions import AppError
from app.models import Registration
from app.modules.registrations.service import enroll
from app.modules.sections.schemas import SectionPatch
from app.modules.sections.service import patch_section


@pytest.mark.parametrize("scenario", ["overlap", "last_seat", "duplicate"])
async def test_genuine_simultaneous_transactions(data, db_factory, monkeypatch, scenario):
    barrier = asyncio.Barrier(2)
    original = repo.academic_lock
    pids = []

    async def synchronized(db, *, exclusive=False):
        await original(db, exclusive=exclusive)
        pids.append(await db.scalar(text("SELECT pg_backend_pid()")))
        # Both independent connections have entered a real transaction before proceeding.
        await asyncio.wait_for(barrier.wait(), timeout=10)

    monkeypatch.setattr(repo, "academic_lock", synchronized)
    first_actor = data.actors[0]
    second_actor = data.actors[1] if scenario == "last_seat" else first_actor
    section_a = data.sections[7] if scenario == "last_seat" else data.sections[0]
    section_b = data.sections[1] if scenario == "overlap" else section_a
    results = await asyncio.wait_for(
        asyncio.gather(
            enroll(first_actor, section_a, data.semesters[0]),
            enroll(second_actor, section_b, data.semesters[0]),
            return_exceptions=True,
        ),
        timeout=20,
    )
    assert len(set(pids)) == 2
    successes = [r for r in results if not isinstance(r, Exception)]
    failures = [r for r in results if isinstance(r, AppError)]
    assert len(successes) == len(failures) == 1, results
    assert (
        failures[0].code
        == {
            "overlap": "SCHEDULE_CONFLICT",
            "last_seat": "SECTION_FULL",
            "duplicate": "DUPLICATE_REGISTRATION",
        }[scenario]
    )
    async with db_factory() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(Registration)
                .where(
                    Registration.status == "Enrolled",
                )
            )
            == 1
        )


async def test_admin_edit_waits_for_enrollment(data, monkeypatch):
    original = repo.academic_lock
    enrollment_locked, release = asyncio.Event(), asyncio.Event()
    admin_attempted = asyncio.Event()

    async def coordinated(db, *, exclusive=False):
        if exclusive:
            admin_attempted.set()
        await original(db, exclusive=exclusive)
        if not exclusive:
            enrollment_locked.set()
            await asyncio.wait_for(release.wait(), 10)

    monkeypatch.setattr(repo, "academic_lock", coordinated)
    enrollment = asyncio.create_task(enroll(data.actors[0], data.sections[0], data.semesters[0]))
    await asyncio.wait_for(enrollment_locked.wait(), 10)
    edit = asyncio.create_task(
        patch_section(
            data.sections[0],
            SectionPatch(
                meetings=[
                    {
                        "meeting_day": 1,
                        "start_time": "10:00",
                        "end_time": "11:00",
                    }
                ]
            ),
        )
    )
    await asyncio.wait_for(admin_attempted.wait(), 10)
    assert not edit.done()
    release.set()
    await enrollment
    with pytest.raises(AppError) as error:
        await edit
    assert error.value.code == "SECTION_HAS_ENROLLMENTS"
