from types import SimpleNamespace

from app.modules.grades.service import letter


def reg(a1=None, a2=None, fe=None):
    return SimpleNamespace(attestation_1=a1, attestation_2=a2, final_exam=fe)


def test_letter_scale():
    assert letter(reg(28, 27)) is None  # no final exam yet -> not graded
    assert letter(reg(29, 28.38, 29)) == ("B+", 3.33, "Good")  # 86.38
    assert letter(reg(30, 30, 35))[0] == "A"
    assert letter(reg(16.85, 26.5, 29))[0] == "C+"  # 72.35
    assert letter(reg(10, 10, 10))[:2] == ("F", 0.0)


async def test_teacher_grades_flow_into_transcript(client, data, headers):
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)
    other_teacher = await headers(data.other_teacher)
    section = data.sections[0]
    enrolled = await client.post(
        "/api/v1/registrations",
        headers=student,
        json={"section_id": section, "semester_id": data.semesters[0]},
    )
    assert enrolled.status_code == 201
    registration = enrolled.json()["registration_id"]

    sheet = await client.get(f"/api/v1/sections/{section}/grades", headers=teacher)
    assert sheet.status_code == 200
    assert [r["registration_id"] for r in sheet.json()] == [registration]

    url = f"/api/v1/sections/{section}/grades"
    assert (await client.get(url, headers=other_teacher)).status_code == 403
    assert (await client.get(url, headers=student)).status_code == 403
    too_high = [{"registration_id": registration, "attestation_1": 31}]
    assert (await client.patch(url, headers=teacher, json=too_high)).status_code == 422
    stranger = [{"registration_id": 999999, "attestation_1": 10}]
    assert (await client.patch(url, headers=teacher, json=stranger)).status_code == 404

    partial = [{"registration_id": registration, "attestation_1": 25.5, "attestation_2": 27}]
    saved = await client.patch(url, headers=teacher, json=partial)
    assert saved.status_code == 200
    assert saved.json()[0]["total"] == 52.5 and saved.json()[0]["letter"] is None

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
    assert (await client.patch(url, headers=teacher, json=final)).json()[0]["letter"] == "B+"
    mine = (await client.get("/api/v1/students/me/grades", headers=student)).json()
    assert mine["semesters"][0]["courses"][0]["traditional"] == "Good"
    assert mine["summary"]["credits_earned"] == 3
    assert mine["summary"]["gpa"] == 3.33
