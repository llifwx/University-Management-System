from pydantic import BaseModel, EmailStr, Field

from app.common.schemas import Input, Name, Output, Password
from app.models import Role

PROFILE_FIELDS = ("full_name", "title", "department", "office", "phone")


class UserOut(Output):
    id: int
    email: str
    role: Role
    is_active: bool
    full_name: str | None = None
    title: str | None = None
    department: str | None = None
    office: str | None = None
    phone: str | None = None


class StaffProfile(Input):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    office: str | None = Field(default=None, min_length=1, max_length=50)
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9()\- ]{3,30}$")


class StaffCreate(StaffProfile):
    email: EmailStr = Field(max_length=150)
    password: Password
    role: Role = Role.TEACHER
    full_name: Name


class StaffPatch(StaffProfile):
    is_active: bool | None = None
    password: Password | None = None
    full_name: Name | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshInput(Input):
    refresh_token: str = Field(min_length=1, max_length=4096)


class PasswordChange(Input):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password
