# Test Report — v0.6.1-alpha.16

> Current project memory (2026-09-12): see [Project Rulebook](PROJECT_RULEBOOK.md), [Current Product Baseline](CURRENT_PRODUCT_BASELINE.md), [Decision Log](DECISION_LOG.md) and [Workflow Change Log](WORKFLOW_CHANGE_LOG.md). Historical release statements below remain evidence of their date, not necessarily current behaviour.

## User access portal verification — 2026-09-12

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
