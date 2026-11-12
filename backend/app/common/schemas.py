from typing import Annotated, TypeVar

from pydantic import BaseModel, ConfigDict, Field

Name = Annotated[str, Field(min_length=1, max_length=100)]

Password = Annotated[str, Field(min_length=12, max_length=128)]

Phone = Annotated[str, Field(min_length=6, max_length=20, pattern=r"^[0-9+()\-\s]+$")]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[dict] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


T = TypeVar("T")


class Page[T](BaseModel):
    items: list[T]
    total: int
    offset: int
    limit: int
