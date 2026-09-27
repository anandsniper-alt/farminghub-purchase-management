# Tasks and overview demo

Local only. Open http://127.0.0.1:60946/#/tasks or #/overview. The copy uses isolated browser storage and does not call live APIs.

- Supplier, PO, assigned owner, status and India-date filters; supplier/order/status/due sorting.
- Brand-wise item names, codes and total PO quantities, with expanded details for longer lists.
- Daily plan, all completions on date, pending and overdue counts.
- On-time rating: due-date cohort completed by due date divided by eligible due-date cohort; no plan is Not rated. Today/future provisional. System closures excluded.
- Audit actor effort log separate from assigned-owner rating. Historical schedules are not frozen start-of-day snapshots.
- Existing add-follow-up and record-outcome flow preserved.
- Overview active, production, transit, critical flags, draft and pipeline-group drill-downs; clear filters, Back and reload.

327 native tests passed. Authenticated isolated server and standalone review browser tests passed for filters, rating updates, outcome capture, adding tasks, drill-down counts, reload/Back and 390px layout; no JavaScript errors. No live deployment or business data changes.


**Publication verified — 2026-09-27 (DEC-096/097, WF-090/091):** User-approved Loading plan and Tasks/overview changes are live at release `9433f25934544ea0b1ec2ffaf5cf0b1a6feae605`; Coolify deployment `br36titd2jnw9dyqthor42tb` finished and the container is running/healthy. Three loading modes, supplier-dependent PO selection, item ticks/partial quantities and later RO assignment are published. Tasks now include supplier/PO/status sorting and filters, brand item summaries, daily plan/completion/pending counts and the approved on-time rating with separate effort history. Overview cards and pipeline bars open matching filtered lists. This supersedes the earlier local-only candidate status. 327 native tests, both isolated server/review browser suites and 35 final read-only live checks passed, with no JavaScript errors or business-write requests. All 93 runtime files match the tested commit. A fresh 481,597,946-byte downloaded recovery ZIP passed checksum/archive/isolated-startup checks; five verified ZIPs remain. Workspace revision 1635, accounts, evidence bodies, audit history, archives and retry receipts are unchanged. No demo records or historical shipment repairs were published. Private verification remains in ignored test-output/loading-task-release/ and recovery ZIPs in the main checkout backups/releases/.
