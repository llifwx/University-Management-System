import json
import logging
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
from app.models import AuthSession, LoginFailure, RefreshToken, User
from app.modules.auth import repository as auth_repo
from app.modules.auth.schemas import PasswordChange, StaffCreate, StaffPatch, TokenPair, UserOut

logger = logging.getLogger("university")

FAILURE_WINDOW = timedelta(minutes=15)
MAX_FAILURES_PER_EMAIL = 5
# Higher than per email: a campus NAT puts many people behind one address.
MAX_FAILURES_PER_IP = 30


def unauthorized() -> AppError:
    return AppError(401, "INVALID_CREDENTIALS", "Invalid credentials or revoked session.")


def too_many_attempts() -> AppError:
    return AppError(
        429, "TOO_MANY_ATTEMPTS", "Too many failed sign-in attempts. Try again in 15 minutes."
    )


def audit(event: str, **fields) -> None:
    logger.info(json.dumps({"event": event, **fields}, default=str))


async def throttled(db: AsyncSession, email: str, ip: str | None) -> bool:
    # ponytail: count-then-insert, so parallel guesses can overshoot the limit by a few;
    # an advisory lock per email closes that if it ever matters.
    by_email, by_ip = await auth_repo.failure_counts(
        db, email, ip, datetime.now(UTC) - FAILURE_WINDOW
    )
    return by_email >= MAX_FAILURES_PER_EMAIL or by_ip >= MAX_FAILURES_PER_IP


async def token_pair(db: AsyncSession, user_id: int, session: AuthSession) -> TokenPair:
    refresh = issue_token(user_id, session.id, "refresh", session.expires_at)
    db.add(RefreshToken(token_hash=token_digest(refresh), session_id=session.id))
    return TokenPair(
        access_token=issue_token(user_id, session.id, "access", access_expiry()),
        refresh_token=refresh,
        expires_in=get_settings().access_token_minutes * 60,
    )


async def login(email: str, password: str, ip: str | None = None) -> TokenPair:
    email = email.lower()

    async def operation(db: AsyncSession):
        if await throttled(db, email, ip):
            return too_many_attempts()
        user = await auth_repo.by_email(db, email)
        valid = verify_password(password, user.password_hash if user else DUMMY_HASH)
        if not user or not valid or not user.is_active:
            db.add(LoginFailure(email=email, ip=ip))
            return unauthorized()  # Returned, not raised: the failure row must commit.
        await auth_repo.clear_failures(db, email)
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
        audit("login_ok", user_id=user.id, ip=ip)
        return await token_pair(db, user.id, session)

    result = await transact(operation)
    if isinstance(result, AppError):
        audit("login_locked" if result.status == 429 else "login_failed", email=email, ip=ip)
        raise result
    return result


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
        if not stored or stored.session_id != session.id:
            # Validly signed but already spent: someone else rotated it first.
            session.revoked = True
            audit("refresh_replay", user_id=session.user_id, session_id=session.id)
            return None  # Commit revocation before reporting replay.
        if not user or not user.is_active:
            session.revoked = True
            return None
        await db.delete(stored)
        return await token_pair(db, session.user_id, session)

    result = await transact(operation)
    if result is None:
        raise unauthorized()
    return result


def logout_claims(access: str | None, refresh: str | None) -> dict:
    """Either token names the session; the refresh token still works once the access one expired."""
    if refresh:
        return decode_token(refresh, "refresh")
    if access:
        return decode_token(access, "access")
    raise unauthorized()


async def logout(claims: dict, everywhere: bool = False) -> dict:
    async def operation(db: AsyncSession):
        session = await auth_repo.lock_session(db, UUID(claims["sid"]))
        if not session or session.user_id != int(claims["sub"]):
            raise unauthorized()
        targets = await auth_repo.user_sessions(db, session.user_id) if everywhere else [session]
        for target in targets:
            target.revoked = True
        audit("logout_all" if everywhere else "logout", user_id=session.user_id)
        return {"message": f"{len(targets)} session(s) revoked."}

    return await transact(operation)


async def change_password(access: str, payload: PasswordChange, ip: str | None) -> dict:
    claims = decode_token(access, "access")

    async def operation(db: AsyncSession):
        user = await repo.require(db, User, int(claims["sub"]), lock=True)
        if await throttled(db, user.email, ip):
            return too_many_attempts()
        if not verify_password(payload.current_password, user.password_hash):
            db.add(LoginFailure(email=user.email, ip=ip))
            # 400, not 401: the session is fine and the BFF would treat 401 as signed out.
            return AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.")
        await auth_repo.clear_failures(db, user.email)
        user.password_hash = hash_password(payload.new_password)
        current = UUID(claims["sid"])
        for session in await auth_repo.user_sessions(db, user.id):
            session.revoked = session.revoked or session.id != current
        audit("password_changed", user_id=user.id, ip=ip)
        return {"message": "Password changed. Other sessions were signed out."}

    result = await transact(operation)
    if isinstance(result, AppError):
        raise result
    return result


async def purge_expired() -> None:
    now = datetime.now(UTC)
    await transact(lambda db: auth_repo.purge(db, now, now - FAILURE_WINDOW))


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
