from datetime import date
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query

from app.api.deps import StudentActor, roles
from app.modules.attendance import service
from app.modules.attendance.schemas import (
    AttendanceInput,
    AttendanceSheet,
    ClassOut,
    StudentAttendance,
)
from app.modules.auth.schemas import UserOut

router = APIRouter(tags=["Attendance"])
Teacher = Annotated[UserOut, Depends(roles("TEACHER"))]
ClassDate = Annotated[date, Query(alias="date")]


@router.get("/attendance/classes", response_model=list[ClassOut])
async def my_classes(user: Teacher, day: ClassDate):
    return await service.classes_on(user, day)


@router.get("/attendance/classes/{meeting_id}", response_model=AttendanceSheet)
async def attendance_sheet(meeting_id: int, user: Teacher, day: ClassDate):
    return await service.sheet(user, meeting_id, day)


@router.patch("/attendance/classes/{meeting_id}", response_model=AttendanceSheet)
async def save_attendance(
    meeting_id: int,
    user: Teacher,
    day: ClassDate,
    payload: list[AttendanceInput] = Body(min_length=1, max_length=500),
):
    return await service.save(user, meeting_id, day, payload)


@router.get("/students/me/attendance", response_model=StudentAttendance)
async def my_attendance(user: StudentActor):
    return await service.my_attendance(user)
