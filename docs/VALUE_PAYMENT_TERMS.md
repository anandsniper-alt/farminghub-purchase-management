# Supplier payment terms: percentages, fixed advances and balance

2026-09-26 — DEC-092 / WF-086. Implemented locally; not published. This replaces the proposed Manual advance-at-capture flow (DEC-090/091). The user requested rebuilding the existing Payment Terms Master instead. Earlier trial history remains available, but its commands, approval stage and automatic Manual template are absent from the current runtime.

## Working flow

1. Vendor master → Payment terms → Add/Edit terms. Manager/Admin master permissions and mandatory reason remain unchanged.
2. Name each milestone. Choose Percentage, Fixed amount, or Remaining balance. Fixed amount requires an explicit USD/RMB/INR currency; the currency must match the eventual PO. Three rows are visible initially; additional optional rows retain the existing nine-row limit.
3. Select its stage: Order confirmation / PI approval; Before loading; or Against telex / BL date. Credit uses the agreed days after the BL date. This retains the existing PI/SHIPMENT/BL trigger model; it does not create a new telex-release timestamp or release authorization.
4. Select the saved template on a new PO. The PO retains its own terms snapshot and may tailor its milestone fields before submission. Changing the master never updates existing POs.
5. Existing issued POs use More actions → Propose PO revision → Revised payment terms. Existing revision approval, supplier reconfirmation and PI verification remain required. Value/terms changes involving the new fixed/balance rules are blocked while active payments exist; use the controlled correction/reconciliation process first.
6. Initial Payment Capture records the already-agreed PI advance with bank evidence. It does not define a second Manual agreement or introduce a separate approval stage. Initial-payment completion still requires the exact outstanding initial obligation. Other authorized milestone allocations can be recorded separately through the existing payment screen.
7. Second advances before loading use shipment milestones. Against-telex/credit balance uses BL milestones. Reported payments, actual supplier receipts, FX and void history remain separate. Voided allocations stop counting toward paid obligations; replacement bank entries still need a unique reference under the existing rule.

## Calculation contract

**Purpose:** turn the PO's agreed terms into exact obligations in PO-currency minor units, without repeating fixed advances on each shipment.

**Inputs:** PO total T; milestone type; integer percentage p; fixed major-unit amount A and currency; trigger and 0–365 credit days. Missing type means legacy Percentage. Fixed amounts allow up to two decimal places and must be positive.

**Formula / output:** fixed obligation = A × 100; mixed percentage obligation = round-half-up(T × p / 100); final balance = T minus all earlier obligations. Percentage bases are the full order value, not the diminishing balance. Outputs are integer minor units. Percentage-only agreements still total 100% and use the unchanged cumulative proportional rounding algorithm.

**Validation:** fixed/mixed terms require exactly one final Remaining balance row; balance cannot be an initial PI advance. Reject unsupported types/currencies, fractional percentage inputs, negative days, excess total advances, mixed fixed currencies and a fixed currency different from the PO. No silent FX conversion. Exactly fully prepaid orders have zero remaining balance; omit the zero obligation from the schedule.

**Shipment allocation:** divide each non-PI milestone across active shipments and unallocated order value using the existing cumulative proportional allocation. The total always equals the original milestone; USD 5,000 does not become USD 5,000 per shipment. PI advances stay order-level. BL credit dates derive from each actual BL date; missing dates remain pending.

**Examples:** USD 20,000 PO with USD 5,000 first advance leaves USD 15,000 against telex. USD 20,000 PO with USD 5,000 at confirmation and USD 5,000 before loading leaves USD 10,000 at the agreed BL/credit stage. A USD 4,000 PO cannot use a USD 5,000 advance template.

**Tracking / protection:** fixed/balance allocations cannot exceed the remaining authorized milestone. A voided initial advance cannot clear subsequent sample/production/shipment commands just because a historical production timestamp exists. Existing approval controls, prerequisites, evidence, transactions and optimistic revision checks remain authoritative.

## Verification and limits

- Full native suite: **307 passed, zero failed**, including nine new financial/master/workflow tests. Generated standalone build and build-contract checks passed.
- Actual native browser: saved/reopened USD 5,000 + USD 5,000 + 60-day balance in a separate local copy; verified revised-term selection then cancelled the revision. No copied PO was changed in that check.
- Standalone browser: saved/reloaded USD 5,000 + remaining balance against telex; no runtime errors. Mobile editor checked at 390px with no horizontal dialog overflow.
- Original captured live data/evidence stays private and ignored. The sample master entries are local-only. No live business command, push or deployment was performed for this rebuild.
- No new telex-release gate, accounting ledger, actual bank transfer, automatic currency conversion or change to logistics terms is claimed. Production publication still requires user approval and the mandatory verified recovery ZIP.

## Engineering impact

Shared enforcement and summaries live in `shared/domain.mjs`; forms reuse `web/app.mjs` helpers. Existing command names, server transactions, scoped roles and master version/audit behavior are reused. No schema migration or dependency is needed. Cost is bounded by nine milestones and existing per-order shipment/allocation lists; this work does not resolve the known whole-workspace storage scaling limitation.

Follow-up display verification: typed PO/print summaries include payment stage and credit days from the saved terms snapshot; legacy percentage-only print wording is retained. The nine focused tests and review build passed again after this label refinement. Preservation verification confirmed unchanged original orders, payments, vendors, items, files and Domestic POs; only two local example templates and their two audit events were added.

## Publication verified — 2026-09-26
DEC-092/WF-086 is now live in runtime `3ba808f7978be0ce8d3cdc3af84e569cafa294a0`, together with DEC-093 RO loading and payment correction. This supersedes the local-only status above. Existing live agreements and payments were preserved; no sample master entries or automatic term conversions were published. Full release evidence: [RO loading and payment corrections](RO_LOADING_AND_PAYMENT_CORRECTIONS.md).
