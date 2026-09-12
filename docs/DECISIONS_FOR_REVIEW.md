# Policy assumptions exposed by the first working build

These are explicit pilot behaviors, not approvals inferred from a button or from this document.

| Topic | Alpha behavior | Before live rollout |
|---|---|---|
| Scope | LAE Import, manual PO entry | Add other divisions only after their own flows are approved. |
| Technical package before PLM | Interim versioned text released by Product Manager | Confirm the temporary owner/process and how the dedicated PLM will replace it. |
| Pending new version | New PO issue held by default; admin can permit an existing approved version | Confirm warning-versus-block policy. An unapproved version is always forbidden. |
| Artwork after PO | Separate controlled annexure, Product Manager approval and supplier acceptance | Confirm whether each category/order needs an additional formal PO-revision step. |
| Physical closure | Actual destination-port arrival, after all non-cancelled ordered units arrive; partial quantities remain open | Confirm the boundary against the earlier warehouse terminology. Warehouse receipt remains ERP-owned. |
| QC issue | Dispatch blocked until satisfactory QC and all alteration checks | A manager waiver/exemption workflow is not implemented. |
| Warning settings | Three days before due, ten-day booking lead, at least weekly recurring follow-up | Replace with agreed operating times. |
| Total TAT | Manually entered; supplier/route durations retained as references | No automatic calendar/holiday engine is assumed. |
| Import data | Base/brand mapping is explicit; missing vendor rejected for a new upload | Validate the live vendor codes and fill missing source references. |
| Bank details | Not mandatory; bank transfers are outside this website | Authoritative banking-data ownership and validation remain later work. |
| Excess payment | Visible against the original order; no cross-order auto-netting | ERP/accounting will supply final refund, credit-note or write-off treatment. |
| Performance ratings | Not calculated in this alpha | Finalize rolling/yearly/overall weighting and integration without auto-changing vendor ACTIVE status. |

## Shipping & freight decisions added in 0.3.0-alpha.3

| Topic | Current alpha behavior | Future / review note |
|---|---|---|
| Pre-production sample | Mandatory before bulk production; Purchase Executive or Purchase Manager may approve | Fine-grained roles can be tightened later. |
| Bulk-production QC | Mandatory PASS before Production Complete | Purchase records QC now; direct QC-team access may come later. |
| Container booking | May start while bulk production is active | Booking lead can be tuned later. |
| Container release | Separate milestone; means empty container handed over for factory loading | Factory gate-out / terminal gate-in are not mandatory stages. |
| China inland movement | Structured milestones for factory loading, inland departure, rail/river station, rail/river movement and origin seaport | Live multimodal API is deferred. |
| Weekly tracking | Manual VJ-style XLSX/CSV upload; forwarding-agent Ref is primary match key | Exact Ref matches may be confirmed/committed; unmatched rows stay visible for review. |
| Shipment dates | Earliest planned ETD/ETA are retained; revised/current and actual dates are separate | Revised dates are visually distinguished. |
| Vessel loading gate | Requires released container, production complete, bulk QC PASS, pre-dispatch QC PASS, current confirmations, Commercial Invoice, Packing List, verified BL draft, insurance, applicable payment reporting, vessel and voyage | Checklist is an internal control, not a legal/customs certificate. |
| Insurance | Farming Hub-arranged master policy plus separate declaration/certificate for every shipment | Final policy/document structure should be confirmed before live rollout. |
| Freight benchmark | Weekly rate history by exact route/via/destination/container; warning when booked freight is more than USD 100 above latest rate | Threshold is configurable. |
| Rate trend | Rising/falling/stable trend from retained weekly history; active unbooked production can show advance-booking watch | Decision remains human; no automatic booking. |
| Cost per USD | **Deferred by user** | Build only after a sample costing worksheet/method is supplied. |
| Cross-PO loading | Same-supplier cross-PO combined loading is a known real-world exception | Not implemented in this alpha. |
