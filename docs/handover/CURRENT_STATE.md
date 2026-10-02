# Current state — engineering handover

Reviewed 2026-09-26 against source `1297840ecac1dbe26893f086d32fd776383dedfe`, branch `codex/domestic-bom`. This audit examined source, governing documents, existing reports and synthetic tests. It did not inspect private production databases or run live browser workflows.

**Local repair update:** DEC-082–084 / WF-076–078 now apply on top of that audited HEAD. See [engineering repair report](../ENGINEERING_REPAIR_REPORT.md). Prior audit evidence below is retained; no live release occurred.

## Current module map

“Completed” below means the stated capability exists with local regression coverage, not that the whole product is certified for launch or scale.

| Module | Classification | Implemented boundary / remaining work |
|---|---|---|
| LAE Import PO execution | Completed within current contract | Automatic PO identity, approvals/revisions, PI, artwork/specs, payment records, sample/production/QC, shipments/documents/arrival, exemptions restricted before QC; physical bank transfer and ERP stock are external |
| Arrival invoice costing | Completed within current contract | Invoice/shipment actual costs, before-GST totals, BOE evidence, provisional/final/reopen controls; not historic stock/holding/RO cost allocation |
| Item/vendor/price masters and PLM | Completed within current contract | Stable references, source/pricing/technical/brand histories and approvals; legacy acceptance and field-specific policy gaps remain in original reports |
| Domestic purchase | Partially completed | Items, model/assembly BOM, pictures, quotations/templates/manual prices, old/new and whole-assembly supplier comparisons; draft/issue/cancel PO, contacts/addresses/GSTIN/PAN and pictured PDF |
| Domestic receiving/actualisation/stock/MRP | Planned | No stock ledger, receiving/GRN, actual invoice reconciliation or ERP transfer in current Domestic module |
| VMS | Partially completed / core visit repairs local | Twelve native screens, shared vendors, CRM/samples/follow-ups/analytics/catalogues, limited text outbox; core follow-up/date/offline/location/dirty-input repairs locally verified; richer visit context/corrections/retrieval and evidence lifecycle remain |
| User administration / approval controls | Completed within current contract | Shared authenticated roles/scopes and configurable Import approval matrix; effective live grants not rechecked in this audit |
| UI guidance | Completed within current contract | Standard Minimal, per-login settings, contextual authored mascot and timeline; no AI API |
| ERP/Tally integration | Partially completed | Permanent IDs, external mapping and admin JSON snapshot only; actual connector/ownership/reconciliation pending |
| Utility / Implements | Planned | Navigation/permission identifiers, no finished purchase workflow |
| Operational recovery/monitoring/scale | Partially completed / acceptance gaps | Verified release backup process/history; off-site schedule, alerting, realistic sizing and growth architecture unresolved |
| Current production capacity/configuration | Unknown in this audit | Hosting headroom, traffic, effective role grants, external monitoring and scheduled-backup state were not inspected live |
| Recovered VMS/prototypes | Reference/historical, not active runtime | Do not deploy recovered React/Express stack or prototype datasets |

## Architecture and existing strengths

Native ESM/HTTP/SQLite with reusable domain modules, server-authoritative permissions, fixed-point monetary helpers, reasoned revisions, immutable issued snapshots, append-only audit and durable retry receipts. Scoped serialization and explicit conflict review protect existing records. [System](../architecture/SYSTEM_ARCHITECTURE.md) and [data](../architecture/DATA_ARCHITECTURE.md) documents describe the current implementation.

Do not mistake record-level conflict safeguards for entity-level storage: whole-state reads/writes/responses remain the principal growth constraint. Enumerated Domestic PO/BOM/address/tax edits now have explicit dependency guards; unreviewed commands remain conservative. [Risk register](SCALABILITY_RISKS.md) owns capacity/recovery gaps.

## Original audit pass (before runtime repairs)

- Created a linked knowledge index, architecture/data/scale map, engineering standard and current debt/risk handover.
- Recorded DEC-081 / WF-075 for the confirmed engineering process, retaining existing product/brand authorities and histories.
- Corrected the synthetic capacity fixture for automatic reference allocation; added a distinct current-edit-context scenario. Application runtime, data model, permissions, financial rules and branding were not changed.
- Preserved [LAE costing integration proposal](../LAE_COSTING_INTEGRATION_PROPOSAL.md) as proposed work; no integration was implemented.

## Verification and deployment boundary

Fresh native run: **273 passed, 0 failed, 0 skipped** in 114.694 seconds using `node --test tests/*.test.mjs`. Sandbox initially prevented child-process spawn; permitted local rerun completed. This is synthetic functional evidence, not current live/browser, penetration, disaster-recovery or throughput certification.

The synthetic pressure test **failed**: at 10,000 minimal orders, 18/20 current-context saves succeeded, two connections reset, and successful responses took about 75 seconds. Synthetic restored-copy integrity/reference checks passed. Review build generation passed (40,869,526-byte preview). Capacity/restore observations and methodological limits are owned by [Scalability architecture](../architecture/SCALABILITY_ARCHITECTURE.md). Native passes do not override this load failure.

Documentation validation: eight new owner documents, 51 relative links checked with no missing targets, unique DEC-081/WF-075, balanced fenced blocks, UTF-8 checks and `git diff --check` passed. Benchmark syntax check passed. No tracked server/shared/web/templates changes; no production secrets, databases or test artifacts added. Raw validation outputs remain ignored.

Latest recorded live runtime is `335a6cd9bdae91ba40d94f94c2e9db1752eb0933` from 2026-09-25 (DEC-080/WF-074). Checkout HEAD includes later documentation. This audit has **not reverified live revision, health, grants or backup configuration** and has not pushed/deployed anything. Refer to the dated [baseline](../CURRENT_PRODUCT_BASELINE.md) and release reports for prior evidence.

## Remaining decisions and next work

1. Confirm operational sizing, recovery objectives, alert owner and off-site destination; prior cloud-backup deferral is not approval of a provider.
2. Design indexed aggregate persistence, bounded reads/exports and explicit Domestic concurrency before bulk costing ingestion. Database choice and migrations remain proposals.
3. Agree and repair VMS visit/follow-up usability and date/outbox blockers; see [Technical debt](TECHNICAL_DEBT.md).
4. Add telemetry/release identity and repeatable CI checks; retain current recovery gates.
5. Resume costing design with source/version/unit/date reconciliation and bounded jobs, then review business policy before implementation.

No migration is pending execution from this audit. Future changes should update these owner documents and add only the relevant decision/workflow history.


## Local repair verification

The candidate now includes VMS repairs, bounded edit handles, explicit Domestic dependencies, narrow session projection, build/CI contracts and basic health/slow-error logs. See [ENGINEERING_REPAIR_REPORT.md](../ENGINEERING_REPAIR_REPORT.md) for dated evidence and outstanding decisions. The original audit numbers above must not be used as current candidate measurements.


## 2026-09-26 publication update
The technical repairs are now live at runtime 88a6303; earlier local-only/audit-only statements above are historical. Exact runtime, backup/restore, 49 live checks and concurrent-user preservation were verified. See [repair report](../ENGINEERING_REPAIR_REPORT.md). Whole-state large-scale stress remains failed; no capacity certification or off-site service configuration is implied. The fresh-checkout review-build correction is scripts/tests/docs only.

## 2026-09-26 — Payment terms rebuild (local, publication withheld)
User replaced DEC-090/091 Manual-at-capture trial with DEC-092/WF-086 typed master milestones. See ../VALUE_PAYMENT_TERMS.md. 307 native tests and native/review browser checks passed. Review the local candidate before release approval; no deployment performed. Do not publish the superseded Manual commands or approval stage.

## Current requested release — DEC-093
The user now requests completion and publication of pending terms, partial/cross-supplier RO loading and void correction. DEC-092 joins the release; discarded Manual prototypes are excluded. Candidate evidence and limitations: ../RO_LOADING_AND_PAYMENT_CORRECTIONS.md. Production backup/deployment verification remains pending; do not present local browser passes as live publication.

## Current verified release — 2026-09-26
The above release is now published: `3ba808f7978be0ce8d3cdc3af84e569cafa294a0`. 314 native tests, server/review browser checks, hosted CI and 22 live read-only checks passed. Backup, isolated restore and data-preservation gates passed; operational evidence remains private. See ../RO_LOADING_AND_PAYMENT_CORRECTIONS.md. Existing RO append and automatic freight allocation remain outside this release.


**Publication verified — 2026-09-26 (DEC-094 / WF-088):** Revoke approval is live in release `ab20645c19976b963872d98c5103467d2232fd31`. 318 native tests, isolated server/review browser scenarios, hosted CI and 17 read-only live checks passed. Required reason, mobile layout and retained history verified. Backup/isolated restore and data-preservation release gates passed; detailed operational evidence remains private. No existing approval or payment was changed. This supersedes the local-only status above.


## 2026-09-29 — Permanent UI/change guidance
The HIG/GSAP release is recorded in [HIG_RELEASE_REPORT.md](../HIG_RELEASE_REPORT.md). The user subsequently requested permanent learnings; [UI_UX_RULEBOOK.md](../standards/UI_UX_RULEBOOK.md) is required for future module/UI work under DEC-101 / WF-095. This documentation pass changes no runtime or data and does not re-run the historical audit or certify its remaining gaps.


### Implements online integration - 2026-10-01
See [release notes](../IMPLEMENTS_RELEASE.md), DEC-103 and WF-097. The reviewed Rotavator UI is integrated at /implements/ using separate online state/events and existing authorization. Main purchasing state is not migrated. Publication status must be read from the release evidence, not inferred from local checks.


**Publication verified - 2026-10-01 (DEC-103 / WF-097):** Implements purchasing is live at runtime `4217df4e2adbb15f0f50b2572d57a6f45ce50bd0`, deployment `sbnthqs1aw7xjr6lzhcdescc`, healthy. The actual reviewed workspace is online at module revision 1; no demo plans/orders were imported. Main workspace revision 1859 and all 36 existing orders are unchanged. Live assets/data/export/browser checks passed. The user-requested post-release full recovery ZIP passed checksum/archive/isolated startup verification with all nine tables preserved; five verified archives retained privately. Supersedes candidate-only status. [Full release evidence](../IMPLEMENTS_RELEASE.md).


### Implements navigation - 2026-10-02
DEC-104 / WF-098 replace the prototype sidebar with the main Farming Hub navigation shell. Global routes return to the original application; module sections remain scoped. No data migration accompanies this UI change. Read [release evidence](../IMPLEMENTS_NAVIGATION_RELEASE.md) for current runtime and preservation checks.


**Navigation publication verified - 2026-10-02 (DEC-104 / WF-098):** Runtime `5dc831e30df691a8508abe399e8a5765879566ff` is live and healthy. Shared logo/home/sidebar/icon/card navigation passed live browser checks; 334 tests passed. All checked assets match, Implements revision 2 and main revision 1859/36 orders are unchanged, and fresh pre-release recovery/retention passed. [Release evidence](../IMPLEMENTS_NAVIGATION_RELEASE.md).

**PTO update (2026-10-02, DEC-105 / WF-099):** [Pricing and verification](../IMPLEMENTS_PTO_PRICING.md). Quoted base plus explicit included transport drives BOM/MRP/PO and sales costs; destination selection survives model-copy. Actual Tally codes remain pending. Publication status is maintained in that release record.

**PTO publication verified:** Runtime 644b0e8, Implements revision 3, all 187 assignments and preserved main revision 1859/36 orders. [Full evidence](../IMPLEMENTS_PTO_PRICING.md).


### 2026-10-02 RO costings local implementation — DEC-106 / WF-100

RO costings is added under LAE Import, after Loading, using the current native application and shared shell. Independent RO records, actual before-GST workings, source flags, protected individual evidence, separate Suresh rates, revisions/history and bounded private imports are implemented. Local refresh: 30 exact ROs/473 evidence files; all record values and document bodies verified. Missing actual payment/expense coverage keeps all final rates pending. Existing main purchasing/Implements aggregates are not migrated. Both server and standalone browser flows verified. Not published. Next step: review local module, then follow mandatory recovery/deployment gates before production and private data import. Full contract: ../RO_COSTINGS.md.


**2026-10-02 important-document clarification:** DEC-106 document follow-up: important CI/inward-BOE panel is implemented above workings, with missing status, authenticated PDF viewing and upload roles. Local preview now includes original document access; production remains unpublished.


**RO costings published — 2026-10-02:** DEC-106/WF-100 is now live at runtime f1acbb2. Open LAE Import → RO costings. Thirty reviewed records/473 originals imported and verified; actuals stay pending where missing. Main data and concurrent Implements review retained. See ../RO_COSTINGS_RELEASE.md. Supersedes the local-only status above. Active release checkout: `PMS/ro-costings-release`, branch `codex/ro-costings-live`; refresh origin/main before further release work.


### 2026-10-02 — Production review module (DEC-110 / WF-104)

Implemented and locally verified in implements-current-cost, branch codex/implements-bom-syntax. Separate /bom/ uses the existing Implements truth through technical-only APIs and protected photos/CSV. Production Reviewer cannot access financial scopes even if assigned accidentally; no actual staff grants made. Components/fabrication/syntax proposal, checking, approval/rejection, history, filters and phone drawer are verified on an isolated actual-data copy. Pending approvals are the default. Indexed reviews use 100-record cursor pages; source aggregate remains bounded and module-wide revision contention is known debt. Recovery/live publication verification still required. Contract: ../BOM_SYNTAX_MANAGEMENT.md.


**DEC-110 / WF-104 publication verified — 2026-10-02:** BOM & Syntax is live at `/bom/`, runtime `1c7dd7337e8a2163b2f7b6e5f3929c900effcde2`, Coolify deployment `qm72hnfrzoh1yxsjj8a84sly`. Rolling health passed on attempt 1; no hosting settings changed. The server technical projection, eight served assets, authenticated technical CSV and unauthenticated denial passed live checks. Browser verified model filtering, S2.V58 component identities/PPM, cost-free syntax register and clickable Farming Hub home/module entry, without console warnings/errors. Synthetic checking/approval and production-role denial were verified in isolation; no live staff grants or checking records were created. Whole main state remained revision 1859 /36 orders and Implements state revision 8 /187 models /160 items, with exact pre-release hashes. All 30 RO payloads/revisions and 473 document identities/hashes/sizes also match the fresh recovery snapshot. The full 356-test suite passed. Fresh recovery archive CRC/member checksums, original/candidate isolated restores and five-archive retention completed before release. This supersedes publication-pending statements for DEC-110/WF-104. Evidence and screenshots remain private under ignored `test-output/bom-management/`.


### 2026-10-02 ? Production & Stock candidate (DEC-111 / WF-105)

Implemented in implements-current-cost, branch codex/production-stock. Cost-free `/production/` shares Implements physical balances through inventory-only atomic commands and dedicated indexed batch/unit/event/movement tables. Operator account defaults to technical scopes; no live grants or seeds. Native edge-case tests and isolated actual-BOM/synthetic-stock browser workflow cover drafts, issue, completion, dispatch and stage history. Phone navigation/focus and stock scroll regions verified. Recovery is verified and retained. Full regression and exact live publication verification remain the release gate. Whole batches only; ?Defect on material issue? clarification remains pending. See ../PRODUCTION_STOCK_MANAGEMENT.md.


**DEC-111 / WF-105 candidate verification ? 2026-10-02:** Complete native regression: 365 tests passed, zero failures/cancellations/skips. Focused production recheck: eight passed, including exact-once material issue/completion, atomic duplicate-serial failure, histories, current permissions, MRP and CSV/cursor bounds. Standalone review build and native bundle-contract checks passed; direct local-file browser review was unavailable under the browser URL policy. Authenticated isolated browser verified actual model BOMs with synthetic stock, stage history, unsaved-entry guard, serial dispatch and mobile drawer/internal scrolling. Final theme hook fixed and navigation reread without new console errors. Recovery/retention and live unchanged-state preflight passed. No synthetic fixture or private backup is committed. Publication still requires exact runtime/live checks.


**DEC-111 / WF-105 publication verified ? 2026-10-02:** Production & Stock is live at `/production/`, runtime `80f1d4077bfca1938549f0a106b740948c2d9f63`, Coolify deployment `ackxryduwq4lxhvy1rez0cjt`. Rolling health passed on attempt 1; existing hosting settings/volume retained. All 365 regression tests passed and the standalone build passed. Twelve browser-served assets match the release; the server-only production rules file is deliberately not a static route (the initial verification URL was corrected). Live technical APIs, stock CSV and unauthenticated denial passed. Production batch/unit/movement registers remain empty, with no demo import or staff grants. Whole main state stayed revision1859 /36 orders and Implements revision8 /187 models /160 parts, with exact pre-release hashes and physical balances. All30 RO payloads/revisions and473 document identities/hashes/sizes match the fresh recovery snapshot. Browser verified all17 active-BOM model choices, clickable Farming Hub home/return module entry and production dashboard without console warnings/errors; no live transaction was posted. Fresh recovery ZIP original/candidate restore, CRC/member checksums and five-archive retention passed before publishing. This supersedes publication-pending statuses for DEC-111/WF-105. Isolated tests and live evidence remain private in ignored test-output/production-management. Defective-material policy remains unconfirmed.
