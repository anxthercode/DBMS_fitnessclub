# Local PostgreSQL setup

Use the installed PostgreSQL Windows service on `127.0.0.1:5432`; no Docker or separate database process is needed. Keep automatic service startup enabled. pgAdmin is only a management interface.

## First setup on another machine

Install Python dependencies using the root README, then run from `backend/`:

```powershell
New-Item -ItemType Directory -Force .local
notepad .local/admin.password
```

Save the local `postgres` administrator password as one line in that ignored file. Do not send or commit it. Then:

```powershell
.\.venv\Scripts\python.exe scripts/setup_existing_db.py
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
```

The setup script creates `northside_app` without superuser/role/database-creation privileges, its databases `northside` and `northside_test`, and an ignored `.env` with a generated application password. It checks existing ownership/credentials, preserves unrelated databases and clears the administrator password file after success. Seed reruns preserve existing catalogue entries. Do not delete `.env` after provisioning: it holds the generated application credentials.

For an already provisioned database, configure `.env` from `.env.example` instead. URL-encode special characters in passwords. Never expose database credentials through frontend `VITE_*` variables.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required PostgreSQL application connection URL |
| `TEST_DATABASE_URL` | Dedicated local `northside_test`; tests migrate and reset its application data |
| `CORS_ORIGINS` | JSON list of exact frontend origins, default localhost/127.0.0.1 port 5173 |
| `DB_POOL_MIN_SIZE` / `DB_POOL_MAX_SIZE` | Shared asyncpg pool bounds, defaults 1 / 5 |
| `DB_COMMAND_TIMEOUT` | Query timeout in seconds, default 10 |
| `FRONTEND_URL` | Reserved for deferred email links, default `http://127.0.0.1:5173` |
| `COOKIE_SECURE` / `SESSION_HOURS` | Local HTTP: false / 168; HTTPS deployment requires secure cookies |

`/api/v1/health/live` checks the API process; `/api/v1/health/ready` checks catalogue availability. `/docs` lists auth, catalogue, cart, order, payment, access and notification endpoints. `/api/v1/auth/session` returns the signed-in user or 401.

In pgAdmin, connect to localhost:5432 and inspect **Databases → northside → Schemas → public → Tables**. Migrations through `0006_trainer_portraits` create 30 application tables; `alembic_version` records migrations. Restart FastAPI after changing its environment. Stop development servers with Ctrl+C; leave the PostgreSQL service running.

## Accounts and future availability

Registration, login and purchases work without email verification. Email delivery and password recovery are deferred; no Gmail or SMTP configuration is required. Legacy token tables remain for history.

On the local `northside` database, prepare one administrator, the three seeded trainers and the next two weeks of availability:

```powershell
.\.venv\Scripts\python.exe -m app.prepare_local
```

Credentials are stored only in ignored `.local/staff-access.md` and `.local/staff-credentials.json`. Open the Markdown file locally; never commit or share it. The command activates only untouched seeded trainer identities, refuses unrelated account collisions, preserves changed passwords and never reopens cancelled slots. Repeating it adds only missing future times. It does not create purchases or bookings.

For another database, create an administrator explicitly and enter the password at the prompt:

```powershell
.\.venv\Scripts\python.exe -m app.operator create-admin --email admin@example.com
.\.venv\Scripts\python.exe -m app.operator reset-password --email trainer@example.com
```

Sign in through `/login`. Administrators are redirected to `/admin`; trainers to `/trainer`. Create further trainer accounts through the administrator's Trainers section. Trainers manage their availability, requests, attendance, profile and notifications. The public timetable displays future times grouped by day and trainer.

## Verification

Run `python -m pytest -q` with the backend virtual environment. Integration tests migrate and reset only local `northside_test`, never `northside`. Browser HTTP tests use this same test database, so run them after pytest, not concurrently. Tests cover permissions, purchases, duplicate payments, access periods, bookings, concurrency, cancellations, first visits and pass redemption.
