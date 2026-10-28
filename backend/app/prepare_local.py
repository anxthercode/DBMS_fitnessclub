"""Prepare local staff logins and two weeks of availability; preserve existing history."""

import asyncio
import json
import secrets
from datetime import datetime, time, timedelta
from pathlib import Path
from urllib.parse import urlsplit

import asyncpg

from app.auth.repository import audit, reset_password
from app.auth.schemas import Login
from app.auth.service import hasher
from app.core.config import BACKEND_ROOT, Settings
from app.memberships.products import MINSK
from app.schedule.schemas import SlotInput
from app.schedule.service import save_slot
from app.seed_trainers import seed_trainers

ADMIN_EMAIL = "admin@northside.example"


def account_templates():
    profiles = json.loads(Path(__file__).with_name("demo_trainers.json").read_text("utf-8"))
    return [
        dict(
            email=ADMIN_EMAIL,
            first_name="Администратор",
            last_name="Клуба",
            role="ADMIN",
            portrait_key=None,
        )
    ] + [dict(p, role="TRAINER") for p in profiles]


async def prepare_staff(conn, credentials):
    """Call inside a transaction. Only untouched seed identities can be activated."""
    await conn.execute("SELECT pg_advisory_xact_lock($1)", 73410903)
    await seed_trainers(conn)
    trainers = []
    for account in account_templates():
        password = credentials[account["email"]]
        Login(email=account["email"], password=password)
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE email=$1 FOR UPDATE", account["email"]
        )
        if user is None and account["role"] == "ADMIN":
            digest = await asyncio.to_thread(hasher.hash, password)
            user = await conn.fetchrow(
                "INSERT INTO users(email,password_hash,first_name,last_name,role) "
                "VALUES($1,$2,$3,$4,'ADMIN') RETURNING *",
                account["email"],
                digest,
                account["first_name"],
                account["last_name"],
            )
            await audit(conn, user["id"], "local_staff_prepared", user["id"])
        if not user or user["role"] != account["role"] or not user["is_active"]:
            raise ValueError("Staff email conflicts with an existing or inactive account")
        prepared = await conn.fetchval(
            "SELECT 1 FROM audit_logs WHERE actor_id=$1 AND action='local_staff_prepared'",
            user["id"],
        )
        if not prepared:
            untouched = account["role"] == "TRAINER" and await conn.fetchval(
                "SELECT 1 FROM trainer_profiles p WHERE p.user_id=$1 AND p.portrait_key=$2 "
                "AND EXISTS(SELECT 1 FROM audit_logs WHERE actor_id=$1 "
                "AND action='coursework_trainer_created') "
                "AND NOT EXISTS(SELECT 1 FROM auth_sessions WHERE user_id=$1) "
                "AND NOT EXISTS(SELECT 1 FROM audit_logs WHERE actor_id=$1 "
                "AND action IN ('login','operator_reset-password'))",
                user["id"],
                account["portrait_key"],
            )
            if not untouched:
                raise ValueError("Existing staff login preserved; use app.operator explicitly")
            await reset_password(conn, user["id"], await asyncio.to_thread(hasher.hash, password))
            await audit(conn, user["id"], "local_staff_prepared", user["id"])
        if account["role"] == "TRAINER":
            trainers.append(user)
    return trainers


async def prepare_slots(conn, trainers, today=None):
    await conn.execute("SELECT pg_advisory_xact_lock($1)", 73410903)
    today = today or datetime.now(MINSK).date()
    created = 0
    for offset in range(1, 15):
        day = today + timedelta(days=offset)
        if day.weekday() == 6:
            continue
        for index, trainer in enumerate(trainers):
            if day.weekday() % 2 != index % 2:
                continue
            zone = await conn.fetchval(
                "SELECT zones FROM trainer_profiles WHERE user_id=$1",
                trainer["id"],
            )
            for hour in (9 + index, 17 + index):
                start = datetime.combine(day, time(hour), MINSK)
                end = start + timedelta(hours=1)
                # Preserve even cancelled times; reruns never reopen a closed slot.
                if await conn.fetchval(
                    "SELECT 1 FROM training_slots WHERE trainer_id=$1 "
                    "AND starts_at<$3 AND ends_at>$2",
                    trainer["id"],
                    start,
                    end,
                ):
                    continue
                await save_slot(
                    conn,
                    trainer,
                    SlotInput(
                        zone="gym" if zone == "both" else zone,
                        title_ru="Персональная тренировка",
                        title_en="Personal training",
                        starts_at=start,
                        ends_at=end,
                    ),
                )
                created += 1
    return created


async def main():
    url = Settings().database_url.get_secret_value()
    parsed = urlsplit(url)
    if parsed.hostname not in ("localhost", "127.0.0.1") or parsed.path != "/northside":
        raise SystemExit("This command only prepares the local northside database")
    folder = BACKEND_ROOT / ".local"
    folder.mkdir(exist_ok=True)
    filename = folder / "staff-credentials.json"
    if filename.exists():
        credentials = json.loads(filename.read_text("utf-8"))
    else:
        credentials = {a["email"]: secrets.token_urlsafe(24) for a in account_templates()}
        # Persist before commit, so a process interruption cannot discard the passwords.
        with filename.open("x", encoding="utf-8") as output:
            json.dump(credentials, output, ensure_ascii=False, indent=2)
    conn = await asyncpg.connect(url, timeout=10)
    try:
        async with conn.transaction():
            trainers = await prepare_staff(conn, credentials)
            count = await prepare_slots(conn, trainers)
    finally:
        await conn.close()
    lines = [
        "# Local staff access",
        "",
        "Sign in at http://127.0.0.1:5173/login.",
        "Keep this ignored file private. Password changes are never reset by reruns.",
        "",
        "| Role | Email | Initial password |",
        "| --- | --- | --- |",
    ]
    lines += [
        f"| {a['role']} | {a['email']} | `{credentials[a['email']]}` |" for a in account_templates()
    ]
    (folder / "staff-access.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Staff access prepared; {count} future slots added. See backend/.local/staff-access.md")


if __name__ == "__main__":
    asyncio.run(main())
