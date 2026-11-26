from datetime import date, time
from typing import Literal

from pydantic import Field

from app.common.schemas import Input, Output

Status = Literal["PRESENT", "LATE", "ABSENT"]


class ClassOut(Output):
    """A section meeting on a given date: the unit a teacher takes attendance for."""

    meeting_id: int
    section_id: int
    course_code: str
    course_title: str
    section_number: str
    class_date: date
    start_time: time
    end_time: time
    room_code: str | None
    enrolled: int
    marked: int


class AttendanceRow(Output):
    registration_id: int
    student_number: str
    full_name: str
    status: Status | None


class AttendanceSheet(Output):
    lesson: ClassOut
    rows: list[AttendanceRow]


class AttendanceInput(Input):
    registration_id: int = Field(gt=0)
    status: Status | None  # null clears a mark entered by mistake


class AttendanceRecord(Output):
    class_date: date
    start_time: time
    end_time: time
    status: Status


class CourseAttendance(Output):
    section_id: int
    course_code: str
    course_title: str
    present: int
    late: int
    absent: int
    rate: float | None  # (present + late) / marked, percent; None before the first mark
    records: list[AttendanceRecord]


class SemesterAttendance(Output):
    semester_id: int
    name: str
    start_date: date
    courses: list[CourseAttendance]


class StudentAttendance(Output):
    semesters: list[SemesterAttendance]
