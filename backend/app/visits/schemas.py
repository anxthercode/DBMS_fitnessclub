import re
from datetime import date
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.auth.schemas import Input


def normalize_phone(value):
    if not re.fullmatch(r"\+?[\d\s()-]+", value):
        raise ValueError("Invalid phone")
    digits = re.sub(r"[^0-9]", "", value)
    if len(digits) == 11 and digits.startswith("80"):
        digits = "375" + digits[2:]
    if not 7 <= len(digits) <= 15:
        raise ValueError("Invalid phone")
    return "+" + digits


class Application(Input):
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(max_length=32)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("phone")
    @classmethod
    def phone_format(cls, value):
        return normalize_phone(value)


class VisitDecision(Input):
    status: Literal["confirmed", "rejected", "cancelled", "used"]
    visit_date: date | None = None
    zones: Literal["gym", "pool", "both"] | None = None
    eligibility_checked: bool = False

    @model_validator(mode="after")
    def confirmation(self):
        if self.status == "confirmed" and (
            not self.visit_date or not self.zones or not self.eligibility_checked
        ):
            raise ValueError("Date, zones and manual eligibility review are required")
        return self
