from pydantic import EmailStr, Field

from app.common.schemas import Input, Name, Output, Password


class StudentCreate(Input):
    email: EmailStr = Field(max_length=150)
    password: Password
    full_name: Name
    program: str | None = Field(default=None, max_length=80)
    year_level: int = Field(ge=1, le=8)


class StudentPatch(Input):
    email: EmailStr | None = Field(default=None, max_length=150)
    full_name: Name | None = None
    program: str | None = Field(default=None, max_length=80)
    year_level: int | None = Field(default=None, ge=1, le=8)
    is_active: bool | None = None


class StudentOut(Output):
    student_id: int
    user_id: int
    email: str
    full_name: str
    program: str | None
    year_level: int
