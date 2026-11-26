from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import Limit, Offset, TeacherActor, TeacherOrStudent
from app.common.schemas import Page
from app.modules.materials import service
from app.modules.materials.schemas import MaterialOut

router = APIRouter(prefix="/materials", tags=["Materials"])


@router.get("", response_model=Page[MaterialOut])
async def list_materials(
    user: TeacherOrStudent,
    offset: Offset = 0,
    limit: Limit = 20,
    section_id: int | None = None,
    category: str | None = None,
):
    return await service.list_materials(user, section_id, category, offset, limit)


@router.post("", response_model=MaterialOut, status_code=201)
async def create_material(
    user: TeacherActor,
    section_id: Annotated[int, Form(gt=0)],
    category: Annotated[str, Form()],
    title: Annotated[str, Form(min_length=1, max_length=200)],
    description: Annotated[str | None, Form(max_length=2000)] = None,
    file: UploadFile | None = File(default=None),
):
    return await service.create_material(user, section_id, category, title, description, file)


@router.delete("/{material_id}")
async def delete_material(material_id: int, user: TeacherActor):
    return await service.delete_material(user, material_id)


@router.get("/{material_id}/attachment")
async def get_attachment(material_id: int, user: TeacherOrStudent):
    path, filename = await service.attachment_path_for(user, material_id)
    return FileResponse(path, filename=filename)
