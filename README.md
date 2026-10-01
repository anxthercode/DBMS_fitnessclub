# Fitness Club Management Information System

Course project for **Database Management Systems**. The goal is to build a responsive web application for fitness club clients, trainers, and administrators, with a strong emphasis on designing and using **PostgreSQL directly through hand-written SQL, without an ORM**.

> **Project status:** Public frontend and the first client account milestone are implemented on the existing React scaffold, with Russian/English UI and an in-memory mock API. The public site presents a gym floor, cardio zone, aquatics zone and changing-room/shower amenities. The approved dark/turquoise design is applied to all existing public, authentication and client-account routes. The reviewed homepage is now served at `/`; `/design-preview` remains a compatibility route to the same page and shared layout. The client area includes responsive navigation, profile editing and a membership list. Backend, PostgreSQL, migrations, purchasing, bookings and trainer/administrator account areas are not implemented. Database design and coursework graphics are maintained separately; schema approval is still required before migrations or seed data. The coursework report is out of scope.

## 1. Technology Stack

| Area | Technologies | Purpose |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Single web application with role-based interfaces |
| UI and routing | Tailwind CSS, shadcn/ui, React Router | Responsive layout, reusable components, navigation |
| Data and forms | TanStack Query, React Hook Form, Zod | API state, form handling and client-side validation |
| Extras | react-i18next, Recharts | Russian/English UI and analytics charts |
| Backend | Python, FastAPI, Pydantic v2, Uvicorn | REST API, validation and business logic |
| Database access | PostgreSQL, asyncpg | Asynchronous execution of manually written SQL |
| Schema migrations | Alembic | Versioned, manually authored SQL migrations (`op.execute`); no ORM models |
| Reports and data exchange | openpyxl, python-docx, ReportLab, JSON/CSV, defusedxml | Excel/Word/PDF reports and JSON/XML/CSV import/export |
| Testing and quality | pytest, pytest-asyncio, Ruff | API, business-rule and SQL testing; code quality |
| Local development | PostgreSQL, pgAdmin, Python `venv`, npm | No Docker requirement |
| Planned hosting | GitHub, Render (frontend/backend), Neon (PostgreSQL) | Demonstration deployment without managing a VPS |

**Course constraints:** Do not use Microsoft Access, Firebird, SQLite, a ready-made CRM, an ORM, Django or similar prohibited frameworks, or a desktop application. **FastAPI is permitted for this project.** Alembic depends internally on SQLAlchemy, but the application must not use SQLAlchemy ORM. If the instructor interprets the restriction as banning SQLAlchemy entirely, replace Alembic with numbered plain `.sql` migration files after confirmation.

## 2. Architecture

Use a **three-tier client-server architecture with a modular monolith**: one React frontend, one FastAPI backend and one PostgreSQL database. No microservices.

```text
Browser: React (Client / Trainer / Admin)
                ↕ HTTPS / REST / JSON
FastAPI: routers → services → repositories
                ↕ asyncpg / parameterized SQL
             PostgreSQL
```

Backend responsibilities:

- `router.py` — HTTP endpoints and access checks;
- `schemas.py` — Pydantic request/response schemas;
- `service.py` — business rules and workflows;
- `repository.py` — hand-written SQL queries, without an ORM;
- `core/` — configuration, connection pool, authentication and shared dependencies.

Functional modules: `auth`, `users`, `trainers`, `memberships`, `schedule`, `bookings`, `cart`, `orders`, `payments`, `notifications`, `reports`. All authorization and record-ownership checks must be enforced by the backend, not only by the UI.

## 3. Website Features

| Role | Planned features |
| --- | --- |
| Guest | Home page with club zones and amenities, club and trainer information, membership plans, sign-up and sign-in |
| Client | Profile, membership status, shopping cart, checkout, order history, schedule, training requests and cancellations, notifications |
| Trainer | Own schedule, create/edit training slots, review requests, approve/reject bookings, mark completed sessions |
| Administrator | Manage clients, trainers, plans, memberships, orders and payments; resolve problematic requests; manage discounts; import/export data; generate reports and view analytics |

**Core workflow (based on the existing TO-BE BPMN and Use Case diagrams):** a client selects a plan → places an order → receives a membership → selects a training slot → the system validates the membership and availability → the trainer approves or rejects the request → the client is notified. Unanswered or conflicting requests are escalated to the administrator.

### Club concept and v1 scope

FORMA represents a fitness club with several activity areas. The agreed scope (1 October 2026) uses a shared membership and the existing training-booking workflow.

| Area | Public website content | v1 behavior |
| --- | --- | --- |
| Gym floor | Free weights, resistance machines and functional exercise space | Included in every membership; independent exercise or scheduled training |
| Cardio zone | Treadmills, exercise bikes and cross-trainers | Included in every membership; no machine reservations |
| Aquatics zone | Pool, swimming and aqua aerobics | Included in every membership; coached sessions use the common schedule when implemented |
| Amenities | Spacious changing rooms, lockers and showers | Informational content; no separate purchase or reservation |

All membership plans include access to all three zones and the shared amenities. Existing plan duration and individual/group training permissions still apply; physical zone access does not grant extra coached sessions. A coached aquatic session follows the same membership, training-type, capacity and trainer-approval rules as any other session. Independent visits do not create bookings or attendance records in v1; attendance reports cover scheduled sessions only.

**Membership presentation and first visit:** The user selected separate membership cards and retained common zone access. The homepage presents the current 1-, 3- and 12-month plans, full-term prices and permitted coached training formats. It does not add a zone configurator or separate pool charge. Above the cards, a free first guest visit is offered for a new visitor: independent use of the gym, cardio zone and pool, once per person and subject to administrator confirmation; a coached session is not included.

The guest-visit interaction is currently a localized frontend demonstration. It opens an inline name/phone form without requiring an account or active membership, validates the fields, and explicitly states that nothing was sent or booked. Values live only in the open form and are cleared on closing or reloading; there is no API call, browser-storage persistence or notification. Before activating real requests, design their storage and administrator handling, define how first-visit eligibility and one-time redemption are checked, and review that addition alongside the database proposal. This is a separate guest-request flow, not an exception that bypasses membership checks for regular training bookings. The existing 18-table design remains unchanged and still requires approval before implementation.

Keep the public navigation compact. The shared header uses About, Memberships, Coaches and Contact, plus sign-in/account. About and Contact link to homepage sections from every route. The [implemented redesign](docs/frontend-redesign-plan.md) presents facilities as a selectable list, separate membership cards and practical visiting information. Do not add separate zone pages, zone-specific subscriptions, pool-lane reservations, equipment/locker allocation, room occupancy management, a spa/shop catalogue or additional roles to v1. Zone descriptions are localized club content; there is no new zone-management dashboard or database entity. The existing 18-table schema and booking diagrams remain applicable. Any later need for zone entitlements or shared-space capacity requires a separate schema review before implementation.

[Equinox Bond Street](https://www.equinox.com/clubs/new-york/downtown/bondst) is a reference for presenting several club spaces with concise descriptions and strong photography, not a specification to copy. Its page describes fitness floors and group, yoga and cycling studios; it does not list a pool. Aquatics is part of FORMA's fictional coursework concept. Keep FORMA's own branding, copy and local assets.

### Approved visual direction and implemented redesign

The user approved the following replacement brand palette on 1 October 2026: `#0B0C10`, `#1F2833`, `#C5C6C7`, `#66FCF1`, `#45A29E`. It is implemented throughout the existing public, authentication and client-account pages, including shared controls, semantic statuses, local Manrope fonts, browser theme color and favicon.

- Use `#0B0C10` for the main background, `#1F2833` for working surfaces, and `#C5C6C7` for readable text and neutral headings.
- Use `#66FCF1` sparingly for primary actions and focus, with `#0B0C10` button text. Use `#45A29E` for secondary accents on verified dark backgrounds.
- The requested direction is restrained, elegant and structured: factual headings, coherent facility photography, fewer promotional blocks and a clear content hierarchy. Replace the repeated slogans and decorative card-based presentation as part of the redesign.
- Apply the shared system to public pages, authentication and the client account. Preserve semantic success/error indicators, visible keyboard focus, RU/EN and responsive layouts down to 320 px. Avoid autoplay video, animated backgrounds and additional visual libraries.

The [frontend redesign plan](docs/frontend-redesign-plan.md) records research references, homepage and page structure, palette contrast checks, content needs and staged implementation. The user approved the minimal homepage direction, selected separate membership cards, and authorized the first-visit block. The shared-design rollout is complete: the main homepage reuses the reviewed composition, membership cards share a component with the catalogue, coaches use restrained profiles, and authentication uses compact forms. Client-account behavior is preserved.

## 4. Preliminary Database Design

| Domain | Planned tables |
| --- | --- |
| Users | `users`, `trainer_profiles`, `auth_sessions`, `email_verification_tokens` |
| Memberships | `membership_plans`, `memberships`, `membership_issuances` |
| Training | `training_slots`, `bookings` |
| Purchases | `carts`, `cart_items`, `orders`, `order_items`, `payments` |
| Supporting data | `discounts`, `exchange_rates`, `notifications`, `audit_logs` |

The final schema will be agreed upon before implementation. Define attributes and relationships, normalize to **3NF**, and prepare ER, logical and physical database diagrams. Apply `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `NOT NULL`, indexes and views; add database functions/triggers where justified. Use explicit SQL with `JOIN`, grouping and aggregates for reporting.

The 18-table design is described in the [concise schema proposal](docs/database/schema-proposal.md); attributes, indexes, constraints and transaction details are preserved in the [detailed design](docs/database/schema-design-details.md). Before PostgreSQL implementation, prepare three graphical materials: a **Use Case Diagram**, a **training-booking algorithm flowchart**, and an **ER Diagram**. See the [diagram index](docs/diagrams/README.md). A separate [editable Peter Chen diagram](docs/diagrams/diagram_chen.drawio) now presents all entities, relationships and attributes on one connected Chen sheet, without replacing the original ER files. The existing Use Case Diagram is accepted unchanged for this coursework; it does not need to show every additional website feature. Those requirements remain in this README. Preserve previous-coursework originals in `docs/diagrams/old/`.

**Data integrity:** validate memberships for the scheduled training time, prevent duplicate bookings and overlapping active client bookings (`pending`/`approved`), enforce slot capacity and avoid overlapping trainer schedules. Booking and approval operations must be transactional and safe under concurrent requests. Use `NUMERIC` for monetary values and `TIMESTAMPTZ` for timestamps; the club timezone is `Europe/Minsk`. Preserve order and payment history rather than destructively deleting financial records.

## 5. Coursework Requirements Checklist

- [ ] **Database operations:** create, read, update, delete/archive, search, filter and sort records.
- [ ] **Email:** registration verification and booking/order notifications; use an email HTTP API if required by the hosting environment.
- [ ] **Authentication:** client/trainer sign-in and protected administrator access, with role-based permissions.
- [ ] **Shopping cart:** add membership plans, edit cart contents and place orders. Individual/group training is booked through the schedule; no separate service catalogue is included in v1.
- [ ] **Data import/export:** JSON, XML and CSV, with validation before importing into PostgreSQL.
- [ ] **Reports:** generate Word, Excel and PDF documents (e.g., sales, attendance, memberships).
- [ ] **Data protection:** Argon2 password hashing, secure authentication, authorization, parameterized SQL, environment variables and audit logging.
- [ ] **Orders, discounts and currency conversion:** order history/statuses, promo codes and conversions using stored exchange rates. Payments are **simulated for the coursework**; no real bank charges.
- [ ] **Multilingual interface:** Russian and English.
- [ ] **Analytics:** sales, attendance, popular plans and trainer occupancy, calculated using SQL queries.

## 6. Proposed Repository Layout

```text
fitness-club/
├── README.md
├── AGENTS.md
├── frontend/
│   └── src/                  # app, pages, features, components, api, locales
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/             # configuration, security, database
│   │   └── modules/          # feature modules with router/service/repository/schemas
│   ├── alembic/versions/     # manually authored SQL migrations
│   ├── tests/
│   └── .env.example
└── docs/                     # database diagrams, BPMN, Use Case
```

Never commit secrets or real `.env` files. Keep migrations and safe sample data in Git. Provide a separate script/command for creating the initial administrator account.

## 7. Implementation Roadmap

The current agreed milestones bring forward the public pages and basic client account from step 4, using mock data only. The club-zones content and sports-oriented palette refresh also belong to this frontend milestone. They do not require a backend or change the database approval gate. The remaining roadmap is unchanged.

1. **Database design and graphics:** prepare the unchanged existing Use Case Diagram, the training-booking algorithm flowchart and the 18-entity ER Diagram; maintain the concise proposal and detailed design. Obtain schema approval before creating PostgreSQL migrations and seed data.
2. **Backend foundation:** PostgreSQL connection pool with `asyncpg`, authentication and CRUD for core entities.
3. **Core workflows:** memberships, cart/orders, schedule, bookings, trainer review and concurrency-safe transactions.
4. **Frontend:** public pages with the three club zones and shared amenities, and all three role-based dashboards connected to the REST API. Keep zone access common to all plans and use one training schedule.
5. **Additional coursework features:** email, all import/export formats, reports, discounts/currencies, RU/EN and analytics.
6. **Testing and deployment:** successful/failed scenarios, permissions and concurrent booking tests; then deploy to Render + Neon with approval.

## 8. Development and Deployment

### Frontend: local setup

Requirements: **Node.js 22.12+** and npm. The current milestone was checked with Node.js 24.21.0 / npm 11.19.0. PostgreSQL, Python and Docker are not needed to run it.

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Run commands from `frontend/`; `npm ci` can be used for a clean install from the committed lockfile. The dev server uses a strict port and will report an error if 5173 is occupied.

Open `http://127.0.0.1:5173/` to review the redesigned site on desktop or mobile. The old `/design-preview` address renders the same homepage and shared navigation. Its facility selector, visiting-information disclosures, guest-visit demo form, anchor navigation and RU/EN switch are interactive. Membership cards show prices from the existing mock API and preserve the selected plan in the registration URL. Links to plans, coaches and sign-in open the existing pages. Local image sources and font licensing are recorded in [frontend asset credits](docs/frontend-assets.md).

```powershell
npm run typecheck
npm test
npm run build
npm run preview
# Browser tests use the production build, so build first:
npm run test:e2e
```

Preview and browser tests use port 4173. Stop a manually running preview before the tests. Tests use installed Google Chrome by default (desktop 1440px and mobile 390px, plus a 320px check). To use installed Edge in PowerShell, set `$env:PLAYWRIGHT_CHANNEL = "msedge"`. Browser screenshots/traces are written to ignored `test-results/`; unit tests cover form validation, mock authentication, profile ownership and field restrictions, membership status boundaries, safe login redirects and locale dictionary parity.

No `.env` is required: mock mode is the default. `frontend/.env.example` documents:

| Variable | Default / example | Purpose |
| --- | --- | --- |
| `VITE_API_MODE` | `mock` | In-memory data; `http` is reserved for future API integration |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Future API base URL; ignored in mock mode |

Vite exposes `VITE_*` values to browsers; never put secrets in them. The existing HTTP adapter is a preliminary integration boundary, not an implemented backend. Commercial and account data comes through `src/api/`; mock records and club metadata live in `src/api/mock/`. Localized facility, guest-visit and visiting copy lives in `src/features/public/home-content.ts`.

### Implemented public frontend

| Route | Behavior |
| --- | --- |
| `/` | Club introduction, facility selector, shared membership cards, guest-visit demo form, visiting information and contact section |
| `/plans` | Active mock membership plans with shared zone access, full-term BYN prices, selection link to registration |
| `/trainers` | Localized trainer names, specializations, biographies and experience |
| `/login` | Validated sign-in, demo credentials; clients continue to their account |
| `/register` | Validated client registration, password confirmation, duplicate-email feedback; opens the client account |
| `/design-preview` | Compatibility address for the same homepage, with the shared layout and current session controls |
| Other paths | Localized 404 page with a working home link |

The shared layout includes active navigation, a keyboard-accessible mobile menu, footer, skip link, route titles and RU/EN switching. Only the language preference is saved in local storage. User data, demo passwords and session state exist in memory and reset on page refresh. No verification emails are sent. Use fictional data and a test password.

Use **`client@forma.demo` / `Forma2026!`** or the fill-demo-details button on the sign-in page. Registration immediately opens a demo session. Clients continue to `/account/memberships` or to the account page requested before sign-in; logout is available in the header/mobile menu. A selected plan stays in the URL while switching between the auth forms; this does not create a cart item, order or membership.

All existing routes use shared dark/turquoise tokens in `src/styles.css`, local Manrope fonts and consistent form, focus and status styles. Homepage content and facility/guest interactions live in `features/public/`; `features/memberships/PlanCards.tsx` is shared by the homepage and catalogue. The guest form loads only when opened. Licensed concept photography supplements the existing gym photograph; no database tables are introduced. React Router renders the routes; TanStack Query manages mock requests; React Hook Form + Zod handle validation; react-i18next translates the UI. Auth and client-account screens are loaded separately.

Earlier scaffold files and unused adapters are preserved, including `AboutPage.tsx` and the broader mock workflow API. They are not exposed as completed features. Schedule, cart, checkout, payments, trainer/administrator dashboards, reports and database access are not implemented. No files under `docs/diagrams/old/` are changed.

### Implemented client account

| Route | Behavior |
| --- | --- |
| `/account` | Redirects to the membership list |
| `/account/memberships` | Own memberships, dates, included training types, status and all/current/history filters |
| `/account/profile` | Edit first/last name, optional phone and language; save/discard, validation and save feedback |

The account uses the existing public header/footer and a dedicated sidebar (two navigation tabs on mobile). Guests are redirected to sign-in with an allowlisted return path; trainers and administrators see an access message rather than client data. This frontend guard is a UI boundary only; real authorization must be enforced by the future backend. The mock API checks authentication and membership ownership and only updates allowlisted profile fields. Email, role and verification status are read-only. No real email verification is provided.

Private query keys include the client ID. Account queries are cancelled and removed on logout or sign-in, and delayed profile responses cannot restore a logged-out session. Profile changes persist within the current mock instance, including after logout/login, but reset on refresh. Saving the profile language also switches the interface; the header language switch changes the browser preference independently.

The demo client has active, upcoming, expired and cancelled membership examples. New registrations have an empty list with a link to plans. Status uses `[starts_at, ends_at)` boundaries with cancellation taking precedence; displayed dates include the year/time in `Europe/Minsk`. Statuses refresh at the next boundary and when the tab visibility changes. The membership list is read-only: it does not purchase, renew, cancel or activate memberships.

Next suggested milestone: review and approve the database schema and graphics, then prepare the backend foundation and real authentication. Further mock workflows (cart/orders or schedule/bookings) require a separately agreed milestone.

### Shared-design verification

The completed rollout passed TypeScript, the production build, 37 unit tests and 31 browser tests (one expected desktop skip). Responsive checks cover 320, 390, 720, 768 and 1440 CSS pixels. See [verification details and limitations](docs/frontend-verification.md), including the 200% reflow proxy and native-zoom limitation.

### Planned deployment

Develop locally with PostgreSQL, FastAPI/Uvicorn and Vite. Once the application is ready, publish it from GitHub: the React static build to Render Static Site, the single FastAPI backend to Render Web Service, and PostgreSQL to Neon. Set connection strings and secrets in hosting environment variables. **Docker is optional, not required.** Recheck free-tier limits before deployment. Generate downloadable reports on demand instead of relying on persistent local disk storage on the host.
