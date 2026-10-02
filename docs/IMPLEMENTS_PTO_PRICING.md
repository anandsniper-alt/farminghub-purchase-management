# Implements PTO pricing — DEC-105 / WF-099

User-confirmed 2026-10-02: one complete PTO shaft per machine, including Bananovator. Preserve exact supplied descriptions; actual IMP/Tally codes remain blank and flagged until supplied.

| Item | Quoted INR/pc | Transport | BOM/PO INR/pc | Allocation |
|---|---:|---:|---:|---|
| MJ TT-38 ftf -790 sbtl-1 3/8 z6 t3dc | 3723 | 5% | 3909.15 | All 184 non-Bananovator catalogue models |
| Racer PTO TT-35 850.6SB 16” | 5850 | 5% | 6142.50 | Three Bananovator models |
| Racer brand PTO - TT-38 o/locks 790mm | 3650 | 5% | 3832.50 | Item Master alternative |

MODULE-SPECIFIC RULE: quoted base price remains editable. Purchased items with explicit `transportInCost: true` use base plus transport, rounded to two decimals per piece, consistently in BOM cost, monthly MRP, supplier PO and sales costing. Existing imported transport percentages remain reference-only without this opt-in. GST remains separate; no GST rate was supplied for these PTOs. Fabrication continues to use combined machine weight times the common fabrication-plus-transport rate.

PO snapshots retain base, transport percentage/amount and effective rate. Later price edits do not rewrite saved orders. Priced PDFs explain the included transport; Excel adds a Price basis sheet. Copying a BOM retains the destination's PTO selection and quantity, preventing cross-series copies from replacing Bananovator's shaft.

The reviewed update adds three master items and two suppliers; replaces active generic pending PTO references; retains the old placeholder, original source flags and model history. Other parts, fabrication, charges, stock, plans and saved orders are preserved. Pending catalogue BOMs remain pending: adding their PTO does not certify completeness. Changes use existing authorized revision/CSRF/audit APIs, with private before/after records and a fresh verified recovery archive. No private state enters Git.

## Verification before publication

Twelve scoped native tests passed, including server rejection of tampered transport-price snapshots, immutable saved orders, quote arithmetic, multi-machine MRP, target PTO preservation on BOM copy, existing scope/CSRF/revision/recovery contracts, server startup and standalone build dependencies. The review build passed. Private candidate verification checked all 187 allocations, all prior item/supplier records and unrelated model/workspace fields. Isolated browser costing showed MJ INR3909.15 and Bananovator INR6142.50 with base-plus-5% explanations. A synthetic priced PO PDF was rendered and visually inspected; Excel values matched the same calculation. No synthetic plan/order is imported.

Fresh pre-release SQLite snapshot: 2026-10-02T02:17:40.014Z, matching running source `5dc831e30df691a8508abe399e8a5765879566ff`, main revision 1859 and Implements revision 2. Archive checksums/CRC, SQLite integrity/foreign keys and isolated startup passed; all nine tables were identical and five verified private archives retained.

UI-03/UI-05 and HIG semantic controls apply: reuse existing editable fields, tables, filters and pending flags; do not introduce another navigation system. The new rate column uses the existing horizontal table wrapper. Current/10x/100x computation remains linear in BOM/PO lines with three additional master records; no storage or deployment architecture change. Existing aggregate scaling limits remain.

Publication is recorded below after live verification.
