# Arrival costing release verification — 2026-09-17

Status: candidate validated locally; live publication pending backup rehearsal and post-deployment verification.

## Scope
DEC-057 / WF-051: invoice-level final arrival costing, inward Bill of Entry evidence, shared-entry duty allocation bounds, nine-component before-GST cost factor, product invoice-value allocations, manual non-USD conversion, provisional/final/reopen workflow and permanent LC references. See ARRIVAL_COSTING.md for formulas and limits. No real accounting/warehouse posting or automatic extraction from files.

## Completed candidate checks
- 205 native tests passed, zero failures. The source-workbook golden formula comparison passed privately; replacing its committed financial values with synthetic examples was followed by all 9 costing tests passing again.
- 29 focused browser checks passed across authenticated native server and standalone review builds: multiple uploads and evidence downloads, incomplete actuals remain pending, actual finalization, exact product reconciliation, CSV, persisted reload, correction history, desktop/mobile page and form layout; no runtime errors.
- Three complete configured Purchase Manager workflows passed 68 checks, including USD and CNY invoices, different payment terms, split shipments, retained BOE evidence and final costing of every shipment invoice. Synthetic fixtures only; no live test orders.
- Desktop and mobile screenshots inspected. Existing Minimal theme, order tabs, dialog actions and document controls retained.

## Preservation / publication
Record the fresh live backup, restored-copy rehearsal, deployed commit, finished deployment, live asset/UI checks and data-preservation results here after verification. Existing deployment records are historical evidence only.
