# Invoice arrival costing

Implemented candidate 2026-09-17, DEC-057 / WF-051. LAE Import only.

## Screen and workflow
Open an order > Final costing after actual India-port arrival. Attach a numbered commercial invoice to each shipment first. Add one costing per invoice and shipment, upload the inward Bill of Entry, and enter its number/date, invoice products, actual cost components and supporting payment/expense files. Multiple files use the existing 50 MB per-file limit. Uploaded files are evidence; this release does not extract amounts automatically.

Save incomplete workings as Provisional. Blank expenses mean unknown; enter zero only when confirmed. Review & finalize requires all actual cost fields, GST, complete BOE totals, positive supplier payment, support files, an allocation explanation and explicit confirmation. Purchase Managers and Admin can finalize/reopen by default; Admin can change these two stages in existing Approval controls. Existing executive edit rights apply to provisional entry. Read-only users cannot edit. Deleted orders and foreign scopes remain protected.

Final is a costing status, separate from physical PORT_ARRIVED and supplier settlement. The order's final guide step completes only when every active shipment has arrived, every attached numbered invoice has Final costing and invoice quantities cover every shipment line exactly. Existing financial settlement checks remain before completion. This is not a goods-receipt posting or a Tally voucher.

Reopen with a reason before a correction; the prior final snapshot and append-only audit are retained. Reopening makes costing pending until finalized again. Editing cannot silently overwrite a Final record. Costings receive permanent FH-LC-1 style references and appear in the existing reference/export foundation, without resetting any counter.

## Calculation specification
Purpose: reproduce the supplied workbook's Cost Workings method, with invoice and product breakdowns. The workbook establishes the nine-component total and cost-per-currency-unit formula; it does not establish product-specific customs valuation. The product breakdown is an invoice-value allocation shown for review and explicitly confirmed per finalization.

Inputs: supplier payment, BCD, SWS, ocean freight, insurance, clearance, miscellaneous, inland freight and liner charges, each in INR excluding GST. Enter amounts allocated to this invoice only. GST is separately recorded and excluded from the calculation; this does not determine tax credit eligibility. Avoid entering freight/insurance again if already contained in the supplier invoice/payment.

Formula: Total before GST = sum of the nine cost components. Invoice value = sum(quantity x invoice unit price). For USD invoices, USD value equals invoice value. For other supported currencies, USD value = invoice value / agreed invoice-currency units per USD. Record that conversion rate, date and source explicitly; do not substitute the customs valuation rate or an automatic market quote.

Cost per USD = Total before GST / USD invoice value. Product allocated landed INR = Total before GST x product invoice-line value / invoice total. Product unit INR = allocated landed INR / quantity. Outputs: invoice USD equivalent, total INR before GST, INR per USD, product landed line total and unit cost; separate GST information. Rates are cost factors, not a bank FX quotation.

Units/precision: monetary inputs and invoice prices at most two decimals; positive whole-number product quantities; FX up to six decimals. Amounts are stored as integer paise/cents. USD equivalent rounds half-up to cents. Shared cumulative proportional allocation conserves the exact invoice total in paise; residual paise follow the existing proportionalSlices method in saved line order. Factors/unit costs are calculated at six decimals and displayed at four; exported exact two-decimal line totals are authoritative for reconciliation, so displayed rounded unit cost x quantity can differ slightly. Integer-safe bounds and BigInt intermediates reject precision overflow.

Synthetic example: invoice USD 1,000; supplier payment INR 85,000; BCD 7,500; SWS 750; freight 2,000; insurance 500; clearance 1,000; miscellaneous 250; inland 1,500; liner 1,500. Total INR 100,000; cost per USD INR 100. Two products with USD 600 and USD 400 line values receive INR 60,000 and INR 40,000. Quantities 6 and 8 produce unit costs INR 10,000 and INR 5,000. GST entered separately does not change these costs.

## Shared entries and safeguards
- One costing per normalized invoice number and shipment; existing supplier-scoped invoice uniqueness remains unchanged.
- Invoice line total must equal the entered commercial invoice amount. Items must belong to the shipment; combined invoice quantities cannot exceed shipment quantities. Price changes from the PO require an explanation and never rewrite the issued PO.
- Shared BOE identity is normalized number plus date. Repeat full BOE BCD/SWS/GST totals on each allocation; allocations across all records cannot exceed those totals. Final records must agree on the same totals. When correcting a shared BOE total, reopen its affected Final records first; provisional records allow staged corrections, and finalization rechecks consistency.
- A single invoice may finalize before all invoices on a shared entry are entered; unused BOE allocations are not invented. The order's quantity/invoice completion checks are separate.
- Payment and general-expense allocation is entered and attested by staff with evidence. This release does not automatically match remittances, deduplicate expense bills or assign HS-code-specific duty by product. Use only where invoice-value allocation is appropriate; inspect the preview before confirming Final.
- Missing values never become presumed zero. Zero invoice value, invalid/future dates, missing/foreign evidence, duplicate items, unsupported precision and out-of-scope users fail visibly.
- Existing payments, cost register, PO snapshots, masters and previously assigned references are not rewritten.

## Verification
Native calculator/domain tests plus isolated browser checks cover server and standalone review modes, multiple uploads and evidence downloads, provisional/final/reopen, role controls, shared-entry bounds, product reconciliation, CSV export, mobile width and persistence. Supplied workbook formula checked privately; committed fixtures use synthetic data. Release evidence is recorded separately after deployment.
