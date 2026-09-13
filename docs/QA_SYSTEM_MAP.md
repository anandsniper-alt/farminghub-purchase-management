# Live Purchase Manager QA system map

Run scope: 2026-09-12, purchase.dvjassociates.com, Ashok / MANAGER. The user's latest instruction limits execution to browser controls in production and retains every newly created test record. No direct API/database tests, alternate accounts, permission changes, cleanup, production fault injection or volume seeding are included. Source and project-memory reading support the map; they are not current live test results.

## Contract and dependencies

| Area | Current modules and dependencies | Relevant contract |
|---|---|---|
| Foundation | Native sign-in/session; role and LAE Import division; hash navigation; alerts; current/review modes; authored mascot | DEC-001,018,026; authenticated actor is authoritative |
| Storage/audit | Native Node HTTP and SQLite workspace, accounts, sessions, file BLOBs and append-only events; optimistic workspace revision | DEC-003; UI can inspect history but cannot prove database triggers |
| Vendor/commercial masters | Supplier fixed identity, active state, mappings, payment method/term, currencies, city/port and production references | DEC-007,011; existing approved masters preserved |
| Items/prices | Final Base Item parent; GJ/KD/TT ERP variants; supplier/base/currency price history; item-first production reference | DEC-007,025; price/invoice currency and future-effective price policy remain unresolved baseline debt |
| PLM | Base specifications and revisions/templates; ERP brand deltas/artwork; document evidence and approval; complaints roll up to base | DEC-008,018; absent approved specification warns; existing approved revisions must be selected |
| PO | Supplier → base → brand quantities → ERP lines; draft → submit → approve/issue snapshot → supplier acknowledgement → PI record/verify/approve → technical/artwork confirmation | DEC-006,008; revisions/amendments preserve issue history |
| Payments | Seven configured terms; milestone authorization; remittance allocation; SWIFT evidence; supplier actual receipt; balances; optional BOC reference | DEC-004,018,027; BOC metadata never substitutes actual receipt or conversion |
| Production/QC | Commercial readiness → initial payment/no-advance readiness → lead time → sample completion/approval → bulk start → bulk QC → completion | DEC-006,018; QC and sample gates remain |
| Shipping | Shipment plan/partial quantities → container booking/release → inland tracking → CI/PL → vessel/voyage → final BL → insurance → port arrival | DEC-006; no mandatory separate pre-dispatch QC; physical closure differs from financial settlement |
| Freight/tracking | Exact-route historical weekly rates; agent charge/benchmark/trend; booked variance; preview/commit weekly tracking; appended ETA events | DEC-007,025; matched-order edit authority required |
| Documents/imports | Multiple evidence uploads, 50 MiB each; single spreadsheet preview/commit; retained evidence links and audit | DEC-013; no replacement/cleanup of existing evidence in this run |
| Complaints | ERP-item complaint, severity, evidence, derived base and brand/base totals | Baseline: resolution workflow is partial; do not invent unavailable controls |
| Administration | User creation/role editing; recoverable PO deletion; stable serials; 13-stage approval controls | DEC-012,015–018; Ashok is not Admin; do not change grants or delete records |

## Full-flow cases planned

New PO prefix: `QA-ASHOK-0912-`. All remarks and uploaded evidence must say synthetic QA only; no supplier dispatch, purchase instruction, real payment or insurance coverage is represented. Keep records in the active list, including completed test orders and blocked/draft cases. Reuse existing masters without overwriting their values.

1. USD, missing PLM, 30/70, multiple brand lines/evidence.
2. Approved PLM selection if available to Ashok.
3. CNY pricing/invoice.
4. USD, BL+60 days.
5. USD, BL+120 days.
6. 10/20/70 staged payment.
7. 20/80 payment.
8. No advance / 100% BL+60.
9. Partial shipment and delayed production.
10. Revised PO preserving previous issue.

Cases that cannot advance under Ashok's current permissions are BLOCKED, not passed. Role denial can itself be a passing permission check while its full workflow remains blocked. Do not switch to Admin/Product Manager or alter approval controls to make a result pass.

## Scope exclusions and reporting

The supplied checklist's per-module minimums total more than its suggested 180–200 overall target. The matrix will preserve meaningful cases rather than compressing separate risks into fake passes. Browser-reachable tests may be executed; backend failure injection, alternate roles, database invariants, large-scale volume and destructive tests stay explicitly unexecuted/blocked in this live-only scope. Native historical results are not reused as current QA evidence. Overall full-system readiness cannot be certified by this restricted session alone.
