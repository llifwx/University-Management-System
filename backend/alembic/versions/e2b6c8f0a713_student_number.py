"""public student number: YY + ID + 6 random digits

Revision ID: e2b6c8f0a713
Revises: d7e3a9b14c52
"""

import secrets
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e2b6c8f0a713"
down_revision: str | Sequence[str] | None = "d7e3a9b14c52"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def random_student_number(year: int) -> str:
    # Frozen copy of the app's generator: migrations must not change when app code does.
    return f"{year % 100:02d}ID{secrets.randbelow(10**6):06d}"


def upgrade() -> None:
    op.add_column("students", sa.Column("student_number", sa.String(length=10), nullable=True))
    connection = op.get_bind()
    # Existing students: the account's creation year stands in for the enrollment year.
    rows = connection.execute(
        sa.text(
            "SELECT s.student_id, extract(year FROM u.created_at)::int "
            "FROM students s JOIN users u ON u.id = s.user_id"
        )
    ).all()
    used: set[str] = set()
    for student_id, year in rows:
        number = random_student_number(year)
        while number in used:
            number = random_student_number(year)
        used.add(number)
        connection.execute(
            sa.text("UPDATE students SET student_number = :n WHERE student_id = :id"),
            {"n": number, "id": student_id},
        )
    op.alter_column("students", "student_number", nullable=False)
    op.create_unique_constraint(op.f("uq_students_student_number"), "students", ["student_number"])
    op.create_check_constraint(
        op.f("ck_students_student_number_format"),
        "students",
        "student_number ~ '^[0-9]{2}ID[0-9]{6}$'",
    )


def downgrade() -> None:
    op.drop_column("students", "student_number")
