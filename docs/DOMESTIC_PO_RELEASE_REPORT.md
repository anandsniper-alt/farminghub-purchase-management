# Domestic purchase-order release

Date: 2026-09-24. Status: candidate tested; publication pending.

## Included
BOM-based vendor drafts, automatic FH-LAE-D-PO-n references, quantity multiplication and selected parts, saved quote provenance/manual rates, required commercial terms, reasoned draft edits, Manager/Admin issuance and cancellation, immutable issued snapshots and pictured Print / Save PDF. Includes the tested assembly supplier-total comparison from DEC-073. Demo data is excluded.

## Use
Open LAE Domestic → Assembly BOMs → choose CS1/CS2 or another assembly → complete and confirm the parts/quantities → Create purchase order. Choose supplier and number of assemblies, keep the required parts selected and enter agreed rates. Complete delivery address/date, payment/GST/freight terms and reason. Save the draft. A Manager/Admin reviews and chooses Approve & issue; Print / Save PDF produces the document with BOM revision and part photos. Issuing does not send a message to the supplier.

Domestic receipts, payment execution, automatic GST/freight costing, stock/MRP and ERP transfer remain outside this release. Totals explicitly exclude GST/freight; commercial terms are entered by the user.

## Calculation
Purpose: order selected assembly parts for a whole assembly count. Inputs: saved BOM quantityMilli and UOM, assembly count from 1 to 10000, non-negative INR rates up to two decimals. Output: order quantity in the same UOM and parts subtotal in INR. quantityMilli = saved perAssemblyMilli × count; lineMinor = floor((quantityMilli × rateMinor + 500) / 1000); total = sum of lineMinor. Reuse domesticBomTotals, half-up per line to paise. Unknown values, fractional PCS/SET, zero/negative quantities and overflow are rejected; explicit zero price is allowed. Example: 10 assemblies × (one INR1000 frame + four INR12 bushes) = INR10480. No tax rate, freight amount or payment authorization is inferred.

## Local checks
264 native tests passed. Eight new PO cases cover authoritative BOM identity/quantities/photos, automatic references, authorization, immutable issuance/cancellation, invalid/stale input atomicity, quote matching, draft history and scoped read/write access. 32 PO browser checks passed in authenticated server and standalone review modes: Executive save/edit/reload → Manager issue → loaded photo document/PDF → cancellation/history; mobile widths 390/320 and no runtime errors. The printed document was visually inspected. Existing comparison coverage: 152 earlier local checks; final release regression recorded below.

All created suppliers/orders are isolated test fixtures. No test orders are to be copied to live. Fresh downloaded recovery ZIP, restored-copy startup, persistent storage, healthy Coolify deployment and read-only live preservation remain required before claiming publication.

Final local release checks: 264 native tests passed, followed by 17 focused reference/PO tests after lazy counter initialization. 184 browser checks passed on the final build: 32 PO, 104 assembly comparison, 48 existing comparison/history. Standard and Domestic review builds and Git whitespace checks passed.

**Publication verified, 2026-09-24:** runtime **7ed0898cc34fdd7e9ec97da7802f45e0d1c09112**, Coolify deployment **3xnrtzsjedqt7nbv6kgddydo** (finished; running:healthy). Assembly supplier-total comparison and BOM-based Domestic purchase orders with pictured PDF output are live. Executives prepare drafts; Managers/Admins issue and cancel. **264 native tests, 17 final focused checks, 184 local server/review browser checks and 22 read-only live checks passed.** Nine served runtime files match the tested commit. A fresh **464,909,914-byte recovery ZIP** passed download/hash, archive and isolated restored-copy startup verification; **5** verified managed ZIPs retained, none removed. Workspace revision **1528** and all business content remain unchanged; accounts, evidence bodies, audit records, archives and retry receipts match the backup exactly. Zero live business-write requests or runtime errors. No demonstration data was published. Supersedes candidate-only publication status for DEC-073/074 and WF-067/068. Domestic receipts, payments, stock/MRP and ERP transfer remain outside this release. Private evidence: test-output/domestic-po-release/; recovery ZIPs: backups/releases/.