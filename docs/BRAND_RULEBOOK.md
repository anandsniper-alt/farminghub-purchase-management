# Farming Hub brand rulebook

Current guide · 2026-11-17 · DEC-170. Use with [UI rules](standards/UI_UX_RULEBOOK.md).
Detailed historical component measurements and module examples are in [the brand reference](BRAND_RULEBOOK_REFERENCE.md); consult only the affected component. Old experiments and release reports are not current instructions.

## Current presentation

- Minimal only; no Current-theme selector or top appearance strip (DEC-045).
- Use the shared module shell/sidebar, clickable Farming Hub home logo, division links, account controls and authorized module switcher.
- Hide the mascot launcher, dock and tour globally (DEC-120). Do not reserve empty mascot space. Ordinary account-specific page guides remain.
- Reuse current shared typography, spacing, inputs, tables, dialogs and responsive classes. Historical September pixel measurements do not override later HIG fixes or current shared tokens.
- Approved font family is AmsiPro, with the existing Trebuchet MS / Segoe UI / Arial fallbacks. No licensed font files are bundled; do not obtain proprietary fonts without a licensed source.
- Keep accessible text, focus and semantic controls; mobile interactive controls use at least 44 CSS pixels. Tables may scroll inside a named region, without hiding data.
- Use existing SVG icons and restrained shared motion. Support reduced motion and restore styles on interruption.
- Screen edits must not change issued PO/PDF snapshots or print pagination. Verify print only when print/shared print markup is affected.

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


## Changes and exceptions

Preserve logo proportions and the approved green/lime identity. Change branding only within explicit user scope; record a material exception once in the DEC ledger. No new framework, alternate theme, Apple visual clone or external icon/font dependency is implied by HIG. Reuse the relevant existing component before creating a new style.
