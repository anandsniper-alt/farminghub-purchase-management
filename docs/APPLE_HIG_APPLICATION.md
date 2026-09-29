# Farming Hub application of the Apple HIG rulebook

Date: 2026-09-29. GLOBAL design reference. DEC-098 / WF-092.

The user instructed us to follow the supplied [Apple HIG rulebook](APPLE_HIG_RULEBOOK.md), research edition 29 September 2026. The reference is copied unchanged; it is an independent synthesis, not Apple certification. Apply its shared and relevant feature rules to future UI implementation and review. Consult linked official guidance when a platform-specific decision requires verification.

## Application to this product

Farming Hub is a browser-based purchasing application used on desktop and mobile. Use semantic HTML, CSS units, keyboard/focus behavior, browser zoom, accessible control names and web accessibility conventions. Apple point measurements, native frameworks, Liquid Glass, SF Symbols and platform shortcuts are not automatic web requirements. Do not add or bundle Apple assets/fonts merely to imitate their appearance.

Prioritize readable hierarchy and progressive detail (R021-R032), plain action labels and clear next steps (R067-R073), sensible form defaults and correction guidance (R100-R104), scoped dialogs with work preservation (R105-R113), honest progress and duplicate-submit prevention (R114-R116), contextual help (R120-R125), and useful tables/charts (R135-R140). Motion must communicate a change, remain brief and respect reduced motion (R060-R066). Essential status must remain understandable without color alone (R012, R036).

## Project-specific adaptations

- R027, R033, R040-R049, R081: retain the approved Farming Hub logo, licensed typography/fallbacks, green/lime identity and Minimal presentation. Do not replace the theme with an Apple visual clone. Preserve per-login guide settings and the movable mascot. Check actual contrast and readability for each changed component; this adoption does not certify existing tokens.
- R006, R022, R100: keep required financial context, validation, pending steps and actionable warnings visible. Reduce repetition and defer optional detail without concealing obligations.
- R002, R117-R119: recovery of issued orders and saved payments uses existing reasoned revisions, revocation or void/replacement commands and audit history. Generic Undo must not erase financial records or bypass permissions.
- R129-R131: retain authenticated role/division access and administrator-managed accounts. Consumer account-deletion guidance does not authorize destruction of retained business or audit records.
- Native-only platform features are Not applicable unless explicitly included in a later approved feature. Record the reason and source rule when making an exception.

## Review method

For each changed screen record rule ID, expected/observed behavior, reproduction steps, evidence and Pass/Fix/Not applicable. Check relevant desktop/mobile layouts, keyboard and focus, larger text, reduced motion, empty/loading/error/success states and recovery from mistakes. Retain existing business calculations, server enforcement, immutable snapshots, terminology and workflow approvals. Reuse -> extend -> refactor -> create new.

This is adoption of a design reference, not an audit result, completed redesign or live deployment. Future implementation changes require their relevant verification and the established publication/backup procedure.
