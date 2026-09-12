# Farming Hub brand implementation reference

> Current project memory (2026-09-12): see [Project Rulebook](PROJECT_RULEBOOK.md), [Current Product Baseline](CURRENT_PRODUCT_BASELINE.md), [Decision Log](DECISION_LOG.md) and [Workflow Change Log](WORKFLOW_CHANGE_LOG.md). Historical release statements below remain evidence of their date, not necessarily current behaviour.

Authoritative source files bundled with this release:

- `docs/brand/Farming_Hub_Brand_Guidelines.pdf`
- `docs/brand/FARMING_HUB_LOGO_RGB.png`

This implementation follows the uploaded Farming Hub Brand Guidelines rather than an inferred public-site theme.

## Logo rules implemented

- Use the supplied logo artwork unchanged.
- Preserve its aspect ratio; never stretch, condense, rotate, crop, recolor, add stroke, transparency or effects.
- Keep a clear zone around the mark. Application shells place the RGB logo on white, the preferred background in the guidelines.
- Do not place UI text, icons or decorative elements inside the logo clear zone.
- The same supplied asset is used in sidebar branding, login and printed Purchase Orders.
- The browser-review build embeds the logo unchanged as a data URI so it remains available offline.

## Brand color system

Primary colors from the guideline:

- Dark green: `#204321` (RGB 32, 67, 33)
- Lime: `#C5DA41` (RGB 197, 218, 65)

Secondary colors:

- `#EEBF9E`
- `#F47422`
- `#D99B9A`
- `#60BB46`
- `#EDF2C0`
- `#EBBE87`

The application uses white and pale neutral surfaces for data-heavy screens, primary green for hierarchy/navigation, lime for selection/progress, and secondary colors for operational status/warning support.

## Typography

The guideline specifies **AmsiPro** (Thin, Light, Regular, Medium, Bold, Extrabold) for paragraphs, ad copy and headings.

The application declares `AmsiPro` / `Amsi Pro` first in its CSS font stack. No proprietary font file was supplied with this project, so the build intentionally does not embed or redistribute a font file; devices without AmsiPro fall back to readable system fonts.

## Brand elements

The guideline's curved/spark shapes may be scaled, rotated and flipped, and may use brand colors. The application uses restrained curved lime elements in the sidebar/login and small decorative accents, without interfering with data legibility or logo clear space.

## Durability

This file and the original guideline/logo are included in the repository so subsequent UI revisions have a local source of truth. Any future visual change to Farming Hub Purchase Management should be reviewed against these bundled files before release.
