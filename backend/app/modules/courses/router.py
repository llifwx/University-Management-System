from fastapi import APIRouter

from app.api.deps import Admin, CurrentUser, Limit, Offset
from app.common.schemas import Page
from app.modules.courses.schemas import CourseCreate, CourseOut, CoursePatch
from app.modules.courses.service import catalog

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", response_model=Page[CourseOut])
async def list_courses(user: CurrentUser, offset: Offset = 0, limit: Limit = 20):
    return await catalog.list(offset, limit)


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(course_id: int, user: CurrentUser):
    return await catalog.get(course_id)


@router.post("", response_model=CourseOut, status_code=201)
async def create_course(payload: CourseCreate, admin: Admin):
    return await catalog.create(payload)


@router.patch("/{course_id}", response_model=CourseOut)
async def patch_course(course_id: int, payload: CoursePatch, admin: Admin):
    return await catalog.patch(course_id, payload)


@router.delete("/{course_id}")
async def delete_course(course_id: int, admin: Admin):
    return await catalog.delete(course_id)
