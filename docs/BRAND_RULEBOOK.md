# Farming Hub brand rulebook

Persistent mascot clearance, DEC-029 QA follow-up: retain the approved fixed dock and imagery. Main content reserves 112px plus device safe-area bottom space so pagination can scroll above it. Print suppresses that reservation with the already hidden dock. No visual-token or branding change.

## Current approved presentation - DEC-026 / WF-020 (2026-09-12)

The user's publication request approves production adoption of the reviewed Minimal theme, animations and persistent Farming Hub mascot guide. This supersedes earlier local-only/adoption-pending notes below for this presentation. Runtime files live in web/; the prototype remains historical test material. Default Minimal, retain Current choice and Show/Hide page guides in the fixed appearance toolbar. Keep colors/fonts/logo and reduced-motion support. Help is authored, never an AI chat, and Take me there only focuses the existing control. Live identity/data/approval logic remain authoritative; do not deploy the sample seed or test-only replay controls.


## Proposed theme experiment - 2026-09-12 (not a production rule)

The user authorized a reversible sample, not adoption. prototypes/minimal-theme retains approved logo, palette, font stack and icons while testing quieter borders/shadows, lighter headings, optional explanatory chrome, expandable workflow/secondary actions and short transitions. Minimal omits unimplemented division placeholders; Current comparison retains them. Reduced-motion disables animation. This exception exists only inside the local prototype and establishes no new global visual standard. Live brand rules below remain authoritative until a confirmed adoption decision. DEC-020.


## Pipeline sort/filter controls - 2026-09-12

Reuse pipeline toolbar native selects for Filter by supplier and Sort orders, the existing small ghost button for Reset view, and small ghost header buttons for S.No., Purchase order and Supplier / item. Ascending/descending indicators use text arrows with accessible aria-sort; keyboard focus is restored. Show supplier name/code/SKUs without changing fonts, colours or layout tokens. Keep horizontal table overflow and wrapping filters; mobile selects verified at 390px. Board cards also show supplier name/code and permanent S.No.


## Approval controls window - 2026-09-12

Reuse Users & settings, panel heading/action, shared wide dialog, labelled native role checkboxes grouped in fieldsets, existing two-column grid (single column on mobile), warning/info notes, reason textarea and Cancel/Save footer. Show all stages and Admin-always-allowed in each group. The controls panel lists effective roles and append-only change history; Restore standard roles is a form action, not an immediate write. No new brand tokens, fonts, colours or layout framework. Mobile dialog verified at 390px; existing scrollable body keeps actions accessible.


Admin bulk actions (2026-09-12, DEC-016/017): reuse native labelled checkboxes, existing table/board controls, small serial column, order-list dropdown, standard danger/primary buttons and shared reason/confirmation modal. Deleted order detail reuses heads, warning note, badges, tables, document downloads and history. No new fonts, colours, logos or CSS tokens. Remove the withdrawn September notice. Server/review delete dialogs checked at 390px.

Role editing (2026-09-12, DEC-015): reuse the small ghost edit action in User / role cells, existing select/helper/textarea and modal footer. Display current role and immediate-effect guidance in the shared warning note. No new style tokens or navigation. Mobile checked at 390px.

Temporary approvals (2026-09-12, DEC-014): reuse the existing warning note and gap above page content for the September deadline. Reuse approval buttons and placement. No new CSS tokens, colours, typography, icons or layout system. Server and standalone review notices checked at 390px width; expiry removes the notice and delegated actions.

Multiple uploads (2026-09-12, DEC-013): retain native file controls, existing form labels/helper text, inline errors and modal footer. The shared evidence picker uses **Choose files** and **50 MB per file** guidance; the existing submit button displays sequential upload progress. Existing small file buttons expose each attachment. No new brand tokens, icons or styles. Mobile form checked at 390px width.

User-access update (2026-09-12, DEC-012): the settings portal reuses the existing page heading, primary plus action, table, status badges, labelled form grid, checkboxes and modal footer. No new fonts, colours, logo assets, CSS tokens or component styles were introduced. The creation form was checked at desktop and 390px mobile widths.

Baseline date: 2026-09-12. **GLOBAL RULE:** preserve the supplied Farming Hub visual identity. This document consolidates the approved historical brand source and observed CSS implementation; it does not authorize visual redesign.

## Sources and approval provenance

The supplied [Farming Hub Brand Guidelines](brand/Farming_Hub_Brand_Guidelines.pdf) and [official RGB logo](brand/FARMING_HUB_LOGO_RGB.png) are authoritative brand sources. [THEME_REFERENCE.md](THEME_REFERENCE.md), software edit SW-0020 and version 0.3.3-alpha.6 record the switch from an inferred public-site theme to the supplied guideline. See DEC-002.

The documentation pass extracted the 19-page PDF's text and visually inspected logo construction/safe zone, size and primary colour pages (6, 7, 8, 12). Pages 9-10 cover misuse/background, 13 secondary colours, 14 typography and 16 decorative elements. This is a source review, not new brand approval or a pixel-by-pixel browser accessibility certification.

## Logo

- Runtime asset: [web/assets/farming-hub-logo.png](../web/assets/farming-hub-logo.png). Source asset: `docs/brand/FARMING_HUB_LOGO_RGB.png`. Use the existing RGB artwork unchanged for sidebar, login, favicon and PO print header.
- No separate approved dark/light logo variants are bundled. Place the RGB mark on its existing white shell even on the green sidebar/login background. Do not invent a white/recoloured version.
- Preserve intrinsic ratio with `height:auto; object-fit:contain`. No crop, rotation, stretching, compression, stroke, recolouring, transparency or effects. Current CSS explicitly disables logo filter/transform/shadow and sets opacity1.
- Guideline safe-zone diagram uses a logo-relative unit; keep other content outside it. Do not invent a pixel-to-unit conversion. Current sidebar shell padding is 12px 14px with max-width202px; login shell 14px 17px. Confirm optical clearance when changing dimensions.
- Page8 illustrates 25mm, 35mm and 50mm widths. 25mm is the smallest illustrated print size, not a stated minimum screen-pixel width. No formal minimum screen size is established.
- Sidebar image width100%, max-height54px; login width `min(300px,54vw)`, max-height88px; print width152px/max-height50px, overridden in print to145px/48px. Current mobile logo sizes are preserved below.
- Favicon is the same PNG from `web/index.html`. Standalone review embeds the identical logo as a data URI through `scripts/build.mjs`; no external asset dependency.

## Exact colour system

These are the later active root declarations in [web/styles.css](../web/styles.css), not the superseded first root block.

| Role / CSS token | Value |
|---|---|
| Primary dark green `--fh-green` | `#204321`, RGB(32,67,33) |
| Primary lime `--fh-lime` | `#C5DA41`, RGB(197,218,65) |
| Secondary peach `--fh-peach` | `#EEBF9E` |
| Secondary orange `--fh-orange` | `#F47422` |
| Secondary rose `--fh-rose` | `#D99B9A` |
| Secondary leaf `--fh-leaf` | `#60BB46` |
| Secondary pale `--fh-pale` | `#EDF2C0` |
| Secondary tan `--fh-tan` | `#EBBE87` |
| Background `--bg` | `#f7f8f1` |
| Surface `--white` | `#ffffff` |
| Text `--text` | `#203a25` |
| Muted `--muted` | `#748176` |
| Border `--line` | `#e3e8dc` |
| UI pale `--pale` | `#f2f5dd` (distinct from `--fh-pale`) |
| Error token `--red` | `#a64d48` |
| Warning token `--amber` | `#9a6a19` |
| Green/dark aliases | `--green` and `--dark` both `var(--fh-green)` |

Body background is `linear-gradient(180deg,#fbfbf7 0,#f7f8f1 20rem,#f5f7ee 100%)`. White data surfaces sit above it. Sidebar/login use primary green; active navigation and progress accents use lime.

| Semantic component | Background / text / details |
|---|---|
| Success `.badge.green` | `#edf7e9` / `#337630` |
| Informational `.badge.blue` | `#EDF2C0` / `#526a25`; class name is historical and no longer literal blue |
| Warning `.badge.amber` | `#fff3df` / `#8a5a12` |
| Error `.badge.red` | `#fbe9e7` / `#984b46` |
| Neutral `.badge.dark` | `#edf0e8` / `#566557` |
| Primary button | `#204321` / white; hover `#17361b` |
| Danger button | `#fff6f1` / `#98472d`; border `#efc8b6` |
| Table header | `#f2f5dd` / `#52664f` |
| Table hover | `#fcfdf6` |
| Focus-visible | 3px outline `rgba(197,218,65,.72)`, offset2px |
| Current workflow card | `#fbfcef`, border `#dfe6c8`, 5px lime left accent |
| Toast / error toast | `#22573a` / `#ac624d` background (existing component-specific values) |

Do not assign arbitrary new colours to an equivalent status. Existing hardcoded note/text variants remain documented debt, not evidence that every colour is a global token. Preserve labels/icons as well as colour for state communication; contrast has not been comprehensively audited.

## Typography

Approved family is AmsiPro. Actual stack: `AmsiPro,'Amsi Pro','Trebuchet MS','Segoe UI',Arial,sans-serif`. No licensed font files or font-service requests are bundled, so many devices render a fallback. The earlier Inter declaration is overridden by the later brand layer. Do not download/redistribute proprietary font files without a licensed source.

| Usage | Current baseline |
|---|---|
| Body | 13px inherited from initial shorthand; later brand stack wins |
| Page h1 | 30px, weight800, letter-spacing -0.8px;26px at <=900px |
| Generic h2 / h3 | 14px /12px, base weight650; panel h2 weight800 |
| Subtitle | 12px, line-height1.7 |
| Eyebrow | 9px, uppercase, weight800, spacing1.65px |
| Button | 11px, weight650; small10px |
| Field / label | 10px; label weight550 |
| Input/select/textarea | 11px, line-height1.6 |
| Hint/caption | 9px, line-height1.6; generic small10px |
| Table | 11px; td padding15px 16px, line-height1.5; bold800 header; retain right-aligned numeric cells and `.mono` identifiers |
| Current stage h2 / copy | 19px weight800 /11px line-height1.55 |
| Login headline | 46px weight800, line-height1.08, spacing -1.5px; later <=900px override36px |
| Identifier `.mono` | `ui-monospace,SFMono-Regular,Consolas,monospace`, size0.92em |

There is no universal heading scale or line-height token system. Match the actual comparable component rather than inventing a new typographic hierarchy per module.

## UI shape, spacing and components

| Component | Baseline |
|---|---|
| General token | `--radius:14px`; not every control uses it |
| Panels / KPI cards | radius14px; white; border `--line` |
| Scope cards | radius13px; active inset4px lime accent |
| Normal buttons | radius9px, padding9px 12px, min-height34px; small5px 9px/min28px |
| Icon button / filter / segmented control | radius8px |
| Form inputs | radius6px, padding9px 11px, min-height36px; textarea min85px |
| Badges | pill999px, padding4px 8px, weight750 |
| Panel shadow | `0 8px 26px rgba(32,67,33,.065)` |
| Small shadow | `0 3px 14px rgba(32,67,33,.05)` |
| Modal | width650px or1010px wide, max-width100%, max-height93vh, radius14px, shadow `0 25px 90px #10281840` |
| Modal backdrop | `#102b206d`, blur3px, padding22px, z-index90 |
| Modal spacing | header21px 24px; body22px 24px; footer15px 24px, right-aligned actions |
| Grids | Form gap16px; KPI gap16px; scope gap15px; preserve component-specific gaps |
| Page content | max-width1570px, horizontal34px desktop; later top31px; page-head margin-bottom25px |
| Sidebar / topbar | fixed sidebar width token246px; topbar sticky height76px, white and lime bottom rule |
| Icons | Inline shared SVG `paths`, viewBox0 0 24 24, no fill, currentColor stroke1.65, rounded caps/joins; usually14-16px. No external icon library. |
| Charts | CSS bars and inline SVG sparklines/trends; no chart-library design system. |

There is no approved universal 4px/8px spacing grid; listed values are actual component conventions. Reuse these classes before adding local spacing. Decorative lime curves/sparks may be rotated/flipped/scaled as the guideline allows; that permission does not apply to the logo.

## Responsive and print behaviour

Breakpoints exist at1550,1200,1000,900 and720px. At <=1000 the main/two-column content becomes one column and topbar search hides. At <=720 the sidebar is an off-canvas drawer, page header/actions stack, KPI grid is two columns, form/document grids collapse, modal margin is8px/max-height96vh, and toast spans the available width. Shipping milestones scroll horizontally on small screens. Tables overflow horizontally rather than having data silently removed.

**Observed CSS issue:** the later unconditional `:root --side:246px` overrides earlier1200/1000/720 token values, and later topbar/content/login declarations override parts of earlier mobile styles. `.workspace{margin-left:0}` and explicit mobile sidebar width230px still apply, but computed behaviour must be checked before modifying breakpoints. Preserve the intended visual identity while resolving any future responsive bug in a scoped change (baseline TD-03).

Print uses a generated `.print-sheet`, hides other body children, A4 with8mm page margins, white surface, inherited brand font and lime header separator. Issued PO print uses stored revision snapshots. Do not turn printing into a new visual design or silently print live master values instead of issued data.

## Changes and exceptions

Brand changes require an explicit reason/decision. Update this file, affected shared styles/assets, baseline and decision log together; record source/licensing for new assets. Existing legacy hardcodes and fallback fonts are documented limitations. No dark mode, alternative logo, new font or replacement component system is approved by this documentation pass.


## Motion experiment refinement - 2026-09-12 (DEC-020 addendum)

Page entrance now uses a 280 ms fade/12px slide; dialogs use 240 ms fade/12px slide with subtle scale; expanded workflow/guidance/actions use a 220 ms reveal. Replay animation restarts page motion without altering sample data or stacking animations. Current comparison disables replay. Reduced-motion preference cancels active prototype motion and disables replay; native disclosure and keyboard behavior remain available. This remains a local proposed treatment; production brand rules are unchanged.


## GAJA support mascot experiment - DEC-021, 2026-09-12

The user supplied an elephant illustration and explicitly requested it for guiding popups. A transparent generated adaptation is stored in prototypes/minimal-theme/assets/gaja-guide.png, with exact prompt/provenance in assets/README.md. Preserve red GAJA clothing, safety goggles and thumbs-up character; do not replace the Farming Hub logo or global green/lime tokens. The guide uses existing fonts/button classes with a compact white card, lime target outline and a restrained 220ms entrance. This visual exception applies to the local experiment only.


## GAJA green/lime poses - DEC-022, 2026-09-12

**MODULE-SPECIFIC RULE: local guide experiment.** User explicitly replaced the red-clothing direction in DEC-021 with Farming Hub green #204321 and lime #C5DA41 trim. That prior red-clothing requirement is superseded for the sample; other GAJA identity rules remain. Keep tan elephant, safety goggles, white GAJA lettering and sticker outline. Current assets: prototypes/minimal-theme/assets/gaja-welcome.png (wave), gaja-pointing.png (explanation), gaja-ready.png (last guide step). Stable mascot box, no continuous animation or new global palette. Manifest/alt text: poses.json; full prompts/provenance: POSE_PROMPTS.md. Old red PNG retained as history, not loaded by the build. Production adoption remains unconfirmed.


**DEC-022 asset surface:** the final pose set uses plain white backgrounds to match the existing white launcher/card. Image generation returned opaque checkerboards for the transparency request, including a correction attempt; those variants are not shipped. Do not claim the new poses have transparent alpha or use them on non-white surfaces without preparing new assets.


## Farming Hub mascot branding - DEC-023, 2026-09-12

**MODULE-SPECIFIC RULE: local guide experiment.** User explicitly replaced GAJA wording with the Farming Hub logo. This supersedes the GAJA-lettering requirement of DEC-021/DEC-022 only. Use the approved web/assets/farming-hub-logo.png as the cap/chest edit reference and the exact original asset in the guide header. Current pose files: prototypes/minimal-theme/assets/farminghub-welcome.png, farminghub-pointing.png, farminghub-ready.png. Guide copy and alt/accessibility labels say Farming Hub, with no old mascot name. Preserve existing green/lime clothing, elephant/goggles/poses and white image surfaces. Older artwork and records remain historical, excluded from the active pose manifest. Production adoption remains pending.


## Persistent guide dock - DEC-024, 2026-09-12

The Farming Hub logo and current green/lime elephant remain visible together in a compact fixed dock labelled Guide me. In an open native tour, move that same dock into the top layer so it remains usable. Reserve room beneath the card and business dialogs, including narrow viewports, rather than covering Save/Cancel. Continue the same three poses and 220ms/reduced-motion treatment. Take me there is a normal branded button; no AI branding or chat composer is present. Prototype only.


## Consistency fix presentation - DEC-025

Keep existing colors, fonts, logo and controls. Sidebar gains vertical scrolling at short heights; no navigation redesign. Startup error uses existing boot/button styling. Show page guides remains visible in the Minimal preview toolbar and changes to Hide page guides while explanations are shown.

DEC-026 mobile refinement: below 420px hide the redundant topbar breadcrumb and truncate long account labels to keep navigation and Sign out within the viewport. Page titles remain. Both 320px and 390px have no document-level horizontal overflow; tables retain their own horizontal scrolling.


Payment-rate wording (DEC-027): reuse native labelled numeric fields and existing table styling. Show plain currency pairs and Indian bank/BOC attribution. The BOC field explicitly says optional; retain required markers on mandatory fields. Keep a brief RMB-per-USD reference-only hint, no rate feed or extra brand treatment.


DEC-028: modal backdrop z-index 270, above appearance toolbar 250 and below mascot dock 300. Notifications use bottom 94px to reserve mascot space. Existing form colors, type, spacing and dimensions remain.


## QA repairs — DEC-029

Reuse existing status card, small/primary Add ERP item button, item-edit dialog and shared warning note. No new palette, typography, mascot behavior, spacing system or animation. Informational warnings required to complete a workflow stay visible in Minimal. Existing shipment guidance and owner/status copy must describe actual state accurately.


## Manager independence setup — DEC-030

Reuse the existing approval dialog for the Independent Manager preset and the shared table/badges for Your workflow access. Vendor/item/price import and source/history buttons stay in existing module headers. Previews use native file inputs, shared tables, inline validation, source download and explicit commit footer. Freight recovery uses the shared form and returns to booking. Vendor history uses expandable before/after details. No fonts, colors, mascot, animation, page guides or spacing tokens changed; Minimal remains the default.


**DEC-030 published verification, 2026-09-13:** The approved Minimal/Current theme, mascot and page-guide assets remain unchanged; the published Manager/setup controls use the documented shared styles. Eleven runtime assets match release f5d5514.

## Mascot corner placement - DEC-031

Retain the existing logo, elephant, Guide me pill, colors and dimensions. Allow bottom-left or bottom-right docking in Current and Minimal, with existing mobile spacing. During dragging, translate horizontally within the viewport and use the grabbing cursor. Do not add vertical placement, a new toolbar or decorative animation. Keep Show page guides separate.

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.

## Visible order timeline - DEC-032

Preserve existing step markers, green/lime colors, labels and horizontal timeline scrolling. Minimal now shows the expanded timeline by default. On narrow Minimal screens, the main grid uses minmax(0,1fr) so order panels fit the viewport and wide content scrolls inside its container.
