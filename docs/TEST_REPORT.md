# Test Report — v0.6.1-alpha.16

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


## Purchase Manager only verification - 2026-09-12

Current-source isolated browser run: **39 checks passed, three workflows BLOCKED_BY_ROLE** at artwork approval. Only the Purchase Manager account was used. UI and authenticated API both enforce Product Manager/Admin approval; each rejected command leaves state unchanged. No production, shipping or final settlement completion is claimed. Zero browser runtime errors and no unexpected API failures. Test-only runner option: `node tests/three_workflow_browser_flow.mjs --manager-only`. See [full evidence and limitations](WORKFLOW_BROWSER_TEST_REPORT.md). No application code or live data changed.


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


> Current project memory (2026-09-12): see [Project Rulebook](PROJECT_RULEBOOK.md), [Current Product Baseline](CURRENT_PRODUCT_BASELINE.md), [Decision Log](DECISION_LOG.md) and [Workflow Change Log](WORKFLOW_CHANGE_LOG.md). Historical release statements below remain evidence of their date, not necessarily current behaviour.

## Full workflow and Purchase Executive browser verification — 2026-09-12

Three complete purchase scenarios passed (49 checkpoints): standard USD, CNY with multiple attachments and shipment payments, and two partial shipments on credit terms. A subsequent dedicated Purchase Executive run passed 37 checkpoints, using manager/product-role handoffs only where required. All four orders reached PORT_ARRIVED and SETTLED with zero balance. Browser runtime errors: zero. No live records were modified; no application-code changes were needed. See [detailed results and evidence](WORKFLOW_BROWSER_TEST_REPORT.md).

## Multiple uploads verification — 2026-09-12

- `node scripts/build.mjs`: regenerated standalone review successfully.
- `node --test tests/*.test.mjs`: **102 passed / 0 failed**, evidence `test-output/multiple-upload-native-tests.tap`. Includes exactly 50 MiB accepted and persisted,50 MiB+1 rejected without state change, multi-file supplier/PI/documents/payment records, validation of every file, scalar-ID compatibility and unchanged optional/approval behaviour.
- `node tests/multiple_upload_browser_flow.mjs`: PASS for complete-selection validation before network writes, multiple files, partial failure/retry without duplicate uploads, duplicate-submit guard, document visibility/storage,390px mobile layout and standalone review uploads. Test databases and browser profiles are isolated; no live records are created.
- `node tests/user_access_browser_flow.mjs`: PASS after the shared form changes, covering administrator creation, validation, duplicate rejection, new-user login, non-admin visibility and standalone review. Browser tests use development-only Playwright and Chromium through `FH_PLAYWRIGHT_MODULE`/`CHROMIUM_PATH` as documented below.
- Deployment of this source update has not been verified. Earlier live evidence below belongs to user portal commit8a96a27.

## User access portal verification — 2026-09-12

**Publication verification:** commit `8a96a27`, Coolify deployment `wawt555szxwx5ukuprnayjbe`, finished. Live https://purchase.dvjassociates.com returned healthy HTTPS responses and app/domain modules matching local source. Headless Chrome verified administrator login, account metadata, Create user dialog, all five role options, mobile layout and logout with no page errors. No live user was created. This supersedes the local-only deployment qualification in the earlier test record below.

- `node scripts/build.mjs`: standalone review regenerated successfully.
- `node --test tests/*.test.mjs`: **97 passed, 0 failed** (`test-output/user-access-native-tests.tap`). New coverage includes admin creation/login, secret exclusion, permission/Origin/CSRF enforcement, input validation and duplicate/stale rollback.
- `node tests/user_access_browser_flow.mjs`: isolated Playwright/Chrome checks passed for creation, password confirmation, duplicate email with retained fields, mobile dialog, new-user login, non-admin visibility and standalone review. The script requires a development Playwright installation and optional `FH_PLAYWRIGHT_MODULE`/`CHROMIUM_PATH`; no application runtime dependency was added.
- Desktop and 390px mobile screenshots inspected. Tests create accounts only in disposable temporary databases.
- Restarted the local server and verified health, configured administrator login, authenticated account-list endpoint and logout. No real user was created during verification. This does not establish deployment of the feature to the live domain.

## Historical automated native tests
Command: `npm test`

Result: **93 passed / 0 failed**.

Coverage includes all prior PO/PI/payment/production/QC/shipping/PLM controls plus final Base Item / ERP Item master logic, supplier/base price inheritance, freight benchmark/trends, complaint roll-up, and the controlled missing-PLM warning bypass.

Evidence: `test-output/native-tests-v061.tap`.

## Integrated v0.6 browser regression
Command: `python tests/v060_browser_flow.py`

Result: **5 passed / 0 failed**.

Checks: master libraries, Base Item → ERP Item PO planning, filtered price list, complaint roll-up, and freight benchmark/trend screens.

Evidence: `test-output/v060-browser-results.json`.

## Missing-PLM browser flow
Command: `python tests/plm_bypass_browser_flow.py`

Result: **1 passed / 0 failed**.

Verified that a PO for a Base Item with no approved PLM revision can be saved, submitted and issued while the amber **PLM specification not available** warning remains visible. The flow does not falsely mark PLM approved.

Evidence: `test-output/plm-bypass-browser-results.json` and `test-output/plm_bypass_warning.png`.

## Total automated checks
**99 passed / 0 failed** (93 native + 6 browser).

## Limitations
Management UAT and production deployment are not complete. Live VMS, ERP, banking and carrier APIs remain disconnected.
