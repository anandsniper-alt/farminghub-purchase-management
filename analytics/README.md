# LAE Sales Analytics

This application opens from the Farming Hub home screen at `/lae-analytics/`. It has its own Node process, static assets, SQLite database and deployment. Purchase, RO costing and price-list databases are not mounted or opened here.

## Release boundary — both computers

- Purchase/costing deploys `main` using the root `Dockerfile`.
- Analytics deploys `lae-analytics-live` using `/analytics/Dockerfile`.
- Use a separate checkout for each flow. Before editing, fetch origin, confirm the branch and preserve other local changes. Push normally; never force-push over work from the other computer.
- Analytics changes stay inside `analytics/` on `lae-analytics-live`. Do not merge the whole analytics branch into purchase or deploy the purchase application for an analytics-only change. Cherry-pick a deliberately reviewed shared integration change if required.
- The analytics container copies only `analytics/`; it has no dependency on the current purchase source tree. Its persistent volume mounts `/app/analytics-data`, with `analytics.sqlite` and immutable imported source revisions. Do not mount `/app/data` or copy a purchase database into it.
- Run `node --test analytics/tests/*.test.mjs`, syntax checks and a focused browser check for affected behavior. Verify the analytics health SHA and MASTER control totals after a release. Routine analytics releases do not require repeated purchase recovery ZIPs or a full purchase regression cycle. This exception applies only to this module.

Shared infrastructure remains: the host, reverse proxy and Farming Hub authentication. Analytics asks `/api/session` for the current account on every API call; no purchase data is returned by that identity endpoint. Existing LAE access is required to read; administrator access, same-origin and CSRF checks protect imports. An unavailable sign-in service fails closed. A host or identity outage can still affect both applications.

## Data contract

The initial source is MASTER in the approved workbook. Reported stock uses column CD and pipeline uses BU, retaining source discrepancies as exceptions. Warehouse columns Z, AD, AM, AR and AI map to B2C–TN, B2B–TN, B2B–AP/TS, B2B–Karnal and shared Chennai. Chennai is included once in the all-centre MASTER total and shown separately for a selected centre. Pipeline is shared and unallocated. Monthly pipeline is grouped from the source brand inputs; brand codes are omitted from reporting.

Reports drill Product category → Engine/specification → Grade → Item code/model. Main segment mapping, sales and annual business plan remain pending. Stock cutoff is unknown; changing pipeline month does not redate stock. Month years are inferred from the source filename and sequence, and are labelled accordingly. No purchase shortage is calculated until demand inputs are supplied; shortages must remain item-code-wise.

Data is imported through authenticated `POST /lae-analytics/api/lae-analytics/import` with `{dataset, expectedId}`. `expectedId` must match the active source (null initially). Imports validate controls and remain immutable; identical imports replay safely. Keep workbook data, credentials and SQLite files out of Git and static assets. A new import does not replace or modify purchase/costing records.

Health: `/lae-analytics/api/health`. Local server: `node analytics/server.mjs`. Production identity origin is fixed to `https://purchase.dvjassociates.com`.
