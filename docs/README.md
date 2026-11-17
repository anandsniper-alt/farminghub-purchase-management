# Project knowledge index

- [2026-10-08 website alignment audit](UI_ALIGNMENT_AUDIT_2026-10-08.md): locally verified presentation fixes, coverage and release boundary; not a live deployment.

Reviewed 2026-09-26 against source commit `1297840ecac1dbe26893f086d32fd776383dedfe`. Start with [Current state](handover/CURRENT_STATE.md), then inspect relevant source. This index organizes existing authority; it does not replace confirmed product decisions.

## Read order

1. Read the concise [Project Rulebook](PROJECT_RULEBOOK.md).
2. Search only the affected module contract, relevant decision/workflow entries and actual source.
3. For UI work, use [UI rules](standards/UI_UX_RULEBOOK.md) and [Brand Rulebook](BRAND_RULEBOOK.md); consult relevant HIG reference IDs.
4. For release/data work, use [Recovery and release](BACKUP_RESTORE_RUNBOOK.md). For substantial architecture work, consult engineering/scale guidance.

DEC-170 removes mandatory full-history reading and duplicated release narratives. The reference rulebooks, baseline and old release reports remain searchable history; dates and current source must be checked before relying on them.

## One owner for each kind of knowledge

| Information | Authoritative location |
|---|---|
| Confirmed business rules, terminology, exceptions | PROJECT_RULEBOOK.md and linked module calculation contracts |
| Visual identity and interactions | BRAND_RULEBOOK.md; preserve Minimal and per-login guide preferences |
| Product/technical decisions and reasons | DECISION_LOG.md; substantial architecture entries use its ADR extension |
| Workflow evolution | WORKFLOW_CHANGE_LOG.md |
| Reusable lessons | PROJECT_LEARNINGS.md |
| Historical product/release evidence | CURRENT_PRODUCT_BASELINE.md and dated release reports |
| Current implementation map and API boundaries | architecture/SYSTEM_ARCHITECTURE.md |
| Current persistence and consistency | architecture/DATA_ARCHITECTURE.md |
| Capacity evidence, assumptions, targets, upgrade sequence | architecture/SCALABILITY_ARCHITECTURE.md |
| Current unfinished work | handover/CURRENT_STATE.md and TECHNICAL_DEBT.md |
| Scale risk status and closure criteria | handover/SCALABILITY_RISKS.md |
| Recovery and releases | BACKUP_RESTORE_RUNBOOK.md and COOLIFY_DEPLOYMENT.md |

Earlier documents contain dated “current”, “candidate” and “published” paragraphs. Read the latest applicable decision/publication entry before relying on one. Source proves implementation; it does not by itself prove business approval or deployment. A prior release test is historical evidence, not today's test.

## Module entry points

- [RO costings](RO_COSTINGS.md): before-GST RO costing, protected important documents and separate AI/Suresh workings.

- Import: [Manager workflow](MANAGER_WORKFLOW.md), [approval administration](ADMINISTRATION.md), [process exemptions](PROCESS_EXEMPTIONS.md), [arrival costing](ARRIVAL_COSTING.md), [references](ERP_REFERENCE_FOUNDATION.md).
- Domestic: [PO guide and release history](DOMESTIC_PO_RELEASE_REPORT.md), [assembly comparison](DOMESTIC_ASSEMBLY_COMPARISON_REPORT.md), [quotation comparison](DOMESTIC_PRICE_COMPARISON_REPORT.md).
- VMS: [module contract](VMS_MODULE.md), [parity boundaries](VMS_PARITY_REPORT.md), [workflow audit](VMS_WORKFLOW_AUDIT.md).
- Platform: [concurrency](CONCURRENT_ACCESS.md), [integration boundaries](INTEGRATION_BOUNDARIES.md).
- Proposed next feature: [LAE costing integration proposal](LAE_COSTING_INTEGRATION_PROPOSAL.md). Discussion only; the engineering audit comes first.

Keep credentials, private databases, recovery archives and raw test artifacts outside tracked documentation. Do not duplicate entire logs or rulebooks here.

## Latest local repair candidate

[Engineering repair report](ENGINEERING_REPAIR_REPORT.md) records DEC-082–084 fixes, current checks and remaining infrastructure/storage decisions. It does not supersede the last verified live release.


## Required UI/change rulebook — 2026-09-29
Read [UI and change rulebook](standards/UI_UX_RULEBOOK.md) before future modules or screen edits, together with [Apple HIG web adaptations](APPLE_HIG_APPLICATION.md). See [verified HIG/GSAP release](HIG_RELEASE_REPORT.md) for dated implementation evidence. DEC-101 / WF-095 makes these learnings permanent project guidance.


- [Implements online release](IMPLEMENTS_RELEASE.md): DEC-103 / WF-097, integration boundaries, verification and publication record.

- [Implements navigation correction](IMPLEMENTS_NAVIGATION_RELEASE.md): DEC-104 / WF-098, shared sidebar, home return and release verification.

- [Implements PTO pricing](IMPLEMENTS_PTO_PRICING.md): DEC-105 / WF-099, model allocation, transport basis, preservation and publication evidence.


- [Production & Stock: technical workflow, inventory, serials and limits](PRODUCTION_STOCK_MANAGEMENT.md) ? DEC-111 / WF-105.
- [Implements suppliers and pictured orders](IMPLEMENTS_SUPPLIERS.md) — DEC-113 / WF-107; supplier contacts, vendor item codes, cost-free identification images and immutable pictured PO exports.

- [Implements procurement lifecycle and price analysis](IMPLEMENTS_PROCUREMENT_LIFECYCLE.md): DEC-114 / WF-108, acknowledgment without GRN, pipeline, quotes and partial completion.

- [LAE Landing Prices](LANDING_PRICES.md): filtered RO purchase item register, quantity-weighted averages, historical source identity and release boundary (DEC-121 / WF-116).

- [Monthly plan entry and approval](IMPLEMENTS_MONTHLY_PLANNING.md): DEC-122 / WF-117; cost-free Planner and approved MRP quantities.


- [Utility price workings](UTILITY_PRICE_WORKINGS.md): DEC-134/WF-129, vendor/item/batch/barcode cost review and remarks.

- [LAE Sales Analytics](LAE_SALES_ANALYTICS.md): empty analytics workspace, confirmed grouping rules and pending source ingestion (DEC-137/WF-132).

- [LAE supplier payment planner](PAYMENT_PLANNER.md): local candidate; PMS-derived forecasts, monthly planning FX, audited dates and reconciliation boundaries (DEC-145 / WF-140).
