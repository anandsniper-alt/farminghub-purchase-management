# Changelog — v0.6.1-alpha.16

Published 2026-09-12: application commit **cc08c5d** is live at https://purchase.dvjassociates.com (healthy). Admin bulk deletion/restoration, non-reused serials and standard Manager/Product Manager approvals are deployed. All 19 live checks passed; verification made no live business or role changes. See docs/CURRENT_PRODUCT_BASELINE.md for publication evidence.

## Admin bulk deletion, stable serials and standard approvals - 2026-09-12

- Admins can select multiple POs and delete them from active operations, with explicit selected-order confirmation and a reason.
- Deleted orders retain history, payments, shipments and files; admins can restore them. Financial balances remain visible and unchanged.
- Added permanent automatic S.No., separate from existing PO numbers. Deleted serials are never reused and remaining POs are never renumbered.
- Legacy serial initialization creates a consistent backup before committing; audit and issued snapshots are preserved.
- Removed September Executive approval delegation and its notice. Purchase approvals use Manager/Admin; product/artwork approvals use Product Manager/Admin. Role editing remains available.
- Native tests and server/review/mobile browser workflows verified; DEC-016/017 and WF-015/016. Publication evidence follows deployment.

Role editing published 2026-09-12: application commit dd8656c is live at https://purchase.dvjassociates.com. Twelve live checks passed; no user role changed during verification.

## Administrator role editing - 2026-09-12

- Users & settings now provides Change role for other users, including Purchase Executive to Purchase Manager.
- Roles apply immediately to existing server sessions; credentials, scope assignments and order ownership remain unchanged.
- Administrator-only enforcement, reason/audit, stale-request rejection and self-demotion protection.
- Tested through isolated API and browser workflows, including standalone review and mobile. DEC-015 / WF-014. Not yet published.

Published 2026-09-12: application commit 64e6764 deployed successfully to https://purchase.dvjassociates.com; 11 live checks passed. This publishes the temporary executive approvals and multiple 50 MB uploads below.

## Temporary executive approval access - 2026-09-12

- Purchase Executives may perform purchase and Product Manager approvals within assigned scopes through 30 September 2026, 11:59 pm IST, including their own submissions.
- Access expires automatically at 1 October 2026 00:00 IST; completed approvals remain valid. Roles and unrelated manager/admin powers are unchanged.
- Server validates time, scope, readiness and identity; audit identifies the executive and temporary policy. Existing actions show the same access with a deadline notice.
- Native permission/expiry tests, a full Executive-only lifecycle, and server/standalone/mobile browser checks passed. DEC-014 / WF-013. Local source update; no deployment implied.

## Multiple attachments and 50 MB uploads — 2026-09-12

- Select multiple files for a supplier response, PI, artwork, payment proof, QC or document submission. Every file remains separately downloadable and linked to the same workflow record.
- Maximum file size is now 50 MB per file, enforced by browser and server. Existing allowed file types and permissions remain in place.
- The complete selection is validated before upload. Files upload sequentially with progress; retries reuse successful uploads and duplicate submissions are blocked.
- Existing single-file records remain compatible. Spreadsheet import sources also support 50 MB, with one source per preview/commit.
- Verification: 102 native tests pass, including the exact size boundary; browser checks cover multiple files, failure/retry, mobile and standalone review. DEC-013 / WF-012.

## User access portal — 2026-09-12

- Administrators can open **Users & settings → Create user** and enter name, unique email, password, existing role and division access.
- New accounts can sign in immediately. Administrator account metadata includes email and sign-in status; existing scope assignments remain available.
- Server enforces ADMIN permission, Origin/CSRF, supported fields, duplicate-email checks and optimistic revisions. Profile, hashed credentials and creation audit are saved atomically without exposing passwords.
- CLI provisioning remains available; standalone review cannot create sign-in accounts. No schema or business-calculation changes.
- Verification: 97 native tests pass; isolated browser creation/login, validation, mobile, permissions and standalone checks pass. Decision DEC-012; workflow WF-011.

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
