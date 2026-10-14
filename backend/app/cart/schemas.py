from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.auth.schemas import Input

Money = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2, allow_inf_nan=False)]


class Selection(Input):
    format: Literal["membership", "single_visit", "training"]
    zones: Literal["gym", "pool", "both"]
    months: Literal[1, 3, 12] | None
    date: date | None

    @model_validator(mode="after")
    def check_format(self):
        if (self.format == "membership") != (self.months is not None):
            raise ValueError("Invalid term")
        if self.format == "training":
            if self.zones == "both" or self.date is not None:
                raise ValueError("Training requires one zone and no date")
        elif self.date is None:
            raise ValueError("Access requires a date")
        return self


class PutItem(Input):
    selection: Selection
    expected_price_byn: Money
    expected_revision: int = Field(ge=1)
    idempotency_key: UUID
    item_id: str | None = Field(default=None, pattern=r"^[1-9][0-9]{0,17}$")
    cart_version: int | None = Field(default=None, ge=0)


class Version(Input):
    version: int = Field(ge=0)


class Quote(Input):
    cart_version: int = Field(ge=0)
    promo_code: str | None = Field(default=None, max_length=40)
    currency: Literal["BYN", "USD", "EUR"]


class Checkout(Quote):
    idempotency_key: UUID
    expected_total_byn: Money
    expected_total_currency: Money
    expected_rate: Decimal = Field(gt=0, max_digits=18, decimal_places=8, allow_inf_nan=False)


class Payment(Input):
    successful: bool = Field(strict=True)
    idempotency_key: UUID
