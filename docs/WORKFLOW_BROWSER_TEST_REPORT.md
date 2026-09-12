# Complete purchase workflow browser tests

## Pipeline sorting live publication and requested test batch - 2026-09-12

Application commit **db6978cc249c7d8b039c34cdbceee4bedc7daea0** is live at https://purchase.dvjassociates.com through Coolify deployment **6fwkw5g3hzfiqxrq1bqry7me** (finished; application running:healthy). This publishes DEC-019 / WF-018 / UX-12. Earlier local-only statements for sorting are superseded by this record. Existing domain, runtime configuration and persistent volume retained.

The user explicitly requested ten test records across many suppliers on the published build. Created **TEST-SORT-001 through TEST-SORT-010** through authenticated Admin CREATE_ORDER commands in the live pipeline, across ten existing eligible supplier records. All are clearly labelled synthetic TEST DRAFTS, with varied quantities/prices, unsubmitted/unapproved and no PI, payment authorization, shipments or documents. The batch uses ordinary automatic serial allocation; deleting these drafts later will leave their serials unused under B-18. Test drafts are owned by the creating administrator and remain editable by scoped Purchase Managers.

This was an explicit one-time data action, not automatic build/startup seeding. The private local provisioning runner checks batch-number/notes identity, prevalidates draft payloads through the domain, uses current optimistic revisions and avoids duplicates on retry. Normal clean initialization remains unchanged; no private database or test artifact is included in the image/Git.

**8 batch verification checks passed:** exactly ten identified drafts/ten suppliers; no approvals/operations; distinct automatic serials; pre-existing order records unchanged; payments/users/approval controls unchanged; original audit prefix retained; new creations auditable. **16 live browser checks passed:** HTTPS/source match, controls, all ten visible through TEST-SORT- search, numeric serial ascending/descending, alphabetical supplier sorting, exact supplier and stage filtering, mobile fit, reset, no browser-write requests or runtime errors. Browser verification was read-only after the separately authorized creation batch; administrator logged out.

Release tests: 52 sorting browser checks, 31 bulk regression checks, native startup test and review build passed. Ignored artifacts: test-output/live-pipeline-test-batch-report.json and test-output/pipeline-sort-live-report.json. Screenshot: D:/CodexTestTemp/FarmingHub/pipeline-sort-live-test-orders.png. To find the live batch, search TEST-SORT- in Order pipeline.


## PO pipeline supplier/serial sorting - 2026-09-12

**52 browser checks passed** in isolated authenticated server and standalone review modes. Scenarios cover original order default; numeric serial sorting over multiple pages; ascending/descending headers and accessibility/focus; supplier-name sort with permanent serial ties; exact supplier ID for duplicate names; composed stage/search/code filtering; exported full filtered order with appended supplier name; empty/reset; cleared bulk selections; natural PO number order; deleted view; board filtering; 390px mobile controls; Manager access without Admin controls. Zero browser runtime errors, no business-write requests, and full stored state unchanged.

**31 bulk delete/restore regression checks passed** after updating the serial-header selector to its accessible sort-button name. Native `node --test tests/startup.test.mjs` passed (1 test); syntax check, `node scripts/build.mjs` and git diff --check passed. Shared domain/server code did not change, so no unrelated full financial suite rerun was needed.

Evidence: D:/CodexTestTemp/FarmingHub/reports/pipeline-sort/2026-09-12T15-28-04-138Z/ (report, screenshots, CSV downloads, traces and synthetic SQLite); bulk-orders/2026-09-12T15-28-29-304Z/. Runner: `node tests/pipeline_sort_browser_flow.mjs` with process TMP/TEMP and FH_TEST_OUTPUT_ROOT on D:. Test artifacts remain outside Git. No live orders/settings changed. Local implementation, not a publication record.


## Approval controls live publication - 2026-09-12

Application commit **36a0198304ec3c1f723f9fcb4aabe0376b2018f8** deployed to https://purchase.dvjassociates.com through Coolify deployment **evhfg1nzclwtzvfdlfsedofd** (finished; application running:healthy). This publishes DEC-018 / WF-017 / B-20. Earlier local-source/unpublished notes for these controls are superseded by this publication record. Domain, runtime configuration and persistent data volume retained; no schema migration or live role/policy rewrite.

**15 live checks passed:** HTTPS health, exact served app/domain source, Admin entry, all 13 stages, current-policy role selections, fixed Admin/Viewer restriction, required reason, confirmation/persistence guidance, selecting Manager artwork coverage, restore-form behavior, mobile fit, cancellation preserving controls, no business/settings/user/file writes and no browser runtime errors. Administrator logged out. The verification only edited and canceled a draft form; no live approval relaxation was saved.

Use Users & settings > Manage approval controls, select role permissions, provide a reason, confirm and save. Changes stay active until edited/restored; Admin retains access. Release validation also passed 115 native tests, 29 server/review controls browser checks and 55 full-flow checks covering three configured Manager-only purchases through port arrival and SETTLED with zero balance. These synthetic workflow transactions were isolated, not live business activity.

Ignored live report: test-output/approval-controls-live-report.json. Local mobile evidence: D:/CodexTestTemp/FarmingHub/approval-controls-live-mobile.png.


## Approval controls and configured Manager workflows - 2026-09-12

**Current source verification: PASS.** 115 native tests passed with no failures (`node --test --test-reporter=tap tests/*.test.mjs`). New tests cover Admin-only full-matrix validation, reason/confirmation, invalid/duplicate roles, scope/inactive/Viewer denial, Admin retention, immediate current-session grant/revoke, stale revision rejection, historical approval retention and sample/initial-payment shortcut enforcement. Existing native regression tests remain passing.

**29 controls browser checks passed** in authenticated server and standalone review modes: all 13 stages; non-editable Admin/Viewer grants; cancellation; required reason and confirmation; mobile 390px fit; saved settings survive reload; non-admin control visibility; independent technical rejection permission; actual Manager artwork approval; restore-form versus save distinction; appended history; completed approval retention; revoked UI access. Zero browser runtime errors. Evidence: D:/CodexTestTemp/FarmingHub/reports/approval-controls/2026-09-12T15-09-11-384Z/.

**55 full-flow browser checks passed across three configured Manager-only workflows.** Policy fixture explicitly represents an Admin granting Manager coverage; every order/financial/shipping action then used only the Manager account and its audit identity. No Product Manager/Executive/Admin workflow handoffs or seeded order approvals. UI saving/restoration of settings is independently covered above.

| Synthetic order | Quantity | Shipments | Payments | Final status | Balance |
|---|---|---|---|---|---|
| WF-A-TEST (USD advance/BL) | 10 | 1 | 2 | PORT_ARRIVED / SETTLED | 0 |
| WF-B-TEST (CNY advance/shipment/BL) | 20 | 1 | 3 | PORT_ARRIVED / SETTLED | 0 |
| WF-C-TEST (USD credit/partial shipments) | 12 | 2 | 2 | PORT_ARRIVED / SETTLED | 0 |

All three cover creation/submission/issue, supplier acknowledgement, PI, technical confirmation, artwork approval/acknowledgement, applicable initial payment, sample/bulk/QC, shipping documents/BL/insurance/arrival and supplier realization. Evidence: D:/CodexTestTemp/FarmingHub/reports/manager-relaxed-workflows/2026-09-12T15-10-18-290Z/. Command: `node tests/three_workflow_browser_flow.mjs --manager-relaxed`. This does not replace the earlier standard-role blocked result: defaults still require the Product Manager artwork handoff until controls are changed.

Earlier development test attempts found two harness problems: an artwork fixture lacked the existing PI gate, and an immediate visibility assertion ran before the submit request rendered. The fixture now satisfies the PI gate and direct-action tests wait for DOM replacement; reruns above passed. No production gate was removed to make tests pass.

Build and syntax checks passed; git diff --check clean. Native output: D:/CodexTestTemp/FarmingHub/approval-controls-final-native.tap. All artifacts and SQLite data remain ignored/local. No live approvals, account roles or settings were changed; this is not a publication record.


## Purchase Manager only browser run - 2026-09-12

**Outcome: BLOCKED_BY_ROLE, not a completed end-to-end workflow.** User requested the entire flow with only Purchase Manager access. Tested current application source cc08c5d using the native local server, Chrome/Playwright and isolated clean masters/synthetic data. The runner created credentials only for u-manager, rejected attempts to switch to another role and verified every order audit event belonged to that manager. No live site login, order change, role change or permission bypass occurred.

Command: `node tests/three_workflow_browser_flow.mjs --manager-only`, with FH_TEST_OUTPUT_ROOT set to the D: test-artifact directory and process TMP/TEMP on D:. **39 checks passed across three attempted scenarios; none reached full completion.**

| Scenario | Intended workflow | Observed result |
|---|---|---|
| WF-A-TEST | USD, 10 units, 30/70 terms, one shipment | PI approved; blocked at artwork approval |
| WF-B-TEST | CNY, 20 units, advance/shipment/BL terms, multiple evidence files | PI approved; blocked at artwork approval |
| WF-C-TEST | USD, 12 units, credit terms, two planned partial shipments | PI approved; blocked at artwork approval |

All three completed Manager-only draft creation, submission, immutable PO issue, supplier PO acknowledgement, PI receipt/verification/approval, supplier technical confirmation and artwork submission. Buyer assignment to the seeded executive was retained as order metadata; that user never logged in or performed any action.

**Exact blocker:** APPROVE_ARTWORK requires PRODUCT_MANAGER or ADMIN under B-19 / DEC-017 / WF-016. The UI hides Approve artwork from MANAGER. An intentional authenticated API probe returned HTTP 403 with "Product Manager final approval is required." The complete workspace remained unchanged after each denied request. All three orders remain AWAITING_ARTWORK_CONFIRM, with pending artwork and no production-window start.

**Not reached in this run:** supplier artwork acknowledgement, production lead-time start, sample/bulk production/QC, shipment booking through arrival, remittances and final supplier settlement. No approval was pre-seeded or granted by a second role to bypass the blocker. Historical multi-role completed runs below do not establish Manager-only completion.

**Errors:** zero browser runtime errors; no unexpected API failures. The three intentional 403 responses and initial unauthenticated bootstrap 401 were expected. An initial harness run misclassified the normal login bootstrap 401; its assertion was corrected and all three scenarios rerun. This was a test-harness correction, not an application change.

**Evidence:** D:/CodexTestTemp/FarmingHub/reports/manager-only-workflows/2026-09-12T15-03-07-467Z/ contains report.json, three screenshots, trace.zip and isolated SQLite data; artifacts stay out of Git. The report deliberately separates verificationStatus PASS from workflow status BLOCKED_BY_ROLE.

**Follow-up:** keep the established Product Manager/Admin approval handoff. Allowing Purchase Manager to approve artwork would be a new permissions decision requiring explicit instruction and a decision/workflow record. This test request does not authorize that change.


## Admin/order release live publication - 2026-09-12

Application commit **cc08c5de04bf3ccc1e6ed1a065cebee95039c4b7** is live at https://purchase.dvjassociates.com through Coolify deployment **iofjlpttbwbeibjdbyxb698s** (finished; application running:healthy). This publishes DEC-016/017 and WF-015/016: admin bulk deletion/restoration, permanent independent serial numbers and withdrawal of the September Executive approval delegation. Existing administrator role editing remains available. This record supersedes earlier source-only/pending-publication statements for these features.

**19 live checks passed**, including HTTPS health, exact served app/domain/shipping source, serial initialization audit, serial column, Deleted orders, required deletion reason/confirmation, mobile layout, role editor and absence of the September notice. Exact deployed policy rejects the withdrawn Executive approval powers; this policy check used live profiles plus an in-memory scoped test profile, not a live Executive login. No business or role writes and no browser runtime errors occurred during verification; the deletion dialog was canceled and the administrator logged out.

All original orders and prior audit entries were retained. One concurrent user evidence upload/technical confirmation was reconciled against its audit events separately from the serial migration; original order content, payments, users and pre-existing file metadata otherwise matched the predeployment fingerprints. Serial migration is idempotent and creates a pre-initialization SQLite backup beside the database before updating metadata. No live order was deleted, restored or approved by deployment verification.

Release validation also passed **110 native tests**, **31 bulk-order browser checks**, **13 approval-role browser checks** and **37 full-workflow browser checks**. Ignored local live evidence: test-output/admin-release-live-report.json and test-output/admin-release-concurrent-check.json. Historical workflow completion reports remain separate from this deployment.


## Admin bulk orders and approval withdrawal - 2026-09-12

**110 native tests passed** on final source, including admin-only atomic delete/restore, unchanged financials/documents/issued snapshots, serial non-reuse, stale/invalid selection rollback, deleted upload/write rejection, current session role enforcement and idempotent legacy initialization. The migration test opens the pre-initialization SQLite backup read-only and verifies the original workspace is preserved.

**31 bulk browser checks passed** in server and standalone review: select-all page limit, cross-page selection, cancel, explicit confirmation, 390px mobile, exact selected deletion, retained serials/history/financial visibility, read-only deleted detail, restore and hidden-selection clearing. **13 approval browser checks passed:** no September notice, Executive denied PO/technical approvals, Manager issue and Product Manager technical approval. **37 full workflow checks passed:** Executive operated the assigned synthetic PO with Manager/Product Manager handoffs through port arrival and SETTLED, zero balance.

Evidence from successful reruns: D:/CodexTestTemp/FarmingHub/reports/bulk-orders/2026-09-12T14-51-32-500Z/, approval-roles/2026-09-12T14-51-48-161Z/, three-workflows/2026-09-12T14-51-56-360Z/. Reports/traces are local test artifacts, not source or live business data. Final native log: test-output/admin-release-native.tap. Runners support FH_TEST_OUTPUT_ROOT for alternate artifact storage; TMP/TEMP were set only for test processes on D:.

An earlier run failed from a full C: disk, not a business-rule assertion. The interrupted app write was recovered from the generated build; source checks and complete browser reruns passed afterwards. Only a prior failed-test trace was removed. No real PO, role, payment or shipment was changed by testing. VH001's real workflow completion remains separate from this deployment and requires the actual manager/account and supporting records.

Earlier pending-deletion and September-delegation reports below are historical; DEC-016/017 and WF-015/016 define the current release. Deployment evidence will identify the live commit.


## Role-editing live publication - 2026-09-12

Application commit **dd8656cb02c7ea47aa45eb29143270095aa21e87** deployed from main to https://purchase.dvjassociates.com via Coolify deployment **heiuia7nadcjjtlvrxiaktdc** (finished; running:healthy). This publishes DEC-015 / WF-014 administrator role editing. Existing domain, persistent data volume and application configuration retained.

**12 live checks passed:** HTTPS health, exact served app/domain source, administrator settings, self-role protection, current role/five supported choices, Purchase Manager selection, required reason, mobile layout, cancellation preserving the original role, no role/business writes and no browser runtime errors. Administrator logged out after checking. No live role or PO was changed. Actual promotion/demotion and existing-session enforcement were already tested in the isolated suite (108 native tests, 11 browser checks).

Use Users & settings > Change role on another user's row. Earlier local-only/unpublished role-editing notes below are superseded by this deployment. Bulk deletion/serial-number work is not included. Ignored verification artifact: test-output/role-editing-live-report.json.


## Administrator role editing verification - 2026-09-12

Local source DEC-015 / WF-014: **108 native tests pass**, including changing Executive to Manager and then Viewer while keeping an already-authenticated session, immediate permission enforcement, unchanged credentials/scopes/ownership, correct audit, and rejection of self-demotion, unsupported roles, missing reasons, unauthorized callers, CSRF failures and stale revisions.

**11 browser checks passed** across server and standalone review: role-change form, promotion/demotion, self-change protection, non-admin visibility and 390px mobile layout. No browser runtime errors. Runner: tests/admin_management_browser_flow.mjs. Ignored evidence: test-output/admin-management/2026-09-12T14-14-14-900Z/ and test-output/admin-management-native.tap.

This source change is not published. Bulk PO deletion and automatic serial work remain pending clarification of retained-deletion versus draft-only deletion and separate S.No. versus automatic PO number. The user has confirmed that deleted serials must stay unused and remaining records must never be renumbered. No PO was deleted or real user role changed during implementation/testing.


## Live publication - 2026-09-12

Published application commit **64e67648cdc1adc315f2b20c8c5d68bdc546db45** from main to https://purchase.dvjassociates.com through Coolify deployment **e7p6hs4p1eatsbhp3mvg71ql** (finished; application running:healthy). This publishes DEC-013/WF-012 multiple attachments with 50 MB per file and DEC-014/WF-013 temporary purchase/product approval delegation. The existing domain, Docker configuration and persistent data volume were retained; no migration or role rewrite.

Live verification passed 11 checks: HTTPS health, exact served app/domain source, administrator login/bootstrap, deadline notice, executive eligibility across all delegated actions using live profiles and the exact deployed policy, October 1 IST expiry, multiple-file/50 MB form, mobile notice fit, no runtime errors and no business-write requests. Logout completed. This was read-only verification: no live executive password login or approval transaction was performed. Full Executive-only transactions were already verified in the isolated browser workflow. Earlier local-only statements below are superseded by this publication record.

Ignored local verification report: test-output/september-release-live-report.json. Application expiry remains **1 October 2026 00:00 IST**; completed approvals remain valid.


## Temporary approvals verification - 2026-09-12 (DEC-014 / WF-013)

Current local source: **106 native tests passed**. Coverage includes all 11 delegated approval/review actions, readiness and immutable snapshots, viewer/inactive/scope denials, unrelated management rights, exact IST boundaries, forged client dates/identity and persisted SQLite audit.

**WF-DELEGATED-TEST** used only Purchase Executive for the entire lifecycle: **37 checkpoints passed**, 15 units at port, one shipment, three payment records, 34 documents, SETTLED and zero balance. PO/PI/artwork/payment authorization events identify the executive and DEC-014. This is an isolated test, not a live purchase.

Server and standalone review passed **13 browser checks**: executive PO issue, technical approval/rejection with remarks, persisted audit, 390px mobile notice and automatic removal of delegated controls on an open page at expiry. API tests independently verify server expiry; browser clock changes test presentation only. Browser runtime errors: zero.

Runners: tests/three_workflow_browser_flow.mjs --delegated and tests/temporary_approval_browser_flow.mjs (active window and installed Playwright/Chrome required). Ignored local evidence: test-output/three-workflows/2026-09-12T13-59-02-145Z/ and test-output/temporary-approvals/2026-09-12T14-00-41-652Z/; native result test-output/temporary-approval-native.tap. Initial PLM browser harness selected the wrong newest-first revision; explicit specification ID fixed the harness and full rerun passed.

Earlier executive denial/handoff results below are historical before DEC-014. Current browser runners check visibility against the active policy. No deployment or live PO approval occurred in this task.


Date: 2026-09-12. Result: **three complete scenarios passed, followed by a dedicated Purchase Executive scenario**. Tests used installed Chrome through Playwright, authorized by the user when the computer-use connection had no available browser. The application ran against isolated SQLite databases with synthetic accounts. No live records, credentials from `.env`, bank transactions or external messages were used.

## Results

| Test order | Scenario | Quantity | Shipments | Payments | Evidence documents | Final result |
|---|---|---:|---:|---:|---:|---|
| WF-A-TEST | USD, 30% advance and 70% BL balance | 10 | 1 | 2 | 15 | Port arrived; settled; zero balance |
| WF-B-TEST | CNY, multiple files, 10% advance / 20% before shipment / 70% BL credit | 20 | 1 | 3 | 34 | Port arrived; settled; zero balance |
| WF-C-TEST | USD credit purchase, partial shipments of 5 and 7 | 12 | 2 | 2 | 38 | First arrival kept order open; final arrival closed it; settled |
| WF-EXEC-TEST | Purchase Executive operates assigned order; restricted approvals use appropriate roles | 15 | 1 | 3 | 34 | Port arrived; settled; zero balance |

The first three scenarios passed 49 checkpoints; the dedicated executive scenario passed 37 checkpoints. Both final runs recorded zero browser runtime errors. The initial unauthenticated `/api/bootstrap` returned the expected 401 before sign-in; no other failed API responses occurred in the successful runs.

## Workflow exercised through browser forms

1. Sign in as Purchase Executive; select supplier/Base Item, brand quantity, currency, price and terms; save draft; submit for approval.
2. Sign in as Manager to issue the immutable PO revision.
3. Record supplier acknowledgement; receive and verify PI; obtain Manager PI approval.
4. Record technical confirmation; submit artwork; obtain Product Manager approval; record supplier artwork acknowledgement.
5. Record applicable initial remittance or follow the no-advance credit path; verify production lead time starts.
6. Record sample completion and approval; start bulk production; record QC PASS; complete production.
7. Allocate shipment quantities; book and release container; record inland tracking; upload CI and packing list.
8. Authorize and record any before-shipment payment; record vessel loading, final BL, insurance and India-port arrival.
9. Record BL-triggered payments after the final BL exists; record supplier realization for each allocation; verify original-order balance is zero and no realization remains pending.
10. Verify each document has retained file bytes, and partial arrival does not prematurely close unshipped quantities.

All orders used the existing BS20 master, which lacks an approved technical revision. Its explicit missing-PLM warning remained visible through completion. These runs verify that permitted path, not the separate approved-PLM revision workflow. Test payments used the PO currency (no cross-currency realized-rate discrepancy scenario). Future credit obligations were deliberately settled early after BL for test completion; the tests did not wait for real credit days to elapse.

## Dedicated Purchase Executive verification

`WF-EXEC-TEST` used the assigned executive for supplier responses, PI entry/verification, technical/artwork submissions, initial payment, sample/production/QC, shipping, remittance reporting and supplier receipts. UI checks confirmed the executive could not issue the PO, approve the PI, approve artwork or authorize ordinary payment milestones. Manager handled PO/PI approval and ordinary payment authorization; Product Manager handled artwork approval.

Audit assertions verified the executive's identity for 16 operational action types. All 34 document records were attributed to Purchase Executive. Initial-payment auto-authorization and sample approval followed existing editor permissions; this test did not introduce a stricter manager requirement or change existing roles.

## Evidence and reproducibility

Runner: [tests/three_workflow_browser_flow.mjs](../tests/three_workflow_browser_flow.mjs).

```powershell
node tests/three_workflow_browser_flow.mjs
node tests/three_workflow_browser_flow.mjs --executive
```

Requires development Playwright and installed Chromium. The runner accepts `FH_PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` and optional `FH_HEADED=1`. It creates only test accounts/master fixtures before launch; all transactional business writes use the browser UI. Direct database reads are assertions, not a substitute for workflow actions.

Local artifacts (ignored by Git):

- Three scenarios: `test-output/three-workflows/2026-09-12T13-45-30-506Z/` — report JSON, trace ZIP, six commercial/completion screenshots and isolated test database.
- Executive scenario: `test-output/three-workflows/2026-09-12T13-47-50-868Z/` — report JSON, trace ZIP, executive screenshots and isolated test database.
- Earlier runner attempt: `test-output/three-workflows/2026-09-12T13-44-15-294Z/`. It stopped on an ambiguous automation selector matching both the finance tab and a finance shortcut. The runner selector was narrowed and the complete three-scenario run then passed. No application-code fix was required.

This is browser verification of the current local source, including unpublished multiple-upload changes. It is not a claim that the same changes have been deployed to the live domain, or that all unrelated modules have been audited. Product code, permissions, calculations and workflows were preserved during this test task.
