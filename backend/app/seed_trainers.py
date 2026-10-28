"""Add fictional coursework profiles explicitly, without changing existing accounts.

Run with python -m app.seed_trainers. Random passwords are hashed and discarded;
use the existing local operator reset-password command to enable a trainer login.
"""

import asyncio
import json
import secrets
from pathlib import Path

import asyncpg

from app.auth.repository import audit
from app.auth.service import hasher
from app.core.config import Settings


async def seed_trainers(conn):
    profiles = json.loads(Path(__file__).with_name("demo_trainers.json").read_text("utf-8"))
    created = 0
    async with conn.transaction():
        await conn.execute("SELECT pg_advisory_xact_lock($1)", 73410903)
        for profile in profiles:
            # A pre-existing email or portrait is never adopted or overwritten.
            if await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM trainer_profiles WHERE portrait_key=$1)",
                profile["portrait_key"],
            ):
                continue
            password_hash = await asyncio.to_thread(hasher.hash, secrets.token_urlsafe(48))
            user_id = await conn.fetchval(
                """INSERT INTO users(email,password_hash,first_name,last_name,role)
                   VALUES($1,$2,$3,$4,'TRAINER') ON CONFLICT(email) DO NOTHING RETURNING id""",
                profile["email"], password_hash, profile["first_name"], profile["last_name"],
            )
            if user_id is None:
                continue
            await conn.execute(
                """INSERT INTO trainer_profiles(user_id,zones,experience_years,
                   specialization_ru,specialization_en,bio_ru,bio_en,education_ru,
                   education_en,portrait_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
                user_id, *(profile[key] for key in (
                    "zones", "experience_years", "specialization_ru", "specialization_en",
                    "bio_ru", "bio_en", "education_ru", "education_en", "portrait_key",
                )),
            )
            await audit(conn, user_id, "coursework_trainer_created", user_id)
            created += 1
    return created


async def main():
    conn = await asyncpg.connect(Settings().database_url.get_secret_value(), timeout=10)
    try:
        created = await seed_trainers(conn)
    finally:
        await conn.close()
    print(f"Created {created} fictional trainer profiles; existing accounts preserved.")


if __name__ == "__main__":
    asyncio.run(main())
