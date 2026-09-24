# Domestic BOM picture list — 2026-09-24

Status: published and verified, 2026-09-24. Decision DEC-068 / workflow WF-062.

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


## Live release

**Publication verified, 2026-09-24:** runtime **9f7c3c804518dfed6db954bebdb7fa0cd2eeea58**, Coolify deployment **iqbhj3adw7rti1f0eyof60tk** (finished; running:healthy). **241 native tests, 66 local server/review browser checks and 42 live checks passed.** The picture/name click-to-add BOM editor is live. A fresh **464,872,834-byte recovery ZIP** was downloaded/packaged and checked against the server snapshot; isolated restored-copy candidate startup preserved all data. The archive includes the complete database/evidence and matching previous running source. Five-copy retention applied: 1 verified ZIP currently retained, 0 older ZIPs removed. Live business workspace is unchanged at revision **1513**; all accounts, uploaded bodies, audit rows, archives and retry receipts match the pre-release snapshot. Browser verification made **zero business-write requests**. This supersedes DEC-068 / WF-062's local-only status. Private evidence remains under test-output/bom-picker-release/ and backups/releases/.

Read-only live checks covered HTTPS, committed asset hashes, existing-account sign-in, pictured selection/search/segment filter, editable unsaved quantities/prices, retained entries, cancellation, assembly choices, desktop and 390/320px layouts, price-template navigation and the Import pipeline. The browser blocked all non-read API requests and no business write was attempted.


## Same-line removal correction — local candidate, 2026-09-24
DEC-069 / WF-063: selected picture-list rows now show Remove beside Added. The existing lower-table Remove remains. Catalogue removal uses stable identity, retains other draft inputs and returns focus to Add on the same row. Remove → re-add, empty selection, shifted row indexes, quotes/manual prices, saved revision history and Cancel were verified in both modes. 94 browser checks passed; desktop/390/320px screenshots inspected. This correction is not deployed and does not change the earlier release record above.


**Publication verified, 2026-09-24:** runtime **8f24c088b8fa25c7d098ccc39aed69d8f9f7b255**, Coolify deployment **nhhrvupva9q8qyiyq7zeusxn** (finished; running:healthy). Manual supplier prices with photos/item codes/Used in BOM and same-row BOM Remove are live. **242 native tests, 143 local server/review browser checks and 56 read-only live checks passed.** A fresh **464,874,649-byte recovery ZIP** was downloaded and verified, including the complete database/evidence and matching previous running source. Extracted-database integrity and isolated candidate startup preserved all data. Retention: 2 verified managed ZIPs, 0 older ZIPs removed. Live workspace remains at revision **1513**; accounts, evidence bodies, audit records, archives and retry receipts match the pre-release snapshot. No live business-write requests were made. This supersedes local-only status for DEC-069/070 and WF-063/064. Private evidence: test-output/manual-entry-release/; recovery archives remain outside Git in backups/releases/.
