# LAE costing integration proposal

Date: 2026-09-26. Status: DISCUSSION / PROPOSED, not an approved implementation decision.
Scope: connect the supplied LAE_Costing_Handover_2026-09-26 to LAE Import. No runtime, financial record, approval policy or live deployment changed by this analysis.

## Evidence reviewed

- Handover 00_START_HERE.md; complete Markdown process guide; HANDOFF_DECISIONS_AND_LIMITATIONS.md; package summary/verification and RO index header/sample.
- Packaged costing skill, canonical input contract and Python arithmetic implementation/tests. All 30 packaged arithmetic tests passed in this analysis. This is helper validation, not validation of historical amounts or a live end-to-end integration.
- Current project docs/ARRIVAL_COSTING.md, shared/arrival-costing.mjs, relevant shared/domain.mjs and shared/references.mjs, server/store.mjs, baseline/rulebook and ERP reference/scale reports.
- Package manifest reports 260 RO folders, 14,049 copied files, approximately 2.27 GB, and four missing original paths. Those are package-reported counts; this analysis did not independently rehash every file or re-audit all invoices.
- Historical reports were not recalculated by packaging. Their zero-error checks do not override subsequently corrected interest/rental policies.

## Recommended structure

Reuse LAE Import Final costing as the arrival-cost foundation. Add a linked Costing & Stock workspace for RO/loading allocation, historical purchase lots, dated stock snapshots, movements, holding runs and weighted prices. Do not move this import-specific process into Domestic BOMs or assume FTWZ rules apply to Domestic.

New purchase path:
PO -> PI / approved supplier terms -> remittances -> shipments / invoices -> arrival and BOE -> reviewed invoice / shared-loading landed costs -> identified purchase lots -> stock/movement links -> dated holding valuation -> weighted item/brand cost.

Historical path:
Historical RO documents + FTWZ full purchase history + dated LAE/Tally stock export -> reviewed historical purchase lots -> same stock/movement and costing engine.

Historical lots do not create artificial purchase orders, remittances, approvals or goods-receipt postings. Link to an existing genuine PO only where identity is supported.

## What exists and what must be extended

| Area | Current application | Proposed connection |
|---|---|---|
| PO and item identity | Permanent references, saved PO lines and supplier identity | Reuse immutable IDs; add explicit historical aliases and match decisions |
| Supplier terms / payments | PO-specific terms, bank remittances and allocations | Suggest evidenced supplier INR and dates; review allocations at invoice/lot level, never copy a PO payment in full to every invoice |
| Shipping | Shipment lines, BL/loading/arrival milestones and commercial-invoice evidence | Reuse recorded dates and quantities; add shared-loading identity across invoices/POs |
| BOE / landed cost | Invoice/shipment costing, nine net cost components, shared BOE bounds, GST separate | Extend evidence-linked expense allocations, goods versus invoice-face-value basis, bank charges/packing/demurrage classification and BOE tariff-line detail |
| Completion / corrections | Provisional, Final, reasoned reopen, saved history | Preserve actual Final; add separate estimated/review status for historical or forecast values |
| Stock | No import batch snapshot/movement ledger implementing this handover | Dated manual CSV/XLSX imports, reviewed matches, partial warehouse movements and reconciled quantities |
| Holding | No implementation of handover engine | Versioned dated valuation runs, original principal, interest, retained rent, bonded duty scenarios |
| Weighted costs | No handover batch-weighted reporting | Brand/master costs with priced, paired USD+INR, INR-only, pending and deferred quantity coverage |
| ERP/Tally | Reference mapping and common export foundation | Start with manual stock exports; future connector uses stable entity identity and explicit posted/reconciled status |

## Core records and identity

Proposed additions: loading, supplier invoice and invoice lines, cost component, allocation, historical purchase lot, BOE valuation lines, stock import/snapshot rows, warehouse movements, product configuration, costing policy, costing run/results, and scoped review decision.

A loading links multiple invoices and original RO references, potentially across suppliers and POs. Each invoice retains its supplier identity and raw invoice number. Preserve the existing supplier-scoped duplicate guard. A repeated RO is not a duplicate invoice. Partial invoice/shipment relationships need explicit allocated quantities rather than multiplying the invoice amount.

Keep raw RO, assigned costing RO, and price-reference RO separately. Preserve suffixes, barcodes, invoice-based Sastha batch labels and raw source rows. Normalized keys assist matching but never replace raw values; report collisions. A barcode or Excel row number alone is insufficient as permanent lot identity.

Cost components have a source document/line, currency, GST-exclusive INR, actual/estimate status and allocation owner. Sum allocations back to the source total; prevent reuse of the same expense as another cost. Identical file hashes identify duplicate files, not automatically duplicate business expenses.

Permanent references for new entity types should extend the existing registry only after naming and migration review. Do not repurpose PO or supplier invoice numbers as internal lot keys.

## Two cost meanings, kept separate

1. Approved arrival cost: the historical invoice/lot landed cost before GST, fixed until a reasoned correction is approved.
2. Cost as of a chosen date: original physical cost plus applicable interest, net retained rent and duty adjustment, with component workings and policy version.

Holding runs never overwrite a PO price, approved arrival snapshot, payment or previous issued valuation. Re-running the same inputs must reproduce the same result. A new as-of date creates another result rather than adding interest to an old revised total. Ongoing stock valuation should not reopen a completed purchase merely because another day has passed.

All amounts here describe the handover's internal cost model. A customs revaluation is a scenario until supported by an actual assessment/payment; the software must not post it as paid duty or silently replace actual BOE costs.

## Calculation safeguards and policy differences

- Separate bank FX, supplier USD/RMB agreement, customs FX and landed INR/USD. Goods USD basis and invoice face value are distinct where packing/freight is separately billed.
- Current arrival calculation uses invoice-value allocation and two-decimal monetary inputs. Handover arithmetic uses Decimal precision, pooled loadings and richer component allocation. Decide and test conversion/rounding at the boundary; retain sum-conserving paise totals and immutable old results.
- Reuse the reviewed formulas and test vectors, not the old one-off generator chain. The production stack is JS ESM; port pure functions into shared helpers with decimal-safe arithmetic and cross-check against the Python reference. Do not deploy an unreviewed Python side service by assumption.
- The package's interest engine defaults to supplier-term-derived dates. Actual remittance dates are an explicit alternative mode. Keep both date bases visible; do not silently change the default simply because a payment date is available.
- Current payment gates use PI / SHIPMENT / BL triggers; costing terms include advance, telex, arrival and BOE fallbacks. Add a deliberate mapping; do not reinterpret authorization triggers to make a costing date fit.
- Current arrival Final requires complete actuals and evidence. A historical approved estimate or modelled holding cost must not bypass this gate or masquerade as an actual paid expense.
- FTWZ interest principal is supplier goods INR; elsewhere it is original full physical landed INR. Never use a revised total already containing holding additions.
- Preserve inward capacity/CBM and quantity-specific exits for rent. Retain rent after exit; subtract rent already in baseline once. A missing exit date remains pending. A stock snapshot alone cannot prove an exit date.
- Bonded duty changes need dated FX, tariff-line currency bases, original assessed duty and amount already included. Negative changes remain negative in the valuation layer; do not force them into the current nonnegative actual-expense fields.
- Physical inventory and machine-plus-motor sale-set costing are separate. BOM/configuration rules can reference shared items; a virtual motor must not add physical stock or be included twice.
- Missing is not zero. Preserve signed stock adjustments; use positive stock only for price weights. INR-only costs remain valid without invented USD. Report coverage before labelling a master average complete.
- Historical aliases, nearest-RO estimates and manual prices remain scoped to their approved item/lot/date; do not promote them to defaults for new purchasing.

## Historical corrections required before reuse

The handover explicitly identifies three numeric policy mismatches in the 19-Sep holding reports:
1. Full landed value was used as FTWZ interest principal instead of supplier goods value.
2. Some derived dates displaced actual recorded arrival/BOE dates.
3. Rent outside Sastha was set to zero instead of retaining accrued FTWZ rent through exit.

Keep these reports as dated evidence/layout examples. Rebuild from unchanged original bases, show before/after component differences, review exceptions and approve the corrected run before importing results as authoritative. Preserve accepted historic exceptions without reopening them or expanding their scope.

## Staff workflow proposal

One guided page with five steps: Link documents -> Check invoice and expenses -> Review landed cost -> Match stock and movements -> Review dated cost report.

Reuse existing Minimal design, tables, photo/item identification, manager approval and help patterns. Show short actionable gaps such as Enter FTWZ exit date for 20 pieces. Suggested statuses for discussion: Imported, Needs review, Ready for approval, Approved; individual values retain Actual, Approved estimate, Pending or Deferred. Do not record these proposed statuses as binding until confirmed.

Suggested permissions reuse current roles: Executives prepare/import; Managers/Admins review cost allocations and approve runs; existing Approval controls govern policy overrides. Final permissions and who may change global costing parameters need explicit confirmation before implementation.

## Staged delivery

Phase 1: connect the present purchase process to RO/loading/invoice costing. Add reviewed input import, preserved source evidence, payment/expense suggestions and reconciliation, richer landed-cost workings and comparison against Suresh's figures. Begin with one fully documented RO and one multi-invoice shared loading in a local trial. Keep existing Final rules.

Phase 2: manual stock summary integration. Import one dated LAE/Tally export plus full FTWZ history, review purchase-lot matches, preserve original stock and add a manual movement/exit register. No automatic stock posting or ERP connector.

Phase 3: holding engine and weighted reports, after movement data and policy mode are confirmed. Reconcile corrected historic sample outputs, then expand to all eligible stock; unresolved rows remain explicit.

Phase 4: ERP/Tally connector after the common records and reconciliation are stable. Imports/exports require idempotency and posted-versus-proposed separation; supplier statements, costing reports and financial vouchers have different meanings.

## Storage and release gates

Do not bulk-load the 2.27 GB handover and its stock history into the existing whole-workspace JSON state or app bootstrap. Current Store still parses and rewrites the workspace payload; the prior scale report explicitly leaves entity storage/paginated APIs open. Prefer indexed costing/snapshot tables, paginated detail and bounded calculation jobs, preserving server authorization/transactions/audit. This is an architecture proposal requiring design review, not authorization to migrate now.

Import files in a staging process using package-relative manifests and verified hashes. Review the reported four missing paths and source coverage before claiming completeness. Preserve historical versions; use selected entrypoints, not whichever filename says final. Store documents privately and keep them out of source/Git and public assets.

Acceptance: no source-row loss or join multiplication; cost allocations sum exactly; missing/estimated values explicit; aliases scoped; corrected principal/date/rent semantics; partial exits; mixed-currency BOEs; negative duty changes; motor double-count prevention; same-row weighted coverage; duplicate-import and retry protection; role checks; deterministic reruns; old snapshot preservation; page/load limits tested on representative data. Test first against isolated copies. Any later authorized release uses the existing fresh backup ZIP/restore/five-copy retention process.

## Immediate recommendation

Approve Phase 1 scope first. The existing Final costing screen is the useful starting point; stock ageing and holding should be a linked later capability. No live changes or bulk historic imports are warranted by this analysis alone.
