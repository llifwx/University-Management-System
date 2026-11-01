from fastapi import APIRouter

from app.api.deps import Admin, CurrentUser, Limit, Offset
from app.common.schemas import Page
from app.modules.semesters.schemas import SemesterCreate, SemesterOut, SemesterPatch
from app.modules.semesters.service import catalog

router = APIRouter(prefix="/semesters", tags=["Semesters"])


@router.get("", response_model=Page[SemesterOut])
async def list_semesters(user: CurrentUser, offset: Offset = 0, limit: Limit = 20):
    return await catalog.list(offset, limit)


@router.get("/{semester_id}", response_model=SemesterOut)
async def get_semester(semester_id: int, user: CurrentUser):
    return await catalog.get(semester_id)


@router.post("", response_model=SemesterOut, status_code=201)
async def create_semester(payload: SemesterCreate, admin: Admin):
    return await catalog.create(payload)


@router.patch("/{semester_id}", response_model=SemesterOut)
async def patch_semester(semester_id: int, payload: SemesterPatch, admin: Admin):
    return await catalog.patch(semester_id, payload)


@router.delete("/{semester_id}")
async def delete_semester(semester_id: int, admin: Admin):
    return await catalog.delete(semester_id)
