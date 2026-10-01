# Coursework Diagrams

Prepared on 2026-09-30. The three required graphical materials are the existing Use Case Diagram, the training-booking algorithm flowchart and the PostgreSQL ER Diagram. Diagram captions are Russian; technical identifiers and filenames are English. The original ER files are preserved. At the user's subsequent request, a separate Peter Chen representation is available in `diagram_chen.drawio`.

## Peter Chen diagram

[diagram_chen.drawio](diagram_chen.drawio) contains **one connected sheet** in Peter Chen notation, following the user's visual reference. All 18 entities, 29 relationship diamonds and 95 attribute ellipses are on that sheet. Each attribute connects directly to its entity; there are no separate attribute panels or repeated entities. The drawing uses black lines, white shapes and Russian labels. English entity and field identifiers remain available as editable object tooltips.

Current exports: [SVG](diagram_chen.svg) and [PNG](diagram_chen.png). The earlier five-sheet layout has been superseded; the older `diagram_chen_accounts`, `diagram_chen_sales`, `diagram_chen_training` and `diagram_chen_service` exports are not the current diagram.

Rectangles denote entities, diamonds denote relationships, and ellipses denote attributes. Underlining marks key attributes; both underlined attributes of a cart item jointly identify it. `1` and `N` express cardinality, and double lines express mandatory participation. Ordinary foreign keys are represented by relationships, while shared identifiers remain as key attributes. This convention follows the [Indiana University Southeast notes on Chen notation](https://enter77.ius.edu/cjkimmer/entity-relationship-diagrams/).

The diagram preserves the attribute selection of the supplied `er-diagram.drawio`, splitting RU/EN pairs into individual ellipses. The complete physical data dictionary, additional fields, uniqueness rules, indexes and transaction details remain in [schema-design-details.md](../database/schema-design-details.md). The diagram does not change the database schema. Order items and membership issuance are mandatory at transaction commit; profiles are mandatory for trainers, not for every user role.

Verification: the 29 relationship pairs match the detailed specification. All 142 entity/relationship/attribute shapes belong to a single connected graph with 153 connectors. The geometry audit checks crossings, overlapping shapes, shared line segments and lines passing through unrelated shapes. The current SVG/PNG were exported using draw.io Desktop, and the complete drawing and enlarged details were visually inspected. The original ER source, its PNG and `old/` remain unchanged.

Rebuild with `python docs/diagrams/tools/generate_chen.py` from the repository root. The generator and its local `chen_single_layout.py` helper use Python's standard library. Regeneration replaces the generated `.drawio`, so preserve any direct manual edits beforehand. Export with draw.io Desktop using `--export --format svg` or `png`, `--theme light`, `--border 25` and `--scale 1`. A higher PNG scale can exceed the desktop renderer's bitmap limits and leave the bottom blank; SVG remains scalable. Export to a fresh temporary filename and then replace the generated export.

## Files and descriptions

| Material | Editable source | Vector export | Raster export |
|---|---|---|---|
| Existing Use Case Diagram | Not available in the project | Not recreated from PNG | [use-case-diagram.png](use-case-diagram.png) |
| Booking algorithm, sheet 1: validation and reservation | [booking-algorithm.drawio](booking-algorithm.drawio), page 1 | [booking-algorithm.svg](booking-algorithm.svg) | [booking-algorithm.png](booking-algorithm.png) |
| Booking algorithm, sheet 2: trainer/admin decision | Same source, page 2 | [booking-algorithm-review.svg](booking-algorithm-review.svg) | [booking-algorithm-review.png](booking-algorithm-review.png) |
| ER logical model: all 18 entities | [er-diagram.drawio](er-diagram.drawio), page 1 | [er-diagram.svg](er-diagram.svg) | [er-diagram.png](er-diagram.png) |
| ER service relationships: action performers | Same source, page 2 | [er-service-relations.svg](er-service-relations.svg) | [er-service-relations.png](er-service-relations.png) |

### Use Case Diagram

`use-case-diagram.png` is a byte-for-byte copy of `old/use-case-diagram.png`. Its cases, relationships and layout have not been modified. No editable `.drawio` source was found in the project, and no diagram was reconstructed from the image. The existing diagram is accepted as the current coursework graphic; the complete application requirements remain in the root README.

### Training-booking algorithm

The two sheets form one flowchart, based on `old/activity-diagram.png`. Connector **А** continues the flow from sheet 1 to sheet 2. Connector **Б** returns an invalid confirmation attempt to administrative review on sheet 2. Rectangles represent actions, diamonds represent decisions, parallelograms represent input/output, rounded terminators represent start/end, and circles connect flow segments.

Sheet 1 checks the membership for the scheduled training time, slot availability, duplicate or overlapping active client bookings, and capacity. The client, membership and slot are locked before the checks; creating `pending` reserves one place in the same transaction. Failure rolls back without creating a booking. Notifications are dispatched after commit.

Sheet 2 covers the trainer's decision, 12-hour escalation or an already-started slot, administrator review, and a second transaction that rechecks state, permissions, eligibility and overlaps. Confirmation preserves the existing reservation. Rejection/cancellation releases it. A stale or unauthorized change is rejected; an invalid confirmation returns to administrative review. Waiting for a human decision happens outside a transaction. Client cancellation and attendance remain documented in the database specification; this flowchart focuses on creating and reviewing a booking.

### ER Diagram

The source is [schema-design-details.md](../database/schema-design-details.md). The overview groups the same 18 entities into accounts, catalogue/cart, sales/payments, access/training, and events/audit. It shows primary keys, all foreign-key attributes, selected business attributes, and 22 principal relationships in Crow's Foot notation. The second sheet shows the remaining 7 performer foreign keys to `users`. Repeated entities on that sheet are references to the same tables, not new tables.

`PK` means primary key, `FK` foreign key, `UQ` unique key and `?` nullable. `FK*` on the overview points to a relationship drawn on sheet 2. A line crossing is not a junction. Conditional rules (one profile for a TRAINER, mandatory order items and membership issuance at commit) are stated in the specification because a static cardinality alone cannot express every lifecycle condition.

Overlapping `pending`/`approved` bookings of one client are forbidden across all memberships and trainers. The check joins existing `memberships`, `bookings` and `training_slots` under a client-row lock. No columns were added to `bookings` for a diagram-only exclusion constraint.

Use SVG for insertion and scaling; keep text readable when choosing the page size. The complete 18-entity ER overview is intended for large-format printing or zoomed viewing, not reduction to a single A4 page. The draw.io sources contain individually editable shapes, labels, keys and connectors rather than flattened pictures.

## Previous-coursework references

All nine PNG originals in `old/` were inspected and left unchanged. `activity-diagram.png` provides the booking sequence; `bpmn-to-be.png` and `state-diagram.png` provide administrative escalation context. AS-IS, sequence, collaboration, class and deployment diagrams were reviewed as historical references. Their mobile apps, real bank integration and separate problem-request entity do not override the current React/FastAPI/PostgreSQL design.

## Verification

- Both `.drawio` files were opened by the installed draw.io Desktop 31.5.3 renderer; all four pages exported successfully to SVG and PNG. No online upload was used.
- The PNG exports were opened and visually inspected. Decision labels and crowded flowchart captions were corrected and re-exported.
- All four SVG exports were parsed and independently rendered with Sharp/librsvg; their rendered previews were inspected.
- The ER source contains exactly the 18 specified entities. Its 22 principal and 7 service relationships cover all 29 foreign keys in the attribute dictionary. Displayed field identifiers were checked against that dictionary.
- All 18 attribute tables and the full index section match the original detailed proposal. The documented changes concern client-booking overlap checks, current diagram availability and the graphics-before-implementation milestone.
- SHA-256 checks confirmed that all nine files in `old/` are unchanged. The copied Use Case PNG is identical to its original.
- The [concise database PDF](../database/schema-proposal.pdf) has four A4 pages. All pages were rendered with Poppler and visually inspected.

These are document and rendering checks. No PostgreSQL migrations, application code or database integration tests were created or run in this stage.
