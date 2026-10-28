# Implementation status

## Current status — 28 October 2026

- The public timetable now shows a week, one selected day and time buttons grouped by trainer. It supports zone/trainer filters, deep links, nearest available-day selection, occupied times and empty states. Booking eligibility still comes from the server.
- Shared buttons have predominantly square corners, consistent 44–48px targets and restrained motion. Purchase panels use a small asymmetric corner; forms, account navigation and staff controls share the palette and spacing. Training purchases load their own styles, so direct navigation and reload render consistently.
- Administration has grouped desktop navigation and a mobile section selector. Trainer schedule, requests, profile and notifications are separate sections. Slot editing is opened on demand and offers only the trainer’s zones; cancellation asks for confirmation. Notification links lead to requests. Staff inputs remain disabled while saving.
- Local `northside` now has one administrator, three active trainer logins and 36 future slots created for the next two weeks. Credentials exist only in ignored `backend/.local/staff-access.md` / `staff-credentials.json`. The explicit `app.prepare_local` command refuses unrelated account collisions, preserves changed passwords, existing financial data and cancelled slots, and adds missing future availability on rerun.
- The database remains PostgreSQL with 30 application tables, migration `0006_trainer_portraits`; no schema or diagram changes were made in this milestone. The historical 18-table baseline remains in both schema documents.
- Verification: Ruff passed; **36 backend tests**, **82 frontend unit tests**, **96 mock browser tests** passed (2 intentional device-specific skips). All **8 existing HTTP/PostgreSQL browser workflows** passed, including the new calendar selection in the paid training scenario. Two additional staff layout/accessibility checks cover all 15 sections in RU/turquoise and EN/orange, desktop and 320px. TypeScript and production build passed; Vite still reports the existing 509 kB entry chunk and dependency comment warnings.
- Live main-database visual checks produced 23 desktop/320px screenshots plus a 390px pool-trainer editor check with no JavaScript errors or horizontal document overflow. All four prepared staff accounts signed in through the actual UI. Screenshots and read-only check results are under ignored `frontend/.local/design-2026-10-28/`.
- Updated browser selectors to current text, mobile theme-menu behavior and week navigation; fixed the rapid-payment test's clock race. Corrected setup documentation: no SMTP/email verification, current table count and staff bootstrap procedure.
- Remaining release acceptance: native browser zoom at 200%, visual inspection of empty/long exported reports, deployment preparation. No deployment was performed. These older pending items do not block local use of the tested flows.

The dated sections below are historical snapshots; their pending items and database counts may have been superseded above.



## Presentation and trainer follow-up — 16 October 2026

- HTTP is now the documented default. Migration `0006_trainer_portraits` adds a nullable allowlisted portrait key with a partial unique index, without adding tables or changing existing records. Both schema documents retain the historical 18-table baseline.
- The explicit `app.seed_trainers` command creates three fictional profiles with Argon2id hashes of random, discarded passwords, preserves existing emails/profiles and audits creation. Applied to local `northside`: three profiles now load through the API with their portraits. Existing client/purchase data was preserved; no training slots were fabricated.
- Trainer cards link to their own schedule, support gym/pool filters, and collapse the homepage section only when loading succeeds with an empty list. API failures retain retry.
- Paid orders emphasize the next action, omit the checkout stepper, suppress duplicate single-item prices and retain discount/conversion details and collapsed payment history. Selection copy, FAQ, account labels and errors are aligned in RU/EN. Purchase pages use a compact footer; desktop account actions are grouped in a keyboard-accessible disclosure.
- Fixed the mobile purchase bar disappearing when a radio or checkbox received focus. Mock and HTTP Playwright artifacts now use separate directories.
- Verification: 34 backend tests; 80 frontend unit tests; 33 targeted mock browser checks (16 desktop, 17 mobile; one desktop-only skip of the touch gesture test); all 7 targeted HTTP scenarios passed across the initial run and corrected trainer-test rerun. Ruff, TypeScript and the final production build passed (existing dependency-annotation and bundle-size warnings remain). Live HTTP screenshots of trainers and selection were inspected at desktop/mobile sizes; no horizontal overflow at 390px. The browser checks also cover 320px and both themes/languages.
- This is a targeted follow-up, not full release acceptance. Earlier audit notes below are historical; outstanding native 200% zoom and report-export layout acceptance remain outside this change.


## Historical snapshot — training/visit UI follow-up, 15 October 2026

Final follow-up check on 15 October 2026: `npm run build` (including TypeScript checking) passed. The earlier approval-review usage-limit interruption is resolved. The saved targeted first-visit entry test result is also passed. This closes the final build check for these two UI changes; it is not a new full-project acceptance audit.

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
