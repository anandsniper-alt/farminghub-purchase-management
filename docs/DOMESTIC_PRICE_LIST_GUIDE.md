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
