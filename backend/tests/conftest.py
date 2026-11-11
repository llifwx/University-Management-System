import os
from datetime import date, time
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Importing the app requires explicit configuration. These values are test-only.
os.environ.setdefault("JWT_SECRET", "test-only-secret-with-at-least-32-characters")
test_url = os.environ.get("TEST_DATABASE_URL")
os.environ.setdefault(
    "DATABASE_URL", test_url or "postgresql+asyncpg://unused@localhost/unused_test"
)

from app.common import transactions  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db import session  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Course, CourseSection, SectionMeeting, Semester, Student, User  # noqa: E402
from app.modules.auth import service as auth_service  # noqa: E402
from app.modules.auth.schemas import UserOut  # noqa: E402

PASSWORD = "Fictional-test-password-123"
PASSWORD_HASH = hash_password(PASSWORD)


@pytest.fixture
async def db_factory(monkeypatch):
    if not test_url:
        pytest.skip("Set TEST_DATABASE_URL to a migrated, disposable PostgreSQL *_test database")
    url = make_url(test_url)
    if url.drivername != "postgresql+asyncpg" or not (url.database or "").endswith("_test"):
        pytest.fail("TEST_DATABASE_URL must be PostgreSQL and database name must end with _test")
    engine = create_async_engine(test_url, poolclass=NullPool, isolation_level="READ COMMITTED")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        # Migrations are required; do not replace migration coverage with create_all.
        revision = await connection.scalar(text("SELECT version_num FROM alembic_version"))
        assert revision
        await connection.execute(
            text(
                "TRUNCATE login_failures, refresh_tokens, auth_sessions, "
                "registrations, section_meetings, "
                "course_sections, students, courses, semesters, users RESTART IDENTITY CASCADE"
            )
        )
    monkeypatch.setattr(transactions, "SessionFactory", factory)
    monkeypatch.setattr(auth_service, "SessionFactory", factory)
    monkeypatch.setattr(session, "SessionFactory", factory)
    import app.main as main

    monkeypatch.setattr(main, "engine", engine)
    yield factory
    await engine.dispose()


@pytest.fixture
async def data(db_factory):
    async with db_factory() as db, db.begin():
        admin = User(email="admin@example.edu", password_hash=PASSWORD_HASH, role="ADMIN")
        teacher = User(
            email="teacher@example.edu",
            password_hash=PASSWORD_HASH,
            role="TEACHER",
            full_name="Grace Hopper",
        )
        other_teacher = User(
            email="teacher2@example.edu", password_hash=PASSWORD_HASH, role="TEACHER"
        )
        users = [
            User(email=f"student{i}@example.edu", password_hash=PASSWORD_HASH, role="STUDENT")
            for i in range(3)
        ]
        db.add_all([admin, teacher, other_teacher, *users])
        await db.flush()
        students = [
            Student(
                user_id=u.id,
                user=u,
                student_number=f"26ID{i:06d}",
                full_name=f"Student {i}",
                program="BIS",
                year_level=1,
            )
            for i, u in enumerate(users)
        ]
        semesters = [
            Semester(
                name=f"Semester {i}",
                start_date=date(2026 + i, 1, 1),
                end_date=date(2026 + i, 6, 1),
                is_active=True,
            )
            for i in range(2)
        ]
        course = Course(course_code="CS101", course_title="Programming", credits=3)
        db.add_all([*students, *semesters, course])
        await db.flush()

        async def section(
            number, day=0, start=time(10), end=time(11, 30), semester=0, capacity=5, extra=False
        ):
            meetings = [SectionMeeting(meeting_day=day, start_time=start, end_time=end)]
            if extra:
                meetings.append(
                    SectionMeeting(meeting_day=2, start_time=time(9), end_time=time(10))
                )
            obj = CourseSection(
                course_id=course.course_id,
                semester_id=semesters[semester].semester_id,
                section_number=number,
                capacity=capacity,
                teacher_id=teacher.id,
                meetings=meetings,
            )
            db.add(obj)
            await db.flush()
            return obj

        sections = [
            await section("A"),
            await section("OVERLAP", start=time(11), end=time(12)),
            await section("TOUCH", start=time(11, 30), end=time(13)),
            await section("DAY", day=1),
            await section("SEM", semester=1),
            await section("MULTI", day=4, extra=True),
            await section("MULTI_CONFLICT", day=2, start=time(9, 30), end=time(11)),
            await section("ONE", day=5, capacity=1),
        ]
        return SimpleNamespace(
            admin=UserOut.model_validate(admin),
            teacher=UserOut.model_validate(teacher),
            other_teacher=UserOut.model_validate(other_teacher),
            actors=[UserOut.model_validate(u) for u in users],
            students=[s.student_id for s in students],
            sections=[s.section_id for s in sections],
            semesters=[s.semester_id for s in semesters],
            course=course.course_id,
        )


@pytest.fixture
async def client(db_factory):
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
async def headers(data):
    async def get(actor):
        pair = await auth_service.login(actor.email, PASSWORD)
        return {"Authorization": f"Bearer {pair.access_token}"}

    return get
