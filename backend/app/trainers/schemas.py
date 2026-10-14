from typing import Literal

from pydantic import Field

from app.auth.schemas import Input, Register


class TrainerProfile(Input):
    zones: Literal["gym", "pool", "both"]
    experience_years: int = Field(ge=0, le=80)
    specialization_ru: str = Field(min_length=1, max_length=300)
    specialization_en: str = Field(min_length=1, max_length=300)
    bio_ru: str = Field(min_length=1, max_length=3000)
    bio_en: str = Field(min_length=1, max_length=3000)
    education_ru: str = Field(default="", max_length=1000)
    education_en: str = Field(default="", max_length=1000)


class CreateTrainer(Register):
    profile: TrainerProfile
