# VMS integration test report

2026-09-13 · feature/vms-module · separate local build, not deployed.

## Results

- **156 native tests passed**, zero failures: 143 existing Purchase regression tests plus 13 VMS tests.
- **41 browser checks passed**, zero runtime errors, across authenticated native server and standalone review, desktop and 390px mobile, Current and Minimal themes.
- Review build and syntax checks passed. The loopback preview responds successfully at http://127.0.0.1:8138/#/vms.

## Coverage

| Area | Verified |
|---|---|
| Login / navigation | Existing Purchase Manager login opens the native VMS route; new modules served; standalone review boots |
| Vendor identity | Company, ID/code and commercial fields retained; primary contact/location synchronize with Vendor master; secondary contacts survive master edits |
| Profiles/catalogues | Multiple contacts, owner, location, sourcing tags/stages; expo/product/component creation; duplicate rejection and inactive-reference retention |
| Evaluation | Weighted partial formula, rounding, grades, blank/invalid ratings, breakdown display; no automatic purchase eligibility change |
| Samples | RMB currency and 125.25 → 12525 minor units; status updates preserve sample identity; invalid negative price rejected |
| Interactions / follow-ups | Notes, required valid dates, multiple attachments, latest/backdated interaction selection, completion/reopening, queue filtering and owner restrictions |
| Files | Existing protected upload/download path, multiple evidence files and vendor document download; invalid/foreign/order-only evidence rejected |
| Coverage / exports | Distinct product/component rules including stage filtering, zero-supplier gaps, equal-share labels, supplier search/sort and CSV exports |
| Permissions | Manager writes; executive ownership enforcement; viewer read-only UI; forged role rejected by server; out-of-division data/commands excluded |
| Persistence / conflicts | Browser reload, SQLite reopen, authenticated save, stale revision returns conflict without overwrite |
| Preservation | Original orders/payments/issued snapshots and prior audit retained; synthetic server PO records unchanged after browser flow |
| Presentation | Existing theme/guide controls retained; responsive dialog; mobile tables scroll inside their container rather than wrapping every word or overflowing the page |

All browser writes used isolated synthetic SQLite and browser storage. No live user account, vendor, PO, file, approval policy, bank record or deployment was changed. Screenshots/reports/databases remain under ignored test-output paths, not in Git. Tests do not assert migration of external VMS historical data or operation of the source app's unported offline/PWA/voice capabilities.

## Reproduce / preview

Run from the feature worktree:

```powershell
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/test-vms-browser.mjs
node scripts/preview-vms.mjs
```

The browser runner accepts FH_PLAYWRIGHT_MODULE, FH_CHROME_PATH and FH_TEST_OUTPUT_ROOT. The preview binds only to 127.0.0.1:8138, serves the standalone review and has no live API or database. It starts in the Purchase Manager review role; the role selector is simulation, not live authentication. Keep this origin separate from other trial builds so browser data stays isolated. Closing/restarting the preview does not deploy anything.

See [VMS module and capability map](VMS_MODULE.md), DEC-044 and WF-039 for the integration boundaries.
