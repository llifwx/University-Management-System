"""rooms and meeting room assignment

Revision ID: c8f3a92e7b41
Revises: f5a1c3e8b207
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c8f3a92e7b41"
down_revision: str | Sequence[str] | None = "f5a1c3e8b207"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rooms",
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("building", sa.String(length=80), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.PrimaryKeyConstraint("room_id", name=op.f("pk_rooms")),
        sa.UniqueConstraint("code", name=op.f("uq_rooms_code")),
    )
    op.add_column("section_meetings", sa.Column("room_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        op.f("fk_section_meetings_room_id_rooms"),
        "section_meetings",
        "rooms",
        ["room_id"],
        ["room_id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_section_meetings_room_id"), "section_meetings", ["room_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_section_meetings_room_id"), table_name="section_meetings")
    op.drop_constraint(
        op.f("fk_section_meetings_room_id_rooms"), "section_meetings", type_="foreignkey"
    )
    op.drop_column("section_meetings", "room_id")
    op.drop_table("rooms")
