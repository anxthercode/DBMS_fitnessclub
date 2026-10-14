from datetime import date, timedelta
from typing import Literal

from pydantic import Field, model_validator

from app.auth.schemas import Input


class DateRange(Input):
    start: date
    end: date

    @model_validator(mode="after")
    def valid_range(self):
        if self.end < self.start or self.end - self.start > timedelta(days=366):
            raise ValueError("Choose an ordered date range of at most 367 dates")
        return self


class ImportInput(Input):
    format: Literal["json", "xml", "csv"]
    content: str = Field(min_length=1, max_length=1_000_000)
    apply: bool = Field(default=False, strict=True)
