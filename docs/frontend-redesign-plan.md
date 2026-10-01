# Frontend Redesign Plan

Prepared on 1 October 2026. Status: **shared design rollout completed** across existing public, authentication and client-account routes. The five-color palette and minimal direction are approved. The user selected separate membership cards and authorized a free-first-visit block with shared access to all zones. The reviewed homepage is served at `/` and the compatibility address `/design-preview`.

## 1. Objective and boundaries

Present FORMA as a coherent fitness club with a gym floor, cardio zone, pool and shared changing-room/shower amenities. Make facilities, membership conditions and practical visiting information easy to find. Use restrained typography, consistent photography and clear information grouping.

Keep React, TypeScript, Vite, existing routes, RU/EN, mock API boundaries and the current client account. All three zones remain included in every membership. Existing individual/group training permissions, booking approvals, cancellation rules and the 18-table database proposal remain unchanged. No zone-specific subscriptions, lane bookings, new roles or new backend modules are introduced by this proposal. Database approval is still required before migrations and seed data.

The earlier interface overused motivational headings, identical rounded containers, decorative icons, numbered zone cards and repeated registration prompts. The rollout replaces that presentation with descriptive headings, simpler layouts and shared controls.

## 2. Research and interpretation

Sources were reviewed on 1 October 2026. These are selected references, not a claim that there is an objective ranking of the best fitness websites. Public site content and design-award descriptions are observations; the FORMA recommendations below are project-specific design judgments.

| Source | Observed pattern | Application to FORMA |
| --- | --- | --- |
| [Third Space City](https://www.thirdspace.london/clubs/city/) | Named sections for overview, facilities, classes, trainers and rates. Facilities use an expandable list beside a large photograph, with concrete details for the selected space. Location and hours are accessible near the overview. | Primary reference for facility presentation and grouping. Use modest headings and four facility entries, including amenities. |
| [David Lloyd swimming](https://www.davidlloyd.co.uk/swim/) and [gym](https://www.davidlloyd.co.uk/gym/) | Separate information about independent use, coached activities, amenities, membership inclusion and practical FAQs. Image/text sections give activities room to breathe. | Explain what visitors can do and what their membership includes. Keep visit questions together. Do not adopt their separate fees, services or policies. |
| [Equinox Bond Street](https://www.equinox.com/clubs/new-york/downtown/bondst) | Named room photography, descriptions of facilities, club details and opening hours. | Label images by actual room type. Borrow information categories, not luxury claims or additional facilities. The page does not establish a pool at Bond Street. |
| [EVO Fitness](https://evofitness.de/) and its [Web Excellence Awards case study](https://we-awards.com/winner/evo-fitness/) | A consistent visual system connects studio discovery and membership selection; the live site uses prominent photography and explicit membership conditions. Its large slogans and promotional sections are also noticeable. | Adopt consistency of images, layout and purchasing information. FORMA needs a quieter headline scale and substantially fewer promotional blocks. |
| [NN/g: visual design principles](https://www.nngroup.com/articles/principles-visual-design/) | Scale, hierarchy, balance, contrast and grouping determine what readers notice and how they understand a page. | Give each page one main heading, use a restrained type scale, and group related content with spacing and alignment. |
| [W3C: minimum text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Normal text requires at least 4.5:1 contrast at AA; qualifying large text requires at least 3:1. | Validate actual text/background pairs and interaction states, including image overlays. |

Third Space, David Lloyd and EVO were also inspected in the browser. Design-award recognition is supporting context, not a reason to reproduce every interaction. Do not copy external site text, images, auto-opening enquiry forms, promotional banners or business rules into FORMA.

## 3. Approved palette

| Color | Intended role |
| --- | --- |
| `#0B0C10` | Main page background, dark text on bright primary buttons |
| `#1F2833` | Form fields, navigation panels, selected surfaces and account work areas |
| `#C5C6C7` | Main body text and neutral headings on dark backgrounds |
| `#66FCF1` | Primary actions, keyboard focus and selected navigation details |
| `#45A29E` | Secondary accents and restrained dividers; text only on a verified dark surface |

Use the exact five colors as the brand palette. The two dark colors dominate the composition; bright turquoise occupies a small portion of the page. Do not turn whole content sections or large headings turquoise. Use photographic color naturally, without applying a cyan wash to every image. Existing semantic error/success colors may remain functional exceptions; always include a text label or icon so color is not the sole signal.

Calculated contrast for opaque sRGB pairs:

| Foreground / background | Ratio | Use |
| --- | --- | --- |
| `#C5C6C7` / `#0B0C10` | 11.43:1 | Body copy and headings |
| `#C5C6C7` / `#1F2833` | 8.71:1 | Forms, tables and account text |
| `#0B0C10` / `#66FCF1` | 15.60:1 | Primary button label |
| `#45A29E` / `#1F2833` | 4.91:1 | Secondary accent text at full opacity |
| `#C5C6C7` / `#45A29E` | 1.78:1 | Do not use for text |

These calculations do not certify the complete interface. Hover, disabled, error, focus and image-overlay states need separate checks. Do not lower body text opacity as a substitute for hierarchy.

## 4. Public information architecture

Proposed header: brand link to `/`, club link to `/#club`, Memberships `/plans`, Coaches `/trainers`, Contacts `/#contacts`, language switch, and sign-in/account. Suggested Russian labels: `О клубе`, `Абонементы`, `Тренеры`, `Контакты`, `Войти`.

This adds two in-page anchors rather than new informational routes. Anchor navigation must work from every route and with the keyboard, with correct focus and sticky-header offset. The logo already returns home, so a separate Home item is unnecessary. The public Schedule item is added only when that separately agreed workflow is usable; do not display disabled or misleading navigation now.

### Home page: five content sections

| Order | Content | Composition |
| --- | --- | --- |
| 1. Club introduction | `Фитнес-клуб FORMA`. One factual sentence describing the gym, cardio and pool; Minsk and existing opening hours; one membership button. | Compact left-aligned introduction, followed by a wide architectural photograph. Keep text on a solid background. No multi-line motivational slogan or badge collection. |
| 2. Facilities | `Залы и бассейн`. Gym floor, cardio, aquatic programs, changing rooms/showers. Shared access statement once. | One spacious section: facility list and selected description on the left; matching photograph on the right. Thin separators, no numbered icon cards. Gym open by default. |
| 3. Membership overview | `Абонементы`. Current 1-, 3- and 12-month options with full-term BYN prices from the API. | Three separate cards with aligned term, total price, training permissions and selection links. Show common access once above them. A horizontal first-visit block opens an inline demo form. |
| 4. Visiting information | `Перед посещением`. Four short questions covering zone access, independent visits, coached-session booking and cancellation. | Simple disclosure rows. Essential membership restrictions remain visible on the plans page rather than hidden only here. |
| 5. Contacts | `Контакты и часы работы`. Approved location, hours and contact details when supplied. | Structured text with clear labels; route/map link only after an address is agreed. Small footer with useful links and the coursework/demo notice. |

Do not append a second motivational CTA banner or a generic About block that repeats the introduction. Coaches remain available from the header and a contextual link in the gym description, rather than another full homepage section.

The facilities section has four entries but only three activity zones: changing rooms and showers are shared amenities. On mobile, stack the selected image and description with its disclosure row to avoid forcing readers to search elsewhere for changed content. All entries must be reachable with touch and keyboard; no automatic switching, hover-only information or nested carousels.

### Facility content template

Every entry answers the same questions: what is available, what visitors can do, and whether a coached session needs booking. Keep descriptions to two or three short sentences, supported by a few factual details only when useful.

- Gym: free weights, resistance machines and functional exercise area; independent exercise or sessions with a trainer.
- Cardio: treadmills, bikes and cross-trainers; independent use without machine reservation.
- Aquatics: swimming and aqua aerobics; common zone access, with coached sessions subject to existing training permissions and booking rules once implemented.
- Amenities: changing rooms, lockers and showers; no separate product or reservation.

Do not invent dimensions, pool depth, lane count, water temperature, equipment brands, accessibility features, medical-document rules or included towel services. These are content decisions that require agreement before publication. During the current mock milestone, do not imply that purchasing or booking is already functional.

### Membership page

Use the plain heading `Абонементы`. Lead with common access to the gym, cardio zone, pool and shared amenities. Present terms, full-period prices and group/individual permissions in three separate cards, as selected by the user. Existing plan names remain secondary labels; duration and conditions must be immediately clear.

Use one set of common benefits rather than repeating it inside every card. Remove unsupported `popular` or `club choice` promotion. Display the price unit and full payment period explicitly. Use a dark page background, slate card surfaces and restrained outlines; primary color highlights the first-visit action and interactive states. On mobile, stack offers vertically with visible field labels.

Keep current selection-to-registration behavior and its demo explanation until cart/checkout is implemented. Later purchasing will use the existing planned cart, order, discount and simulated-payment workflow, not a new enquiry form or real subscription billing.

### First guest visit

The approved refinement adds `Первое посещение — бесплатно` above the membership cards. It covers one independent visit to the gym, cardio zone and pool for a new visitor, subject to administrator confirmation; personal/coached training is excluded. These are FORMA's agreed coursework rules, not copied conditions of a reference club. The CTA opens a localized name/phone form without registration. Native fields, inline errors, initial field focus and Escape/cancel focus restoration support keyboard use.

The current form only validates fictional input. It clearly states that no request was sent and no visit was booked, makes no API request, and discards values when closed or reloaded. Real request storage, administrator processing, eligibility/redemption checks and any schema changes belong to a future reviewed workflow. Regular training-booking membership checks remain intact.

### Coaches page

Use `Тренеры`, followed by a regular grid of consistently cropped portraits where suitable licensed/demo assets exist. Each profile contains name, specialization, experience and a short factual biography. Use restrained placeholder treatment if photographs are unavailable; never imply that a stock portrait depicts a named real trainer.

No oversized initials, motivational profile headlines or repeated membership banners. A link to a trainer's available sessions is added with the schedule milestone. Current fixture content remains explicitly demonstration data; no fabricated qualifications or awards are introduced.

### Sign-in and registration

Use direct headings: `Вход` and `Регистрация`. Keep one compact form panel, persistent field labels, concise validation and a clear secondary link between forms. Remove the decorative sales column and repeated benefit list. Retain demo credentials, selected-plan context, safe redirects and existing validation.

## 5. Private interface and future workflows

Use the same palette, spacing and typography with a denser working layout. Private pages use functional titles, visible statuses and task-oriented controls; no promotional photographs or large hero sections.

| Area | Proposed organization | Implementation status |
| --- | --- | --- |
| Existing client account | Membership dates, included training formats, clear status/filter controls; grouped profile fields and explicit save/discard actions | Restyled; existing behavior and access boundaries verified |
| Future client workflows | Schedule, requests, cart, orders and notifications; chronological lists with contextual actions | Separate workflow milestone |
| Future trainer area | Schedule, pending requests and attendance; compact tables or day lists | Separate workflow milestone |
| Future administrator area | Users, trainers, plans, memberships, orders/payments, discounts/rates, import/export, reports/analytics | Separate workflow milestone |

For future schedule design, start with date, time, session name, trainer, individual/group format and available places. Use existing DTO fields; do not add zone filters or room-resource allocation as decorative features. Display pending trainer approval explicitly. Preserve the current concurrency and ownership requirements when connecting the API.

Required email, JSON/XML/CSV exchange, Word/Excel/PDF reports, discounts, currency conversion and SQL analytics remain on the roadmap. The redesign does not remove coursework requirements or simulate completion of missing workflows.

## 6. Typography, layout and interaction

- Use one font family with Cyrillic and Latin coverage. Keep Manrope as the proposed family, supplied locally with the required character sets; verify the actual font loads rather than relying unnoticed on a fallback. Use 400/500/600 weights.
- Initial type scale: page heading 40–48 px on desktop and 28–32 px on mobile; section heading 24–28 px; body 16 px with roughly 1.5–1.65 line height; field labels and metadata 14 px. Adjust only where actual content requires it.
- Use sentence case, short descriptive headings and mostly left-aligned text. Avoid a small uppercase eyebrow above every heading, excessive letter spacing and multiple colored words in one title.
- Use a shared content width around 1160–1200 px, consistent alignment, a small spacing scale, and restrained section gaps. Avoid large empty stretches on mobile.
- Keep images predominantly rectangular. Use small consistent radii for controls and panels, roughly 4–8 px, rather than enclosing every section in a large rounded rectangle.
- Prefer whitespace, thin dividers and typography to separate information. Use surfaces where they help forms, comparisons or working areas. Icons clarify actions/statuses rather than decorate every paragraph.
- Keep one visually dominant action per section. Secondary actions can be text links. Do not repeat registration prompts throughout the page.
- No diagonal background pattern, glow effects, glass panels, running marquees, custom cursor, scroll interception, autoplay video or automatic carousels. Short focus/hover transitions are enough; honor reduced-motion preferences.
- Provide visible focus, meaningful link labels, semantic heading order and comfortably sized controls. Verify at 320, 390, 768 and 1440 px, and at 200% text/browser zoom.

These dimensions are starting points for a reviewed layout, not universal requirements taken from reference websites.

## 7. Copy and asset preparation

Replace promotional phrases with descriptive labels. Illustrative Russian UI changes:

| Current wording | Proposed wording |
| --- | --- |
| `Сильнее. С каждым днём.` | `Фитнес-клуб FORMA` |
| `Три зоны. Твой выбор.` | `Залы и бассейн` |
| `Больше, чем тренировки` | Remove the duplicate section; distribute useful facts to facility descriptions |
| `Не жди понедельника.` | Remove the banner; keep a normal membership action in the relevant section |
| `Люди, которые рядом` | `Тренеры` |
| `Начни свою историю` | `Регистрация` |

Prepare original RU and natural EN copy together. Use one consistent, calm register; avoid motivational commands and grand claims. State rules before action, and make error messages explain how to continue.

Prepare a small coherent image set: gym, cardio, pool and changing rooms. Reuse an appropriate image for the introduction if necessary. Keep lighting, color treatment and crops consistent. Record source and usage rights for any new asset; do not download reference-club photographs for reuse. Export responsive local images with dimensions, descriptive alt text and sensible loading behavior.

Content to agree before final publication: fictional club address/contact details, any additional pool characteristics or visit rules, and the image set. These gaps do not prevent preparing the layout. Existing approved facts can be used; missing details should not be replaced with invented specificity.

## 8. Proposed implementation sequence

| Milestone | Work and affected files | Review or verification |
| --- | --- | --- |
| A. Content and layout | Completed: the reviewed homepage is promoted to `features/public/HomePage.tsx`, with shared copy, facility controls, FAQ and lazily loaded guest form. `/design-preview` renders the same page. | Main-route guest-form and membership-selection browser tests. |
| B. Public pages | Completed: global tokens and fonts, `PublicLayout.tsx`, shared components, homepage, `PlanCards.tsx`, plans, coaches, 404, locales, theme color and favicon. | RU/EN, responsive screenshots, working cross-route anchors with focus, keyboard disclosures and mobile navigation. |
| C. Existing account and auth | Completed: compact login/registration, account navigation, profile fields and semantic membership/email statuses. | Existing sign-in, ownership, safe-redirect, profile, session-cleanup and membership-boundary tests remain in place. |
| D. Functional expansion | Separately agree cart/orders and schedule/bookings, then trainer/admin interfaces and API integration according to README. | Critical business-rule, access-control, failure and concurrency tests; database approval before schema implementation. |

Acceptance for the visual milestone: no motivational filler headings; no duplicate About/registration banners; all agreed zones and amenities discoverable; membership conditions clear; exact approved brand colors; coherent image treatment; no clipping/overflow; keyboard-accessible interactions; no links advertising absent workflows; existing client behavior retained.

The initial research and prototype stages preceded this rollout. The shared design now covers the existing routes; migrations, schema files and original diagrams remain unchanged. Commercial data uses the existing mock API. Photography is illustrative and labeled as concept imagery; no street address, phone number or pool measurements have been invented. [Asset credits and licenses](frontend-assets.md) record the new images and fonts.

Verification details for the completed rollout are recorded in [frontend verification](frontend-verification.md).
