from typing import Annotated

from fastapi import Depends, Query, Request
from fastapi.security import OAuth2PasswordBearer

from app.core.exceptions import AppError
from app.modules.auth.schemas import UserOut
from app.modules.auth.service import authenticate

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
Token = Annotated[str, Depends(oauth2)]
OptionalToken = Annotated[
    str | None, Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False))
]


def client_ip(request: Request) -> str | None:
    # Uvicorn rewrites this from X-Forwarded-For only for proxies in FORWARDED_ALLOW_IPS.
    return request.client.host if request.client else None


ClientIP = Annotated[str | None, Depends(client_ip)]


async def current_user(token: Token) -> UserOut:
    return await authenticate(token)


CurrentUser = Annotated[UserOut, Depends(current_user)]


def roles(*allowed: str):
    async def dependency(user: CurrentUser) -> UserOut:
        if user.role not in allowed:
            raise AppError(403, "FORBIDDEN", "Insufficient permissions.")
        return user

    return dependency


Admin = Annotated[UserOut, Depends(roles("ADMIN"))]
StudentActor = Annotated[UserOut, Depends(roles("STUDENT"))]
StaffActor = Annotated[UserOut, Depends(roles("ADMIN", "TEACHER"))]
Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]
