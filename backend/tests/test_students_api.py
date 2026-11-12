from app.modules.students import service as student_service


async def test_self_patch_only_allows_phone_and_personal_email(client, data, headers):
    student = await headers(data.actors[0])
    other = await headers(data.actors[1])

    response = await client.patch(
        "/api/v1/students/me",
        headers=student,
        json={"phone_number": "+1 (555) 123-4567", "personal_email": "me@gmail.com"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["phone_number"] == "+1 (555) 123-4567"
    assert body["personal_email"] == "me@gmail.com"
    assert body["student_id"] == data.students[0]

    # Admin-only fields are not part of this contract at all.
    rejected = await client.patch(
        "/api/v1/students/me", headers=student, json={"last_name": "New Name"}
    )
    assert rejected.status_code == 422

    invalid = await client.patch(
        "/api/v1/students/me", headers=student, json={"phone_number": "abc"}
    )
    assert invalid.status_code == 422

    cleared = await client.patch(
        "/api/v1/students/me",
        headers=student,
        json={"phone_number": None, "personal_email": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["phone_number"] is None
    assert cleared.json()["personal_email"] is None

    # A student never acts on another student's row, even indirectly through /me.
    untouched = await client.get("/api/v1/students/me", headers=other)
    assert untouched.json()["phone_number"] is None


async def test_admin_can_set_expanded_record_fields(client, data, headers):
    admin = await headers(data.admin)
    identity = data.students[0]
    response = await client.patch(
        f"/api/v1/students/{identity}",
        headers=admin,
        json={
            "phone_number": "+7 701 234 5678",
            "last_name": "Zhenissova",
            "first_name": "Aruzhan",
            "patronymic": "Nurgalikyzy",
            "birth_date": "2006-10-17",
            "gender": "FEMALE",
            "marital_status": "SINGLE",
            "nationality": "Kazakh",
            "citizenship": "Kazakhstan",
            "is_resident": True,
            "needs_dormitory": True,
            "admission_year": "2024-2025",
            "advisor": "Dr. Smith",
            "study_form": "Bachelor's (4 years)",
            "winter_admission": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["phone_number"] == "+7 701 234 5678"
    assert body["full_name"] == "Zhenissova Aruzhan Nurgalikyzy"
    assert body["birth_date"] == "2006-10-17"
    assert body["gender"] == "FEMALE"
    assert body["needs_dormitory"] is True
    assert body["admission_year"] == "2024-2025"

    invalid_gender = await client.patch(
        f"/api/v1/students/{identity}", headers=admin, json={"gender": "OTHER"}
    )
    assert invalid_gender.status_code == 422

    invalid_year = await client.patch(
        f"/api/v1/students/{identity}", headers=admin, json={"admission_year": "2024"}
    )
    assert invalid_year.status_code == 422

    cleared = await client.patch(
        f"/api/v1/students/{identity}", headers=admin, json={"patronymic": None, "advisor": None}
    )
    assert cleared.status_code == 200
    assert cleared.json()["patronymic"] is None
    assert cleared.json()["advisor"] is None
    assert cleared.json()["full_name"] == "Zhenissova Aruzhan"

    # A student cannot reach any of these through the self-service endpoint.
    student = await headers(data.actors[0])
    forbidden = await client.patch(
        "/api/v1/students/me", headers=student, json={"needs_dormitory": True}
    )
    assert forbidden.status_code == 422


async def test_create_student_with_full_record(client, data, headers):
    admin = await headers(data.admin)
    response = await client.post(
        "/api/v1/students",
        headers=admin,
        json={
            "email": "full-record@example.edu",
            "password": "Fictional-test-password-123",
            "last_name": "Zhenissova",
            "first_name": "Aruzhan",
            "year_level": 1,
            "program": "BIS",
            "nationality": "Kazakh",
            "citizenship": "Kazakhstan",
            "needs_dormitory": True,
            "admission_year": "2024-2025",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["full_name"] == "Zhenissova Aruzhan"
    assert body["is_resident"] is True  # default, unset at creation
    assert body["needs_dormitory"] is True
    assert body["admission_year"] == "2024-2025"
    assert body["patronymic"] is None


async def test_photo_upload_and_retrieval(client, data, headers, tmp_path, monkeypatch):
    monkeypatch.setattr(student_service, "AVATARS_DIR", tmp_path)
    student = await headers(data.actors[0])
    other_student = await headers(data.actors[1])
    admin = await headers(data.admin)
    identity = data.students[0]

    rejected_type = await client.post(
        "/api/v1/students/me/photo",
        headers=student,
        files={"file": ("avatar.txt", b"not an image", "text/plain")},
    )
    assert rejected_type.status_code == 415

    uploaded = await client.post(
        "/api/v1/students/me/photo",
        headers=student,
        files={"file": ("avatar.png", b"\x89PNG-fake-bytes", "image/png")},
    )
    assert uploaded.status_code == 200
    photo_url = uploaded.json()["photo_url"]
    assert photo_url == f"/students/{identity}/photo"

    fetched = await client.get(f"/api/v1{photo_url}", headers=student)
    assert fetched.status_code == 200 and fetched.content == b"\x89PNG-fake-bytes"

    forbidden = await client.get(f"/api/v1{photo_url}", headers=other_student)
    assert forbidden.status_code == 403

    as_admin = await client.get(f"/api/v1{photo_url}", headers=admin)
    assert as_admin.status_code == 200

    # Re-uploading with a different format replaces the old file instead of leaving it behind.
    replaced = await client.post(
        "/api/v1/students/me/photo",
        headers=student,
        files={"file": ("avatar.webp", b"webp-bytes", "image/webp")},
    )
    assert replaced.status_code == 200
    assert list(tmp_path.glob(f"{identity}.*")) == [tmp_path / f"{identity}.webp"]


async def test_photo_rejects_oversized_upload(client, data, headers, tmp_path, monkeypatch):
    monkeypatch.setattr(student_service, "AVATARS_DIR", tmp_path)
    monkeypatch.setattr(student_service, "MAX_PHOTO_BYTES", 10)
    student = await headers(data.actors[0])

    response = await client.post(
        "/api/v1/students/me/photo",
        headers=student,
        files={"file": ("avatar.png", b"way-too-many-bytes-for-the-limit", "image/png")},
    )
    assert response.status_code == 413


async def test_photo_not_found_before_upload(client, data, headers, tmp_path, monkeypatch):
    monkeypatch.setattr(student_service, "AVATARS_DIR", tmp_path)
    admin = await headers(data.admin)
    identity = data.students[0]

    response = await client.get(f"/api/v1/students/{identity}/photo", headers=admin)
    assert response.status_code == 404
