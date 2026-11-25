from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.schemas import Page
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.modules.auth.schemas import UserOut
from app.modules.news.models import News
from app.modules.news.schemas import NewsOut

ATTACHMENTS_DIR = Path("media/news_attachments")
MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024
ATTACHMENT_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
}


async def list_news(offset: int, limit: int) -> Page[NewsOut]:
    async def operation(db: AsyncSession):
        total = await db.scalar(select(func.count()).select_from(News)) or 0
        rows = await db.scalars(
            select(News)
            .order_by(News.created_at.desc(), News.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return Page[NewsOut](
            items=[NewsOut.model_validate(row) for row in rows],
            total=total,
            offset=offset,
            limit=limit,
        )

    return await transact(operation)


async def get_news(news_id: int) -> NewsOut:
    async def operation(db: AsyncSession):
        return NewsOut.model_validate(await repo.require(db, News, news_id))

    return await transact(operation)


async def create_news(actor: UserOut, title: str, body: str, file: UploadFile | None) -> NewsOut:
    title, body = title.strip(), body.strip()
    if not title or not body:
        raise AppError(422, "EMPTY_NEWS", "Title and text are required.")
    attachment = await _read_attachment(file)

    async def operation(db: AsyncSession):
        news = News(title=title, body=body, author_id=actor.id)
        db.add(news)
        await db.flush()
        if attachment:
            _store_attachment(news, *attachment)
        await db.flush()
        await db.refresh(news)
        return NewsOut.model_validate(news)

    return await transact(operation)


async def update_news(
    news_id: int,
    title: str | None,
    body: str | None,
    file: UploadFile | None,
    remove_attachment: bool,
) -> NewsOut:
    title = title.strip() if title is not None else None
    body = body.strip() if body is not None else None
    if title == "" or body == "":
        raise AppError(422, "EMPTY_NEWS", "Title and text are required.")
    attachment = await _read_attachment(file)

    async def operation(db: AsyncSession):
        news = await repo.require(db, News, news_id, lock=True)
        if title is not None:
            news.title = title
        if body is not None:
            news.body = body
        stale = news.attachment_path if attachment or remove_attachment else None
        if stale:
            news.attachment_path = news.attachment_name = news.attachment_content_type = None
        if attachment:
            _store_attachment(news, *attachment)
        await db.flush()
        await db.refresh(news)
        return NewsOut.model_validate(news), stale, news.attachment_path

    news_out, stale, current = await transact(operation)
    # A replacement with the same extension reuses the filename, so only unlink a different one.
    if stale and stale != current:
        (ATTACHMENTS_DIR / stale).unlink(missing_ok=True)
    return news_out


async def _read_attachment(file: UploadFile | None) -> tuple[bytes, str, str, str] | None:
    """Validated (content, extension, original name, content type), or None when no file."""
    if file is None or not file.filename:
        return None
    content_type = file.content_type or ""
    extension = ATTACHMENT_EXTENSIONS.get(content_type)
    if extension is None:
        raise AppError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Attach an image, PDF, Word, Excel or PowerPoint file.",
        )
    content = await file.read()
    if not content:
        raise AppError(422, "EMPTY_FILE", "The uploaded file is empty.")
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise AppError(413, "FILE_TOO_LARGE", "Attachments must be 15 MB or smaller.")
    return content, extension, file.filename, content_type


def _store_attachment(
    news: News, content: bytes, extension: str, original_name: str, content_type: str
) -> None:
    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{news.id}.{extension}"
    (ATTACHMENTS_DIR / filename).write_bytes(content)
    news.attachment_path = filename
    news.attachment_name = original_name
    news.attachment_content_type = content_type


async def delete_news(news_id: int) -> dict:
    async def operation(db: AsyncSession):
        news = await repo.require(db, News, news_id, lock=True)
        path = news.attachment_path
        await db.delete(news)
        await db.flush()
        return path

    path = await transact(operation)
    if path:
        (ATTACHMENTS_DIR / path).unlink(missing_ok=True)
    return {"message": "News deleted."}


async def attachment_path_for(news_id: int) -> tuple[Path, str]:
    async def operation(db: AsyncSession):
        news = await repo.require(db, News, news_id)
        if not news.attachment_path:
            raise AppError(404, "ATTACHMENT_NOT_FOUND", "This news item has no attachment.")
        return news.attachment_path, news.attachment_name or news.attachment_path

    filename, display_name = await transact(operation)
    return ATTACHMENTS_DIR / filename, display_name
