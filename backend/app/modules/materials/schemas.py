from datetime import datetime

from app.common.schemas import Output


class MaterialOut(Output):
    id: int
    section_id: int
    course_code: str
    course_title: str
    section_number: str
    category: str
    title: str
    description: str | None
    attachment_name: str
    attachment_content_type: str
    attachment_url: str
    uploaded_by_name: str | None
    created_at: datetime
