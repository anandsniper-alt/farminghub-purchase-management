# Domestic BOM picture list — 2026-09-24

Status: local candidate; not published. Decision DEC-068 / workflow WF-062.

## Use the new editor

1. Open LAE Domestic → Assembly BOMs or Model BOMs → open a BOM → Edit BOM.
2. Find an item by name/code or segment. Click its picture or name to add it. Added items show **Added** and cannot be duplicated. Model BOMs also list reusable assemblies; assembly BOMs list purchased parts only.
3. Click **Edit quantities & prices** to reach the selected rows. Enter quantities and INR unit rates before GST, or select a saved supplier quote. Unknown values can remain blank while drafting. Assembly rates continue to come from their parts.
4. Review the total, confirm complete composition only when all required parts are included, enter the revision reason and save. Cancel discards unsaved changes.

The six workbook columns, current saved revisions, pictures, permanent references and cost formulas are preserved. Adding/removing rows retains other edits, notes, reason, confirmation and search filters. A cleared supplier quotation stays cleared after row changes; typing a manual price does not alter Item Master or supplier quotations.

## Verification

- 16 focused native Domestic/quotation/startup tests passed.
- 66 browser checks passed across authenticated local server and standalone review modes, with zero browser runtime errors.
- Covered all 33 original source picture cells, active item filtering, name/code/segment search, empty results, picture/name/keyboard selection, duplicate prevention, removal/re-add state, quote selection, manual repricing of a previously quoted BOM, input retention, photo enlargement, validation, save/reload, revision history, cancellation, master-price preservation and assembly selection/calculated rates.
- Desktop and 390px/320px layouts checked; list clicks and Save remain usable with internal table scrolling. Screenshots retained privately under `test-output/bom-picker/`.
- Test data is disposable and local. No production records or files were changed and no deployment was requested for this candidate.

Reproduce: `node scripts/build.mjs --domestic-preview`, `node --test tests/domestic.test.mjs tests/domestic-prices.test.mjs tests/startup.test.mjs`, then `node tests/domestic-picker-browser.mjs`. Set `FH_PLAYWRIGHT_MODULE` and `FH_BROWSER_PATH` if the test runner/browser are elsewhere. The browser test starts both temporary HTTP servers itself.

Before publication, follow the mandatory downloaded recovery ZIP gate in BACKUP_RESTORE_RUNBOOK.md; retain the five newest verified release ZIPs.
