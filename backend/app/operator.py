"""Local-only account bootstrap/reset. Passwords are prompted, never CLI arguments."""

import argparse
import asyncio
from getpass import getpass

import asyncpg

from app.auth.repository import audit, reset_password
from app.auth.schemas import Register
from app.auth.service import hasher
from app.core.config import Settings


async def operate(command, data):
    conn = await asyncpg.connect(Settings().database_url.get_secret_value())
    try:
        async with conn.transaction():
            password_hash = await asyncio.to_thread(hasher.hash, data.password)
            if command == "create-admin":
                user_id = await conn.fetchval(
                    """INSERT INTO users(email,password_hash,first_name,last_name,locale,role)
                       VALUES($1,$2,$3,$4,$5,'ADMIN') RETURNING id""",
                    str(data.email),
                    password_hash,
                    data.first_name,
                    data.last_name,
                    data.locale,
                )
            else:
                user_id = await conn.fetchval(
                    "SELECT id FROM users WHERE email=$1 FOR UPDATE", str(data.email)
                )
                if not user_id:
                    raise ValueError("Account not found")
                await reset_password(conn, user_id, password_hash)
            await audit(conn, user_id, "operator_" + command, user_id)
    finally:
        await conn.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["create-admin", "reset-password"])
    parser.add_argument("--email", required=True)
    parser.add_argument("--first-name", default="Club")
    parser.add_argument("--last-name", default="Administrator")
    args = parser.parse_args()
    password = getpass("Password (8–128 characters): ")
    if password != getpass("Repeat password: "):
        raise SystemExit("Passwords do not match")
    data = Register(
        email=args.email,
        password=password,
        first_name=args.first_name,
        last_name=args.last_name,
        locale="ru",
    )
    asyncio.run(operate(args.command, data))
    print("Account updated; no email was sent.")


if __name__ == "__main__":
    main()
