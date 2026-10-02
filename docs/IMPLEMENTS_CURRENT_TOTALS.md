# Implements current costing totals

DEC-109 / WF-103, 2026-10-02.

The model costing register and four detail cards show calculated current amounts. Missing quantities, rates, fabrication weights or charges produce a warning sign beside the affected amount. The warning opens the cost details filtered to missing amounts. Hover titles and accessible names identify the missing-input count.

Current total is the sum of calculated lines only. Unknown line values remain null and are excluded; complete cost remains null until all required inputs and the BOM are complete. Shared costing, sales-price readiness and margin calculations are unchanged. Excel/CSV explicitly separate current calculated totals from complete cost and identify missing inputs.

No source PPM, syntax weights, item master quotes, transport, stock, plans, purchase orders, histories or other module data are edited by this release.

## Verification

- 17 native Implements, lubricant, PTO and RO tests passed.
- Isolated actual-data preview: numeric 17-model register; keyboard warning link for S3.V14 opens exactly its two missing PPM rows; numeric four detail cards retain warning signs.
- Native server Excel export: all 17 model current group amounts, current totals, complete-cost blanks and missing-input counts match the authoritative calculation reports.
- Review build passed; Implements depends on authenticated APIs, so standalone offline review is not a supported execution mode for this module.
- Fresh production snapshot at 2026-10-02T04:01:25.744Z matches runtime f1acbb2 and main revision1859 / Implements revision8. CRC, manifest hashes, isolated startup, SQLite integrity/FK checks and equality of all 14 restored tables passed. Five newest verified archives retained.

Publication verification pending. Private receipts and screenshots remain ignored in test-output/current-cost.
