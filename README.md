# Fitness Club Management Information System

Course project for **Database Management Systems**. The goal is to build a responsive web application for fitness club clients, trainers, and administrators, with a strong emphasis on designing and using **PostgreSQL directly through hand-written SQL, without an ORM**.

> **Project status — 3 October 2026:** **Frontend Stages 1–2 are complete.** Public pages, authentication, profile editing, configured memberships/single visits, cart, immutable orders, simulated payment/retry and purchased access work through the in-memory mock API in RU/EN. Membership dates may overlap only for disjoint zones, as approved below. The next milestone is **Stage 3: account overview and schedule/bookings**. Trainer/admin interfaces follow later. Schema approval remains mandatory before migrations or seed data. The coursework report is out of scope.

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
| Guest | Club spaces and amenities, trainers, configurable membership/single-visit offers, public schedule, first-visit information, sign-up and sign-in |
| Client | Account overview, profile, memberships and single-visit passes, shopping cart, simulated checkout, order history, schedule, training requests/cancellations and notifications |
| Trainer | Own schedule, create/edit training slots, review requests, approve/reject bookings, mark completed sessions |
| Administrator | Manage clients, trainers, plans, memberships, orders and payments; resolve problematic requests; manage discounts; import/export data; generate reports and view analytics |

**Purchase workflow:** select a format, zones and date/term → cart → order and simulated payment → purchased access appears in the client account. **Coached training workflow:** select a slot → validate membership, required zone, training permissions and availability → submit a request → trainer approval/rejection → notify the client. Unanswered or conflicting requests are escalated to the administrator.

### Club access and product rules

FORMA has a gym floor, cardio area, pool and shared changing rooms, lockers and showers. The following rules replace the earlier all-zones-only membership model.

| Choice | Options and behavior |
| --- | --- |
| Format | Membership or single visit; RU label `Разовое посещение`, EN label `Single visit` |
| Zones, for either format | Gym + cardio, pool only, or both; at least one selection is required |
| Membership term | 1, 3 or 12 months; show the full-term payment clearly, with any monthly equivalent as secondary information |
| Date | Membership start date or the selected single-visit date, using `Europe/Minsk` |
| Amenities | Changing rooms, lockers and showers included with every option; no separate fee |
| Price | A catalogue price for each zone combination and term/format; update the visible total immediately when selection changes |

Gym and cardio form one purchasable option. A combined gym/pool package may have its own price rather than the sum of two separate packages. Prices discussed in examples are illustrative, not approved commercial rates; use clearly identified demo fixtures until amounts are agreed. The future backend must validate selections, calculate prices and preserve purchased zones, terms, discounts and monetary values in order history. Later catalogue changes must not alter an existing purchase.

**Approved on 3 October 2026 — membership overlap:** one client's non-cancelled membership periods may overlap only when their purchased zones are disjoint. Gym + cardio is one zone; pool is the other. A combined membership conflicts with either zone. Use half-open intervals `[starts_at, ends_at)` so adjacent periods are allowed. Apply this rule to existing access and all membership items in a purchase, and recheck before successful payment. Keep the selected start date; do not silently move or automatically renew a period. Single visits do not extend memberships. This supersedes the older all-membership overlap prohibition; physical database documents must be reconciled during the later schema review.

**Single visit:** one admission on the selected date during club opening hours. The client may use all purchased zones during that visit; leaving the club ends the visit and does not permit re-entry with the same pass. Record redemption on first admission, not on purchase. Date validation alone cannot enforce this rule: future redemption must be atomic and reject a second use. In the frontend milestone, show unused, used, expired and cancelled demo passes; actual reception/access-control integration comes later. Do not introduce a client button that claims to verify physical admission. Unused passes expire when their valid date ends. A full check-in/check-out or occupancy system is outside this milestone.

**Coached sessions:** zone access allows independent exercise, not automatic access to personal or group training. Existing membership training-format permissions still apply; a booking must also match the purchased zone and be valid at the session time. Pool coaching uses the same schedule and trainer-approval workflow. A single-visit pass does not by itself qualify for coached bookings. Do not add lane/machine/locker reservations, separate zone pages, a spa/shop catalogue or extra roles. Attendance reports continue to describe scheduled sessions unless independent-visit reporting is separately specified.

**Free first guest visit:** retain a separate offer for one independent gym/cardio/pool visit per new visitor, subject to administrator confirmation; no coached session or repeat admission. It must be visually distinct from a paid single visit. The current localized name/phone form is a demonstration: no request is sent, and values disappear on close/reload. Real request storage, eligibility checks, administrator handling and redemption require design before activation; the offer cannot bypass regular training-booking checks.

### Visual direction and reference patterns

Preserve FORMA's minimal identity and local Manrope font while making the site brighter, more descriptive and interactive. Keep the approved palette: `#0B0C10` background, `#1F2833` working surfaces, `#C5C6C7` readable text/neutral surfaces, `#66FCF1` primary actions/focus, and `#45A29E` secondary accents. Use dark text on light/turquoise surfaces and verify contrast. Vary slate surfaces, image proportions and natural photographic color; avoid large uninterrupted black areas, repeated promotional cards and excessive empty space.

Design references reviewed on 2 October 2026:

| Reference | Apply to FORMA |
| --- | --- |
| [1Rebel clubs](https://www.1rebel.com/en-gb/clubs) | Compact filter pills, clear selected states, a facility selector that changes an adjacent large photo and description, concise contextual actions |
| [Gymbox memberships](https://gymbox.com/memberships/) | Clear offer comparison, manual carousels with arrows/progress, explicit purchase conditions and a visible selection summary |
| Supplied Gymbox trial-form screenshots | Short labelled steps and a contrasting summary panel beside the form; retain only necessary fields instead of copying demographic/postcode questions |
| Supplied interactive concept screenshots | Gym/pool/cardio/amenity tabs, one large image, a useful description and contextual action; these are concept images, not evidence of an existing club website |

Borrow interaction patterns, not branding, photographs, copy, yellow accents, billing rules or extra services. Earlier research, contrast calculations and the completed rollout are recorded in [frontend redesign history](docs/frontend-redesign-plan.md). **This README supersedes that document's old all-zone rules, page structure and implementation sequence.**

- **Homepage sequence:** introduction → Spaces at FORMA → coaches → membership/single-visit selection → separate free-first-visit offer → FAQ → contacts. Keep the offer close enough to FAQ to avoid a large empty gap.
- **Spaces:** consolidate the repeated activity grid and gallery into one compact selector for gym, cardio, pool and changing rooms. Each selection shows a coherent photograph, two or three useful sentences, relevant activities and a link to visit options or available sessions. Retain strength, functional, cardio and aquatic content without duplicating it in another long gallery. Cardio and changing-room tabs are informational, not additional paid products.
- **Photography:** use a small consistent set with brighter lighting and natural color. Replace weak/duplicate images rather than extending the carousel. Keep local optimized assets, image dimensions, alt text and source/license records in [asset credits](docs/frontend-assets.md). One shared note covers concept imagery and fictional coaches on the homepage; standalone pages carry an appropriate note. Do not invent facilities, pool specifications or contact details.
- **Motion:** section fade-ins of 400–600 ms, image hover `scale(1.03)`, smooth button fill and arrow movement, animated FAQ opening/closing, and approximately 250–350 ms transitions between selected photos. Keep the photo area stable to avoid layout jumps. Use existing native/CSS mechanisms; respect reduced motion and keyboard focus. No autoplay, scroll interception, animated backgrounds or extra animation library.
- **Gallery controls:** where multiple images are useful, use manual arrows, a counter/progress indicator and touch swiping. Remove persistent instructional paragraphs; retain accessible control labels and screen-reader help. Do not stack nested carousels.
- **Offer composition:** use a segmented Membership / Single visit switch. Under Membership retain three clear term cards; in either format show selectable gym/cardio and pool cards with explicit selection marks. Show the date, inclusions, exclusions and updated full price beside a light neutral summary panel. The mobile summary may sit near the bottom action but must not cover fields, focus or errors.
- **Forms and checkout:** use a short progression from selection to order review and simulated payment. Keep visible labels, inline errors, back navigation and the selected product through sign-in/registration. Do not show a successful booking/payment before its mock operation succeeds.
- **Navigation and coaches:** retain working cross-route About/Contact anchors and compact navigation; expose Schedule and Cart when their workflows work. Share trainer profiles between home and `/trainers`; connect each trainer to a filtered schedule. Keep profile descriptions, specialization and experience useful and concise.
- **Client account:** use the same palette with a denser working layout, clear statuses and actions rather than marketing hero sections. All public and private screens support RU/EN, keyboard use and responsive layouts down to 320 px.

## 4. Preliminary Database Design

| Domain | Planned tables |
| --- | --- |
| Users | `users`, `trainer_profiles`, `auth_sessions`, `email_verification_tokens` |
| Memberships | `membership_plans`, `memberships`, `membership_issuances` |
| Training | `training_slots`, `bookings` |
| Purchases | `carts`, `cart_items`, `orders`, `order_items`, `payments` |
| Supporting data | `discounts`, `exchange_rates`, `notifications`, `audit_logs` |

The table list is the **existing 18-table baseline, not a final schema for the expanded products**. Before PostgreSQL, review how to represent zone entitlements, catalogue combinations/prices, single-visit validity/redemption, purchased-condition snapshots and first-visit requests. Revisit membership renewal/overlap rules when zone sets differ; do not silently change existing rules or promise an unchanged table count. Resolve those decisions before implementing affected renewal behavior. Maintain the [concise schema proposal](docs/database/schema-proposal.md) and preserve attributes, indexes, constraints and transactions in the [detailed design](docs/database/schema-design-details.md); these documents have not yet been updated for the new products.

The existing **Use Case Diagram**, **trainer-booking algorithm** and **conceptual Chen ER diagram** are retained in `docs/diagrams/` as `use-case-diagram.png`, `fitness_club_algorithm.drawio`/`.png` and `fitness_club_chen.drawio`/`.png`. The simplified Chen diagram is a conceptual view, not an exhaustive one-entity-per-table physical schema. Keep all existing diagrams and `docs/diagrams/old/` unchanged; do not redraw them or add use cases as part of this frontend work. Additional website requirements belong here and physical details belong in the database documents. If a later verified inconsistency requires a diagram change, explain it before requesting a separate decision.

Obtain schema approval before migrations or seed data. Normalize the physical design to **3NF**; apply `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `NOT NULL`, indexes and views, with database functions/triggers where justified. Use explicit SQL with `JOIN`, grouping and aggregates for reporting.

**Data integrity:** validate memberships for the scheduled training time, prevent duplicate bookings and overlapping active client bookings (`pending`/`approved`), enforce slot capacity and avoid overlapping trainer schedules. Booking and approval operations must be transactional and safe under concurrent requests. Use `NUMERIC` for monetary values and `TIMESTAMPTZ` for timestamps; the club timezone is `Europe/Minsk`. Preserve order and payment history rather than destructively deleting financial records.

## 5. Coursework Requirements Checklist

- [ ] **Database operations:** create, read, update, delete/archive, search, filter and sort records.
- [ ] **Email:** registration verification and booking/order notifications; use an email HTTP API if required by the hosting environment.
- [ ] **Authentication:** client/trainer sign-in and protected administrator access, with role-based permissions.
- [ ] **Shopping cart:** add configured memberships and single visits, edit selections and place orders. Individual/group training is booked through the schedule; no separate coached-service shop is included in v1.
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

### Frontend completion: four stages

Complete the **public website and full client account on the mock API first**. Refactor existing components and routes incrementally; keep shared controls, localized copy and typed API boundaries rather than rebuilding the application or creating a second design-preview implementation. Trainer/admin dashboards, real email, production authentication and physical access control are later milestones. Before each stage, state its files, planned changes and unresolved decisions; finish with checks and a reviewable result.

#### Stage 1 — Public presentation and shared components

**Completed on 2 October 2026.** Verified in RU/EN on desktop and mobile; see [Stage 1 verification](docs/frontend-verification.md#stage-1--public-presentation-and-shared-components).

- Implement the visual direction above: brighter image selection, consolidated space tabs, concise activity descriptions, shared coach profiles, shorter section gaps, accessible transitions and FAQ.
- Apply the shared design to home, plans, trainers, authentication and existing account screens. Refactor duplicated cards, buttons, disclosures and spacing; preserve existing behavior until the replacement workflow works.
- Prepare the Membership / Single visit composition and separate free-first-visit block with accurate conditions. Keep draft choices clearly non-purchasable until Stage 2; do not add dead navigation links.
- **Primary files:** `frontend/src/features/public/`, `features/memberships/`, `features/trainers/`, shared components/layouts, `src/styles.css`, localized content and local assets; update asset credits when assets change.
- **Exit check:** review public pages in RU/EN on desktop/mobile; verify tabs, anchors, photo controls, keyboard/reduced-motion behavior and no repeated gallery or misleading claims.

#### Stage 2 — Configurable access, cart and simulated purchase

**Completed on 3 October 2026.** See the current verification record in [frontend verification](docs/frontend-verification.md#stage-2--configured-access-cart-and-simulated-purchase).

- Implement both formats, zone selection, membership terms, dates and catalogue prices through typed mock API operations. Validate missing zones, invalid dates, unavailable offers and changed prices before checkout.
- Complete cart editing/removal, sign-in return with selection preserved, order review, promo-code validation, currency display using demo exchange-rate fixtures, and simulated payment success/failure/retry. Show currency, full payment amount and any conversion clearly; currency selection must not silently change an existing order's recorded values.
- Create an order before simulated payment; issue the membership/pass only after payment succeeds. Preserve failed payment attempts for order details and retry; repeated submissions must not issue duplicate access. Keep purchased conditions stable when catalogue fixtures change.
- Add purchased-access details, zone badges, dates, statuses and unused/used/expired/cancelled single-visit examples. Clearly separate payment status, access validity and physical admission.
- **Primary files:** membership/product features, new cart/checkout/order pages, account access views, `src/api/` types and mock operations, route configuration and locales.
- **Exit check:** complete membership and single-visit purchases, including pool-only and combined access; verify totals, promo failure, payment retry, empty cart, sign-in recovery and consistent account/order updates.

#### Stage 3 — Full client account and schedule

- Replace the `/account` redirect with an overview: current/upcoming access, nearest booking, recent orders/notifications and relevant actions.
- Complete memberships/passes, profile, order list/details and repeat purchase/renewal entry points that return to the configurator. Preserve safe profile fields, save/discard behavior and existing account ownership boundaries. Resolve differing-zone renewal rules before enabling that branch.
- Add a public schedule with date, trainer and training-format filters, available places and a trainer-profile link into the filtered schedule. Explain when access/training permissions are missing and preserve the selected slot through sign-in.
- Implement client booking creation, own-booking lists and details, pending/approved/rejected/cancelled/completed states and permitted cancellations. Validate membership at the session time, zone/training permissions, slot availability and overlapping pending/approved bookings across all client memberships.
- Add notification list, read/unread states and links to the related booking/order. Provide explicit demo states for email verification, password recovery and expired sessions; do not claim emails were sent or real authentication was secured.
- Use mock fixtures/scenarios to demonstrate trainer decisions, full slots and expired/used access without building trainer/admin dashboards in this milestone. Mutations must update relevant lists, details, counters and notifications consistently.
- **Primary files:** account overview/navigation, schedule, booking, order, notification and auth features; shared status/empty/error components; API contracts/mocks and locales.
- **Exit check:** walk a new and returning client through purchase → eligible slot → pending request → simulated decision → notification → allowed cancellation, plus missing-access, overlap, full-slot and session-expiry paths.

#### Stage 4 — Integration, accessibility and frontend acceptance

- Finish loading, empty, error/retry, disabled, pending and success states throughout the public/client journeys. Preserve selections on recoverable errors and prevent duplicate submissions.
- Review all routes together: RU/EN copy, dates/currencies, mobile navigation, keyboard and focus restoration, screen-reader labels, contrast, 200% zoom/reflow and reduced motion. Check at 320, 390, 768 and 1440 CSS pixels; use additional widths where layout needs them.
- Optimize local photos and lazy loading, avoid layout shifts and unnecessary dependencies, remove genuinely unused frontend code/assets after checking references, and keep the build free of new errors. Do not delete diagrams or unrelated documents during frontend cleanup.
- Run typecheck, unit tests for critical business rules and negative paths, production build and browser tests for the complete client journeys. Verify payment retry, single-use pass semantics in the mock model, permissions, booking overlap and time boundaries; backend concurrency guarantees remain a later responsibility.
- Update README's implemented routes, mock limitations and setup commands, plus [verification records](docs/frontend-verification.md). Review the completed public/client interface before starting database/backend work.
- **Exit check:** all agreed public/client actions work coherently with demo data, no dead links or unexplained placeholders remain, checks pass and unresolved content/product decisions are listed explicitly. This completes the frontend milestone, not production security, real email delivery or database integration.

**Mock contract:** commercial/account data flows through `src/api/`, not disconnected per-page fixtures. Preserve the in-memory reset-on-refresh behavior unless separately changed; disclose it in demo mode. Provide deterministic scenarios for success and failure. Only locale is currently persisted. Never store real credentials or claim mock validation provides production authorization.

### After frontend acceptance

1. **Database design review:** reconcile the existing proposal/details with configured zones, single-use passes, first-visit requests and renewal rules. Preserve the existing graphical materials and obtain schema approval before migrations/seeds.
2. **Backend and integration:** build the `asyncpg` pool, real authentication/authorization, SQL repositories and transactional purchase/booking/redemption workflows; connect the completed client UI to the REST API and test concurrency and record ownership.
3. **Trainer/admin and coursework features:** build those role interfaces, email delivery, JSON/XML/CSV exchange, Word/Excel/PDF reports, discount/exchange-rate administration and SQL analytics. RU/EN remains mandatory throughout.
4. **System verification and deployment:** verify complete success/failure/permission/concurrency scenarios, then deploy to Render + Neon only with approval.

## 8. Development and Deployment

### Frontend: local setup

Requirements: **Node.js 22.12+** and npm. The current milestone was checked with Node.js 24.21.0 / npm 11.19.0. PostgreSQL, Python and Docker are not needed to run it.

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Run commands from `frontend/`; `npm ci` can be used for a clean install from the committed lockfile. The dev server uses a strict port and will report an error if 5173 is occupied.

The compatibility address `/design-preview` renders the same homepage as `/`. Space tabs share selection with circular photo arrows and touch swiping; 64px arrows sit inside the photo edges (52px on narrow screens). FAQ, the separate guest-visit demo form, anchors and the RU/EN switch are interactive. Home and `/plans` share a working format/zone/term/date configurator. Added selections remain in the in-memory cart through navigation and sign-in/registration. A page reload resets the demo. See [asset credits](docs/frontend-assets.md) for image sources and font licensing.

```powershell
npm run typecheck
npm test
npm run build
npm run preview
# Browser tests use the production build, so build first:
npm run test:e2e
```

Preview and browser tests use port 4173. Stop a manually running preview before the tests. Tests use installed Google Chrome by default (desktop 1440px and mobile 390px, with additional 320/720/768px checks). To use installed Edge in PowerShell, set `$env:PLAYWRIGHT_CHANNEL = "msedge"`. Browser screenshots/traces are written to ignored `test-results/`; unit tests cover form validation, mock authentication, profile ownership and field restrictions, membership status boundaries, safe login redirects and locale dictionary parity, including the home and offer dictionaries. Browser coverage includes price previews, invalid zones/dates, keyboard tabs, photo controls, touch swipes, reduced motion, anchors and existing account workflows.

No `.env` is required: mock mode is the default. Demo prices originate in `frontend/src/api/mock/access-offers.ts`; `api.offers()` exposes the versioned catalogue in `mock/commerce.ts`. Configured products, cart versions, order snapshots, payment attempts and issued access use `commerce-types.ts`, `commerce-rules.ts` and `mock/commerce.ts`. `frontend/.env.example` documents:

| Variable | Default / example | Purpose |
| --- | --- | --- |
| `VITE_API_MODE` | `mock` | In-memory data; `http` is reserved for future API integration |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Future API base URL; ignored in mock mode |

Vite exposes `VITE_*` values to browsers; never put secrets in them. The existing HTTP adapter is a preliminary integration boundary, not an implemented backend. Commercial and account data comes through `src/api/`; mock records and club metadata live in `src/api/mock/`. Localized facility, guest-visit and visiting copy lives in `src/features/public/home-content.ts`.

### Implemented public frontend

Stages 1–2 share the approved design. Historical membership fixtures retain both-zone access; new purchases record their selected zones, dates, full prices and training permissions.

| Route | Behavior |
| --- | --- |
| `/` | Photo introduction, four space tabs with shared photo controls, three coach profiles, membership/single-visit configurator, separate free-first-visit demo, animated FAQ and contacts |
| `/plans` | Shared format/zone/term/date configurator with full BYN prices; `?edit=<item-id>` edits a cart item |
| `/cart` | Edit/remove configured items, apply FORMA10, choose BYN/USD/EUR, sign in and create an order |
| `/trainers` | Three fictional trainer profiles with concept portraits, localized names, specializations, biographies and experience |
| `/login` | Validated sign-in, demo credentials; clients continue to their account |
| `/register` | Validated client registration, password confirmation, duplicate-email feedback; opens the client account |
| `/design-preview` | Compatibility address for the same homepage, with the shared layout and current session controls |
| Other paths | Localized 404 page with a working home link |

The shared layout includes active navigation, a keyboard-accessible mobile menu, footer, skip link, route titles and RU/EN switching. Only the language preference is saved in local storage. User data, demo passwords and session state exist in memory and reset on page refresh. No verification emails are sent. Use fictional data and a test password.

Use **`client@forma.demo` / `Forma2026!`** or the fill-demo-details button on the sign-in page. Registration immediately opens a demo session. Clients continue to `/account/memberships`, the requested account page or `/cart`; logout is available in the header/mobile menu. Guest cart items are claimed by the signed-in client without losing dates or zones. Legacy `?plan=` authentication links still display their old plan summary; only the configurator adds an actual cart item.

Shared tokens, page spacing and selection pills live in `src/styles.css`; public interactions in `features/public/`; `OfferPreview` and trainer profiles are shared between home and their catalogues. FAQ uses `components/ui/disclosure`. Images/fonts are local; the hero has loading priority and lower images load lazily. Photos transition in 300 ms within a fixed area, with reduced-motion support. Auth/account screens and the guest form load separately. `dist/` and `test-results/` are ignored, regenerable outputs. Schedule and backend behavior remain unimplemented; the HTTP commerce paths are provisional contracts for later integration.

### Implemented client account

| Route | Behavior |
| --- | --- |
| `/account` | Redirects to the membership list |
| `/account/memberships` | Own memberships with zone badges, dates, permissions, filters and detail links; single-visit status examples |
| `/account/orders` | Own order list and payment state |
| `/account/orders/:id` | Immutable order review, demo success/failure/retry, attempt history, cancellation before payment and issued-access links |
| `/account/access/:id` | Owned membership/pass zones, validity, purchased conditions, status and linked order |
| `/account/profile` | Edit first/last name, optional phone and language; save/discard, validation and save feedback |

The account uses the existing public header/footer and a dedicated sidebar (three navigation links on mobile). Guests are redirected to sign-in with an allowlisted return path; trainers and administrators see an access message rather than client data. This frontend guard is a UI boundary only; real authorization must be enforced by the future backend. The mock API checks authentication, client roles and cart/order/access ownership and only updates allowlisted profile fields. Email and role are read-only. Unverified clients can explicitly simulate email verification in the cart; no email is sent.

Private query keys include the client ID. Account queries are cancelled and removed on logout or sign-in, and delayed profile responses cannot restore a logged-out session. Profile changes persist within the current mock instance, including after logout/login, but reset on refresh. Saving the profile language also switches the interface; the header language switch changes the browser preference independently.

The demo client has active, upcoming, expired and cancelled membership examples. New registrations have an empty list with a link to plans. Status uses `[starts_at, ends_at)` boundaries with cancellation taking precedence; displayed dates include the year/time in `Europe/Minsk`. Statuses refresh at the next boundary and when the tab visibility changes. The membership list links to access details. Purchases are issued by successful simulated payment; there is no client redemption, renewal or membership-cancellation control.

### Stage 2 purchase behavior

- The cart is editable until checkout. Each line represents one configured membership or pass; separate lines may use different dates/zones. At most 12 lines can be checked out. Guest items merge into an existing client cart on sign-in; if the merged cart exceeds the limit, remove items before checkout (nothing is silently discarded).
- Dates use Minsk midnight and calendar months with month-end clamping. Show end dates as exclusive. Reject past/invalid dates, missing zones, inactive offers and overlapping membership zones, including conflicts within the cart and with existing access. Recheck dates and overlap at payment to prevent conflicting pending orders from both issuing access. Do not move selected dates automatically.
- Catalogue revisions and expected prices protect against stale selections. Changed cart prices require an explicit update/review. Demo promo `FORMA10` gives 10%; invalid codes block checkout. Fixed illustrative rates are USD = 3.25 BYN and EUR = 3.60 BYN; currency conversion rounds to minor units. Display the rate/date, BYN base and full payment total.
- Creating an order clears its cart items but does not issue access. The order snapshots products, zones, dates, training permissions, original prices, discount, currency, rate and totals. Later catalogue edits do not affect it. Payment can succeed or decline, with visible attempts and retry; duplicate requests do not duplicate orders, attempts or issued access. A pending order can be cancelled; a paid one cannot be paid or cancelled again through this flow.
- A paid membership appears in the existing membership list. A single visit is unused until reception records entry (only read-only examples exist now). Demo client passes illustrate unused, used, expired and cancelled states. Buying a pass never marks physical admission.
- Mock mutations execute atomically within one browser tab and private requests capture their caller. This demonstrates the contract, not real multi-process concurrency or backend authorization; PostgreSQL transactions, durable idempotency, real verification and atomic redemption remain future work.

**Next step:** Stage 3 of the frontend roadmap: account overview, schedule, training requests and notifications. Stages 3–4 complete the remaining frontend workflows before database/backend work.

### Shared-design verification

Stage 2 passed TypeScript, the production build and 55 unit tests. Browser coverage totals 50 passing cases and two expected desktop skips, including corrected account tests rerun separately. It covers cart editing, login/registration recovery, promo/currency totals, payment failure/retry, zone overlap and issued access on desktop/mobile. See [the Stage 2 verification record](docs/frontend-verification.md#stage-2--configured-access-cart-and-simulated-purchase) for execution details and limitations.

Stage 1 passed TypeScript, the production build, 37 unit tests and 42 browser tests (two expected desktop skips). Responsive checks covered 320, 390, 720, 768 and 1440 CSS pixels. Public/account pages, the pool tab and the offer's error states were visually reviewed from browser screenshots. See [verification details and limitations](docs/frontend-verification.md), including the 200% reflow proxy and native-zoom limitation. The build retains two non-blocking Zod/Rollup annotation warnings.

### Planned deployment

Develop locally with PostgreSQL, FastAPI/Uvicorn and Vite. Once the application is ready, publish it from GitHub: the React static build to Render Static Site, the single FastAPI backend to Render Web Service, and PostgreSQL to Neon. Set connection strings and secrets in hosting environment variables. **Docker is optional, not required.** Recheck free-tier limits before deployment. Generate downloadable reports on demand instead of relying on persistent local disk storage on the host.
