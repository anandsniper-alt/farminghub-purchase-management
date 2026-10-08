# User access layout

2026-10-08 · DEC-118 / WF-113 · Presentation only, shared Settings and VMS user portal.

The user requested aligned user management using Apple HIG and Farming Hub design rules. The live administrator table was approximately 1601px inside a 958px panel; long headings squeezed user identities and role actions, scope inputs did not align with their headings, and user management followed a long approval section. Account dialogs could extend above the viewport because their height exceeded the space reserved for the guide dock.

Reuse the existing table and account dialogs. User access now comes first in Settings. Explicit column widths, wrapping headings and emails, a pinned identity column and centred 44px scope labels make the comparison easier to follow. A named keyboard-accessible scrolling region contains overflow and explains how to reach the remaining columns. Account dialogs have a scoped height limit that preserves the header, footer and guide clearance; their division labels have 44px targets.

The approved Minimal green/lime theme, logo, typography, motion and help preferences remain. Scope labels, checkbox values/disabled conditions, account loading/error states, role/reset/create actions, current-password checks, reasons, confirmations, session revocation, approval controls and server enforcement retain their existing logic. No server, domain, database or print changes. No account, credential, BOM, price, stock or other business record is edited by this release.

## Guidance and verification

| Rules | Expected and observed result |
|---|---|
| UI-01/02, HIG R027/R081 | Extend the shared component and approved visual system; no duplicate theme or Apple assets. |
| UI-03/06, HIG R021/R024/R025/R135 | User management is first; row heights grow with names/emails; explicit meaningful column headers and centred scope targets. Administrator table is 1240px with internal scrolling. |
| UI-04/05 | Named region with keyboard access, semantic column headers, labelled native controls, existing focus ring; scope labels measure 44×44px. No page overflow at desktop or 390px phone width. Long synthetic name/email remain readable. |
| UI-07/09, HIG R105 | Create, reset and role dialogs focus the title, retain visible footer and cancel cleanly; desktop creation top38px/bottom614px in720px viewport, mobile reset bottom770px in844px viewport. No guide overlap. Tab remains inside dialog; cancellation restores background access. |
| UI-08/10/11/12 | Existing unsaved-entry protection, GSAP lifecycle, print outputs and authorization logic unchanged. No live credential or permission action used for verification. |

Twenty focused native tests passed after rerunning with local loopback permission; initial sandbox failures were network denials rather than product failures. Standalone review build and read-only synthetic browser checks passed. Standalone manager view retains disabled scope controls and has no password actions. Full regressions and live release verification are recorded separately; these are not certified physical-device or 100x capacity results.

Current/10x/100x: rendering remains the existing O(users×6 scopes) local matrix with no extra network calls, storage or per-row animation. This layout improves readability but does not introduce pagination or certify very large directories. Any future server paging/search must retain role/scope and account-data boundaries.

Private evidence is in ignored `test-output/users-layout-20261008/`. Publication requires fresh downloaded recovery, matching running source, isolated all-table restores, CI, exact live release/asset verification and read-only record preservation.
