from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthSession, LoginFailure, User


async def by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email.lower()))


async def lock_session(db: AsyncSession, identity: UUID) -> AuthSession | None:
    return await db.scalar(select(AuthSession).where(AuthSession.id == identity).with_for_update())


async def user_sessions(db: AsyncSession, identity: int) -> list[AuthSession]:
    return list(await db.scalars(select(AuthSession).where(AuthSession.user_id == identity)))


async def failure_counts(db: AsyncSession, email: str, ip: str | None, since: datetime):
    """(failures for this email, failures from this IP) since the given moment."""
    row = (
        await db.execute(
            select(
                func.count().filter(LoginFailure.email == email),
                func.count().filter(LoginFailure.ip == ip) if ip else literal(0),
            ).where(
                LoginFailure.created_at > since,
                or_(LoginFailure.email == email, LoginFailure.ip == ip),
            )
        )
    ).one()
    return row[0], row[1]


async def clear_failures(db: AsyncSession, email: str) -> None:
    await db.execute(delete(LoginFailure).where(LoginFailure.email == email))


async def purge(db: AsyncSession, now: datetime, failures_before: datetime) -> None:
    # Spent sessions answer 401 whether revoked or missing; their refresh tokens cascade.
    await db.execute(
        delete(AuthSession).where(or_(AuthSession.revoked, AuthSession.expires_at <= now))
    )
    await db.execute(delete(LoginFailure).where(LoginFailure.created_at <= failures_before))
