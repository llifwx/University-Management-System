"""Development-only seed. Natural keys make repeated execution non-destructive."""

import asyncio
from datetime import date, time

from sqlalchemy import select

from app.common import repository as repo
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionFactory, engine
from app.models import Course, CourseSection, Registration, SectionMeeting, Semester, Student, User
from app.modules.sections import repository as section_repo
from app.modules.students import repository as student_repo
from scripts.bootstrap_admin import bootstrap


async def seed() -> None:
    settings = get_settings()
    if settings.environment != "development":
        raise ValueError("Demo seed is permitted only in ENVIRONMENT=development")
    password = settings.seed_password
    if not password or not 12 <= len(password) <= 128:
        raise ValueError("Set a development-only SEED_PASSWORD of 12–128 characters")
    await bootstrap()
    password_hash = hash_password(password)
    async with SessionFactory() as db, db.begin():
        await repo.academic_lock(db, exclusive=True)

        async def get_or_add(model, key, value, **attrs):
            entity = await db.scalar(select(model).where(getattr(model, key) == value))
            if entity is None:
                entity = model(**{key: value}, **attrs)
                db.add(entity)
                await db.flush()
            return entity

        teachers = []
        profiles = (
            ("Emily Carter", "Associate Professor", "Computer Science", "B-204"),
            ("Daniel Brooks", "Senior Lecturer", "Information Systems", "B-311"),
            ("Priya Nair", "Assistant Professor", "Mathematics", "A-118"),
        )
        for i, (name, title, department, office) in enumerate(profiles, 1):
            teacher = await get_or_add(
                User,
                "email",
                f"teacher{i}@demo.example.edu",
                role="TEACHER",
                password_hash=password_hash,
            )
            if teacher.full_name is None:  # Fills profiles of teachers seeded before they existed.
                teacher.full_name, teacher.title = name, title
                teacher.department, teacher.office = department, office
            teachers.append(teacher)
        students = []
        for i, name in enumerate(("Alex Morgan", "Sam Rivera", "Taylor Kim", "Jordan Lee"), 1):
            last_name, first_name = name.split(" ", 1)
            user = await get_or_add(
                User,
                "email",
                f"student{i}@demo.example.edu",
                role="STUDENT",
                password_hash=password_hash,
            )
            students.append(
                await get_or_add(
                    Student,
                    "user_id",
                    user.id,
                    last_name=last_name,
                    first_name=first_name,
                    program="Information Systems",
                    year_level=2,
                    # Second-year students enrolled last year.
                    student_number=await student_repo.new_student_number(db, date.today().year - 1),
                )
            )
        semesters = [
            await get_or_add(
                Semester,
                "name",
                "Fall 2026",
                start_date=date(2026, 9, 1),
                end_date=date(2026, 12, 20),
                is_active=True,
            ),
            await get_or_add(
                Semester,
                "name",
                "Spring 2027",
                start_date=date(2027, 1, 15),
                end_date=date(2027, 5, 25),
                is_active=True,
            ),
        ]
        subjects = [
            ("CS101", "Introduction to Programming"),
            ("IS201", "Database Systems"),
            ("MA101", "Mathematics"),
            ("PH101", "Physics"),
            ("CS301", "Computer Networks"),
            ("CS302", "Software Engineering"),
        ]
        sections = []
        for semester in semesters:
            for i, (code, title) in enumerate(subjects):
                course = await get_or_add(
                    Course,
                    "course_code",
                    code,
                    course_title=title,
                    description=f"Foundations of {title.lower()}.",
                    credits=3,
                )
                section = await db.scalar(
                    select(CourseSection).where(
                        CourseSection.course_id == course.course_id,
                        CourseSection.semester_id == semester.semester_id,
                        CourseSection.section_number == "A",
                    )
                )
                if section is None:
                    # CS101 and IS201 intentionally conflict on Monday.
                    day, hour = (0, 10) if i < 2 else (i - 1, 9 + i)
                    section = CourseSection(
                        course_id=course.course_id,
                        semester_id=semester.semester_id,
                        section_number="A",
                        capacity=25,
                        teacher_id=teachers[i % 3].id,
                        meetings=[
                            SectionMeeting(
                                meeting_day=day, start_time=time(hour), end_time=time(hour + 1, 30)
                            )
                        ],
                    )
                    db.add(section)
                    await db.flush()
                sections.append(section)
        initial = sections[0]
        for student in students[:2]:
            registration = await db.scalar(
                select(Registration).where(
                    Registration.student_id == student.student_id,
                    Registration.section_id == initial.section_id,
                    Registration.semester_id == initial.semester_id,
                )
            )
            if registration is None:
                # Apply the same invariants; do not bypass enrollment safety on a populated DB.
                if await section_repo.seats(db, initial.section_id) >= initial.capacity:
                    continue
                from app.common.scheduling import overlaps

                meetings = await section_repo.enrolled_meetings(
                    db, student.student_id, initial.semester_id
                )
                if any(overlaps(a, b) for a in meetings for b in initial.meetings):
                    continue
                db.add(
                    Registration(
                        student_id=student.student_id,
                        section_id=initial.section_id,
                        semester_id=initial.semester_id,
                        status="Enrolled",
                    )
                )
                await db.flush()
    print("Development data ready. Existing accounts/passwords and enrollments were preserved.")


async def main():
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
