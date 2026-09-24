# Changelog — v0.6.1-alpha.16

## Unreleased — Assembly supplier total comparison (2026-09-24)
- Compare the same saved assembly across suppliers: full total, reference-supplier difference in INR/percent, photos, quantities and quote-by-quote breakdown.
- Missing quotes/quantities and unconfirmed compositions remain incomplete and cannot win the lowest-total comparison. No saved BOM or supplier data changes.
- Verified: 256 native tests and 152 server/review browser checks. DEC-073 / WF-067; not deployed.

## Unreleased — Domestic inline removal and manual prices (2026-09-24)
- Remove selected BOM items directly from their pictured list rows, preserving other draft entries. DEC-069 / WF-063.
- Enter supplier prices manually with photos, names, item codes and Used in BOM; review/edit/save with immutable quotation evidence. Keep template upload/download and existing BOM costs. DEC-070 / WF-064.
- Verified locally: 17 native tests, 94 picker and 49 manual-price browser checks. Not deployed.

## Unreleased — Domestic BOM picture list (2026-09-24)
- Click source pictures/item names to add BOM components; search by code/name/segment and see Added markers.
- Edit quantities and prices after adding, preserving unsaved entries and cleared supplier-quote selections across row changes.
- Keep the original six-column BOM layout and existing assembly rollups/history. 16 native and 66 local browser checks passed. DEC-068 / WF-062.
- Future live releases require a downloaded verified recovery ZIP; retain five newest verified managed copies. DEC-067 / WF-061. No new deployment or backup download performed in this update.


## Unreleased — Supplier PI in Order pipeline (2026-09-21)

- Show the current Supplier PI number and PI date directly in each pipeline row; show Awaiting PI when missing.
- Search orders by Supplier PI number and include the PI number/date in pipeline CSV exports.
- Show the same Supplier PI reference on board cards. DEC-061 / WF-055. Local candidate; 58 focused server/review browser checks passed.

Published 2026-09-21: runtime `364866ca6b9878b8dffa75b14f2a67d4fcbefb10`, deployment `zx4csoitx8proml4nxodw0cg` finished and the application is healthy. Eighteen live read-only checks passed; backup/restored-copy and data-preservation checks passed with one concurrent audited user price-list addition retained. See SUPPLIER_PI_PIPELINE_RELEASE_REPORT.md.

Published 2026-09-12: payment-reference application commit **8c2e303df7765430fb247ee57c56cd9f0ad3c331** is live at https://purchase.dvjassociates.com. Coolify deployment **4n8iiclyxsmdrk1n8ctn4zct** finished; health HTTP 200. Nineteen signed-in live checks passed, including Indian-bank label, optional BOC column/field, mobile modal heading and persistent guide. All three changed runtime assets match the committed build. Business-record, user and approval-control hashes/revision match the pre-release baseline; no live payment or receipt was created. Evidence: ignored test-output/payment-rates-live-report.json and payment-rates-live-mobile.png. DEC-027/028 and WF-021/022 are now published; this supersedes their earlier local-only release notes.

## Payment reference release prepared - 2026-09-12

Rebuilt DEC-027 payment labels and optional BOC reference; corrected mobile form-heading overlap and reserved notification space above the mascot (DEC-028 / WF-022). Publication verification follows deployment.

## Unreleased - payment rate labels and BOC reference (2026-09-12)

- Plain currency-pair Indian-bank and supplier labels, including USD to INR (Indian bank).
- Optional USD to RMB (BOC) reference on remittances/initial payments and supplier receipts, with table columns and audited receipt overrides.
- Reference-only: actual receipts and all conversion/settlement calculations remain unchanged. DEC-027 / WF-021. Local build only.

Published 2026-09-12: application commit **b9d76e0e5a5017465994ce9c0c631018fc3b504b** is live at https://purchase.dvjassociates.com. Coolify deployment **wco6vztxn3hp1ptmhqgnslsy** finished; health HTTP 200. Fifteen signed-in live checks passed for Minimal/Current, Show page guides, mascot steps, Vendor master, mobile layout and no business writes/runtime errors. Eleven published module/style/pose assets match the local committed build. Hashes of orders, payments, files, events, users, vendors, items, bases, costs and approval controls, plus workspace revision, match the pre-release baseline. No business records, roles or approval controls changed. Evidence: ignored test-output/presentation-live-report.json and presentation-live-mobile.png. DEC-026 / WF-020; this supersedes earlier unpublished/local-only status notes for the adopted theme and DEC-025 fixes.

## Release prepared - Minimal theme and guide (2026-09-12)

- Publish reviewed Minimal presentation, subtle motion and reduced-motion support; retain Current theme choice and visible Show page guides.
- Persistent Farming Hub mascot provides authored page/form/next-action instructions without AI/API; Take me there focuses only.
- Include unreleased consistency fixes below. Production authentication, records and approval settings retained. DEC-026 / WF-020. Deployment confirmation follows verification.


## Unreleased - consistency fixes (2026-09-12)

- Restore every PO stage in Board and consistent Overview counts; fix populated Vendor master browser startup.
- Enforce division projections, tracking ownership, master target scope, pending item approvals and normalized vendor identity.
- Reuse server production-reference calculations in draft hints; preserve typed inputs during hint updates.
- Add retryable workspace startup errors and scrollable short-screen navigation.
- Rebuild local review and minimal/animation/mascot preview; retain Show page guides in Minimal. Not published. DEC-025 / WF-019.

Published 2026-09-12: pipeline sorting commit **db6978c** is live and healthy. Added the user-requested one-time batch TEST-SORT-001 through TEST-SORT-010 as unapproved drafts across ten suppliers. Sixteen live browser and eight batch checks passed; pre-existing business records and permissions retained.

## Supplier and serial sorting - 2026-09-12 (local source)

- PO pipeline supports exact supplier filtering and ascending/descending supplier, S.No. and PO-number sorting from headers or dropdown.
- Global sorting precedes pagination; board and full CSV export follow the same filter/order. Supplier names now accompany codes and are appended to CSV.
- Original order default and Reset view; filter/sort changes clear bulk selections. Permanent serial numbers and all stored PO data remain unchanged.
- 52 sorting and 31 bulk browser checks passed in server/review modes, plus native startup/build checks. DEC-019 / WF-018. Not yet published.


Published 2026-09-12: approval controls commit **36a0198** is live at https://purchase.dvjassociates.com (healthy). All 15 live checks passed. No live permission changes were saved during verification.

## Configurable approval controls - 2026-09-12 (local source)

- Admin can maintain all 13 approval stages in Users & settings, select allowed roles, save with reason/confirmation and restore standard roles later.
- Changes are server-enforced immediately for subsequent requests; Admin remains enabled, Viewer excluded, scope/evidence/financial rules and completed approvals preserved.
- Sample and initial-payment authorization shortcuts also obey their dedicated controls; technical approval/rejection can be assigned independently.
- Audit history records previous/new roles and approver control revisions. No automatic expiry, live policy change or publication yet. DEC-018 / WF-017.


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


## Unreleased — pre-soft-launch QA repairs (2026-09-12)

- Correct misleading current-stage and Unassigned follow-up displays.
- Prioritize required active-shipment steps and explain missing logistics setup.
- Restore reachable ERP item creation, store explicit base/brand mapping and preserve pending approvals; align PLM readiness copy with the missing-specification warning rule.
- Reject negative/malformed freight cells and correctly parse grouped USD amounts without changing fee/variance formulas or historical records.
- Add targeted native/review regressions and a 338-scenario QA catalogue; live Ashok test data remains active. Release and execution limits are documented separately.


QA follow-up: prevent silently omitted quantities for missing ERP brand mappings; show issued missing-PLM data as an amber historical warning; retain selected commitment cause in audit. Live validation includes ten completed retained POs and three synthetic complaints. No bad freight import was committed.


QA closeout evidence: twelve retained live test POs (ten complete, two open for user continuation); combined remittance allocation, duplicate-reference rejection and original-order excess/correction verified as Ashok. See QA_EXECUTION_REPORT.md for scope and release blockers. This entry does not record a deployment.


Continued soft-launch QA: preserve the fixed mascot while reserving page-bottom space so it cannot block pagination (BUG-009). Eight focused server/review browser checks pass in Current/Minimal at desktop/mobile. Logged separate Admin/configured-approver and missing-feature dependencies in QA_ACCESS_BLOCKERS.md. No deployment performed.


Soft-launch QA import fixes (local): display tracking rejection reasons; reject duplicate keys and empty normalized batches; clear stale previews on replacement failure while retaining date/week. Five targeted native and 26 server/review browser checks passed. Live deployment/retest pending.


Soft-launch QA: preserve full recorded Indian-bank rate precision in the remittance register (BUG-013);33 focused server/review payment checks pass. Import lifecycle regression expanded to38 checks including delayed/stale reads; native suite131 passed. No live publication performed.


## Local changes — Independent Purchase Manager workflow (2026-09-13)

- Add a reviewable Admin preset covering all 13 Manager approval stages and a read-only role access table; retain later per-stage changes and existing non-Manager grants.
- Expose item upload and mapping; add atomic vendor/price imports using existing save rules, templates, validation reports and protected source history.
- Show vendor change actors and before/after values; reject ambiguous supplier shorthand and foreign-division item imports.
- Add quote-evidence freight benchmark entry from booking and return to booking; preserve agent charge and all readiness checks.
- Verify native/review setup and complete Manager-only workflows. Includes the earlier local QA fixes; live deployment and Admin policy activation pending.


## Published — 2026-09-13

Released f5d5514 to the existing Coolify website. Bug fixes and Manager setup/import/recovery controls are live. Activated every Manager approval stage through the audited Admin form; verified Ashok/Suresh active scoped Manager profiles. Eleven runtime assets, healthy service, preserved 29 orders / 15 QA orders and one policy audit event verified. No data cleanup or profile changes.

## Local update - mascot corner movement (2026-09-13)

- Guide me can be dragged left/right and snaps to a bottom corner; the browser remembers the choice.
- Focus the launcher and use Left/Right arrows for keyboard positioning. Vertical movement is disabled; existing guidance and branding remain.
- Rebuilt the standalone review and extended mascot/pagination browser regression coverage. Publication is not included in this local update.

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.

## Local update - visible order timeline (2026-09-13)

- Minimal opens the order timeline by default, including after reload or Show/Hide page guides.
- Corrected narrow Minimal order-panel overflow; stage logic and branding unchanged.
- Standalone review rebuilt. Not yet published.

**DEC-032 / WF-026 publication, 2026-09-13:** Runtime a5a9b24 is live at https://purchase.dvjassociates.com; deployment 3ontnhztuhusfj6ei7ltqodd finished successfully. The order timeline opens expanded in Minimal, survives guide toggles/reload and fits the checked 390/320px layouts. Eleven served assets match the release commit and health returns 200. All 29 POs / 15 QA orders, checked business collections and approval controls are unchanged at revision 904. This supersedes the earlier local-only publication status for the timeline update.


## 2026-09-13 — Supplier PO worksheet release

- Search supplier items and add them to compact quantity/rate/amount rows in PO create/edit.
- Native Tab, numeric Enter and vertical navigation; live totals; expandable commercial and technical details.
- Retain production calculations, authorization and data schema; keep broader audit trial separate.
- Verified 135 native tests, 37 worksheet checks and three complete configured Manager workflows (55 checks).


## 2026-09-13 — USD/RMB purchase price correction (local)

- Require a dated USD-to-RMB quote when list and invoice currencies differ; divide RMB lists into USD unit prices.
- Retain source currency/price, quote and converted reference; preserve manual overrides and issued snapshots.
- Restore and recalculate matched draft prices; block missing/invalid FX through shared rules and existing API commands.
- Preserve same-currency entry and separate bank remittance/reference rates. Not published.


## Unreleased — native VMS module

- Added Vendor Management (VMS) with shared Purchase login/vendor identity, multiple contacts, sourcing catalogues/expos, ratings, samples, interactions, follow-ups, private files, coverage and CSV views.
- Kept primary contact/location edits synchronized with Vendor master; existing PO/financial/approval behavior and issued history retained.
- Added server/domain and desktop/mobile server/review tests, source capability mapping and persistent memory. Local feature only; no live deployment or historical external VMS migration.


## VMS live publication — 2026-09-13

The user explicitly requested publication of the reviewed VMS integration. Runtime **6a2a366afb01aef313c1aeed366d8eff7b1edcdb** is live at https://purchase.dvjassociates.com/#/vms through Coolify deployment **cjiv0ehnqmoajlkidfy84gfb** (finished; running:healthy). This publishes DEC-044 / WF-039 and supersedes their local-only status. Existing domain, port, single application instance, environment and /app/data persistent volume retained; no historical VMS import, role rewrite or startup CRM seed. Broader audit-trial changes remain separate.

**36 live checks passed**, covering committed app/VMS/domain/styles/guide assets, health, existing login, all VMS tabs, legacy supplier profile, creation/evaluation/sample/interaction/document forms opened and cancelled, multiple-file input, linked purchase history, Current/Minimal/mobile, mascot guidance, existing vendor master and PO pipeline. Zero browser runtime errors or business-write requests. All 32 saved state sections match the fresh predeployment fingerprint: **30 orders, revision 961**, including vendors, users, files, events, payments and approval controls. Isolated release validation already passed 156 native tests and 41 browser checks.

Use **Libraries → Vendor Management (VMS)** with the existing Purchase login. Core CRM is live; source-only historical data and unported offline/voice/PWA/export/geography tools remain outside this release as documented in VMS_MODULE.md. Private verification files remain ignored under test-output.


## Unreleased — standard Minimal theme and personal page guides

- Removed Current theme and the top appearance/page-guide toolbar, including reserved header space.
- Added Users & settings → My preferences → Show page guides, saved only for the signed-in account and restored across sessions/browsers.
- Kept mascot, expanded order timeline, animations/reduced motion, warning/error visibility and business permissions unchanged. This feature is local and has not been published.


## Unreleased — VMS missing-module restoration (2026-09-13)

DEC-046 / WF-041 restores twelve named VMS screens, durable module routes, grouped analytics/drill-down, dedicated expos/products/components, supporting location/classification/currency settings and shared Users & Roles. Adds an account-owned profile/text-interaction outbox with automatic non-conflicting sync, explicit conflict review, duplicate-safe retries and browser installation/reconnect screens. Minimal and personal guides preserved. 169 native tests and 92 browser checks passed; no live data changed or deployment performed. Complete feature boundaries: docs/VMS_PARITY_REPORT.md.


## VMS working-model audit — 2026-09-13

DEC-047: audited the restored candidate without changing runtime code or live data. Reran 169 native/92 browser checks and added 23 practical visit scenarios. Recorded 15 consolidated findings (five high-priority), a proposed minimal visit/follow-up flow and acceptance tests in docs/VMS_WORKFLOW_AUDIT.md. Audit runner and case ledger committed; fixes remain pending.


## Local - Cleaner module layout (2026-09-13)
- Added Order Management and Vendor Management System entry cards and contextual sidebars.
- Grouped existing purchase tools under LAE Import; LAE Domestic, Utility Division and Implements Division are clearly Pending development.
- Reduced redundant header controls; preserved deep links, Minimal, per-login guides and mascot.
- Verified 76 layout + 39 core VMS + 53 parity browser checks. Unpublished; pending VMS audit workflow repairs are outside this navigation change.


### Local sidebar spacing fix - 2026-09-13
Prevent expanded master navigation overlapping the bottom menu; retain section height and scroll the sidebar on short screens. Five viewport checks and 76 layout regression checks passed.


### Local - Remove duplicate division shortcut
Removed All divisions from the LAE Import sidebar; Order Management already opens division selection (DEC-049 / WF-043).


### Local - Bottom module dropdown
Replaced top module buttons with a bottom Modules selector. Choose Order Management to switch divisions, or Vendor Management System for vendor tools. Logo returns home.


### Live data reset - 2026-09-13
Cleared operational POs/payments/complaints and confirmed QA-only creations after a full backup and restored-copy drill. Genuine masters/accounts/approval settings preserved. Next PO serial remains 31. Original records/evidence/audit archived; no application code deployed. See docs/SOFT_LAUNCH_RESET_REPORT.md.


### Live - Restart fresh-launch PO numbering at 1
Applied the user's one-time counter reset to the empty live workspace. Backup and audit retained; all other data unchanged. DEC-052 / WF-046 supersede the earlier next-serial-31 reset result.


## Local candidate - Permanent references and ERP/Tally preparation (2026-09-13)
Added typed permanent software references, backed-up registry initialization, scoped reference register, Admin company-specific ERP/Tally links and common read-only JSON export. Existing business codes, display serials, calculations and issued snapshots preserved. Tally is accounting base; no connector/posting or live deployment. DEC-053 / WF-047; verification in docs/ERP_REFERENCE_TEST_REPORT.md.


### Local reference format refinement
LAE Import POs now allocate FH-LAE-I-PO-1 style references. All new reference suffixes omit zero padding; existing assignments and mappings remain permanent. DEC-054 / WF-048.


## Local ERP/order safeguards - 2026-09-13
Added historical PO and supplier-specific PI/invoice duplicate checks, conditional invoice number/date fields, stricter reference validation, PI/evidence identities, durable command/upload retry receipts, searchable/printed PO references and practical next-step guidance. Initial INR-to-INR payment rate now consistently requires 1. Existing permissions, issued snapshots and financial formulas preserved. No live deployment. Capacity probing exposed an open whole-workspace storage bottleneck; see docs/ERP_ORDER_SAFEGUARDS_REPORT.md (DEC-055 / WF-049).

### Automatic PO numbers - local candidate, 2026-09-13
- New PO numbers equal their permanent reference; manual numbering removed from PO entry and draft edits. Supplier PI numbers remain manual.
- Preserve legacy saved numbers and issued snapshots, skip historical collisions, retain deletion reservations, and stop on missing/mismatched automatic identity.
- Updated DEC-056/WF-050 and native/browser coverage. Not deployed.

### Published module and reference release - 2026-09-13
Runtime 519f9fe is live: Minimal personal settings, expanded VMS, cleaner module navigation, ERP reference register, workflow/retry safeguards and automatic PO numbers. Full backup/migration rehearsal, 196 native tests and 39 live checks passed. All genuine masters and zero-order soft-launch state retained; first new PO is FH-LAE-I-PO-1. See docs/RELEASE_2026-09-13_REFERENCE_MODULES.md for scope and remaining audit boundaries.

## 2026-09-17 — Final arrival costing
- Added invoice-wise Bill of Entry evidence and actual INR cost workings after port arrival, with before-GST cost per USD and product costs.
- Added provisional/final states, controlled corrections/history, shared BOE allocation bounds, configurable Manager approvals and permanent LC references.
- Preserved existing PO, payment and master data; see docs/ARRIVAL_COSTING.md and release report for limits and verification.

## 2026-09-17 — Process-exemption trial (not live)
- Added Manager/Admin action-limited exemptions, visible pending work, later actual completion, revocation and history.
- Added all-stage process explanations and clickable timeline; payment-only exceptions do not authorize production or dispatch.
- Operational stage extent awaiting clarification; financial/identity/evidence safeguards retained. See docs/PROCESS_EXEMPTIONS.md.

### Confirmed restriction — DEC-059
Exemptions stop before pre-production/sample QC. Removed all sample, bulk QC, production and shipment bypass options from the trial. Later gates remain mandatory; all 25 stages can still be opened for viewing. This resolves the earlier scope question. Local build only.


### Process exemptions published — 2026-09-17
DEC-058/059 and WF-052/053 are live in runtime ec0863ffa49450cc8a36f63e03fb9611c849a107 through Coolify deployment phgvkrkb9eliy749fqpjvhes (finished, running:healthy). This supersedes local-only publication status; only the confirmed pre-QC catalogue was deployed. Manager/Admin early exceptions retain pending work and history. Sample QC and every later stage remain mandatory. Backup/restored-copy rehearsal passed; 58 live checks passed with zero runtime errors or business-write requests. Existing records are preserved; EXM counter initialization alone moved revision 1008 to 1009. See PROCESS_EXEMPTIONS_RELEASE_REPORT.md.


## Concurrent work release candidate — 2026-09-21
- Permit independent order/supplier/personal-setting saves from simultaneous views while preserving current authorization and transaction checks.
- Retain typed entries and selected files when an overlapping save needs review; explicit confirmation and Save required, with no automatic resubmission.
- Refresh idle views without replacing open forms. Preserve unique PO references, retry receipts and audit history.
- DEC-060 / WF-054; 225 native tests, 16 concurrent browser checks and 68 full-workflow checks passed. Deployment verification follows.


## Concurrent access published — 2026-09-21
DEC-060 / WF-054 is live at https://purchase.dvjassociates.com in runtime **6578f18501f135c70000c54390da253db291ddca**, Coolify deployment **veyiohrvuqauviaswztf9eyk** (finished; running:healthy). This supersedes the preceding candidate/publication-pending status. Independent order/vendor/personal-setting saves and retained-entry conflict review are published; same-record/shared-dependency conflicts still require explicit review. Refresh open browsers once to load the new client.

225 native tests, 16 two-user/server/review browser checks and three complete Manager workflows (68 checks) passed. Fresh consistent SQLite backup **399114240 bytes** passed integrity and candidate startup on an isolated server-side restored copy. All saved state and protected account/evidence/audit/archive/retry tables matched exactly. The initial network download timed out; no partial download was used as recovery evidence.

**66 live checks passed**, including committed assets, two independent live sessions, authenticated revision endpoint, existing module/workflow navigation and mobile layout. Zero browser runtime errors or business-write requests. Post-deployment SQLite verification preserved all 20 original orders, existing master records, attachments, accounts, archive rows, audit history and retry receipts. Live work progressed from revision 1326 to 1335: 1 new order and 2 new files were reconciled to 10 user audit events. The live order count was 21; no rollback or migration was performed. Unchanged masters: 37 vendors, 388 items and 106 price lists. Existing domain, port 8000, single instance and persistent /app/data retained. No migration or reference reset. Private reports/backups remain outside Git in ignored operator storage and the application data volume.

## Expired-session form recovery — 2026-09-21
- Keep open form fields and selected attachments when the login or request token expires.
- Require the same account to sign in inline, then review and press Save again; never submit automatically.
- Preserve the original conflict context and all existing permissions, validation, calculations and audit controls.
- DEC-062 / WF-056; 225 native tests and 23 concurrent/session browser checks passed. Live publication verification follows.

### Published
Runtime `6efbf29813a59ba372fd5755d014692a41713209` is live through Coolify deployment `matuydmgjm7fvtjyv71mv3va` (finished; running:healthy). A fresh backup and restored-copy rehearsal passed. Fifteen read-only live checks and final preservation passed with revision 1355 unchanged and no business-write requests. See `docs/SESSION_RECOVERY_RELEASE_REPORT.md`.

## Controlled Item Master identity correction — 2026-09-21
- Add **Edit item master** to PLM brand variants and expose editable ERP Item Code and configured Brand / brand code fields.
- Permit Manager/Admin code or brand correction only with a reason; block duplicate code/mapping and used-item Base Item/supplier reassignment.
- Keep permanent software references and issued PO, complaint and audit snapshots unchanged; current/new work uses the corrected master.
- DEC-063 / WF-057; focused native tests and 39 server/standalone browser checks passed. Not yet published.

### Published
Runtime `d11918f147a236e85c5f010e5373d923ecc0c03d` is live through Coolify deployment `biiv5slzzxdju89x2dugfdov` (finished; running:healthy). A fresh backup/restored-copy rehearsal, 16 read-only live checks and final preservation passed at unchanged revision 1372. The observed `PW8RG` Item Master record and issued PO-23 snapshot were not modified by verification. See `docs/ITEM_MASTER_CORRECTION_RELEASE_REPORT.md`.


## Unreleased — LAE Domestic workbook and reusable BOM trial (2026-09-24)
- Add workbook-format component Item Master with source pictures and permanent item references.
- Add four photographed machine models and separate, reusable CS1/CS2 can-set BOMs.
- Preserve model-specific parts, missing-price/quantity states, integer INR rollups, immutable saved set revisions and reasoned BOM history.
- Keep work isolated in a local trial; no production import or release.


## Unreleased — Major BOM and assembly parts (2026-09-24)
- Clarify assembly parts as the machine's build components, not replacement spares.
- Extend can-set BOMs to frame, motor/pump, engine and other assemblies.
- Add saved assembly-parts drill-down with pictures from the machine Major BOM.
- Preserve shared CS1/CS2, costing, scope, references and revision history; local trial only.


## LAE Domestic BOM and supplier price-list candidate — 2026-09-24
- Add model Major BOMs and reusable Assembly parts BOMs, original workbook pictures, four model photographs and immutable cost revisions.
- Download a price template with current Domestic item codes/descriptions/units; upload and review supplier INR prices before GST.
- Compare supplier quotations and explicitly select a quote when revising a BOM. Preserve earlier quotations and saved BOM costs.
- Add Domestic suppliers to the shared master, preserving existing vendor scopes when edited.
- DEC-064–066 / WF-058–060. Publication verification recorded separately; no test prices or suppliers are intended for live seeding.


## Domestic BOM and price lists published — 2026-09-24
DEC-064–066 / WF-058–060 are live at https://purchase.dvjassociates.com in runtime **803bf34346735f781f1008c5d9000777ce50ded1**, deployment **dihpggiuw45cg7swfijdky31** (finished, running:healthy). This supersedes the prior local-only/candidate status. **241 native tests, 52 local browser checks and 39 live read-only checks passed.** A fresh consistent 507,609,088-byte SQLite backup and restored-copy candidate rehearsal passed. Original orders, payments, masters, accounts, evidence, audit, references and serials were preserved; only reference setup and the approved source catalogue were added. No test supplier or price data was seeded. Both active Managers already had Domestic access; no scope change was needed. Assembly contents/quantities and supplier rates remain for the user to enter. See DOMESTIC_RELEASE_REPORT.md and DOMESTIC_PRICE_LIST_GUIDE.md.


**Publication verified, 2026-09-24:** runtime **9f7c3c804518dfed6db954bebdb7fa0cd2eeea58**, Coolify deployment **iqbhj3adw7rti1f0eyof60tk** (finished; running:healthy). **241 native tests, 66 local server/review browser checks and 42 live checks passed.** The picture/name click-to-add BOM editor is live. A fresh **464,872,834-byte recovery ZIP** was downloaded/packaged and checked against the server snapshot; isolated restored-copy candidate startup preserved all data. The archive includes the complete database/evidence and matching previous running source. Five-copy retention applied: 1 verified ZIP currently retained, 0 older ZIPs removed. Live business workspace is unchanged at revision **1513**; all accounts, uploaded bodies, audit rows, archives and retry receipts match the pre-release snapshot. Browser verification made **zero business-write requests**. This supersedes DEC-068 / WF-062's local-only status. Private evidence remains under test-output/bom-picker-release/ and backups/releases/.


**Publication verified, 2026-09-24:** runtime **8f24c088b8fa25c7d098ccc39aed69d8f9f7b255**, Coolify deployment **nhhrvupva9q8qyiyq7zeusxn** (finished; running:healthy). Manual supplier prices with photos/item codes/Used in BOM and same-row BOM Remove are live. **242 native tests, 143 local server/review browser checks and 56 read-only live checks passed.** A fresh **464,874,649-byte recovery ZIP** was downloaded and verified, including the complete database/evidence and matching previous running source. Extracted-database integrity and isolated candidate startup preserved all data. Retention: 2 verified managed ZIPs, 0 older ZIPs removed. Live workspace remains at revision **1513**; accounts, evidence bodies, audit records, archives and retry receipts match the pre-release snapshot. No live business-write requests were made. This supersedes local-only status for DEC-069/070 and WF-063/064. Private evidence: test-output/manual-entry-release/; recovery archives remain outside Git in backups/releases/.


## 2026-09-24 — Domestic price comparison candidate
- Added Compare prices with supplier columns and one supplier's old/new quotation comparison, photo/item/BOM identification, search, rate changes and lowest comparable prices.
- Preserved quote history, partial-list rules, zero/missing distinctions, units, saved BOM costs and existing access. No business mutations from comparison.
- Five new native cases and 48 local browser checks passed; full native release regression: 247 passed. Publication evidence follows after backup and live verification.


**Publication verified, 2026-09-24:** runtime **ef945cc01a51099f3c27e13a61122ff3e6be862f**, Coolify deployment **k11t2xx3yzvakh3vpjkc20xa** (finished; running:healthy). Domestic Price lists → Compare prices is live, with supplier comparison and same-supplier old/new quotations. **247 native tests, 97 local server/review browser checks and 61 read-only live checks passed.** A fresh **464,877,213-byte recovery ZIP** was downloaded and verified with full database/evidence, matching prior source, archive/member hashes and isolated restored-copy startup. Retention: 3 verified managed ZIPs, 0 older ZIPs removed. Workspace revision **1513**, accounts, evidence bodies, audit records, archives and retry receipts match the pre-release snapshot. No live business-write requests were made. Supersedes candidate publication status for DEC-071 / WF-065. Private evidence: test-output/price-comparison-release/; recovery ZIPs: backups/releases/.


## Frame BOM entry and save feedback — 2026-09-24
- New assemblies open directly into their parts editor after reference assignment.
- Missing reasons and invalid quantities/prices have persistent, field-specific feedback beside Save; pending costs remain savable Drafts.
- 247 native tests and 328 local browser checks passed. DEC-072 / WF-066. Release status recorded in DOMESTIC_FRAME_SAVE_REPORT.md.


**Publication verified, 2026-09-24:** runtime **45b19d41f38ce9672f36ae3531dc261686941baa**, Coolify deployment **fvlltkmx31apzhb0h9pvlste** (finished; running:healthy). Frame assembly creation opens the parts editor; BOM save errors now have persistent, field-specific guidance beside Save. **247 native tests, 328 local server/review browser checks and 87 read-only live checks passed.** The live check exercised missing-reason recovery for all four frames and mobile 390/320px layouts without submitting business mutations. A fresh **464,883,507-byte recovery ZIP** passed download hashes, archive verification and isolated restore/startup checks. **4** verified managed backups retained; 0 older copies removed. Complete workspace revision **1516**, accounts, evidence, audit, archives and retry receipts match the pre-release snapshot. Supersedes candidate status for DEC-072 / WF-066. Private evidence: test-output/frame-save-release/.


## Domestic assembly purchase orders — 2026-09-24 candidate
- Executives prepare pictured BOM-based drafts; Managers/Admins approve and issue with immutable order content.
- Automatic Domestic PO references, supplier terms, selected parts, reasoned changes, print/PDF and retained cancellation.
- Includes assembly supplier-total comparison. Live verification pending; DEC-074 / WF-068.
