# Codex Instructions — Fitness Club Management Information System

Read the root `README.md` before starting. It is the source of truth for scope, constraints, architecture and milestones. This file describes how to implement that plan. Ask the user before resolving material ambiguities or changing an agreed decision.

## Stack and Architecture

- Build a **three-tier modular monolith**: one React frontend, one FastAPI backend and one PostgreSQL database.
- Frontend: **React + TypeScript + Vite**. Introduce the additional libraries listed in README only when their features are needed.
- Backend: **Python + FastAPI + Pydantic v2**, using asynchronous database operations.
- Database: **PostgreSQL + asyncpg**. Write SQL explicitly. **Do not use an ORM**, including SQLAlchemy ORM, Django ORM or Prisma.
- Migrations: use **Alembic with manually written SQL** (`op.execute`), without ORM models or model-driven schema generation. Alembic is for schema migrations only; application queries use `asyncpg`. If the instructor disallows SQLAlchemy even as an Alembic dependency, ask before switching to numbered `.sql` migrations.
- Do not introduce Django, a ready-made CRM, microservices, Next.js, Docker, Redis, Celery, other infrastructure, or a prohibited DBMS without approval.

## Code Organization and Database Rules

- Organize the backend by feature: `auth`, `users`, `trainers`, `memberships`, `schedule`, `bookings`, `cart`, `orders`, `payments`, `notifications`, `reports`.
- Within each module, separate `router.py` (HTTP endpoints), `schemas.py` (Pydantic models), `service.py` (business logic) and `repository.py` (SQL). Keep abstractions minimal.
- Create and close one shared `asyncpg` connection pool in the FastAPI application lifespan.
- Use bound parameters (`$1`, `$2`, etc.) for SQL values. Never interpolate untrusted values with f-strings or concatenation. Allowlist dynamic column names and sort directions.
- Enforce data integrity with appropriate PK/FK, UNIQUE, CHECK and NOT NULL constraints, indexes and transactions. Handle concurrent orders, bookings and approvals correctly. Prevent overlapping active client bookings (`pending`/`approved`) across all of the client's memberships, as well as overlapping trainer slots.
- Check roles and record ownership on the backend. Do not rely on hidden frontend controls for security. Hash passwords securely and keep secrets in environment variables, with a safe `.env.example`.

## Functional Scope

Implement the requirements in `README.md`: three user roles, shopping cart, email, JSON/XML/CSV import and export, Word/Excel/PDF reports, order history, discounts, currency conversion, multilingual UI and analytics. Payment processing is simulated; do not integrate a real bank or charge real funds unless explicitly requested. Do not replace the system with a ready-made CRM. Do not write the coursework report unless requested.

## Working Agreement

1. Before each major milestone, briefly present the proposed steps, affected files and open questions. Do not generate the entire application in one pass.
2. Before PostgreSQL implementation, prepare three graphical materials: the existing Use Case Diagram, a training-booking algorithm flowchart and an ER Diagram. Keep the concise 18-table proposal in `docs/database/schema-proposal.md` and preserve all attributes, indexes, constraints and transaction details in `docs/database/schema-design-details.md`. Wait for schema approval before creating migrations and seed data. Follow the roadmap in README thereafter.
3. Make small, verifiable changes. Preserve existing user work; explain any necessary destructive or breaking change before applying it.
4. Add tests for critical business rules, negative paths, access control and concurrent bookings. Run available tests/checks after changes and report any checks you could not run.
5. Keep README up to date as the project evolves: real setup commands, PostgreSQL configuration, migrations, tests and environment variables. Never commit passwords, tokens or real `.env` files.
6. At the end of each milestone, summarize what changed, what was verified and the next suggested step. Do not deploy or perform external actions without explicit user approval.
7. Preserve `docs/diagrams/old/` unchanged. Reuse the existing Use Case Diagram without redrawing, adding use cases or moving elements; keep additional website requirements in README. If no editable source exists, copy the original image and document that limitation. Save new diagrams in `docs/diagrams/` with editable sources, SVG/PNG exports and brief descriptions. Use Russian diagram labels, English filenames/technical identifiers, and verify actual rendering before claiming success.

**Language:** Write these project instruction files and technical identifiers in English. Communicate with the user in Russian unless asked otherwise. The product UI must support Russian and English.
