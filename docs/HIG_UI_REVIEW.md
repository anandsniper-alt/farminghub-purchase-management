# HIG interface revision — local review

2026-09-29 · DEC-099 / WF-093 · GLOBAL shared interface.

The user requested revision of the current site using the adopted Apple HIG rulebook. This implements the relevant web presentation and interaction rules in the existing application. It is a local review build, not a live release or a certification of every HIG rule.

## Changes

- Shared Minimal styling: clearer heading hierarchy, larger table and supporting text, stronger label/status contrast, consistent panel spacing, and larger form controls. Tasks filters use an aligned responsive grid.
- Tables scroll within the page and are reachable by keyboard. Header cells identify columns. Existing item/brand summaries, sorting, filters and overview drill-downs remain available.
- Fields receive programmatic labels and links to their help text. A Skip to content link avoids repeated navigation. Focus rings remain visible on white and green surfaces.
- Dialogs focus their title, isolate the background, keep keyboard focus within visible controls, and return focus when closed. Errors receive focus without clearing entries.
- Cancel, Close and Escape protect unsaved form values and button-driven row changes. Keep editing preserves them; Discard changes explicitly closes the dialog. Browser reload/leave uses the browser's own unsaved-work prompt. This is protection for the open dialog, not durable draft autosave.
- Nested Domestic item pictures retain their own Escape handling. Reduced-motion behavior is preserved. High-contrast and forced-color adaptations are included.

Approved branding, per-login guides, left/right mascot docking, existing workflow labels, payment calculations, permissions, audit history and issued-document snapshots are preserved. Screen styling is scoped away from the PO print layout. No domain command, database migration or production data edit is part of this change.

## Rule review and evidence

| Rules | Expected / observed | Result and evidence |
| --- | --- | --- |
| R021–R032 | Readable hierarchy, aligned controls and useful spacing | Pass for reviewed shared components; desktop/mobile screenshots in private test-output/hig-review/ |
| R009–R013, R100–R104 | Named fields, keyboard access, visible focus, legible labels/status | Pass for sampled controls; browser test checks labels, skip link, table regions and sampled task text contrast of at least 4.5:1 |
| R105–R113 | Dialog focus and recoverable dismissal | Pass for vendor edits, button-only BOM row removal, nested item-picture editing and explicit discard; business state unchanged in the inspection suite |
| R060–R066 | Respect reduced motion | Pass: reduced-motion navigation has no running animations |
| R135–R140 | Tables remain usable without page-wide horizontal overflow; drill-downs retain context | Pass at 1440px and 390px on 24 routes in server and standalone modes; loading and task workflow suites also check writes/navigation |
| R002, R117–R119 | Do not erase saved financial history through a UI undo | Preserved: no financial/domain changes; 327 native tests passed |
| Native Apple materials, assets and platform APIs | Apply only to a relevant native platform | Not applicable to this web revision; use the adaptations in APPLE_HIG_APPLICATION.md |

This is not an exhaustive accessibility certification. Full assistive-technology testing, every error/empty state, every nested module dialog and native browser text-zoom combinations are not certified by these checks. Dense financial tables intentionally retain horizontal scrolling within their region.

## Reproduce and review

From the active `test-output/domestic-bom` checkout, build with `node scripts/build.mjs`. Run `node tests/hig_browser_flow.mjs` with the existing local Playwright/Chrome dependency, plus the loading and task workflow browser checks. Native checks use `node --test tests/*.test.mjs`. Test fixtures and screenshots remain ignored and must not be committed.

The existing loopback demo at `http://127.0.0.1:60946/#/tasks` reads the newly generated review build. Its banner identifies copied live data and browser-only changes. Review Tasks, Overview, Loading, Supplier master, and Domestic BOM/item dialogs using normal navigation. Production is unchanged; a later authorized release must follow BACKUP_RESTORE_RUNBOOK.md.
