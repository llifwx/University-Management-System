from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.schemas import Page
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.models import Course, CourseSection, User
from app.modules.auth.schemas import UserOut
from app.modules.materials import repository as material_repo
from app.modules.materials.models import CATEGORIES, CourseMaterial
from app.modules.materials.schemas import MaterialOut

ATTACHMENTS_DIR = Path("media/material_attachments")
MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024
ATTACHMENT_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/zip": "zip",
    "text/plain": "txt",
}


async def _authorize_section(db: AsyncSession, actor: UserOut, section: CourseSection) -> None:
    if actor.role == "TEACHER":
        if section.teacher_id != actor.id:
            raise AppError(403, "NOT_YOUR_SECTION", "You do not teach this section.")
    else:
        registered = await material_repo.student_is_registered(db, actor.id, section.section_id)
        if not registered:
            raise AppError(403, "NOT_REGISTERED", "You are not registered in this section.")


async def _material_out(db: AsyncSession, material: CourseMaterial) -> MaterialOut:
    section = await db.get(CourseSection, material.section_id)
    course = await db.get(Course, section.course_id) if section else None
    uploader = await db.get(User, material.uploaded_by_id) if material.uploaded_by_id else None
    return MaterialOut(
        id=material.id,
        section_id=material.section_id,
        course_code=course.course_code if course else "",
        course_title=course.course_title if course else "",
        section_number=section.section_number if section else "",
        category=material.category,
        title=material.title,
        description=material.description,
        attachment_name=material.attachment_name,
        attachment_content_type=material.attachment_content_type,
        attachment_url=material.attachment_url,
        uploaded_by_name=uploader.full_name if uploader else None,
        created_at=material.created_at,
    )


async def list_materials(
    actor: UserOut,
    section_id: int | None,
    category: str | None,
    offset: int,
    limit: int,
) -> Page[MaterialOut]:
    async def operation(db: AsyncSession):
        if section_id is not None:
            section = await repo.require(db, CourseSection, section_id)
            await _authorize_section(db, actor, section)
            section_ids = [section_id]
        elif actor.role == "TEACHER":
            section_ids = await material_repo.section_ids_for_teacher(db, actor.id)
        else:
            section_ids = await material_repo.section_ids_for_student(db, actor.id)

        if not section_ids:
            return Page[MaterialOut](items=[], total=0, offset=offset, limit=limit)

        conditions = [CourseMaterial.section_id.in_(section_ids)]
        if category is not None:
            conditions.append(CourseMaterial.category == category)

        total = (
            await db.scalar(select(func.count()).select_from(CourseMaterial).where(*conditions))
            or 0
        )
        rows = await db.scalars(
            select(CourseMaterial)
            .where(*conditions)
            .order_by(CourseMaterial.created_at.desc(), CourseMaterial.id.desc())
            .offset(offset)
            .limit(limit)
        )
        items = [await _material_out(db, row) for row in rows]
        return Page[MaterialOut](items=items, total=total, offset=offset, limit=limit)

    return await transact(operation)


async def create_material(
    actor: UserOut,
    section_id: int,
    category: str,
    title: str,
    description: str | None,
    file: UploadFile | None,
) -> MaterialOut:
    title = title.strip()
    description = description.strip() if description else None
    if not title:
        raise AppError(422, "EMPTY_TITLE", "Title is required.")
    if category not in CATEGORIES:
        raise AppError(422, "INVALID_CATEGORY", "Unknown material category.")
    attachment = await _read_attachment(file)
    if attachment is None:
        raise AppError(422, "ATTACHMENT_REQUIRED", "Attach the file to upload.")

    async def operation(db: AsyncSession):
        section = await repo.require(db, CourseSection, section_id)
        if section.teacher_id != actor.id:
            raise AppError(403, "NOT_YOUR_SECTION", "You do not teach this section.")
        material = CourseMaterial(
            section_id=section_id,
            uploaded_by_id=actor.id,
            category=category,
            title=title,
            description=description,
        )
        db.add(material)
        await db.flush()
        _store_attachment(material, *attachment)
        await db.flush()
        await db.refresh(material)
        return await _material_out(db, material)

    return await transact(operation)


async def _read_attachment(file: UploadFile | None) -> tuple[bytes, str, str, str] | None:
    """Validated (content, extension, original name, content type), or None when no file."""
    if file is None or not file.filename:
        return None
    content_type = file.content_type or ""
    extension = ATTACHMENT_EXTENSIONS.get(content_type)
    if extension is None:
        raise AppError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Attach an image, PDF, Word, Excel, PowerPoint, plain text or zip file.",
        )
    content = await file.read()
    if not content:
        raise AppError(422, "EMPTY_FILE", "The uploaded file is empty.")
    if len(content) > MAX_ATTACHMENT_BYTES:
        raise AppError(413, "FILE_TOO_LARGE", "Attachments must be 30 MB or smaller.")
    return content, extension, file.filename, content_type


def _store_attachment(
    material: CourseMaterial, content: bytes, extension: str, original_name: str, content_type: str
) -> None:
    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{material.id}.{extension}"
    (ATTACHMENTS_DIR / filename).write_bytes(content)
    material.attachment_path = filename
    material.attachment_name = original_name
    material.attachment_content_type = content_type


async def delete_material(actor: UserOut, material_id: int) -> dict:
    async def operation(db: AsyncSession):
        material = await repo.require(db, CourseMaterial, material_id, lock=True)
        section = await repo.require(db, CourseSection, material.section_id)
        if section.teacher_id != actor.id:
            raise AppError(403, "NOT_YOUR_SECTION", "You do not teach this section.")
        path = material.attachment_path
        await db.delete(material)
        await db.flush()
        return path

    path = await transact(operation)
    if path:
        (ATTACHMENTS_DIR / path).unlink(missing_ok=True)
    return {"message": "Material deleted."}


async def attachment_path_for(actor: UserOut, material_id: int) -> tuple[Path, str]:
    async def operation(db: AsyncSession):
        material = await repo.require(db, CourseMaterial, material_id)
        section = await repo.require(db, CourseSection, material.section_id)
        await _authorize_section(db, actor, section)
        return material.attachment_path, material.attachment_name

    filename, display_name = await transact(operation)
    return ATTACHMENTS_DIR / filename, display_name
