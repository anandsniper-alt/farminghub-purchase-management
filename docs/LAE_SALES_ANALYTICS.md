# LAE Sales Analytics

## Current contract — 14 October 2026

DEC-138 / WF-133 supersedes the empty-release entry and placement below. Analytics now opens directly from Home at `/lae-analytics/`, with its own application, data volume and `lae-analytics-live` deployment branch. The source and two-computer workflow are documented in [the independent application contract](../analytics/README.md). The old hash URL redirects to the separate module. Purchase/costing retains `main`; analytics-only deployments do not restart it.

The user chose MASTER balances despite identified lookup/formula discrepancies. Import MASTER stock and monthly pipeline only, preserving its reported totals and original rows; do not substitute raw stock sheets. Main segment, annual business plan and sales remain pending. Shared Chennai and unallocated pipeline remain explicit. Ten focused analytics/navigation/identity checks and eight local browser checks passed; live publication is recorded separately. The initial source has 268 unique item codes across 23 product categories. The source workbook remains private and unchanged.

Imports are bounded to 32 MB, 50,000 items and 24 months. Reads aggregate before pagination (maximum 100 groups/items per page). Current 268, 10x 2,680 and 100x 26,800 items fit the count bound; the payload limit may bind first. Projection is linear in selected source rows and parsing is cached by immutable dataset ID; this is not a load-capacity certification. Dataset replacements use an optimistic active-source token and append-only history. Authentication is revalidated on every request. Static assets are a versioned copy within the analytics deployment, with no runtime purchase imports.

The user's module-specific release exception permits focused checks and quick analytics pushes without repeated purchase backup cycles. Existing purchase recovery policy remains in force for unrelated purchase/costing work. Shared host/proxy/authentication failures can still affect both modules; independent releases and data stores do not remove those dependencies.

## Historical empty release

DEC-137 / WF-132. User authorized publishing an empty workspace on 14 October 2026, before adding any data.

Entry: Farming Hub → LAE Division → LAE Sales Analytics (`/#/lae-sales-analytics`). Reuses the authenticated application, shared scope rules and Minimal navigation. Existing LAE Import or Domestic access is required to open the workspace. No account assignments change. Static module source contains configuration and empty presentation only, consistent with the existing application asset contract.

Overview, Annual plan & sales, Stock & pipeline, Purchase requirements and Data sources are navigable. Cost-centre and month selectors update the local view and preserve keyboard focus. Missing metrics display an unavailable dash and the missing source, never a measured zero. No business records, sample values, uploaded spreadsheet rows, product classifications, annual targets or sales are seeded. Data import and calculations remain pending source-format/mapping confirmation, explicitly stated in Data sources. This release adds no analytics API, tables, migrations, exports or purchase commands.

Confirmed cost centres: B2C - TN (Farming Hub), B2B - TN (TNWL), B2B - AP / TS (AP/HYD), B2B - Karnal (North). Chennai is shared warehouse stock counted once. Proposed reporting drill-down: Main segment → Product category → Engine/specification → Grade → Item code/model. Main-segment mapping remains pending. Combine brands in reports while retaining original source identity when data is added. Purchase shortages remain item-code-wise; another model's surplus must not offset them automatically.

Future inputs: approved annual business plan; versioned monthly forecast; dated sales and returns; stock snapshots and transfers; open purchase quantities and arrival dates; reviewed product mapping. Keep gross forecast, sales actuals and remaining demand distinct to avoid deducting sales twice. A stock outflow is not automatically a customer sale. Unknown quantities or costs must remain unavailable. Do not load existing purchase or costing state as substitute analytics data.

Implementation: `web/lae-sales-analytics.mjs`, shared app/navigation, scoped CSS and the standalone review manifest. Fixed-size empty content introduces no data query or new storage at current/10x/100x catalogue scale; the existing application bootstrap cost is unchanged. No capacity certification or future import design is implied. Future data ingestion requires bounded validation, duplicate handling, source provenance, authorization and recalculated reconciliation before it is enabled.

UI rules: UI-01–06 and UI-09–12; HIG R021–032, R067–073 and R135–140. Shared branding/motion and accessible labels/focus are preserved. No dialogs or write flows are added, so no new UI-07/08 behavior is needed. Native Apple assets are not used. Local and live verification are recorded separately; publication is pending until exact served source, health and data preservation are checked.

Local verification: all 597 native tests passed with the documented Python export runtime; review build and source-manifest contract passed. Authenticated local and standalone browser checks passed for all five sections, cost-centre/month filters and focus, module switching, 390 px layout and large text. No page errors or business-write requests occurred. Active-tab contrast measured 11.13:1. Publication remains subject to the recovery and live checks above.


Publication verified on 14 October 2026: the empty workspace is live at `/#/lae-sales-analytics`, runtime `5192c246c4b599c039e655e6c643a8fc8aeb4ed8`. All 597 native tests and exact-commit CI passed. Production health, four served assets, authentication boundary and seven desktop/mobile browser checks passed with no page errors or business-write requests. Main purchasing, Implements, BOM and Production fingerprints are unchanged. The fresh recovery ZIP and isolated running/candidate restores preserved all 34 tables; two verified recovery archives are retained. No analytics data was imported and no schema or data migration was introduced. This supersedes the publication-pending status above.
