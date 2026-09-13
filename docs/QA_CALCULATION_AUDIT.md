# QA calculation audit

Scope: implementation contract review plus explicitly identified live observations. Synthetic transactions do not represent real funds. Browser evidence remains local and ignored. No invoice/price-list currency policy or existing historical rate was changed.

| Calculation / purpose | Formula, units and rounding | Inputs / example / edge cases | Evidence and conclusion |
|---|---|---|---|
| Monetary input | toMinor: decimal ×100, exact integer | 33.60 →3360 minor units. Nonnegative, maximum two decimals, supported safe bound. Negative/extra decimals rejected, zero accepted by parser but individual business rules may forbid it. | shared/domain.mjs; current native suite passes. |
| Exchange-rate input | toRate: decimal ×1,000,000, no rounding | 85.123456 →85,123,456. Positive; at most six decimals. Blank optional BOC →null, not zero. | Live QA01 captured six-place INR/BOC; native validation tests. |
| Currency conversion | floor((minor amount × fixed rate +500000)/1000000) | 3360 ×85,123,456 →286015 INR minor =₹2860.15. Half-up for supported nonnegative inputs; overflow rejected. | Central convertMinor; no separate BOC multiplication added. INR UI precision captured in QA01; exact integer assertion covered natively. |
| PO obligation | Σ(quantity × unitPriceMinor) | GJ5+KD3 atUSD14 =USD112. Zero TT quantity omitted. Case03:10×CNY10=CNY100. | Live QA01/03 visible totals and final settlement. |
| Term allocation | Cumulative proportionalSlices(total,percent weights); successive rounded cumulative targets yield individual slices | USD112 at30/70 →33.60/78.40. Weights must total100 at order validation. Zero total weight helper yields zeros; residual pennies conserved rather than rounding each independently. | Live QA01 and native proportional allocation tests. |
| Shipment obligation share | Split non-PI milestone by active shipment line value plus unallocated value | Two equal-value four-unit shipments split78.40 into39.20+39.20. Cancelled shipments excluded by helper; no cancellation performed live. | Live QA01 two BL allocations. |
| Due date | PI approval + term days, or final BL date + term days; shipment trigger uses ETD | 2026-09-12+60=2026-11-11; +120=2027-01-10. Calendar days, not banking/business days. Missing trigger gives no due date. | Live QA04/05 final finance tables verify dates. |
| Remittance equality | Σallocated remittance minor = bank remittance minor | 78.41 total versus39.20+39.20 rejected; correction78.40 succeeds. Separate authorization/currency/order checks still apply. | Live `q1-balance-invalid-result`, `q1-balance-saved-state`. |
| Original-order balance | PO obligation −Σactual supplier realization; reported equivalents tracked separately | USD112−33.50=78.50; correction33.60 leaves78.40. BOC7.2 does not change actual receipt. No automatic cross-order adjustment. | Live QA01 correction history and final zero balance. |
| Settlement status | SETTLED iff balance=0 and no allocation has null actual receipt; negative balance means excess to settle | Actual112 and zero pending receipts →SETTLED. Physical arrival does not itself settle finance. | Live QA01 and03; live QA12 actual101 on USD100 displayed EXCESS TO SETTLE, then correction30 restored balance70 with history. |
| Production reference | Max positive ERP-item productionDays; otherwise supplier reference; otherwise30 | BS20 item60 overrides supplier25. Starting2026-09-12 gives baseline2026-11-11. Base metadata alone is not the shared comparison source. | Live QA01; targeted native/review consistency tests verify fallback and hint. |
| Freight agent fee | O/F<3000 →USD60; O/F≥3000 →USD120 | 2999→60;3000→120;3001→120. Valid positive parsed O/F is a prerequisite. | Native boundary tests; live preview-010 confirms all three fee/benchmark boundaries; preview cancelled. |
| Freight benchmark | Ocean freight +agent fee, USD | 2999+60=3059;3000+120=3120;3001.25+120=3121.25. No currency conversion. | BUG-007 fixes parsing, not formula. Native/review grouped-value preview passes. |
| Freight variance warning | Booked USD − latest exact-route benchmark > configured threshold (default100) | Benchmark3920:4020 difference100 no warning;4021 difference101 warning. Container/via/origin/destination remain part of route key. | Live QA01 shipment1/2 confirmed boundary behavior. |
| Freight trend | Latest minus previous distinct week's final benchmark; >50 rising, <−50 falling, otherwise stable | Fewer than2 weeks →INSUFFICIENT. Up to6 recent distinct-week snapshots; later correction represents its week. | Source/native coverage; not a completed live trend test. |
| Complaint aggregation | Count ERP complaints grouped by explicit baseId/brand | Three brand totals sum to base total; MINOR/MODERATE/MAJOR/CRITICAL supported. | Live complaint-041 confirms GJ1 + KD1 + TT1 = BS20 total3 after reload. |

Unresolved policy risks carried from baseline: TD-04 different price-list and invoice currency treatment; TD-05 future-effective price activation. These require a deliberate product decision and cannot be cleared by a parser fix. Historical freight inputs were not scanned or rewritten; BUG-007 means malformed past cells could warrant an authorized data review before launch.

GST/tax filing, automatic landed-cost allocation, margin calculation, warehouse receipt posting and ERP accounting integration are not certified by this run. The current purchase baseline records cost entries and stops physical tracking at India-port arrival; it does not implement those downstream systems as an implicit result of PO settlement.


Acceptance-criterion correction: the initial planned overpayment rejection was not an established rule. CAL-06 explicitly preserves negative original-order balance as EXCESS TO SETTLE. The live test therefore checks visible excess and append-only correction, rather than adding a new hard cap to reporting of bank/supplier facts. No payment policy changed.


Final multi-order check: one USD60 bank report at INR85 was split USD30 each to QA12 and QA13. Each actual receipt30 leaves its original USD100 order with balance70. A second use of the same reference was rejected. The intentional excess receipt101 on QA12 was corrected to30 with explicit reason and evidence; earlier receipt history remains retained. Evidence: multi-payment-summary and multi-* UI captures. No additional financial rule was introduced.

Expanded live history verification: multi-history-original-expanded shows both events, null to10100 and10100 to3000 in USD minor units, with separate proof references and correction remarks. This confirms preservation through the browser, beyond the save notification.


Continuation: QA14 USD100 settled with independent actual30+70 receipts. Indian-bank85.123456 storage is verified locally; live register rounds to85.1235 (BUG-013 display fix). Optional BOC7.123456 does not calculate actual receipt. QA16 explicit90-day commitment from12Sept yields11Dec; BS20 ordinary60-day baseline remains11Nov, and QA14 shortened30 days yields12Oct. Synthetic freight100/100/300/100 plus60 fee produces160/160/360/160 and flat/rising/falling states. Four complaints roll up GJ2+KD1+TT1=4. No financial formula was changed.
