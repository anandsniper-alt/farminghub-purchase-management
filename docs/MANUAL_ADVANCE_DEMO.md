# Manual advance payment — local workflow demonstration

Date: 2026-09-26. Related records: DEC-090 / WF-084.

**Status: demo only.** The user requested an interactive demonstration, explicitly excluding live changes. This document describes proposed behavior for review; it does not establish approved production payment or permission rules. The live Supplier Payment Terms Master, PO validation, payment commands and approval controls remain unchanged.

## Open and use

The isolated prototype is in `prototypes/manual-advance/`. It uses a synthetic USD 50,000 order and local browser state. It has no application API or production-data connection. Any role, bank transaction, evidence, supplier receipt or invoice in this demonstration is simulated. Use the demo reset control to begin again; do not enter real bank or customer information.

Start it from the active checkout:

```powershell
node prototypes/manual-advance/server.mjs
```

Open the random `http://127.0.0.1:<port>/` URL printed by the command. The server binds localhost only and serves an explicit static-file allowlist; there is no application API or database. Its content security policy disables outgoing fetch connections.

## Proposed end-to-end flow

1. **Purchase order:** choose Manual. The PO captures no advance amount. Show **Advance details pending**, not zero due. Create the synthetic PO, then approve its sample PI using the demo control. These simulated steps do not bypass the real application approval prerequisites.
2. **Initial Payment Capture:** choose Percentage or Fixed amount, enter the value and a supplier-agreement reason, and review the calculated advance and remaining order value. For USD 50,000, 3% is USD 1,500, 4% is USD 2,000 and a fixed USD 5,000 leaves USD 45,000.
3. **Balance terms:** explicitly choose Before shipment or BL date plus credit days. Start unselected. These alternatives are proposed for review; the user's final balance-term policy remains undecided.
4. **Advance approval:** the prototype proposes Manager/Admin approval of the defined advance. Role switching is demonstration only, not authentication. This proposed stage does not change the current production approval matrix.
5. **Record payment:** enter a simulated bank reference, date, amount and evidence confirmation. Multiple partial payments may cover the approved advance; pending supplier acknowledgement still counts toward the amount already paid. Do not label an incompletely paid advance as complete.
6. **Supplier receipt:** separately confirm receipt against an existing payment. This does not create another payment or increase the amount paid.
7. **Invoice processing:** apply the available advance to a simulated invoice, display the invoice balance and keep the source-payment/order links. Never apply the same advance twice or exceed the invoice value or remaining unapplied advance.
8. **Review history:** show the recorded definition, approval, payments, acknowledgements and invoice applications. History is local prototype evidence, not the production audit ledger.

## Proposed fields and calculation contract

| Area | Fields / calculation |
|---|---|
| Order context | Read-only PO/PI reference, supplier, USD order value |
| Advance definition | Percentage/Fixed selector; conditional number; reason; calculated advance; remaining order value |
| Balance agreement | Explicit Before shipment / BL plus days choice; credit days when applicable |
| Approval | Simulated approving role and recorded decision |
| Payment | Bank reference, payment date, actual USD amount, simulated evidence; paid and pending totals |
| Supplier confirmation | Link to the recorded payment; confirmed receipt state |
| Invoice application | Invoice reference/value; allocated advance; remaining invoice balance; unapplied advance |

**Units and rounding:** USD amounts have two decimals; percentage inputs have two decimals. Calculate the percentage once against the approved synthetic order value and round to cents. Compute remaining amounts by subtraction using exact minor-unit arithmetic. Fixed amounts are USD in this prototype; no currency-conversion example is provided.

**Validation expectations:** an advance must be positive and cannot exceed the order value; percentages must be greater than zero and at most 100%; required agreement fields cannot be blank. Prevent payment beyond the approved advance remaining and duplicate bank references. Acknowledgement does not double-count a payment. Invoice allocation is positive and bounded by the invoice value and unapplied advance. Errors must leave entered data intact and identify the next corrective action.

## Deliberate limits and decisions still pending

- No live Manual template, migration, bank transfer, upload, supplier message, production lead-time update or ERP posting is performed.
- Manager/Admin amount approval, partial advance support and per-order balance terms are proposals, not binding policy. A prototype role selector does not prove server authorization.
- Controlled changes to an already approved advance, PO revisions after payment, void/replacement records, exchange rates, multiple-currency remittances and full shipment/payment follow-up integration require production design and testing before adoption.
- Real implementation must reuse shared domain validation, authenticated identity, current configured permissions, optimistic revisions, immutable issued snapshots, existing file evidence and append-only audit. Existing saved orders and recorded payments must be preserved.
- The prototype is outside the runtime build and Docker allowlist. Do not publish it or synthetic data with the live application.

## Verification

Current prototype evidence, 2026-09-26:

- **15 prototype engine tests passed**, covering the local financial state logic. These are synthetic tests, not a test of the production payment engine.
- The browser walkthrough created the USD 50,000 Manual PO and approved its sample PI. Previews displayed 3% = USD 1,500, 4% = USD 2,000 and fixed USD 5,000. The BL + 30-day agreement required a reason; Executive approval was disabled and simulated Manager approval succeeded.
- Recorded USD 2,000 and USD 3,000 partial advances. The browser rejected a USD 3,000.01 payment exceeding the remaining advance and duplicate reference `DEMO-ADV-1`. Confirming both receipts did not increase the amount paid.
- A USD 50,000 invoice with BL date 2026-09-26 displayed due date 2026-10-26. Applied the USD 5,000 advance once, recorded the remaining USD 45,000 and confirmed receipt: the demo reached SETTLED with zero balance.
- Reload preserved the local demo state; history was readable. Browser warning/error logs were empty during this walkthrough.
- Voided the acknowledged invoice balance payment using the inline reason control: USD 45,000 reopened. Recorded replacement `DEMO-BAL-2` through the updated invoice form field names, confirmed receipt and returned to SETTLED. This remains a simulated accounting-record correction, not a bank reversal.
- The inline Reset control worked. A fresh sample PO and PI were prepared and the browser was left on Initial Payment Capture for user review.
- At 390px viewport width, the document had no horizontal overflow and all visible inputs stayed within the viewport. The screenshot was visually reviewed, then the original viewport was restored. Warning/error logs remained empty.
- Static-server checks returned 200 for the root and allowed assets; `/api/state`, `/.env`, `/server/index.mjs` and POST `/` returned 404. The response CSP includes `connect-src 'none'`. The 15 domain tests were rerun and passed.
- Invoice field IDs were checked in code and a single invoice submission was browser-tested. Multiple-invoice DOM uniqueness was not browser-tested.

No real payment, upload or business record was created. No live page, production command or deployment was changed. Historical production/review test counts are not evidence for this demonstration.

## Superseded — 2026-09-26
The user replaced this demonstration with typed first/second advances in the existing Supplier Payment Terms Master. See DEC-092/WF-086 and VALUE_PAYMENT_TERMS.md. Preserve this document as history; do not adopt its Manual-at-capture approval flow. No live publication occurred.
