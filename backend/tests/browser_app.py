"""Browser-test app: dedicated test database and intercepted email, never real SMTP."""

import hashlib
import json
from urllib.parse import urlsplit

from app.auth import mail
from app.core.config import BACKEND_ROOT, Settings
from app.main import create_app


def app():
    settings = Settings()
    target = urlsplit(settings.database_url.get_secret_value())
    if target.path != "/northside_test" or target.hostname not in ("localhost", "127.0.0.1"):
        raise RuntimeError("Browser tests require local northside_test")

    async def capture(_settings, email, purpose, token, locale):
        directory = BACKEND_ROOT / ".local" / "browser-mail"
        directory.mkdir(parents=True, exist_ok=True)
        filename = hashlib.sha256(email.encode()).hexdigest() + ".json"
        (directory / filename).write_text(
            json.dumps({"purpose": purpose, "token": token}), encoding="utf-8"
        )

    mail.send = capture
    return create_app(settings)
