from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import Admin, CurrentUser, Limit, Offset
from app.common.schemas import Page
from app.modules.news import service
from app.modules.news.schemas import NewsOut

router = APIRouter(prefix="/news", tags=["News"])


@router.get("", response_model=Page[NewsOut])
async def list_news(user: CurrentUser, offset: Offset = 0, limit: Limit = 20):
    return await service.list_news(offset, limit)


@router.get("/{news_id}", response_model=NewsOut)
async def get_news(news_id: int, user: CurrentUser):
    return await service.get_news(news_id)


@router.post("", response_model=NewsOut, status_code=201)
async def create_news(
    admin: Admin,
    title: Annotated[str, Form(min_length=1, max_length=200)],
    body: Annotated[str, Form(min_length=1, max_length=20000)],
    file: UploadFile | None = File(default=None),
):
    return await service.create_news(admin, title, body, file)


@router.patch("/{news_id}", response_model=NewsOut)
async def update_news(
    news_id: int,
    admin: Admin,
    title: Annotated[str | None, Form(min_length=1, max_length=200)] = None,
    body: Annotated[str | None, Form(min_length=1, max_length=20000)] = None,
    remove_attachment: Annotated[bool, Form()] = False,
    file: UploadFile | None = File(default=None),
):
    return await service.update_news(news_id, title, body, file, remove_attachment)


@router.delete("/{news_id}")
async def delete_news(news_id: int, admin: Admin):
    return await service.delete_news(news_id)


@router.get("/{news_id}/attachment")
async def get_attachment(news_id: int, user: CurrentUser):
    path, filename = await service.attachment_path_for(news_id)
    return FileResponse(path, filename=filename)
