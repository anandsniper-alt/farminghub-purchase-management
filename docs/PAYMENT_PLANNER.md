# LAE supplier payment planner

DEC-145 / WF-140. Implemented locally on 2026-10-24; publication is pending.

## Workflow

Open LAE Import > Payments > Payment planner. Outstanding payments open in the weekly supplier-column table. Tick one or more months to update the table immediately; Month summary shows one row per selected month with the same outstanding total. Weekly plan returns to weekly ranges. Click a nonzero supplier amount or row total for payment details, then Back to retain the selection. Weekly ranges are days 1-7, 8-14, 15-21 and 22-month end. Download Excel/PDF includes exactly the selected months, all suppliers, readable date labels and USD plus estimated INR. PDF keeps all supplier columns side by side, widening the page when needed. Exception views remain separate. The Overview dashboard is unchanged.

Managers and administrators can enter an estimated INR amount for one USD for each month. Missing rates remain pending. A planned payment date can be saved or removed with a reason. The contractual due date remains visible; moving a planning date does not remove contractual overdue status or authorize payment. Supplier acknowledgement, PI, artwork/specification, invoice, BL and existing authorization gates remain enforced by the payment workflow.

The workbook is workflow reference material only. There is no file connection, upload, synchronization or imported spreadsheet business data. Supplier payments are in scope; buyer-credit bank drawdowns, repayments, interest, bank fees and automatic bank transfers are not modeled by this feature. CNY and native INR stay separate from USD; no CNY conversion is assumed.

## Financial contract

- Future cash is the positive milestone amount less reported active remittances. Supplier realization does not re-create already remitted cash.
- Reported payments awaiting supplier acknowledgement have their own view. Signed receipt differences, excess remittances and unmatched retained allocations have a separate review view; they are not automatic credits, write-offs or new payments.
- Test, draft, pending-approval and cancelled orders are excluded. Deleted legitimate orders retain visible financial exposure and remain read-only until restored.
- In CI mode, recorded invoice balances retain their actual invoice/advance application values. Uninvoiced PO exposure is separate: positive PO value less active CI face values, less unapplied advance already represented in the plan. It has no invented due date. Paid or scheduled advance exceeding the remaining uninvoiced exposure raises a reconciliation warning; gross recorded obligations are not silently netted.
- USD-to-INR uses integer minor units and a positive rate scaled by 1,000,000. Round each monthly aggregate once to paise. Deterministically allocate remaining paise to rows by fractional remainder, then stable row identity, so week/detail totals reconcile. Changing the supplier filter recalculates the selected monthly estimate.
- Unscheduled amounts and missing rates are pending, not assumed zero. An empty cash requirement is explicitly zero. Totals never add different native currencies.
- Planning overrides carry order revision, currency, milestone/CI identity and terms/policy fingerprint. Financial or terms changes invalidate the override with a warning. Ordinary delivery of a due-date event can coexist with an explicitly saved planned date.

## Authorization and persistence

`GET /api/payment-planner` requires authenticated LAE Import access. Year, currency, supplier, section, month, date bucket and page are validated; detail pages contain at most 50 rows. Twelve monthly summaries and up to four bucket summaries are computed before pagination. The supplier matrix contains 12 month buckets and 48 weekly buckets, with at most 20 supplier columns per supplier page. It respects currency/supplier/year, independently of payment-detail filters. Row totals include every selected supplier; visible-column totals are also returned. The UI explains this when supplier pages are present. Supplier choices are capped at 1,000 and warnings at 20 with explicit truncation notices; a currently selected supplier remains available in the control. UI displays 25 detail rows per page. The same shared report serves the isolated review build.

`SAVE_PAYMENT_PLAN_RATE` accepts month, rate and remarks. `SAVE_PAYMENT_PLAN_DATE` accepts orderId, milestoneKey, date (or empty for removal) and remarks. Both require active Manager/Admin LAE access and normal authenticated, audited command handling. Date edits additionally require an editable issued business order and a current milestone. They update only planner settings, workspace revision and append-only history. They do not edit orders, authorizations, payment records, actual FX or financial evidence.

Planning writes retain conservative workspace conflict checks and durable actor-bound retry receipts. Saved state is under `settings.paymentPlanner`; no migration or default business values are applied at startup. Non-LAE scoped responses omit these settings. The client keeps open form entries through the existing conflict/session/unsaved-change recovery controls.

## UI and operational boundaries

The new UI loads when its route is opened. It reuses the Minimal brand, existing navigation, native labelled controls, shared modal focus/dirty guards, keyboard-scrollable tables and reduced-motion support. No additional framework or external data service is required.

Current staff expectation is up to ten desktop/laptop users. Bounded report responses and lazy UI reduce unnecessary rendering; whole-state storage and command responses remain existing scale limits. Local synthetic tests are not a live load or production-capacity certification. Release requires a fresh verified recovery backup, exact-source checks, explicit user approval and read-only live verification of preserved records.


## Weekly-grid verification — 2026-10-24

Local checks passed: 27 focused domain/report/UI/server tests, including supplier-column pagination, week/date boundaries, monthly paise reconciliation, scoped authenticated responses and drilldown navigation. The live-copy standalone demo was checked for weekly/monthly switching, month selection, exact supplier-week details and Back, empty currency/reset, and the existing FX dialog. At 390px and 1440px there was no page-wide overflow; controls met 44px, the table region was keyboard-scrollable, and sampled matrix contrast exceeded 4.5:1. Private screenshots and verification receipts remain outside the repository. No live publication or capacity certification is implied.

Filter alignment follow-up: shared grid rows align labels, 48px inputs/selects/actions and independent help text. Verified exact top-edge/height alignment at 1440px; paired year/currency controls and buttons align at 390px without page overflow. Existing saved browser draft and monthly rate were retained. UI-03/04/05 apply; calculations and data are unchanged.


## Dual currency and three-month management forecast (DEC-147 / WF-142)

USD tables show USD and estimated INR side by side for each supplier and overall totals in weekly, monthly and forecast views. In monthly views the rate button is below the month label. Missing rates show Pending, including incomplete period totals; zero obligations remain zero.

Choose 3-month forecast, select Starting month, then Show 3 months. This covers three full calendar months, including year boundaries, independently of the planning-year/detail filters. It defaults to the current India month; choose the following month for the next three complete months. Monthly rates can differ. Dates follow valid planning overrides or contractual dates. Reported remittances are already subtracted. Undated amounts and overdue amounts outside the window remain separate; blocked amounts inside the window are an included subset, not an extra amount to add. This is a dated supplier forecast, not a complete treasury forecast.

Download for Excel exports a UTF-8 CSV containing all supplier pages in the selected supplier/currency scope, monthly and period amounts, rate assumptions, snapshot/as-of metadata and the separate exceptions. Downloads reconcile supplier/month/period totals, reject changed revisions or incomplete pages, preserve integer minor units, and neutralize spreadsheet formula text. For USD it includes both currencies; CNY/native INR retain their own denomination. Excel is not linked to PMS.

Verification: 40 focused domain/report/UI/server/export tests passed; the UI check was repeated after moving the forecast qualifications below the table. Browser checks verified dual-currency weekly and monthly views, October 96-rate persistence, Nov-Jan year crossing, actual CSV download/readback, 390px overflow and 48px filter controls, and desktop table alignment. No browser console errors were recorded. The copied source workspace remained exactly preserved by the standalone build checks. No live publication.


## Excel and PDF downloads — DEC-148 / WF-143
Download Excel now produces a real .xlsx workbook; Download PDF produces a downloadable PDF, with no print-dialog dependency. Both are available in weekly, full-year monthly and three-month forecast views. Exports match the selected table period/currency/supplier and include all supplier pages. They validate that source revision, filters, rates and totals remain consistent during collection, and reconcile supplier cells to every period total before writing. Excel retains supplier columns and period rows, numeric values, grouped headers, frozen panes, and a separate Assumptions sheet. Exact amounts exceeding Excel's 15-digit precision are explicitly stored as decimal text. PDF uses landscape pages, readable supplier groups, repeating headers and all-selected totals (counted once), rate assumptions and source notes. Missing INR remains Pending. Exports are snapshots, not linked spreadsheets. The previous CSV helper remains for regression compatibility but its UI control is superseded.

Download validation: 58 focused tests passed. All six browser downloads succeeded across weekly/monthly/three-month layouts. Independent XLSX readback and PDF text extraction reconciled the exported totals; the current weekly workbook sheets and all three PDF pages were rendered and visually checked. Mobile download controls are 44px with no page-wide overflow. No browser console errors. Current demo source/draft preservation checks passed; no production changes.


## Selected months — DEC-149 / WF-144 (supersedes fixed forecast controls)
Tick one or more months in the selected planning year. Each checkbox immediately updates the table. Month plan and Weekly plan retain exactly the same chosen months and outstanding total; monthly rows use whole-month obligations, weekly rows use the existing four dated ranges. Cleared selections remain explicitly empty with downloads disabled. Currency and supplier Apply retain selected months; a changed year selects a valid default. Drilldown/Back and URL reload retain the checked months. Download Excel/PDF includes exactly those months and all selected supplier pages; disjoint months are listed individually rather than implied as a continuous interval. Fixed three-month and Show month controls have been removed from the UI. Historical report APIs remain compatible.

Selected-month validation: 63 focused tests passed. Browser checks confirmed immediate checkbox updates, identical October/November totals across weekly and monthly layouts, explicit empty selection with disabled exports, keyboard selection, persistence on reload, October/December-only Excel/PDF readback, retained saved October FX, 44px-or-larger checkbox targets at 390px, no page-wide overflow and no console errors. No live changes.

Excel date-format follow-up: Weekly date ranges and the Assumptions sheet now match the planner display (01 Oct 2026 – 07 Oct 2026). Period headings use full month names, and as-of dates use day, abbreviated month and year. Row heights allow both the week number and date range to remain visible. Thirteen focused export tests passed, including leap-day labels. The downloaded October/November/December workbook was independently read back and both sheets rendered; all 12 weekly rows and USD/estimated INR totals matched the displayed demo. No live changes.

PDF date-format follow-up: PDF weekly ranges now use the same day/month-name/year format as the planner and Excel (01 Oct 2026 - 07 Oct 2026). Selected-month headings use full month names, and as-of dates use the same readable format. Fifteen focused PDF/export tests passed, including leap days, pagination and preserved financial values. The downloaded October/November/December PDF was independently extracted and all five pages rendered and reviewed; date labels and both currency totals matched the demo. No live changes.

PDF supplier-column follow-up (supersedes supplier-group pagination): All suppliers in the selected scope now remain side by side in one horizontal table. The PDF uses landscape A4 for smaller tables, landscape A3 when needed, and a wider custom page for larger supplier counts. Long date periods may continue vertically with every supplier header repeated; totals appear once. Sixteen focused PDF/export checks passed, including 4/5/20 suppliers and vertical continuation. The actual October-December demo download contains all four suppliers, 12 weekly rows and both currency totals on page 1; page 2 contains report notes only. Both pages were rendered and reviewed. Demo only; no live changes.

Weekly-default follow-up: Payment planner opens and resets to the weekly outstanding plan. Monthly aggregation is selected explicitly with Month summary; Weekly plan returns to the default layout. Unknown or legacy forecast layouts fall back to weekly. The selected-month scope, amounts and rate estimates remain unchanged between views. Four focused UI/selection tests passed. Browser checks verified default entry, Month summary, equal outstanding totals, return to weekly and sidebar re-entry. Demo only; no live changes.

Payments navigation follow-up: Payment planner is now a subsection of Payments, alongside Payments & settlement. Its separate sidebar entry is removed; Payments stays active while planning, and the breadcrumb includes Payments. Existing planner URLs and LAE Import access restrictions remain supported. Fifteen navigation/UI tests and app syntax checks passed. Browser verification confirmed the nested entry, active parent, breadcrumb and weekly planner. No live changes.
