from datetime import date
from typing import Annotated, Literal

from pydantic import EmailStr, Field

from app.common.schemas import Input, Name, Output, Password, Phone

Gender = Literal["MALE", "FEMALE"]
MaritalStatus = Literal["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]
AdmissionYear = Annotated[str, Field(pattern=r"^\d{4}-\d{4}$")]


class StudentCreate(Input):
    email: EmailStr = Field(max_length=150)
    password: Password
    last_name: Name
    first_name: Name
    patronymic: str | None = Field(default=None, max_length=100)
    program: str | None = Field(default=None, max_length=80)
    year_level: int = Field(ge=1, le=8)
    # Becomes the first two digits of the student number; defaults to the current year.
    enrollment_year: int | None = Field(default=None, ge=2000, le=2099)
    birth_date: date | None = None
    gender: Gender | None = None
    marital_status: MaritalStatus | None = None
    nationality: str | None = Field(default=None, max_length=80)
    citizenship: str | None = Field(default=None, max_length=80)
    is_resident: bool = True
    personal_email: EmailStr | None = Field(default=None, max_length=150)
    needs_dormitory: bool = False
    admission_year: AdmissionYear | None = None
    advisor: str | None = Field(default=None, max_length=100)
    study_form: str | None = Field(default=None, max_length=80)
    winter_admission: bool | None = None


class StudentPatch(Input):
    email: EmailStr | None = Field(default=None, max_length=150)
    last_name: Name | None = None
    first_name: Name | None = None
    patronymic: str | None = Field(default=None, max_length=100)
    program: str | None = Field(default=None, max_length=80)
    year_level: int | None = Field(default=None, ge=1, le=8)
    phone_number: Phone | None = None
    birth_date: date | None = None
    gender: Gender | None = None
    marital_status: MaritalStatus | None = None
    nationality: str | None = Field(default=None, max_length=80)
    citizenship: str | None = Field(default=None, max_length=80)
    is_resident: bool | None = None
    personal_email: EmailStr | None = Field(default=None, max_length=150)
    needs_dormitory: bool | None = None
    admission_year: AdmissionYear | None = None
    advisor: str | None = Field(default=None, max_length=100)
    study_form: str | None = Field(default=None, max_length=80)
    winter_admission: bool | None = None
    is_active: bool | None = None


class StudentSelfPatch(Input):
    """The only self-service edits a student has: everything else is admin-only."""

    phone_number: Phone | None = None
    personal_email: EmailStr | None = Field(default=None, max_length=150)


class StudentOut(Output):
    student_id: int
    student_number: str
    user_id: int
    email: str
    full_name: str
    last_name: str
    first_name: str
    patronymic: str | None
    program: str | None
    year_level: int
    phone_number: str | None
    photo_url: str | None
    birth_date: date | None
    gender: Gender | None
    marital_status: MaritalStatus | None
    nationality: str | None
    citizenship: str | None
    is_resident: bool
    personal_email: str | None
    needs_dormitory: bool
    admission_year: str | None
    advisor: str | None
    study_form: str | None
    winter_admission: bool | None
