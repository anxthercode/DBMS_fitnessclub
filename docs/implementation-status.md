# Implementation status — audit of 14 October 2026

## Current status after the training/visit UI follow-up

The main code for all four requested stages exists, but the release is **not fully accepted**.

| Stage | Current status |
| --- | --- |
| Email-independent registration/purchases | Implemented; no mail or verification gate in the tested registration/payment flow. Verification/recovery endpoints disabled; addresses remain unverified. |
| Admin, first visits, passes | Implemented; authorization and concurrent redemption covered by server tests. First-visit review, confirmation and entry now pass browser checks. Main-database setup and paid-pass browser coverage remain. |
| Paid training, schedule, trainer workspace | Mixed checkout, paid units, scheduling, booking, decisions and attendance implemented. Full browser purchase/approval/cancellation/credit-return flow passed. In-place training zone editing and purchase-specific success screens are complete. Staff profile/notifications remain. |
| Reports, exchange, acceptance | JSON/XML/CSV exchange, DOCX/XLSX/PDF sales reports and four SQL summaries implemented. Downloads and JSON roundtrip passed in the browser. Final checks, export layout review and documentation remain. |

### Runtime and verification

- At the start of the audit no local site/API responded on 5173/8000 or 5174/8001. Checks started isolated test servers, which stopped afterward.
- Main database: migration `0005_personal_training`, **30 application tables** excluding Alembic; zero users, trainer profiles, training slots and first-visit requests; two training offers. No administrator exists there yet. Browser accounts exist only in `northside_test`.
- Frontend still defaults to mock unless `VITE_API_MODE=http`; new staff/training functions require HTTP mode.
- Backend: **31 tests passed**. Frontend: **80 unit tests**, typecheck and build passed. HTTP/PostgreSQL Playwright: **6 passed**, including training zone editing and first-visit review. The final entry-status correction also passed a targeted rerun.
- Full mock browser suite: initially 88 passed, 4 failed, 2 intentionally skipped. Two failures were caused by overlapping runs sharing the artifact directory; both passed on isolated rerun. **Two rapid-payment checks remain failing**, on desktop/mobile.
- Those payment tests stop at the disabled-control assertion after freezing browser time. Duplicate issuance is not established; server idempotency tests pass. Diagnose the clock/UI update interaction before claiming acceptance.
- Ruff: 3 errors (blocking subprocess in `tests/prepare_browser.py`, two long lines in `tests/test_reports.py`); formatting check flags 4 files.
- New cart/review screens passed axe checks in RU/EN, turquoise/orange themes and 320 px layouts. Keyboard focus returns after edit cancellation and closing review; current screenshots are under `.local/training-visit-review/final-http/`. Staff screenshots were inspected in Russian on desktop and English admin at 320 px. HTTP samples/screenshots are under `.local/audit-2026-10-14/http/`; isolated English accessibility/reflow results are under `.local/audit-2026-10-14/acceptance-recheck/`.

### Concrete remaining work

1. **Staff profile and notifications.** Their existing pages are under `ClientGuard`, with no staff equivalents. The API supports profile updates and creates trainer notifications, but trainers cannot use them through the site. Admin editing of a trainer profile also omits first/last name.
2. **Final verification.** Resolve the two rapid-payment failures and Ruff checks; exercise paid-pass redemption through the browser; visually verify exported DOCX/XLSX/PDF layouts, including empty/long reports. Native 200% browser zoom remains unverified. Pass redemption tests currently choose the success/closed branch using real Minsk time; cover both deterministically.
3. **Documentation.** The schema documents and README now reflect the implemented tables and visit read model. Complete setup documentation and the exchange schema. Preserve the original 18-table baseline and diagrams.
4. **Local demonstration setup.** Start HTTP mode, create the main administrator using `app.operator`, then add trainer profiles/slots. Keep test credentials out of the main database. This is setup/data preparation, separate from missing code.

Minor observed UI issue: occupancy minutes display excessive decimal zeros, e.g. `60.0000000000000000`.

The follow-up implements in-place training zone editing, order-specific next steps and administrator visit review over existing records. Only used passes/first visits and attended training count as attendance evidence. Purchases and no-shows do not; empty history is not proof of eligibility. Main-database records and all diagrams remain unchanged. No schema migration or deployment was needed.

## Historical snapshot — 11 October 2026

The following section records the earlier milestone, not the current application state.

## Completed

- Local Windows PostgreSQL: migrations through `0003_access_commerce`, 23 application tables, non-destructive catalogue/discount/rate seeds. No Docker; existing diagrams unchanged.
- Registration, login/logout, expiring database sessions, profile editing and ownership/role checks. Argon2id password hashes; hashed session/email/reset tokens, one-use email links, authentication throttling and request-origin protection. Password reset revokes existing sessions.
- Guest/client carts, merge on login, price review, discounts/currencies, immutable order snapshots, declined/successful simulated payments and one-time membership/pass issuance. Client locks serialize competing purchases and zone-overlap checks. Payments do not redeem passes.
- Frontend HTTP flows, email confirmation/recovery pages and Gmail SMTP adapter. Group workouts, multi-person slot capacities, format filters and membership coaching-permission flags removed from the active frontend/mock contract.

## Verified

- Backend: Ruff and 16 tests passed against separate `northside_test`, including ownership, invalid input, CSRF, token reuse, session revocation, idempotency, concurrent payments and overlapping purchases.
- Frontend: TypeScript, 80 unit tests and production build passed. Selected account/commerce/offer/training browser suites: 30 passed across desktop/mobile. Real HTTP/PostgreSQL browser suite: 3 passed, including registration → confirmation → purchase → reload → logout → password reset → login.
- Browser email tests intercept messages in ignored test files; they do not prove SMTP delivery. Build warnings remain for Zod comments, mixed static/dynamic HTTP imports and a main chunk slightly over 500 kB. Native 200% browser zoom remains unverified.

## Remaining

The user delegated simpler product decisions on 11 October; see the [selected coursework scope](../README.md#agreed-scope). This update changes documentation only; the verified implementation above is unchanged.

1. Disable registration mail, verification gates and recovery UI/endpoints for the coursework release. Keep stored addresses unverified and preserve existing tables/history. SMTP and actual email delivery are deferred, not prerequisites.
2. Administrator creation and basic user/trainer/offer management, order/access lists, first-visit handling and one-time paid-pass redemption.
3. Personal training sold one session at a time, without bundles or expiry; trainer schedule/decisions/attendance and transactional bookings. P1–P5 are now decided. HTTP training pages remain unavailable until implemented.
4. Access-offer JSON/XML/CSV exchange, one sales report in Word/Excel/PDF, four SQL summaries and final checks. No deployment work.

The frontend defaults to mock mode; use the root README's HTTP launch commands for persisted accounts and purchases. This milestone does not complete the full coursework scope.
