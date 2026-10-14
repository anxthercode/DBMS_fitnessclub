from typing import Literal

from pydantic import BaseModel


class AccessOfferPreview(BaseModel):
    format: Literal["membership", "single_visit"]
    zones: Literal["gym", "pool", "both"]
    months: Literal[1, 3, 12] | None
    price_byn: str


class AccessOffer(AccessOfferPreview):
    id: str
    revision: int
    is_active: Literal[True] = True
