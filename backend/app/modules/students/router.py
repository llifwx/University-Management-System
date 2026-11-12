from fastapi import APIRouter, File, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import Admin, CurrentUser, Limit, Offset, StudentActor
from app.common.schemas import Page
from app.modules.students import service
from app.modules.students.schemas import StudentCreate, StudentOut, StudentPatch, StudentSelfPatch

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me", response_model=StudentOut)
async def me(user: StudentActor):
    return await service.student_me(user)


@router.patch("/me", response_model=StudentOut)
async def patch_me(payload: StudentSelfPatch, user: StudentActor):
    return await service.patch_me(user, payload)


@router.post("/me/photo", response_model=StudentOut)
async def upload_my_photo(user: StudentActor, file: UploadFile = File(...)):
    return await service.upload_photo(user, file)


@router.get("", response_model=Page[StudentOut])
async def list_students(admin: Admin, offset: Offset = 0, limit: Limit = 20):
    return await service.catalog.list(offset, limit)


@router.get("/{student_id}/photo")
async def get_photo(student_id: int, user: CurrentUser):
    return FileResponse(await service.photo_path_for(user, student_id))


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
