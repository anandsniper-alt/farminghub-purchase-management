# Current state — engineering handover

**2026-10-08 subsequent user change (DEC-120/WF-115):** mascot launcher/tour disabled globally in the local candidate. UI-09 updated; this supersedes the visible-mascot requirement and the earlier clearance screenshot in the alignment audit. Six module shells, five standalone roles and mobile BOM footer verified; build/startup check passed. Not published.

**2026-10-08 local UI update:** an isolated candidate based on `f20e75d` repairs version-log wrapping, Implements phone/tablet navigation, BOM mobile controls and shared dialog/mascot clearance. See [alignment audit](../UI_ALIGNMENT_AUDIT_2026-10-08.md) for 118 route/viewport checks, standalone verification, 24 passing server tests and explicit limits. Not published; older module classifications below remain historical.

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


**DEC-112 navigation candidate (2026-10-02):** Division-first home and shared parent links implemented. LAE groups Order Management/Vendor Management; Implements groups purchasing/technical BOM/production stock with existing scopes. No schema or business-state edits. 11 targeted navigation/build checks and review build passed; live publication verification pending.


**DEC-112 / WF-106 publication verified - 2026-10-02:** Runtime `4115898fce6e555c2e531978b7e25399456c968f` is live; Coolify deployment `wokm8wjbxlp5hxjxerfwxqi1` completed with rolling health on attempt 1. Home and division hubs verified in the live browser, with no warning/error logs. Shared parent breadcrumbs and grouped selectors preserve existing standalone module URLs. Eleven targeted navigation/build checks and the standalone review build passed; isolated mobile and production-role flows passed. Twelve live assets match the release. Whole main state remained revision1859 /36 orders and Implements revision8 /187 models /160 parts with exact pre-release hashes; physical balances and empty production registers retained. All30 RO payloads/revisions and473 document identities/hashes/sizes match the fresh recovery snapshot. Original/candidate restore retained all19 existing tables unchanged. Recovery ZIP CRC/member checksums and canonical five-archive retention passed before release; verification receipts were repaired and reread after a local writer failure. Existing hosting settings and staff grants unchanged. This supersedes candidate publication-pending status. Evidence remains private in ignored `test-output/division-navigation/`.
**2026-10-06 Implements supplier extension:** DEC-113 / WF-107 is implemented locally: supplier master/item codes, cost-free identification imagery and pictured vendor PO exports. Native/browser/export checks passed. Deployment access is pending; the current live runtime remains `4115898fce6e555c2e531978b7e25399456c968f` until directly verified. See [module contract](../IMPLEMENTS_SUPPLIERS.md).
**DEC-113 release handover — 2026-10-06:** Source200c368 is pushed; functional regression, final supplier/technical/build tests, isolated browser and pictured PDF/Excel checks passed. Fresh recovery download/archive and exact running/candidate startup preservation passed. Post-push live runtime remains4115898 with unchanged main1861 / Implements17 / production state. Complete deployment through the existing Coolify application, preserve its current volume/configuration, then verify healthy exact runtime, protected assets, changed read-only views and data preservation. Private deployment access is required. Six recovery archives remain because automatic approval rejected pruning; specific user approval is pending. No live demo seed or business write was made.


**2026-10-07 — DEC-114 / WF-108 local demo:** PO lifecycle/pipeline, internal acknowledgment + stock (no GRN), purchased-component quote comparison, partial production and forward/backward/history price analysis implemented. Existing demo database and browser origin retained; live state untouched. Relevant regression 31 tests passed; final targeted 16 passed including legacy partial issue and manager/quote-history guards. Separate browser workflow/mobile and PDF/Excel identity/status checks passed; review build passed. Final refreshed UI/export check is recorded below. Live release is still unverified and requires current recovery/deployment access. See ../IMPLEMENTS_PROCUREMENT_LIFECYCLE.md.


**2026-10-07 final local refresh:** final isolated desktop/mobile workflow passed after pipeline pagination, MRP On order links, partial counters and PDF heading refinements. PDF/Excel reread confirms PART DELIVERED in both heading/status and footer, preserved images and no obsolete review-only heading. Read-only browser check of the retained demo confirmed supplier/BOM/PO, pipeline, quotes, price analysis and production pages without runtime errors. Same demo database/origin retained; no live publication.

**2026-10-07 release preparation:** User authorized finishing and publishing DEC-113/114. All381 native regression tests and the standalone review build passed. A fresh713539584-byte live SQLite download matched the server SHA-256. Exact running4115898 runtime tree was reverified from GitHub;205 matching runtime/source files are packaged with the database and recovery guide. Original/candidate isolated startup preserved all20 tables. The638577552-byte recovery ZIP passed CRC/member hashes and extracted restore; its canonical private copy passed size/SHA readback. Seven verified recovery archives are retained, with no deletion. Existing Coolify main/HEAD Dockerfile configuration, port8000, /app/data persistent volume and HTTP /api/health gate were checked without modification. Publication is still pending exact deployment, runtime/served-asset and post-release preservation verification. Private evidence: ignored test-output/procurement-release-2026-10-07/.

**2026-10-07 initial live verification:** DEC-113/114 is deployed in6200d68b0e415837c2dcad761d21152f14c7e89e through Coolify j63qhjmmywwv3ip3tkygnpks; rolling health passed on attempt1. Exact GitHub CI succeeded. Fourteen protected served assets match the commit; live PO PDF, stock CSV and unauthenticated denial passed. Browser verified pipeline/current draft next actions, supplier/quote/analysis views and cost-free S2.V58 photos. Post-release SQLite hashes match all19 protected tables excluding session login/logout; whole main1861 and Implements17 states match exactly.187 models,160 items,17 suppliers and12 existing Implements POs retained; no live demo or business write. A final live-check correction is being prepared: the production dashboard aggregate includes both issued and part-completed batches, so its link/filter must show both together. The remaining check is publication of that bounded navigation correction.

**Final correction release gate — 2026-10-07:** The fresh713539584-byte6200d68 live snapshot passed server SHA, integrity/foreign keys, original/candidate all20-table startup equality, ZIP CRC/member SHA and extracted restore equality. Its recovery archive includes212 exact committed runtime/source files and recovery instructions. Canonical private copy verified; eight prior/current recovery ZIPs retained with no deletion.17 targeted tests, standalone build and diff checks passed before the final navigation-correction push. Publication still requires its exact runtime/served assets and unchanged-state readback.

**Publication verified — 2026-10-07, DEC-113/114 · WF-107/108:** Final runtime0d00f0494c99891e618eca4b739deba82810f6bb is live at purchase.dvjassociates.com. Coolify oz9yiexawvjb8d8blbdfeb8d completed; rolling health passed on attempt1. Exact-commit hosted CI passed. All381 original regression tests passed; the final scoped17 tests include the additional issued/part-completed dashboard-filter guard. Review build passed. Fourteen protected served assets match the final commit; live pictured PO PDF, stock CSV and unauthenticated denial passed. Read-only browser verified pipeline/PO next actions, quotations, forward/backward analysis, suppliers, cost-free S2.V58 imagery and the corrected open-production route, without runtime warnings/errors. Existing12 review POs start as Draft; none were automatically approved/issued or acknowledged.

The main1861 and Implements17 whole states remain exactly equal to pre-release:187 models,160 purchased items,17 suppliers,12 saved Implements POs, existing rates/BOMs/plans/stock retained. Technical/production data is unchanged across the final deployment. Initial post-release SQLite comparison preserved all19 protected tables (sessions excluded for login/logout); final running/candidate restored-copy startup preserved all20 tables. Existing accounts, evidence, audits, RO records/documents and retry receipts were not migrated or seeded. No live business transaction, demonstration record or permission grant was posted. Fresh matching-source recovery archives passed server/member hashes, CRC, integrity/foreign keys and extracted/original/candidate restores; eight verified private archives retained, no deletion. Current volume/domain/port/single instance retained. This supersedes all preceding pending-publication statements for these decisions. Defective-material policy and further sales approval/effective-date/discount/actual-variance modules remain unconfirmed future work. Private evidence stays in ignored test-output/procurement-release-2026-10-07/.


**2026-10-07 local SKU finalisation update (DEC-115 / WF-109):** Explicit syntax status and filters now span BOM/Syntax, model catalogue/details, costing/downloads, monthly/annual model planning, sales comparison, price analysis and production choices. Read-only actual-data browser and focused tests passed; source recovery verified. Publication pending. See [contract](../IMPLEMENTS_SKU_FINALISATION.md).


2026-10-07 live verification: runtime `6cc83db6f958a0fa4e306e3c3d9ea9a6379c7d68`, GitHub quality run 37609099402 succeeded, Coolify deployment kfphbdsfepelflhztuguzram finished healthy. Nine authenticated assets match the commit exactly. Implements revision 17 and every saved business record are unchanged. Main revision advanced 1863 to 1864 solely for a concurrent personal preference update and its audit event; that update is retained. Live SKU filters return 20 Yes and 167 Not finalised. S1.V13 retains 76 components under 17 segment headings; FASTENERS filter returns 32. Verified recovery ZIP is retained in canonical backups with all nine archives. Publication evidence is in test-output/sku-finalisation/publication-verified.json.


2026-10-07 approved SKU list supersession: after the user explicitly said FOLLOW THIS LAST IMAGE, the latest 17 rows supersede the earlier 20 finalisation flags. Finalised models: S5.V2, S4.V20, S1.V16, S1.V14, S2.V50, S2.V33, S2.V35, S2.V14, S2.V16, S2.V10, S2.V12, S3.V14, S3.V16, S3.V47, S3.V10, S3.V12, S3.V45. S4.V4, S4.V12 and S4.V28 are retained but Not finalised. S2.V50 remains the L-frame 7 ft/48-blade model shown in the latest image; S2.V58 remains a separate stored V-frame model. All 17 shown specifications match the source image. Three minimal syntax corrections were submitted and approved through the existing BOM review workflow; source revisions 18–20 retain each model’s reasoned history. No other model fields, BOM component/fabrication data, item prices, stock, plans, supplier/PO records, sales history or production records changed. Live totals are 17 finalised and 170 not finalised out of 187 models. Ten selected models have a main BOM; seven retain their existing incomplete-component flags. This is a live data correction, with no code deployment. Fresh before-change recovery snapshot SHA/SQLite integrity and exact API readback preservation checks passed. Evidence is private under test-output/sku-approved-17/.

2026-10-07 password/editor release: e17cb17931e1b830e8fe2983db8fa62469bf96b4 is confirmed live and remote main. Quality run37632623605 passed390 native tests; local review build passed. Users & settings has administrator reset/current-password self-change dialogs with salted hashing, session revocation, audit/retry/concurrency guards; no real password was changed. Jayanth retains existing PRODUCT_MANAGER/BOM_MANAGEMENT rights and submits quantity corrections for approval. Both BOM editor dialogs now filter names/codes by search and segment while retaining hidden quantities. Isolated filtered submission retained76 rows and both edits; add/remove, no-match/reset and hidden invalid-field correction passed. Live FASTENERS editor returns32/76. Four runtime assets match Git exactly; main/account identities match the fresh snapshot. Concurrent S1.V14 approvals changed only history/revision and a cancelled production draft was retained; BOMs/prices/stock unchanged. Follow-up CSS fixes short-screen modal footer clipping; its fresh backup/restore and publication gates remain pending. Generated standalone review HTML remains local after automatic approval rejected remote publication of a potentially embedded-data artifact. Do not reset that local/unrelated work or prune retained archives.

2026-10-07 WF-110 final publication verified: runtime/remote release3f409a936b5723eb7d73a87cf09ebb0ac795ac4e, quality run37635789627 succeeded, Coolify deployment ktfb0xxkska1ukelvp0j0y7i completed14:25:13 UTC with healthy attempt1. Four served assets match committed bytes. Main, Implements, production and account identities exactly match the latest fresh recovery snapshot. All187 models preserved. Live component editor FASTENERS returns32/76; search/segment controls are outside the edit form, filter-only Cancel closes cleanly, submit remains within720px screen, and console is clean. Typed PPM/hidden-row retention and genuine unsaved-edit warnings were verified in isolation. Live empty Jayanth reset dialog was verified; no password or live BOM data was changed. Cost-free permissions and approval retained. Canonical recovery archive/source/20-table restores verified and11 archives retained without pruning. Generated review HTML stays local. Evidence: ignored test-output/password-reset-layout-release/publication-verified.json and live-final-editor.png. This supersedes prior WF-110 publication-pending notes.


2026-10-07 one-time live BOM approval reconciliation: user explicitly requested approving all pending changes without changing workflow. Fresh 714489856-byte production recovery snapshot matched server SHA-256 and passed integrity/foreign keys (20 tables); restored-copy rehearsal passed. The nine pending S1.V14 proposals were rebased by their actual deltas into one current-data correction and approved through the existing API (23bbd6eb-ea4c-46d7-9780-dc68921dbad8). Previously approved IMP-134 removal is retained. Original stale proposals retain their original baseline/history and were closed through REJECT with explicit supersession links; they were not silently rewritten or counted as individually approved. Live source revision24, review revision36 and pending count0 verified. Main state, production registers/stock, other models, fabrication, item rates, financial histories, plans, suppliers and POs compare exactly to before the operation; BOM-derived totals reflect updated quantities. No code, authorization, workflow or hosting changes. Private backup, rehearsal, action receipts and verification remain in ignored test-output/bom-approve-once-2026-10-07/.


2026-10-07 BOM Add component search candidate: code/name search with available-result count, duplicate exclusion and no-match guidance added to the cost-free technical editor. Search and selection remain outside the editable form; additions retain unsaved quantities and normal correction submission. No live data or workflow changes in this release. Publication is pending fresh recovery ZIP/restore, browser checks, exact CI/deployment and live verification. Private evidence under test-output/bom-add-search-release/.

2026-10-07 BOM picker local verification: 16 focused native checks and review build passed. Isolated actual-data browser proved code/name matching, no-match/already-added exclusion, search/selection-only cancellation without warnings, and a 76-line proposal retaining hidden PPM edits and the added item. A 390x760 check retained visible submit controls without horizontal overflow; browser error/warning logs are empty. Fresh production snapshot server SHA, exact running/candidate all-20-table restores, recovery ZIP CRC/member hashes and extracted restore passed; canonical copy hash readback passed with all12 archives retained. No live data writes in this release. Publication still awaits exact hosted CI/runtime/assets and preservation checks.


2026-10-07 WF-110 Add component search publication verified: runtime/remote release8add5b717fa446f0a42c90c10027360021c31745, hosted quality run37650972010 succeeded; Coolify deployment rexm8two2obkc0f5x5h1asfk finished rolling update16:21:51 UTC with healthy attempt1. Four served assets match committed bytes. Main, Implements, BOM reviews, production and account identities exactly match the fresh pre-release snapshot. Live search for32007 returns IMP-11 and selection enables Add component; no live quantity edits, additions or correction submissions were made. Isolated filtered proposal/mobile/cancellation preservation checks and16 focused native tests passed; review build passed. Canonical recovery ZIP and exact-source/original/candidate all20-table restores passed;12 archives retained without pruning. Approval/permissions/financial logic unchanged. Private receipts and live-search.jpg remain in ignored test-output/bom-add-search-release/. This supersedes the candidate publication-pending notes.


2026-10-07 WF-111 production audit candidate: 397 tests and 19 production/retry checks passed; multiple synthetic browser flows run without live BOM changes. Fresh recovery/source/all-table restores verified and 13 canonical archives retained. Publication pending; details in docs/PRODUCTION_AUDIT_2026-10-07.md.

2026-10-07 WF-111 production audit publication verified: runtime/remote main52dc76e63dbdfeabfb2a8f5b2e3680e55347f4eb, hosted quality run37662630422 success, Coolify cvubt4ynw6figxtu7z4qfk3j rolling update complete17:56:52 UTC/healthy attempt1. Seven served assets match committed bytes. Main, Implements, BOM/review, production stock/register and account identities are unchanged from the predeployment capture;187 models preserved/no reset events. Live dashboard/empty entry and console passed. No live BOM or demo writes.397 regressions/19 production-retry checks and isolated complete/partial/issue/shortage/preview/receipt/count/dispatch/return/reversal flows passed. Final running/candidate all20-table restores passed;13 canonical archives retained. Physical mobile-device verification remains outstanding. Details: docs/PRODUCTION_AUDIT_2026-10-07.md; private evidence: test-output/production-audit-20261007/. This supersedes candidate publication status. Postpublication evidence is retained locally; unrelated review HTML/domestic work remains uncommitted and protected.
# Stores candidate — 2026-10-08

DEC-117 / WF-112: individual segment issue, daily due/issued pick list and technical export implemented.405 native regressions/27 production-retry checks, review build and isolated browser complete/partial/shortage flows passed. Master BOMs, staff rights and live stock remain outside this change. Recovery/deployment/readback verification is pending; [contract](../STORES_MATERIAL_ISSUE.md). Synthetic data and evidence remain in ignored `test-output/stores-picking-20261008/`.
# Stores live — 2026-10-08

DEC-117/WF-112 verified live at `/production/#/picking`, release `f20e75dc7ec7e44261c6773e8c88c351c7c2b62e`. Exact hosted CI, healthy rolling deploy, eight served assets, technical report/download/auth checks and unchanged main/Implements/BOM/production/accounts passed. All405 native tests/27 production-retry checks and final build passed. Recovery214 source files/all20-table restores and14 retained private archives verified. No master BOM, live stock or staff grant changes; demos are local only. [Publication and operating contract](../STORES_MATERIAL_ISSUE.md) supersedes the candidate status. Private proof remains in ignored `test-output/stores-picking-20261008/`; final publication notes are local pending later documentation synchronization.

## User access layout candidate — 2026-10-08

DEC-118/WF-113 improves shared Settings/VMS matrix and account dialog alignment under the adopted UI/HIG rules.405 regressions,20 focused checks, standalone build and synthetic desktop/390px phone checks passed. No live account, credential, scope, BOM or costing writes. Fresh f20e75d recovery export is downloading; publish only after source/archive/all-table restore gates and exact CI/runtime/served-asset verification. See docs/USER_ACCESS_LAYOUT.md; private evidence in test-output/users-layout-20261008/.


## RO worksheet/Drive cloud candidate — 2026-10-04

DEC-119 / WF-114: transferred independent AI/Suresh source comparisons; reference-only bounded imports preserve the latest actual records. Protected persisted essential-PDF Drive references and an append-only learning/source-library link reuse native module authentication. Same exact RO/hash/role local/Drive documents share one card with both access options; archive/history remains intact. Scoped reference text and narrow-screen account-header wrapping retain mobile reachability. No stock or holding-cost changes.

Publication is authorized but remains pending network/secure-binding activation and the fresh downloaded/verified production recovery archive plus isolated restore. No production writes or 295-RO import by this task. Source-package counts and current live release require independent revalidation after access. See [cloud continuation](RO_COSTINGS_CLOUD_TRANSFER.md) and [API/import contract](../RO_WORKSHEET_COMPARISON.md).


**2026-10-08 RO local candidate — DEC-119 / WF-114:** October 4 comparison/private-link code is merged into main52dc76e ancestry, with one on-demand inline Drive preview and exact-host CSP. All newer main changes retained; duplicate transfer documentation IDs reconciled without deleting histories.20 targeted native tests, standalone build and authenticated/review synthetic browser flows passed. Actual Google permission/rendering, production backup/deployment and complete RO import remain pending. See ../RO_WORKSHEET_COMPARISON.md.

**2026-10-09 LAE Landing Prices candidate (DEC-121 / WF-116):** Native filtered purchase reporting extends the existing RO item records; same LAE access and financial precedence, full-filter averages and separate units, optional source-backed historical dates/brands. New code and metadata enrichment require their own native/browser/source-preservation and release checks. See [contract](../LANDING_PRICES.md); no live claim in this entry.

**2026-10-09 Landing Prices local verification:** 448 native regressions and final 17 focused tests passed; standard/domestic standalone builds, server/standalone responsive browser checks and full real-data Excel/PDF export validation passed. Fresh recovery archive/22-table restore and source-metadata enrichment rehearsal passed. Publish exact commit, verify unchanged production first, then import only the reviewed two metadata fields and independently read back. Private receipts remain outside the repository.


## Monthly plan entry candidate - 2026-10-09

DEC-122 / WF-117: separate `/planning/`, planning-only role, own drafts/submissions and Purchase Manager/Admin queue implemented. Approval alone applies selected-month quantities to purchasing/MRP. Current live 9722da5 ancestry, all 441 regressions, isolated desktop/phone and standalone checks passed. Two empty planning tables additive; no live users/plans/BOM/cost/stock writes. Publication pending recovery/CI/deployment/readback. [Contract](../IMPLEMENTS_MONTHLY_PLANNING.md).
