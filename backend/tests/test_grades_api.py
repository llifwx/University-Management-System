from datetime import date, timedelta
from types import SimpleNamespace

from sqlalchemy import update

from app.models import Semester
from app.modules.grades.service import letter


def reg(a1=None, a2=None, fe=None):
    return SimpleNamespace(attestation_1=a1, attestation_2=a2, final_exam=fe)


def test_letter_scale():
    assert letter(reg(28, 27)) is None  # no final exam yet -> not graded
    assert letter(reg(29, 28.38, 29)) == ("B+", 3.33, "Good")  # 86.38
    assert letter(reg(30, 30, 35))[0] == "A"
    assert letter(reg(16.85, 26.5, 29))[0] == "C+"  # 72.35
    assert letter(reg(15, 15, 10))[:2] == ("F", 0.0)
    # Semester over: no final exam, or not admitted (attestations < 30), is an F.
    assert letter(reg(28, 27), closed=True)[0] == "F"
    assert letter(reg(10, 10), closed=True)[0] == "F"
    assert letter(reg(10, 10)) is None


async def set_semester(db_factory, semester_id, *, ended: bool):
    today = date.today()
    end = today - timedelta(days=1) if ended else today + timedelta(days=30)
    async with db_factory() as db, db.begin():
        await db.execute(
            update(Semester)
            .where(Semester.semester_id == semester_id)
            .values(start_date=today - timedelta(days=200), end_date=end)
        )


async def enroll(client, student, data):
    response = await client.post(
        "/api/v1/registrations",
        headers=student,
        json={"section_id": data.sections[0], "semester_id": data.semesters[0]},
    )
    assert response.status_code == 201
    return response.json()["registration_id"]


async def test_teacher_grades_flow_into_transcript(client, data, headers, db_factory):
    await set_semester(db_factory, data.semesters[0], ended=False)
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)
    other_teacher = await headers(data.other_teacher)
    registration = await enroll(client, student, data)
    url = f"/api/v1/sections/{data.sections[0]}/grades"

    sheet = await client.get(url, headers=teacher)
    assert sheet.status_code == 200
    assert sheet.json()["editable"] is True and sheet.json()["closed"] is False
    assert [r["registration_id"] for r in sheet.json()["rows"]] == [registration]

    assert (await client.get(url, headers=other_teacher)).status_code == 403
    assert (await client.get(url, headers=student)).status_code == 403
    too_high = [{"registration_id": registration, "attestation_1": 31}]
    assert (await client.patch(url, headers=teacher, json=too_high)).status_code == 422
    stranger = [{"registration_id": 999999, "attestation_1": 10}]
    assert (await client.patch(url, headers=teacher, json=stranger)).status_code == 404

    # Not admitted: 14 + 15 < 30, so the final exam cannot be entered.
    low = [{"registration_id": registration, "attestation_1": 14, "attestation_2": 15}]
    saved = await client.patch(url, headers=teacher, json=low)
    assert saved.json()["rows"][0]["admitted"] is False
    blocked = await client.patch(url, headers=teacher, json=[{**low[0], "final_exam": 30}])
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "NOT_ADMITTED"

    partial = [{"registration_id": registration, "attestation_1": 25.5, "attestation_2": 27}]
    row = (await client.patch(url, headers=teacher, json=partial)).json()["rows"][0]
    assert row["total"] == 52.5 and row["letter"] is None and row["admitted"] is True

    mine = (await client.get("/api/v1/students/me/grades", headers=student)).json()
    course = mine["semesters"][0]["courses"][0]
    assert course["attestation_1"] == 25.5 and course["letter"] is None
    assert mine["summary"] == {
        "credits_taken": 3,
        "credits_earned": 0,
        "ects_taken": 0,
        "ects_earned": 0,
        "gpa": None,
    }

    final = [{**partial[0], "final_exam": 35}]
    saved = await client.patch(url, headers=teacher, json=final)
    assert saved.json()["rows"][0]["letter"] == "B+"
    mine = (await client.get("/api/v1/students/me/grades", headers=student)).json()
    assert mine["semesters"][0]["courses"][0]["traditional"] == "Good"
    assert mine["summary"]["credits_earned"] == 3
    assert mine["summary"]["gpa"] == 3.33


async def test_grades_lock_for_teachers_after_semester_end(client, data, headers, db_factory):
    await set_semester(db_factory, data.semesters[0], ended=False)
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)
    admin = await headers(data.admin)
    registration = await enroll(client, student, data)
    url = f"/api/v1/sections/{data.sections[0]}/grades"
    marks = [{"registration_id": registration, "attestation_1": 28, "attestation_2": 27}]
    assert (await client.patch(url, headers=teacher, json=marks)).status_code == 200

    await set_semester(db_factory, data.semesters[0], ended=True)
    sheet = (await client.get(url, headers=teacher)).json()
    assert sheet["closed"] is True and sheet["editable"] is False
    # No final exam by the end of the semester -> F.
    assert sheet["rows"][0]["letter"] == "F"
    locked = await client.patch(url, headers=teacher, json=[{**marks[0], "final_exam": 30}])
    assert locked.status_code == 409 and locked.json()["error"]["code"] == "GRADING_CLOSED"

    assert (await client.get(url, headers=admin)).json()["editable"] is True
    fixed = await client.patch(url, headers=admin, json=[{**marks[0], "final_exam": 30}])
    assert fixed.status_code == 200 and fixed.json()["rows"][0]["letter"] == "B+"  # 85


async def test_admin_reads_any_students_grades(client, data, headers, db_factory):
    await set_semester(db_factory, data.semesters[0], ended=False)
    student = await headers(data.actors[0])
    other = await headers(data.actors[1])
    admin = await headers(data.admin)
    await enroll(client, student, data)
    url = f"/api/v1/students/{data.students[0]}/grades"

    response = await client.get(url, headers=admin)
    assert response.status_code == 200
    assert response.json()["semesters"][0]["courses"][0]["course_code"] == "CS101"
    assert (await client.get(url, headers=other)).status_code == 403
    assert (await client.get(url, headers=student)).status_code == 403
    missing = await client.get("/api/v1/students/999999/grades", headers=admin)
    assert missing.status_code == 404
    # The literal path still serves the student's own grades.
    assert (await client.get("/api/v1/students/me/grades", headers=student)).status_code == 200
