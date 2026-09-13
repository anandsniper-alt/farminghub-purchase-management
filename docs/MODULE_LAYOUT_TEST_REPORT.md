# Module layout test report

Date: 2026-09-13. Branch: feature/clean-module-layout. Local implementation only; no deployment or live data writes.

## Result

168 browser checks passed: 76 navigation/layout, 39 core VMS, 53 VMS parity. No browser runtime errors. Standalone review build completed. Desktop division/VMS and 320px mobile screenshots were visually inspected; retained the existing Minimal brand.

## Coverage

- Authenticated native-server and standalone HTML modes, isolated temporary fixtures.
- Two-module landing page, four divisions, three informational pending pages and reloads.
- All ten existing LAE Import tools and old order deep link.
- All twelve VMS routes, contextual separation and mobile module selector.
- Account settings and Minimal preference controls retained.
- 390px/320px width checks; mobile menu outside-tap/Escape dismissal.
- Layout browsing leaves the complete stored business state unchanged.
- Existing VMS regression suites cover profiles, evaluations, samples, interactions/evidence, follow-ups, protected downloads, search/export, viewer restrictions, catalogues, sync/conflicts and account isolation. Financial collections remain unchanged by VMS tests.

## Reproduction

Run node scripts/build.mjs, then scripts/test-module-layout-browser.mjs, scripts/test-vms-browser.mjs and scripts/test-vms-parity-browser.mjs with Node. Browser scripts use the installed Playwright module and Chrome; FH_PLAYWRIGHT_MODULE can override module location. Reports, screenshots and temporary databases are ignored test artifacts.

## Limits

This verifies the local candidate, not live deployment. Previously documented VMS working-model defects and unapproved workflow changes remain open. This navigation change does not claim to repair visit-history/queue policies. Review preview: http://127.0.0.1:8138/#/home .


## Sidebar overlap follow-up - 2026-09-13
Reproduced footer links intercepting the master-group toggle on short screens. Changed sidebar child flex shrinking only and rebuilt the review. Verified the expanded group at 1440x1000, 1366x768, 1024x600, 800x500 and 390x600: 22px gap between All divisions and the footer, no navigation-content overflow, and bottom link reachable by normal hit-testing after scrolling. Inspected the 800x500 screenshot. Reran all 76 layout checks in authenticated server and standalone review modes successfully. No live deployment.
