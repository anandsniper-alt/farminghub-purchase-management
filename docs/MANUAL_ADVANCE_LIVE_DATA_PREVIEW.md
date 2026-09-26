# Manual advance — actual-application preview with copied data

Date: 2026-09-26. Related records: DEC-091 / WF-085. Prior synthetic demonstration: [Manual advance demo](MANUAL_ADVANCE_DEMO.md), DEC-090 / WF-084.

**LOCAL TRIAL ONLY — DO NOT PUSH OR DEPLOY.** The user authorized an actual-application preview using a fresh copy of live data and explicitly withheld live publication until approval. This authorizes local implementation and review, not production adoption of new payment or permission policy.

## Purpose and proposed local scope

Integrate the Manual payment-term path into the real Purchase application screens rather than the isolated prototype: Supplier Payment Terms Master, PO entry, Initial Payment Capture, order/payment views, next-step guidance and approval controls. Reuse the application shared domain and authenticated server workflow. The preview should show percentage/fixed advance definition at initial capture, approval, payment/receipt tracking and subsequent balance processing using local data.

All new policy remains a **local candidate**. Manager/Admin approval defaults, partial advances and per-order balance choices are not binding production rules. Existing production controls and previously recorded financial commitments remain the authority for the live site until a separate confirmed release decision.

## Data isolation and privacy

- Capture the signed-in user's permitted application state and referenced evidence through read-only live endpoints, then run the application against a separate new local SQLite database. Authentication login/logout are session actions, not business writes.
- The source capture reported revision **1584**, runtime **602af7d1d5db6488220fc11ef0f6e33aa71e686b**, 36 orders, 41 vendors, 10 payments and 183 visible file metadata records. These are capture-scope counts, not a claim that the export is a complete production backup or every server account/file.
- Keep the original captured JSON unchanged. Keep captured source data, evidence, credentials, temporary databases and test artifacts in ignored private `test-output/` storage. Do not add record contents or credentials to documentation/Git.
- Bind the preview server to loopback only. Serve evidence from the isolated local copy; do not implement a proxy or redirect to live APIs. Local payment or PO actions must never reach production.
- Never overwrite or restore production from this copy. No migration, mass conversion to Manual, live database command or deployment is authorized.
- Evidence copying and local restoration were in progress when this document was created. Do not claim file completeness or preservation verification until the actual checks finish.

## Existing-order and financial preservation

1. Keep all copied original order terms, issued snapshots, payments and audit history intact when importing the capture into the local database.
2. New local POs may explicitly choose Manual. Existing local orders must use an explicit controlled terms revision where eligible; selecting a master template does not rewrite their agreement automatically.
3. Preserve recorded payments and supplier acknowledgements. A newly defined Manual obligation must not recalculate, duplicate or silently erase historical payments.
4. Capture percentage/fixed amount, basis value, currency, calculation result, reason, proposed balance terms and approval evidence in the order's local history. Keep blank/undefined distinct from zero obligation.
5. Use existing payment commands, currency checks, bank evidence, revisions and audit wherever compatible. Any new local financial rule needs focused verification before being offered for live approval.

## Review sequence

1. Confirm local origin and visible local-preview notice.
2. Inspect the copied Supplier Payment Terms Master and add/select Manual only in the local application.
3. Open a new local PO or an eligible existing-order controlled revision; explicitly choose Manual.
4. Approve/verify the PI through the actual candidate application's prerequisites.
5. Define the advance in Initial Payment Capture, review the amount and explicitly choose the proposed remaining-payment rule.
6. Exercise allowed/denied approval roles, valid/invalid payments, partial settlement, receipts and subsequent balance processing against the local database.
7. Inspect order totals, payment links, next-step guidance, history and unchanged unrelated/historical records.
8. Let the user review the local screen. Await an explicit publication decision; preview completion is not release authorization.

## Verification status

Pending current integrated domain, browser, data-copy and isolation evidence. The earlier prototype's 15 tests and synthetic browser walkthrough verify only DEC-090, not this actual-application candidate. Production release backup and deployment checks have not been started for this preview request.

## Superseded — 2026-09-26
DEC-092/WF-086 replaces this candidate with typed first/second advances in Supplier Payment Terms Master. Its active runtime changes were removed; source/evidence capture remains private and unchanged. The new local candidate uses its own copied database. See VALUE_PAYMENT_TERMS.md for current verification; no live publication occurred.
