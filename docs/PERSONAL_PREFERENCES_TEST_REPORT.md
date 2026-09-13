# Minimal standard and personal preferences — test report

2026-09-13 · DEC-045 / WF-040 · feature/personal-guides · not published.

**Results:** 161 native tests passed; 36 personal-preference browser checks, 42 presentation regression checks and 39 VMS browser regression checks passed (117 browser checks total). No browser runtime errors.

Verified in authenticated server and standalone review:

- Minimal is the only theme, including when the old browser key contains Current. No top theme/guide toolbar or reserved vertical gap remains.
- Users & settings → My preferences offers Show page guides and Save preferences. Default off; successful saves restore descriptions and guidance without changing the theme.
- A Manager's preference survives reload, sign-out and login, and a fresh browser context. A Viewer on the same browser has an independent preference and can save it without administrative controls. Returning to the Manager restores the Manager's own setting.
- All active roles can save only their own preference. Foreign user IDs, role/scope/theme fields and non-boolean values are rejected. Inactive/unknown profiles are rejected. SQLite restart retains preferences; stale revisions are rejected without overwrite.
- Existing roles, scopes, financial/workflow collections, issued snapshots and prior audit remain unchanged. Writes are limited to the current user's preference and its normal revision/audit event.
- Optional guide visibility does not remove the mascot or expanded-by-default order timeline. Page/dialog animations, reduced-motion handling, guide tours, focus behavior and unsaved form content remain functional.
- Settings/header/dialogs fit desktop and 390/320px mobile. Save preferences is reachable by ordinary pointer input; the removed strip leaves no empty gap. VMS profiles, contacts, samples, interactions, files, queues and exports continue to work.

Testing used isolated synthetic SQLite/browser data. No live account, preference, business record or deployment was changed.

## Preview and reproduction

Open http://127.0.0.1:8138/#/settings. This loopback preview uses review roles, not live authentication. Select a review user to check that user's preference. Source lives in the feature/personal-guides worktree at test-output/vms-module; the separate audit trial remains untouched.

```powershell
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/test-personal-preferences-browser.mjs
node tests/presentation_browser_flow.mjs
node scripts/test-vms-browser.mjs
```

Set FH_PLAYWRIGHT_MODULE to the installed Playwright module when necessary. Private artifacts remain ignored under test-output. The personal-preference runner seeds review storage only if absent, ensuring reload checks test actual persistence. Server checks use two real isolated accounts and a separate browser context; review role changes are explicitly simulation.
