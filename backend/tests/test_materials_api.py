async def _enroll(client, student_headers, section_id, semester_id):
    response = await client.post(
        "/api/v1/registrations",
        headers=student_headers,
        json={"section_id": section_id, "semester_id": semester_id},
    )
    assert response.status_code == 201


async def _upload(client, headers, section_id, *, category="syllabus", title="Syllabus", file=None):
    return await client.post(
        "/api/v1/materials",
        headers=headers,
        data={"section_id": section_id, "category": category, "title": title},
        files={"file": file or ("syllabus.pdf", b"%PDF-bytes", "application/pdf")},
    )


async def test_teacher_uploads_and_student_sees_it_only_after_enrolling(client, data, headers):
    teacher = await headers(data.teacher)
    student = await headers(data.actors[0])

    uploaded = await _upload(client, teacher, data.sections[0])
    assert uploaded.status_code == 201
    body = uploaded.json()
    assert body["course_code"] == "CS101"
    assert body["section_number"] == "A"
    assert body["uploaded_by_name"] == "Grace Hopper"
    assert body["attachment_url"].endswith("/attachment")

    before = await client.get("/api/v1/materials", headers=student)
    assert before.json()["items"] == []

    await _enroll(client, student, data.sections[0], data.semesters[0])

    after = await client.get("/api/v1/materials", headers=student)
    rows = after.json()["items"]
    assert len(rows) == 1
    assert rows[0]["title"] == "Syllabus"

    scoped = await client.get(
        "/api/v1/materials", headers=student, params={"section_id": data.sections[0]}
    )
    assert len(scoped.json()["items"]) == 1


async def test_teacher_cannot_upload_to_a_section_they_dont_teach(client, data, headers):
    other_teacher = await headers(data.other_teacher)
    rejected = await _upload(client, other_teacher, data.sections[0])
    assert rejected.status_code == 403
    assert rejected.json()["error"]["code"] == "NOT_YOUR_SECTION"


async def test_student_outside_the_section_cannot_see_its_materials(client, data, headers):
    teacher = await headers(data.teacher)
    outsider = await headers(data.actors[1])
    await _upload(client, teacher, data.sections[0])

    scoped = await client.get(
        "/api/v1/materials", headers=outsider, params={"section_id": data.sections[0]}
    )
    assert scoped.status_code == 403
    assert scoped.json()["error"]["code"] == "NOT_REGISTERED"

    unscoped = await client.get("/api/v1/materials", headers=outsider)
    assert unscoped.status_code == 200
    assert unscoped.json()["items"] == []


async def test_student_cannot_upload(client, data, headers):
    student = await headers(data.actors[0])
    rejected = await _upload(client, student, data.sections[0])
    assert rejected.status_code == 403


async def test_category_filter_and_validation(client, data, headers):
    teacher = await headers(data.teacher)
    await _upload(client, teacher, data.sections[0], category="homework", title="HW 1")
    await _upload(client, teacher, data.sections[0], category="practice", title="Practice 1")

    homework_only = await client.get(
        "/api/v1/materials",
        headers=teacher,
        params={"section_id": data.sections[0], "category": "homework"},
    )
    rows = homework_only.json()["items"]
    assert [r["title"] for r in rows] == ["HW 1"]

    bad_category = await _upload(client, teacher, data.sections[0], category="exam")
    assert bad_category.status_code == 422
    assert bad_category.json()["error"]["code"] == "INVALID_CATEGORY"

    unsupported = await client.post(
        "/api/v1/materials",
        headers=teacher,
        data={"section_id": data.sections[0], "category": "other", "title": "Notes"},
        files={"file": ("notes.exe", b"binary", "application/x-msdownload")},
    )
    assert unsupported.status_code == 415

    no_file = await client.post(
        "/api/v1/materials",
        headers=teacher,
        data={"section_id": data.sections[0], "category": "other", "title": "Notes"},
    )
    assert no_file.status_code == 422
    assert no_file.json()["error"]["code"] == "ATTACHMENT_REQUIRED"


async def test_attachment_download_authorization_and_deletion(
    client, data, headers, tmp_path, monkeypatch
):
    from app.modules.materials import service as materials_service

    monkeypatch.setattr(materials_service, "ATTACHMENTS_DIR", tmp_path)
    teacher = await headers(data.teacher)
    other_teacher = await headers(data.other_teacher)
    student = await headers(data.actors[0])
    outsider = await headers(data.actors[1])
    await _enroll(client, student, data.sections[0], data.semesters[0])

    uploaded = await _upload(
        client, teacher, data.sections[0], file=("syllabus.pdf", b"%PDF-content", "application/pdf")
    )
    attachment_url = uploaded.json()["attachment_url"]

    as_teacher = await client.get(f"/api/v1{attachment_url}", headers=teacher)
    assert as_teacher.status_code == 200
    assert as_teacher.content == b"%PDF-content"

    as_student = await client.get(f"/api/v1{attachment_url}", headers=student)
    assert as_student.status_code == 200

    forbidden = await client.get(f"/api/v1{attachment_url}", headers=outsider)
    assert forbidden.status_code == 403

    material_id = uploaded.json()["id"]
    wrong_owner = await client.delete(f"/api/v1/materials/{material_id}", headers=other_teacher)
    assert wrong_owner.status_code == 403

    deleted = await client.delete(f"/api/v1/materials/{material_id}", headers=teacher)
    assert deleted.status_code == 200

    gone = await client.get(f"/api/v1{attachment_url}", headers=teacher)
    assert gone.status_code == 404
