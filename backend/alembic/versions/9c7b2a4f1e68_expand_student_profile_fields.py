"""expand student profile fields

Revision ID: 9c7b2a4f1e68
Revises: e2b6c8f0a713
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "9c7b2a4f1e68"
down_revision: str | Sequence[str] | None = "e2b6c8f0a713"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("students", sa.Column("phone_number", sa.String(length=20), nullable=True))
    op.add_column("students", sa.Column("photo_path", sa.String(length=255), nullable=True))

    op.add_column("students", sa.Column("patronymic", sa.String(length=100), nullable=True))
    op.add_column("students", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("students", sa.Column("gender", sa.String(length=10), nullable=True))
    op.add_column("students", sa.Column("marital_status", sa.String(length=10), nullable=True))
    op.add_column("students", sa.Column("nationality", sa.String(length=80), nullable=True))
    op.add_column("students", sa.Column("citizenship", sa.String(length=80), nullable=True))
    op.add_column(
        "students",
        sa.Column("is_resident", sa.Boolean(), server_default="true", nullable=False),
    )
    op.add_column("students", sa.Column("personal_email", sa.String(length=150), nullable=True))
    op.add_column(
        "students",
        sa.Column("needs_dormitory", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column("students", sa.Column("admission_year", sa.String(length=9), nullable=True))
    op.add_column("students", sa.Column("advisor", sa.String(length=100), nullable=True))
    op.add_column("students", sa.Column("study_form", sa.String(length=80), nullable=True))
    op.add_column("students", sa.Column("winter_admission", sa.Boolean(), nullable=True))

    # full_name splits into last_name/first_name; start nullable to backfill, then tighten.
    op.add_column("students", sa.Column("last_name", sa.String(length=100), nullable=True))
    op.add_column("students", sa.Column("first_name", sa.String(length=100), nullable=True))
    op.execute(
        """
        UPDATE students SET
            last_name = split_part(full_name, ' ', 1),
            first_name = CASE
                WHEN position(' ' in full_name) > 0
                    THEN substring(full_name from position(' ' in full_name) + 1)
                ELSE split_part(full_name, ' ', 1)
            END
        """
    )
    op.alter_column("students", "last_name", nullable=False)
    op.alter_column("students", "first_name", nullable=False)
    op.drop_column("students", "full_name")

    op.create_check_constraint(
        op.f("ck_students_gender"), "students", "gender IN ('MALE','FEMALE')"
    )
    op.create_check_constraint(
        op.f("ck_students_marital_status"),
        "students",
        "marital_status IN ('SINGLE','MARRIED','DIVORCED','WIDOWED')",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_students_marital_status"), "students", type_="check")
    op.drop_constraint(op.f("ck_students_gender"), "students", type_="check")

    op.add_column("students", sa.Column("full_name", sa.String(length=100), nullable=True))
    op.execute(
        """
        UPDATE students SET full_name = trim(
            last_name || ' ' || first_name
            || CASE WHEN patronymic IS NOT NULL THEN ' ' || patronymic ELSE '' END
        )
        """
    )
    op.alter_column("students", "full_name", nullable=False)

    op.drop_column("students", "first_name")
    op.drop_column("students", "last_name")
    op.drop_column("students", "winter_admission")
    op.drop_column("students", "study_form")
    op.drop_column("students", "advisor")
    op.drop_column("students", "admission_year")
    op.drop_column("students", "needs_dormitory")
    op.drop_column("students", "personal_email")
    op.drop_column("students", "is_resident")
    op.drop_column("students", "citizenship")
    op.drop_column("students", "nationality")
    op.drop_column("students", "marital_status")
    op.drop_column("students", "gender")
    op.drop_column("students", "birth_date")
    op.drop_column("students", "patronymic")
    op.drop_column("students", "photo_path")
    op.drop_column("students", "phone_number")
