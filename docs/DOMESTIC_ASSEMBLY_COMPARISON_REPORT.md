# Domestic assembly supplier cost comparison

Date: 2026-09-24. Status: implemented and tested locally; not published. DEC-073 / WF-067.

## Use

Open an Assembly BOM and choose **Compare assembly cost**, or open **Price lists → Compare prices → Assembly totals**. Select a saved assembly, the suppliers to compare and the reference supplier in **Compare against**.

The summary shows total cost for one assembly, priced-part coverage, signed INR and percentage difference against the reference, and the lowest complete total. The breakdown shows each saved part's picture, code, name, quantity/UOM, supplier unit rate, calculated part cost and actual quote date/reference. Search narrows the breakdown only; totals always include the entire saved assembly.

This is a read-only supplier scenario using the current saved assembly revision. It does not adopt quotations into BOM prices, revise machine snapshots, create an order, confirm purchase quantities or save a supplier selection. Existing Domestic viewing permissions apply. Save BOM edits first if the desired quantities/composition have changed.

## Calculation contract

- **Purpose:** compare suppliers against identical parts and quantities for one assembly.
- **Inputs:** saved assembly part identities, UOM and positive quantities in thousandths (`quantityMilli`); latest saved INR quote rate per part/supplier in paise (`rateMinor`). Quote UOM must equal the saved BOM UOM. PCS/SET quantities must be whole; existing maximum quantity is 1,000,000.
- **Formula:** line cost in paise = floor((quantityMilli × rateMinor + 500) / 1000). Complete assembly cost = sum of the rounded line costs. Difference = supplier total − reference-supplier total. Percentage = difference / reference-supplier total × 100.
- **Outputs/units:** INR per one assembly, signed INR difference and percentage; no GST, freight, order quantity, minimum order, discount or other commercial condition is inferred.
- **Rounding:** reuse `domesticBomTotals`, with BigInt multiplication and half-up rounding to paise per line before summing. Percentage reuses `domesticPriceDifference`, half-up to two decimals. Invalid/unsafe values and overflows cannot produce a complete total.
- **Example (synthetic only):** one frame plus four bushes. Supplier A: INR 1,000 + 4 × INR 12 = INR 1,048. Supplier B: INR 950 + 4 × INR 15 = INR 1,010. B differs from A by −INR 38 (−3.63%). With B as reference, A is +INR 38 (+3.76%). A quote for the frame only is incomplete even if its subtotal is lower.
- **Completeness:** composition must be explicitly confirmed and nonempty. Every part needs a valid saved quantity and valid same-UOM INR quotation. Unknown quantities, nested assemblies, duplicate parts, absent/invalid prices, currency/unit mismatch or overflow prevent a total. Existing manually entered BOM rates are not substitutes for missing supplier quotes. A Draft BOM with confirmed composition and known quantities can be compared even if its saved manual costs are pending.
- **Missing versus zero:** partial quotations show a clearly labelled priced-parts subtotal, never a whole assembly total. Explicit zero rates remain valid. A zero reference total allows an INR difference but no percentage. Incomplete reference/supplier totals have neither difference nor percentage.
- **Quote selection:** latest quote date per part/supplier; last saved wins same-day ties. A partial later quotation retains earlier rates for omitted parts, with their actual dates/references visible. No fallback to an older matching-UOM quote when the latest quote uses a different UOM. This reuses DEC-071 rather than inventing a new quote-selection policy.
- **Ranking:** mark the lowest only among at least two complete selected suppliers; equal totals tie. Incomplete suppliers never compete with complete totals. Removing the reference supplier selects the first remaining supplier and updates the visible selector. No selection yields guidance.
- **Revision scope:** comparison uses current saved assembly lines, not an older assembly snapshot nested in a machine BOM. Images and names come from the saved line snapshot. Existing machine costs/history remain unchanged.

## Verification

**256 native tests passed**, including nine focused assembly cases: independent expected totals/deltas, partial/missing values, unconfirmed/empty BOM, exact units, per-line half-up rounding, zero/ties, validation/overflow, scope/type guards and date precedence.

**104 new browser checks passed** in authenticated server and standalone review modes, for both Manager and Viewer. They verified both entry paths, assembly/supplier/reference selection, independently expected totals, incomplete-quote handling, unconfirmed/empty composition, full totals under search, photo enlargement, mobile 390/320px internal scrolling, no JavaScript errors and exact before/after state equality with zero business-write requests. **48 existing supplier/history browser checks passed** after the extension. Total: **152 browser checks**.

Desktop and 320px screenshots were visually inspected. The standard and Domestic preview builds succeeded. All fixtures were isolated local sample suppliers, quotations and compositions; they are not approved business BOMs or actual supplier offers. No live data was read or changed for this task and no release was made.

Commands: `node --test tests/*.test.mjs`; `node scripts/build.mjs --domestic-preview`; `node tests/domestic-assembly-comparison-browser.mjs`; `node tests/domestic-comparison-browser.mjs`; `node scripts/build.mjs`.

Private local evidence: `test-output/assembly-comparison/2026-09-24T15-23-33-482Z/` and `test-output/price-comparison/2026-09-24T15-24-28-489Z/`. Test fixtures, results and demo previews must not be imported into production. Any future publication still requires the fresh verified downloaded recovery ZIP and retention policy in BACKUP_RESTORE_RUNBOOK.md.
