from fastapi import APIRouter

from app.common.schemas import ErrorResponse
from app.modules.auth.router import router as auth_router
from app.modules.auth.router import users_router
from app.modules.courses.router import router as courses_router
from app.modules.registrations.router import router as registrations_router
from app.modules.schedules.router import router as schedules_router
from app.modules.sections.router import router as sections_router
from app.modules.semesters.router import router as semesters_router
from app.modules.students.router import router as students_router

router = APIRouter(
    prefix="/api/v1",
    responses={code: {"model": ErrorResponse} for code in (400, 401, 403, 404, 409, 422, 503)},
)
for module_router in (
    auth_router,
    users_router,
    students_router,
    courses_router,
    semesters_router,
    sections_router,
    registrations_router,
    schedules_router,
):
    router.include_router(module_router)
