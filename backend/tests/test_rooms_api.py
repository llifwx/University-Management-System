import asyncio

from app.core.exceptions import AppError
from app.modules.sections.schemas import SectionCreate
from app.modules.sections.service import create_section


async def test_room_catalog_crud(client, data, headers):
    admin = await headers(data.admin)
    student = await headers(data.actors[0])
    response = await client.post(
        "/api/v1/rooms",
        headers=admin,
        json={"code": "NEW-101", "building": "Main", "capacity": 40},
    )
    assert response.status_code == 201
    identity = response.json()["room_id"]
    path = f"/api/v1/rooms/{identity}"
    assert (await client.patch(path, headers=student, json={"capacity": 50})).status_code == 403
    assert (await client.patch(path, headers=admin, json={"capacity": 50})).json()["capacity"] == 50
    assert (await client.get(path, headers=student)).json()["code"] == "NEW-101"
    page = await client.get("/api/v1/rooms?offset=1&limit=1", headers=student)
    assert page.json()["total"] == 3 and len(page.json()["items"]) == 1
    assert (await client.delete(path, headers=admin)).status_code == 200
    assert (await client.get(path, headers=student)).status_code == 404


async def test_room_assignment_blocks_overlapping_teacher_and_allows_disjoint_slots(
    client, data, headers
):
    admin = await headers(data.admin)
    room_id = data.rooms[0]
    base = {
        "course_id": data.course,
        "semester_id": data.semesters[0],
        "capacity": 2,
    }
    first = await client.post(
        "/api/v1/sections",
        headers=admin,
        json={
            **base,
            "section_number": "ROOM-A",
            "teacher_id": data.teacher.id,
            "meetings": [
                {"meeting_day": 3, "start_time": "08:00", "end_time": "09:00", "room_id": room_id}
            ],
        },
    )
    assert first.status_code == 201

    # Another teacher, overlapping time, same room: the room is locked for that slot.
    conflicting = await client.post(
        "/api/v1/sections",
        headers=admin,
        json={
            **base,
            "section_number": "ROOM-B",
            "teacher_id": data.other_teacher.id,
            "meetings": [
                {"meeting_day": 3, "start_time": "08:30", "end_time": "09:30", "room_id": room_id}
            ],
        },
    )
    assert conflicting.status_code == 409
    assert conflicting.json()["error"]["code"] == "ROOM_CONFLICT"

    # Same room, non-overlapping time on the same day: no conflict.
    disjoint = await client.post(
        "/api/v1/sections",
        headers=admin,
        json={
            **base,
            "section_number": "ROOM-C",
            "teacher_id": data.other_teacher.id,
            "meetings": [
                {"meeting_day": 3, "start_time": "09:00", "end_time": "10:00", "room_id": room_id}
            ],
        },
    )
    assert disjoint.status_code == 201

    # Patching a section back to its own room/slot must not conflict with itself.
    identity = first.json()["section_id"]
    unchanged = await client.patch(
        f"/api/v1/sections/{identity}",
        headers=admin,
        json={
            "meetings": [
                {"meeting_day": 3, "start_time": "08:00", "end_time": "09:00", "room_id": room_id}
            ]
        },
    )
    assert unchanged.status_code == 200


async def test_room_double_booking_is_serialized(data):
    # Admin writes take the exclusive academic lock, so two concurrent requests to assign
    # different teachers to the same room/slot are fully serialized: the second one always
    # sees the first's committed meeting and is rejected, never both or neither.
    room_id = data.rooms[0]

    def payload(number, teacher_id):
        return SectionCreate(
            course_id=data.course,
            semester_id=data.semesters[0],
            section_number=number,
            capacity=2,
            teacher_id=teacher_id,
            meetings=[
                {
                    "meeting_day": 4,
                    "start_time": "08:00",
                    "end_time": "09:00",
                    "room_id": room_id,
                }
            ],
        )

    results = await asyncio.wait_for(
        asyncio.gather(
            create_section(payload("RACE-A", data.teacher.id)),
            create_section(payload("RACE-B", data.other_teacher.id)),
            return_exceptions=True,
        ),
        timeout=20,
    )
    successes = [r for r in results if not isinstance(r, Exception)]
    failures = [r for r in results if isinstance(r, AppError)]
    assert len(successes) == len(failures) == 1, results
    assert failures[0].code == "ROOM_CONFLICT"
