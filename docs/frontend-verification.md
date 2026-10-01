# Shared Frontend Design Verification

Date: 1 October 2026. Scope: migrate the reviewed homepage design to all existing routes while preserving the mock workflows.

## Result

- The main homepage and `/design-preview` render the same component inside the shared site layout.
- `/plans`, `/trainers`, `/login`, `/register`, `/account/memberships`, `/account/profile`, the client-access message and the 404 page use the approved dark/turquoise design.
- Shared tokens, local Manrope fonts, buttons, inputs, language controls, header/footer, favicon and browser theme color are consistent.
- Membership cards show duration, full-term BYN price and coached training permissions. The catalogue and homepage use `PlanCards.tsx`.
- Forms retain field labels, validation, selected-plan context and safe redirects. Guest-form code loads when opened; the form remains a local demonstration with no submission.
- Homepage anchors work from other routes, on reload and on repeated navigation; focus moves to the target section below the sticky header.

## Automated checks

Run from `frontend/`:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed; also included in the final build |
| `npm run build` | Passed |
| `npm test` | 37 passed |
| `npm run test:e2e` | 31 passed, 1 expected skip: the mobile-only navigation test in the desktop project |

Browser coverage includes RU/EN, actual loading of local Manrope font faces, public routes, selected-plan links, registration failures, login/logout, ownership isolation, profile edits, membership filters, role boundaries, guest-form validation, keyboard facilities/FAQ controls, cross-route anchors and compatibility-route navigation. Public and account screenshots cover 320, 390, 720, 768 and 1440 CSS-pixel widths. No horizontal document overflow or browser console errors were found by the existing route checks.

Vite/esbuild could not read its configuration under the Windows filesystem sandbox. Build, Vitest and Playwright succeeded with the approved local execution permissions. Build output contains two non-blocking Rollup annotation warnings from Zod; there are no application compilation errors or oversized-chunk warnings.

## Visual review

Inspected rendered screenshots of the homepage, plans, coaches, login/registration and account pages, including narrow registration, membership statuses and tablet plan cards. Also inspected the live site in the in-app browser at 768 and 720 CSS pixels, including sign-in and the client account. Statuses retain text labels and distinguish active, upcoming, expired and cancelled memberships; error and success colors remain legible on dark surfaces.

The 720 CSS-pixel viewport is a **reflow proxy** for a 1440-pixel browser window at 200% zoom. Native zoom shortcuts did not change the in-app browser's scale, so actual browser/text-only zoom is not claimed as verified. Temporary viewport overrides were reset after review.

Screenshots and Playwright traces are local generated artifacts under the ignored `frontend/test-results/` directory. The local development server runs at `http://127.0.0.1:5173/`.

## Remaining project scope

The interface still uses the in-memory mock API. Real authentication, purchasing, bookings and trainer/admin workflows remain separate roadmap milestones. Contact details require agreement; guest-visit storage and handling require a separate design review. No backend, database schema, migrations, seeds or original diagrams were changed during this rollout. The next roadmap step is database-design approval followed by the backend foundation.
