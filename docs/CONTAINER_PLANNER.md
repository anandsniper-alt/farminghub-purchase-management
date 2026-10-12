# 3D container loading planner

LAE Import / Loading → 3D load planner beside a saved plan or shipment. This is a planning suggestion, not a loading confirmation. Existing quantities, PO ownership, reservations, payments, status and evidence stay in the original domain workflow. Publication is separate.

## Screen contract

Choose 20GP, 40GP, 40HC or custom equipment. Confirm internal length, width, height, door opening, permitted cargo payload and wall/roof clearance. Enter the outer dimensions of the packed unit, including its crate/pallet, units per package, gross package weight, allowed rotation, maximum layers and supported top load. Partial final packages use the full package envelope and full gross weight conservatively. Missing dimensions are pending; they do not become zero. Unknown-weight packages are placed on the floor only and the payload cannot be described as verified when such packages are loaded.

Calculate compares eight deterministic strategies by loaded outer volume, then loaded units. The conservative model uses disjoint floor spaces and fully supported same-item vertical columns. It enforces package/door dimensions, floor/roof clearance, stack counts, entered top-load limit and known cargo payload. No mixed-item stacking. It is not a globally optimal solver or a certification of manoeuvring, forklift access, floor point loading, axle loading, lashing, dangerous-goods compatibility or stability. Loader/forwarder review remains required.

The view rotates using drag or arrow keys; top/side/door views and a package sequence slider have text equivalents in the results table. Colours identify items alongside item codes. Selecting a package retains its original PO and line identity. Comparison reruns the same inputs against reference equipment; adopting a reference size only changes this planning scenario.

## Item-master integration contract

The other PMS chat's packing reference library was located on 12 October 2026. It supplies historical observations, not a published Item Master schema. The adapter in `packingPlanRows` remains the single future master integration point. Do not add another master or parse dimensions from descriptive text. The provisional typed property is `items[].loadingPackage`:

| Field | Unit / meaning |
|---|---|
| lengthMm, widthMm, heightMm | Positive outer packed dimensions in mm |
| unitsPerPackage | Positive whole item units per package |
| grossWeightKg | Positive package gross kg, null when unknown |
| rotation | FIXED, UPRIGHT (floor rotation), FREE (all six orientations) |
| maxLayers | Whole 1–100; 1 is floor-only |
| maxTopLoadKg | Permitted weight above one package; null unknown, 0 no load above |

If the other chat adopts a different schema, map its validated fields here. Do not fabricate real measurements or import the demo's specimen dimensions. This version handles one package configuration per PO line; multi-package products or alternate packing variants need an explicit master contract first. Orphaned source lines remain visible and pending rather than disappearing from capacity totals.

## Drafts, scale and isolation

Manual changes are scenario overrides. Save browser draft stores per workspace, user and plan in local storage, with a source-line/quantity signature. A changed plan invalidates the saved layout. Saved values are captured dimensions; users must review newer item-master changes. Leaving unsaved entries offers Keep editing or Discard changes. Other users/devices do not share these drafts. Download layout exports a private JSON calculation with source links, dimensions, placements, warnings and quantities; no financial data. There is no server write, new database or migration in this feature.

Limits: 200 package lines and 5,000 placed packages per calculation. Excess demand remains unplaced with an explanation. The solver runs for the selected plan, not all orders. Renderer redraws only on input/resize and disconnects on navigation. At 10x/100x portfolio size the per-plan cap is unchanged; plans exceeding the cap need partitioned scenarios or a future bounded worker implementation. No additional third-party renderer or animation library is introduced; existing shared GSAP lifecycle governs page transitions. UI-03–08/UI-10/UI-12 and HIG R012/R021/R060/R100/R135 apply.

## Packing-list import (DEC-130 / WF-125)

Import packing list opens a local preview. Supported inputs are XLSX/CSV with worksheet/header/column mapping, or the historical `LAE_Packing_CBM_Data.json` version 1.0 contract. After loading that library in the current screen session, an original PDF is identified by SHA-256 and selects its extracted records. Unknown or scanned PDFs are not OCR-parsed: users must supply verified Excel/CSV rows. No source files or library data are uploaded, bundled into public assets or committed to the repository.

Preview matches exact item code and supplied PO/supplier when unambiguous. Users choose the original plan line for unmatched or repeated codes. Differences require a mapping reason; a separate confirmation accepts the reviewed configuration. One source record per target PO line is permitted. Historical variants are observations, never quantities to add together. Partial current lists retain the plan quantity and show the difference. Actual reservations/loading remain in the original flow.

Dimensions explicitly labelled mm/cm/m convert to mm. Otherwise the user must select the unit. Package count, product quantity and whole units per package must reconcile. Multi-package products and mixed-carton averages are blocked until an explicit compatible package configuration is supplied. CBM cannot generate dimensions. Missing dimensions/weights replace old scenario inputs with blanks to avoid constructing a fictional hybrid; CBM and source warnings remain attached as reference evidence. Total gross weight is not treated as per-package gross weight. Imported rules reset conservatively to fixed orientation, one layer and unknown top load; confirm any stacking separately.

Selected source filename/hash/row/record/RO/invoice, historical quantities, CBM, review notes, mapping reason and import timestamp accompany the scenario draft and layout export. Current plan identities and quantities are retained. Cancelling selected import rows requires Keep reviewing / Discard import. An open import pauses the shell's automatic refresh; route changes return to the planner for dismissal rather than silently dropping the import.

Limits: 10 MB compressed input, 25 MB per expanded XML entry, 40 MB aggregate expanded XLSX, 4,000 archive entries, 30 sheets, 100 columns, 2,000 data rows, 25 preview rows/page. Actual streamed bytes are bounded before accumulation; archive size metadata is not trusted as the only limit. Formulas are never executed; cached XLSX values are visibly identified for review. Source text is escaped, external worksheet relationships are not fetched, and XML declarations/entities are rejected. Existing vendored JSZip is reused. At 10x/100x data growth the per-import limits stay fixed; larger libraries need deliberate partitioning. The feature performs no business API write and needs no migration or new dependency. Publication status is recorded in PUBLICATION_2026-10-12.md. UI-03–08/UI-12 govern the preview.

The retrieved library has 925 observations across 282 documents; all document hashes were rechecked locally. Only nine observations contain geometry, and the library links full geometry to two of its stock entries. These are source-coverage facts, not permission to populate all current items automatically. Original library paths and browser/test receipts stay in private local evidence.

## Container reference sources

Fleet examples rechecked 12 October 2026 from Hapag-Lloyd: [20 ft standard](https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/20-standard.html), [40 ft standard](https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-standard.html), [40 ft high cube](https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-standard-high-cube.html). Actual equipment and route cargo limits may differ. Custom inputs are authoritative for the scenario; presets never overwrite a booking.
