"""grades on registrations (two attestations + final exam) and course ECTS

Revision ID: f5a1c3e8b207
Revises: 7a4e2d6f9c31
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f5a1c3e8b207"
down_revision: str | Sequence[str] | None = "7a4e2d6f9c31"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

GRADE_COLUMNS = {"attestation_1": 30, "attestation_2": 30, "final_exam": 40}


def upgrade() -> None:
    op.add_column("courses", sa.Column("ects", sa.SmallInteger(), nullable=True))
    op.create_check_constraint(op.f("ck_courses_ects"), "courses", "ects BETWEEN 1 AND 60")
    for column, maximum in GRADE_COLUMNS.items():
        op.add_column("registrations", sa.Column(column, sa.Numeric(5, 2), nullable=True))
        op.create_check_constraint(
            op.f(f"ck_registrations_{column}"), "registrations", f"{column} BETWEEN 0 AND {maximum}"
        )
    op.add_column(
        "registrations", sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "registrations",
        sa.Column(
            "graded_by",
            sa.Integer(),
            sa.ForeignKey("users.id", name="fk_registrations_graded_by_users"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("registrations", "graded_by")
    op.drop_column("registrations", "graded_at")
    for column in GRADE_COLUMNS:
        op.drop_column("registrations", column)
    op.drop_column("courses", "ects")
