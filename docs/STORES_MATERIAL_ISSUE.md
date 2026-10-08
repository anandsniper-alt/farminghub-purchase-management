# Stores and material issue

DEC-117 / WF-112 · 2026-10-08 · Production module-specific extension of DEC-111/114.

The user confirmed that stores must issue individual segments separately. The new **Stores & material issue** screen is at `/production/#/picking`. It contains a daily pick list and links to each batch's segment issue screen. No master BOM, syntax, financial records or staff permissions are changed by this feature.

## Stores workflow

1. Production saves a draft batch against the current BOM, with its production date and planning month.
2. Stores chooses a pick date, model and segment. **To issue** includes due drafts and batches with some segments already issued. Identical items are combined, with batch allocations, images, item and supplier part codes, confirmed quantities, stock and shortages. Missing quantities remain pending.
3. Open **Issue by segment**, select a segment, check quantities and enter the actual issue date and reason. Any consumption adjustment belongs to this batch, not the master BOM. Post only that segment.
4. Continue with the remaining segments. Each successful post deducts that segment once and records its dated stock movements. The batch becomes **Part material issued**, then **Material issued** after the final segment.
5. Complete machines partially or fully and record their serials. Once segment issue has begun, completion requires all segments to be issued. Completion does not deduct issued stock again.

Fabricated stock remains one model subassembly set per machine. This screen does not introduce individual fabrication-piece stock or multiply approved combined fabrication weights by PPM. Existing direct completion and whole-batch issue remain available for drafts.

**Issued on this date** uses actual dated stock movements, including direct-completion tranches. Reversed issues retain a visible historical marker. Print and Excel-compatible CSV use the current date/model/segment selection. CSV includes batch allocations; downloads contain technical quantities only.

## Posting and planning rules

First issue freezes the batch material basis and segment membership. Later master edits cannot reclassify or change already-issued batch materials. Unissued pending quantities can be confirmed when that segment is issued. Duplicate segments, shortages, stale draft definitions, invalid quantities and invalid stage dates are blocked. Requests retain existing revision, CSRF, actor and retry-receipt enforcement; stock and history commit atomically.

Partially issued batches contribute item quantities to the production-owned `productionMaterialIssued` monthly record. MRP subtracts these quantities from remaining demand as well as using reduced physical stock, avoiding a second purchasing requirement. The final segment replaces this batch's staged item credits with the existing whole-machine consumed record. Manager reversal returns exact issued quantities and removes only that batch's credits. Concurrent batches remain independent. Commercial or technical saves cannot forge production credits.

Existing production access controls apply. No stores account or grant is automatically created. Production APIs and downloads exclude costs, margins and commercial histories. No live demonstration transactions are posted.

## Capacity and verification

The daily report is bounded to 500 matching batches and 100,000 material/movement lines; larger requests explicitly require a narrower model selection. Existing indexed registers and native SQLite transactions are retained, with no schema migration. Current catalogue size is 187 models. At 10x volume, bounded reads and aggregate stock contention require measurement. At 100x volume, normalized inventory and measured report processing are needed; no load capacity is certified.

Local verification: 405 native tests passed, including 27 production/retry checks; review build and scoped syntax/diff checks passed. Isolated synthetic browser flows issued fasteners, oil and fabrication separately, retained a batch-only oil adjustment, protected unsaved entries, completed one machine without another deduction, and showed daily issued quantities correctly. At 390x760, stock tables scrolled internally and shortage errors/post controls remained visible. No live BOM or stock write was used. Browser print-preview and a physical handset were not part of this verification.

UI-01–UI-12 and HIG R100/R102/R135/R139 apply: clear status and next actions, persistent filters, focused validation, unsaved-entry protection, responsive internal table scrolling and existing branded controls. Existing motion behavior is retained. No new motion dependency or alternate navigation shell is introduced.

Publication requires the fresh matching-source recovery archive, isolated original/candidate restores, exact hosted CI, deployment health/release identity, served asset equality and protected business-state readback. Publication evidence is recorded separately; local tests alone do not prove a live release.
