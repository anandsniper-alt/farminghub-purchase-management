# LAE Stock Aging

Local candidate, 1 November 2026. DEC-157 / WF-152 supersede the earlier quantity-only aging view. Publication requires the existing backup, restore, exact-release and protected-data checks.

## Scope and allocation

The page at `#/stock-aging` includes only models linked to the approved forecast. Overall stock includes allocated and unallocated stock exactly once. Division selection shows only that division's allocated quantity and physical inventory value. This is an analytical allocation for planning, not a warehouse reservation or inventory posting.

Use explicit division planned quantities from the forecast. Preserve its stated period and carry-forward/sales adjustments; do not substitute YES flags or assume a multi-month net plan is one month's demand. When stock is insufficient, allocate available net stock proportionally to division demand using largest-remainder quotas. Use oldest dated physical stock first, sharing serialized batches fairly against remaining quotas. Unknown dates are used last. Whole-piece plans retain whole-piece allocations; fractional units use fixed precision. Stable division order resolves equal rounding remainders.

Compute allocations across all divisions before display filters. Selecting fewer divisions never reallocates stock. Zero-plan stock remains unallocated. Signed negative adjustments reduce net capacity and remain in the unallocated reconciliation; they are not assigned to divisions. Show planned, allocated and shortfall quantities independently. Never combine units in a total.

## Aging and valuation

Bands are 0–60, 61–120, 121–240, 241–360, 361–720, 721–1080 and above 1080 calendar days, plus unknown. Default age-as-of is the closing-stock date. A later age date changes age only, not quantities or costing dates. Display all three dates.

Use the approved import-age date. Missing dates may use a receipt proxy only with exact purchase RO, invoice and item identity and one supported consistent receipt date. Preserve approved explicit aliases and evidence separately. Multiple receipt dates, absent matches, invalid and future dates remain unknown. A price-reference RO is never a substitute for physical purchase ownership.

Values use source physical original or revised before-GST landed cost, not virtual motor-inclusive sale-set price-list costs. Preserve unknown costs, quantity-only rows and valid zero costs as distinct states. Display known subtotals with pending-cost quantities. Fixed-point quantity and INR arithmetic preserves allocations and aggregate values. Source rows and valuation evidence are immutable.

## UI and architecture

Reuse the existing Minimal green design, semantic native filters, division checkboxes, shared dialog and responsive horizontal table regions. Overall stock is the default. Division selections, category, unit, value basis and age date update directly; text search has an explicit Search button. Routes preserve filters. Clicking a category/band value opens bounded source-batch details with division, item, barcode/batch, warehouse, age, allocated quantity, unit cost and value. No-selection is explicit empty, never all divisions. Loading, failed-request retry, permission changes and stale responses are handled. Shared modal refresh is required after asynchronous detail loading.

`shared/lae-stock-aging-allocation.mjs` owns validation, allocation and reporting. `server/lae-stock-aging-store.mjs` owns separate immutable snapshots and activation history. `GET /api/lae-stock-aging` requires authenticated LAE access. Administrator `POST /api/lae-stock-aging/import` requires origin/CSRF, expected revision, reason and durable idempotency key. Import does not overwrite the existing current-stock module or business workspace. Public metadata uses a safe allowlist. Review builds contain no private stock unless supplied separately in a private local demo.

Limits: 200,000 source rows, 10,000 plans, 250 category/unit groups and 200 drilldown rows per page. Full division coverage controls remain complete even when plan details are capped. Prepared immutable data and bounded response caching improve repeated reads. Local synthetic 10x testing measured a multi-second cold query; this is not production load certification. Indexed/precomputed aggregation or asynchronous preparation is required before scaling to that workload; 100x is not supported by this candidate.

## Verification

Verify inclusive boundaries, missing/future dates, whole and fractional units, shortages, zero plans, negative adjustments, equal quota ties, serialized batches, unknown/zero costs, division selection, full controls and pagination. Exhaustive and deterministic scenario tests reconcile source capacity, division quotas, FIFO and exact fixed-point values. Independently reconcile the entire supplied snapshot and each age band. Authentication, immutable storage, hash tampering, CSRF, revision conflicts, retry identity, rollback and unchanged business records require native API tests.

Local desktop/mobile browser checks cover overall/all/selected/no divisions, original/revised basis, unknown-age and category drilldown, Escape and responsive scrolling. Private proof artifacts remain outside the repository. No live deployment is implied by local validation.

### Item summary before barcode detail — 1 November 2026
The value popup now opens with a code-based item summary, followed by the barcode list. Summary quantities and known values cover the entire selected age/category/division population before barcode pagination; missing costs remain explicit. Brand/master identities are retained even if names differ. Item summaries paginate independently at100 rows, with full matching totals; barcode pages remain bounded. No allocation, costing source or business-record change.

### Screen redesign — 1 November 2026
DEC-159/WF-154 is local-only. Overall stock hides the inactive division chooser; Division allocations exposes four checkboxes and an explicit selected scope. Search, category and cost basis remain primary; unit/date sit under More filters. Stock, known value, pending-cost quantity and unknown-age quantity use separate per-unit cards. Dates and forecast period remain visible. The category/division column and table header remain visible within the named scroll region; totals precede age bands. Coverage/guidance are native disclosures. Existing shared modal, focus return and item-first evidence order are preserved.

Fresh focused verification: seven UI tests and three build/runtime-contract tests passed; sixteen allocation tests passed with unchanged calculation code. Browser checks at 1440px and 390px covered scope switching, TNWL-only/none/overall, aligned summaries, bounded table scrolling, Enter opening, unchanged item totals on barcode page two and Escape focus return. Narrow-screen primary controls measured44px; sampled normal-text contrast met4.5:1 after correcting the local-demo label. Larger-text and reduced-motion behavior are inherited, not newly certified by these checks. No new rendering loop or dependency was added; existing current/10x/100x capacity limitations remain unchanged.

### Highest-value categories first — 1 November 2026
User-requested local-demo ordering: category/division rows sort by total known INR value descending for the active original/revised cost basis and current filters. Compare fixed-point amounts before display conversion; preserve stable division/category/unit tie-breaks. Unpriced rows remain last, distinct from real zero and negative adjustment values. Unit totals, allocations and barcode age ordering are unchanged. The value column exposes aria-sort and a downward arrow.

### Authorized publication scope — 1 November 2026
The user approved publishing this reviewed Stock Aging screen and its reviewed forecast-scoped snapshot. This supersedes the local-only publication boundary for DEC-157–159/WF-152–154. Deployment still requires the fresh full recovery backup, isolated restore/import rehearsal and exact-release checks; authorization alone is not a claim of completion.

Import a business-field allowlist only. Keep local evidence paths, credentials, operator reports and source workbooks outside the deployment and imported payload. Inferred nearest/oldest matching RO references remain distinguishable from original purchase proof; they do not change source import dates or the retained price-reference RO. Missing identities and costs stay unresolved. The separate Current stock costing snapshot, purchase workspace, payments and historical evidence must remain unchanged by this import.

### Interactive classification and display — 2 November 2026
DEC-160/WF-155 is a local demo change. Division checkboxes are always visible; choosing any switches to allocated stock, while Overall stock explicitly includes unallocated stock. Select one, several, all or no divisions without redistributing the original allocation.

Category names now open category filtering. Powerweeder categories expose Engine and Grade; chaff cutters expose Blade count. Planned vendor uses the forecast vendor code, not an assertion about a batch's historical purchase supplier. Classification is supplied as optional row strings from the verified forecast plan linkage, never guessed from changing item names. Missing classifications appear as Not recorded. Blade counts normalize four/five while source qualifiers remain in private evidence. Other categories retain planned-vendor filtering. Switching categories clears incompatible attribute selections.

Quantity only, Value only and Value + quantity apply to the overall table body and footer. In combined mode, choose whether numeric sorting uses quantity or value. Category, total and every individual age-band header sorts the complete grouped result before display; first selection is descending and repeated selection reverses it. Missing-value groups remain last, including when valid values are zero or negative. Stable category/division/unit ties preserve deterministic output. Headers expose aria-sort; controls preserve focus and URL state.

All stock summaries, buckets, item summaries and barcodes use the same filtered population. Allocation still runs on the complete immutable snapshot before filters. Full matching forecast plan/shortfall figures are labelled separately when an attribute or text filter selects only part of a model; filters cannot invent vendor-specific forecast demands. Facet choices follow the category and unit and retain alternatives so users can change a selected value.

This extends existing shared read queries and optional snapshot fields, with no new dependency, business mutation or database schema change. Native tests cover combined filters, missing classifications, quantity/value/bucket sorting, division allocation preservation, full totals before pagination, stored-query cache isolation, permissions and standalone bundling. At current volume the extra facet passes are linear; existing 200,000-row/10,000-plan limits and current/10x/100x capacity restrictions remain. This does not certify a new load limit or authorize publication.

Quantity-mode clarification, 2 November 2026: retain Total quantity and add a separate sortable Total known value column, including its filtered footer. Age bands stay quantity-only. This value column always sorts by INR, independently of the quantity measure used for age buckets.

### Publication scope confirmed — 2 November 2026
The user approved publication of the pending DEC-160/WF-155 controls and DEC-161/WF-156 shared navigation drawer after reviewing the distinction between live data and demo-only presentation. This supersedes their local-only authorization boundary. The release changes query/display behavior and navigation, not stored stock, costs, physical dates, forecast quantities, purchase orders or source documents. Existing division allocation and before-GST valuation rules remain unchanged. Hiding the Unit filter and renaming the overall/allocated views remain suggestions outside this implementation. Publication must be established by exact-running-release and read-only live checks; authorization alone is not verification.

### Unallotted reporting group - 2 November 2026
DEC-162/WF-157 adds UNALLOTTED to report filters only. Four division demands and their allocation remain unchanged. Residual positive stock and signed negative adjustments appear under Unallotted. All five selected groups reconcile to overall quantity and fixed-point value. Empty legacy allocated selection still means the four actual divisions. One All stock control and five checkboxes replace the former two scope buttons. View unallotted items opens the existing item-summary/barcode modal, retaining active item/category/attribute/cost filters while clearing its age-band restriction. No stock import, schema change or business write is required.
