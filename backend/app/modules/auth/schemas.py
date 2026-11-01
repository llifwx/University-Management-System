from pydantic import BaseModel, EmailStr, Field

from app.common.schemas import Input, Output, Password
from app.models import Role


class UserOut(Output):
    id: int
    email: str
    role: Role
    is_active: bool


class StaffCreate(Input):
    email: EmailStr = Field(max_length=150)
    password: Password
    role: Role = Role.TEACHER


class StaffPatch(Input):
    is_active: bool | None = None
    password: Password | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshInput(Input):
    refresh_token: str = Field(min_length=1, max_length=4096)
