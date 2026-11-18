from fastapi import APIRouter, Body

from app.api.deps import StaffActor, StudentActor
from app.modules.grades import service
from app.modules.grades.schemas import GradeInput, GradeSheetRow, StudentGrades

router = APIRouter(tags=["Grades"])


@router.get("/sections/{section_id}/grades", response_model=list[GradeSheetRow])
async def grade_sheet(section_id: int, user: StaffActor):
    return await service.grade_sheet(user, section_id)


@router.patch("/sections/{section_id}/grades", response_model=list[GradeSheetRow])
async def save_grades(
    section_id: int,
    user: StaffActor,
    payload: list[GradeInput] = Body(min_length=1, max_length=500),
):
    return await service.save_grades(user, section_id, payload)


@router.get("/students/me/grades", response_model=StudentGrades)
async def my_grades(user: StudentActor):
    return await service.my_grades(user)
