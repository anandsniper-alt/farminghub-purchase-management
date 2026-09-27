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
