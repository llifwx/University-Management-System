from datetime import datetime

from pydantic import Field

from app.common.schemas import Input, Output


class CourseCreate(Input):
    course_code: str = Field(min_length=1, max_length=30)
    course_title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    credits: int = Field(ge=1, le=30)


class CoursePatch(Input):
    course_code: str | None = Field(default=None, min_length=1, max_length=30)
    course_title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    credits: int | None = Field(default=None, ge=1, le=30)


class CourseOut(Output):
    course_id: int
    course_code: str
    course_title: str
    description: str | None
    credits: int
    created_at: datetime
