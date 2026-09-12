# Changelog — v0.6.1-alpha.16

## Missing PLM warning bypass
- If a Base Item has no approved PLM revision, PO submission and issue now continue with the visible warning **PLM specification not available**.
- No override reason is required for this condition.
- No approved PLM status is fabricated.
- The bypass is logged in order audit history and stored in the immutable issued-PO snapshot.
- Where approved PLM revisions exist, the PO must still select one.
- Native tests: 93/93 passed; browser checks: 6/6 passed.


## 0.5.2-alpha.13 — TAT override field visibility correction
- Fixed the PO Commercial Terms & Planning form so **Supplier-agreed TAT override reason** appears only when the entered supplier production commitment differs from that vendor's standard production days.
- Returning the commitment days back to the vendor standard automatically hides the override reason field and clears its draft value.
- Vendor changes reset the production commitment to the selected vendor standard and clear stale override reasons.
- Domain validation remains strict: same-as-standard does not require a reason; true overrides require a reason.
- No business/demo transaction data added.

# Changelog — v0.5.2-alpha.13

## Added
- Vendor Master Library seeded from the final uploaded supplier code master.
- Vendor Serial + fixed supplier-code display and search.
- Vendor import history panel.
- Item-master upload readiness against the Vendor Master Library.

## Changed
- Shared master navigation renamed to Libraries.
- Vendor screen now shows full vendor reference, supplier name, fixed code, code-lock status and default commercial data.
- Existing full PLM rebuild and clean/no-demo-data posture retained.

## Not changed
- No demo orders, items, PLM products, price lists, shipments or documents are preloaded.
- Live VMS synchronization remains pending.


## v0.5.3-alpha.14 — Supplier commercial master correction
- Imported the user-updated supplier master workbook as the clean Vendor Master source.
- Added default payment method, default price-list currency, default billing currency and export/shipping port to supplier records.
- Payment terms now use the exact workbook terms and drive PO payment schedule calculation, including BL-date credit terms.
- Supplier production days are treated as reference days; future item-master production days can override the reference for PO deviation warnings.

## v0.6.1-alpha.16 — Final item master, ERP codes, complaint roll-up and freight benchmark
- Loaded the first `ITEM MASTER.xlsx` sheet as the authoritative **129-row Base Item Master**.
- Generated GJ / KD / TT ERP Item Codes under every Base Item Code using `PREFIX-BASECODE` format.
- PO entry now starts with Base Item Code and brand-wise quantities; only positive quantities expand to ERP Item Code PO lines.
- Filtered `PRICE LIST MASTER` against the final Base Item Master and retained CNY/USD prices at supplier + Base Item Code level.
- Kept Base Item technical PLM separate from ERP Item artwork/outlook/brand-specific details.
- Added after-sales complaint entry against ERP Item Code with Base Item Code roll-up and severity mix.
- Loaded 98 historical freight-rate rows from `WEEKLY BUY RATE.xlsx` and retained exact route/via distinctions.
- Added forwarding-agent charge automatically: USD 60 below USD 3,000 O/F; USD 120 from USD 3,000 upward.
- Booked-rate variance and freight trend now use final benchmark = O/F + agent charge.
- Added exact route masters for Ningbo, Qingdao, Shenzhen, and Chongqing via Ningbo/Nansha/Qinzhou/Shekou to Chennai.
- Native tests: 91/91 passed. Dedicated v0.6 browser flow: 5/5 passed.
