# LAE Domestic milking-machine BOM trial

2026-09-24. Local review only, branch `codex/domestic-bom`. No production deployment or live database changes.

## Current update: major BOM and assembly parts — DEC-065 / WF-059

The user clarified that "spare parts per machine" means **assembly parts**, not extra replacement spares. Use **Model BOMs → Major BOM** for the machine's major components, and **Assembly BOMs → Assembly parts** for each component's detailed build list. The expected five or six major components is a presentation/process target, not an enforced number or authority to invent unspecified parts.

Assembly types now include frame, motor/pump, can, engine and other assemblies. CS1 still serves TX-MM1; CS2 still serves GJ-MM2/3/4. A complete purchased major unit such as the specified motor/pump can remain one major row without inventing a breakdown. Fresh preview catalogues also contain four empty frame assembly BOMs, linked to their models. Their frame item, bushes, fasteners and quantities must be entered by the user. Existing saved preview data is preserved; it is not automatically regrouped or cleared. Add an assembly from the Assembly BOMs page when working with an earlier saved preview.

**Workflow:** create/open an assembly → add assembly parts in the workbook table → enter quantity per assembly and INR rate → save with reason → select that assembly in the machine Major BOM → enter sets per machine → save. From the machine table, **View assembly parts** opens the exact saved assembly revision with pictures. **Open assembly BOM** opens the current assembly for maintenance. Later assembly edits require an explicit model save to change its saved cost.

**Calculation, units and rounding:** unchanged from the rules below; extend the can-set formula to every assembly type. Example: one frame at INR 100 plus four bushes at INR 5 gives INR 120 per frame assembly. Two such assemblies contribute INR 240, counted once in the Major BOM. Assembly parts remain separately purchased inputs. Nested assemblies within assemblies are not introduced.

**Verification for this update:** 19 targeted native tests passed (10 Domestic and 9 reference tests). Authenticated-server and standalone-review browser flows passed, including frame composition, can-set composition, model total, saved-parts picture drill-down, photo upload, history, reload and mobile layout, with no runtime errors. The 234-test full-suite result below belongs to the preceding trial revision. Current browser evidence: `test-output/assembly-browser-report.json`.

The original can-set trial record below is retained for context; this section generalises its can-set-only structure. No production deployment.

## Current scope

Order Management → LAE Domestic → Model BOMs / Can-set BOMs / Item Master.

- 33 workbook components, preserving source descriptions, segments, UOMs and identification pictures; four user-specified motor/pump items.
- Four model cards with the supplied photographs: TX-MM1, GJ-MM2, GJ-MM3, GJ-MM4.
- CS1 is linked to TX-MM1. CS2 is one reusable can set linked to GJ-MM2, GJ-MM3 and GJ-MM4.
- Each model keeps its own motor/pump item; choose its frame and other components in Edit BOM. Frame compatibility and unspecified quantities are not inferred from photographs.
- Can sets group separately purchased parts; they are not an additional purchased item or an extra charge.
- The can sets start empty for the user to define. Motor quantities and prices remain pending. Each explicit model-to-can-set link represents one set per machine.

The six source columns remain in order: **S.No | segment | Item Description | UOM | Picture | Rate (before GST)**. Quantities appear in the UOM cell and item codes beneath descriptions. A can-set row expands to display its saved component composition. Pictures can be enlarged without discarding unsaved form entries.

## Using the preview

From this worktree:

```powershell
node scripts/prepare-domestic-preview.mjs
node scripts/build.mjs --domestic-preview
node scripts/serve-domestic-preview.mjs
```

Open `http://127.0.0.1:8146/#/domestic/models` on the host computer. This standalone review uses a separate browser-storage key, `fh-domestic-preview-v1`, and a review-role selector. That selector is not real authentication. Preview edits persist in this browser and cannot reach the live website.

1. Open **Can-set BOMs → CS1 or CS2 → Edit BOM**.
2. Select each separately purchased component and add a row.
3. Enter quantity per set and the unit price in INR before GST. Leave unknown prices blank.
4. Confirm the complete component selection only when it is complete; enter the revision reason and save.
5. Open a model BOM. Its linked can set stays in place. Add the appropriate frame, bush, fasteners and other required components.
6. Enter quantity per machine and model-specific component rates. A can-set rate comes from its component BOM and cannot be overwritten independently.
7. Save with a reason. **Revision history** preserves earlier component selection, quantities, rates and the exact can-set revision used.

Editing a can set does not silently reprice saved models. A model displays a newer-revision notice; opening its editor previews the latest linked revision, and saving explicitly adopts it. A competing can-set save during model editing is rejected, requiring the model editor to be reopened.

## Cost rules

**Purpose:** estimated purchasing BOM cost per machine or per can set, before GST. This is not a receipt valuation, actualised landed cost or tax calculation.

**Inputs:** quantity in the item's purchasing UOM (stored as integer thousandths); INR rate per that UOM (integer paise). PCS/SET require whole quantities; Feet/Metre/Kg allow up to three decimals. Rates use the existing shared money parser and at most two decimals.

**Formula:** line paise = floor((quantity-thousandths × rate-paise + 500) / 1000). Sum rounded line amounts. A can-set line uses the saved, complete can-set component total as its unit rate; multiply by sets per machine. Do not add its child lines again to the model total.

**Outputs/rounding:** integer paise; display INR with two decimals, half-up at each line. Overflow fails rather than losing precision.

**Null/zero/edge cases:** blank quantity/rate is unknown; a zero price is an explicit free component. Quantity must be positive. An empty or incomplete can set leaves the model cost incomplete. A numeric total alone does not establish that all required parts are included; the explicit composition confirmation is also required for Costed status. Can sets can contain purchased items only, preventing recursive or cyclic costing. Duplicate direct component/set rows are rejected; edit the quantity on the existing row.

**Example:** two parts at INR 10.25 give CS2 INR 20.50. One CS2 plus one motor at INR 500 gives INR 520.50 for those entered components. This becomes a complete model cost only after the full composition has been confirmed. Test amounts are illustrative and were never saved in the user's preview or production workspace.

## Identity, access and source

Permanent references use FH-LAE-D-IT-n for component items, FH-LAE-D-MDL-n for model records and FH-LAE-D-BOM-n for BOMs. User codes TX-MM1/GJ-MM2/3/4, TX-MT1/GJ-MT1/2/3 and CS1/CS2 are retained alongside software references. Assigned item and can-set codes are not overwritten. Saved BOM rows are snapshots; editing an Item Master price does not rewrite them.

Existing Admin/Manager/Executive purchasing roles can edit within LAE Domestic scope; Viewer can read. Catalogue import requires Manager/Admin. Server commands, optimistic revision checks, persisted audit events and scoped projection remain authoritative. Domestic pictures require an authenticated Domestic-scoped session in native server mode. Normal startup does not import this catalogue automatically.

Source: `Milking Machine BOM final.xlsx`, sheet FINAL BOM, cells A1:F34; 33 source rows, 30 distinct source images reused across 33 picture cells. `data-reference/domestic-bom.json` retains source hash, row/cell references and image hashes. The extraction script preserves original image bytes, including three WPS DISPIMG frame pictures. All source rates are blank. Source image reuse does not imply that differently described parts are interchangeable.

## Remaining input and later phases

The user must supply CS1/CS2 composition, quantities, the applicable frame and other model components, and real supplier prices. Motor descriptions mention bundled accessories; do not separately add those accessories without clarifying whether they are already included in the purchased item. This trial does not implement vendor quotations/comparison, actual receipt costs, manual stock/MRP, production management or ERP push/pull. Those were discussed as later work and are not presented as complete.

See DEC-064 and WF-058. Verification evidence is local under `test-output/`; no private data, browser profiles or test databases belong in Git.

## Verification — 2026-09-24

- Native suite: 234 tests passed, including eight new Domestic tests for source fidelity, model/set links, scope, missing/zero/rounded costs, snapshot retention, invalid/stale saves, item identity and SQLite persistence.
- Browser QA passed in authenticated native-server mode and standalone review mode: four models; exact six headers; all 33 source picture cells loaded; scoped picture upload; search; photo enlargement retaining unsaved fields; can-set save and model rollup; reload persistence; history; mobile page width and accessible save footer. No runtime errors observed.
- Desktop frame photos and 390px mobile BOM editor screenshots inspected. The original source pictures and descriptions remain unchanged.
- During QA, fixed photo overlay stacking and whole-quantity HTML step validation. Browser checks were rerun after the fixes.
- Evidence: `test-output/domestic-native-tests.txt`, `test-output/domestic-browser-report.json`, `test-output/domestic-server-frames.png`, `test-output/domestic-review-edit-mobile.png`. Browser writes used disposable local contexts and temporary databases, not the user's preview storage or production.
