"""course materials

Revision ID: 35a60c469e0c
Revises: e4b7d1a93c6f
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "35a60c469e0c"
down_revision: str | Sequence[str] | None = "b8e4f1a2d630"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "course_materials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("attachment_path", sa.String(length=255), nullable=True),
        sa.Column("attachment_name", sa.String(length=255), nullable=True),
        sa.Column("attachment_content_type", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "category IN ('syllabus','homework','practice','other')",
            name=op.f("ck_course_materials_category"),
        ),
        sa.ForeignKeyConstraint(
            ["section_id"],
            ["course_sections.section_id"],
            name=op.f("fk_course_materials_section_id_course_sections"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by_id"],
            ["users.id"],
            name=op.f("fk_course_materials_uploaded_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_course_materials")),
    )
    op.create_index(
        op.f("ix_course_materials_created_at"), "course_materials", ["created_at"], unique=False
    )
    op.create_index(
        op.f("ix_course_materials_section_id"), "course_materials", ["section_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_course_materials_section_id"), table_name="course_materials")
    op.drop_index(op.f("ix_course_materials_created_at"), table_name="course_materials")
    op.drop_table("course_materials")
