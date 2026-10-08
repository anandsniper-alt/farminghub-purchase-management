# Website alignment audit — 2026-10-08

**Subsequent user change — DEC-120/WF-115:** the mascot is now disabled for all users/modules in this local candidate. The original visible-mascot findings below remain historical. The new mobile dialog extends to y=836 at 390×844, with Cancel/Submit hit-tests passing and no mascot nodes. Six server module shells and five standalone review roles verified; build and startup regression passed. Evidence: ignored `test-output/alignment/mascot-hidden-evidence.json` and `mascot-hidden.jpg`. Not published.

**Status: fixed and verified locally; not published.** Base source `f20e75d`, isolated branch `codex/site-alignment-audit`. The existing development checkout and production records were not modified. This is a presentation audit, not certification of every business workflow.

## Confirmed repairs

| Area | Observed problem | Repair and verification | Rule |
|---|---|---|---|
| Version & edit log | Long release text forced the grid wider than its clipped panel on phones. | Zero-minimum grid track and wrapping retain all text within the panel. Server and standalone checks passed at 390px. | UI-05/06; HIG R021/R022 |
| Implements navigation | At 320px, the shrinking menu container let account controls overlap the navigation button. | Reserve a 44px menu track; wrap account tools separately. Menu opens and closes, with no overlapping controls. | UI-04/05 |
| Implements tablet shell | Different 720px/760px breakpoints retained a sidebar beside a narrow workspace and produced a roughly 292px header. | Use one 760px drawer breakpoint. At 740px the workspace starts at x=0 and the settled header is about 69px. | UI-05 |
| BOM mobile account | A rule hiding `.small` account text also hid the Sign out button. | Keep the actual button visible. Confirmed in the mobile browser. | UI-04/05 |
| BOM filters and editor | Compact controls fell below the project's 44px mobile target, and dense column filters needed flexible tracks. | Mobile input/select sizing and two flexible filter columns. Verified mobile model pages and the component editor. | UI-04/05 |
| Shared dialog footer | The mascot covered Submit for approval in a tall mobile BOM editor. Shared theme specificity defeated the older clearance rule. | Reserve screen-only bottom space whenever the mascot dock exists. At 390×844 the dialog ends at y=750 and the mascot starts at y=778. Submit/Cancel remain 44px high and pass pointer hit-testing. Import Save draft also passes in server and standalone modes. | UI-07/09/11 |

Changes are confined to four CSS files: `web/theme.css`, `web/support.css`, `web/implements/shell.css`, and `web/bom-management/style.css`. Minimal branding, per-user preferences, GSAP behavior, business logic, data, approvals and print rules are preserved. The added review script uses a temporary synthetic database, listens only on loopback and does not connect to production.

## Browser coverage

The local authenticated server was checked at **1440px desktop and 390px phone widths: 59 route screens, 118 route/viewport observations**. The sweep checked page width and visible panel, toolbar, page-header and form-grid overflow. Wide data tables intentionally retain their own horizontal scroll regions. Screenshots and selected dialog checks supplement those measurements.

| Surface | Routes checked at both widths |
|---|---|
| Shared / LAE Import | Workspace, LAE division, Order Management, Overview, Orders, Tasks, Payments, Loading, RO costings, Shipping, Documents, Vendors, Items, Prices, PLM, Settings, Versions (17) |
| LAE Domestic | Models, assembly sets, items, suppliers, prices, orders (6) |
| VMS | Dashboard, follow-ups, vendors, analytics, expos, products, components, sourcing risk, pending sync, app, users, settings (12) |
| Implements purchase | Models, items, monthly planner, material planner, stock, suppliers, prices, costing, sales prices, price analysis, orders, pipeline, quotes, settings (14) |
| BOM & Syntax | Models, syntax, checks, downloads (4) |
| Production & Stock | Dashboard, stores/daily picks, batches, component stock, finished units, stock movements (6) |

All 118 settled observations had no page-wide horizontal overflow or measured clipped panel/form containers. Additional focused checks covered Implements at 320px/740px, the price-upload dialog, Import new-vendor/PO dialogs and the BOM component editor. Dialogs were cancelled without saving business records. The native server used synthetic Import/Domestic data and a small synthetic Implements model; Production lists were empty.

The standalone HTML was built from the changed shared sources. Its version log and Create purchase order modal passed the phone layout/mascot clearance checks. This does not imply that separate server-only modules are available in the standalone build.

Read-only live navigation informed the initial defect discovery. A transient price-page clipping measurement did not reproduce in repeat settled local checks; no price-page-specific repair is claimed. An initially suspected sidebar overlap was a resize-transition artifact, not a confirmed defect. Viewport dimensions were measured before counting responsive results.

## Fresh validation

- `node scripts/build.mjs`: passed; standalone output 40,442,570 bytes, retained only as a local review artifact.
- `node --test tests/server.test.mjs`: **24 passed, 0 failed**. The first sandbox run could not connect to its loopback servers (`EACCES`); the permitted rerun passed. These are server smoke/regression tests, not the entire business suite.
- `git diff --check`: passed (line-ending notices only).
- Evidence, ignored by Git: `test-output/alignment/layout-evidence.json`, `standalone-evidence.json`, `bom-mobile-fixed.jpg`, and `server-tests.log`.

## Limits and release boundary

Not tested exhaustively: every record-dependent detail screen, all dialog variants, all role combinations, full keyboard/screen-reader coverage, OS text scaling, real mobile keyboards, reduced-motion transitions, PDF output or every loading/error/recovery state. GSAP and print behavior were not changed. Long fixture text and existing live content informed this pass, but no layout sweep can establish that arbitrary future content is defect-free.

These CSS changes add no per-record work or data growth at current/10×/100× business volume. They make no capacity guarantee. No financial calculations, permissions, stored values or history were changed.

Publication remains a separate step. Before a future release, follow the existing verified recovery-ZIP rule and confirm the exact candidate source and live release identity. No backup or production deployment is claimed by this audit.
