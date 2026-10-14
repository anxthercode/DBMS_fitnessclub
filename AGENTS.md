# Project instructions

Read `README.md` first and the relevant rules in `docs/project-specification.md`. Ask before changing an agreed decision or resolving material product ambiguity.

## Implementation

- Use React/TypeScript/Vite, FastAPI/Pydantic v2 and PostgreSQL/asyncpg as one three-tier modular monolith. No ORM, Django, CRM, Next.js, microservices, alternative DBMS or new infrastructure (including Docker/Redis/Celery) without approval.
- Alembic executes manual SQL via `op.execute`; SQLAlchemy is only its migration dependency. Ask before replacing Alembic if that dependency is disallowed. Add optional libraries only when needed.
- Backend features: auth, users, trainers, memberships, schedule, bookings, cart, orders, payments, notifications, reports. Separate router, schemas, service and repository; keep abstractions small.
- Share one asyncpg pool through the application lifespan. Bind SQL values; allowlist dynamic identifiers and sort directions.
- Enforce PK/FK, UNIQUE, CHECK, NOT NULL and indexes. Use transactions for concurrent purchases, approvals, redemption and booking; prevent overlapping trainer slots and active client bookings across all memberships.
- Enforce roles and ownership server-side, hash passwords securely (Argon2), and keep secrets in ignored environment files with safe examples. Preserve audit and financial history.
- Implement the simplified coursework scope in the specification: three roles, cart, simulated payments, in-app notifications, discounts/currencies, RU/EN and limited exchange/reports/SQL analytics. Email delivery/verification/recovery is deferred. No real charges or coursework report unless requested.

## Working agreement

- Before each major milestone, state steps, affected files and open questions. Make small, verifiable changes and preserve user work; explain destructive or breaking changes first.
- On 11 October the user delegated product decisions and authorized scope simplification: follow the README's selected minimum and revised P1–P5; no further policy approval is pending for that scope. Keep both schema documents current and preserve their historical 18-table baseline.
- Keep every existing diagram and `docs/diagrams/old/` unchanged, including the original Use Case. New diagrams require a separate request, Russian labels, English filenames, editable sources and verified image exports.
- Test critical rules, failure paths, access control and concurrency as implemented. Run relevant checks and report unverified limitations.
- Keep README concise with actual status/setup; place detailed requirements in the specification. Never commit credentials. End milestones with changes, verification and next step. No deployment or external actions without authorization.
- Communicate in Russian; write project instructions and identifiers in English. Product UI supports Russian and English.
