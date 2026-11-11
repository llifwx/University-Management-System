"""staff profile: name, title, department, office, phone

Revision ID: d7e3a9b14c52
Revises: c41f2a7d9e10
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d7e3a9b14c52"
down_revision: str | Sequence[str] | None = "c41f2a7d9e10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = (("full_name", 100), ("title", 100), ("department", 100), ("office", 50), ("phone", 30))


def upgrade() -> None:
    for name, length in COLUMNS:
        op.add_column("users", sa.Column(name, sa.String(length=length), nullable=True))


def downgrade() -> None:
    for name, _ in reversed(COLUMNS):
        op.drop_column("users", name)
