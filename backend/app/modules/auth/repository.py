from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthSession, User


async def by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email.lower()))


async def lock_session(db: AsyncSession, identity: UUID) -> AuthSession | None:
    return await db.scalar(select(AuthSession).where(AuthSession.id == identity).with_for_update())


async def user_sessions(db: AsyncSession, identity: int) -> list[AuthSession]:
    return list(await db.scalars(select(AuthSession).where(AuthSession.user_id == identity)))
