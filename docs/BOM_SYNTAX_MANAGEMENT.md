# Production BOM & Syntax

2026-10-02 · DEC-110 / WF-104 · Implemented and locally verified; live verification pending.

## Purpose and access

Open **Farming Hub → BOM & Syntax**, at `/bom/`. Production can check shared model specifications and physical BOM quantities without receiving purchase rates, fabrication rates, transport costs, model charges, selling prices, suppliers, stock or purchase documents.

The dedicated **Production Reviewer** role (`BOM_REVIEWER`) is limited to **Production · BOM & Syntax** (`BOM_MANAGEMENT`). The server denies all purchasing scopes for this role even if somebody accidentally assigns them. Only active authenticated accounts can open the module, its photos, APIs and downloads. Admin retains existing access; other roles require the separate BOM scope. This release does not create or change any live staff account.

An administrator can create production accounts through Users & settings: select Production Reviewer, enter the staff member's details, and assign BOM & Syntax. Create-user controls select that single scope automatically. A Manager with BOM & Syntax access can approve technical corrections; keep production checkers on Production Reviewer. A Viewer with the BOM scope may read/export but cannot submit.

## Checking workflow

1. Filter the catalogue by series, sales finalisation, BOM availability or checking status. Series are grouped separately. Dashboard cards, logo, breadcrumbs and module navigation remain clickable.
2. Open a model. Check component codes, photographs, segments, PPM and units. Check fabricated component names, drawing codes, PPM and combined kilograms per machine. PPM never multiplies the combined syntax weight; retained Input Shaft Shield stays excluded from the weight total.
3. Verify Model syntax in a sortable register with specification filters: frame, size, speed, blade orientation and gearbox position. Technical flags retain numeric old/new/confirmed quantities where available; financial notes and raw comparison objects are excluded.
4. Mark a model checked with a note, or propose component/fabrication/syntax changes, a BOM copy, or a new model definition. **Corrections await approval by default**; direct editing was not confirmed. Pending proposals do not change the purchasing BOM.
5. Admin or a scoped Manager reviews the visible differences and approves/rejects with a reason. Approval updates the same model used by Implements purchasing. Copy retains the destination's known fabrication weights, PTO variant and series brand sticker; source-only weights stay pending. Item rates, model charges and existing financial documents remain unchanged.
6. Download technical BOMs, syntax, flags or the latest checking records as Excel-compatible CSV. Model-register downloads respect selected filters. Checking-history export contains the latest 100 records; older records remain available through paginated on-screen history.

Purchased components are selected from the existing Item Master. New purchased item definitions, commercial codes/photos and prices remain with the purchasing administrator; production can add/edit fabrication identities within a model. A checking marker is an acknowledgement, not a certification that all pending inputs have been supplied. Source-review flags remain historical; this module does not silently resolve them.

## Authority and preservation

`shared/bom-management.mjs` defines a technical field allowlist. `server/bom-management-store.mjs` rereads access, constructs approved updates on the server and calls the existing Implements validator under a technical-only restriction. The client never receives or submits the full purchasing aggregate. Static module code does not embed business data.

SQLite adds `bom_review_records` and append-only `bom_review_events`, plus model/status indexes. Approval and the Implements save share one immediate transaction. Expected source/review revisions, authenticated actor, CSRF, exact Origin and actor/request digest receipts protect writes. Stale technical proposals fail without partial updates. Independent price changes are retained and do not invalidate a physical check; changes to model or shared technical item definitions do invalidate it.

No separate copy of the BOM becomes production truth. Existing account grants, business records, issued/review POs, stock, plans, prices and financial histories are preserved. New model charges remain pending. Account creation is an explicit administrator action after publication.

## UI and scale

Reuse shared navigation, Farming Hub logo, Minimal green/lime styling, theme/guide, keyboard focus, unsaved-form guards and bundled GSAP/reduced-motion behavior (UI-01–UI-12 and existing HIG application contract). Model tables scroll internally on phones; the phone drawer has a close control and backdrop. Segmented filters and CSV support spreadsheet-style checking.

Current source: 187 model definitions, 160 items and 17 active BOMs. Existing aggregate bounds remain 1,000 models / 5,000 items. New checking-history reads are limited to 100 records with a stable descending cursor and server model/status filters. Dashboard checking and pending counts cover records outside that page. Notes are bounded to 1,200 characters; correction payloads to 2 MB; export model selection to 1,000.

At 10×: measure aggregate JSON/fingerprint work and module-wide revision contention. At 100×: normalize model/line writes and add narrower indexed detail APIs before increasing limits. Append-only event retention is deliberate; no automatic deletion or off-site backup is claimed.

## Verification

Isolated tests verify API/static/export confidentiality, accidental purchase-scope rejection, Viewer write rejection, payload tampering, CSRF, transactional approval, financial/main-workspace preservation, stale proposals, price-only changes, replay, combined-weight semantics, source-flag sanitisation and history pagination. Shared navigation and personal preference tests cover the new role. Standalone build contract checks pass.

Browser checks use a private isolated copy of actual models: component segment filter, correction submission, unsaved-change guard, administrator approval, refreshed PPM, fabrication view, phone layout/drawer and cost-free syntax register. Synthetic accounts/corrections stay outside production and Git. Broader test results, recovery and live verification are recorded in private task output and the publication addendum.

Final local verification: **356 native tests passed**, including the standalone build contracts. Browser checking/approval/history and desktop/390px navigation passed without console errors. CSV contents were verified through the authenticated server tests; the in-app browser download-event observation timed out, so no separate browser download capture is claimed.

Pre-release recovery: a fresh 712,863,744-byte consistent snapshot and 702,022,814-byte recovery ZIP passed checksum, archive CRC/member hashes, running-source startup and candidate restore. All14 original table contents were identical; candidate added only the two empty review tables. Five verified recovery archives retained in the established private backup directory. No live BOM, price, staff-grant or checking record writes were performed.
