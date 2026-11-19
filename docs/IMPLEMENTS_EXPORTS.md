# Implements download presentation

Vendor PO Excel now contains item code, component name, supplier part code, unit, final PO quantity and product image. Buyer/supplier, PO/date/status/delivery and notes remain. Internal MRP, buffer, extras, pricing and stock allocation are omitted from Excel, including the price-basis sheet. Fabrication orders retain a separate identification and total ordered kg schedule; unknown weights remain blank. Existing saved quantities and issued snapshots are unchanged; PDF retains its existing layout.

PDF and Excel tables use dark-green headings, a border around every cell, centred horizontal and vertical alignment, wrapped text, consistent padding, proportional photos and repeated headings on printed pages. PO metadata is boxed separately. Excel sheets retain frozen headings, filters, numeric values and print areas, with landscape pages fitted to one page wide.

Existing PO PDF/Excel, Item Master Excel and model/segment costing Excel use these formats. Stores pick lists use the same table presentation when printed or saved as PDF; the production root overrides the shared application's hidden-content print rule.

CSV download actions offer a **Download table** dialog with **Excel (.xlsx)** and **CSV (.csv)**. This covers purchasing lists, supplier registers/codes, review flags, sales lists, pipeline, technical BOM/syntax exports and production/stock exports. Existing CSV contents remain available unchanged. JSON workspace backups and source attachments retain their original formats.

The browser creates the new Excel option from the same authorized export snapshot. It does not fetch extra data or widen permissions. BOM & Syntax and production exports keep their existing cost-free projections. Filters and row scope remain those of the originating export. Technical identifiers, leading zeros and formula-like strings remain literal text; recognized quantity/amount columns can contain numeric cells. Blank values stay blank. No workbook formula recalculates a business total, and edits to downloaded files do not sync to the site.

The shared browser formatter is `web/table-download.mjs`, using the existing vendored JSZip engine on demand. Existing Python workbook exporters share `server/implements-files/export_style.py`. Export generation does not change BOMs, prices, stock, saved PO snapshots or revision records.

Validation includes real PDF/XLSX generation with long multi-page orders, mixed units, pending weights, images, filtered costing, literal item codes and formula-like text. Files are reopened to verify values and formatting. Browser verification covers format selection, original CSV, filtered scope, keyboard cancellation/focus return, mobile layout and stores printing on isolated data.
