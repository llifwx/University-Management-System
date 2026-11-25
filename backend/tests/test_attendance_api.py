from datetime import date, timedelta

from tests.test_grades_api import enroll, set_semester


async def test_teacher_takes_attendance_and_student_sees_it(client, data, db_factory, headers):
    await set_semester(db_factory, data.semesters[0], ended=False)
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)
    registration_id = await enroll(client, student, data)  # Section A meets Mondays 10:00.

    today = date.today()
    monday = today - timedelta(days=today.weekday())
    classes = await client.get(
        "/api/v1/attendance/classes", headers=teacher, params={"date": monday.isoformat()}
    )
    assert classes.status_code == 200
    lesson = next(c for c in classes.json() if c["section_id"] == data.sections[0])
    assert (lesson["enrolled"], lesson["marked"]) == (1, 0)
    url = f"/api/v1/attendance/classes/{lesson['meeting_id']}"
    params = {"date": monday.isoformat()}

    sheet = await client.get(url, headers=teacher, params=params)
    assert [r["status"] for r in sheet.json()["rows"]] == [None]

    saved = await client.patch(
        url,
        headers=teacher,
        params=params,
        json=[{"registration_id": registration_id, "status": "LATE"}],
    )
    assert saved.status_code == 200
    assert saved.json()["rows"][0]["status"] == "LATE"
    assert saved.json()["lesson"]["marked"] == 1

    # Re-marking updates in place rather than duplicating.
    await client.patch(
        url,
        headers=teacher,
        params=params,
        json=[{"registration_id": registration_id, "status": "ABSENT"}],
    )
    mine = await client.get("/api/v1/students/me/attendance", headers=student)
    assert mine.status_code == 200
    course = mine.json()["semesters"][0]["courses"][0]
    assert (course["present"], course["late"], course["absent"], course["rate"]) == (0, 0, 1, 0.0)

    # Wrong weekday, future class, another teacher, and students are all rejected.
    tuesday = {"date": (monday + timedelta(days=1)).isoformat()}
    assert (await client.get(url, headers=teacher, params=tuesday)).status_code == 404
    future = {"date": (monday + timedelta(days=7)).isoformat()}
    body = [{"registration_id": registration_id, "status": "PRESENT"}]
    assert (await client.patch(url, headers=teacher, params=future, json=body)).status_code == 409
    other = await headers(data.other_teacher)
    assert (await client.get(url, headers=other, params=params)).status_code == 403
    assert (await client.get(url, headers=student, params=params)).status_code == 403

    cleared = await client.patch(
        url,
        headers=teacher,
        params=params,
        json=[{"registration_id": registration_id, "status": None}],
    )
    assert cleared.json()["rows"][0]["status"] is None
