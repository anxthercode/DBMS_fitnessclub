from pydantic import Field

from app.auth.schemas import Input


class Active(Input):
    is_active: bool = Field(strict=True)
