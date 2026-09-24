# Manual Domestic price entry — 2026-09-24

Status: tested local candidate, not deployed. DEC-070 / WF-064. Includes the same-row BOM Remove correction in DEC-069 / WF-063.

Price lists → **Enter prices** allows typing supplier INR rates beside source photos, item names/codes and **Used in BOM** labels. Supplier, date, quote reference and reason/conditions remain required. Search and segment filtering retain typed rates. Review shows priced rows, distinguishes explicit zero, and offers **Back to edit prices**. Save retains a generated values-only XLSX evidence file, source method, actor and existing quotation reference/audit history. Upload/download remain available. Saved BOM snapshots and Item Master rates are preserved.

## Current verification

- 17 focused native Domestic, quotation and startup tests passed, including manual evidence metadata, role restrictions, all-or-nothing validation, duplicate protection and master/BOM preservation.
- 49 manual-price browser checks passed across authenticated local server and standalone review; no runtime errors.
- Checked all 33 source pictures, all 37 item identities, BOM/code search, segment filtering, photo enlargement, blank/zero distinction, invalid rates, back-to-edit, mobile entry, save/reload, history, cancellation and identical quotation retries across ZIP timestamp changes.
- Generated manual evidence matched every saved quoted item/code/UOM/rate; no formulas. Downloaded template matched every active item and left all rates blank. Existing CSV upload still saved and updated the comparison.
- 94 BOM-picker browser checks passed for inline/table removal, stable identity after index changes, keyboard focus/re-add, preserved quantities/quotes/notes, saved removals, retained history, Cancel, assemblies and existing cost rules.
- Desktop and 390/320px screenshots inspected. Manual price rows stack with full-sized photos and reachable rate inputs; picker Remove remains on the same row with a 44px target.

Commands: `node --test tests/domestic.test.mjs tests/domestic-prices.test.mjs tests/startup.test.mjs`; `node scripts/build.mjs --domestic-preview`; `node scripts/build.mjs`; `node tests/domestic-picker-browser.mjs`; `node tests/domestic-prices-browser.mjs`. Browser runners use temporary local servers and disposable fixtures; paths can be configured with FH_PLAYWRIGHT_MODULE and FH_BROWSER_PATH.

Private test artifacts remain under ignored test-output/bom-picker/ and test-output/manual-prices/. No production writes, source push or deployment occurred for these follow-ups. Publication requires the verified downloaded recovery ZIP and five-copy retention described in BACKUP_RESTORE_RUNBOOK.md.
