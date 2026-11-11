from sqlalchemy import func, select

from app.models import User
from app.modules.registrations.service import enroll
from tests.conftest import PASSWORD


async def test_catalog_crud(client, data, headers):
    admin = await headers(data.admin)
    student = await headers(data.actors[0])
    response = await client.post(
        "/api/v1/courses",
        headers=admin,
        json={
            "course_code": "NEW101",
            "course_title": "New subject",
            "credits": 3,
        },
    )
    assert response.status_code == 201
    identity = response.json()["course_id"]
    path = f"/api/v1/courses/{identity}"
    assert (await client.patch(path, headers=student, json={"credits": 4})).status_code == 403
    assert (await client.patch(path, headers=admin, json={"credits": 4})).json()["credits"] == 4
    assert (await client.get(path, headers=student)).json()["course_code"] == "NEW101"
    page = await client.get("/api/v1/courses?offset=1&limit=1", headers=student)
    assert page.json()["total"] == 2 and len(page.json()["items"]) == 1
    assert (await client.delete(path, headers=admin)).status_code == 200
    assert (await client.get(path, headers=student)).status_code == 404
    assert (await client.delete(f"/api/v1/courses/{data.course}", headers=admin)).status_code == 409


async def test_semester_crud_and_partial_interval_validation(client, data, headers):
    admin = await headers(data.admin)
    response = await client.post(
        "/api/v1/semesters",
        headers=admin,
        json={
            "name": "New term",
            "start_date": "2028-01-01",
            "end_date": "2028-06-01",
        },
    )
    assert response.status_code == 201
    path = f"/api/v1/semesters/{response.json()['semester_id']}"
    assert (
        await client.patch(path, headers=admin, json={"start_date": "2029-01-01"})
    ).status_code == 400
    assert (await client.patch(path, headers=admin, json={"is_active": False})).json()[
        "is_active"
    ] is False
    assert (await client.get(path, headers=admin)).status_code == 200
    assert (await client.delete(path, headers=admin)).status_code == 200


async def test_section_crud_teacher_assignment_and_meetings(client, data, headers):
    admin = await headers(data.admin)
    payload = {
        "course_id": data.course,
        "semester_id": data.semesters[0],
        "capacity": 2,
        "section_number": "ADMIN",
        "teacher_id": data.teacher.id,
        "meetings": [{"meeting_day": 0, "start_time": "08:00", "end_time": "09:00"}],
    }
    invalid = await client.post(
        "/api/v1/sections", headers=admin, json={**payload, "teacher_id": data.actors[0].id}
    )
    assert invalid.status_code == 400
    response = await client.post("/api/v1/sections", headers=admin, json=payload)
    assert response.status_code == 201
    identity = response.json()["section_id"]
    path = f"/api/v1/sections/{identity}"
    assert response.json()["remaining_capacity"] == 2
    # Replacing identical meetings must not fail on the meeting uniqueness constraint.
    patched = await client.patch(
        path,
        headers=admin,
        json={
            "meetings": payload["meetings"],
            "teacher_id": data.other_teacher.id,
        },
    )
    assert patched.status_code == 200
    assert patched.json()["teacher_id"] == data.other_teacher.id
    assert (await client.get(path, headers=admin)).status_code == 200
    assert (await client.delete(path, headers=admin)).status_code == 200


async def test_student_create_patch_email_and_deactivate(client, data, headers, db_factory):
    admin = await headers(data.admin)
    before = None
    async with db_factory() as db:
        before = await db.scalar(select(func.count()).select_from(User))
    response = await client.post(
        "/api/v1/students",
        headers=admin,
        json={
            "email": "new@example.edu",
            "password": PASSWORD,
            "full_name": "New Student",
            "year_level": 1,
            "program": "BIS",
        },
    )
    assert response.status_code == 201
    identity = response.json()["student_id"]
    path = f"/api/v1/students/{identity}"
    changed = await client.patch(
        path, headers=admin, json={"email": "changed@example.edu", "program": None}
    )
    assert changed.json()["email"] == "changed@example.edu" and changed.json()["program"] is None
    pair = await client.post(
        "/api/v1/auth/login", data={"username": "changed@example.edu", "password": PASSWORD}
    )
    assert pair.status_code == 200
    duplicate = await client.post(
        "/api/v1/students",
        headers=admin,
        json={
            "email": "changed@example.edu",
            "password": PASSWORD,
            "full_name": "Duplicate",
            "year_level": 1,
        },
    )
    assert duplicate.status_code == 409
    async with db_factory() as db:
        assert await db.scalar(select(func.count()).select_from(User)) == before + 1
    assert (await client.delete(path, headers=admin)).status_code == 200
    assert (
        await client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {pair.json()['access_token']}",
            },
        )
    ).status_code == 401


async def test_admin_registration_status_and_filters(client, data, headers):
    admin = await headers(data.admin)
    response = await client.post(
        "/api/v1/registrations/admin",
        headers=admin,
        json={
            "student_id": data.students[0],
            "section_id": data.sections[7],
            "semester_id": data.semesters[0],
        },
    )
    assert response.status_code == 201
    available = (
        await client.get(
            "/api/v1/sections",
            headers=admin,
            params={
                "available_only": True,
                "semester_id": data.semesters[0],
                "course_id": data.course,
                "teacher_id": data.teacher.id,
            },
        )
    ).json()
    assert all(s["section_id"] != data.sections[7] for s in available["items"])
    identity = response.json()["registration_id"]
    assert (
        await client.patch(
            f"/api/v1/registrations/{identity}/status", headers=admin, json={"status": "Pending"}
        )
    ).json()["status"] == "Pending"
    assert (
        await client.get(
            "/api/v1/registrations", headers=admin, params={"section_id": data.sections[7]}
        )
    ).json()["total"] == 1


async def test_deleting_student_releases_seat(client, data, headers):
    await enroll(data.actors[0], data.sections[7], data.semesters[0])
    response = await client.delete(
        f"/api/v1/students/{data.students[0]}", headers=await headers(data.admin)
    )
    assert response.status_code == 200
    assert (await enroll(data.actors[1], data.sections[7], data.semesters[0])).status == "Enrolled"


async def test_admin_can_create_teacher_and_reset_password(client, data, headers):
    admin = await headers(data.admin)
    teacher_headers = await headers(data.teacher)
    payload = {"email": "newteacher@example.edu", "password": PASSWORD, "role": "TEACHER"}
    nameless = await client.post("/api/v1/users", headers=admin, json=payload)
    assert nameless.status_code == 422
    created = await client.post(
        "/api/v1/users",
        headers=admin,
        json={**payload, "full_name": "Ada Lovelace", "department": "Mathematics"},
    )
    assert created.status_code == 201
    assert created.json()["full_name"] == "Ada Lovelace"
    assert created.json()["title"] is None
    profile = await client.patch(
        f"/api/v1/users/{created.json()['id']}",
        headers=admin,
        json={"title": "Professor", "department": None, "phone": "+1 555-0100"},
    )
    assert profile.json() | {"title": "Professor", "department": None} == profile.json()
    bad = await client.patch(
        f"/api/v1/users/{created.json()['id']}", headers=admin, json={"full_name": None}
    )
    assert bad.status_code == 422
    reset = await client.patch(
        f"/api/v1/users/{data.teacher.id}",
        headers=admin,
        json={"password": "Changed-password-1234"},
    )
    assert reset.status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=teacher_headers)).status_code == 401
