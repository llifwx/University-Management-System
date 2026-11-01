from typing import Annotated

from fastapi import Depends, Query
from fastapi.security import OAuth2PasswordBearer

from app.core.exceptions import AppError
from app.modules.auth.schemas import UserOut
from app.modules.auth.service import authenticate

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
Token = Annotated[str, Depends(oauth2)]


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
