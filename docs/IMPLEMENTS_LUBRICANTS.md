# Implements oil and grease - 2026-10-02

DEC-107 / WF-101. User-authorized prices and default brand; old consumption restored without replacing existing BOMs.

| Model | Oil ltr/machine | Grease kg/machine | Old `ajith verified` column |
|---|---:|---:|---|
| S1.V13, S1.V14 | 9 | 0.4 | AJ154/AJ155 |
| S1.V15, S1.V16 | 9 | 0.4 | AL154/AL155 |
| S2.V9, S2.V10 | 8 | 0.2 | L154/L155 |
| S2.V13, S2.V14 | 8 | 0.4 | T154/T155 |
| S2.V58 | 8 | 0.2 | J154/J155 |
| S2.V33 | 8 | 0.4 | P154/P155 |
| S2.V35 | 6 | 0.4 | R154/R155 |
| S3.V9, S3.V10 | 8 | 0.4 | X154/X155 |
| S3.V13, S3.V14 | 8 | 0 | AB154/AB155 |
| S3.V47 | 6 | 0 | AH154/AH155 |
| S4.V20 | Pending | Pending | No matching old configuration |

Source workbook: `BOM CALCULATION - ROTAVATOR KNM IMPLEMENTS.xlsx`. Family, size and gearbox configuration select the old consumption column. IB/OB variants retain matching old consumption. No fabricated-weight substitution. The 170 catalogue models without active BOMs stay unchanged. Pending Deltavator quantities have explicit flags.

Gandhaar oil retains base 181 plus 2% transport, included once at 184.62/ltr. Its actual IMP code is pending and flagged; no ENI code reuse. ENI alternative uses new-sheet IMP-271 and 179/ltr already landed. Grease uses new-sheet IMP-343 and old AM155=250, AN155=1.035, AO155=258.75/kg already landed. Old missing-item review records are resolved only for restored matching quantities; all unrelated flags remain. Each affected model appends its prior BOM to revision history; server appends the workspace audit.

Shared business rules accept kg/ltr up to 3 decimal places, pcs as whole numbers. Stock is allocated earliest month first; known remaining stock is rounded to 3 decimals. Buffer rounds upward to0.001kg/ltr or whole pcs. Extras use the same unit. Supplier review POs retain unit and price basis in immutable snapshots; PDF/Excel display quantity units separately from rate/weight units. Legacy whole-piece snapshots keep their existing shape and validation. No live demo plan, stock or order is added.

Verification: 16 targeted tests cover consumable costs, fractional monthly stock/buffer/extras, import unit mismatches, whole-pc rejection, excess precision, server rejection of changed PO units, immutable prices, existing PTO rules, startup and fresh standalone build contracts. Isolated browser 0.225kg PPM save recalculated 58.22 and purchase prices showed both oil options. Actual PDF/Excel export fixture: oil 11.55ltr at 184.62=2132.36; grease 0.4kg at 258.75=103.50; total 2235.86. Excel unit/value/quantity formatting/error-cell checks passed; rendered PDF inspected with readable units and no overlap. Cost-detail export retains oil 8 ltr/1476.96 and grease 0.2 kg/51.75.

Scale impact: 3 master items, 2 suppliers and 34 model links. Existing linear calculations and bounded workspace/import/export limits remain; no new storage service or dependency. At 10x/100x the existing whole-workspace size/latency debt remains; this change does not claim throughput certification.

Fresh running-source recovery passed SHA256, archive CRC, 9-table equality, SQLite integrity/FK and isolated restore with zero business changes. Five verified release archives retained. Release used a separate checkout to avoid concurrent uncommitted RO feature changes. Automatic approval review blocked shared-checkout cleanup to protect that work; no restore/delete was performed there.

Publication verified: runtime `ff31c40df398dcf90717c976fb4cd3495275049a` is healthy. Coolify deployment `rq8o8vsozy5d80qsghrqbuzv`; Implements revision4 saved and reread, all86 checked assets match, unauthenticated protected routes remain blocked. All old parts/prices, fabrication, PTO, charges, plans, stock, orders, immutable histories and unrelated flags retained. Main revision1859/36 orders and whole-main-state hash unchanged. Live browser S2.V10 lubricant segment shows oil8ltr at184.62=1476.96 and grease0.2kg at258.75=51.75, subtotal1528.71. No live demo quantities or purchase orders were created. Source mappings, save receipt and screenshots remain private/ignored.


**S4.V20 oil estimate confirmed - 2026-10-02 (DEC-107 / WF-101 follow-up):** User directed use of the average of other models. Live revision 5 sets oil PPM to 8 ltr/machine: unweighted mean of 16 other active model oil PPM, 128/16=8. Cost at Gandhaar 184.62/ltr is 1476.96 per machine. Keep source PPM null and the existing oil flag as Estimated - review later; append prior model revision and server audit. Grease remains pending. Reread and preservation checks passed; main revision 1859/36 orders and all unrelated module records unchanged. This is a data-only edit through the existing authenticated API; no runtime release or deployment.


**New BOM PPM authority confirmed - 2026-10-02 (DEC-107 / WF-101 follow-up):** Use FINAL PURCHASE INTENT.xlsx / Purchase intend quantities by default, retaining all explicit model/item exceptions. Fresh source-cell comparison verified 1,146 linked PPM entries: 1,140 match new and six match confirmed Emperor gasket/bolt exceptions; no unconfirmed mismatch. Keep confirmed Emperor exclusions, syntax fabrication, PTO and old-source lubricant consumption/estimated S4.V20 oil unchanged. Live Implements revision 6 consolidates 1,022 model-wise review records (uncertain mappings are not all errors), links all 64 blank active-BOM PPM to open flags, and resolves 13 previously open lubricant/PTO omissions already restored. Old/master/new source values are preserved; blank remains pending, zero excludes. All 187 model records, quantities, weights, prices, costs, stock, plans, orders and main purchasing revision 1859/36 orders are unchanged. Existing Review flags download remains the review register. Authenticated data-only edit with fresh before-state, optimistic revision, append-only audit, reread, unchanged costing/MRP and main-state equality verification; no runtime deployment.
