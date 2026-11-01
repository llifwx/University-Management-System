from datetime import time

from pydantic import BaseModel


class ScheduleEntry(BaseModel):
    registration_id: int
    section_id: int
    course_code: str
    course_title: str
    section_number: str
    teacher_id: int | None
    meeting_day: int
    start_time: time
    end_time: time


class ScheduleOut(BaseModel):
    student_id: int
    semester_id: int
    timezone: str = "campus-local"
    entries: list[ScheduleEntry]
