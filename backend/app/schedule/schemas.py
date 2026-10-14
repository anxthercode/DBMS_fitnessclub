from datetime import timedelta
from decimal import Decimal
from typing import Literal

from pydantic import AwareDatetime, Field, model_validator

from app.auth.schemas import Input


class SlotInput(Input):
    zone: Literal["gym", "pool"]
    title_ru: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    training_type: Literal["individual"] = "individual"
    capacity: Literal[1] = 1

    @model_validator(mode="after")
    def duration(self):
        if self.ends_at - self.starts_at != timedelta(minutes=60):
            raise ValueError("Sessions last 60 minutes")
        return self


class TrainingOfferInput(Input):
    price_byn: Decimal = Field(gt=0, max_digits=14, decimal_places=2, allow_inf_nan=False)
    is_active: bool = Field(strict=True)
