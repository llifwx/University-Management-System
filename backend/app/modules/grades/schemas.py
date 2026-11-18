from datetime import date

from pydantic import Field

from app.common.schemas import Input, Output


class GradeInput(Input):
    registration_id: int = Field(gt=0)
    # Each value is replaced as sent; null clears a mark entered by mistake.
    attestation_1: float | None = Field(default=None, ge=0, le=30)
    attestation_2: float | None = Field(default=None, ge=0, le=30)
    final_exam: float | None = Field(default=None, ge=0, le=40)


class GradeSheetRow(Output):
    registration_id: int
    student_id: int
    student_number: str
    full_name: str
    attestation_1: float | None
    attestation_2: float | None
    final_exam: float | None
    total: float
    letter: str | None


class CourseGrade(Output):
    section_id: int
    course_code: str
    course_title: str
    credits: int
    ects: int | None
    attestation_1: float | None
    attestation_2: float | None
    final_exam: float | None
    total: float
    letter: str | None
    grade_points: float | None
    traditional: str | None


class Summary(Output):
    credits_taken: int
    credits_earned: int
    ects_taken: int
    ects_earned: int
    gpa: float | None


class SemesterGrades(Output):
    semester_id: int
    name: str
    start_date: date
    courses: list[CourseGrade]
    summary: Summary


class StudentGrades(Output):
    semesters: list[SemesterGrades]
    summary: Summary
