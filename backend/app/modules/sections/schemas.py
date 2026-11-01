from datetime import datetime, time

from pydantic import Field, model_validator

from app.common.schemas import Input, Output


class MeetingInput(Input):
    meeting_day: int = Field(ge=0, le=6, description="Monday=0 through Sunday=6")
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def interval(self):
        if self.start_time.tzinfo or self.end_time.tzinfo:
            raise ValueError("Use local campus times without a timezone offset")
        if self.start_time >= self.end_time:
            raise ValueError("start_time must precede end_time; overnight meetings are unsupported")
        return self


class MeetingOut(Output):
    id: int
    meeting_day: int
    start_time: time
    end_time: time


class SectionCreate(Input):
    course_id: int = Field(gt=0)
    semester_id: int = Field(gt=0)
    section_number: str = Field(min_length=1, max_length=20)
    capacity: int = Field(gt=0)
    teacher_id: int | None = Field(default=None, gt=0)
    meetings: list[MeetingInput] = Field(min_length=1, max_length=30)


class SectionPatch(Input):
    course_id: int | None = Field(default=None, gt=0)
    semester_id: int | None = Field(default=None, gt=0)
    section_number: str | None = Field(default=None, min_length=1, max_length=20)
    capacity: int | None = Field(default=None, gt=0)
    teacher_id: int | None = Field(default=None, gt=0)
    meetings: list[MeetingInput] | None = Field(default=None, min_length=1, max_length=30)


class SectionOut(Output):
    section_id: int
    course_id: int
    semester_id: int
    section_number: str
    capacity: int
    teacher_id: int | None
    created_at: datetime
    meetings: list[MeetingOut]
    enrolled_count: int
    remaining_capacity: int
