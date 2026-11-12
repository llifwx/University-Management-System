from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.service import CatalogService, values
from app.common.transactions import transact
from app.core.exceptions import AppError
from app.core.security import hash_password
from app.models import Student, User
from app.modules.auth.schemas import UserOut
from app.modules.registrations import repository as registration_repo
from app.modules.students import repository as student_repo
from app.modules.students.schemas import StudentCreate, StudentOut, StudentPatch, StudentSelfPatch

catalog = CatalogService(Student, StudentOut)

AVATARS_DIR = Path("media/avatars")
MAX_PHOTO_BYTES = 5 * 1024 * 1024
PHOTO_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

# Optional admin-managed fields that may be cleared with an explicit null.
NULLABLE_RECORD_FIELDS = {
    "program",
    "phone_number",
    "patronymic",
    "birth_date",
    "gender",
    "marital_status",
    "nationality",
    "citizenship",
    "personal_email",
    "admission_year",
    "advisor",
    "study_form",
    "winter_admission",
}


async def get_authorized_student(actor: UserOut, identity: int) -> StudentOut:
    student = await catalog.get(identity)
    if actor.role != "ADMIN" and student.user_id != actor.id:
        raise AppError(403, "FORBIDDEN", "Cannot view another student's profile.")
    return student


async def student_me(actor: UserOut) -> StudentOut:
    async def operation(db: AsyncSession):
        return StudentOut.model_validate(await student_repo.student_for_user(db, actor.id))

    return await transact(operation)


async def create_student(payload: StudentCreate) -> StudentOut:
    password_hash = hash_password(payload.password)

    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        user = User(email=str(payload.email).lower(), password_hash=password_hash, role="STUDENT")
        db.add(user)
        await db.flush()
        year = payload.enrollment_year or datetime.now(UTC).year
        student = Student(
            student_number=await student_repo.new_student_number(db, year),
            user_id=user.id,
            user=user,
            **payload.model_dump(exclude={"email", "password", "enrollment_year"}),
        )
        db.add(student)
        await db.flush()
        return StudentOut.model_validate(student)

    return await transact(operation)


async def patch_me(actor: UserOut, payload: StudentSelfPatch) -> StudentOut:
    async def operation(db: AsyncSession):
        student = await student_repo.student_for_user(db, actor.id, lock=True)
        data = values(payload, {"phone_number", "personal_email"})
        for key, value in data.items():
            setattr(student, key, value)
        await db.flush()
        return StudentOut.model_validate(student)

    return await transact(operation)


async def upload_photo(actor: UserOut, file: UploadFile) -> StudentOut:
    extension = PHOTO_EXTENSIONS.get(file.content_type or "")
    if extension is None:
        raise AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Upload a JPEG, PNG, or WebP image.")
    content = await file.read()
    if not content:
        raise AppError(422, "EMPTY_FILE", "The uploaded file is empty.")
    if len(content) > MAX_PHOTO_BYTES:
        raise AppError(413, "FILE_TOO_LARGE", "Photo must be 5 MB or smaller.")

    async def operation(db: AsyncSession):
        student = await student_repo.student_for_user(db, actor.id, lock=True)
        AVATARS_DIR.mkdir(parents=True, exist_ok=True)
        for existing in AVATARS_DIR.glob(f"{student.student_id}.*"):
            existing.unlink(missing_ok=True)
        filename = f"{student.student_id}.{extension}"
        (AVATARS_DIR / filename).write_bytes(content)
        student.photo_path = filename
        await db.flush()
        return StudentOut.model_validate(student)

    return await transact(operation)


async def photo_path_for(actor: UserOut, identity: int) -> Path:
    async def operation(db: AsyncSession):
        student = await repo.require(db, Student, identity)
        if actor.role != "ADMIN" and student.user_id != actor.id:
            raise AppError(403, "FORBIDDEN", "Cannot view another student's photo.")
        if not student.photo_path:
            raise AppError(404, "PHOTO_NOT_FOUND", "No photo set for this student.")
        return student.photo_path

    filename = await transact(operation)
    return AVATARS_DIR / filename


async def patch_student(identity: int, payload: StudentPatch) -> StudentOut:
    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        student = await repo.require(db, Student, identity, lock=True)
        data = values(payload, NULLABLE_RECORD_FIELDS)
        for key, value in data.items():
            if key == "email":
                student.user.email = str(value).lower()
            elif key == "is_active":
                student.user.is_active = value
            else:
                setattr(student, key, value)
        await db.flush()
        return StudentOut.model_validate(student)

    return await transact(operation)


async def delete_student(identity: int) -> dict:
    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        student = await repo.require(db, Student, identity, lock=True)
        # Preserve enrollment history and free seats as part of this atomic operation.
        rows = await registration_repo.student_registrations(db, identity)
        for registration in rows:
            registration.status = "Cancelled"
        student.user.is_active = False
        return {"message": "Student deactivated; registrations cancelled; history retained."}

    return await transact(operation)
