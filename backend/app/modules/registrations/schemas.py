from datetime import datetime
from typing import Annotated

from pydantic import Field

from app.common.schemas import Input, Output


class RegistrationInput(Input):
    section_id: int = Field(gt=0)
    semester_id: int = Field(gt=0)


class AdminRegistrationInput(RegistrationInput):
    student_id: int = Field(gt=0)


class RegistrationStatusInput(Input):
    status: Annotated[str, Field(pattern="^(Pending|Rejected|Cancelled)$")]


class RegistrationOut(Output):
    registration_id: int
    student_id: int
    section_id: int
    semester_id: int
    registered_at: datetime
    status: str
