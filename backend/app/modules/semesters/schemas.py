from datetime import date

from pydantic import Field, model_validator

from app.common.schemas import Input, Output


class SemesterCreate(Input):
    name: str = Field(min_length=1, max_length=80)
    start_date: date
    end_date: date
    is_active: bool = True

    @model_validator(mode="after")
    def interval(self):
        if self.start_date >= self.end_date:
            raise ValueError("start_date must precede end_date")
        return self


class SemesterPatch(Input):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class SemesterOut(Output):
    semester_id: int
    name: str
    start_date: date
    end_date: date
    is_active: bool
