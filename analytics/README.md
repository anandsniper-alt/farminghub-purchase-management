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

Reports drill Product category → Engine/blade specification → Grade → Item code/model. For chaff cutters, the MASTER engine field holds the blade specification. Main segment mapping remains pending. Stock cutoff is unknown; changing pipeline month does not redate stock. Month years are inferred from the stock source filename and sequence, and are labelled accordingly. No purchase shortage is calculated until item-level demand inputs are supplied; shortages must remain item-code-wise.

Data is imported through authenticated `POST /lae-analytics/api/lae-analytics/import` with `{dataset, expectedId}`. `expectedId` must match the active source (null initially). Imports validate controls and remain immutable; identical imports replay safely. Keep workbook data, credentials and SQLite files out of Git and static assets. A new import does not replace or modify purchase/costing records.

Health: `/lae-analytics/api/health`. Local server: `node analytics/server.mjs`. Production identity origin is fixed to `https://purchase.dvjassociates.com`.

## Monthly sales and annual business plan

Sales use fiscal April–March periods from the two-year workbook. Read only detail rows; fiscal, state, category and grand totals are reconciliation controls, never additional sales. The separately appended Farming Hub block belongs to B2C–TN and is included once. Blank item cells inside supplied cost-centre months mean no recorded sales; absent cost-centre periods remain unavailable. Preserve the workbook's original SKU, category, row and values in every immutable import. Sales quantity is reported quantity; value and returns treatment are not supplied.

Known brand prefixes GJ, KD, TT, SG, ST and TX are removed for reporting. Exact resulting item codes inherit MASTER category, engine/blade and grade; no fuzzy model matching or engine/grade inference. Unmatched items remain visible in their source category, with unmapped specification/grade. Missing/unknown item codes retain separate source-row identities. Classification is pinned to the MASTER import used at sales import time; a changed MASTER source is flagged rather than silently rewriting sales.

October 2026 is partial through 14 October, confirmed by the user. Completed-month comparisons exclude partial months and use only cost centres with coverage in both years. Prior B2C–TN is absent. FY2025–26 TN contains only Battery Sprayer Spares; completeness is pending a deferred user clarification, so TN is excluded from year-on-year calculations while its supplied sales remain visible. Do not replace missing history with zero or annualize partial October.

The user-supplied FY2026–27 ABP covers B2B–AP/TS and B2B–TN at product-category level. Preserve the blank AP/TS Mini Weeder target as unspecified. Achievement uses year-to-date sales through the source cutoff in only categories/cost centres with a stated target, regardless of the selected monthly view. Show excluded sales separately. No ABP is allocated to engine, blade, grade or SKU. Remaining category targets sum nonnegative shortfalls by category and cost centre; overachievement elsewhere does not offset a shortfall. This is not a purchase-quantity calculation.

Sales and ABP import together through authenticated `POST /lae-analytics/api/lae-sales/import` with `{dataset, stockId, expectedId}`. Validate all source-row totals, every cost-centre/month control and ABP totals. The active sales token and pinned MASTER ID reject concurrent/stale replacement. Append-only sales tables share only the analytics database; stock imports remain unchanged. Reports use bounded monthly arrays, indexed in-memory groups and 50-row pages; no per-group rescan of the full source. Limits are 32 MB, 50,000 detail rows, ten financial years and forty cost-centre coverage controls. The initial 883 rows and 10x 8,830 fit the count bound; 100x 88,300 is rejected and requires a new storage/import design, not a silent truncation. This is a bounded design assessment, not a load-test claim.
