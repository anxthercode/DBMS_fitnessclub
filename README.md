# NORTHSIDE — Fitness Club Management System

DBMS coursework: Russian/English website for clients, trainers and administrators.
**Stack:** React + TypeScript + Vite → FastAPI + Pydantic v2 → PostgreSQL via asyncpg. Explicit SQL, no ORM or Docker. Alembic runs manually written SQL migrations.

## Status

- The frontend uses HTTP/PostgreSQL by default. Optional mock mode resets demo data on reload.
- HTTP mode persists accounts, carts, mixed access/training orders, simulated payments, bookings, first visits and pass redemption. Admin/trainer workspaces, limited reports and offer exchange are implemented; final acceptance is still incomplete.
- Registration and purchases do not require email confirmation. Verification/recovery endpoints and mail calls are disabled; no SMTP setup is needed. Passwords use Argon2id.
- Training zones can be edited in place in the cart. Admin first-visit review shows phone-matched accounts and attendance history, with a manual eligibility decision. See [current verification and remaining work](docs/implementation-status.md).
- Three trainer profiles with portraits, local staff logins and future availability are prepared in HTTP mode. The public schedule uses a week/day selector and times grouped by trainer; staff workspaces use section navigation. See ignored `backend/.local/staff-access.md` for local credentials.
- PostgreSQL runs as the installed Windows service on port **5432**, with automatic startup. pgAdmin is optional; deployment is outside this milestone.
- Existing diagrams remain unchanged. Native 200% browser-zoom acceptance is still pending; see [frontend verification](docs/frontend-verification.md).

<a id="3-functional-scope-and-agreed-rules"></a>
## Agreed scope

On 11 October the user delegated the remaining product choices and requested a simpler coursework release. These decisions replace the earlier package and email requirements; the status above distinguishes working features from remaining acceptance work.

| Area | Selected minimum |
| --- | --- |
| Accounts | Email + password; no email confirmation, SMTP or password recovery in this release. Never mark an unverified address as verified. |
| Access and payment | Keep existing memberships, single visits, cart, simulated payment, discounts and BYN/USD/EUR. No real charges or refunds. |
| Personal training | Buy one 60-minute session for one zone, then book any trainer in that zone. Initial illustrative price: 30 BYN. No bundles, expiry or trainer price tiers; a covering membership is required. |
| Booking | One client per slot; trainer approves/rejects and marks attendance/no-show. A request reserves the paid session; attendance/no-show uses it, rejection or permitted cancellation returns it. Client cancellation closes 12 hours before start. |
| Administration | Simple lists/forms for users, trainers, offers and purchase history; mark a pass used once. No manual access grants or rewriting paid orders. First-visit form: name/phone → admin confirmation → used. |
| Coursework outputs | RU/EN and in-app notifications; access-offer import/export in JSON/XML/CSV; one sales report in Word/Excel/PDF; four SQL summaries, no chart dashboard. |

Details: [specification](docs/project-specification.md), [schema plan](docs/database/schema-proposal.md), [database details](docs/database/schema-design-details.md). No package-policy approval remains pending.
<a id="6-database-design-and-preserved-diagrams"></a>
The [diagram inventory](docs/project-specification.md#database-and-diagrams) lists preserved graphics and editable sources.

## Run locally — PowerShell

Requirements: Node.js 22.12+, Python 3.12+ and running PostgreSQL (verified with PostgreSQL 18). Run the backend and frontend in separate terminals; the database service already starts with Windows.

Backend, first installation:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

Database provisioning on this laptop is complete. On another machine, follow [database setup](backend/SETUP.md). Keep credentials in ignored `backend/.env`; see [.env.example](backend/.env.example).

Backend, apply migrations and start:
```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
# Optional on a new coursework database; preserves existing users and profiles.
.\.venv\Scripts\python.exe -m app.seed_trainers
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload
```

Frontend, connected to PostgreSQL through FastAPI:
```powershell
cd frontend
npm.cmd ci
$env:VITE_API_MODE = "http"
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000/api/v1"
npm.cmd run dev
```

The optional trainer seed uses discarded random passwords. On this laptop, run `python -m app.prepare_local` from the backend virtual environment to prepare staff logins and the next two weeks of slots. It preserves existing purchases, changed passwords and cancelled times; credentials stay in ignored `backend/.local/staff-access.md`. See [account setup](backend/SETUP.md).

Open `http://127.0.0.1:5173`; API docs: `http://127.0.0.1:8000/docs`. To use the demo, set `VITE_API_MODE=mock` and restart Vite. Demo-only login: `client@northside.demo` / `Northside2026!`.

## Checks

- Backend: `.\.venv\Scripts\python.exe -m ruff check .` and `.\.venv\Scripts\python.exe -m pytest -q`. Integration tests reset only local `northside_test`; they require `TEST_DATABASE_URL`.
- Frontend: `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run test:http`. Browser tests require Chrome; mock tests use an isolated Vite server on port 4173, HTTP tests use 8001/5174 and the test DB.
- `VITE_*` values are public; never put secrets there. Tests use only the separate local `northside_test` database.

## Next steps

1. Complete native 200% zoom and exported report layout acceptance; see the status document.
2. Add future trainer availability through `/trainer`, or explicitly rerun the local preparation command.
3. Prepare deployment separately. No deployment or diagram changes are included in this update.

[Current milestone and verification](docs/implementation-status.md) · [Implementation instructions](AGENTS.md) · [Asset credits](docs/frontend-assets.md)
