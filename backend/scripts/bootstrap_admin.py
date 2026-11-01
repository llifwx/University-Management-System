"""Explicit, idempotent initial administrator creation; never resets credentials."""

import asyncio

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionFactory, engine
from app.models import User


async def bootstrap() -> None:
    settings = get_settings()
    email, password = settings.bootstrap_admin_email, settings.bootstrap_admin_password
    if not email or not password or len(password) < 12 or len(password) > 128:
        raise ValueError(
            "Set BOOTSTRAP_ADMIN_EMAIL and a 12–128 character BOOTSTRAP_ADMIN_PASSWORD"
        )
    email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
    async with SessionFactory() as db, db.begin():
        user = await db.scalar(select(User).where(User.email == email))
        if user:
            if user.role != "ADMIN":
                raise ValueError("Email is already in use by a non-admin account")
            print("Administrator already exists; credentials unchanged.")
            return
        db.add(User(email=email, role="ADMIN", password_hash=hash_password(password)))
    print("Administrator created.")


async def main():
    try:
        await bootstrap()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
