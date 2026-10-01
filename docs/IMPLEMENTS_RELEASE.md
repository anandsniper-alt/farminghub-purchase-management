# Implements purchase release

2026-10-01 · DEC-103 / WF-097 · Implementation and verification record

## Confirmed scope

Publish the reviewed Rotavator workspace under **Order Management → Implements Division → Rotavator purchasing** at purchase.dvjassociates.com. The user explicitly requested deployment first and the recovery backup afterwards for this release. This is a scoped ordering exception to DEC-067; checksums, archive integrity, isolated restore and five-copy retention still apply.

The source is the actual local workspace, including the selected 17-model fabrication review, 187 model definitions, 148 shared items, 131 entered purchase prices, current review flags, original source identities and retained model history. Import the private reviewed JSON through the authenticated API once, into an empty module. No business workbook, prices, local-storage dump, demo records, login secret or database is bundled in Git or public assets.

## Architecture and preservation

- Reuse the reviewed UI and the same calculation/validation functions, now owned by `shared/implements/`. The browser ESM facades and server use these exact helpers.
- `/implements/` and its item images, shared module code and every `/api/implements/*` endpoint require an existing active Farming Hub session and `IMPLEMENTS_DOMESTIC` access (or Admin). Existing account grants are unchanged. Admin initializes the workspace; scoped Admin/Manager/Executive users can edit; other scoped roles can read/export.
- The existing persistent SQLite database stores a separate `implements_workspace` aggregate and append-only `implements_events`. Import/Domestic/VMS workspace payload, accounts, files, financial data and references are not replaced or migrated.
- Saves use a module revision, server-authoritative actor, exact Origin and CSRF checks, a transaction and actor/request idempotency. A stale edit or failed save leaves the form on screen. Concurrent writes to another purchase division do not invalidate the Implements revision. Two edits within Implements conservatively conflict.
- Server validation preserves earlier PO, sales-list, price-import, item and model histories. It recalculates newly saved PO lines from MRP and verifies new sales cost snapshots against the current BOM. Current-price activation requires its previous reference and reason. Audit stores the authenticated actor, change before/after data and state hashes.
- Physical PPM does not multiply the combined syntax weight. Input Shaft Shield remains listed and excluded from calculation. The S2.V10 bush and four S4.V20 spacers remain separate per-piece parts with rates pending. Full model cost stays pending when required data is missing.
- Current working fabrication rate is ₹125/kg + ₹1.50/kg transport. Saved review POs retain their original snapshots. Reviewed state is uploaded separately after deployment; the initial software installation contains no production seed.

## Workflow boundary

Catalogue by series → model BOM and fabrication → purchase prices and transport → monthly machine plan → earliest-month stock allocation → MRP with separate buffer/extras → supplier review POs → PDF/Excel. Item Master editing/photos/export, verification segments/filters, current/new sales price lists, forward multipliers, round-off and monthly history are retained.

POs are **review documents** with `FH-IMP-PO-` identifiers. Formal approval/issuing, receipt/GRN, stock movement, supplier bill matching and Tally posting are not implemented by this release. Nothing is sent automatically to a supplier. Item GST and transport percentages remain reference values under the existing calculation contract.

## Files and recovery

The container installs Debian Python/openpyxl/reportlab/Pillow for bounded XLSX/CSV import and PDF/Excel exports. Jobs are limited to two, 60 seconds and 40 MB output. Spreadsheet cell text stays literal. Images are loaded from the protected manifest; arbitrary filesystem paths are rejected. Cost and PO exports use saved server data.

Admin-only, Origin/CSRF-protected `POST /api/admin/recovery` makes a fresh `VACUUM INTO` snapshot in a worker, checks integrity and foreign keys, hashes it and streams it without loading the full database into memory. Temporary server files are removed after the response. The downloaded recovery ZIP must include this complete database (both modules, evidence, accounts, sessions, audit and retry receipts), the exact running source and a recovery guide. Credentials stay outside the archive. Recovery must reconcile later writes and invalidate recovered sessions before cutover.

## UI adaptation

UI-01/03/04/05/06/07/08/11/12 and the reviewed module's existing HIG patterns apply. The approved Rotavator page retains its own green/lime layout at a dedicated authenticated URL, with a clear return to all purchase modules, rather than duplicating a second application login. This release deliberately retains that reviewed layout instead of importing the main shell's guide/motion controller into the separate page. The main application's guide and motion remain untouched. The standalone review build links to the authenticated online module; it cannot simulate online storage.

## Scale assessment

Current: approximately 2 MB of reviewed module data, 187 models and 148 shared items, one server instance. Request limits remain 20 MB; existing domain bounds include 1,000 models, 5,000 parts, 120 planning months and 1,000 orders. Separate aggregate storage avoids copying Implements data into every Import/Domestic bootstrap.

10×: the module-wide revision and full-aggregate saves will cause contention; measure before expanding usage. 100×: use indexed per-entity persistence, bounded APIs and queued exports before removing limits. Audit growth has no automatic deletion. These are limits and follow-up needs, not a load certification or scheduled off-site backup claim.

## Verification

The full existing application suite plus initial Implements checks passed: **330 tests**. A subsequent focused run covers four online invariants, including server-verified sales costs. The adapted Rotavator suite passed **62 tests**. The standalone build and startup module graph passed. The isolated server accepted the real price workbook and exported model costs (17 models), item photographs, and supplier PO PDF/XLSX. Existing main workspace equality, auth/scope/CSRF rejection, demo rejection, stale edits, retry replay, immutable history and full recovery integrity were checked.

Browser checks cover the main division entry, protected module startup, selected-17 costing, reasoned fabrication-rate save and persistence after reload. Tests and trial orders run only in a separate local release database. Publication/runtime hashes, production preservation and final recovery results are recorded after deployment; this paragraph alone is not proof of live publication.
