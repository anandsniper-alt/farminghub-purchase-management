# Browser-check reproduction

The Node `npm test` suite requires no package install. The separate Python browser harness requires a locally available Playwright package and Chromium; those development tools are not bundled or installed by the app.

Run `npm run build`, then `python tests/browser_flow.py`. With an existing Chromium binary, set CHROMIUM_PATH to that executable. The harness writes screenshots/results under test-output/. It uses about:blank with the included test-only storage shims to reproduce the original restricted-runner test. It is not a replacement for a normal browser run against the authenticated server or for native browser-storage verification.

The source demo workbook and a generated valid CSV are test inputs only. The harness resets its own test state and never accesses the live VMS. The website does not load these test shims in either runtime mode.
