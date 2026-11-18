from fastapi import APIRouter, Body

from app.api.deps import Admin, StaffActor, StudentActor
from app.modules.grades import service
from app.modules.grades.schemas import GradeInput, GradeSheet, StudentGrades

router = APIRouter(tags=["Grades"])


@router.get("/sections/{section_id}/grades", response_model=GradeSheet)
async def grade_sheet(section_id: int, user: StaffActor):
    return await service.grade_sheet(user, section_id)


@router.patch("/sections/{section_id}/grades", response_model=GradeSheet)
async def save_grades(
    section_id: int,
    user: StaffActor,
    payload: list[GradeInput] = Body(min_length=1, max_length=500),
):
    return await service.save_grades(user, section_id, payload)


@router.get("/students/me/grades", response_model=StudentGrades)
async def my_grades(user: StudentActor):
    return await service.my_grades(user)


# Declared after /students/me/grades so "me" never reaches the integer path parameter.
@router.get("/students/{student_id}/grades", response_model=StudentGrades)
async def student_grades(student_id: int, admin: Admin):
    return await service.grades_of(student_id)
