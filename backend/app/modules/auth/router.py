from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import Admin, ClientIP, CurrentUser, Limit, Offset, OptionalToken, Token
from app.common.schemas import Page
from app.common.service import CatalogService
from app.models import User
from app.modules.auth import service
from app.modules.auth.schemas import (
    PasswordChange,
    RefreshInput,
    StaffCreate,
    StaffPatch,
    TokenPair,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Staff administration"])


@router.post("/login", response_model=TokenPair)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], ip: ClientIP):
    """Use the email address in the OAuth2 username field."""
    return await service.login(form.username, form.password, ip)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshInput):
    return await service.refresh(payload.refresh_token)


@router.post("/logout")
async def logout(token: OptionalToken, payload: RefreshInput | None = None):
    """Revokes the session named by the refresh token in the body, or else by the bearer token."""
    claims = service.logout_claims(token, payload and payload.refresh_token)
    return await service.logout(claims)


@router.post("/logout-all")
async def logout_all(token: OptionalToken, payload: RefreshInput | None = None):
    """Revokes every session of the user, this one included."""
    claims = service.logout_claims(token, payload and payload.refresh_token)
    return await service.logout(claims, everywhere=True)


@router.post("/password")
async def change_password(payload: PasswordChange, token: Token, user: CurrentUser, ip: ClientIP):
    """Keeps this session and signs out every other one."""
    return await service.change_password(token, payload, ip)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user


@users_router.get("", response_model=Page[UserOut])
async def list_users(admin: Admin, offset: Offset = 0, limit: Limit = 20):
    return await CatalogService(User, UserOut).list(offset, limit)


@users_router.post("", response_model=UserOut, status_code=201)
async def create_user(payload: StaffCreate, admin: Admin):
    return await service.create_staff(payload)


@users_router.patch("/{user_id}", response_model=UserOut)
async def patch_user(user_id: int, payload: StaffPatch, admin: Admin):
    return await service.patch_staff(admin, user_id, payload)
