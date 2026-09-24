# LAE Domestic BOM and supplier prices — release candidate

2026-09-24. Requested by the user: test the Domestic flow and publish it, with a downloadable/uploadable supplier price-list template. Domestic access for every active Purchase Manager and Purchase Executive was explicitly confirmed. Existing Admin access remains.

## Included

- 33 original workbook assembly parts with their identification pictures, four specified motor/pump items, four model photographs, CS1/CS2 and four empty frame assembly BOMs.
- Major BOM / Assembly parts hierarchy, exact six-column workbook presentation, manual quantities/rates, immutable saved assembly snapshots, revision reasons/history and permanent software references.
- Shared Domestic supplier creation, current-item XLSX download, reviewed XLSX/CSV upload, immutable supplier quotation/evidence history, rate comparison and deliberate quote selection when revising a BOM.
- Duplicate/invalid quote protection; blank rates skipped, zero explicitly retained, INR before GST and current UOM checks. Existing BOMs never silently repriced.

## Verification

- **241/241 native tests passed**, including permission/scoping, quote validation/atomicity, duplicate prevention, decimal arithmetic, immutable snapshots, reference preservation and shared-vendor scope retention.
- **24 assembly browser checks passed** across authenticated-server and standalone-review modes: catalogue/photos/source columns, uploads, can/frame costs, model rollup, saved assembly drill-down, history, persistence and mobile editing.
- **28 price browser checks passed** across those two modes: supplier creation, dynamic 37-row template, one priced row / 36 skipped, review, save, comparison, quote-to-BOM selection/provenance, duplicate rejection, subsequent quote preserves saved cost, formula rejection, reload and mobile layout. No runtime errors.
- XLSX structure verified: 37 unique item codes, 37 blank rate cells, no formulas, frozen header and well-formed XML parts. Authored template and browser screens visually inspected. Prefix namespaces and UTF-8 BOM compatibility issues discovered during testing were corrected.
- Tests use isolated synthetic databases/browser storage. Test quotations, prices and suppliers have not been created on production.

## Publication status

**Not deployed yet.** Coolify application, main branch and domain were checked. Runtime is healthy, automatic deployment is off, and the persistent data volume remains mounted at `/app/data`. Remote main matched the candidate base during inspection.

The fresh live SQLite backup and isolated candidate restore rehearsal are pending. Automatic approval review rejected retrieval of the server SSH private key from Coolify because that credential-access step needs explicit approval. The existing local temporary key is absent. No workaround or unprotected live deployment was attempted. Publication must wait for approved server backup access and a successful rehearsal.

After that gate: push the tested commit, deploy, verify healthy HTTPS/login/assets, provision only the user's source catalogue through the normal authenticated command, add Domestic scope to approved active roles, and compare original orders, payments, masters, evidence, references and audit rows with the backup. Existing scopes and roles must be preserved. Never load the preview seed or test prices into live data.

Startup will initialize new Domestic reference counters through the existing reference initializer, retaining old entries/counters/namespace and adding its normal audit event. This is additive metadata, not a PO serial reset. Catalogue provisioning is idempotent by source hash.

## Remaining user inputs and boundaries

Can/frame assembly compositions, unprovided quantities and supplier rates remain pending. The application must show incomplete cost rather than infer these values from photos. Manual stock/MRP, receipt-based cost actualisation, production management and ERP connectors are not included. The full Import suite passed, but this report is not a claim of new live end-to-end Import transactions.

See [price-list instructions](DOMESTIC_PRICE_LIST_GUIDE.md), [Domestic trial history](DOMESTIC_BOM_TRIAL.md), DEC-064–066 and WF-058–060. Private test reports and screenshots are in ignored operator storage.
