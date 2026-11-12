from datetime import UTC, datetime, timedelta

from app.modules.chat import service as chat_service


def test_ticket_is_single_use_and_expires():
    ticket = chat_service.issue_ticket(42)
    assert chat_service._consume_ticket(ticket) == 42
    assert chat_service._consume_ticket(ticket) is None  # Replay is rejected.

    stale = chat_service.issue_ticket(7)
    chat_service._tickets[stale] = (7, datetime.now(UTC) - timedelta(seconds=1))
    assert chat_service._consume_ticket(stale) is None


async def test_student_thread_is_created_lazily_and_messaged(client, data, headers):
    student = await headers(data.actors[0])

    thread = await client.get("/api/v1/chat/threads/me", headers=student)
    assert thread.status_code == 200
    body = thread.json()
    assert body["user_id"] == data.actors[0].id
    assert body["admin_unread"] is False  # No message sent yet.

    sent = await client.post(
        "/api/v1/chat/threads/me/messages", headers=student, data={"body": "Need help"}
    )
    assert sent.status_code == 201
    message = sent.json()
    assert message["body"] == "Need help"
    assert message["sender_role"] == "STUDENT"
    assert message["attachment_url"] is None

    history = await client.get("/api/v1/chat/threads/me/messages", headers=student)
    assert history.status_code == 200
    assert [m["body"] for m in history.json()["items"]] == ["Need help"]

    empty = await client.post("/api/v1/chat/threads/me/messages", headers=student)
    assert empty.status_code == 422


async def test_admin_sees_thread_and_replies(client, data, headers):
    student = await headers(data.actors[0])
    admin = await headers(data.admin)

    await client.post("/api/v1/chat/threads/me/messages", headers=student, data={"body": "Hi"})

    threads = await client.get("/api/v1/chat/threads", headers=admin)
    assert threads.status_code == 200
    rows = threads.json()["items"]
    assert len(rows) == 1
    thread_id = rows[0]["id"]
    assert rows[0]["admin_unread"] is True
    assert rows[0]["display_name"] == "Student 0"

    reply = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages", headers=admin, data={"body": "On it"}
    )
    assert reply.status_code == 201
    assert reply.json()["sender_role"] == "ADMIN"

    mine = await client.get("/api/v1/chat/threads/me", headers=student)
    assert mine.json()["user_unread"] is True

    marked = await client.post("/api/v1/chat/threads/me/read", headers=student)
    assert marked.status_code == 200
    mine_again = await client.get("/api/v1/chat/threads/me", headers=student)
    assert mine_again.json()["user_unread"] is False

    # Another student can't see or reply inside this thread.
    other = await headers(data.actors[1])
    other_thread = await client.get("/api/v1/chat/threads/me", headers=other)
    assert other_thread.json()["id"] != thread_id
    forbidden = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages", headers=other, data={"body": "nope"}
    )
    assert forbidden.status_code == 403  # The route itself is admin-only.


async def test_chat_attachment_upload_and_authorization(
    client, data, headers, tmp_path, monkeypatch
):
    monkeypatch.setattr(chat_service, "ATTACHMENTS_DIR", tmp_path)
    student = await headers(data.actors[0])
    other = await headers(data.actors[1])
    admin = await headers(data.admin)

    rejected = await client.post(
        "/api/v1/chat/threads/me/messages",
        headers=student,
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )
    assert rejected.status_code == 415

    uploaded = await client.post(
        "/api/v1/chat/threads/me/messages",
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

    forbidden = await client.get(f"/api/v1{attachment_url}", headers=other)
    assert forbidden.status_code == 403

    as_admin = await client.get(f"/api/v1{attachment_url}", headers=admin)
    assert as_admin.status_code == 200


async def test_ws_ticket_issuance_requires_auth(client, data, headers):
    student = await headers(data.actors[0])
    response = await client.post("/api/v1/chat/ws-ticket", headers=student)
    assert response.status_code == 200
    body = response.json()
    assert body["expires_in"] == 30
    assert chat_service._consume_ticket(body["ticket"]) == data.actors[0].id

    anonymous = await client.post("/api/v1/chat/ws-ticket")
    assert anonymous.status_code == 401
