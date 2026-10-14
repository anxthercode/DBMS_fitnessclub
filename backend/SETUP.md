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
| `FRONTEND_URL` | Email-link origin, default `http://127.0.0.1:5173` |
| `COOKIE_SECURE` / `SESSION_HOURS` | Local HTTP: false / 168; HTTPS deployment requires secure cookies |

`/api/v1/health/live` checks the API process; `/api/v1/health/ready` checks catalogue availability. `/docs` lists auth, catalogue, cart, order, payment, access and notification endpoints. `/api/v1/auth/session` returns the signed-in user or 401.

In pgAdmin, connect to localhost:5432 and inspect **Databases → northside → Schemas → public → Tables**. Migrations through `0003_access_commerce` create 23 application tables; `alembic_version` records migrations. Restart FastAPI after changing its environment. Stop development servers with Ctrl+C; leave the PostgreSQL service running.

## Gmail SMTP

Deferred for the simplified coursework release. No mailbox setup is currently required. The instructions below describe the existing optional adapter; disabling its calls and the email-verification gate is the next code change, not yet implemented.

1. Create a separate project Gmail account, for example `northside.fitness.project@gmail.com` if available. This is the sender; site users register with their own recipient email.
2. Enable [Google 2-Step Verification](https://myaccount.google.com/security), then create an [app password](https://myaccount.google.com/apppasswords) named NORTHSIDE. Use that 16-character password without spaces, not the normal Google password. See [Google's requirements](https://support.google.com/accounts/answer/185833?hl=en) if this option is unavailable.
3. Fill the existing ignored `backend/.local/smtp.env` using [smtp.env.example](smtp.env.example): `SMTP_USER` and `SMTP_FROM` are the project address, `SMTP_PASSWORD` is its app password. Use `smtp.gmail.com`, port `587`, `starttls` ([Google SMTP settings](https://support.google.com/mail/answer/7104828?hl=en)). Never paste credentials into chat or Git.
4. Restart FastAPI. Run the frontend in HTTP mode at `http://127.0.0.1:5173`. Register with your own email, open the confirmation link and confirm; check Spam if needed. For an existing account, use resend in the account/cart. Then test password recovery and login with the new password.

Current mail scope: confirmation and password recovery in RU/EN. Purchases create in-app notifications, not receipt emails. Registration remains saved if delivery fails, but checkout stays blocked until confirmation. Recovery always shows a generic result, so that message alone does not prove delivery. Links target this laptop and require its development servers to be running. Real Gmail delivery has not yet been verified; automated tests intercept mail.
