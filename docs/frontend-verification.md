# Shared Frontend Design Verification


## Stage 3 — Client account, schedule and training requests

Completed on 3 October 2026. The changes use the existing mock architecture, local assets and approved theme. No dependencies, migrations, database files, diagrams, real email, external publication or trainer/admin dashboards were added.

- TypeScript and production build passed. New account/schedule screens and their translation dictionary load in separate chunks; the main bundle remains below Vite's 500 kB warning threshold. Only the two pre-existing Zod/Rollup annotation warnings remain.
- **68 unit tests passed** across five files. Added coverage: request/approval/cancellation and capacity, original entitlement checks, email/zone/format gates, single-visit exclusion, overlap across gym/pool memberships, duplicate and last-place requests, ownership/roles, terminal states, exactly-12-hour cancellation boundary, inactive trainers, past approval rejection, delayed private requests after client changes, recovery/expiry demos, membership coverage boundaries, adjacent bookings, renewal date rounding, safe session redirects and RU/EN key parity.
- **58 browser cases passed in aggregate, two desktop-only skips remain expected.** The initial full suite passed 46 cases and found the old default-account assertions, select-label test matching and a session-expiry explanation race. After fixing the application race and updating selectors/default-page expectations, all 12 affected cases passed on desktop and mobile. No test failures remain unresolved. Training scenarios fix browser time to Minsk midday so cancellation tests do not depend on the hour of execution.
- Returning-client journey: guest session link → login preserving the slot → pending request → simulated approval → notification read state and link → cancellation → restored free place → another request → simulated rejection, including English details.
- New-client journey: selected pool session → registration → explicit demo verification → missing-membership explanation → pool-only purchase → renewal configurator prefill → eligible pool booking → approval → consistent overview.
- Public checks cover coach-to-schedule links, URL-backed filters, empty results, a full slot, English copy and 320px reflow. Account checks cover overview, booking history (attended/no-show/rejected/cancelled), session-expiry cache cleanup, explanatory sign-in state and password-recovery simulation without email or credential mutation. Existing Stage 1–2 browser checks still cover profile, cart/payment, privacy, gallery, language and navigation.
- Visually reviewed desktop overview, mobile English booking details and the 320px English schedule. Cards, filters, dates, badges and account navigation remain readable. Screenshots/traces are regenerable ignored files under `frontend/test-results/`.

Limitations: mutations are atomic only in the single in-memory demo instance; genuine concurrent transactions and authorization require the later backend. No trainer message or recovery/verification email is sent. The recovery form validates input and shows a demo result, but does not change passwords. Session expiry is an explicit demo action. Reload resets mock data. Actual reception redemption and production authentication remain outside the frontend stage. Broad accessibility/native zoom and final cross-route acceptance belong to Stage 4.


## Stage 2 — Configured access, cart and simulated purchase

Implemented and checked on 3 October 2026. The user approved overlapping membership periods only for disjoint zones. The gym/cardio option is one zone; a combined product intersects both gym and pool. No database or schema work was performed for this frontend milestone.

- TypeScript and production build passed. The two existing Zod/Rollup annotation warnings remain non-blocking.
- **55 unit tests passed** across four files. Commerce coverage includes guest cart claiming, verification gate, owner/role boundaries, delayed-session rejection, add/edit/remove, stale versions, price revisions, unavailable offers, empty zones, date boundaries and month-end clamping, promos, USD/EUR rounding, immutable order snapshots, failure/retry and request idempotency. Overlap checks cover the cart, issued access and competing pending orders.
- **50 browser tests passed in aggregate, with two expected desktop skips** (touch-only swipe and mobile-only navigation). The last full run passed 48 and identified two exact-text test-selector issues (`Used` also matched `Unused` in Russian); both corrected account cases then passed in a targeted desktop/mobile run. No application failure remained.
- Both browser profiles completed a pool membership purchase through guest cart editing, login, invalid/valid promo, USD conversion, declined payment and successful retry. They opened the order list and purchased access, verified dates/zones and checked 320px reflow. A separate journey covered combined single-visit purchase, guest removal/empty cart, registration, simulated email verification, unused access and reset on reload.
- Browser checks also purchased simultaneous gym-only and pool-only memberships, blocked a conflicting combined membership, changed its date and cancelled the new unpaid order. Existing profile/auth, ownership, keyboard, language, public-page and responsive regression checks remain.
- Photo arrows sit inside the left/right photo edges, measure 64px on desktop and 52px on narrow screens, and wrap from first to last and last to first. Tabs, keyboard controls and mobile swipe remain synchronized.
- Reviewed generated desktop cart, mobile order, 320px English access and desktop/mobile gallery screenshots. The gallery-only browser cases also passed in a targeted rerun for these screenshots. Typography, zone badges, converted totals, payment feedback and account navigation remain readable without horizontal overflow. New forms keep visible labels/focus states; the hidden skip link stays keyboard-focusable and becomes visible on focus.

The API is an in-memory single-tab simulation. Reload resets sessions, carts and new orders/access; only locale persists in local storage. No real money, email or admission is processed. HTTP endpoints are provisional, not a running backend. Mock atomic execution is not a substitute for PostgreSQL concurrency tests. Schedule/coached booking and full account overview belong to Stage 3. Native browser/text-only zoom was not reverified in this stage.

## Homepage hero photo update — 2 October 2026

Replaced the generated portrait hero with Max Vakhtbovych's empty-gym photograph from Pexels. Its official page and free website-use license were checked; source, license, dimensions and processing are recorded in `frontend-assets.md`. Delivery is local WebP (1920 × 1281), with centered responsive cropping, explicit dimensions and updated RU/EN alt text. No other photos were replaced.

The production build (including TypeScript) passed, with the same two non-blocking Zod/Rollup annotation warnings. The existing image-loading and narrow-screen browser checks passed in both projects: 4 tests. Inspected the desktop hero and dedicated image-block screenshots at 320 and 768 px; also captured 390 px. The empty central aisle and equipment remain visible, there are no people/watermarks, and the existing caption is preserved. Screenshots: ignored `frontend/test-results/hero-photo-*.png` and the existing homepage test output.

## Stage 1 — Public presentation and shared components

Completed: 2 October 2026. This section records the current result; the earlier rollout below is historical.

- Home now follows introduction → Spaces at FORMA → coaches → membership/single-visit preview → separate free-first-visit block → FAQ → contacts. Four space tabs, photo arrows, progress and native horizontal swiping share one selection. Keyboard navigation supports arrows, Home and End, preserves visible focus and keeps the selected space when switching languages. Cardio and amenities are informational, not separate paid products.
- The stable photo area uses a 300 ms crossfade; existing 550 ms section reveals, 1.03 hover scaling and animated disclosures respect reduced motion. The pool image was replaced with a brighter local concept asset. The gym uses the existing functional exercise image; the redundant activity grid/gallery and stale all-zone public copy are gone. Credits and the exact imagegen prompt are recorded in `frontend-assets.md`.
- `OfferPreview` is shared by home and `/plans`. Its in-memory presentation state selects format, term, gym/cardio and/or pool, and a Minsk date. Full BYN totals come from `api.accessOfferPreviews()` and explicit combined-zone fixtures, not addition of separate packages. Both zones deselected, empty/past dates and unavailable prices have explicit states. Prices are illustrative and checkout is disabled with an explanation. It cannot create an order or access record and does not carry draft selections through navigation/authentication.
- The existing plan-to-registration flow remains under the expandable demo catalogue on `/plans`, with its own conditions and selected-plan context. The guest form remains separate, resets on close/reload, and sends no request. Single-visit copy explains one admission, no re-entry and no coached booking eligibility. Free guest visits require administrator confirmation and exclude coached sessions and repeat admission.
- Shared page spacing, selection pills, footer surfaces, buttons, native form fields, coach cards and disclosures carry the design through plans, coaches, sign-in/registration and the existing account. No schedule/cart links are exposed before their workflows exist. Existing authentication/profile/ownership behavior is preserved.

### Checks executed

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed; also rerun by the final build |
| `npm run build` | Passed; two existing non-blocking Zod/Rollup annotation warnings |
| `npm test` | 37 passed; locale parity now also covers home/offer dictionaries |
| `npm run test:e2e` | 42 passed, 2 expected desktop skips for touch swiping/mobile navigation |

Browser checks used installed Chrome with 1440 px desktop and 390 px mobile configurations, plus 320, 720 and 768 CSS-pixel reflow checks. Coverage includes RU/EN public/account routes; tab, photo and keyboard synchronization; native horizontal swiping and ordinary vertical scrolling; FAQ quick reversal; reduced motion; route anchors; full catalogue totals; pool-only, gym-only and combined preview choices; invalid dates/zones; no purchase/request side effect; reset-on-refresh; the old selected-plan auth flow; registration/login/logout; membership statuses; profile editing and role/ownership boundaries. No horizontal document overflow or browser console errors were found by the route checks.

Visually inspected rendered screenshots of the desktop homepage hero, pool space selector, RU plans, EN coaches, login, narrow registration/profile, account memberships, the 320 px EN pool panel and invalid-date single-visit preview. Light panels use dark text; selected tabs/zones have visible marks, focus outlines remain readable, and the mobile summary is in normal document flow. Dark text `#0B0C10` on `#C5C6C7` and `#66FCF1` uses the approved high-contrast palette. Screenshot artifacts are under ignored `frontend/test-results/`.

Vite/esbuild could not read its configuration in the Windows filesystem sandbox; local build, Vitest and Chrome checks succeeded with approved execution permissions. Native screen-reader output and actual browser zoom were not manually tested. The 720 px check remains a reflow proxy for a 1440 px window at 200% zoom. Stage 4 retains the full frontend accessibility/acceptance review.

### Next boundary

Proceed to Stage 2: actual mock cart/order/payment and purchased access workflows. The Stage 1 preview is deliberately non-purchasable; authentication/account state still resets on refresh and only locale persists. No backend, migrations, seed data or diagrams were changed in this stage. Existing unrelated workspace edits/deletions were preserved. Schema design approval and deployment remain separate decisions.

## Earlier shared-design rollout

Updated: 2 October 2026. Scope: the shared design rollout and the subsequent homepage motion, content and repository cleanup, preserving existing mock workflows.

## Result

- The main homepage and `/design-preview` render the same component inside the shared site layout.
- `/plans`, `/trainers`, `/login`, `/register`, `/account/memberships`, `/account/profile`, the client-access message and the 404 page use the approved dark/turquoise design.
- Shared tokens, local Manrope fonts, buttons, inputs, language controls, header/footer, favicon and browser theme color are consistent.
- Membership cards show duration, full-term BYN price and coached training permissions. The catalogue and homepage use `PlanCards.tsx`.
- Forms retain field labels, validation, selected-plan context and safe redirects. Guest-form code loads when opened; the form remains a local demonstration with no submission.
- Homepage anchors work from other routes, on reload and on repeated navigation; focus moves to the target section below the sticky header.
- The homepage uses more slate surfaces, activity-choice filters, a shorter three-photo gallery and one shared concept-imagery note. The new first-visit FAQ reuses the approved guest conditions.
- Sections fade in once over 550 ms. Photos zoom to 1.03 on hover; button colors/arrows transition; native FAQ and activity disclosures animate in both directions. Reduced-motion mode skips movement. Keyboard focus stays visible inside disclosure rows.
- Unused `AboutPage.tsx` and `HomePreview.tsx` were removed; the compatibility route remains. Image prompts were merged into asset credits, preserving their contents. Removed the ignored project npm cache (360,815,858 bytes). Database documents and the pre-existing diagram deletions were left untouched.

## Automated checks

Run from `frontend/`:

| Command | Result |
| --- | --- |
| `npm run typecheck` | TypeScript passed as part of `npm run build` |
| `npm run build` | Passed |
| `npm test` | 37 passed |
| `npm run test:e2e` | 40 passed, 2 expected desktop skips: touch swipe and mobile navigation |

Browser coverage includes RU/EN, actual loading of local Manrope font faces, public routes, selected-plan links, registration failures, login/logout, ownership isolation, profile edits, membership filters, role boundaries, guest-form validation, keyboard activity/FAQ controls, cross-route anchors and compatibility-route navigation. Added checks cover activity filters across language switches, quick disclosure reversal, keyboard closing, narrow FAQ reflow and immediate reduced-motion opening/closing. The gallery checks cover buttons, key boundaries, native touch swiping and vertical page scrolling. Public and account screenshots cover 320, 390, 720, 768 and 1440 CSS-pixel widths. No horizontal document overflow or browser console errors were found by the existing route checks.

Vite/esbuild could not read its configuration under the Windows filesystem sandbox. Build, Vitest and Playwright succeeded with the approved local execution permissions. Build output contains two non-blocking Rollup annotation warnings from Zod; there are no application compilation errors or oversized-chunk warnings.

## Visual review

Inspected rendered screenshots of the homepage, plans, coaches, login/registration and account pages, including narrow registration, membership statuses and tablet plan cards. Also inspected the live site in the in-app browser at 768 and 720 CSS pixels, including sign-in and the client account. Statuses retain text labels and distinguish active, upcoming, expired and cancelled memberships; error and success colors remain legible on dark surfaces.

The 2 October visual review inspected the updated homepage, activity selection, gallery and expanded FAQ screenshots. After correcting the clipped keyboard focus outline, rebuilt and repeated the homepage browser suite; 9 passed and the desktop touch test was skipped. Current screenshots/traces replace older generated results in `frontend/test-results/`.

The 720 CSS-pixel viewport is a **reflow proxy** for a 1440-pixel browser window at 200% zoom. Native zoom shortcuts did not change the in-app browser's scale, so actual browser/text-only zoom is not claimed as verified. Temporary viewport overrides were reset after review.

Screenshots and Playwright traces are local generated artifacts under the ignored `frontend/test-results/` directory. The local development server runs at `http://127.0.0.1:5173/`.

## Remaining project scope

The interface still uses the in-memory mock API. Real authentication, purchasing, bookings and trainer/admin workflows remain separate roadmap milestones. Contact details require agreement; guest-visit storage and handling require a separate design review. No backend, database schema, migrations, seeds or original diagrams were changed during that rollout. Its former database-first next step is superseded by README's four frontend stages and the current Stage 1 record above.

### Spaces navigation and homepage order — 3 October 2026

Implemented the approved labelled progress navigation beneath space photos, full-height edge arrows, touch and keyboard selection, and an 8-second slideshow. One Web Animations clock drives both progress and slide advancement without per-frame React rendering. Hover pauses preserve elapsed time; manual selection and keyboard focus stop rotation until explicit continuation. Offscreen and hidden-document states suspend rotation; reduced motion disables it. Membership/single-visit selection now precedes coaches. README reflects the implemented behavior.

Validation: production build (including TypeScript) passed; all 68 unit tests passed. Targeted Playwright checks passed on desktop and mobile: 11 passed, one expected desktop skip for native touch. Coverage includes direct/keyboard selection, RU/EN, wrapping edge arrows, swipe versus vertical scrolling, automatic advancement, hover/manual/focus/offscreen pauses, explicit resume, reduced motion, section order and 320px overflow. Reviewed desktop and mobile gallery screenshots, including 320px English layout. Hidden-tab suspension is implemented through visibilitychange but was not separately exercised by these browser tests. Full unrelated purchase/account regression suite was not rerun. Existing two Zod/Rollup annotation warnings remain non-blocking.
