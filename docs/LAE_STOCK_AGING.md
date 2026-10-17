# LAE Stock Aging

LAE Division and LAE Import navigation expose `#/stock-aging`. This read-only view reuses the active approved closing-stock snapshot. Product groups form rows; selecting a quantity opens the shared accessible dialog with model/master code, item name, warehouse, age range and quantity for that exact product, unit and bucket. Search and warehouse, product, brand and unit filters apply before aggregation and drilldown.

## Age and quantity rules

Buckets are 0–60, 61–120, 121–180, 181–240, 241–360 and above 360 calendar days. Inclusive boundaries do not overlap. A separate Date pending bucket retains missing, invalid, conflicting or future dates. Never turn an unknown date into zero days.

Default basis is the original stock import-age date and default age-as-of date is the stock snapshot date. The user can select warehouse inward age or a later age-as-of date. Display both stock and age dates; advancing the age date does not refresh inventory quantities. Whole UTC calendar-day differences avoid timezone/DST rounding. Warehouse transfer dates do not reset the default import age.

When the stock import-age date is missing, use a purchase inward date only for the exact assigned RO identity, invoice, brand item code and unit, with one consistent supported date across all matching lines. Preserve RO suffixes and case. Trim/case-fold invoice, item and unit text only; never strip punctuation, combine variants or substitute a price-reference RO. Per-line purchase inward date takes precedence over the recorded RO inward date. Missing or conflicting matches stay pending. The popup identifies this as purchase-reference date evidence, not independently proven physical arrival. Warehouse-age mode uses the stock warehouse inward field only. Existing nonblank stock dates retain precedence, including future/invalid dates that require review.

Every source row contributes its original signed quantity to exactly one bucket. Zero and negative adjustments remain visible in the matching population. Keep units separate; no total across mixed units. Group models by the approved master identity within product/unit/bucket; preserve separate brand/item identities for unmapped models. Bucket totals must equal model-dialog totals and product totals must equal their bucket sums. No costing, assignment or snapshot mutation occurs.

## Implementation and access

`shared/lae-stock-aging.mjs` owns date validation, matching and aggregation. `GET /api/lae-stock-aging` uses the existing active stock store and an exact-RO, read-only purchase-date lookup. It requires the LAE Import scope and existing authenticated role gates. No new write endpoint, schema, stock import, credentials or financial calculations are introduced. Source data and dates are escaped in the UI. The standalone review contains no private dataset. Shared dialog behavior supplies focus trapping, Escape/Close and focus restoration (UI-03–07/10/12; HIG R021/R105–113/R135–140).

The workload inherits the stock snapshot limit of 50,000 source rows; RO lookups are deduplicated and queried in batches of 250 parameterized identities. Current deployment data is tens of thousands of rows and hundreds of model groups. This is not a 10x/100x capacity claim: substantially larger data needs indexed aggregation and paginated drilldown before lifting the source bound. It deliberately does not run the purchase-price deviation engine just to retrieve dates.

## Verification

Test every boundary, leap days, future/invalid/missing dates, exact matching and conflicting purchase dates, signed quantities, units, filters, model-dialog totals, source preservation, authentication/scope and stale-session handling. Independently reconcile the entire approved source to all bucket and model totals. Verify desktop/mobile controls and modal keyboard behavior, the review build, the exact production release, existing data fingerprints and protected API readback. Follow the standing recovery and publication gates.
