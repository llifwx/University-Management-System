import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


@pytest.mark.parametrize(
    "sql",
    [
        "INSERT INTO users (email,password_hash,role) "
        "SELECT email,password_hash,role FROM users LIMIT 1",
        "INSERT INTO users (id,email,password_hash,role) "
        "SELECT id,'duplicate@example.edu',password_hash,role FROM users LIMIT 1",
        "INSERT INTO students (user_id,student_number,last_name,first_name,year_level) "
        "VALUES (999999,'99ID999999','Missing','Missing',1)",
        "UPDATE course_sections SET capacity=0 WHERE section_id=1",
        "UPDATE section_meetings SET end_time=start_time WHERE id=1",
        "UPDATE section_meetings SET meeting_day=7 WHERE id=1",
        "UPDATE students SET year_level=9 WHERE student_id=1",
        "UPDATE semesters SET end_date=start_date WHERE semester_id=1",
        "INSERT INTO registrations (student_id,section_id,semester_id,status) "
        "VALUES (1,1,2,'Enrolled')",
        "INSERT INTO registrations (student_id,section_id,semester_id,status) "
        "VALUES (1,1,1,'Invalid')",
    ],
)
async def test_database_constraints(data, db_factory, sql):
    with pytest.raises(IntegrityError):
        async with db_factory() as db, db.begin():
            await db.execute(text(sql))


async def test_duplicate_registration_constraint(data, db_factory):
    statement = text(
        "INSERT INTO registrations (student_id,section_id,semester_id,status) "
        "VALUES (1,1,1,'Enrolled')"
    )
    async with db_factory() as db, db.begin():
        await db.execute(statement)
    with pytest.raises(IntegrityError):
        async with db_factory() as db, db.begin():
            await db.execute(statement)


async def test_duplicate_student_email_api(client, data, headers):
    result = await client.post(
        "/api/v1/students",
        headers=await headers(data.admin),
        json={
            "email": data.actors[0].email,
            "password": "Another-valid-password",
            "last_name": "Duplicate",
            "first_name": "Student",
            "year_level": 1,
        },
    )
    assert result.status_code == 409
    assert result.json()["error"]["code"] == "INTEGRITY_CONFLICT"
