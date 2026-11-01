from fastapi import APIRouter

from app.api.deps import Admin, CurrentUser, Limit, Offset, StudentActor
from app.common.schemas import Page
from app.modules.students import service
from app.modules.students.schemas import StudentCreate, StudentOut, StudentPatch

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me", response_model=StudentOut)
async def me(user: StudentActor):
    return await service.student_me(user)


@router.get("", response_model=Page[StudentOut])
async def list_students(admin: Admin, offset: Offset = 0, limit: Limit = 20):
    return await service.catalog.list(offset, limit)


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(student_id: int, user: CurrentUser):
    return await service.get_authorized_student(user, student_id)


@router.post("", response_model=StudentOut, status_code=201)
async def create_student(payload: StudentCreate, admin: Admin):
    return await service.create_student(payload)


@router.patch("/{student_id}", response_model=StudentOut)
async def patch_student(student_id: int, payload: StudentPatch, admin: Admin):
    return await service.patch_student(student_id, payload)


@router.delete("/{student_id}")
async def delete_student(student_id: int, admin: Admin):
    return await service.delete_student(student_id)
