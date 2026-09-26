# Technical debt and operational gaps

Reviewed 2026-09-26. This register records evidence and follow-up; it does not approve a repair or supersede product policy. Capacity/recovery issues have one owner in [Scalability risks](SCALABILITY_RISKS.md).

| ID / scope / priority | Evidence and present status | Improvement / acceptance |
|---|---|---|
| TD-ARCH-01 GLOBAL High | Whole-state architecture and broad Domestic conflicts, current source; SC-01/10 OPEN | Follow the scale register; no duplicate migration rule here |
| TD-ARCH-02 VMS High | `vmsFollowups` selects only the latest interaction per vendor. A newer completed visit can hide an older open action. VMS-AUD-001 remains source-confirmed | Confirm all-open-action policy, update counts/list together, retain histories and test old-open/new-completed cases |
| TD-ARCH-03 VMS High | Outbox rejects a second pending interaction for the same vendor/type; `occurredAt` is compared to UTC `now.slice(0,10)`. VMS-AUD-002/004 source-confirmed | Independent visit identities and explicit business-date treatment; verify replay, conflicts and India-midnight cases without altering financial date policies |
| TD-ARCH-04 VMS Medium | Next follow-up remains mandatory; history/visit context and completion presentation gaps recorded in VMS-AUD-006–011 | Agree short visit/optional-action workflow; record policy decision, preserve audit; retest historical visit, ownership, corrections and retrieval |
| TD-ARCH-05 VMS Medium | Empty outbox sync calls render outside modals without a dirty-page check. Mechanism from VMS-AUD-013 still present | Refresh only relevant changes; verify unsaved settings/focus survive idle sync. Other historical VMS findings need targeted current browser reproduction, not blanket closure |
| TD-ARCH-06 GLOBAL Medium | `web/app.mjs` ~269 kB; `shared/domain.mjs` ~132 kB, dense code. Existing module factories already split Domestic/VMS | Extract one cohesive concern when touched, characterize behavior first; no blanket rewrite/reformat |
| TD-ARCH-07 BUILD Medium | Manual ESM concatenation/regex stripping in build; static allowlist and review list must match. Vendored JSZip outside package dependency inventory | Automate graph/build contract checks and dependency inventory; preserve standalone behavior. No bundler/framework selected |
| TD-ARCH-08 VALIDATION High acceptance gap | 273 native tests pass, but existing tests intentionally assert latest-only VMS behavior. No repository CI workflow or lint/type-check configuration found for active runtime | Add meaningful regression expectations when policy changes; automate required tests/build. Green tests do not prove the requested workflow is complete |
| TD-ARCH-09 OBSERVABILITY Medium | APP_VERSION/package version still 0.6.1-alpha.16; health storage text says isolated-local-pilot although deployed product has expanded | Define release build identity/health readiness; avoid using version string alone to certify served revision |
| TD-ARCH-10 SECURITY High review gap | Login throttle keyed to socket IP; synchronous password work; evidence type is extension-based; no malware scanning in runtime | Validate trusted-proxy behavior, safe rate controls and upload threat model in isolated tests; keep role/origin/CSRF and evidence access checks. No confirmed exploit claimed |
| TD-ARCH-11 FILES Medium | Upload and following business save are separate transactions; unlinked evidence can remain after cancellation/validation failure | Stage/reconcile evidence and define protected lifecycle before cleanup; never delete history or receipt targets blindly |
| TD-ARCH-12 KNOWLEDGE Medium → mitigated by DEC-081 | Dated rulebooks/reports retain stale “current” paragraphs (five tables, no background refresh/service worker, Import-only, theme toggle). Current source differs | Index and current architecture/handover now identify replacements while retaining history. Update owner documents with future changes |
| TD-ARCH-13 CAPACITY HARNESS Medium → corrected locally | Old benchmark deleted reference registry but kept already-assigned automatic numbers; failed on current allocator | Fresh blank automatic drafts and per-request outcomes now work. The subsequent load assertion correctly fails (18/20 acknowledgements/commits); this is not a passing capacity result |
| TD-ARCH-14 PRODUCT Partial | Domestic stops at issued/cancelled pictured PO; no receiving, actual invoice cost, stock/MRP or accounting connector | Discuss next phase explicitly; do not label PO subtotal or supplier quote comparison as final landed cost |

## 2026-09-26 repair status

- TD-ARCH-02/03/05: local fix verified for all scheduled actions, independent offline visits, India dates and dirty-page preservation.
- TD-ARCH-04: partial: direct visit shortcut, optional action, date-order history and completion outcomes verified. Rich context, corrections, filters/export remain open.
- TD-ARCH-07/08: local graph/syntax/static-route tests plus CI workflow added. Actual hosted CI execution remains unverified; no framework/lint/type migration made.
- TD-ARCH-09: read-availability health, optional validated source SHA and redacted slow/error logs added. Live configuration/external alerts unverified.
- TD-ARCH-11: VMS date rejection now precedes upload. General evidence staging/retention remains open.
- TD-ARCH-01: partial concurrency/transport/session improvements only. Whole-state storage remains; see SC-01/10 and [repair report](../ENGINEERING_REPAIR_REPORT.md).
- VMS-AUD-005: master/CRM location consistency fixed for new edits and already-stale unchanged links on explicit save. VMS-AUD-003: existing generic retry passed a fresh attached-visit lost-acknowledgement browser check; no duplicate retry architecture added.

The table above retains initial audit findings. This update records tested local candidate status, not deployment or complete capability parity.

## Historical findings that still need reconciliation

[VMS working-model audit](../VMS_WORKFLOW_AUDIT.md), [QA readiness](../QA_RELEASE_READINESS.md) and [ERP safeguards](../ERP_ORDER_SAFEGUARDS_REPORT.md) contain dated findings and fixes. This pass revalidated only the mechanisms identified above plus native tests; it does not relabel every old browser case. In particular, attached-visit reconciliation, stale location overwrite, inactive catalogue policy, evidence lifecycle and remaining UI/field validation require their original reproductions on the current build.

## Recommended order

1. Agree real workload/recovery objectives and owners; address SC-04/05 operational visibility and recovery.
2. Design bounded data access and Domestic concurrency (SC-01/10) before historic costing ingestion.
3. Repair agreed VMS operational blockers with focused workflow tests.
4. Establish repeatable release/CI checks and current release identity.
5. Implement versioned, bounded costing ingestion after its financial/data contracts are confirmed.

Budget, service choices and schema changes are not approved by this ordering. Each approved fix closes its original finding with dated evidence; do not erase earlier results.
