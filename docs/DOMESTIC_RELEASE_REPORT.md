# LAE Domestic BOM and supplier prices — published

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

## Publication verified

**Published 2026-09-24** at https://purchase.dvjassociates.com, runtime commit **803bf34346735f781f1008c5d9000777ce50ded1**. Coolify deployment **dihpggiuw45cg7swfijdky31** finished; application is **running:healthy**, HTTPS health returns 200. Main branch, domain, port 8000, single instance and persistent /app/data remain unchanged; auto-deploy remains disabled.

**39 live read-only checks passed**, including exact committed assets/template, existing login, model/assembly/item screens, all 33 item pictures and four model photos, saved-parts viewing, template codes matching live Item Master, blank rates, upload form, mobile layout and existing Import pipeline. No browser runtime errors or business-write requests during verification.

Fresh consistent SQLite backup: **507,609,088 bytes**, integrity valid. The exact candidate ran against an isolated restored copy, including startup reference initialization and catalogue provisioning. Original records and protected tables were preserved before publication.

Live storage comparison passed at revision **1511 → 1513**. Preserved: **36 orders, 37 vendors, 389 Import items, 107 Import supplier prices, 8 payments**, original file metadata and all **592 stored evidence bodies**, **3 accounts**, **1 soft-launch archive**, **1,629 prior audit rows**, and **539 prior retry receipts**. Original references, namespace, links and serials retained. No intervening business edits needed reconciliation.

Intentional additions: reference-counter initialization and source-catalogue import (two audit events; one command receipt). The live catalogue has **37 Domestic items, four models and ten BOM records** (four model BOMs plus CS1/CS2 and four frame assemblies). No test vendors, test quotations, guessed assembly parts or example prices were loaded. Rates remain pending. Both active Purchase Managers already held Domestic scope, so no role or scope mutation was required; there were no active Executive profiles needing a grant.

The initial automatic-review block on temporary SSH credential retrieval was resolved by the user's explicit approval before access. The key was restricted to the operator account and deleted after verification; deployment credential sessions were closed. Backup and rehearsal copies remain private on the persistent server volume. Do not restore the pre-release snapshot over newer writes without reconciliation.

Private evidence: ignored operator storage contains baseline, provisioning, 39-check browser report, screenshots and storage comparison. The historical local-only statuses in DOMESTIC_BOM_TRIAL.md and earlier baseline entries are superseded by this verified release.

## Remaining user inputs and boundaries

Can/frame assembly compositions, unprovided quantities and supplier rates remain pending. The application must show incomplete cost rather than infer these values from photos. Manual stock/MRP, receipt-based cost actualisation, production management and ERP connectors are not included. The full Import suite passed, but this report is not a claim of new live end-to-end Import transactions.

See [price-list instructions](DOMESTIC_PRICE_LIST_GUIDE.md), [Domestic trial history](DOMESTIC_BOM_TRIAL.md), DEC-064–066 and WF-058–060. Private test reports and screenshots are in ignored operator storage.
