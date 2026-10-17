# LAE current stock costing

The LAE Division and LAE Import navigation open `#/current-stock-costing`. This is a dated closing-stock view, separate from purchase quantities in Landing Prices. Search model descriptions, master/brand codes, barcode or invoice batch, RO and supplier. Filter model, group, warehouse, brand, unit, costing status and exact RO. Models aggregate the selected stock; selecting a master opens its batch rows.

## Cost and quantity contract

- Keep every source row and original batch text. Invoice numbers are valid Sastha batches. Do not deduplicate by barcode alone or merge different groups/units sharing a master code.
- Show recorded, assigned and price-reference ROs separately. Existing approved mappings are reference assignments, not newly established documentary ownership. The import must not remap goods from an item code alone.
- Original purchased landing cost and revised cost are both before GST. Revised physical cost reconciles to original cost plus interest, applied rent and duty addition. Use the approved Excel cost snapshot and explicitly display both stock and calculation dates. The screen does not imply a live inventory feed or automatically reprice stock from newer purchases.
- An approved unavailable-rent exclusion keeps its zero *applied* component and an explicit exclusion status. Unresolved costs remain null. INR-only purchases are valid without fabricated USD. Quantity-only goods remain in quantities but outside cost averages.
- Preserve signed net quantity, including negative adjustments. Only positive original source quantities weight averages. Expose original-priced, revised-priced and pending quantities separately.
- Effective INR/USD is paired total INR divided by paired total USD. Never average rates. Model and warehouse averages use all filtered rows, independent of page size. Keep different units separate.
- Percentage cost change compares the same positive-stock population with both original and revised costs. Do not subtract averages with different coverage.
- Main stock values are physical inventory. Historical motor additions and sale-set prices may be inspected as separate references; never add a virtual motor to physical machine valuation and count the separately stocked motor again.

## Persistence and access

The authenticated native API exposes `GET /api/lae-stock-costing`, `GET /api/lae-stock-costing/export.xlsx`, `GET /api/lae-stock-costing/export.pdf`, and administrator-only `POST /api/lae-stock-costing/import`. All require the existing LAE Import scope. Writes require same-origin, CSRF, an idempotency key and the expected active-snapshot revision.

Imports validate schema, finite amounts, component reconciliation, unique source IDs, hashes, dates, explicit scope flags and source row/net/positive/negative controls before atomically activating an immutable version. Prior snapshots and rows remain available in storage. No purchase, RO, price-list, stock-posting or primary-workspace fields are modified. Source workbook filename/hash and data hash accompany every version; source sheet/row and calculation ID accompany every batch.

Four additive SQLite tables hold snapshots, source rows, the active revision and append-only activation events. A new snapshot invalidates the read cache. Imports support at most 50,000 rows and a 48 MiB request. Exports use the complete selected result; Excel supports the row limit and PDF requires 5,000 or fewer selected rows. Existing and stock exports share a bounded two-job worker limit.

The current-scale workload is tens of thousands of rows. Do not claim support for ten or one hundred times that workload: larger datasets need chunked imports, SQL filtering/aggregation and background export jobs before increasing these explicit limits. Keep those changes separate from this module's initial rollout.

## Verification

Verify source workbook and manifest hashes, every imported identity/quantity, original and revised cached batch prices, independent model totals, missing-cost coverage, negative/quantity-only handling, filters and exports. Exercise authentication, role/scope denial, CSRF, optimistic concurrency, replay, immutable history and primary-workspace preservation. Check both the native screen and standalone review build; the latter deliberately contains no private stock snapshot.

Release requires the project's recovery and live verification gates. After activation, read back stock controls, selected model/warehouse results, export row counts and the untouched purchase/RO records. Retain dated source and publication receipts privately on the device.
