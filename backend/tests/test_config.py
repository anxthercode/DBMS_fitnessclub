import pytest
from pydantic import ValidationError

from app.core.config import Settings


@pytest.mark.parametrize("url", ["sqlite:///db", "https://example.com/db"])
def test_only_postgresql_is_accepted(url):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url=url)


def test_secrets_are_not_in_settings_repr():
    settings = Settings(_env_file=None, database_url="postgresql://user:private-secret@host/db")
    assert "private-secret" not in repr(settings)


def test_invalid_pool_and_wildcard_cors_rejected():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            database_url="postgresql://host/db",
            db_pool_min_size=5,
            db_pool_max_size=1,
        )
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url="postgresql://host/db", cors_origins=["*"])
