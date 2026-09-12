# Test Report — v0.6.1-alpha.16

## Automated native tests
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
