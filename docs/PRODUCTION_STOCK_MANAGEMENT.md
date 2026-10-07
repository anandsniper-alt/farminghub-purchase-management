# Production & Stock

DEC-111 / WF-105 · 2026-10-02. Implemented and verified locally; live publication requires the release verification entry below. Uses the existing native application and the shared Implements inventory. No synthetic stock, batches, serials or staff grants are included in the release.

## Working flow

Farming Hub → Production & Stock → New production batch → select a model with a detailed BOM → machines, date and planning month → preview consumption → save draft → complete → finished stock and serials → dispatch.

The user confirmed deduction on completion. Completing a draft atomically deducts materials and creates one finished unit per machine. An explicit **Issue materials** action is also available for a separate issue stage: it deducts once, and subsequent completion creates serials without another deduction. Saving or cancelling a draft does not affect stock. No automatic issue occurs when drafting.

Purchased component demand is PPM × machines; fabricated stock is one model subassembly set per machine, measured in pcs. The approved syntax weights and fabrication costing remain unchanged. Blank PPM stays pending: staff must enter and explain actual consumption before posting. Overrides belong to the batch snapshot and never edit the master BOM. Explicit zero consumption is recorded, not inferred from a blank.

Posting blocks shortages, negative balances, fractional pcs, future dates, stages before preceding stages, duplicate serials, stale source revisions and changed draft BOM definitions. Reopen/edit a stale draft and preview again. Receipt/count entries do not set purchase prices. Units in kg/ltr support three decimals. Batches are whole quantities from 1 to 1,000 machines, completed as a whole; partial completion is not implemented.

## Stock and serials

- Component stock uses the same item identities and balances as purchasing MRP. Receive stock with date, reference and reason. Manager/Admin count correction records before, delta and after; no silent replacement of history.
- Posting records an immutable material snapshot and a stock ledger. Later purchasing stock uploads are also represented in this ledger using quantities and actor only, without importing financial notes.
- Original monthly plans stay intact. Issued/consumed machines are subtracted from the remaining model requirement for that planning month; stock is still allocated to the earliest remaining month first.
- Finished units are **Available**, **Dispatched** or **Void**. Staff can enter unique serials or use automatic model/month numbering. Dispatch references, returns and production batch links preserve traceability.
- Manager/Admin may return dispatched units and reverse an issued/completed batch. Reversal requires all completed units to be available, returns the exact material snapshot, restores open planning demand and permanently voids serials. Voided serials cannot be reused. Posted records cannot be deleted through this module.
- Batch, unit and movement registers use cursor pages of 100. CSV exports are technical only; register downloads explicitly export the latest 100 matching records, while the stock export covers current stock items.

## Team access

An administrator can create or update a **Production Operator** account using the normal Users & settings flow. This role is restricted on the server to BOM & Syntax and Production & Stock even if commercial scopes are accidentally assigned. It can check BOMs, submit technical proposals, draft/post production, receive stock and dispatch units. Manager/Admin approval is required for master BOM corrections, stock count adjustments, returns and reversals. No real team accounts or scope grants were made by this release.

Technical APIs never return purchase rates, suppliers, fabrication rates, charges, sales lists, margins, financial history or commercial documents. Existing Production Reviewer access remains BOM-only. Existing accounts retain their roles/scopes.

## Persistence and enforcement

`shared/production.mjs` owns quantities/serial/date/stock rules; `server/production-store.mjs` owns current identity, access, optimistic revisions, request retry receipts and SQLite transactions. `/api/production/*` and `/production/` use existing authenticated sessions, exact-Origin/CSRF writes and protected static assets. Source stock writes have an internal inventory-only allowlist.

Four dedicated SQLite tables store batches, finished units, production events and stock movements. Event/movement tables are append-only. A stock post and its batch/units/receipt/history commit together using `BEGIN IMMEDIATE`; failures roll everything back. This retains the current single-instance deployment and volume.

Current scale: 187 catalogue models, 17 active BOMs, bounded technical projection, 100-row indexed history pages. At 10× event volume, pagination remains bounded; shared aggregate stock writes and module-wide revision contention need measurement. At 100× model/stock volume, normalized inventory and measured background processing are required before claiming capacity. No capacity/load test or multi-instance deployment is claimed.

## Verification and limits

Isolated actual-BOM browser checks exercised draft → issue → completion → serial → dispatch, exact one-time deduction, missing-PPM handling, unsaved-entry protection, stage history, mobile drawer/focus and internal stock-table scrolling. Synthetic stock and transactions remain in ignored local test output. Native tests cover direct completion, double-post prevention, shortages, atomic duplicate-serial rollback, stale BOMs/revisions, idempotent retries, receipts, restricted adjustments/reversal/returns, source-field tampering, commercial denial, append-only histories, monthly MRP and cursor/export bounds. See the dated release entry for the completed regression result.

The phrase “Defect on material issue” remains unconfirmed: clarification was requested whether it means deduction at issue, defective materials, or a website defect. No scrap/quarantine/replacement policy was inferred. Defective-material handling, partial batch completion, warehouse bins, opening finished-stock imports and barcode labels are not implemented.


**DEC-111 / WF-105 candidate verification ? 2026-10-02:** Complete native regression: 365 tests passed, zero failures/cancellations/skips. Focused production recheck: eight passed, including exact-once material issue/completion, atomic duplicate-serial failure, histories, current permissions, MRP and CSV/cursor bounds. Standalone review build and native bundle-contract checks passed; direct local-file browser review was unavailable under the browser URL policy. Authenticated isolated browser verified actual model BOMs with synthetic stock, stage history, unsaved-entry guard, serial dispatch and mobile drawer/internal scrolling. Final theme hook fixed and navigation reread without new console errors. Recovery/retention and live unchanged-state preflight passed. No synthetic fixture or private backup is committed. Publication still requires exact runtime/live checks.


**DEC-111 / WF-105 publication verified ? 2026-10-02:** Production & Stock is live at `/production/`, runtime `80f1d4077bfca1938549f0a106b740948c2d9f63`, Coolify deployment `ackxryduwq4lxhvy1rez0cjt`. Rolling health passed on attempt 1; existing hosting settings/volume retained. All 365 regression tests passed and the standalone build passed. Twelve browser-served assets match the release; the server-only production rules file is deliberately not a static route (the initial verification URL was corrected). Live technical APIs, stock CSV and unauthenticated denial passed. Production batch/unit/movement registers remain empty, with no demo import or staff grants. Whole main state stayed revision1859 /36 orders and Implements revision8 /187 models /160 parts, with exact pre-release hashes and physical balances. All30 RO payloads/revisions and473 document identities/hashes/sizes match the fresh recovery snapshot. Browser verified all17 active-BOM model choices, clickable Farming Hub home/return module entry and production dashboard without console warnings/errors; no live transaction was posted. Fresh recovery ZIP original/candidate restore, CRC/member checksums and five-archive retention passed before publishing. This supersedes publication-pending statuses for DEC-111/WF-105. Isolated tests and live evidence remain private in ignored test-output/production-management. Defective-material policy remains unconfirmed.


**2026-10-07 — DEC-114 supersedes whole-batch-only:** partial completion is implemented locally, with tranche serials, direct proportional consumption, no second deduction after full material issue, cumulative reversal and legacy-issued compatibility. The cost-free API and manager restrictions remain. This extension is not yet published. See [contract](IMPLEMENTS_PROCUREMENT_LIFECYCLE.md).

**DEC-114 / WF-108 navigation follow-up:** In production now filters MATERIAL_ISSUED and PART_COMPLETED together; explicit individual statuses remain available. Native checks passed for both included stages and exclusion of draft/finished batches (17 targeted tests total); review build and diff checks passed. No production quantity, posting or stock policy change. Final publication requires the freshly downloaded6200d68 snapshot recovery verification and the new exact-runtime readback.
