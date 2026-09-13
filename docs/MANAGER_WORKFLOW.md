# Independent Purchase Manager workflow

## Published and activated — 13 September 2026

The user requested publication after the bug fixes. Runtime commit **f5d55146cd7428cc72d6f6ef6bcc52ead48b63df** is deployed at https://purchase.dvjassociates.com. Coolify deployment **fghgsunna2djj2wpin1ytwao** finished successfully; application status is running:healthy and /api/health returns HTTP 200. Eleven served assets match the release commit byte for byte.

The independent Manager preset was saved through the live Admin browser, with the confirmed reason and self-approval acknowledgement. All 13 stages include MANAGER and survive reload. Ashok and Suresh were both verified as active MANAGER accounts assigned to LAE Import; their existing roles/scopes were not changed. Approval-control revision is **2**. Other configured role grants remain intact, and Admin retains later per-stage editing.

The deployment preserved the business state exactly: 29 orders, including all 15 retained QA POs. The policy save appended exactly one APPROVAL_CONTROLS_UPDATED event; orders, payments, files, users, vendors, items, bases and costs stayed unchanged. The existing /app/data persistent volume and domain configuration are unchanged. No new test purchase, deletion, payment or shipment action was performed.

Live verification: 10 release-browser checks, 27 activation checks, 11 asset comparisons and health checks passed. Evidence remains in ignored test-output/manager-release and sanitized Coolify deployment reports. Earlier local verification remains 135 native checks, 33 setup checks, 29 approval-control checks, 38 import-lifecycle checks and six complete flows across two isolated Manager accounts.

This establishes deployment, published entry points, retained data and effective Manager approval policy. It does not replace the original live 340-scenario QA ledger or claim a new end-to-end login run as Ashok/Suresh. Real supplier/quote/evidence prerequisites and the previously documented infrastructure and finance/date-policy acceptance items remain. Earlier “local only / activation pending” paragraphs below describe pre-release history.


Decision: DEC-030 / WF-024, 13 September 2026. The user confirmed this access for **every Purchase Manager**, including Ashok and Suresh when their active accounts have the MANAGER role and LAE Import division.

Implementation is local and tested. **Live deployment and the one-time Admin policy save have not been performed in this change.** Existing production settings are not silently overwritten by startup or by this document.

## One-time activation

1. Deploy the tested application through the existing main / Docker / Coolify process, preserving the persistent volume and all QA records.
2. Sign in as Admin. Verify Ashok and Suresh are active Purchase Managers assigned to LAE Import; use the existing role/division editor only if necessary.
3. Open Users & settings → Manage approval controls → **Enable independent Manager workflow**.
4. Review the 13 stages, reason and self-approval disclosure. Confirm and save. The preset adds MANAGER while preserving other configured roles. It does not save until explicitly confirmed.
5. Managers open Users & settings → **Your workflow access** to verify every stage is Allowed. Existing sessions use the saved policy on their next request.

No September expiry or automatic reset exists. Admin can later remove individual grants or restore standard roles, with a reason and a new history entry. Completed approvals stay valid.

| Approval stage | Independent workflow |
|---|---|
| PO approval and issue | Purchase Manager |
| Return PO for correction | Purchase Manager |
| PO amendment approval | Purchase Manager |
| Supplier PI approval | Purchase Manager |
| Payment milestone authorization | Purchase Manager |
| Void payment record, correction only | Purchase Manager |
| Order artwork approval | Purchase Manager |
| Technical specification approval | Purchase Manager |
| Technical specification rejection | Purchase Manager |
| Brand-specific change approval | Purchase Manager |
| Brand artwork approval | Purchase Manager |
| Pre-production sample approval / rejection | Purchase Manager |
| Initial payment completion / automatic authorization | Purchase Manager |

User creation, role/division management, approval-policy changes, and PO deletion/restoration remain Admin-only. They are not normal purchase-progress steps. Template administration remains separate; managers can use existing templates for product revisions.

## Daily flow without an Admin handoff

1. **Supplier:** Vendor master → Add vendor or Upload vendors. Select valid commercial defaults and the permanent full vendor reference. Vendor View → Change history shows local actor and before/after values.
2. **Product:** create the PLM base linked to the supplier. Add or import ERP items; imported unmapped rows have **Set up item**. Select explicit base and brand, then approve brand differences.
3. **Technical/artwork:** propose and approve technical revisions and brand artwork, or reject a technical proposal with a reason. Missing approved technical PLM retains its established warning path; pending versions and required brand approvals still follow policy. Issued snapshots never change retroactively.
4. **Price:** Add / revise price or Upload prices using full vendor code, Base Item Code, USD/CNY, unit price and effective date. Price imports reuse the existing save/rounding/history rules; they never reprice issued orders. Zero reference prices remain allowed, but zero-price PO issue remains blocked.
5. **PO:** create quantities, terms, planning TAT and dates; submit, review and approve/issue. Return for correction or use an amendment for changes after issue.
6. **Commercial confirmation:** retain supplier acknowledgement; record, verify and approve PI; record technical confirmation; approve order artwork and obtain supplier acknowledgement.
7. **Initial payment:** report the actual remittance with evidence, using the Indian-bank rate. BOC is an optional reference; actual supplier receipt remains separate. Complete the required initial payment before production lead time starts.
8. **Production:** record sample completion, approve/reject sample, start bulk production, record QC PASS and complete production. Correct failed evidence/QC through the established controls.
9. **Booking:** plan shipment quantity, select an active logistics provider and record its unique Ref. If the correct benchmark is missing, choose **Add supplied benchmark**, enter the forwarder's quoted ocean freight and attach the quote. The existing agent-charge formula produces the benchmark and returns to booking. Never invent an operational quote or select an unrelated route/container.
10. **Shipping:** confirm booking, release container after production/QC, track movement, attach CI and packing list, satisfy shipment payment milestones and record vessel/voyage/departure. Final BL verification then insurance precede India-port arrival.
11. **Settlement:** authorize/report remaining milestones and record actual supplier receipts. Review each original-order balance. Arrival is operational completion; SETTLED means financial completion. Partial shipments leave remaining quantities open.
12. **Corrections/follow-up:** keep supporting files, reasons and history; use tasks, notes, amendments and receipt corrections. Do not delete live QA records.

## Import contract

Vendor/price imports accept one XLSX/CSV, up to 500 rows, with downloadable templates, preview, validation export and explicit atomic commit. Rejected or duplicate normalized keys block the whole batch. Missing vendor fields on an update retain prior values; explicitly blank optional cells clear them. Supplier identity cannot change. Only Managers/Admins import vendors; existing purchase-editor access applies to prices/items.

Item upload retains the existing 2,000-row contract and explicit base/brand setup; ambiguous supplier shorthand requires the full reference, and foreign-division identities cannot be overwritten. Workbook content does not confer approval. Imported source files and batch history are retained. Price import history is available beside Upload prices.

## Remaining operational prerequisites

An active correctly scoped account, actual supplier confirmations, evidence, valid commercial data and genuine forwarder quotes are still required. These are not permission bypasses. Infrastructure fault/restore/scale scenarios in the original QA ledger need isolated test fixtures; they are not resolved by approval relaxation. Currency-policy, future-price activation and extreme planning-date policy questions remain separate product decisions.

See [the current execution report](QA_EXECUTION_REPORT.md) for test counts and publication status. Historical live failures remain in the original ledger until the corresponding scenario is actually retested on live.
