"""attendance

Revision ID: b8e4f1a2d630
Revises: a6d2e9f4c815
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b8e4f1a2d630"
down_revision: str | Sequence[str] | None = "e4b7d1a93c6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "attendance",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("class_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("status", sa.String(length=7), nullable=False),
        sa.Column("marked_by", sa.Integer(), nullable=True),
        sa.Column(
            "marked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "status IN ('PRESENT','LATE','ABSENT')", name=op.f("ck_attendance_status")
        ),
        sa.ForeignKeyConstraint(
            ["registration_id"],
            ["registrations.registration_id"],
            name=op.f("fk_attendance_registration_id_registrations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["marked_by"],
            ["users.id"],
            name=op.f("fk_attendance_marked_by_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attendance")),
        sa.UniqueConstraint(
            "registration_id",
            "class_date",
            "start_time",
            name=op.f("uq_attendance_registration_id"),
        ),
    )
    op.create_index(
        op.f("ix_attendance_registration_id"), "attendance", ["registration_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_attendance_registration_id"), table_name="attendance")
    op.drop_table("attendance")
