"""login throttling; refresh tokens are deleted on use

Revision ID: c41f2a7d9e10
Revises: b3d6518e6c20
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c41f2a7d9e10"
down_revision: str | Sequence[str] | None = "b3d6518e6c20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "login_failures",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_login_failures")),
    )
    op.create_index(op.f("ix_login_failures_email"), "login_failures", ["email"])
    op.create_index(op.f("ix_login_failures_ip"), "login_failures", ["ip"])
    op.create_index(op.f("ix_login_failures_created_at"), "login_failures", ["created_at"])
    # A spent refresh token is now deleted, so absence alone marks a replay.
    op.execute("DELETE FROM refresh_tokens WHERE consumed")
    op.drop_column("refresh_tokens", "consumed")


def downgrade() -> None:
    op.add_column(
        "refresh_tokens",
        sa.Column("consumed", sa.Boolean(), server_default="false", nullable=False),
    )
    op.drop_table("login_failures")
