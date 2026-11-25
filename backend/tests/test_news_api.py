from app.modules.news import service as news_service


async def test_admin_publishes_news_and_students_read_it(
    client, data, headers, tmp_path, monkeypatch
):
    monkeypatch.setattr(news_service, "ATTACHMENTS_DIR", tmp_path)
    admin = await headers(data.admin)
    student = await headers(data.actors[0])

    forbidden = await client.post(
        "/api/v1/news", headers=student, data={"title": "Hi", "body": "Text"}
    )
    assert forbidden.status_code == 403

    rejected = await client.post(
        "/api/v1/news",
        headers=admin,
        data={"title": "Hi", "body": "Text"},
        files={"file": ("x.exe", b"MZ", "application/octet-stream")},
    )
    assert rejected.status_code == 415

    first = await client.post("/api/v1/news", headers=admin, data={"title": "Old", "body": "One"})
    assert first.status_code == 201
    assert first.json()["attachment_url"] is None

    created = await client.post(
        "/api/v1/news",
        headers=admin,
        data={"title": "Exams", "body": "Schedule attached"},
        files={"file": ("schedule.pdf", b"%PDF-bytes", "application/pdf")},
    )
    assert created.status_code == 201
    news = created.json()

    listed = await client.get("/api/v1/news", headers=student)
    assert listed.status_code == 200
    assert [n["title"] for n in listed.json()["items"]] == ["Exams", "Old"]  # Newest first.

    detail = await client.get(f"/api/v1/news/{news['id']}", headers=student)
    assert detail.json()["body"] == "Schedule attached"

    fetched = await client.get(f"/api/v1{news['attachment_url']}", headers=student)
    assert fetched.status_code == 200
    assert fetched.content == b"%PDF-bytes"

    assert (await client.delete(f"/api/v1/news/{news['id']}", headers=student)).status_code == 403
    assert (await client.delete(f"/api/v1/news/{news['id']}", headers=admin)).status_code == 200
    assert not list(tmp_path.iterdir())  # Attachment file removed with the news item.
    gone = await client.get(f"/api/v1/news/{news['id']}", headers=student)
    assert gone.status_code == 404


async def test_admin_edits_news_and_replaces_attachment(
    client, data, headers, tmp_path, monkeypatch
):
    monkeypatch.setattr(news_service, "ATTACHMENTS_DIR", tmp_path)
    admin = await headers(data.admin)
    student = await headers(data.actors[0])
    created = await client.post(
        "/api/v1/news",
        headers=admin,
        data={"title": "Draft", "body": "Old text"},
        files={"file": ("a.pdf", b"%PDF-old", "application/pdf")},
    )
    news_id = created.json()["id"]
    url = f"/api/v1/news/{news_id}"

    assert (await client.patch(url, headers=student, data={"title": "x"})).status_code == 403

    renamed = await client.patch(url, headers=admin, data={"title": "Final"})
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Final"
    assert renamed.json()["body"] == "Old text"  # Omitted fields stay as they were.

    replaced = await client.patch(
        url, headers=admin, files={"file": ("b.png", b"\x89PNG-new", "image/png")}
    )
    assert replaced.json()["attachment_name"] == "b.png"
    assert [p.name for p in tmp_path.iterdir()] == [f"{news_id}.png"]  # Old PDF removed.
    fetched = await client.get(f"{url}/attachment", headers=student)
    assert fetched.content == b"\x89PNG-new"

    cleared = await client.patch(url, headers=admin, data={"remove_attachment": "true"})
    assert cleared.json()["attachment_url"] is None
    assert not list(tmp_path.iterdir())
