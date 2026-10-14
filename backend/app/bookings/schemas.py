from typing import Literal

from pydantic import Field

from app.auth.schemas import Input


class BookingInput(Input):
    training_slot_id: str = Field(pattern=r"^[1-9][0-9]{0,17}$")


class Decision(Input):
    status: Literal["approved", "rejected", "cancelled", "attended", "no_show"]
    reason: str | None = Field(default=None, max_length=500)
