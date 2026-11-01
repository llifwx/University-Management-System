from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.common import repository as repo
from app.common.service import values
from app.common.transactions import transact
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.security import (
    DUMMY_HASH,
    access_expiry,
    decode_token,
    hash_password,
    hasher,
    issue_token,
    token_digest,
    verify_password,
)
from app.db.session import SessionFactory
from app.models import AuthSession, RefreshToken, User
from app.modules.auth import repository as auth_repo
from app.modules.auth.schemas import StaffCreate, StaffPatch, TokenPair, UserOut


def unauthorized() -> AppError:
    return AppError(401, "INVALID_CREDENTIALS", "Invalid credentials or revoked session.")


async def token_pair(db: AsyncSession, user_id: int, session: AuthSession) -> TokenPair:
    refresh = issue_token(user_id, session.id, "refresh", session.expires_at)
    db.add(RefreshToken(token_hash=token_digest(refresh), session_id=session.id))
    return TokenPair(
        access_token=issue_token(user_id, session.id, "access", access_expiry()),
        refresh_token=refresh,
        expires_in=get_settings().access_token_minutes * 60,
    )


async def login(email: str, password: str) -> TokenPair:
    async def operation(db: AsyncSession):
        user = await auth_repo.by_email(db, email)
        valid = verify_password(password, user.password_hash if user else DUMMY_HASH)
        if not user or not valid or not user.is_active:
            raise unauthorized()
        if hasher.check_needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        session = AuthSession(
            id=uuid4(),
            user_id=user.id,
            revoked=False,
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().refresh_token_days),
        )
        db.add(session)
        await db.flush()
        return await token_pair(db, user.id, session)

    return await transact(operation)


async def authenticate(token: str) -> UserOut:
    claims = decode_token(token, "access")
    async with SessionFactory() as db:
        session = await db.get(AuthSession, UUID(claims["sid"]))
        user = await db.get(User, int(claims["sub"]))
        if (
            not session
            or session.revoked
            or session.expires_at <= datetime.now(UTC)
            or not user
            or not user.is_active
            or session.user_id != user.id
        ):
            raise unauthorized()
        return UserOut.model_validate(user)


async def refresh(token: str) -> TokenPair:
    claims = decode_token(token, "refresh")

    async def operation(db: AsyncSession):
        session = await auth_repo.lock_session(db, UUID(claims["sid"]))
        if (
            not session
            or session.revoked
            or session.expires_at <= datetime.now(UTC)
            or session.user_id != int(claims["sub"])
        ):
            raise unauthorized()
        stored = await db.get(RefreshToken, token_digest(token))
        user = await db.get(User, session.user_id)
        if not stored or stored.session_id != session.id or stored.consumed:
            session.revoked = True
            return None  # Commit revocation before reporting replay.
        if not user or not user.is_active:
            session.revoked = True
            return None
        stored.consumed = True
        return await token_pair(db, session.user_id, session)

    result = await transact(operation)
    if result is None:
        raise unauthorized()
    return result


async def logout(token: str) -> dict:
    claims = decode_token(token, "access")

    async def operation(db: AsyncSession):
        session = await auth_repo.lock_session(db, UUID(claims["sid"]))
        if not session or session.user_id != int(claims["sub"]):
            raise unauthorized()
        session.revoked = True
        return {"message": "Session and its access/refresh tokens revoked."}

    return await transact(operation)


async def create_staff(payload: StaffCreate) -> UserOut:
    if payload.role == "STUDENT":
        raise AppError(400, "USE_STUDENTS_ENDPOINT", "Create students through /students.")
    password_hash = hash_password(payload.password)

    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        user = User(
            email=str(payload.email).lower(), password_hash=password_hash, role=payload.role
        )
        db.add(user)
        await db.flush()
        return UserOut.model_validate(user)

    return await transact(operation)


async def patch_staff(actor: UserOut, identity: int, payload: StaffPatch) -> UserOut:
    async def operation(db: AsyncSession):
        await repo.academic_lock(db, exclusive=True)
        user = await repo.require(db, User, identity, lock=True)
        if user.role == "STUDENT":
            raise AppError(400, "USE_STUDENTS_ENDPOINT", "Manage students through /students.")
        data = values(payload)
        if identity == actor.id and data.get("is_active") is False:
            raise AppError(409, "SELF_DEACTIVATION", "Cannot deactivate the current administrator.")
        if "is_active" in data:
            user.is_active = data["is_active"]
        if "password" in data:
            user.password_hash = hash_password(data["password"])
            sessions = await auth_repo.user_sessions(db, identity)
            for session in sessions:
                session.revoked = True
        return UserOut.model_validate(user)

    return await transact(operation)
