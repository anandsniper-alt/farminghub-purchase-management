# Loading plan demo — 2026-09-26

Status: local review only. No publication or production business writes. DEC-096 / WF-090.

The demo uses a private copy of current records and separate browser storage. It provides single-order, same-supplier multi-order and multi-supplier planning. Users tick individual items and enter quantities; saving reserves each line on its original PO. RO assignment happens later. Distinct partial plans from one PO can share an RO without duplicate allocation.

The supplier filter limits the PO dropdown. Available quantities exclude all active reservations; fully allocated lines are absent from the default view and remain accessible under All items. Reserved, container-loaded and departed quantities are shown separately. Existing production-start, PI, QC, documents, payment and dispatch controls are retained. Records with completion remarks but no corresponding completed milestone remain unconfirmed; the demo does not repair live data.

Validation: 323 native tests passed; isolated server and standalone browser flows passed all three loading modes, dependent dropdowns, checkbox selection/exclusion, partial quantities, filter retention, saved-plan RO assignment and mobile controls, with zero JavaScript errors. Private evidence is kept outside Git.

Release remains subject to user approval and the mandatory fresh recovery ZIP/restore gate.


**Publication verified — 2026-09-27 (DEC-096/097, WF-090/091):** User-approved Loading plan and Tasks/overview changes are live at release `9433f25934544ea0b1ec2ffaf5cf0b1a6feae605`; Coolify deployment `br36titd2jnw9dyqthor42tb` finished and the container is running/healthy. Three loading modes, supplier-dependent PO selection, item ticks/partial quantities and later RO assignment are published. Tasks now include supplier/PO/status sorting and filters, brand item summaries, daily plan/completion/pending counts and the approved on-time rating with separate effort history. Overview cards and pipeline bars open matching filtered lists. This supersedes the earlier local-only candidate status. 327 native tests, both isolated server/review browser suites and 35 final read-only live checks passed, with no JavaScript errors or business-write requests. All 93 runtime files match the tested commit. A fresh 481,597,946-byte downloaded recovery ZIP passed checksum/archive/isolated-startup checks; five verified ZIPs remain. Workspace revision 1635, accounts, evidence bodies, audit history, archives and retry receipts are unchanged. No demo records or historical shipment repairs were published. Private verification remains in ignored test-output/loading-task-release/ and recovery ZIPs in the main checkout backups/releases/.
