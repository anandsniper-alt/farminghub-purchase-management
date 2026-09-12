# Farming Hub Purchase Management — v0.6.1-alpha.16

Clean-transaction LAE Import review build using the user-approved Vendor Master, final Base Item Master, filtered supplier price lists and historical freight buy-rate workbook.

## Current master structure
- **37 supplier/vendor master records** retained from the approved supplier master.
- **129 Base Item Codes** loaded from the first sheet of `ITEM MASTER.xlsx`.
- **387 ERP Item Codes** generated automatically: `GJ-`, `KD-`, and `TT-` under each Base Item Code.
- **106 currency-specific supplier price records** imported only where the price row belongs to a Base Item Code present in the final first sheet. Rows outside the final Base Item Master are ignored.
- BD1 and BD2 remain visible Base Item Codes but have no supplier mapping in the uploaded first sheet, so they cannot be selected for a supplier PO until mapped.

## Purchase-order logic
1. Select supplier.
2. Select **Base Item Code** first.
3. Enter brand-wise quantities for GJ / KD / TT.
4. The system generates only positive-quantity ERP Item Code lines, e.g. `GJ-BS20`, `KD-BS20`.
5. Supplier price lookup remains supplier + Base Item Code + price-list currency.
6. Product-level reference production days take priority for deviation warnings; supplier-level days remain the fallback reference.
7. After PO placement, artwork/outlook/brand-specific documents and operational tracking use ERP Item Codes.


## Missing-PLM warning rule
- If a Base Item has **no approved PLM revision**, PO submission and approval are allowed to continue.
- The PO shows a persistent amber warning: **PLM specification not available**.
- The condition is written to the audit history and the immutable issued-PO snapshot.
- The workflow does **not** mark PLM approved and does not require a special override reason.
- If approved PLM revisions do exist for the Base Item, selecting an approved technical version remains mandatory.

## PLM and complaint roll-up
- Base technical specification remains at Base Item Code level.
- Artwork, colour/outlook, stickers, embossing and other brand-specific differences remain at ERP Item Code level.
- Complaints are recorded against ERP Item Code and automatically carry Base Item Code for aggregation.
- PLM includes a complaint roll-up by GJ / KD / TT and total Base Item Code.
- PLM revisions support multiple supporting documents.

## Freight benchmark and trend logic
Historical `WEEKLY BUY RATE.xlsx` data is retained as immutable rate snapshots by exact route.

Final benchmark per container:
- O/F below USD 3,000 → add **USD 60** agent charge.
- O/F USD 3,000 and above → add **USD 120** agent charge.

Booked freight warnings compare booked total freight with the **final benchmark (O/F + agent charge)**. The existing USD 100 warning threshold remains in force.

Latest workbook benchmarks:
- Ningbo → Chennai: O/F 3,800 + 120 = **USD 3,920**
- Qingdao → Chennai: O/F 3,250 + 120 = **USD 3,370**
- Shenzhen → Chennai: O/F 2,500 + 60 = **USD 2,560**
- Chongqing via Ningbo → Chennai: O/F 4,600 + 120 = **USD 4,720**
- Chongqing via Nansha → Chennai: O/F 4,500 + 120 = **USD 4,620**

## Data posture
This build contains approved/reference masters and price/freight history, but no demo POs, payments, shipments or complaints. It remains a review alpha and is not connected to live VMS/PostgreSQL/ERP.

## Test evidence
- Native Node test suite: **93 / 93 passed**.
- Dedicated v0.6 regression browser flow: **5 / 5 passed** using `/usr/bin/chromium`.
- Missing-PLM bypass browser flow: **1 / 1 passed**.
- See `docs/TEST_REPORT.md` and `test-output/v060-browser-results.json`.

## Included source references
- `docs/reference/ITEM_MASTER_Final.xlsx`
- `docs/reference/WEEKLY_BUY_RATE_History.xlsx`
- `docs/reference/Supplier_Master_Updated_v0.5.3-alpha.14.xlsx`
- `docs/reference/Power_Weeder_Technical_Spec_Sample.xlsx`
- `docs/brand/Farming_Hub_Brand_Guidelines.pdf`
- `docs/brand/FARMING_HUB_LOGO_RGB.png`
