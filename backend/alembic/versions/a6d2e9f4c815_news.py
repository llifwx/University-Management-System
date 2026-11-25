"""news

Revision ID: a6d2e9f4c815
Revises: c8f3a92e7b41
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a6d2e9f4c815"
down_revision: str | Sequence[str] | None = "c8f3a92e7b41"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "news",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=True),
        sa.Column("attachment_path", sa.String(length=255), nullable=True),
        sa.Column("attachment_name", sa.String(length=255), nullable=True),
        sa.Column("attachment_content_type", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["author_id"], ["users.id"], name=op.f("fk_news_author_id_users"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_news")),
    )
    op.create_index(op.f("ix_news_created_at"), "news", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_news_created_at"), table_name="news")
    op.drop_table("news")
