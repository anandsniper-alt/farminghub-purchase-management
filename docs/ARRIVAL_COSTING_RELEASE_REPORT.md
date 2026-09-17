# Arrival costing release verification — 2026-09-17

Status: live publication verified; runtime cd87b60.

## Scope
DEC-057 / WF-051: invoice-level final arrival costing, inward Bill of Entry evidence, shared-entry duty allocation bounds, nine-component before-GST cost factor, product invoice-value allocations, manual non-USD conversion, provisional/final/reopen workflow and permanent LC references. See ARRIVAL_COSTING.md for formulas and limits. No real accounting/warehouse posting or automatic extraction from files.

## Completed candidate checks
- 205 native tests passed, zero failures. The source-workbook golden formula comparison passed privately; replacing its committed financial values with synthetic examples was followed by all 9 costing tests passing again.
- 29 focused browser checks passed across authenticated native server and standalone review builds: multiple uploads and evidence downloads, incomplete actuals remain pending, actual finalization, exact product reconciliation, CSV, persisted reload, correction history, desktop/mobile page and form layout; no runtime errors.
- Three complete configured Purchase Manager workflows passed 68 checks, including USD and CNY invoices, different payment terms, split shipments, retained BOE evidence and final costing of every shipment invoice. Synthetic fixtures only; no live test orders.
- Desktop and mobile screenshots inspected. Existing Minimal theme, order tabs, dialog actions and document controls retained.

## Preservation / publication
See the verified publication record below.

## Live publication verified — 2026-09-17
Runtime cd87b60b134ea3985ba4a515b9494e362711510e is live at https://purchase.dvjassociates.com. Coolify deployment hdaqomsos7zk6dagzziiwiom finished and the application is running:healthy. This publishes DEC-057/WF-051 and supersedes candidate-only status.

A fresh consistent 132,284,416-byte SQLite snapshot was retained on the persistent volume and restored locally. Candidate startup rehearsal preserved all business collections, account/evidence/archive tables and prior audit history; adding the LC reference counter moved revision 1007 to 1008. Live verification passed 45 checks, including HTTPS health, 15 served assets matching the release, existing-account login, costing tab/basis, new approval stages, Minimal preferences, VMS/navigation and mobile layout, with zero browser runtime errors and zero business-write requests. Separate live SQLite integrity, protected table hashes, original audit prefix, retry-table and retained-backup checks passed. Existing one PO, 37 vendors, 387 items, 106 prices and next PO/reference 2 are preserved. The existing live order was not artificially advanced for testing; finalization/write flows were exercised in isolated server/review fixtures. Domain, single application instance and /app/data volume retained. Private evidence is ignored under test-output/arrival-release and test-output/vms-module/test-output/arrival-costing.
