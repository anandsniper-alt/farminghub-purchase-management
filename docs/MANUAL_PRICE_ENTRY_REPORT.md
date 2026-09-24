# Manual Domestic price entry — 2026-09-24

Status: published and verified, 2026-09-24. DEC-070 / WF-064. Includes the same-row BOM Remove correction in DEC-069 / WF-063.

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


## Live release

**Publication verified, 2026-09-24:** runtime **8f24c088b8fa25c7d098ccc39aed69d8f9f7b255**, Coolify deployment **nhhrvupva9q8qyiyq7zeusxn** (finished; running:healthy). Manual supplier prices with photos/item codes/Used in BOM and same-row BOM Remove are live. **242 native tests, 143 local server/review browser checks and 56 read-only live checks passed.** A fresh **464,874,649-byte recovery ZIP** was downloaded and verified, including the complete database/evidence and matching previous running source. Extracted-database integrity and isolated candidate startup preserved all data. Retention: 2 verified managed ZIPs, 0 older ZIPs removed. Live workspace remains at revision **1513**; accounts, evidence bodies, audit records, archives and retry receipts match the pre-release snapshot. No live business-write requests were made. This supersedes local-only status for DEC-069/070 and WF-063/064. Private evidence: test-output/manual-entry-release/; recovery archives remain outside Git in backups/releases/.

Live checks opened existing BOM/price screens, exercised unsaved Add/Remove, manual entry, photo zoom, search, mobile 390/320px, review and Back to edit, then cancelled. All non-read browser API requests were blocked. Existing Import navigation and committed runtime hashes were checked. No quotation, supplier, item or BOM was created/changed by live verification.
