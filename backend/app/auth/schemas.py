import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Name = Annotated[str, Field(min_length=1, max_length=80)]
Password = Annotated[str, Field(min_length=8, max_length=128)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)


class EmailInput(Input):
    email: EmailStr = Field(max_length=254)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class Login(EmailInput):
    password: str = Field(min_length=1, max_length=128)


class Profile(Input):
    first_name: Name
    last_name: Name
    phone: str | None = Field(default=None, max_length=32)
    locale: Literal["ru", "en"] = "ru"

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value):
        if not value or not value.strip():
            return None
        value = value.strip()
        if (
            not re.fullmatch(r"\+?[\d\s()-]+", value)
            or not 7 <= len(re.sub(r"\D", "", value)) <= 15
        ):
            raise ValueError("Invalid phone")
        return value

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class Register(EmailInput, Profile):
    password: Password

    @field_validator("password")
    @classmethod
    def nonblank_password(cls, value):
        if not value.strip():
            raise ValueError("Password cannot be blank")
        return value


class Token(Input):
    token: str = Field(min_length=32, max_length=128)


class Reset(Token):
    password: Password

    @field_validator("password")
    @classmethod
    def nonblank_password(cls, value):
        return Register.nonblank_password(value)
