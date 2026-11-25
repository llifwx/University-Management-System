from datetime import datetime

from app.common.schemas import Output


class NewsOut(Output):
    id: int
    title: str
    body: str
    created_at: datetime
    attachment_name: str | None
    attachment_content_type: str | None
    attachment_url: str | None
