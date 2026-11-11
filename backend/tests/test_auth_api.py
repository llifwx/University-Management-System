from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.core.security import issue_token
from app.modules.registrations.service import enroll
from tests.conftest import PASSWORD


async def login(client, email="student0@example.edu", password=PASSWORD):
    return await client.post("/api/v1/auth/login", data={"username": email, "password": password})


async def test_login_invalid_unauthorized(client, data):
    result = await login(client)
    assert result.status_code == 200
    assert result.json()["token_type"] == "bearer"
    assert (await login(client, password="incorrect")).status_code == 401
    assert (await login(client, email="unknown@example.edu")).status_code == 401
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401 and "error" in response.json()


async def test_expired_token(client, data):
    token = issue_token(
        data.actors[0].id, uuid4(), "access", datetime.now(UTC) - timedelta(seconds=1)
    )
    assert (
        await client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
            },
        )
    ).status_code == 401


async def test_rotation_logout_revocation(client, data):
    initial = (await login(client)).json()
    rotated = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": initial["refresh_token"]}
    )
    assert rotated.status_code == 200
    new = rotated.json()
    assert new["refresh_token"] != initial["refresh_token"]
    headers = {"Authorization": f"Bearer {new['access_token']}"}
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 200
    assert (await client.post("/api/v1/auth/logout", headers=headers)).status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": new["refresh_token"],
            },
        )
    ).status_code == 401


async def test_replay_revokes_entire_family(client, data):
    initial = (await login(client)).json()
    rotated = (
        await client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": initial["refresh_token"],
            },
        )
    ).json()
    assert (
        await client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": initial["refresh_token"],
            },
        )
    ).status_code == 401
    assert (
        await client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {rotated['access_token']}",
            },
        )
    ).status_code == 401
    assert (
        await client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": rotated["refresh_token"],
            },
        )
    ).status_code == 401


async def test_roles_and_private_student_data(client, data, headers):
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)
    assert (await client.get("/api/v1/students", headers=student)).status_code == 403
    assert (await client.get("/api/v1/students/me", headers=student)).json()[
        "user_id"
    ] == data.actors[0].id
    assert (
        await client.get(f"/api/v1/students/{data.students[1]}", headers=student)
    ).status_code == 403
    assert (
        await client.get(
            f"/api/v1/schedules/students/{data.students[1]}",
            params={"semester_id": data.semesters[0]},
            headers=student,
        )
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/registrations",
            headers=teacher,
            json={
                "section_id": data.sections[0],
                "semester_id": data.semesters[0],
            },
        )
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/users",
            headers=student,
            json={
                "email": "hacker@example.edu",
                "password": PASSWORD,
                "role": "ADMIN",
            },
        )
    ).status_code == 403
    registration = await enroll(data.actors[1], data.sections[0], data.semesters[0])
    assert (
        await client.delete(
            f"/api/v1/registrations/{registration.registration_id}", headers=student
        )
    ).status_code == 403


async def test_student_identity_from_token(client, data, headers):
    response = await client.post(
        "/api/v1/registrations",
        headers=await headers(data.actors[0]),
        json={
            "section_id": data.sections[0],
            "semester_id": data.semesters[0],
            "student_id": data.students[1],
        },
    )
    assert response.status_code == 422


async def test_student_registration_schedule_flow(client, data, headers):
    student = await headers(data.actors[0])
    payload = {"section_id": data.sections[0], "semester_id": data.semesters[0]}
    result = await client.post("/api/v1/registrations", headers=student, json=payload)
    assert result.status_code == 201
    registration = result.json()
    assert registration["student_id"] == data.students[0]
    assert (
        await client.post("/api/v1/registrations", headers=student, json=payload)
    ).status_code == 409
    conflicting = await client.post(
        "/api/v1/registrations",
        headers=student,
        json={
            **payload,
            "section_id": data.sections[1],
        },
    )
    assert conflicting.json()["error"]["code"] == "SCHEDULE_CONFLICT"
    schedule = await client.get(
        "/api/v1/schedules/me", headers=student, params={"semester_id": data.semesters[0]}
    )
    assert schedule.status_code == 200
    assert schedule.json()["entries"][0]["start_time"] == "10:00:00"
    assert (await client.get("/api/v1/registrations/me", headers=student)).json()["total"] == 1
    assert (
        await client.delete(
            f"/api/v1/registrations/{registration['registration_id']}", headers=student
        )
    ).json()["status"] == "Cancelled"


async def test_teacher_roster_scope(client, data, headers):
    await enroll(data.actors[0], data.sections[0], data.semesters[0])
    assigned = await headers(data.teacher)
    other = await headers(data.other_teacher)
    assert (await client.get("/api/v1/sections/assigned", headers=assigned)).json()["total"] == 8
    roster = f"/api/v1/sections/{data.sections[0]}/enrollments"
    assert (await client.get(roster, headers=assigned)).json()["total"] == 1
    assert (await client.get(roster, headers=other)).status_code == 403


async def test_health_and_ready(client):
    assert (await client.get("/health")).json() == {"status": "ok"}
    assert (await client.get("/ready")).json() == {"status": "ready"}


async def test_login_lockout_and_reset(client, data):
    for _ in range(5):
        assert (await login(client, password="incorrect-password")).status_code == 401
    # Locked even with the right password, and without revealing whether it was right.
    locked = await login(client)
    assert locked.status_code == 429
    assert locked.json()["error"]["code"] == "TOO_MANY_ATTEMPTS"
    # Other accounts are unaffected.
    assert (await login(client, email="student1@example.edu")).status_code == 200


async def test_success_clears_failures(client, data):
    for _ in range(4):
        await login(client, password="incorrect-password")
    assert (await login(client)).status_code == 200
    for _ in range(4):
        await login(client, password="incorrect-password")
    assert (await login(client)).status_code == 200


async def test_logout_with_refresh_token_only(client, data):
    pair = (await login(client)).json()
    response = await client.post(
        "/api/v1/auth/logout", json={"refresh_token": pair["refresh_token"]}
    )
    assert response.status_code == 200
    me = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {pair['access_token']}"}
    )
    assert me.status_code == 401
    assert (await client.post("/api/v1/auth/logout")).status_code == 401


async def test_logout_all(client, data):
    first, second = (await login(client)).json(), (await login(client)).json()
    headers = {"Authorization": f"Bearer {first['access_token']}"}
    assert (await client.post("/api/v1/auth/logout-all", headers=headers)).status_code == 200
    for pair in (first, second):
        refreshed = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]}
        )
        assert refreshed.status_code == 401


async def test_change_password(client, data):
    current, other = (await login(client)).json(), (await login(client)).json()
    headers = {"Authorization": f"Bearer {current['access_token']}"}
    new_password = "Another-fictional-password-456"
    wrong = await client.post(
        "/api/v1/auth/password",
        headers=headers,
        json={"current_password": "incorrect", "new_password": new_password},
    )
    assert wrong.status_code == 400 and wrong.json()["error"]["code"] == "INVALID_CURRENT_PASSWORD"
    changed = await client.post(
        "/api/v1/auth/password",
        headers=headers,
        json={"current_password": PASSWORD, "new_password": new_password},
    )
    assert changed.status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 200
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    assert (await client.get("/api/v1/auth/me", headers=other_headers)).status_code == 401
    assert (await login(client)).status_code == 401
    assert (await login(client, password=new_password)).status_code == 200


async def test_purge_drops_spent_sessions(client, data, db_factory):
    from sqlalchemy import func, select

    from app.models import AuthSession, RefreshToken
    from app.modules.auth.service import purge_expired

    live = (await login(client)).json()
    dead = (await login(client)).json()
    await client.post("/api/v1/auth/logout", json={"refresh_token": dead["refresh_token"]})
    await purge_expired()
    async with db_factory() as db:
        assert await db.scalar(select(func.count()).select_from(AuthSession)) == 1
        assert await db.scalar(select(func.count()).select_from(RefreshToken)) == 1
    refreshed = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": live["refresh_token"]}
    )
    assert refreshed.status_code == 200
