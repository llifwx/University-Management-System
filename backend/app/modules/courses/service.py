from app.common.service import CatalogService
from app.modules.courses.models import Course
from app.modules.courses.schemas import CourseOut

catalog = CatalogService(Course, CourseOut, {"description"})
