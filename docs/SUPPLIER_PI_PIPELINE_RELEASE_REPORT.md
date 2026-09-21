# Supplier PI pipeline release — 2026-09-21

DEC-061 / WF-055 is published at https://purchase.dvjassociates.com in runtime `364866ca6b9878b8dffa75b14f2a67d4fcbefb10`, Coolify deployment `zx4csoitx8proml4nxodw0cg` (finished; running:healthy).

The LAE Import Order pipeline now shows **Supplier PI no.** and PI date, **Awaiting PI** when absent, matches PI numbers in search, includes the reference on board cards, and adds Supplier PI number/date to CSV exports. It reads the current PO-level proforma invoice; shipment commercial invoices remain separate.

Validation: 58 isolated server/review browser checks and 18 live read-only checks passed with no runtime errors or business-write requests. A fresh 405,504,000-byte SQLite backup at revision 1338 passed integrity and isolated restored-copy startup. After deployment, every original order, price entry, account, attachment, audit row, archive and retry receipt remained present and unchanged. One approved supplier price-list entry created by Ashok during the release was retained and reconciled to its audit event, moving the live workspace to revision 1339. The app remained healthy with 21 orders, 37 vendors, 389 items and 107 price-list records.

The persistent `/app/data` volume, single instance, domain, HTTPS and port 8000 remain unchanged. No migration, reference reset or live test order was performed. Private backup and verification evidence remains outside Git under ignored operator storage.
