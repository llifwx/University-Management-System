from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, StudentActor
from app.modules.schedules.schemas import ScheduleOut
from app.modules.schedules.service import schedule

router = APIRouter(prefix="/schedules", tags=["Schedules"])
SemesterId = Annotated[int, Query(gt=0)]


@router.get("/me", response_model=ScheduleOut)
async def me(user: StudentActor, semester_id: SemesterId):
    return await schedule(user, semester_id)


@router.get("/students/{student_id}", response_model=ScheduleOut)
async def student_schedule(student_id: int, user: CurrentUser, semester_id: SemesterId):
    return await schedule(user, semester_id, student_id)
