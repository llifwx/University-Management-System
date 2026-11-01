from fastapi import APIRouter

from app.api.deps import Admin, CurrentUser, Limit, Offset, StudentActor
from app.common.schemas import Page
from app.modules.registrations import service
from app.modules.registrations.schemas import (
    AdminRegistrationInput,
    RegistrationInput,
    RegistrationOut,
    RegistrationStatusInput,
)

router = APIRouter(prefix="/registrations", tags=["Registrations"])


@router.get("/me", response_model=Page[RegistrationOut])
async def me(
    user: StudentActor, offset: Offset = 0, limit: Limit = 20, semester_id: int | None = None
):
    return await service.registrations(user, offset, limit, own=True, semester_id=semester_id)


@router.get("", response_model=Page[RegistrationOut])
async def list_registrations(
    admin: Admin,
    offset: Offset = 0,
    limit: Limit = 20,
    semester_id: int | None = None,
    section_id: int | None = None,
):
    return await service.registrations(
        admin, offset, limit, semester_id=semester_id, section_id=section_id
    )


@router.post("", response_model=RegistrationOut, status_code=201)
async def enroll(payload: RegistrationInput, user: StudentActor):
    return await service.enroll(user, payload.section_id, payload.semester_id)


@router.post("/admin", response_model=RegistrationOut, status_code=201)
async def admin_enroll(payload: AdminRegistrationInput, admin: Admin):
    return await service.enroll(admin, payload.section_id, payload.semester_id, payload.student_id)


@router.patch("/{registration_id}/status", response_model=RegistrationOut)
async def change_status(registration_id: int, payload: RegistrationStatusInput, admin: Admin):
    """Non-enrolled states only. Use POST /registrations/admin to validate and enroll."""
    return await service.change_status(admin, registration_id, payload.status)


@router.delete("/{registration_id}", response_model=RegistrationOut)
async def cancel(registration_id: int, user: CurrentUser):
    return await service.cancel_authorized(user, registration_id)
