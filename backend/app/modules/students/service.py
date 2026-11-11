from datetime import UTC, datetime

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
from app.modules.students.schemas import StudentCreate, StudentOut, StudentPatch

catalog = CatalogService(Student, StudentOut)


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
            full_name=payload.full_name,
            program=payload.program,
            year_level=payload.year_level,
        )
        db.add(student)
        await db.flush()
        return StudentOut.model_validate(student)

    return await transact(operation)


async def patch_student(identity: int, payload: StudentPatch) -> StudentOut:
    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        student = await repo.require(db, Student, identity, lock=True)
        data = values(payload, {"program"})
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
