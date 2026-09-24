# Domestic supplier price comparison

Date: 2026-09-24. Status: tested candidate; publication pending.

Price lists now has **Compare prices**. Across suppliers shows the latest saved rate for each item and selected supplier, with quotation date/reference and lowest comparable rate. Same supplier compares two chosen quotations and shows old/new rates, INR difference and percentage change. Both views retain item photos, permanent item codes and current saved BOM usage, and support item name/code search.

The comparison is read-only and available to users with LAE Domestic viewing access. Existing quotation entry, evidence, references, BOM snapshots and permissions remain authoritative. Nothing is automatically repriced or saved by comparing.

## Calculation and interpretation

- Purpose: identify changes in one supplier's unit rates, before GST, freight and other charges.
- Inputs: old and new non-negative safe-integer INR paise rates, with the same UOM, from the exact selected quotation snapshots.
- Output: signed difference in INR per stated UOM and signed percentage change.
- Formula: difference = new rate - old rate; percentage = difference / old rate * 100.
- Precision: difference retains exact paise; percentage uses integer arithmetic, half-up to two decimal places. Example: INR 100.00 to INR 120.00 gives +INR 20.00 and +20.00%.
- Edge cases: explicit zero is a valid quoted price. With an old rate of zero, show the INR difference but no percentage. Missing lines are Newly quoted / Not in new quote, not zero. Different UOMs are flagged without calculating differences. Reject identical/reversed/cross-supplier quotation selections.
- Across suppliers uses latest quote date per item/supplier, with last saved winning same-date ties. A partial new quote does not erase an earlier rate for an omitted item; its actual older date remains visible. Lowest includes ties and requires at least two selected comparable quotations; mismatched UOMs are excluded. This is a unit-rate comparison, not an all-in purchasing recommendation.
- Historical comparison uses only the two chosen quotation line sets; omitted items are not filled from other quotations. Photos and Used in BOM describe current master/BOM context; quotation rates, dates, references and units come from saved snapshots.

## Verification

Five focused native cases passed: latest/partial quotations, tie dates and UOM comparison, exact historical snapshots, invalid quotation choices, and exact paise/percentage/zero handling. Six existing quotation tests and the browser startup graph also passed.

Full release regression: **247 native tests passed**, with zero failures. **49 manual quotation browser checks** also passed in server/review modes, including evidence generation, duplicate prevention, template download, file upload and preservation of existing BOM costs. Total focused local browser coverage for this comparison release: **97 checks**. The standard review build completed successfully and Git whitespace checks passed.

48 local browser checks passed across authenticated server and standalone review modes. A Domestic Viewer compared both modes without editing access. Checks covered supplier selection, item search, new/omitted/zero prices, quotation chronology, photos, 390/320px mobile scrolling, no runtime errors and exact data preservation. Desktop and 320px screenshots were visually inspected. All test quotations were disposable local fixtures.

Commands: `node --test tests/domestic-price-comparison.test.mjs tests/domestic-prices.test.mjs tests/startup.test.mjs`; `node tests/domestic-comparison-browser.mjs`. Ignored evidence: test-output/price-comparison/2026-09-24T10-39-08-076Z/.

Release gate: full native regression, build, fresh downloaded recovery ZIP with isolated restore rehearsal, healthy deployment, read-only live checks and database preservation. No populated live comparison is claimed if production has no saved Domestic quotations.
