from datetime import UTC, datetime, timedelta

from app.modules.messaging import service as messaging_service


def test_ticket_is_single_use_and_expires():
    ticket = messaging_service.issue_ticket(42)
    assert messaging_service._consume_ticket(ticket) == 42
    assert messaging_service._consume_ticket(ticket) is None  # Replay is rejected.

    stale = messaging_service.issue_ticket(7)
    messaging_service._tickets[stale] = (7, datetime.now(UTC) - timedelta(seconds=1))
    assert messaging_service._consume_ticket(stale) is None


async def _enroll(client, student_headers, section_id, semester_id):
    response = await client.post(
        "/api/v1/registrations",
        headers=student_headers,
        json={"section_id": section_id, "semester_id": semester_id},
    )
    assert response.status_code == 201
    return response.json()


async def test_contacts_require_a_real_teaching_relationship(client, data, headers):
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)

    empty = await client.get("/api/v1/messaging/contacts", headers=student)
    assert empty.status_code == 200
    assert empty.json()["items"] == []

    await _enroll(client, student, data.sections[0], data.semesters[0])

    contacts = await client.get("/api/v1/messaging/contacts", headers=student)
    rows = contacts.json()["items"]
    assert len(rows) == 1
    assert rows[0]["user_id"] == data.teacher.id
    assert rows[0]["thread_id"] is None

    teacher_contacts = await client.get("/api/v1/messaging/contacts", headers=teacher)
    teacher_rows = teacher_contacts.json()["items"]
    assert len(teacher_rows) == 1
    assert teacher_rows[0]["user_id"] == data.actors[0].id
    assert teacher_rows[0]["display_name"] == "Student 0"


async def test_send_message_creates_thread_lazily_and_both_sides_read_it(client, data, headers):
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)
    await _enroll(client, student, data.sections[0], data.semesters[0])

    sent = await client.post(
        f"/api/v1/messaging/with/{data.teacher.id}/messages",
        headers=student,
        data={"body": "Can we discuss my grade?"},
    )
    assert sent.status_code == 201
    message = sent.json()
    assert message["sender_role"] == "STUDENT"
    thread_id = message["thread_id"]

    teacher_contacts = (await client.get("/api/v1/messaging/contacts", headers=teacher)).json()[
        "items"
    ]
    assert teacher_contacts[0]["thread_id"] == thread_id
    assert teacher_contacts[0]["unread"] is True

    history = await client.get(
        f"/api/v1/messaging/with/{data.actors[0].id}/messages", headers=teacher
    )
    assert [m["body"] for m in history.json()["items"]] == ["Can we discuss my grade?"]

    reply = await client.post(
        f"/api/v1/messaging/with/{data.actors[0].id}/messages",
        headers=teacher,
        data={"body": "Sure, after class."},
    )
    assert reply.status_code == 201
    assert reply.json()["sender_role"] == "TEACHER"

    student_contacts = (await client.get("/api/v1/messaging/contacts", headers=student)).json()[
        "items"
    ]
    assert student_contacts[0]["unread"] is True

    marked = await client.post(f"/api/v1/messaging/with/{data.teacher.id}/read", headers=student)
    assert marked.status_code == 200
    student_contacts_after = (
        await client.get("/api/v1/messaging/contacts", headers=student)
    ).json()["items"]
    assert student_contacts_after[0]["unread"] is False


async def test_cannot_message_someone_outside_the_teaching_relationship(client, data, headers):
    unrelated_student = await headers(data.actors[1])
    admin = await headers(data.admin)

    refused = await client.post(
        f"/api/v1/messaging/with/{data.teacher.id}/messages",
        headers=unrelated_student,
        data={"body": "hi"},
    )
    assert refused.status_code == 403
    assert refused.json()["error"]["code"] == "NOT_A_TEACHER_OR_STUDENT_OF"

    # A student can only message a teacher, not another student.
    wrong_role = await client.post(
        f"/api/v1/messaging/with/{data.actors[0].id}/messages",
        headers=unrelated_student,
        data={"body": "hi"},
    )
    assert wrong_role.status_code == 400
    assert wrong_role.json()["error"]["code"] == "INVALID_COUNTERPART"

    # The route itself is for teachers and students only.
    forbidden = await client.post(
        f"/api/v1/messaging/with/{data.actors[0].id}/messages", headers=admin, data={"body": "hi"}
    )
    assert forbidden.status_code == 403


async def test_messaging_attachment_upload_and_authorization(
    client, data, headers, tmp_path, monkeypatch
):
    monkeypatch.setattr(messaging_service, "ATTACHMENTS_DIR", tmp_path)
    student = await headers(data.actors[0])
    teacher = await headers(data.teacher)
    outsider = await headers(data.actors[1])
    await _enroll(client, student, data.sections[0], data.semesters[0])

    rejected = await client.post(
        f"/api/v1/messaging/with/{data.teacher.id}/messages",
        headers=student,
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )
    assert rejected.status_code == 415

    uploaded = await client.post(
        f"/api/v1/messaging/with/{data.teacher.id}/messages",
        headers=student,
        data={"body": "see attached"},
        files={"file": ("photo.png", b"\x89PNG-bytes", "image/png")},
    )
    assert uploaded.status_code == 201
    attachment_url = uploaded.json()["attachment_url"]
    assert attachment_url is not None

    fetched = await client.get(f"/api/v1{attachment_url}", headers=student)
    assert fetched.status_code == 200
    assert fetched.content == b"\x89PNG-bytes"

    as_teacher = await client.get(f"/api/v1{attachment_url}", headers=teacher)
    assert as_teacher.status_code == 200

    forbidden = await client.get(f"/api/v1{attachment_url}", headers=outsider)
    assert forbidden.status_code == 403


async def test_ws_ticket_issuance_requires_auth(client, data, headers):
    student = await headers(data.actors[0])
    response = await client.post("/api/v1/messaging/ws-ticket", headers=student)
    assert response.status_code == 200
    body = response.json()
    assert body["expires_in"] == 30
    assert messaging_service._consume_ticket(body["ticket"]) == data.actors[0].id

    anonymous = await client.post("/api/v1/messaging/ws-ticket")
    assert anonymous.status_code == 401
