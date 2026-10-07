# Implements procurement and pricing analysis

DEC-114 / WF-108 · 2026-10-07 · Implemented in the separate local demo; not published.

## Confirmed workflow

Saved PO → Draft → manager approval → Issued → internal delivery acknowledgment → Part delivered / Delivered → manager closure. Cancellation is allowed before any delivery. A partially delivered order can be closed with a reason, retaining its undelivered balance. Expected delivery changes retain their own event. Existing PO quantities, prices, supplier details, codes and images remain immutable. Existing review POs start as Draft; none are automatically issued.

The user explicitly excludes GRN. An acknowledgment records a delivery reference and item quantities, and adds precisely those quantities to component/model-fabricated-set stock in the same transaction. It never posts the undelivered balance. Duplicate delivery references, over-delivery, incorrect units, stale revisions, forged actors and rewritten history are rejected. Existing request receipts prevent a network retry from posting twice. Stock movements identify the PO acknowledgment. No supplier message is sent by marking an order issued.

Pipeline cards and 30-row pages link to the next PO action. Ordered, acknowledged and outstanding quantities remain visible. Overdue uses the latest expected delivery date. Draft/approved/closed/cancelled orders are excluded from incoming coverage. MRP displays issued outstanding quantities separately as On order; it still uses physical stock for its established earliest-month allocation. Open overlapping POs require review before creating another order. Expected purchases are never silently presented as physical stock.

## Supplier quotations

Purchased-component quotes retain supplier, item identity, reference, date/expiry, base rate, transport percent, transport per unit, MOQ and lead days. Comparison uses the latest effective quote per supplier; expired/inactive/MOQ-ineligible records are labeled. Landed rate = base × (1 + transport % / 100) + transport per unit, before GST. Selecting a currently eligible quotation updates the working supplier/landed rate and appends item price history. Transport is included once; saved POs/sales lists remain unchanged. This extension compares purchased-component quotes; common fabrication price/transport per kg stays in Purchase prices. Quote documents, RFQs, invoice matching and automated supplier communication remain future work.

## Partial production

The completion form accepts Machines completed now and optional serials for that tranche. Direct partial completion prorates the reviewed full-batch consumption basis, deducts only the tranche, updates consumed planning quantity, and creates only its finished serials. Cumulative rounding to three decimals preserves the final batch totals. Fractional piece consumption is rejected; the operator can issue the reviewed full-batch materials first instead.

Previously issued batches retain their entire original deduction/reserved planning quantity. Successive completions never deduct it again, including legacy batches without the new fields. Part completed remains open for later completion. Reversal returns exact cumulative issued quantities, restores consumed planning quantity and voids finished serials; dispatched units must be returned first. Existing roles, cost-free production API, append-only ledgers, stale-BOM checks and atomic duplicate-serial failure remain enforced. Batch register/CSV show planned/completed/remaining quantities. This supersedes the whole-batch-only limit of DEC-111.

## Price analysis

Existing sales lists already retain monthly revisions, multiplier-based forward prices, round-off and cost snapshots. New Price analysis compares selected-list prices against today's costs, calculates forward prices, and shows backward allowable cost using either a multiplier or the user's requested margin denominator.

- Forward price: before-GST cost × multiplier, with the existing ₹100 upward rounding for analysis.
- Backward multiplier target: before-GST sale price ÷ multiplier.
- User margin: (before-GST sale price − before-GST cost) ÷ sale price including GST × 100.
- Backward margin target: before-GST sale price − sale price including GST × target margin / 100.

GST is explicitly entered; there is no assumed tax rate. Existing saved before-GST margin fields retain their original meaning. Historical comparison uses saved old/new costs with parts/fabrication/other deltas. Unknown historic costs remain pending, and today's incomplete BOM shows its numeric known subtotal with a warning. Backward results are target allowable costs, not inferred actual historic costs. Current BOMs/rates never rewrite saved snapshots.

Recommended next modules, not implemented by this decision: sales-price draft/approval/effective-date activation; dealer/customer discount tiers and net realization; detailed BOM/rate/charge snapshots for price-list revisions; actual versus standard production cost variance; scenario comparison and margin exception approval. Confirm policies before extending financial approval or discount behavior.

## Implementation and verification

Procurement is an optional append-only state overlay. Server save replays new events/quotes with current actor permissions, validates authoritative quantities and stock effects, and retains immutable existing histories. No schema migration, framework, service, account grants, live transaction or LAE workflow change is introduced. Production continues to use its dedicated transactional tables and request receipts.

31 relevant purchasing/production/supplier/pricing regression tests passed, followed by 16 final production/procurement tests including legacy partial completion and manager/quote-history guards. Isolated desktop/mobile browser checks passed PO approval/issue/acknowledgment + stock, quote comparison/application, forward/backward/history and partial production; PDF/Excel lifecycle status and image readback passed. The review build passed. Final UI/export refinements require the refreshed browser/export check recorded in Current state. This is local verification, not live evidence.

UI-01/02/04/06/08/11/12 apply: reuse the existing shell, meaningful empty/error states, semantic controls, reasoned dirty dialogs, protected print identity and authoritative business guards. No new animation system is used.

Current volume fits existing bounded workspace limits (1,000 POs; 10,000 procurement events/quotes). Pipeline pages are 30 rows; quote history display is latest 100. At 10× use, measure aggregate payload/revision contention and event projection work. At 100×, normalize/index PO events and quotations and add per-entity commands/pagination before raising limits. No load-capacity certification is claimed. Future live publication still requires fresh matching-source recovery and exact runtime/data-preservation verification.


**2026-10-07 final local refresh:** final isolated desktop/mobile workflow passed after pipeline pagination, MRP On order links, partial counters and PDF heading refinements. PDF/Excel reread confirms PART DELIVERED in both heading/status and footer, preserved images and no obsolete review-only heading. Read-only browser check of the retained demo confirmed supplier/BOM/PO, pipeline, quotes, price analysis and production pages without runtime errors. Same demo database/origin retained; no live publication.

**2026-10-07 release preparation:** User authorized finishing and publishing DEC-113/114. All381 native regression tests and the standalone review build passed. A fresh713539584-byte live SQLite download matched the server SHA-256. Exact running4115898 runtime tree was reverified from GitHub;205 matching runtime/source files are packaged with the database and recovery guide. Original/candidate isolated startup preserved all20 tables. The638577552-byte recovery ZIP passed CRC/member hashes and extracted restore; its canonical private copy passed size/SHA readback. Seven verified recovery archives are retained, with no deletion. Existing Coolify main/HEAD Dockerfile configuration, port8000, /app/data persistent volume and HTTP /api/health gate were checked without modification. Publication is still pending exact deployment, runtime/served-asset and post-release preservation verification. Private evidence: ignored test-output/procurement-release-2026-10-07/.
