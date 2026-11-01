import hashlib
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings
from app.core.exceptions import AppError

hasher = PasswordHasher()
# Equalize password verification work for unknown accounts.
DUMMY_HASH = hasher.hash(str(uuid4()))


def hash_password(password: str) -> str:
    return hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_token(user_id: int, session_id: UUID, kind: str, expires: datetime) -> str:
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(session_id),
            "type": kind,
            "jti": str(uuid4()),
            "iat": datetime.now(UTC),
            "exp": expires,
            "iss": "university-api",
            "aud": "university-client",
        },
        get_settings().jwt_secret,
        algorithm="HS256",
    )


def decode_token(token: str, kind: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=["HS256"],
            issuer="university-api",
            audience="university-client",
            options={"require": ["exp", "iat", "sub", "sid", "type", "jti"]},
        )
        if payload["type"] != kind:
            raise ValueError("Wrong token type")
        int(payload["sub"])
        UUID(payload["sid"])
        return payload
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError) as exc:
        raise AppError(401, "INVALID_TOKEN", "Invalid or expired token.") from exc


def access_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(minutes=get_settings().access_token_minutes)
