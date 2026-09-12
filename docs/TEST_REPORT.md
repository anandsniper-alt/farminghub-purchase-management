# Test Report — v0.6.1-alpha.16

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
