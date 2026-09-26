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
