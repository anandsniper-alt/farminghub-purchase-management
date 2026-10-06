# Implements suppliers and product identification

DEC-113 / WF-107, 2026-10-06. Module-specific extension of Implements purchasing and cost-free technical checking. Implemented and locally verified; live publication needs deployment access and final verification.

## Supplier workflow

Implements Division → Rotavator purchasing → Suppliers → open supplier → edit contact, address, GSTIN, phone, email, payment/delivery terms and notes. Each supplier has a stable identity, optional supplier code and active status. Inactive suppliers remain in history and cannot receive a new PO. Existing supplier fields are retained when editing. Reasoned changes append history and use existing authoritative purchase permissions, CSRF, workspace revision conflicts and retry receipts.

The supplier detail shows linked items with product images, internal IMP/drawing codes and separately editable supplier part codes. Add a mapping for any item or model fabrication subassembly. The same internal item can have different codes for different suppliers. Blank vendor codes remain pending. A mapping does not change the item's IMP code, quantity, purchase rate or default supplier. Item Master and Purchase prices provide a Vendor codes shortcut. Download the supplier register or a supplier's item-code CSV; Item Master Excel/CSV also includes supplier codes.

Supplier history and saved PO history are accessible from the supplier detail, with the existing PO PDF/Excel actions. Commercial supplier details are restricted to purchasing access.

## Technical checking

The `/bom/` module displays the current item image and the chosen supplier's part code, alongside component identity, segment, PPM, unit and syntax fabrication weights. Images enlarge in an accessible dialog. Items without a curated/uploaded photo retain an illustrative family icon or Photo pending. The server's explicit technical projection excludes supplier contact details, rates, private notes, price histories, product costs and purchase records. Protected image aliases and small static identification helpers are available without granting purchasing access. Upload/change images through the existing Item Master editor.

## Pictured purchase orders

New saved PO lines freeze supplier part codes and product images using the final MRP supplier selection. Fabrication child schedules freeze those fields too. PDF and Excel include product identification and vendor codes; fabrication schedules include them as well. Photos are resolved locally from the protected image manifest or bounded uploaded raster images. No remote image is fetched during export. Existing quantity, weight, buffer, extra, landed-rate and total calculations remain unchanged.

Saved PO contacts/codes/photos remain immutable after master changes. Legacy POs without an image use the saved component name's curated reference during display/export; absent codes remain pending, and the stored PO is not rewritten. Existing review/approval/issue status is retained.

## Verification and boundaries

The full native suite had 370 passing tests, with two build tests initially blocked by sandbox child-process permissions; the three build-contract tests passed when rerun with process permission. Final targeted supplier/BOM/purchasing/build checks passed. Isolated browser checks passed supplier navigation, vendor edit/reload, cost-free images and enlargement, immutable saved PO identity, mobile overflow and PDF/Excel export. Export readback reconciled quantities, amounts and total, embedded images and the saved vendor code; the rendered PDF was inspected. Fixtures and business snapshots stay in ignored `test-output/supplier-update/`, never live.

Current runtime evidence was directly refreshed: 187 models, 160 purchased items, 17 suppliers, 12 saved Implements POs. No business data was seeded or vendor reference invented. Existing model revisions, prices, BOMs, stock and orders are preserved. A fresh consistent recovery download matched the server checksum; final archive/restore and publication evidence are recorded separately.

UI-01, UI-02, UI-04, UI-06 and UI-09 apply: shared shell/return paths, visible current identity, meaningful empty states, keyboard focus and reasoned persistent edits. Native dialogs and static imagery reuse the approved theme; no new animation or UI framework is introduced.

Supplier/item lists paginate at 30 rows; histories show the latest 100 entries. Existing limits remain 1,000 suppliers, 5,000 purchased items, 1,000 models and 20,000 validated supplier-item mappings. At 10x current use, measure full-workspace payload and revision contention before raising limits. At 100x, normalize supplier mappings and add scoped/paged transactions before expanding the aggregate. These are future scale requirements, not a claim of load-tested capacity. Bulk supplier-code import, automated vendor transmission and a new PO issue policy are outside this change.
