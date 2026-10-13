# Utility price list workings

2026-10-13. DEC-134 / WF-129. User-authorized addition to the existing purchase application. Implemented and locally reviewed; production status must be recorded after deployment.

Home → Price list workings → Utility price provides supplier, stage, product type, quality and evidence filters; item → invoice/date batch → barcode/source-row drill-down; and durable item/batch remarks. Evidence distinguishes supported, recorded, estimated, provisional, pending, purchase-history-only and excluded-only items. Current evidence badges describe active stock plus pipeline; the batch-evidence filter includes all dated scopes.

Invoice price before CD/GST, CD, after-CD before-tax goods, transport and revised landed cost are separately visible where supported. Retained historical landed costs do not invent a goods/freight split. Stock, pipeline, excluded October receipts and deferred records remain separate. Positive costed quantity weights averages; signed values/quantities and missing coverage remain visible. Changes are flagged only above 1%. No selling margins, inventory movements, supplier-master rewrites or automatic invoice certifications are introduced.

The checked initial dataset covers 3,081 items, 7,748 batches, 16,113 stock records, seven pipeline source rows and 2,237 purchase-history lines. These are dated snapshots, not current inventory. Original opening XLSX is unavailable; cached opening provenance remains explicit. UNIQUE SHADE NET uses user-confirmed Shubham Sales review grouping only, retaining actual invoice suppliers. Fastrack pooled purchase averages remain estimates. Unresolved brand/item questions remain for user review.

## Persistence, permissions and scale

Reuse native HTTP/SQLite and existing sessions, Origin/CSRF and Utility division permissions. Commercial roles with Utility scope may read; Viewer cannot edit remarks; only Admin imports evidence. No account scope is changed. Dedicated indexed tables hold immutable versions, items, batches, source rows, identity guards, append-only remarks and actor-bound retry receipts. Imports are transactional; remarks use expected versions and retain conflicting drafts. No private financial data is committed or embedded into public/static assets.

Responses page at 50 by default, maximum 100. Current import is about 46 MB with 16,120 source-row traces. The bounded import limits 64 MB/100,000 rows mean a 10x dataset requires incremental import design; 100x requires partitioning and query/load evidence. No 10x/100x capacity certification is claimed. Existing full-workspace bootstrap/storage scale limits remain. No new dependency or framework.

## UI and validation

Reuses shared navigation, Farming Hub Minimal styling, semantic tables, GSAP/reduced-motion enhancer and current login. Applies UI-01–UI-12 and web HIG adaptations. Desktop and 390px mobile tested: supplier/search filters, home entry, item/batch/barcode flow, saved item/batch remarks, reload persistence, Keep editing/Discard changes and mobile navigation. Source references show filename/sheet/row; detailed hashes/notes are expandable. Native tests cover authorization, transaction rollback, immutable evidence, replay, conflicts, pagination and calculations. Data verification checks hashes, preserved source fields, joins and derived values. This is not exhaustive screen-reader or device certification.

Private test receipts, dataset, backup and live checks are kept outside tracked source. Fresh downloaded recovery ZIP and isolated original/candidate restore are required before push/deploy. Exact runtime assets, access denial, dataset readback and existing-data preservation are checked after deployment. See existing recovery runbook.


## Utility price publication verified - 2026-10-13

DEC-134 / WF-129 is live at https://purchase.dvjassociates.com/price-workings/, also Home > Price list workings > Utility price. Runtime `44c8d4b1edd478688fa0a0160f910ab91ee95629`; deployment `2ualvkcc2ydf8xxz1glhsjfa` finished and running:healthy. This supersedes candidate-only status for this module. The authenticated import activated the reviewed dataset with 85 supplier groups, 3,081 items, 7,748 batches and 16,120 barcode/source-row traces. Supported, recorded, estimated, provisional and pending evidence remains distinct; dated snapshots are not live inventory.

All 581 native tests passed, with no failures or skips. Isolated desktop/mobile workflows and standalone home navigation were reviewed. Live checks verified the exact runtime and six served assets, anonymous API/asset denial, the canonical dataset digest, read-back of every item, a stock-plus-pipeline average and barcode trace. All six existing business projections match the pre-release baseline; main revision 1926 and 37 orders are preserved. No existing permissions, masters or business transactions were changed. No live review remarks were created for testing.

The fresh downloaded 802,402,304-byte snapshot and matching running source were packaged into a verified 664,281,902-byte private recovery ZIP before publishing. Archive integrity, source/member hashes, isolated original/extracted/candidate restores and preservation of all 23 original tables passed; a complete candidate import also preserved all original tables. The two newest verified release ZIPs remain in the main checkout's ignored backups/releases directory. Detailed evidence remains private outside tracked source. Documentation-only commits after this publication do not replace the verified runtime.
