# LAE Domestic complete flow test — 2026-09-24

**Result: PASS for the implemented Domestic supplier, quotation and BOM costing flow.** No blocking software defect was reproduced. This is a new test run, not a restatement of historical release evidence. No application logic was changed or deployed. Two reusable browser test runners were added.

Tested source: 88e69e3fcaf55daaead01403c2a116a6bc45a2bf; live runtime assets match that checkout (runtime release ef945cc; the later commit contains release documentation only). All saves used fresh isolated local SQLite/browser storage. The complete sequence ran as a scoped **Purchase Manager**, in authenticated-server and standalone-review modes. Live checks used the existing operator account for read-only navigation and unsaved forms; no live Manager password was changed or borrowed. Ashok and Suresh's current active Manager roles and Domestic access were checked.

## Fresh results

| Test area | Passed |
| --- | ---: |
| Full native regression, including permissions/scoping, validation, financial rounding, references, stale revisions, storage and other modules | 247 |
| Integrated supplier → item → manual/XLSX quote → comparison → assemblies → all four machine BOMs → controlled revisions | 118 |
| Pictured BOM picker, Add/Remove, retained inputs, totals, saved history, cancel and mobile | 94 |
| Manual quotation entry, template/evidence, duplicate handling and CSV upload | 49 |
| Supplier and same-supplier old/new comparisons, Viewer access and mobile | 48 |
| Invalid upload cases in server/review modes | 22 |
| Live read-only checks | 72 |

Local browser total: **331**. Live business-write requests: **0**. No browser runtime errors. The full live workspace was identical before/after verification at revision **1516**. No live dummy supplier, item, quotation, BOM or order was added, edited or deleted by this test.

## End-to-end sequence completed

1. Create two suppliers through the UI using Purchase Manager access; reject a duplicate supplier code.
2. Create an item with an uploaded identification photo and generated permanent code. Edit description/rate with a reason; retain its code and picture.
3. Create an additional assembly, add the new item and verify its cost.
4. Type ten manual item prices for supplier A, review and save with retained source evidence.
5. Download a fresh 38-item template (37 source items plus the local test item), fill ten rates, upload for supplier B, review ten saved / 28 skipped rows, and verify evidence.
6. Compare manual and uploaded supplier quotations side by side with their dates/references.
7. Select quotation rates for CS1, CS2 and four frame assemblies. Save confirmed composition, per-assembly quantities and revision reasons.
8. Complete all four machine BOMs, explicitly adopting their assemblies. Verify independent expected totals, price provenance and persistence.
9. Save a later partial quotation with a changed rate. Check old/new +20.00% and omitted-item indications. Every existing saved BOM remains unchanged.
10. Adopt the new item rate into CS1/CS2. All four saved machine costs remain unchanged and show the newer-assembly warning. Saved assembly drill-down still displays its original cost.
11. Deliberately adopt changed assemblies into TX-MM1 and GJ-MM2. Their totals update, old totals remain in revision history, and GJ-MM3/GJ-MM4 continue using their saved CS2 snapshot until separately revised.
12. Reload and verify costs, quotation evidence, and an audit record with reason for every machine revision. Existing Import orders, payments and Item Master are unchanged in the local flow.

### Independent synthetic cost expectations

These are deliberately simple **test values**, not supplier quotations or real machine prices/compositions.

| Machine | Initial cost INR | After selected adoption INR |
| --- | ---: | ---: |
| TX-MM1 | 625.00 | 629.00 |
| GJ-MM2 | 750.00 | 756.00 |
| GJ-MM3 | 860.00 | 860.00 (not adopted) |
| GJ-MM4 | 970.00 | 970.00 (not adopted) |

CS1 = 2 × 10 + 1 × 5 = 25; after 10 → 12, cost = 29. CS2 = 3 × 10 + 2 × 5 = 40; after the same change, cost = 46. Model totals add motor + saved can-set cost + saved frame cost exactly once. The figures above were asserted independently of the application calculator.

## Failure and access checks

XLSX formulas, unknown item codes, altered UOM, changed descriptions, duplicate item rows, negative prices, more than two price decimals, all-blank pricing, incorrect headers and over-500-row uploads all prevented Save and left the entire isolated state unchanged. Existing manual duplicate/cancel checks, invalid numeric fields, zero-versus-missing behavior, same/reversed quotation selection, UOM mismatch handling and quote date ordering passed.

Native authorization checks cover Manager/Executive quotation access, Manager-only supplier creation, denied Viewer/Import-only writes, scoped evidence, stale BOM revisions, duplicate/cyclic components, fractional SET quantities, automatic references and preservation of old snapshots. Browser comparison ran as a Viewer with no editing controls. The integrated creation/costing sequence used Purchase Manager access throughout and did not require an Admin.

## Live verification and actual remaining setup

All three requested suppliers are active, visible in Supplier master and selectable in manual prices: V38-GSAI (GO SEVA AGRO INDUSTRIES LLP), V39-SRAI (SHREERAM AGRO INDUSTRIES), V40-PREC (Precicraft). Live model/item/assembly screens, picture loading, Add/Remove, quotation entry/review/back/cancel, comparison guidance, mobile 390/320px, and Import pipeline navigation passed. Committed runtime hashes and HTTPS health passed. Desktop completed-model and live mobile entry screenshots were visually inspected.

Live currently has **37 Domestic items, 4 models, 0 saved Domestic quotations, and 0 costed models**. All six can/frame assemblies are Draft with zero parts. These are missing business inputs rather than failed saves:

- Enter or upload actual supplier quotations.
- Populate CS1 and CS2 with the correct assembly parts and quantities.
- Populate each of the four frame BOMs.
- Select quoted/manual component rates, confirm complete assembly composition, then revise each Major BOM to adopt the required assemblies and complete its motor/other quantities.

No parts, engine inclusion, supplier conditions or commercial prices were inferred from photographs. Motor/pump item photographs not supplied in the source remain Picture pending; original source item/model images loaded.

**Scope boundary:** this verifies the currently implemented Domestic master/quotation/estimated BOM costing features. Domestic purchase orders/receipts, manual stock/MRP, receipt-based cost actualisation, production management and ERP/Tally posting are not implemented by this test. The full native Import suite passed, but no new live end-to-end Import order/payment workflow was executed. These tests are not a load/capacity or security certification.

## Reproduction and evidence

Run from the released checkout with Node and installed Playwright/Chrome:

`node --test tests/*.test.mjs`

`node scripts/build.mjs --domestic-preview`

`node tests/domestic-full-flow-browser.mjs`

`node tests/domestic-price-upload-failures-browser.mjs`

Also run the existing domestic-picker-browser.mjs, domestic-prices-browser.mjs and domestic-comparison-browser.mjs runners. Browser executable/module locations can be supplied through FH_BROWSER_PATH and FH_PLAYWRIGHT_MODULE. Runners bind temporary loopback ports and use disposable stores, never production URLs.

Private local evidence directories (relative to this checkout):
- picker: test-output/bom-picker/2026-09-24T11-01-09-302Z
- prices: test-output/manual-prices/2026-09-24T11-01-23-171Z
- comparison: test-output/price-comparison/2026-09-24T11-02-00-630Z
- integrated: test-output/domestic-full-flow/2026-09-24T11-07-30-137Z
- invalidUploads: test-output/domestic-upload-failures/2026-09-24T11-06-14-931Z
- Live: test-output/domestic-full-flow-live/live-report.json and screenshots.
- Native: test-output/domestic-full-flow-native.log.

Database files, source evidence and logs remain ignored; no credentials or raw production records are included in this report. No deployment was performed, so no additional release ZIP was required; the three previously verified recovery ZIPs remain retained under the five-copy policy.


## Follow-up finding — frame save report, 2026-09-24
The preceding PASS is limited to the listed scenarios. It did not establish error-recovery usability for a missing revision reason. After the user's frame-save report, this path was reproduced: browser validity blocked submission with no durable application error. The exact user input was unavailable, so this is a confirmed contributing UI gap, not proof of the sole cause. DEC-072 / WF-066 adds persistent validation guidance and direct assembly-entry continuation. See DOMESTIC_FRAME_SAVE_REPORT.md. The adjusted integrated flow passed another 118 checks; frame-specific coverage adds 116 checks across both roles and both modes.
