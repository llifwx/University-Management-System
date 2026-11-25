"""teacher-student direct messaging

Revision ID: e4b7d1a93c6f
Revises: a6d2e9f4c815
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4b7d1a93c6f"
down_revision: str | Sequence[str] | None = "a6d2e9f4c815"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "message_threads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_message_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("teacher_last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("student_last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["teacher_id"], ["users.id"], name=op.f("fk_message_threads_teacher_id_users")
        ),
        sa.ForeignKeyConstraint(
            ["student_id"], ["users.id"], name=op.f("fk_message_threads_student_id_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_message_threads")),
        sa.UniqueConstraint("teacher_id", "student_id", name="uq_message_threads_pair"),
    )
    op.create_index(
        op.f("ix_message_threads_teacher_id"), "message_threads", ["teacher_id"], unique=False
    )
    op.create_index(
        op.f("ix_message_threads_student_id"), "message_threads", ["student_id"], unique=False
    )
    op.create_table(
        "direct_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
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
            "body IS NOT NULL OR attachment_path IS NOT NULL",
            name=op.f("ck_direct_messages_has_content"),
        ),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["message_threads.id"],
            name=op.f("fk_direct_messages_thread_id_message_threads"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sender_id"], ["users.id"], name=op.f("fk_direct_messages_sender_id_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_direct_messages")),
    )
    op.create_index(
        op.f("ix_direct_messages_thread_id"), "direct_messages", ["thread_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_direct_messages_thread_id"), table_name="direct_messages")
    op.drop_table("direct_messages")
    op.drop_index(op.f("ix_message_threads_student_id"), table_name="message_threads")
    op.drop_index(op.f("ix_message_threads_teacher_id"), table_name="message_threads")
    op.drop_table("message_threads")
