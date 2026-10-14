from decimal import Decimal
from typing import Literal

from pydantic import Field, model_validator

from app.auth.schemas import Input


class OfferInput(Input):
    code: str = Field(pattern=r"^[A-Z][A-Z0-9_]{0,49}$")
    format: Literal["membership", "single_visit"]
    months: Literal[1, 3, 12] | None
    zones: Literal["gym", "pool", "both"]
    name_ru: str = Field(min_length=1, max_length=200)
    name_en: str = Field(min_length=1, max_length=200)
    description_ru: str = Field(default="", max_length=2000)
    description_en: str = Field(default="", max_length=2000)
    price_byn: Decimal = Field(gt=0, max_digits=14, decimal_places=2, allow_inf_nan=False)
    is_active: bool = Field(default=True, strict=True)

    @model_validator(mode="after")
    def term(self):
        if (self.format == "membership") != (self.months is not None):
            raise ValueError("Invalid term")
        return self


class DiscountInput(Input):
    code: str = Field(pattern=r"^[A-Z0-9_]{1,40}$")
    kind: Literal["percent", "fixed"]
    value: Decimal = Field(gt=0, max_digits=14, decimal_places=2, allow_inf_nan=False)
    is_active: bool = Field(default=True, strict=True)

    @model_validator(mode="after")
    def percent(self):
        if self.kind == "percent" and self.value > 100:
            raise ValueError("Percent must not exceed 100")
        return self


class RateInput(Input):
    currency: Literal["USD", "EUR"]
    byn_per_unit: Decimal = Field(gt=0, max_digits=18, decimal_places=8, allow_inf_nan=False)
