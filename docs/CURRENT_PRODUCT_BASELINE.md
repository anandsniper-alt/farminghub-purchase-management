# Current product baseline

Published 2026-09-12: payment-reference application commit **8c2e303df7765430fb247ee57c56cd9f0ad3c331** is live at https://purchase.dvjassociates.com. Coolify deployment **4n8iiclyxsmdrk1n8ctn4zct** finished; health HTTP 200. Nineteen signed-in live checks passed, including Indian-bank label, optional BOC column/field, mobile modal heading and persistent guide. All three changed runtime assets match the committed build. Business-record, user and approval-control hashes/revision match the pre-release baseline; no live payment or receipt was created. Evidence: ignored test-output/payment-rates-live-report.json and payment-rates-live-mobile.png. DEC-027/028 and WF-021/022 are now published; this supersedes their earlier local-only release notes.

Published 2026-09-12: application commit **b9d76e0e5a5017465994ce9c0c631018fc3b504b** is live at https://purchase.dvjassociates.com. Coolify deployment **wco6vztxn3hp1ptmhqgnslsy** finished; health HTTP 200. Fifteen signed-in live checks passed for Minimal/Current, Show page guides, mascot steps, Vendor master, mobile layout and no business writes/runtime errors. Eleven published module/style/pose assets match the local committed build. Hashes of orders, payments, files, events, users, vendors, items, bases, costs and approval controls, plus workspace revision, match the pre-release baseline. No business records, roles or approval controls changed. Evidence: ignored test-output/presentation-live-report.json and presentation-live-mobile.png. DEC-026 / WF-020; this supersedes earlier unpublished/local-only status notes for the adopted theme and DEC-025 fixes.

## Current approved presentation - DEC-026 / WF-020 (2026-09-12)

The user's publication request approves production adoption of the reviewed Minimal theme, animations and persistent Farming Hub mascot guide. This supersedes earlier local-only/adoption-pending notes below for this presentation. Runtime files live in web/; the prototype remains historical test material. Default Minimal, retain Current choice and Show/Hide page guides in the fixed appearance toolbar. Keep colors/fonts/logo and reduced-motion support. Help is authored, never an AI chat, and Take me there only focuses the existing control. Live identity/data/approval logic remain authoritative; do not deploy the sample seed or test-only replay controls.


## Experimental minimal theme preview - 2026-09-12

User requested a sample theme with smoother transitions and less visible text, to test and either discard or later integrate. **Experiment built; final theme is PROPOSED, not approved or live.** See [prototype instructions](../prototypes/minimal-theme/README.md), DEC-020 and the current browser report. Production application source and normal generated build remain unchanged.

Local preview: http://127.0.0.1:8137/#/orders. Current/Minimal comparison uses the same isolated illustrative records, with optional page guides, expandable timeline/additional actions, lighter visual hierarchy and 280ms page/240ms dialog transitions, 220ms disclosure reveals and a Replay animation control. Reduced motion is respected; financial/approval/readiness logic and safety disclosures remain. The prototype can be discarded without production rollback.


## Pipeline sorting live publication and requested test batch - 2026-09-12

Application commit **db6978cc249c7d8b039c34cdbceee4bedc7daea0** is live at https://purchase.dvjassociates.com through Coolify deployment **6fwkw5g3hzfiqxrq1bqry7me** (finished; application running:healthy). This publishes DEC-019 / WF-018 / UX-12. Earlier local-only statements for sorting are superseded by this record. Existing domain, runtime configuration and persistent volume retained.

The user explicitly requested ten test records across many suppliers on the published build. Created **TEST-SORT-001 through TEST-SORT-010** through authenticated Admin CREATE_ORDER commands in the live pipeline, across ten existing eligible supplier records. All are clearly labelled synthetic TEST DRAFTS, with varied quantities/prices, unsubmitted/unapproved and no PI, payment authorization, shipments or documents. The batch uses ordinary automatic serial allocation; deleting these drafts later will leave their serials unused under B-18. Test drafts are owned by the creating administrator and remain editable by scoped Purchase Managers.

This was an explicit one-time data action, not automatic build/startup seeding. The private local provisioning runner checks batch-number/notes identity, prevalidates draft payloads through the domain, uses current optimistic revisions and avoids duplicates on retry. Normal clean initialization remains unchanged; no private database or test artifact is included in the image/Git.

**8 batch verification checks passed:** exactly ten identified drafts/ten suppliers; no approvals/operations; distinct automatic serials; pre-existing order records unchanged; payments/users/approval controls unchanged; original audit prefix retained; new creations auditable. **16 live browser checks passed:** HTTPS/source match, controls, all ten visible through TEST-SORT- search, numeric serial ascending/descending, alphabetical supplier sorting, exact supplier and stage filtering, mobile fit, reset, no browser-write requests or runtime errors. Browser verification was read-only after the separately authorized creation batch; administrator logged out.

Release tests: 52 sorting browser checks, 31 bulk regression checks, native startup test and review build passed. Ignored artifacts: test-output/live-pipeline-test-batch-report.json and test-output/pipeline-sort-live-report.json. Screenshot: D:/CodexTestTemp/FarmingHub/pipeline-sort-live-test-orders.png. To find the live batch, search TEST-SORT- in Order pipeline.


## PO pipeline sorting source update - 2026-09-12

DEC-019 / WF-018 adds exact supplier filtering, clickable ascending/descending S.No./Purchase order/Supplier headers, matching Sort orders dropdown and Reset view. Supplier names accompany codes; search includes codes. Sorting applies before pagination and carries through board lanes and full filtered CSV export; Supplier name is appended to CSV. Original ordering remains default. All records/serials/permissions are preserved; selection clears on filter/sort changes.

52 server/review sorting checks, 31 bulk regression checks, native startup and review build passed. This is local source, not yet published. No live orders or approval settings changed.


## Approval controls live publication - 2026-09-12

Application commit **36a0198304ec3c1f723f9fcb4aabe0376b2018f8** deployed to https://purchase.dvjassociates.com through Coolify deployment **evhfg1nzclwtzvfdlfsedofd** (finished; application running:healthy). This publishes DEC-018 / WF-017 / B-20. Earlier local-source/unpublished notes for these controls are superseded by this publication record. Domain, runtime configuration and persistent data volume retained; no schema migration or live role/policy rewrite.

**15 live checks passed:** HTTPS health, exact served app/domain source, Admin entry, all 13 stages, current-policy role selections, fixed Admin/Viewer restriction, required reason, confirmation/persistence guidance, selecting Manager artwork coverage, restore-form behavior, mobile fit, cancellation preserving controls, no business/settings/user/file writes and no browser runtime errors. Administrator logged out. The verification only edited and canceled a draft form; no live approval relaxation was saved.

Use Users & settings > Manage approval controls, select role permissions, provide a reason, confirm and save. Changes stay active until edited/restored; Admin retains access. Release validation also passed 115 native tests, 29 server/review controls browser checks and 55 full-flow checks covering three configured Manager-only purchases through port arrival and SETTLED with zero balance. These synthetic workflow transactions were isolated, not live business activity.

Ignored live report: test-output/approval-controls-live-report.json. Local mobile evidence: D:/CodexTestTemp/FarmingHub/approval-controls-live-mobile.png.


## Approval controls source update - 2026-09-12

Implemented DEC-018 / WF-017: ADMIN > Users & settings > Manage approval controls. All 13 approval/correction/authorization stages have role checkboxes, permanent Admin access, required reason/confirmation, manual Restore standard roles and before/after history. Standard permissions remain active until an administrator saves a change. No automatic expiry. New workspace approvalControls metadata is additive; no schema migration, account-role rewrite or historical-approval edit.

The earlier Manager-only blocker below remains true under standard roles. With configured Manager artwork coverage, three isolated Manager-only workflows now reach PORT_ARRIVED and SETTLED with zero balances. See [current test report](WORKFLOW_BROWSER_TEST_REPORT.md). This is local source, not a live publication claim; live permissions have not been relaxed.


## Verified single-role limitation - 2026-09-12

Purchase Manager alone cannot complete a fresh PO lifecycle under B-19: artwork approval requires Product Manager/Admin. Three isolated browser scenarios stopped at this gate after PO issue and PI approval (39 checks); production/shipping/settlement were not reached. See [Manager-only test report](WORKFLOW_BROWSER_TEST_REPORT.md). This records existing behavior, not a permission change or new release.


## Admin/order release live publication - 2026-09-12

Application commit **cc08c5de04bf3ccc1e6ed1a065cebee95039c4b7** is live at https://purchase.dvjassociates.com through Coolify deployment **iofjlpttbwbeibjdbyxb698s** (finished; application running:healthy). This publishes DEC-016/017 and WF-015/016: admin bulk deletion/restoration, permanent independent serial numbers and withdrawal of the September Executive approval delegation. Existing administrator role editing remains available. This record supersedes earlier source-only/pending-publication statements for these features.

**19 live checks passed**, including HTTPS health, exact served app/domain/shipping source, serial initialization audit, serial column, Deleted orders, required deletion reason/confirmation, mobile layout, role editor and absence of the September notice. Exact deployed policy rejects the withdrawn Executive approval powers; this policy check used live profiles plus an in-memory scoped test profile, not a live Executive login. No business or role writes and no browser runtime errors occurred during verification; the deletion dialog was canceled and the administrator logged out.

All original orders and prior audit entries were retained. One concurrent user evidence upload/technical confirmation was reconciled against its audit events separately from the serial migration; original order content, payments, users and pre-existing file metadata otherwise matched the predeployment fingerprints. Serial migration is idempotent and creates a pre-initialization SQLite backup beside the database before updating metadata. No live order was deleted, restored or approved by deployment verification.

Release validation also passed **110 native tests**, **31 bulk-order browser checks**, **13 approval-role browser checks** and **37 full-workflow browser checks**. Ignored local live evidence: test-output/admin-release-live-report.json and test-output/admin-release-concurrent-check.json. Historical workflow completion reports remain separate from this deployment.


**Admin/order source update, 2026-09-12 (DEC-016/017; WF-015/016):** ADMIN can select POs across pages, delete with a reason/confirmation, review Deleted orders, and restore with original workflow/serial/number. Deleted POs leave operations but retain scope-authorized read-only details, documents, payments and balances; no write-off/cancellation/purge. Automatic S.No. is separate from existing PO numbers, assigned once and never reused. Legacy initialization takes a pre-migration SQLite backup and appends audit.

The September Executive approval delegation is withdrawn in source. Purchase Manager/Admin and Product Manager/Admin approvals resume without date rules; historical approvals remain. User-role editing continues. This update awaits the publication record; no live PO deletion or user-role change is part of deployment.

## Role-editing live publication - 2026-09-12

Application commit **dd8656cb02c7ea47aa45eb29143270095aa21e87** deployed from main to https://purchase.dvjassociates.com via Coolify deployment **heiuia7nadcjjtlvrxiaktdc** (finished; running:healthy). This publishes DEC-015 / WF-014 administrator role editing. Existing domain, persistent data volume and application configuration retained.

**12 live checks passed:** HTTPS health, exact served app/domain source, administrator settings, self-role protection, current role/five supported choices, Purchase Manager selection, required reason, mobile layout, cancellation preserving the original role, no role/business writes and no browser runtime errors. Administrator logged out after checking. No live role or PO was changed. Actual promotion/demotion and existing-session enforcement were already tested in the isolated suite (108 native tests, 11 browser checks).

Use Users & settings > Change role on another user's row. Earlier local-only/unpublished role-editing notes below are superseded by this deployment. Bulk deletion/serial-number work is not included. Ignored verification artifact: test-output/role-editing-live-report.json.


**Role editing source update, 2026-09-12 (DEC-015 / WF-014):** administrators can change another user's role from Users & settings. Existing ID, password, scopes and owned orders are retained. Server requests use the current role immediately, with auditable reason and optimistic revision protection. Acting administrators cannot change their own role. Server and standalone UI promotion/demotion/mobile checks passed; isolated API tests verify existing-session enforcement. Local source only, not a publication claim.

## Live publication - 2026-09-12

Published application commit **64e67648cdc1adc315f2b20c8c5d68bdc546db45** from main to https://purchase.dvjassociates.com through Coolify deployment **e7p6hs4p1eatsbhp3mvg71ql** (finished; application running:healthy). This publishes DEC-013/WF-012 multiple attachments with 50 MB per file and DEC-014/WF-013 temporary purchase/product approval delegation. The existing domain, Docker configuration and persistent data volume were retained; no migration or role rewrite.

Live verification passed 11 checks: HTTPS health, exact served app/domain source, administrator login/bootstrap, deadline notice, executive eligibility across all delegated actions using live profiles and the exact deployed policy, October 1 IST expiry, multiple-file/50 MB form, mobile notice fit, no runtime errors and no business-write requests. Logout completed. This was read-only verification: no live executive password login or approval transaction was performed. Full Executive-only transactions were already verified in the isolated browser workflow. Earlier local-only statements below are superseded by this publication record.

Ignored local verification report: test-output/september-release-live-report.json. Application expiry remains **1 October 2026 00:00 IST**; completed approvals remain valid.


**Temporary approvals source update, 2026-09-12 (DEC-014 / WF-013):** active scoped Purchase Executives may make Purchase Manager and Product Manager approvals, including their own submissions, through 30 September 2026, 11:59 pm IST. Normal approval roles resume at 1 October 00:00 IST automatically. PO issue/return/amendment, PI, payment authorization/correction, order artwork, technical approval/rejection, brand delta and brand artwork use an explicit command allowlist. Roles and ordinary editing/administration rights remain unchanged. Readiness/evidence/financial checks and immutable history remain. A shared notice displays expiry; delegated audit events identify the executive and DEC-014. No schema migration. This is local source; the last confirmed live release remains the publication record below.

Approval handoffs in older workflow summaries and test reports remain historical. During the exception the executive can perform those approval steps; normal handoffs resume after expiry.

**Browser verification, 2026-09-12:** three complete purchase scenarios plus a dedicated Purchase Executive scenario passed against isolated native-server databases. All four reached port arrival and settled balances, including multiple attachments and partial shipments. No application changes were required. See [Workflow browser test report](WORKFLOW_BROWSER_TEST_REPORT.md) for coverage, role handoffs, evidence and limits. These results concern current local source, not a new deployment.

**Multiple-upload source update, 2026-09-12 (DEC-013 / WF-012):** evidence forms accept multiple files per submission, up to 50 MB (52,428,800 bytes) each. Supplier responses, PI, artwork, payments, QC, shipping evidence and existing PLM/complaint collections preserve every selected file. Uploads validate first, run sequentially with progress and support retry without re-uploading completed files in the same form. Business workflow advances only after the complete selection succeeds. Existing single-file records/clients remain compatible; no SQL migration. 102 native tests and isolated browser checks passed. This source update is not yet a live-deployment claim; the publication record below refers to the preceding user-access release.

**Published 2026-09-12:** user-access application commit `8a96a27` is live at https://purchase.dvjassociates.com. Coolify deployment `wawt555szxwx5ukuprnayjbe` finished successfully. HTTPS health, exact served app/domain source, administrator login, account metadata loading, Create user form with five roles, 390px mobile layout and logout passed live checks with no browser errors. Verification created no live accounts. Existing deployment settings and persistent data volume were retained. The local-only status in the initial update below is superseded by this publication record.

**User-access update, 2026-09-12 (DEC-012 / WF-011):** the working source now includes ADMIN-only web account creation and safe account metadata listing. The pages, permissions and API tables below reflect this change. Native tests: **97 passed, 0 failed**. Isolated Chrome checks passed for creation, confirmation/duplicate failures, mobile dialog, new-user login, non-admin visibility and standalone review. The earlier 94-test documentation-only verification below is preserved as history. Deployment details below describe the preceding deployment, not proof this update is live. TD-19's lack of bundled add-user scripts is mitigated by the web form; backup/recovery debt remains. No schema change.

Captured 2026-09-12. Active product version `0.6.1-alpha.16`, state schema7, runtime/source baseline `ced3d3b`. This documentation pass changes no application behaviour. Current preservation/change-control policy is confirmed by the user's master instruction; historical pilot implementation is not blanket management acceptance.

## Deployment and verification baseline

- Repository: https://github.com/anandsniper-alt/farminghub-purchase-management, branch `main`.
- Live application established in the preceding deployment task: https://purchase.dvjassociates.com, Coolify project `PURCHASE`, environment `production`, app `farminghub-purchase-management`. DNS resolved to the deployment server; HTTPS redirect, valid certificate, six startup modules, admin sign-in/bootstrap/logout and secure cookies were verified in that task.
- Root Dockerfile: Node24 Debian slim, unprivileged node user, internal port8000, health `/api/health`, persistent Docker volume at `/app/data`. Runtime `FH_ORIGIN` is the HTTPS domain and Secure cookies are enabled. Source Git push does not automatically deploy; Coolify auto-deploy was disabled during setup.
- Local startup: `node --env-file=.env server/index.mjs`, normally127.0.0.1:8000. `npm start` lacks explicit `.env` loading, and PowerShell `npm.ps1` was blocked on this workstation. No package install is required for the app.
- Native suite: 94 tests passed in the deployment task; this pass re-runs the suite and records its result in the verification section below. Historical 93/99/145 test counts refer to different source/runtime evidence, not today's certification. Browser harnesses need Python/Playwright/Chromium and contain legacy environment assumptions.
- Deployment succeeded; management UAT, recovery testing, security certification and ERP/VMS integration are not thereby complete. See [deployment operations](COOLIFY_DEPLOYMENT.md) and [administration](ADMINISTRATION.md).

## Product and data boundaries

Native HTTP + SQLite with vanilla HTML-string JS views. Single authenticated workspace, optimistic revision concurrency, cookie/CSRF auth, role/scope controls, protected evidence and append-only audit records. Browser clean-review mode is independent localStorage/IndexedDB with role switching, not a production client authentication mode.

Fresh clean seed inspected at fixed date2026-09-12:37 vendors (23 active/14 inactive per supplied master record),129 Base Items,387 ERP Items,106 supplier price entries,98 freight rows,7 exact routes,22 categories,5 PLM templates,6 payment methods,4 ports. Five review profiles exist in clean review; server replaces them with its single configured admin on first initialization. Orders/payments/shipments/complaints are empty initially. Existing database contents were not read or reset during documentation.

Active brands generated per base: GJ/KD/TT; two other seed brands are inactive. BD1 and BD2 have no supplier mapping and cannot be selected for supplier PO planning. Route transit days are1-day placeholders; manual planning TAT is required. Seed counts are not live transactional counts and may differ after legitimate user edits.

## Pages, navigation and reusable components

| Hash route / view | Current functionality and layout |
|---|---|
| `#/overview` | Scope cards, KPI cards, pipeline/task/risk summaries in shared panel grids. Only LAE Import operates. |
| `#/orders` | Order pipeline, substring search, stage filter, table/board toggle,12-row table pagination, filtered CSV export, new PO modal, stable S.No., admin bulk delete and Deleted orders/restore. |
| `#/order/:id` | Order detail summary, workflow timeline and next-action card, commercial/payment/production/shipment/document/history areas, revision printing and controlled actions. |
| `#/tasks` | Due/overdue follow-ups and risk flags; add/complete follow-up with communication details and delay reasons. |
| `#/payments` | Remittance register, supplier realization, original-order settlement, recording/void/correction actions. No bank transfer initiation. |
| `#/shipments` | Container tracking, Weekly freight rates, Freight trends tabs; Ref-based tracking import, rate import, milestone/detail controls. |
| `#/documents` | QC & documents index and linked evidence/downloads; not a complete standalone document management system. |
| `#/vendors` | Vendor master references, commercial defaults/status, manager editing and executive correction requests. Local records, no live sync. |
| `#/items` | Base Item Master, ERP Item Codes, LAE categories and Import history tabs, shared search/category filtering and explicit references. |
| `#/prices` | Supplier price lists by supplier/base/currency, effective dates, revisions and warnings. |
| `#/plm` | Product register, templates, brand variants, approval queue; category/template-driven controls. |
| `#/product/:id` | Base product detail, specifications, successor lineage, brand deltas/artwork, complaint counts/history/supporting files. |
| `#/settings` | ADMIN creates users with email/password, existing role and divisions, sees account email/sign-in status, and manages scopes/settings. Role editing for other users is available (DEC-015). No web password reset, identity editing or deactivation. |
| `#/versions` | In-app version/edit history; some content is static and stale compared with current deployment. |
| `#/roadmap` / fallback | Planned expansion; not an implemented Sales/ERP module. |
| Login (no dedicated hash) | Shared branded two-panel login, email/password, validation message; shown when bootstrap cannot load authenticated state. |

Sidebar groups: Workspace; LAE Import; Libraries; bottom administration/version links. Branding, components and responsive conventions are in [BRAND_RULEBOOK.md](BRAND_RULEBOOK.md). Reusable helper and event inventories are in [PROJECT_LEARNINGS.md](PROJECT_LEARNINGS.md).

## Current workflows

1. **PO:** select eligible supplier -> Base Item and brand quantities -> terms/currency/manual planning/route -> draft -> submit -> manager issue snapshot. Missing approved PLM warns; invalid selection of an existing approved revision blocks. Amendments require reason/manager approval, preserve old snapshots and re-confirm current commercial inputs.
2. **Commercial/production:** supplier PO acknowledgement -> PI record -> purchase verification -> manager PI approval -> technical confirmation -> artwork submission/Product Manager approval/supplier acknowledgement -> initial reported payment with evidence (if applicable) -> production clock -> sample completion -> sample approval -> bulk production -> bulk QC PASS -> production completion. Booking may start during bulk production.
3. **Shipping:** allocate remaining PO units -> book with active forwarder/unique Ref -> release container after production complete -> record inland tracking/CI/PL -> actual loaded-on-vessel with gates -> final BL -> shipment insurance -> actual destination-port arrival. Partial quantities stay open; full port arrival closes follow-ups/operations only. Cancellation is pre-departure without shipment payment allocations; short-close requires manager/reason and no unresolved active shipments.
4. **Payments:** current milestone authorization -> actual bank remittance report/evidence -> exact same-supplier allocations -> supplier realization acknowledgement -> residual/excess stays with original PO. Initial-payment shortcut has separate observed authorization semantics (EX-02). Voiding records preserves history and never reverses a bank transaction.
5. **PLM:** create supplier-linked base/template -> pending spec -> Product Manager approve/reject; significant model changes use linked successor. Brand delta/artwork approvals remain separate from technical revisions; approved PO snapshots do not change. Complaints attach to ERP Item and roll up to base.
6. **Imports:** XLSX/CSV -> parse/normalize -> preview warnings/errors -> explicit all-valid batch commit with source evidence and audit. Item import creates unmapped items until explicit operational mapping. Forwarder Ref import updates reporting/estimates but cannot perform guarded physical closure. Freight corrections append snapshots.
7. **Administration:** ADMIN opens Users & settings → Create user → enters identity, credentials, role and divisions → submits → new user signs in. Account/profile/audit creation is atomic; the local CLI remains available. ADMIN assigns scopes; policy changes are logged except explicitly excluded scope assignment business events. Consistent database backup uses SQLite `VACUUM INTO` and restores to a separate directory. See WF-011.

Calculation authority: CAL-01..CAL-15 in [learnings](PROJECT_LEARNINGS.md), implemented in shared domain/shipping functions. Do not invent tax, inventory, score or landed-cost calculations where none exist.

## Permissions baseline

| Actor | Implemented authority |
|---|---|
| ADMIN | Scope bypass; purchase/product approvals, settings/scopes, user creation, role editing for other users and account metadata list. |
| MANAGER | Scoped purchase create/edit/approve, authorize/void payments, master/category/route management, cancellations/short closure. Not automatically Product Manager. |
| EXECUTIVE | Scoped create; assigned-order edits and operational actions; correction requests. No general purchase/product approval delegation; DEC-017 withdraws B-15/DEC-014. Initial payment shortcut remains a separate exception. |
| PRODUCT_MANAGER | Scoped specification/artwork/template approvals and selected PLM edits/uploads; no automatic purchase-manager permission or generic PO creation. |
| VIEWER | Scoped read; business writes/uploads blocked. |

Only LAE_IMPORT transaction workflows are implemented. Existing scope values also include LAE_DOMESTIC, UTILITY_DOMESTIC and IMPLEMENTS_DOMESTIC. UI visibility is not the security boundary: domain and server enforcement must match.

## API contracts

| Method / path | Contract |
|---|---|
| GET `/api/health` | Public `{status,version,storage}`. |
| POST `/api/login` | `{email,password}` + valid Origin -> HttpOnly session cookie and `{user}`. |
| GET `/api/bootstrap` | Session -> `{state,user,csrf}`. |
| GET `/api/users` | ADMIN session -> `{users}` containing safe profile/email/active/hasAccount metadata, no credentials. |
| POST `/api/users` | ADMIN session/Origin/CSRF + `{name,email,password,role,scopes,expectedRevision}` -> 201 `{user,users,state}`. Atomic profile/account/audit creation; 400 invalid / 409 duplicate or stale. |
| POST `/api/commands` | Session/Origin/CSRF + `{type,payload,expectedRevision}` -> `{state,result}`. |
| POST `/api/files` | Session/Origin/CSRF + name/base64/orderIds/expectedRevision -> `{id,state}`. One file per request, <=50 MiB decoded bytes; upload JSON limit = `ceil(MAX_UPLOAD_BYTES / 3) * 4 + 1 MiB`. Other API bodies remain 12 MiB. UI sends several files sequentially, then one command with `fileIds`. |
| GET `/api/files/:id` | Authorized scoped download; Content-Disposition attachment, mapped MIME, no-store. |
| POST `/api/logout` | Session/Origin/CSRF -> `{ok:true}` and expired cookie. |

API errors use `{error}`; writes require exact allowed origin; the static server has an explicit allowlist for root, app/style/JSZip, shared dependencies, import template and logo. No generic filesystem serving or public registration endpoint exists.

## Completed, partial and deferred

**Implemented and exercised by native tests:** master seed, PO/PI gates, missing-PLM warning, immutable issued history, payment allocation/FX, production/sample/QC gates, partial shipments/BL/insurance/arrival, PLM revisions/templates, prices, complaints, imports, scoping/auth/storage and startup module delivery.

**Partial/pilot:** whole-workspace JSON persistence, local user admin, cost entries (no cost-allocation engine), template-driven specifications, local vendor master, complaint capture without resolution, browser backup/review behaviour, transport/data validation and deployment/recovery operations. Automated tests do not constitute management acceptance.

**Deferred or disconnected:** live VMS/ERP identity/vendor sync, accounting posting, bank execution, warehouse/stock/GRN, GST/margin/landed-cost/cost-per-USD, Sales monthly planning/forecasts/CBM/consolidation, legacy order import, other division workflows, vendor performance scoring, same-supplier cross-PO shipment loading, live carrier/email/WhatsApp integrations. Existing plans are context, not authorization to build them now.

## Known problems and consistency debt

The following are observed risks or candidates for investigation, not approved fixes. Source references are precise symbols; no application edits were made for this pass.

| ID | Finding / impact | Source / candidate next step |
|---|---|---|
| TD-01 | UI base-based production reference differs from domain item-based reference (fallback0 vs30); can show a different override requirement. | `productionReferenceForDraft` vs `productionReferenceDaysForOrderInput`; agree one contract before extraction. |
| TD-02 | `orderStatus`, timeline and next-action logic are separate; board omits several current statuses (acknowledgement, PI review, technical/artwork/payment/lead time), so filtered table orders can disappear in board. | `ordersView`, `orderActions`, domain `orderStatus`; add coverage for every derived status before changing grouping. |
| TD-03 | Multiple theme layers/inline colours and later root overrides undermine breakpoint intent; sidebar overflow is hidden and may clip on short screens. | `web/styles.css`; computed-style/mobile QA needed before scoped correction. |
| TD-04 | Price-list currency and invoice currency can differ without a conversion step; draft/amendment paths use inconsistent lookup currency. | `CREATE_ORDER`, `EDIT_DRAFT`, `dLines`, `priceVarianceForLine`, `basePriceHint`; financial policy decision required. |
| TD-05 | New future-effective price immediately supersedes earlier APPROVED entries, leaving no eligible current price until effective date. | `SAVE_PRICE_LIST`/`currentApprovedPrice`; define future-effective history semantics. |
| TD-06 | Initial-payment action auto-authorizes for eligible editor, unlike generic manager authorization; INR-rate checks differ. | `COMPLETE_INITIAL_PAYMENT` vs `AUTHORIZE_PAYMENT`/`RECORD_PAYMENT`; role/finance decision required (EX-02). |
| TD-07 | Scope serializer leaves some top-level collections unfiltered (e.g. price/freight/complaint/template-related data); tracking batch checks global create but updates matched orders without each-order `dFindOrder` edit check. | `scopedState`, `COMMIT_TRACKING_IMPORT`; do not extend multi-division/user rollout until scoped-data and import authority are reviewed. |
| TD-08 | `SAVE_ITEM` accepts supplied brandDeltaStatus and `SAVE_VENDOR` normalizes composite identity after its original-code check. Potential approval/identity bypass boundaries need targeted review. | Domain command branches; not asserted as an exploit reproduced during this pass. |
| TD-09 | Legacy pre-dispatch QC and BL-draft commands persist, but are not current dispatch gates; old docs still say mandatory. | `RECORD_QC`, `RECORD_BL_DRAFT`, `DISPATCH_SHIPMENT`; history marked superseded in WF-003/004. |
| TD-10 | Whole-state storage and synchronous crypto/SQLite may block event loop and create large writes. No versioned SQL migrations or proven multi-instance strategy. | `Store`, native server; maintain one instance and design migration explicitly. |
| TD-11 | Bootstrap errors all render login; no server refresh/polling, expired-session recovery policy or explicit unsaved-dialog protection. Shared command guard begins after some uploads. | `start`, `command`, `upload`, `onSubmit`, `closeModal`; UX consistency work needs bounded scope. |
| TD-12 | Historical docs/version UI say "not deployed", "PLM future", old pre-vessel gates, old test counts or no masters. Server startup message incorrectly claims no suppliers/items/rates preloaded. | `VERSION_HISTORY`, `REQUIREMENTS_COVERAGE`, `DECISIONS_FOR_REVIEW`, `INTEGRATION_BOUNDARIES`, `versionsView`, server startup; use this dated baseline/addenda. |
| TD-13 | Seed numeric conversion (`majorToMinor`), UI previews, shared money functions, date parsers and table limits are duplicated or differ. | final-master-data/domain/shipping/app; consolidate with representative parity tests, not a blanket refactor. |
| TD-14 | Generic file picker omits CSV; browser backup uses IndexedDB file retrieval, not authenticated server file downloads; XML parser uses cached values rather than recalculating formulas. | `fileField`, `backup`, `getFile`, `readSheetWorkbook`; server backup must use CLI snapshot. |
| TD-15 | Printed missing-PLM content says "No approved specification"; exact amber warning is not reproduced by `printPO` even though issued snapshot retains `plmWarnings`. | `dSnapshot` vs `printPO`; review document semantics without rewriting issued data. |
| TD-16 | Current production window remains after payment void/revised commercial state; preserved baseline may not equal current readiness. | `dRefreshProductionWindow`, `VOID_PAYMENT`, `APPROVE_AMENDMENT`; deliberate workflow decision before recomputing dates. |
| TD-17 | Freight booked value compares against one per-container benchmark without a number-of-containers field; route/container string normalization and parsed shipping dates differ across input paths. | shipping helpers/booking form/import; clarify units before aggregate freight work. |
| TD-18 | `SAVE_SPEC` structured required checks run only when structured values exist; free-text-only revision is allowed. Template edits can affect interpretation of prior field projections. | `SAVE_SPEC`, template projection helpers; do not claim immutable template schema snapshots. |
| TD-19 | Runtime Docker image copies app folders, not administration scripts, so in-container add-user/backup commands from local docs are unavailable by default. Persistent storage exists; scheduled backups/recovery are not configured/verified. | Dockerfile vs `docs/ADMINISTRATION.md`; operations follow-up needed. |
| TD-20 | Root review HTML aliases and recovered edit-register rows are not uniformly current; CSV SW-0033 has a different column shape. Archives are evidence, not authoritative current executable output. | build script, `SOFTWARE_EDIT_LOG.csv`, bundled workbooks/HTML; preserve raw records, annotate corrections. |
| TD-21 | Vendor master renderer calls `key()` without importing/defining it in the browser module. An isolated function execution reproduced `ReferenceError: key is not defined` with a vendor present. Standalone concatenation can mask this by sharing the domain declaration. | `vendorsView` and the imports in `web/app.mjs`; a server-mode UI regression test and small named-import fix are candidates for the next task. No runtime change made during this documentation pass. |

Prioritize security/scoping and finance discrepancies before widening access; then reconcile workflow/status display and responsive behaviour. These are recommendations, not an approved development order. No critical exploit or production data corruption was verified that required an immediate application rewrite during this documentation task.

## Verification and scope of the learning pass

Reviewed active source entry points, shared domain command branches/helpers, storage/API, UI views/forms/events/import/export/print, CSS layers, scripts, native tests and browser harness patterns; mapped the separate VMS reference stack. Reviewed README, changelog, version/edit/requirements/theme/import/admin/integration/test records, supplied brand PDF, runtime seed output and archived bundle history. Source workbook-derived counts were checked against executable seed; source Excel binaries were not re-imported or edited. No current private database data or credential values were copied into memory documents.

History available on main: `ebd0973` old review HTML, `7507416` current source/startup fix, `ced3d3b` deployment config. Bundled v0.3.0 archive includes `cb62aea` integrated PLM, `a2daf48` Shipping and `362cf96` release evidence. Later pre-upload changes are reconstructed from dated release records, not fictional Git commits. Dates are source dates; undated historical rationale/approval remains explicitly unknown.

Validation on 2026-09-12: `node --test tests/*.test.mjs` completed with **94 passed, 0 failed**. The command/status/term inventory below was generated directly from the current exports/source. Calculation examples were checked against the shared helpers; local Markdown targets were validated. Isolated Vendor master rendering reproduced TD-21. Browser checks from the deployment task remain prior evidence, not a newly performed comprehensive UI audit. No app build or redeployment is necessary for these Markdown changes.


## Source inventory appendix

Generated from current source on 2026-09-12; update alongside changed constants/commands. Lists identify implementation, not expanded approval.

### Command surface

`CREATE_ORDER`, `EDIT_DRAFT`, `SUBMIT_ORDER`, `RETURN_ORDER`, `APPROVE_ORDER`, `PROPOSE_AMENDMENT`, `APPROVE_AMENDMENT`, `CONFIRM_SUPPLIER`, `RECORD_PI`, `VERIFY_PI`, `APPROVE_PI`, `CONFIRM_TECHNICAL`, `COMPLETE_INITIAL_PAYMENT`, `AUTHORIZE_PAYMENT`, `RECORD_PAYMENT`, `ACKNOWLEDGE_PAYMENT`, `VOID_PAYMENT`, `RECORD_PREPRODUCTION_SAMPLE`, `APPROVE_PREPRODUCTION_SAMPLE`, `START_PRODUCTION`, `UPDATE_COMMITMENT`, `RECORD_BULK_QC`, `COMPLETE_PRODUCTION`, `SUBMIT_ARTWORK`, `APPROVE_ARTWORK`, `CONFIRM_ARTWORK`, `ADD_FOLLOWUP`, `COMPLETE_FOLLOWUP`, `ADD_NOTE`, `ADD_SHIPMENT`, `BOOK_CONTAINER`, `RELEASE_CONTAINER`, `UPDATE_SHIPMENT`, `UPDATE_TRACKING_MILESTONE`, `RECORD_BL_DRAFT`, `RECORD_INSURANCE`, `RECORD_QC`, `DISPATCH_SHIPMENT`, `RECORD_BL`, `ARRIVE_SHIPMENT`, `COMMIT_TRACKING_IMPORT`, `COMMIT_FREIGHT_RATE_IMPORT`, `CANCEL_SHIPMENT`, `SHORT_CLOSE_ORDER`, `ATTACH_DOCUMENT`, `ADD_COST`, `CREATE_BASE`, `SAVE_BASE_META`, `CREATE_SUCCESSOR`, `SAVE_SPEC`, `APPROVE_SPEC`, `REJECT_SPEC`, `SAVE_TEMPLATE_FIELD`, `SAVE_BRAND_DELTA`, `APPROVE_BRAND_DELTA`, `SUBMIT_BRAND_ARTWORK`, `APPROVE_BRAND_ARTWORK`, `SAVE_PRICE_LIST`, `SAVE_ITEM`, `ADD_COMPLAINT`, `SAVE_VENDOR`, `REQUEST_VENDOR_UPDATE`, `SAVE_SCOPES`, `SAVE_SETTINGS`, `ADD_CATEGORY`, `SAVE_ROUTE`, `COMMIT_IMPORT`

### Operational status labels

| Stored/derived key | User label |
|---|---|
| `DRAFT` | Draft |
| `PENDING_APPROVAL` | Awaiting PO approval |
| `AWAITING_ACK` | Supplier PO acknowledgement |
| `AWAITING_PI` | Awaiting PI |
| `PI_REVIEW` | PI verification / approval |
| `AWAITING_SPEC_CONFIRM` | Technical confirmation |
| `AWAITING_ARTWORK_CONFIRM` | Artwork confirmation |
| `AWAITING_PAYMENT` | Payment |
| `PRODUCTION_LEAD_TIME` | Production lead time |
| `SAMPLE_REQUIRED` | Pre-production sample required |
| `READY_FOR_PRODUCTION` | Ready for bulk production |
| `IN_PRODUCTION` | In production |
| `READY_TO_SHIP` | Ready to ship |
| `IN_TRANSIT` | In transit |
| `PARTIAL_ARRIVAL` | Partially arrived |
| `PORT_ARRIVED` | Port arrived |
| `SHORT_CLOSED` | Short-closed |

### Visible stage order

1. `PO_CREATED` ? PO created
2. `PO_SUBMITTED` ? Submitted for approval
3. `PO` ? PO approved & issued
4. `CONFIRM` ? Supplier PO acknowledgement
5. `PI_RECEIVED` ? PI received
6. `PI` ? PI approved
7. `SPEC_CONFIRM` ? Technical specification confirmation
8. `ARTWORK` ? Artwork confirmation
9. `PAYMENT` ? Payment complete
10. `LEAD_TIME` ? Production lead time
11. `SAMPLE_DONE` ? Pre-production sample completed
12. `SAMPLE` ? Pre-production sample approved
13. `PRODUCTION` ? Bulk production start
14. `BULK_QC` ? Bulk production QC
15. `READY` ? Production completion
16. `BOOKING` ? Container booking
17. `RELEASE` ? Container release
18. `INLAND` ? China inland tracking
19. `DOCS` ? Shipping docs (CI + PL)
20. `VESSEL` ? Loaded on vessel
21. `BL` ? Final BL / verification
22. `INSURANCE` ? Insurance completed
23. `TRANSIT` ? In transit
24. `PORT` ? India port arrival

### Commercial configuration

| Term ID | Display name | Percent / trigger / calendar days |
|---|---|---|
| `30-70` | 30% Advance - 70% Against Telex BL | 30% / PI / 0; 70% / BL / 0 |
| `30-70-bl60` | 30% Advance - 70% Before 60 Days From Loading BL | 30% / PI / 0; 70% / BL / 60 |
| `30-70-bl120` | 30% Advance - 70% Before 120 Days From Loading BL | 30% / PI / 0; 70% / BL / 120 |
| `10-20-70-bl120` | 10% Advance For Order Confirmation, 20% Before Shipment, 70% Before 120 Days From Loading BL | 10% / PI / 0; 20% / SHIPMENT / 0; 70% / BL / 120 |
| `20-80-bl120` | 20% Advance - 80% Before 120 Days From Loading BL | 20% / PI / 0; 80% / BL / 120 |
| `20-80` | 20% Advance - 80% Against Telex BL | 20% / PI / 0; 80% / BL / 0 |
| `credit60` | 100% Before 60 Days From Loading BL | 100% / BL / 60 |

Payment methods: `TT` (TT / Telegraphic Transfer), `LC` (Letter of Credit (LC)), `DP` (DP / Documents Against Payment), `DA` (DA / Documents Against Acceptance), `OA` (Open Account), `OTHER` (Other / Custom).

Cost categories: Freight; Insurance; Bank charges; Forwarder charges; Port charges; Customs-related charges; Inland logistics; Other.

Delay/closure reasons: Supplier production; Supplier documentation; Internal purchase; Artwork confirmation; Specification confirmation; Payment processing; Shipping / forwarder; Customs / clearance; Late sales requirement; Other.


## Optional GAJA page guide - local experiment, 2026-09-12

An opt-in Guide me launcher opens a native modal walkthrough with the user-requested GAJA elephant, step count, highlighted control, concise explanation, Next/Back, Skip, Finish and Escape. Reopening restarts the current page tour. Pipeline, order detail, overview, payments and settings have tailored steps; other pages use only visible heading/filter/tab/table steps. Unavailable controls are omitted. The tour never invokes application actions or changes orders, forms, roles, approvals or financials. It hides during business dialogs, closes on route/target replacement, contains keyboard focus and restores it on close. Mobile uses a bottom card; 220ms entry respects reduced motion.

Available at http://127.0.0.1:8137/#/orders in the same isolated sample. The user requested this extension; production adoption/publication remains pending. It provides page explanations, not automated completion of the full purchase lifecycle. DEC-021.


## GAJA pose refinement - 2026-09-12, DEC-022

The local sample uses three green/lime mascot poses: welcoming wave in the launcher/first tour step, pointing in intermediate steps, thumbs-up on the last available step. Pose selection follows the filtered visible-step sequence, including Back/reopen. Images are bundled locally and predecoded; no business workflow or stored data changes. This supersedes the single red mascot presentation in the sample only.


## Farming Hub guide branding - 2026-09-12, DEC-023

The local guide uses Farming Hub branding on all three mascot poses and the original Farming Hub logo in its header. Launcher, introductions and image alternatives use Farming Hub wording. This replaces the GAJA-labelled sample artwork/copy; pose progression, controls, access checks and business data are unchanged. Current asset manifest points only to farminghub-*.png.


## Persistent next-step instructions - 2026-09-12, DEC-024

The Farming Hub logo and mascot remain in a fixed, keyboard-accessible dock on pages, in business forms and while the tour is open. Tap to open guidance; tap again to close. Order guidance starts with the actual primary action already rendered for the current role. In a form, it starts with a displayed error or invalid visible field, then a review/submission explanation. Take me there closes help and focuses the target without clicking it, submitting, approving or changing values. Guide Escape leaves the underlying form and unsaved entries intact. Back/Next/Skip/Finish remain, and mobile reserves space for the dock. No AI, API key, chat input or external model call is used.

The user first considered OpenAI and then explicitly chose no API for now. The provisional AI handler, chat UI and AI tests were removed before release; preview serving remains GET-only. No key was supplied or model request executed. This local sample can be used without OpenAI setup or usage charges. Live application remains unchanged.


## Consistency fixes - 2026-09-12, local build (DEC-025 / WF-019)

Resolved locally: TD-01 UI production-day hint divergence, TD-02 missing Board/Overview status coverage, TD-21 missing Vendor master browser import. TD-03 sidebar clipping corrected; broader CSS cascade debt remains. TD-07 price/complaint/freight/import projection and tracking-batch edit checks corrected; this is not a certification of every possible multi-division operation. TD-08 forged item approval and normalized vendor identity paths corrected. TD-11 bootstrap errors now distinguish login from retryable load failures; unsaved-dialog protection, session recovery and refresh policy remain future work.

Board and Overview use the same five complete groups. Production hints now use the unchanged server item/supplier rule; no finance calculation changed. Master target scope validation was added to item, price, complaint and vendor saves. No database migration or live record changes occurred. Normal standalone review and the isolated minimal/animation/mascot build are rebuilt. Show page guides remains visible in Minimal by explicit instruction.

Unresolved business decisions: TD-04 invoice versus price-list currency treatment and TD-05 future-effective price activation. Preserve these existing rules pending explicit policy decisions; do not silently introduce conversion or revise historical price records. Suggested My work dashboard, saved views, and broader upload redesign remain proposals. The theme is still awaiting adoption, and none of these local fixes is deployed yet.


## Payment rate clarity - DEC-027 / WF-021, local build

Indian-bank fields now use direct currency-pair labels. USD remittances and supplier receipts support a separate optional USD-to-RMB BOC reference, shown in payment register and order allocation columns. Remittance reference persists with the original payment; receipt corrections may explicitly override/clear it. No rate provider is connected. Actual receipt/conversion/balances remain separate and unchanged. No production deployment or live record updates in this task.


DEC-028 release preparation: corrected shared modal/appearance-toolbar layering and notification position, and rebuilt the DEC-027 payment-reference update for publication. Persistent storage, native authentication, approval controls and actual receipt calculations remain unchanged. Publication evidence follows verification.


## Active soft-launch QA — DEC-029 / WF-023

Live testing uses Ashok/MANAGER only and retains clearly labelled QA orders, evidence, QAAS01 product and V98-QALF synthetic logistics provider. The QA reports are current evidence; earlier browser reports remain historical. These records are simulations, not real purchases, banking, shipping or insurance.

Local changes: factual stage and task owner display; required existing-shipment primary action; missing-logistics setup help; reachable existing ERP setup with authoritative base/brand mapping; missing-PLM copy correction; strict freight input parsing. No current claim of deployment, migration, historical-rate correction or complete release readiness. See QA_DEFECT_LOG.md and QA_RELEASE_READINESS.md. A verified real forwarding agent and remaining risk testing are operational prerequisites. Existing TD-04 currency-policy and TD-05 future-price-policy questions remain unresolved; no policy was invented during QA.


Final QA pass continued into 2026-09-13 IST. Ten retained live QA POs span nine suppliers and all seven configured payment terms; three synthetic BS20 complaints demonstrate per-brand/base roll-up. QAAS01 and its approved specification remain retained but live ERP setup is blocked until publication. Eight local fixes,128 native tests and31 targeted native/review checks are recorded in the QA reports; no publication or unconditional soft-launch approval is claimed.


Final browser handoff: **12 retained QA POs**, serials15–26. Ten are Port arrived and settled. QA-ASHOK-0912-12 and QA-ASHOK-0912-13 remain at Production lead time with USD30 received and USD70 outstanding each, ready for sample completion. One USD60 remittance split30/30, duplicate-reference rejection and excess-receipt correction were verified through Ashok's browser. Search QA-ASHOK-0912 with All stages / All suppliers. No test records were deleted; fixes remain local, not deployed.


Continued live QA (13 September IST): QAAS01 QA-1.1 remains pending because Ashok lacks its Reject action; QAAS02 independently verifies technical supersession, current QA-1.1 with QA-1.0 retained. Added synthetic logistics references V98-QAS2 and V97-QALF for full-reference identity tests. QA-ASHOK-0913-14 continues negative validation/return/PI/shipping checks; its exact50MiB plus second attachment saved. None of these are real business instructions. BUG-009 mascot clearance is fixed locally; see QA_ACCESS_BLOCKERS.md for precise dependencies.


Import QA continuation: BUG-010–012 fixed locally: visible tracking rejection errors, unique Ref/route-container per batch, empty-batch rejection and safe replacement-preview lifecycle. Later correction history remains. These changes are not yet live; server/review regression reports are separate from the retained live failure evidence.


Bank-rate display BUG-013 is fixed locally and verified in server/review. Planning-date permissiveness TD-06 is an observed policy gap, not an approved range change. The local code does not alter date acceptance or backfill historical rates.


Current QA handoff:15 active QA POs,11 Port arrived/SETTLED and4 open (QA12 bulk/QC plus planned20GP, QA13 lead time, QA15 date-boundary draft restored15Dec, QA16 lead time with90-day commitment). Four synthetic BS20 complaints, two synthetic PLM bases, three synthetic logistics providers and4 weekly snapshots on a separate QA-only route remain for review. No cleanup/deployment. The full340-case ledger is 235 PASS / 21 FAIL / 84 BLOCKED; prerequisites are enumerated, not disguised as passes.


## Current local Manager-independence build — 2026-09-13

DEC-030 / WF-024 add an Admin-reviewable Independent Manager workflow preset, read-only stage access, item upload/mapping entry points, vendor/price batch imports with source history, vendor audit visibility and evidence-backed freight benchmark recovery. They include all 13 prior QA fixes. Every Manager is the confirmed target; no name-specific hard-coded permission or automatic September rule. The persisted live matrix has not been changed in this session, and this build has not been deployed. Admin user/role/policy/delete/restore controls remain restricted. See [MANAGER_WORKFLOW.md](MANAGER_WORKFLOW.md) for the complete activation and operating sequence.

Native/standalone setup and complete Manager-only workflows are validated separately from live QA; current counts are in QA_EXECUTION_REPORT.md. Existing live orders and all QA creations are untouched. Outstanding finance/date-policy decisions and isolated infrastructure acceptance are not silently marked resolved.


## Live Manager workflow release — 2026-09-13

Runtime f5d5514 is deployed and healthy at https://purchase.dvjassociates.com; all 13 Manager approval grants are activated at control revision 2. Ashok and Suresh are active scoped Managers. All 29 POs / 15 QA orders and linked business collections were preserved; the policy change added one audit event. Domain and persistent volume unchanged. Current evidence is in QA_EXECUTION_REPORT.md. This supersedes earlier local-only/activation-pending notes for DEC-029/030; remaining QA/policy limits remain.

## Local mascot corner update - 2026-09-13

DEC-031 / WF-025: Guide me supports horizontal dragging and snaps to the nearer bottom corner. Focused Left/Right arrows choose a corner. The browser remembers the selected side through reloads and guide-dialog reparenting. Cancelled drags return to the saved side; resizing retains responsive corner anchoring. The standalone review build includes this update. This addendum is local implementation evidence, not a new live publication claim.

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.

## Local timeline visibility update - 2026-09-13

DEC-032 / WF-026: order Overview opens its existing timeline in Minimal, including after reload and page-guide toggles. Manual collapse remains available. Fixed the observed 6px order-panel overflow at 320px by allowing the mobile Minimal grid track to shrink. Rebuilt standalone review; no live publication in this update.

**DEC-032 / WF-026 publication, 2026-09-13:** Runtime a5a9b24 is live at https://purchase.dvjassociates.com; deployment 3ontnhztuhusfj6ei7ltqodd finished successfully. The order timeline opens expanded in Minimal, survives guide toggles/reload and fits the checked 390/320px layouts. Eleven served assets match the release commit and health returns 200. All 29 POs / 15 QA orders, checked business collections and approval controls are unchanged at revision 904. This supersedes the earlier local-only publication status for the timeline update.


## Supplier item worksheet release candidate — 2026-09-13

DEC-041 / WF-036 backports the reviewed supplier catalogue and compact PO worksheet onto main. Open Order pipeline > Create purchase order, select supplier, then search/add items and enter quantities/rates in rows. Existing drafts use the same screen. Technical/price references and commercial terms are expandable. Current/Minimal and mobile supported. Server/domain/Dockerfile unchanged; audit trial remains separate. Validation: 135 native tests, 37 server/review worksheet checks, three complete configured Purchase Manager workflows (55 checks). Deployment confirmation is recorded separately after live verification.


## Worksheet publication verified — 2026-09-13

Runtime commit **8353e01f8742ca8b0e24223ea3397583a2a6a83c** is live at https://purchase.dvjassociates.com. Coolify deployment **qyvgv6b0coxnxtjh1dno47p5** finished; application running:healthy and health HTTP 200. This publishes the compact supplier worksheet independently under DEC-041 / WF-036, superseding its release-candidate status. **17 live checks passed:** committed app/style/domain bytes, Minimal/Current, catalogue selection/search/duplicate disabling, live totals, expandable terms, mobile fit/internal scrolling, no runtime errors or business writes. All **30 orders**, checked business collections, users and approval controls match the fresh pre-release baseline at **revision 961**. Persistent /app/data volume and runtime settings were retained. No audit-trial schema, FX, recovery or security policies were deployed. Evidence is privately retained in ignored test-output/worksheet-live-report.json, worksheet-live-desktop.png, worksheet-live-mobile.png and worksheet-deploy-status.json.


## USD/RMB price correction candidate — 2026-09-13

DEC-042 / WF-037 implements a required dated USD-to-RMB quote for cross-currency PO entry. RMB supplier prices divide by the entered rate for USD invoices; reverse direction multiplies. Source catalogue prices retain their currency; missing rates leave automatic prices blank and prevent proceeding. Draft edit restores FX and updates matched prices; manual overrides warn. Existing issued POs are preserved. The production-based candidate is isolated on fix/po-rmb-conversion; the same correction is available in the local audit preview. **Not pushed or deployed in this task.** The live site still runs worksheet release 8353e01 until a separate publication. No broader audit acceptance or live-data rewrite is implied.


**DEC-042 verification:** 143 native tests and 33 currency browser checks passed on this branch, covering server/review, source RMB, USD conversion, missing rate, saved edit/recalculation, manual override, Current/Minimal, mobile and printed quote direction. The independent production-based candidate also passed 37 worksheet checks and three complete configured Manager workflows (55 checks), including RMB-list/USD-invoice entry. Private review rebuilt. Local preview http://127.0.0.1:8016/ is healthy with updated UI/domain; no live data or deployment changed.
