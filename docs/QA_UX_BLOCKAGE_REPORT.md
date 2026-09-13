# QA UX blockage review

| Blockage | User impact | Recovery / correction | Current limit |
|---|---|---|---|
| Past-tense incomplete milestone labelled current state (BUG-001) | User thinks PO/sample already approved | Local display now uses actual status, explicitly rejected sample | Live retest pending |
| Unassigned follow-up (BUG-002) | Team cannot identify responsible owner | Local ownerId display with legacy fallback | No reassignment performed |
| Empty forwarding-agent list (BUG-003) | Cannot book; missing prerequisite unexplained | Live synthetic provider created; local note explains Vendor master setup | Real forwarding agent still needed |
| Plan shipment overrides existing shipment work (BUG-004) | Final BL/insurance hard to discover in partial shipments | Shipping tab recovered; local header prioritizes existing required step | Manual additional planning retained |
| No ERP setup after PLM creation (BUG-005) | New product cannot reach purchase lines | Existing item form now exposed locally; metadata fixed | Live QAAS01 remains blocked until publication |
| Contradictory missing-PLM copy (BUG-006) | Users unnecessarily stop procurement | Local text aligns DEC-008 technical-warning/brand-approval distinction | No gate removed |
| Selected commitment reason missing from audit (BUG-008) | Cause cannot be reconstructed from date alone | Local event now retains selected reason | No historical backfill |
| Incorrect freight preview values (BUG-007) | Misleading apparently valid benchmark | Strict full-cell parsing and disabled invalid commit, verified locally | Live preview reproduced the defect; publication retest pending |

Recovery paths that worked live: correcting rejected sample and QC, fixing allocation totals without clearing the form, correcting actual receipt separately from BOC reference, returning from Vendor master to the same PO and completing partial shipments through Shipping controls. All created evidence/history was retained.

Remaining usability scope: broad keyboard/screen-reader behavior, unsaved-form navigation warnings, expiring sessions and slow uploads require further controlled scenarios. Existing Minimal, animation, mascot and Show page guides passed their isolated presentation regression; this is not full accessibility certification. Root-cause text exists on complaint entry, while a dedicated complaint-resolution workflow is baseline partial functionality. Do not invent a completed closure capability.


## Continued live QA

BUG-009 fixed locally: mascot bottom clearance,8 browser cases. BUG-010–012 fixed locally: actionable import errors, duplicate-key checks and safe preview replacement;38 browser cases. BUG-013 fixed locally: Indian bank rate retains recorded precision;33 payment cases. Every live failure remains pending publication/retest.

Additional observed limitations: refresh/Escape discards unsaved drafts without warning; malformed XLSX shows a raw ZIP-library error; complaint root-cause/corrective-action text is unstructured with no closure workflow or dedicated revision link; vendor View has no per-record creation audit. These are described honestly, without pretending Admin access supplies absent features. Date-range policy TD-06 requires a deliberate decision. See QA_ACCESS_BLOCKERS.md for the scenario-level list.
