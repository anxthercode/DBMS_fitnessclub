from pathlib import Path

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env", extra="ignore"
    )

    database_url: SecretStr
    cors_origins: list[str] = ["http://127.0.0.1:5173", "http://localhost:5173"]
    db_pool_min_size: int = Field(default=1, ge=1, le=20)
    db_pool_max_size: int = Field(default=5, ge=1, le=20)
    db_command_timeout: float = Field(default=10, gt=0, le=60)
    frontend_url: str = "http://127.0.0.1:5173"
    cookie_secure: bool = False
    session_hours: int = Field(default=168, ge=1, le=720)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_from: str = ""
    smtp_security: str = "starttls"

    @model_validator(mode="after")
    def validate_database(self):
        if not self.database_url.get_secret_value().startswith(("postgresql://", "postgres://")):
            raise ValueError("DATABASE_URL must use PostgreSQL")
        if self.db_pool_min_size > self.db_pool_max_size:
            raise ValueError("DB_POOL_MIN_SIZE must not exceed DB_POOL_MAX_SIZE")
        if "*" in self.cors_origins:
            raise ValueError("Use explicit CORS origins")
        return self
