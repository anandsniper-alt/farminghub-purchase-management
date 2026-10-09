# LAE Landing Prices

2026-10-09 · DEC-121 / WF-116 · User-confirmed feature; publication is verified separately.

Open LAE Purchase / LAE Import → **Landing Prices**. This is a read-only purchase-price register derived from the existing RO item records. It does not import stock, alter invoices, change saved costs or add holding charges.

## Register

One row represents one recorded purchase item line, retaining its exact RO, supplier invoice, original quantity and item identities. Columns show RO, inward date, vendor, item name, master code, brand code, brand, USD per unit, AI INR per USD, before-GST INR per unit and quantity. The RO links to its existing item/cost/document detail.

Year and month refer to the recorded purchase-line inward date, falling back to the RO inward date only when line-level evidence is unavailable. Filter by supplier, product, brand, unit and costing status; search RO, invoice, item identity or description. Missing dates and identities remain explicitly unavailable. Use the purchase-line brand first; otherwise resolve a brand only from a supported, unambiguous master mapping. A similar code is not authority to invent a brand or change a master code. Purchase quantity is not current stock or closing quantity.

Optional `purchaseItems.rows[].brand` and `inwardDate` preserve dated source identity without modifying the original RO header. Legacy records omit them and retain their previous shape. Enrichment from the original FTWZ workbook requires the exact source SHA-256, sheet and row plus matching RO, invoice, item code and quantity. Preserve all existing fields, working IDs, prices, source hashes and source corrections. Publish only the two reviewed optional fields through the existing reasoned, revision-checked import; do not ship source data in code. A source brand such as TITAN takes precedence over a conflicting current master brand for that historical purchase.

Use the existing item-cost precedence: complete calculated actual costing, otherwise the item's selected eligible Historical/Provisional AI reference. Partial/Pending references cannot price a line. Suresh rates never silently fill an AI gap. Source currency and approved USD equivalence remain distinct from landed INR per USD. GST and new interest, rent or duty revaluation are not added here. Existing machine/motor configurations remain as recorded; this view never adds a virtual motor to physical purchase lines.

## Filtered footer

The footer covers every matching row, including rows on other pages, and refreshes when a filter changes. Sorting and pagination must not change its population. Report total purchase quantity and priced/pending coverage beside the averages; never imply a complete average when values are missing.

For each line let q be its positive recorded purchase quantity. Zero and negative quantities do not receive average weight; retain their original row values. Compute separate summaries for pieces and sets; never combine incompatible unit quantities in a per-unit average.

- Average USD per unit = sum(q × USD per unit) / paired priced quantity.
- Average INR per unit = sum(q × supported before-GST INR per unit) / the same paired priced quantity.
- Effective INR per USD = sum(q × INR per unit) / sum(q × USD per unit), on the same paired population only.

Unknown is not zero. Explicit zero is retained where the existing validated source permits it. A zero total USD denominator has no effective conversion. The primary USD/INR averages use the same paired population so their effective conversion reconciles; USD-only coverage is retained separately. Provisional/reference status remains visible. ROs without item lines are reported in coverage, not replaced with invented product rows.

## Downloads

**Download Excel** and **Download PDF** export every matching line in the selected sort order, not only the visible page. Include the selected filters, generation time in Asia/Kolkata, statuses, quantity units and matching weighted summaries at the bottom. Excel preserves typed numbers/dates, literal source text, filterable columns, frozen headings and RO hyperlinks; PDF uses repeated headings and readable landscape pages. These are calculation snapshots. Downloading does not save or change financial data. Standalone review has no authenticated export connection and directs the user to sign in.

Both endpoints reuse server-authoritative reporting and LAE access, with a 25,000-row export ceiling, bounded process time/output and two concurrent export jobs. Larger selections fail visibly and request narrower filters; they are never silently truncated. Reuse the already-deployed Python/openpyxl/ReportLab export runtime. No new deployment dependency is introduced.

## Architecture and access

Reuse the native ESM shared calculation layer, RO store, existing LAE authentication and Minimal table/filter controls. The API supplies a bounded page, stable ordering, filter choices and complete filtered totals; the browser does not request every RO detail. No migration, new service, package dependency, access grant or private static dataset is required. The standalone review uses the same projection and arithmetic on its isolated records.

Use exact recorded identifiers for joins and routing, escape displayed text, and keep protected source documents behind the existing RO detail. Page size is bounded. Invalid filter/sort input is normalized or rejected; pending numeric values sort last. Filter state survives an RO drill-down and browser Back.

Current volume is approximately 295 ROs / 1,068 purchase lines, subject to fresh release readback. Projection caching must invalidate on both RO and item-master changes, and authorization must run on every request. At 10x, measure cache rebuild and full-filter aggregation latency; at 100x, normalize/index the reporting projection before claiming interactive capacity. A bounded response is not proof of bounded collection-processing cost. Existing whole-workspace and synchronous SQLite risks remain in the scale register.

## Verification

Verify unequal-quantity and unequal-USD weighted examples, independent missing-value populations, zero/negative quantity, provisional/partial reference handling, sorting/filtering/page invariance, safe master matching, cache invalidation and LAE-only access. Verify server and standalone builds, keyboard controls, narrow table containment and read-only RO navigation. Before release, follow the existing fresh recovery/archive/isolated-restore and exact live release/data-preservation checks. Dated results are appended after execution.

### 2026-10-09 release candidate verification

All 448 native regression tests passed before final export and sign-out hardening; the final 17 landing-price data, UI and export tests also passed. Both standard and domestic standalone builds passed. Server and standalone browser checks covered combined filters, sorting, RO drill-down/back, empty results, disabled unauthenticated downloads, desktop and 390px phone layouts. The real-data export audit reloaded all 1,068 rows / 14,952 Excel cells, checked the same unit-separated summaries and visually inspected the 72-page PDF and long descriptions. No source price or quantity was changed.

A fresh production recovery ZIP, all-22-table restore and canonical retained-copy checksum were verified before publication. Exact original workbook evidence supports optional historical metadata for 1,057 lines across 258 ROs; the isolated enrichment rehearsal preserved every other field. Live release and any metadata import require separate exact-SHA/readback receipts, not a build-success inference.
