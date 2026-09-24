# Domestic supplier price lists

Open **Order Management → LAE Domestic → Price lists**.

1. Select **Download template**. The XLSX contains current active item codes, descriptions and UOMs.
2. Fill only **Rate (before GST)**: INR for one stated UOM, maximum two decimals. Leave items the supplier has not quoted blank. Use values, not formulas. Do not change codes, descriptions or units.
3. Select **Upload price list**. Choose the supplier, quote date, supplier quote reference and reason/quote conditions. Select the completed XLSX or CSV.
4. Select **Review prices**. Correct any rejected rows in the file and upload again. Blank rates are skipped; a typed zero is an explicit zero price.
5. Select **Save supplier prices**. The original file, author, date, reason and prices are retained. Upload history opens prior prices. Nothing automatically reprices an existing BOM.
6. Open an **Assembly BOM → Edit BOM**. In a part's rate cell choose the supplier quote, or type a manual rate. Enter the quantity per assembly and save with a reason.
7. Open the model's **Major BOM → Edit BOM** to explicitly adopt a newer assembly revision. The previous model cost remains in history.

A Purchase Manager or Administrator can add a supplier under **Supplier master**. Existing active suppliers visible in your divisions can also quote Domestic items. Rate comparison uses the latest quote date per supplier/item; a later upload wins for equal dates. Earlier-dated uploads stay in history. Freight, GST, quantity breaks and other conditions are not added to these unit-rate comparisons.

CS1 serves TX-MM1. CS2 is shared by GJ-MM2, GJ-MM3 and GJ-MM4. Assembly composition, rates and unprovided quantities must be entered before a complete cost is shown. This release does not post stock, accounting entries or production orders.


## BOM selection update — local candidate, DEC-068
In Edit BOM, click the item picture/name in the searchable list to add it, then use Edit quantities & prices. Choose a supplier quote or enter a manual rate in the selected row. A later add/remove keeps your manual rate and does not reselect an old quote. Assembly totals still come from their parts. See DOMESTIC_BOM_PICKER_REPORT.md for testing and publication status.


The DEC-068 pictured BOM selector is now published and verified (2026-09-24). Follow the click-to-add instructions above; see DOMESTIC_BOM_PICKER_REPORT.md for release evidence.


## Manual prices — local candidate, DEC-070
Select **Enter prices** on Price lists. Choose supplier, quote date and reference, and enter the reason/conditions. Each row shows the item photo, name, item code and **Used in BOM**. Search by item or BOM code, or filter by segment; previously typed prices remain. Type INR for one stated UOM before GST. Leave unquoted items blank; use 0 only when explicitly quoted free.
Choose **Review prices**, use **Back to edit prices** if needed, then **Save supplier prices**. A values-only quotation workbook is generated and retained automatically; you need not prepare or upload a file. Quotation history distinguishes manual entry from file upload. Existing BOM costs and Item Master prices remain unchanged until explicitly revised. Download template/Upload price list continue to work.
**BOM code versus item code:** a purchased item has its own permanent item code; CS1/CS2 or a model label describes where it is used in currently saved BOMs. Enter a price for the individual purchased item. Not assigned means no saved usage was found, not that the item cannot be priced.
In the BOM picker, **Remove** beside Added removes that selection from the draft. Review and save a revision with a reason to persist it, or Cancel to retain the saved BOM.


**Published 2026-09-24:** DEC-069/070 are live. Use Enter prices for manual quotations, or the existing template/upload options. Remove beside Added is available in the BOM picker. See MANUAL_PRICE_ENTRY_REPORT.md for release verification.


## Compare supplier prices — DEC-071
1. Open LAE Domestic → Price lists → **Compare prices**.
2. Choose **Across suppliers**, tick the suppliers and search by item name/code. Each column shows its latest quoted item rate with date/reference; Lowest marks comparable unit rates before GST/freight.
3. Choose **Same supplier · old vs new**, select the supplier, then Old quotation and New quotation. Review the INR and percentage change. If only one quotation exists, enter or upload another dated quotation first.
4. Blank quotations show Not quoted; a saved zero is explicitly shown as Zero rate. Different units and old-zero percentages are flagged rather than guessed. Close when finished; comparison does not change saved prices or BOM costs.


**Published 2026-09-24:** DEC-071 comparison is live. Choose Compare prices on LAE Domestic → Price lists. Both manual quotations and uploaded price lists feed the comparison. See DOMESTIC_PRICE_COMPARISON_REPORT.md for release verification.


## Compare the total cost of an assembly
1. Save the assembly parts and quantities in Assembly BOMs. Confirm the complete composition only when it is complete.
2. Save the suppliers' quotations for those parts through Enter prices or Upload price list.
3. Open the assembly and choose Compare assembly cost, or Price lists → Compare prices → Assembly totals.
4. Select the assembly, suppliers and Compare against reference supplier.
5. Review the total for one assembly and the INR/percentage difference. Expand your review with the pictured parts table underneath; each row shows quantity, unit rate, part cost and actual quote date/reference.
6. Complete missing quantities/quotes before relying on a total. Incomplete quotes show only a priced-parts subtotal and cannot be marked lowest. Search filters the breakdown only.

This view uses the current saved assembly revision and latest saved quote per part, before GST/freight. It changes no BOM prices and does not place a purchase order. To adopt a rate, use the existing reasoned BOM edit flow. See DOMESTIC_ASSEMBLY_COMPARISON_REPORT.md. Local candidate: not yet published.
