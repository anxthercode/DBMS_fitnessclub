"""Create the project's databases/role on the existing local PostgreSQL service.

Reads the administrator password from ignored .local/admin.password; never prints it.
Existing project roles/databases are verified, not overwritten. No service settings change.
"""

import asyncio
import secrets
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

import asyncpg
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
SECRET = ROOT / ".local" / "admin.password"


async def main():
    password = SECRET.read_text(encoding="utf-8").strip() if SECRET.exists() else ""
    if not password:
        raise SystemExit(
            "Enter your PostgreSQL postgres password in backend/.local/admin.password."
        )
    env_path = ROOT / ".env"
    existing = dotenv_values(env_path) if env_path.exists() else {}
    old_url = existing.get("DATABASE_URL") or ""
    parsed = urlsplit(old_url)
    if old_url and (
        parsed.hostname != "127.0.0.1"
        or parsed.username != "northside_app"
        or parsed.path != "/northside"
        or parsed.port not in (5432, 55432)
    ):
        raise SystemExit("Existing .env targets another database and was preserved.")
    app_password = unquote(parsed.password or "") or secrets.token_urlsafe(32)
    url = f"postgresql://northside_app:{quote(app_password)}@127.0.0.1:5432/northside"
    admin = await asyncpg.connect(
        host="127.0.0.1",
        port=5432,
        database="postgres",
        user="postgres",
        password=password,
        timeout=10,
    )
    try:
        role = await admin.fetchrow(
            "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1",
            "northside_app",
        )
        if role and any(role.values()):
            raise RuntimeError("Existing northside_app has elevated privileges; no changes made")
        if not role:
            statement = await admin.fetchval(
                "SELECT format('CREATE ROLE northside_app LOGIN NOSUPERUSER "
                "NOCREATEDB NOCREATEROLE PASSWORD %L', $1::text)",
                app_password,
            )
            await admin.execute(statement)
        # Verify credentials before touching databases if the role already existed.
        probe = await asyncpg.connect(
            host="127.0.0.1",
            port=5432,
            database="postgres",
            user="northside_app",
            password=app_password,
            timeout=10,
        )
        await probe.close()
        for name in ("northside", "northside_test"):
            owner = await admin.fetchval(
                "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = $1",
                name,
            )
            if owner and owner != "northside_app":
                raise RuntimeError("Existing project database has a different owner; preserved")
            if owner is None:
                statement = await admin.fetchval(
                    "SELECT format('CREATE DATABASE %I OWNER northside_app', $1::text)",
                    name,
                )
                await admin.execute(statement)
    finally:
        await admin.close()
    env_path.write_text(
        f"DATABASE_URL={url}\nTEST_DATABASE_URL={url}_test\n"
        'CORS_ORIGINS=["http://127.0.0.1:5173","http://localhost:5173",'
        '"http://127.0.0.1:4173","http://127.0.0.1:5174"]\n',
        encoding="utf-8",
    )
    SECRET.write_text("", encoding="utf-8")
    print("Local service configured: northside / northside_test. Admin password cleared.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (asyncpg.PostgresError, OSError, TimeoutError):
        raise SystemExit(
            "Connection/setup failed; verify local credentials and PostgreSQL service."
        ) from None
