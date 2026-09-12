# Supplier Master Import Notes — v0.5.3-alpha.14

Source workbook: docs/reference/Supplier_Master_Updated_v0.5.3-alpha.14.xlsx

Imported supplier records: 37
Active suppliers: 23
Inactive suppliers: 14

Imported payment terms:
- 30% Advance - 70% Against Telex BL
- 30% Advance - 70% Before 60 Days From Loading BL
- 30% Advance - 70% Before 120 Days From Loading BL
- 10% Advance For Order Confirmation, 20% Before Shipment, 70% Before 120 Days From Loading BL
- 20% Advance - 80% Before 120 Days From Loading BL
- 20% Advance - 80% Against Telex BL
- 100% Before 60 Days From Loading BL

Imported export/shipping ports:
- Chongqing
- Ningbo
- Shenzhen

Default payment method currently set to TT / Telegraphic Transfer for imported suppliers, because the workbook supplies payment terms but no separate payment-method column.

Production days from the supplier master are stored as reference days. Product-level production days from the upcoming Item Master can override the reference baseline. Any order-level deviation from the applicable reference requires a reason and is logged.
