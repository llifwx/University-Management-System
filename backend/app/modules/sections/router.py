from fastapi import APIRouter

from app.api.deps import Admin, CurrentUser, Limit, Offset, StaffActor
from app.common.schemas import Page
from app.modules.sections import service
from app.modules.sections.schemas import SectionCreate, SectionOut, SectionPatch
from app.modules.students.schemas import StudentOut

router = APIRouter(prefix="/sections", tags=["Sections"])


@router.get("", response_model=Page[SectionOut])
async def list_sections(
    user: CurrentUser,
    offset: Offset = 0,
    limit: Limit = 20,
    semester_id: int | None = None,
    course_id: int | None = None,
    teacher_id: int | None = None,
    available_only: bool = False,
):
    return await service.list_sections(
        offset,
        limit,
        semester_id=semester_id,
        course_id=course_id,
        teacher_id=teacher_id,
        available_only=available_only,
    )


@router.get("/assigned", response_model=Page[SectionOut])
async def assigned(
    user: StaffActor, offset: Offset = 0, limit: Limit = 20, semester_id: int | None = None
):
    return await service.list_sections(offset, limit, teacher_id=user.id, semester_id=semester_id)


@router.get("/{section_id}", response_model=SectionOut)
async def get_section(section_id: int, user: CurrentUser):
    return await service.get_section(section_id)


@router.get("/{section_id}/enrollments", response_model=Page[StudentOut])
async def roster(section_id: int, user: StaffActor, offset: Offset = 0, limit: Limit = 20):
    return await service.roster(user, section_id, offset, limit)


@router.post("", response_model=SectionOut, status_code=201)
async def create_section(payload: SectionCreate, admin: Admin):
    return await service.create_section(payload)


@router.patch("/{section_id}", response_model=SectionOut)
async def patch_section(section_id: int, payload: SectionPatch, admin: Admin):
    return await service.patch_section(section_id, payload)


@router.delete("/{section_id}")
async def delete_section(section_id: int, admin: Admin):
    return await service.delete_section(section_id)
