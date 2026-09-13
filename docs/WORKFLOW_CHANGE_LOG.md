# Workflow change log

Started 2026-09-12. Historical records are reconstructed from sources, not invented user discussions. A version date is not independent management approval. Preserve previous records; use `Replaced by WF-...` for replacement and reference the successor. Current flow lives in the [baseline](CURRENT_PRODUCT_BASELINE.md); policy/rationale lives in [decisions](DECISION_LOG.md).

## WF-001 — Initial controlled LAE Import purchasing

**2026-09-12 addendum:** approval-role handoffs temporarily replaced by WF-013 under DEC-014; other steps continue. Ordinary handoffs resume at the documented IST expiry.

**Date:** 2026-09-11. **Module:** Purchase/system. **Workflow name:** authenticated order execution. **Evidence/status:** historical SW-0001..0008, source/tests; IMPLEMENTED and later extended by WF-002..007.

**Previous workflow:** no previous executable Purchase flow is present in supplied history; cannot reconstruct an earlier manual business process. **Requested change/reason:** initial working LAE Import purchase alpha with controlled execution and visible history.

**New workflow:** (1) authenticated/scope-bound user creates draft; (2) submit/manager issue; (3) PI/payment/production/artwork/shipment controls; (4) actual port arrival and independent settlement; (5) corrections retain history. **Steps added:** order drafts, approvals, documents, payments, follow-ups, shipments, audit. **Steps removed:** none evidenced. **Steps modified:** none evidenced before initial build. **Status changes:** initial draft/pending/issued and derived operational/financial states introduced.

**Roles/users affected:** ADMIN, MANAGER, EXECUTIVE, PRODUCT_MANAGER, VIEWER with scoped/assigned authority. **Dependencies affected:** native server, Store, shared commands and UI adapters. **Calculations affected:** integer money/FX, payment slices, date/quantity/status helpers. **Reports affected:** pipeline, tasks, payments, PO print/history. **Data/database impact:** workspace JSON, append-only audit mirror, accounts/sessions/evidence. **API impact:** authenticated bootstrap/commands/files. **UI impact:** shared shell and modal actions. **Backward compatibility:** no earlier native schema migration documented. **Risks:** pilot assumptions are not management sign-off. **Final implementation:** active domain/server/UI architecture, subsequently revised as recorded below. **Related decisions:** DEC-001/003.

## WF-002 — Integrated product lifecycle control

**2026-09-12 addendum:** approval-role handoffs temporarily replaced by WF-013 under DEC-014; other steps continue. Ordinary handoffs resume at the documented IST expiry.

**Date:** 2026-09-12,0.2.0-alpha.2. **Module:** PLM/Purchase. **Workflow name:** base specifications and brand variants. **Evidence/status:** archived `cb62aea`, SW-0009..0012; IMPLEMENTED, later extended by WF-006/007.

**Previous workflow:** (1) interim technical text package; (2) PO uses released package; (3) artwork handled on order. **Requested change/reason:** integrated PLM with category specifications, controlled revisions and brand inheritance.

**New workflow:** (1) create supplier-linked base/category/template; (2) propose specification with reason/documents; (3) Product Manager approve/reject; (4) use approved base revision in PO; (5) manage separate brand deltas/artwork; (6) significant changes create successor lineage. **Steps added:** structured template input, product approval queue, brand revision/lineage views. **Steps removed:** no complete deletion of interim/free-text support evidenced. **Steps modified:** technical package source becomes integrated PLM. **Status changes:** PENDING/APPROVED/REJECTED spec and brand states; DRAFT/ACTIVE/INACTIVE product lifecycle.

**Roles/users affected:** purchase creators/editors, Product Manager and ADMIN approval. **Dependencies:** template helpers, base/item relations, PO snapshot/readiness. **Calculations:** no new monetary formula. **Reports:** PLM library/detail/history and PO technical annexure. **Data/database:** bases/specifications/brand metadata added to workspace; old snapshots retained. **API:** PLM command types through existing command endpoint. **UI:** PLM/products/templates/approval forms. **Backward compatibility:** legacy free-text descriptions remain; old issued PO content must not be recalculated. **Risks:** no final normalized PLM schema, template edits/projections need care. **Final implementation:** current shared PLM helpers and command branches; missing-approval gate later narrowed in WF-007. **Related decisions:** DEC-001/007/008.

## WF-003 — Shipping and freight control introduced

**Date:** 2026-09-12,0.3.0-alpha.3. **Module:** Shipping/Production. **Workflow name:** original expanded shipping gates. **Evidence/status:** archived `a2daf48`, SW-0013..0017; **Replaced by WF-004** for gate order. Tracking/history additions remain.

**Previous workflow:** (1) basic shipment quantity allocation; (2) departure/BL/arrival dates and partials. **Requested change/reason:** manual forwarder tracking and freight control with explicit sample/QC/container/doc stages.

**New historical workflow:** (1) sample approval/bulk QC; (2) production/container booking/release; (3) structured inland milestones; (4) pre-vessel QC, CI/PL, verified BL draft/insurance and other gates; (5) vessel/departure, final BL and arrival; (6) weekly Ref/rate imports. **Steps added:** sample/bulk QC, booking/release, tracking/rate import, document checklist and benchmark trend. **Steps removed:** none recorded. **Steps modified:** simple shipment becomes milestone-controlled. **Status changes:** booking/release/milestones and tracking states introduced.

**Roles/users affected:** scoped Purchase editors/managers and product approvals. **Dependencies:** shipping helpers, evidence, payment/production/artwork context. **Calculations:** route rate variance, history trend, baseline/revised dates. **Reports:** container tracking/rates/trends. **Data/database:** shipment milestone/event/history fields, freight/shipping import arrays. **API:** shipping/import commands. **UI:** shipping workspace and expanded order controls. **Backward compatibility:** baseline dates and previous records retained. **Risks:** older policy docs describe these superseded gates as current. **Final implementation:** archived source proves this stage existed; follow WF-004 for current dispatch requirements. **Related decisions:** DEC-005, superseded by DEC-006.

## WF-004 — Current commercial-to-port sequence

**2026-09-12 addendum:** approval-role handoffs temporarily replaced by WF-013 under DEC-014; other steps continue. Ordinary handoffs resume at the documented IST expiry.

**Date:** 2026-09-12,0.4.1-alpha.8. **Module:** Purchase/Production/Shipping. **Workflow name:** complete visible progression and post-vessel documents. **Evidence/status:** VERSION_HISTORY, SW-0023/24, current domain/workflow tests; IMPLEMENTED. **Replaces:** WF-003 gate sequence.

**Previous workflow:** (1) order/PI controls; (2) production/sample controls without all separate visible stages; (3) pre-dispatch QC, draft BL/insurance gate before vessel; (4) vessel/arrival. **Requested change:** show each mandatory stage and correct timing of sample/payment/BL/insurance. **Reason:** historical record describes user-corrected operational sequence and visible next actions; original detailed alternatives not available.

**New workflow:** (1) draft/submit/manager issue; (2) supplier PO acknowledgement; (3) PI record/verify/manager approve; (4) technical confirmation; (5) artwork submit/Product Manager approve/supplier confirmation; (6) initial reported SWIFT payment if required; (7) production clock; (8) sample completed then approved; (9) bulk start/QC PASS/completion; (10) booking during production then release after completion; (11) inland tracking and CI/PL; (12) vessel loading with required current confirmations/payment/container/vessel/voyage; (13) final BL; (14) insurance; (15) India-port arrival, operations close while finance may remain open.

**Steps added:** separate sample completion and approval, visible clock/payment/next actions. **Steps removed:** mandatory separate pre-dispatch QC and verified BL-draft/insurance pre-vessel gates. **Steps modified:** final BL and insurance occur after departure, insurance after BL. **Status changes:** visible `STAGES` and derived lead-time/confirmation/payment states expanded. Legacy command names retained.

**Roles/users affected:** executives/manager operational entry; manager PO/PI/generic payment approval; product artwork approval. **Dependencies:** `dRefreshProductionWindow`, `initialPaymentStatus`, `shippingDocReadiness`, dispatch/BL/insurance/arrival commands. **Calculations:** production due dates anchor to readiness, BL credit dates to actual final BL; baseline delay unchanged. **Reports:** timeline, next actions, flags, payment due dates. **Data/database:** current confirmation/production/sample fields and shipment evidence; no business-history deletion. **API:** same command transport, changed gate preconditions/new commands. **UI:** current-stage card and granular actions. **Backward compatibility:** optional legacy QC/draft BL commands remain, so old code must not reassert old mandatory gates. **Risks:** initial-payment shortcut permission difference; tracking must not bypass actual gates; old docs conflict. **Final implementation:** current domain source is sequence authority, UI must reflect it. **Related decisions:** DEC-004/006; CAL-05..10.

## WF-005 — Supplier commercial defaults and conditional TAT reason

**Date:** source0.5.2-alpha.13/0.5.3-alpha.14; event date not separately present, recorded2026-09-12. **Module:** Vendors/Purchase. **Workflow name:** supplier defaults and production commitment. **Evidence/status:** CHANGELOG, MASTER_IMPORT_NOTES, tests; IMPLEMENTED, extended by WF-006.

**Previous workflow:** (1) choose supplier; (2) enter commercial/planning fields; (3) override-reason field could remain visible even at standard days. **Requested change/reason:** use supplied supplier commercial master and show reason only for true commitment deviations.

**New workflow:** (1) choose supplier and load payment method/terms/billing and price-list currency/port/reference days; (2) enter agreed commitment; (3) show/require reason only if different; (4) clear stale reason on reset/vendor change; (5) preserve manual total TAT. **Steps added:** richer commercial defaults. **Steps removed:** unnecessary reason entry at equal reference. **Steps modified:** default term schedules follow source workbook and reference-day comparison. **Status changes:** none.

**Roles/users affected:** PO creators and manager vendor editors. **Dependencies:** supplier source, TERMS/PAYMENT_METHODS, create-order validation and draft form. **Calculations:** BL-day terms, reference/override comparison, not a holiday engine. **Reports:** commercial snapshot/payment schedules. **Data/database:** new supplier defaults/source provenance; existing databases are not automatically re-seeded. **API:** existing create/vendor commands carry defaults. **UI:** conditional field and reset behaviour. **Backward compatibility:** old supplier-only comparison extended to product-first references in WF-006. **Risks:** UI/domain reference mismatch and older docs. **Final implementation:** product-first reference if available, supplier fallback; preserve exact source term meanings, flag unresolved currency mismatch. **Related decisions:** DEC-007; CAL-05/08.

## WF-006 — Base-first orders, ERP complaint roll-up and final freight benchmark

**Date:** 2026-09-12,0.6.x release evidence (labels vary in old records). **Module:** Masters/Purchase/PLM/Freight. **Workflow name:** final master-driven planning. **Evidence/status:** CHANGELOG, README, final-master-data and master tests; IMPLEMENTED.

**Previous workflow:** (1) supplier/brand-item order selection and mapping; (2) item-specific price list; (3) base/brand PLM; (4) rate benchmark based on previous raw-rate model. **Requested change/reason:** use final first-sheet Base Item Master, stable supplier references and workbook freight history with agent charges.

**New workflow:** (1) load129 authoritative bases; (2) generate GJ/KD/TT ERP identities; (3) choose supplier then base/brand quantities; (4) expand only positive quantities and inherit base price by currency; (5) select/confirm base technical specification separately from ERP artwork; (6) capture ERP complaints and base roll-up; (7) compare booked freight against O/F+agent on exact route/container history.

**Steps added:** base quantity planner, complaint input/brand/severity roll-up, final history import. **Steps removed:** direct brand-first entry as the primary new-PO flow. **Steps modified:** price parent and product reference-day priority; benchmark includes agent charge. **Status changes:** generated items `ERP_CODE_READY`; complaints start OPEN; no new closed-complaint workflow.

**Roles/users affected:** purchase editors, Product Manager and supplier master users. **Dependencies:** final constants/vendor mapping, seed, PLM, price/quantity/freight helpers. **Calculations:** CAL-03/08/11/12/13/15. **Reports:** base/ERP libraries, PO lines, price warnings, complaint counts, freight trends. **Data/database:** fresh-seed master replacement; no automatic live migration. **API:** baseId/planner-expanded lines and complaint command through existing endpoint. **UI:** base-first planner, brand quantities and complaint panels. **Backward compatibility:** legacy item price/mapping paths retained; issued history unchanged. **Risks:** BD1/BD2 unmapped; repeated derived seed formulas; missing currencies and placeholder route durations. **Final implementation:**37 vendors/129 bases/387 ERP items/106 prices/98 freight rows in fresh seed. **Related decisions:** DEC-007/011.

## WF-007 — Missing PLM becomes a persistent warning

**Date:** 2026-09-12,0.6.1-alpha.16. **Module:** Purchase/PLM. **Workflow name:** PO submission/issue without approved PLM. **Evidence/status:** CHANGELOG, VERSION_HISTORY, bypass tests; IMPLEMENTED.

**Previous workflow:** (1) create PO; (2) require approved technical package; (3) missing approved package prevents submission/issue. **Requested change:** allow purchasing when no approved PLM exists, while exposing the gap. **Reason:** controlled availability bypass explicitly described in latest release.

**New workflow:** (1) evaluate each base's approved revisions; (2) if none, retain exact warning `PLM specification not available`; (3) allow remaining valid submission/manager issue without extra override reason; (4) append bypass history and snapshot warnings; (5) if approved revisions exist, retain valid-selection and other pending-change checks. **Steps added:** persistent warning and snapshot/audit condition. **Steps removed:** unconditional missing-approved-spec block only. **Steps modified:** readiness conditional, no fabricated approval. **Status changes:** no PLM status changed by bypass.

**Roles/users affected:** PO editor/manager and Product Manager's independent responsibility. **Dependencies:** readiness, warning helper, snapshot, issue/amendment/UI. **Calculations:** none. **Reports:** order warning/history/issued metadata; printed exact wording remains TD-15. **Data/database:** `plmWarnings` snapshot metadata; existing issued snapshots untouched. **API:** unchanged command names, narrowed validation. **UI:** amber warning remains through progression. **Backward compatibility:** do not erase previous approved specs or bypass an invalid existing selection. **Risks:** users confusing permitted purchase with approved product. **Final implementation:** current code and regression tests preserve distinction. **Related decisions:** DEC-008; earlier WF-002 mandatory-package assumption narrowed.

## WF-008 — Local source to hosted HTTPS application

**Date:** 2026-09-12. **Module:** operations. **Workflow name:** development startup and Coolify delivery. **Evidence/status:** explicit current-session requests,7507416/ced3d3b and live checks; IMPLEMENTED.

**Previous workflow:** (1) open folder; (2) local first-run env setup; (3) browser stalled due missing static module; no current app deployed. **Requested change/reason:** load locally, push main to named repository, deploy in requested Coolify project/domain.

**New workflow:** (1) save valid local env and start with `--env-file`; (2) serve full browser module graph; (3) commit/push source while excluding credentials/databases; (4) Coolify builds Dockerfile from main; (5) runtime config/admin account and persistent volume; (6) HTTPS routing; (7) verify health, modules, auth and logout. **Steps added:** startup regression test, Git linkage, container/volume/TLS checks. **Steps removed:** none of business workflow. **Steps modified:** source available remotely; hosting replaces localhost-only access for live app. **Status changes:** deployment finished/running healthy; product UAT remains unconfirmed.

**Roles/users affected:** developers/administrators and app users. **Dependencies:** Node/Git/Coolify/DNS/TLS/Docker. **Calculations/reports affected:** none. **Data/database impact:** separate hosted persistent SQLite volume; no local transaction DB copied. **API impact:** same routes behind HTTPS with configured Origin/Secure cookie. **UI impact:** served module now loads login. **Backward compatibility:** local mode still works; no schema change. **Risks:** scheduled backup/recovery pending; container lacks admin scripts. **Final implementation:** `https://purchase.dvjassociates.com`, main, internal8000; manual Coolify deploy (auto-deploy disabled). **Related decisions:** DEC-009.

## WF-009 — Documentation becomes part of implementation

**Date:** 2026-09-12. **Module:** project governance. **Workflow name:** future development and change control. **Evidence/status:** current user master instruction; CONFIRMED and IMPLEMENTED by this documentation pass.

**Previous workflow:** (1) rely on conversation/scattered release docs; (2) implement change; (3) documentation continuity varies. **Requested change/reason:** persistent product memory prevents new features from reinventing design, calculations and rules.

**New workflow:** (1) read relevant six docs; (2) inspect existing reusable patterns/consumers; (3) distinguish idea/proposal/final decision; (4) evaluate material conflicts and alternatives; (5) follow confirmed choice; (6) implement consistently; (7) update affected docs/logs and verify in same cycle. **Steps added:** root entry instructions, explicit evidence/state classification, calculation/exception/debt records, append-only decisions/workflows. **Steps removed:** none of existing application flow. **Steps modified:** documentation is required implementation work. **Status changes:** introduced decision-state vocabulary, not app business statuses.

**Roles/users affected:** user, developers and future coding sessions. **Dependencies:** maintained Markdown and source/test evidence. **Calculations affected:** documentation contracts only. **Reports affected:** project change history. **Data/database impact:** none. **API impact:** none. **UI impact:** none. **Backward compatibility:** preserves current app. **Risks:** docs can drift if not updated; observation must not be mistaken for approved policy. **Final implementation:** AGENTS plus six linked memory docs and entry pointers. **Related decisions:** DEC-010.

## WF-010 — Supplier reference pricing with negotiation warnings

**Date:** 2026-09-12,0.4.0-alpha.7. **Module:** Pricing/Purchase. **Workflow name:** supplier price-list maintenance and PO auto-fill. **Evidence/status:** SW-0021/22, code/tests; IMPLEMENTED, key granularity extended by WF-006.

**Previous workflow:** (1) choose item; (2) manually enter negotiated unit price; no dedicated reference revision register. **Requested change/reason:** maintain independent RMB/CNY and USD supplier references while keeping PO negotiation possible.

**New workflow:** (1) save supplier/product/currency price with effective date/reference/remarks; (2) retain older superseded row; (3) retrieve latest eligible reference for PO; (4) warn on negotiated difference; (5) capture price revision/override in issued PO. **Steps added:** reference register/revisions and lookup warning. **Steps removed:** none; manual price remains possible. **Steps modified:** manual price starts from reference when available. **Status changes:** APPROVED current price, SUPERSEDED previous entries.

**Roles/users affected:** purchase creators/editors and PO manager approver. **Dependencies:** current price selector, line builder, domain money helpers. **Calculations:** CAL-11 comparison, same CAL-03 PO total. **Reports:** price history, PO warning and snapshot. **Data/database impact:** priceLists array and line reference snapshots. **API impact:** SAVE_PRICE_LIST plus existing PO commands. **UI impact:** Supplier price lists page and inline hints. **Backward compatibility:** later revisions never rewrite issued values; legacy item-key rows remain supported after base-key change. **Risks:** future-effective supersession and cross-currency mismatch unresolved. **Final implementation:** current warn-and-snapshot flow, base-driven through WF-006. **Related decisions:** DEC-011/007.

## WF-011 — Create sign-in users from Users & settings

**Date:** 2026-09-12. **Module:** Administration. **Workflow name:** account provisioning. **Evidence/status:** current user request; IMPLEMENTED.

**Previous workflow:** (1) obtain source checkout/database filesystem access; (2) fill a private user environment file; (3) run add-user CLI; (4) user signs in; (5) administrator adjusts scopes in settings. **Requested change:** provide user-access portal with user creation. **Reason:** administrators need an application-level way to create users, including deployments without bundled CLI scripts.

**New workflow:** (1) administrator signs in; (2) opens Users & settings and Create user; (3) enters name, unique email, existing role, 12–256 character password and confirmation; (4) selects divisions (administrator retains all-division access); (5) submits; (6) server checks authentication/permission/Origin/CSRF, validates fields and revision, and atomically writes profile, hashed credential and creation audit; (7) table shows new account and success message; (8) new user signs in using email/password. Validation/duplicate/stale failure leaves the form available and does not create an account.

**Steps added:** admin web form, safe account metadata list, password confirmation, inline validation and duplicate/stale handling. **Steps removed:** filesystem/CLI prerequisite for web provisioning; CLI remains an alternative. **Steps modified:** account creation audit records authenticated administrator and User access portal source. **Status changes:** new profile/account starts active; no changes to transaction statuses and no activation/deactivation action added.

**Roles/users affected:** ADMIN creates and lists account metadata; new users receive existing role/division powers. Non-admin roles cannot access credential resources. **Dependencies affected:** account store, shared role inventory, settings view, authentication middleware. **Calculations affected:** none. **Reports affected:** existing audit history includes USER_PROFILE_CREATED without credentials; no new report. **Data/database impact:** existing accounts/workspace/audit tables, revision increment; no schema migration. Duplicate/stale/invalid operations roll back fully. **API impact:** ADMIN-only GET/POST `/api/users`. **UI impact:** existing settings header action and shared form/modal; admin email/sign-in-status columns; existing scope controls preserved. **Backward compatibility:** CLI remains functional; old accounts/sessions persist; review mode cannot provision real users. **Risks:** manual password handoff; password reset/invitations/deactivation remain outside implementation.

**Final implementation/verification:** 97 native tests pass plus isolated browser account lifecycle, failure, mobile, permission and standalone-review checks. Test accounts exist only in temporary test databases. **Related decision:** DEC-012. Extends administration described in DEC-003 and hosting WF-008; does not replace their retained steps or scope-audit exception.

### WF-011 publication evidence — 2026-09-12

Published on explicit user request via the retained WF-008 deployment process: push main commit `8a96a27` → Coolify deployment `wawt555szxwx5ukuprnayjbe` → finished → live health, administrator sign-in/account metadata and desktop/mobile Create user form checks → sign out. The workflow is now available at https://purchase.dvjassociates.com/#/settings. Existing data volume/settings retained; no migration or test-account creation on the live database. Related DEC-012.

## WF-012 — Multiple evidence files in one workflow submission

**Date:** 2026-09-12. **Module:** shared evidence / supplier responses / Purchase / PLM / Shipping. **Workflow name:** select, upload and attach supporting files. **Evidence/state:** explicit user request; IMPLEMENTED.

**Previous workflow:** (1) open a response/document form; (2) choose one file in most forms, up to 8 MiB; (3) upload it; (4) submit one business command with fileId; (5) repeat a workflow action to supply another file. PLM revisions/complaints already had multiple selection but only the old limit and no whole-selection prevalidation/retry cache. **Requested change:** 50 MB per file and multiple uploads. **Reason:** users need several responses/documents attached at the same time.

**New workflow:** (1) open the existing form; (2) choose one or more files; (3) submit; (4) validate every selected file against the shared extension/50 MiB limit before writing; (5) upload each file with visible count progress and current workspace revision; (6) if a request fails, show error, keep selection, stop before the business command and reuse successful uploads on same-form retry; (7) after all succeed, send one command containing all fileIds; (8) validate every file's scope/order links and existing workflow conditions atomically; (9) preserve all attachments under one response/transaction and display individual downloads.

**Steps added:** collection prevalidation, sequential progress, retry reuse, submission guard, per-file domain checks and download collections. **Steps removed:** one-file picker restriction and repeated business actions merely to attach additional evidence. **Steps modified:** file maximum 8→50 MiB; body cap expands only for the file endpoint; primary fileId remains alongside fileIds. **Status changes:** none to approval/transaction progression; optional evidence stays optional. An incomplete upload set does not advance the business workflow.

**Roles/users affected:** existing authorized purchase editors and Product Managers; viewers remain unable to upload. **Dependencies affected:** picker, request transport, shared metadata validation, command records, audit/document lists and review IndexedDB. **Calculations affected:** file-size/base64 allowance only; no financial formula or approval rule. **Reports affected:** existing document/history views show the complete attachment set. **Data/database impact:** additive fileIds/ackFileIds on applicable JSON records, separate document rows/BLOB per file; no SQL migration. Individual upload commits/audits remain even if the final business command fails or the user abandons the form. **API impact:** file endpoint still accepts one base64 file; decoded limit50 MiB; evidence-bearing commands accept fileIds or legacy fileId. **UI impact:** shared Choose files, helper text, progress, inline failures and per-file download buttons. **Backward compatibility:** old files/scalar clients/issued history continue to work. **Risks:** memory overhead for large base64 requests; abandoned partial uploads require a future deliberate cleanup policy. Imports remain one validated source per commit.

**Final implementation/verification:** 102 native tests including exact50 MiB success,50 MiB+1 rejection, scope rollback and grouped workflow evidence; isolated browser checks for prevalidation, retry/no duplicate, multi-submit guard, mobile and standalone review. **Related decision:** DEC-013. Extends WF-001/002 evidence handling; retains WF-011 user-creation behaviour.

## WF-013 - Executive approval coverage through September 2026

**Replaced by WF-016.** Standard Manager/Product Manager approval eligibility resumes; historical workflow records remain.

**Date:** 2026-09-12. **Module:** Purchase/payments/PLM. **Workflow name:** temporary approval handoffs. **State/evidence:** IMPLEMENTED; user requested executive approvals and explicitly included Product Manager approvals. **Reason:** no Purchase Manager currently available.

**Previous workflow:** (1) executive creates/submits PO; (2) manager issues; (3) executive records/verifies PI; (4) manager approves; (5) executive submits artwork/product revisions; (6) Product Manager approves/rejects; (7) manager authorizes general payment milestones or corrects records; (8) assigned executive completes operations. Initial-payment/sample/price-list shortcuts remain independently established.

**Requested change:** executives can make all approvals until September end. **New workflow:** (1) keep creation/submission/verification/evidence; (2) active scoped executive or existing approver opens the existing action; (3) server checks command allowlist, persisted actor and window; (4) validate existing readiness/status/target scope atomically; (5) save approval with real-actor audit and DEC-014 metadata for delegation; (6) continue normal commercial/production/shipping/payment steps; (7) at 1 October 2026 00:00 IST, reject new executive-only delegated approvals and restore ordinary eligibility. Completed approvals remain valid.

**Steps added:** per-command temporal authorization, PLM target scope checks, policy audit metadata, deadline notice and open-page refresh. **Steps removed:** mandatory separate-manager handoff during the window; no readiness step removed. **Steps modified:** submitting or other in-scope executive may approve/return/reject; payment void remains a correction. New audit prose avoids falsely calling the actor a manager.
**Status changes:** none; submitted/issued/verified/approved/rejected/void retain meaning. **Roles/users affected:** EXECUTIVE gains listed approvals from 12 September 00:00 IST through 30 September; manager/product/admin retain rights; viewers/inactive/out-of-scope actors remain denied. **Dependencies:** shared domain helper, trusted server clock, session identity, revision transaction, UI and review builder.
**Calculations affected:** no finance/business-date formula change; permission window uses explicit IST inclusive start/exclusive end. **Reports affected:** audit gains policy metadata with actual executive actor. **Data/database impact:** additive event JSON only; no roles rewritten, schema migration or historical-event edits. **API impact:** same commands; client dates/roles never authoritative. **UI impact:** same actions plus deadline note; delegation controls disappear at expiry.
**Backward compatibility:** existing accounts/snapshots/approvals remain; stale browser cannot bypass server expiry. **Risks:** self-approval removes independent review during the exception; clock accuracy and manager coverage after expiry required.

**Final implementation/verification:** 11 delegated actions covered in domain tests; API checks expiry/forgery and persisted audit; 106 native tests pass. Complete Executive-only lifecycle: 37 browser checks. Server/review approval/expiry/mobile: 13 checks, zero runtime errors. Local source only; no live order created/approved. **Related decision:** DEC-014, B-15/EX-05.
**Replaces:** approval handoffs only in WF-001/002/004 until expiry; their other steps continue. Ordinary handoffs resume automatically. Later extensions must append WF/DEC records.

### WF-012 / WF-013 publication evidence

Published application commit **64e67648cdc1adc315f2b20c8c5d68bdc546db45** from main to https://purchase.dvjassociates.com through Coolify deployment **e7p6hs4p1eatsbhp3mvg71ql** (finished; application running:healthy). This publishes DEC-013/WF-012 multiple attachments with 50 MB per file and DEC-014/WF-013 temporary purchase/product approval delegation. The existing domain, Docker configuration and persistent data volume were retained; no migration or role rewrite.

Live verification passed 11 checks: HTTPS health, exact served app/domain source, administrator login/bootstrap, deadline notice, executive eligibility across all delegated actions using live profiles and the exact deployed policy, October 1 IST expiry, multiple-file/50 MB form, mobile notice fit, no runtime errors and no business-write requests. Logout completed. This was read-only verification: no live executive password login or approval transaction was performed. Full Executive-only transactions were already verified in the isolated browser workflow. Earlier local-only statements below are superseded by this publication record.

Ignored local verification report: test-output/september-release-live-report.json. Application expiry remains **1 October 2026 00:00 IST**; completed approvals remain valid.

## WF-014 - Change an existing user's role

**Date:** 2026-09-12. **Module:** Administration. **Workflow:** user-role maintenance. **Evidence/state:** IMPLEMENTED from explicit user request.
**Previous workflow:** create account with role; role stays fixed in web UI; only division checkboxes can change. **Requested change:** switch Executive to Manager or another supported role. **Reason:** administrators need staffing flexibility without replacing accounts.
**New workflow:** (1) admin opens Users & settings; (2) selects Change role on another user's row; (3) reviews current role, selects new role and supplies reason; (4) server validates admin/target/role/scopes/revision; (5) atomically updates profile and appends audit; (6) existing user sessions enforce the current persisted role on subsequent requests.
**Steps added:** role-edit dialog, reason, profile command, USER_ROLE_CHANGED audit. **Steps removed:** need for account recreation/manual database editing for a role change. **Steps modified:** portal now manages role as well as existing divisions.
**Status changes:** no account-active/order status changes. **Roles affected:** ADMIN can edit others; all supported target roles retain existing permission definitions. **Dependencies:** shared domain, current session profile, revision transaction and UI helper reuse. **Calculations:** none. **Reports:** role history identifies admin/target/old/new/reason. **Data/database:** profile role and appended event only; no schema/account/password/ownership changes. **API:** existing /api/commands accepts CHANGE_USER_ROLE. **UI:** Change role action with role select/reason; no own-role button. **Compatibility:** credentials and IDs remain valid; open pages may need refresh to show new role, while server enforcement is immediate. **Risks:** privilege elevation and lockout; admin authorization and self-change block apply.
**Final implementation/verification:** isolated API tests cover promotions/demotions in existing sessions, rejected unauthorized/invalid/stale/self edits and immutable credentials; browser checks cover server/review/mobile and non-admin visibility. **Related decisions:** DEC-015, extends WF-011; WF-013 temporary approvals remain unchanged. Local source only.

### WF-014 publication evidence

Application commit **dd8656cb02c7ea47aa45eb29143270095aa21e87** deployed from main to https://purchase.dvjassociates.com via Coolify deployment **heiuia7nadcjjtlvrxiaktdc** (finished; running:healthy). This publishes DEC-015 / WF-014 administrator role editing. Existing domain, persistent data volume and application configuration retained.

**12 live checks passed:** HTTPS health, exact served app/domain source, administrator settings, self-role protection, current role/five supported choices, Purchase Manager selection, required reason, mobile layout, cancellation preserving the original role, no role/business writes and no browser runtime errors. Administrator logged out after checking. No live role or PO was changed. Actual promotion/demotion and existing-session enforcement were already tested in the isolated suite (108 native tests, 11 browser checks).

Use Users & settings > Change role on another user's row. Earlier local-only/unpublished role-editing notes below are superseded by this deployment. Bulk deletion/serial-number work is not included. Ignored verification artifact: test-output/role-editing-live-report.json.

## WF-015 - Select, delete and restore POs with durable serials

**Date:** 2026-09-12. **Module:** Purchase administration. **Workflow:** recoverable bulk removal and numbering. **State/evidence:** IMPLEMENTED from user request; non-reuse/non-renumber confirmed, retained records/separate serial default communicated.
**Previous:** open pipeline, inspect individual POs; no delete selection or stable display serial. **Requested:** select/delete multiple and maintain continuous allocation with deleted gaps. **Reason:** admin cleanup and traceable numbering.
**New:** (1) initialize existing serials once with backup/audit; (2) admins select rows or current page, optionally across pages; (3) Delete selected lists every chosen PO and retained balances; (4) enter reason and confirm; (5) server validates full selection/revision then marks and audits; (6) active queues exclude deleted POs, finance retains them; (7) admin chooses Deleted orders to inspect/download or restore selected records with reason/confirmation; (8) restoration resumes prior stage/serial. New POs consume next high-water serial.
**Added:** selection, confirmation, deletion markers/read-only detail, restore, persistent serial/counter, migration backup/audit. **Removed:** none of the existing approval/evidence gates. **Modified:** active queries exclude deleted records; financial queries retain them. **Statuses:** operational status unchanged; deletion is separate metadata.
**Roles:** ADMIN deletes/restores; scope-authorized users retain relevant financial/history reads. **Dependencies:** domain/store/API/track-preview/UI/CSV. **Calculations:** balances and milestones unchanged; serial allocation is monotonic, not a financial formula. **Reports:** active operations exclude deleted; financials retain original obligations with Deleted badge. **Database:** additive metadata/counter, appended audit, private pre-migration backup; no physical deletion/schema rewrite. **API:** existing command endpoint; deleted targets reject further writes/uploads/imports. **UI:** checkboxes, S.No., Active/Deleted selector, reason/confirmation and restore.
**Compatibility:** existing PO numbers/snapshots/payment links preserved. **Risks:** deletion is not contractual cancellation/write-off; retained data uses storage. **Implementation/verification:** native and 31 server/review browser checks, exact retention/restore/mobile/concurrency guards; backup read verified. **Related:** DEC-016, B-17/B-18. No live order deletion performed by deployment.

## WF-016 - Restore standard approval handoffs

**Date:** 2026-09-12. **Module:** Purchase/payments/PLM. **Workflow:** approval eligibility. **State/evidence:** IMPLEMENTED following removal of September rule; ending the grant was communicated.
**Previous:** executives could approve/reject within scope during September, including their submissions. **Requested:** remove September rule. **Reason:** return to Manager/Product Manager access rather than time-based delegation.
**New:** (1) executive submits/verifies using established permissions; (2) scoped Manager/Admin performs purchase approvals and general payment authorization/correction; (3) Product Manager/Admin performs technical/artwork/brand approvals; (4) executive continues assigned operations. Standard permissions apply regardless of date.
**Added:** ordinary approval handoffs restored. **Removed:** temporary executive grant, time checks, deadline notice/timer and new delegation annotations. **Modified:** action eligibility only. **Status changes:** none; completed delegated approvals persist. **Roles:** EXECUTIVE loses only the DEC-014 grant; actual manager/product/admin roles retain rights. **Dependencies:** shared permission map, command checks, UI/tests. **Calculations:** none. **Reports:** prior policy events retained, new events use actual approver without temporary metadata. **Database:** no account role or prior record rewrite. **API:** same endpoints; stale Executive attempts deny. **UI:** standard approval buttons by role, no September notice. **Compatibility:** historical approvals/snapshots intact. **Risks:** existing accounts may need admin-assigned manager roles.
**Verification:** native forged-date/identity denials; 13 server/review approval checks; full workflow 37 checks with manager/product handoffs. **Decision:** DEC-017. **Replaces:** WF-013 approval eligibility; existing executive initial-payment/sample exceptions remain.

## Admin/order release live publication - 2026-09-12

Application commit **cc08c5de04bf3ccc1e6ed1a065cebee95039c4b7** is live at https://purchase.dvjassociates.com through Coolify deployment **iofjlpttbwbeibjdbyxb698s** (finished; application running:healthy). This publishes DEC-016/017 and WF-015/016: admin bulk deletion/restoration, permanent independent serial numbers and withdrawal of the September Executive approval delegation. Existing administrator role editing remains available. This record supersedes earlier source-only/pending-publication statements for these features.

**19 live checks passed**, including HTTPS health, exact served app/domain/shipping source, serial initialization audit, serial column, Deleted orders, required deletion reason/confirmation, mobile layout, role editor and absence of the September notice. Exact deployed policy rejects the withdrawn Executive approval powers; this policy check used live profiles plus an in-memory scoped test profile, not a live Executive login. No business or role writes and no browser runtime errors occurred during verification; the deletion dialog was canceled and the administrator logged out.

All original orders and prior audit entries were retained. One concurrent user evidence upload/technical confirmation was reconciled against its audit events separately from the serial migration; original order content, payments, users and pre-existing file metadata otherwise matched the predeployment fingerprints. Serial migration is idempotent and creates a pre-initialization SQLite backup beside the database before updating metadata. No live order was deleted, restored or approved by deployment verification.

Release validation also passed **110 native tests**, **31 bulk-order browser checks**, **13 approval-role browser checks** and **37 full-workflow browser checks**. Ignored local live evidence: test-output/admin-release-live-report.json and test-output/admin-release-concurrent-check.json. Historical workflow completion reports remain separate from this deployment.

## WF-017 - Maintain approval-stage permissions

**Date:** 2026-09-12. **Module/workflow:** Administration / approval coverage. **State/evidence:** IMPLEMENTED from user's explicit request.
**Previous workflow:** (1) login under fixed role; (2) submit/verify purchase; (3) hand off to fixed Manager/Product Manager approver; (4) request a code or account-role change when coverage is unavailable. Sample/initial-payment shortcuts follow editor access.
**Requested change/reason:** a window listing every approval stage to make temporary relaxations and later restore access without code changes.
**New workflow:** (1) Admin opens Users & settings > Manage approval controls; (2) reviews all 13 stages/current roles; (3) selects Manager, Product Manager or Executive per stage, with Admin always retained; (4) reviews self-approval/scope/persistence impact; (5) enters reason and confirms; (6) server validates role, complete matrix and current workspace revision; (7) atomically saves controls and before/after audit; (8) next approval requests use stored permissions and all existing readiness gates; (9) Admin later edits or chooses Restore standard roles, reviews, supplies reason/confirms and saves again.
**Added:** matrix window/history, shared catalog, validated settings command and per-approval policy revision. **Removed:** need to deploy source for each coverage change. **Modified:** role eligibility is configurable; sample/initial-payment shortcuts use explicit controls. **Status changes:** no workflow statuses changed; existing approved records stay approved.
**Roles/users affected:** Admin controls settings; selected active roles approve within assigned scope; sample/initial Executive access remains assigned-order only; Viewer never approves. **Dependencies:** domain/UI/store/session/build. **Calculations affected:** none. **Reports affected:** settings before/after audit and approval policy revision. **Data/database impact:** additive optional workspace metadata, no schema migration/account rewrite; existing absence uses defaults. **API impact:** SAVE_APPROVAL_CONTROLS via existing command endpoint with expected revision/CSRF/session. **UI impact:** settings panel and shared edit modal, effective roles and history; separate technical approve/reject visibility.
**Backward compatibility:** old workspace and historical approvals unchanged; stale UI requests are checked against server's current matrix. **Risks:** temporary grants do not expire automatically; scoped self-approval permitted and disclosed. **Final implementation/verification:** controls tested server/review/mobile, default restore and session revocation; three configured Manager-only flows complete through port arrival/settlement. **Related decisions:** DEC-018/B-20; extends WF-016 standard-role baseline. No live grants or workflow transactions performed.

## Approval controls live publication - 2026-09-12

Application commit **36a0198304ec3c1f723f9fcb4aabe0376b2018f8** deployed to https://purchase.dvjassociates.com through Coolify deployment **evhfg1nzclwtzvfdlfsedofd** (finished; application running:healthy). This publishes DEC-018 / WF-017 / B-20. Earlier local-source/unpublished notes for these controls are superseded by this publication record. Domain, runtime configuration and persistent data volume retained; no schema migration or live role/policy rewrite.

**15 live checks passed:** HTTPS health, exact served app/domain source, Admin entry, all 13 stages, current-policy role selections, fixed Admin/Viewer restriction, required reason, confirmation/persistence guidance, selecting Manager artwork coverage, restore-form behavior, mobile fit, cancellation preserving controls, no business/settings/user/file writes and no browser runtime errors. Administrator logged out. The verification only edited and canceled a draft form; no live approval relaxation was saved.

Use Users & settings > Manage approval controls, select role permissions, provide a reason, confirm and save. Changes stay active until edited/restored; Admin retains access. Release validation also passed 115 native tests, 29 server/review controls browser checks and 55 full-flow checks covering three configured Manager-only purchases through port arrival and SETTLED with zero balance. These synthetic workflow transactions were isolated, not live business activity.

Ignored live report: test-output/approval-controls-live-report.json. Local mobile evidence: D:/CodexTestTemp/FarmingHub/approval-controls-live-mobile.png.

## WF-018 - Filter and sort the PO pipeline

**Date:** 2026-09-12. **Module/workflow:** Purchase / pipeline exploration. **Evidence/state:** IMPLEMENTED from user's Excel-like supplier/serial viewing request.
**Previous workflow:** (1) open pipeline; (2) search or select stage; (3) navigate original-order pages; (4) export filtered records. No explicit supplier selector or sorting.
**Requested change/reason:** find supplier POs and arrange them by supplier or serial without exporting first.
**New workflow:** (1) open active/deleted pipeline; (2) select supplier, optional stage/search; (3) click Supplier / item, S.No. or Purchase order header to toggle order, or use Sort orders; (4) read globally sorted pages/board; (5) export the same full sorted result; (6) Reset view to clear filters/sort and restore original order.
**Added:** exact supplier selection, sort headers/dropdown/indicators, reset, visible supplier name and final CSV name column. **Removed:** nothing from business workflows. **Modified:** sorting/filter changes clear selection and reset page; supplier/name/code viewing and CSV ordering. **Status changes:** none. **Roles affected:** all scoped pipeline readers; Admin retains exclusive bulk controls. **Dependencies:** shared UI list calculation, pagination, board, export. **Calculations:** numeric serial comparison only; no financial/serial allocation formula change. **Reports:** CSV includes supplier name and respects visible sort/filter across pages. **Data/database:** no writes or migration. **API:** no new endpoint/command. **UI:** existing toolbar/header patterns, mobile selects, keyboard focus and aria-sort.
**Backward compatibility:** Original order default; same PO numbers/serials and original CSV columns; existing board-lane coverage retained. **Risks:** duplicate supplier names and hidden selection; use ID filters and clear selection. **Final verification:** server/review 52 view checks and 31 bulk regression checks; stored state unchanged by view actions, startup/build pass. **Related decision:** DEC-019 / UX-12; extends WF-015 viewing without changing deletion workflow.

## Pipeline sorting live publication and requested test batch - 2026-09-12

Application commit **db6978cc249c7d8b039c34cdbceee4bedc7daea0** is live at https://purchase.dvjassociates.com through Coolify deployment **6fwkw5g3hzfiqxrq1bqry7me** (finished; application running:healthy). This publishes DEC-019 / WF-018 / UX-12. Earlier local-only statements for sorting are superseded by this record. Existing domain, runtime configuration and persistent volume retained.

The user explicitly requested ten test records across many suppliers on the published build. Created **TEST-SORT-001 through TEST-SORT-010** through authenticated Admin CREATE_ORDER commands in the live pipeline, across ten existing eligible supplier records. All are clearly labelled synthetic TEST DRAFTS, with varied quantities/prices, unsubmitted/unapproved and no PI, payment authorization, shipments or documents. The batch uses ordinary automatic serial allocation; deleting these drafts later will leave their serials unused under B-18. Test drafts are owned by the creating administrator and remain editable by scoped Purchase Managers.

This was an explicit one-time data action, not automatic build/startup seeding. The private local provisioning runner checks batch-number/notes identity, prevalidates draft payloads through the domain, uses current optimistic revisions and avoids duplicates on retry. Normal clean initialization remains unchanged; no private database or test artifact is included in the image/Git.

**8 batch verification checks passed:** exactly ten identified drafts/ten suppliers; no approvals/operations; distinct automatic serials; pre-existing order records unchanged; payments/users/approval controls unchanged; original audit prefix retained; new creations auditable. **16 live browser checks passed:** HTTPS/source match, controls, all ten visible through TEST-SORT- search, numeric serial ascending/descending, alphabetical supplier sorting, exact supplier and stage filtering, mobile fit, reset, no browser-write requests or runtime errors. Browser verification was read-only after the separately authorized creation batch; administrator logged out.

Release tests: 52 sorting browser checks, 31 bulk regression checks, native startup test and review build passed. Ignored artifacts: test-output/live-pipeline-test-batch-report.json and test-output/pipeline-sort-live-report.json. Screenshot: D:/CodexTestTemp/FarmingHub/pipeline-sort-live-test-orders.png. To find the live batch, search TEST-SORT- in Order pipeline.

## Theme experiment observation - 2026-09-12 (DEC-020; no workflow change)

A separate local A/B theme prototype was requested and built. Business workflows, stages, permissions, APIs, stored production records and released UI remain unchanged. General explanation visibility, expandable full timeline/secondary actions and short transitions are proposed only inside that sample. No WF ID is consumed because there is no approved production workflow change. Append a new WF record if a later confirmed adoption changes an established interaction/workflow.

## GAJA guide experiment observation - 2026-09-12 (DEC-021)

Optional presentation sequence: choose Guide me > read the highlighted current-page step > Next/Back > Finish, Skip or Escape > return to the page. Reopening restarts; navigating away or opening a business dialog closes stale guidance. All business stages, approval roles, calculations, records and APIs are unchanged. This extends the local sample only; no production workflow is replaced and WF-019 remains available for a confirmed production workflow change.

## Persistent instruction guide observation - DEC-024, 2026-09-12

Local sample help flow now works in forms: tap the persistent mascot > read the current error/missing field or next order action > choose Take me there > continue at the highlighted control yourself. Back/Next/Skip/Finish/Escape remain. The previous hidden launcher is replaced locally; typed data, approval stages, statuses, finance, permissions and APIs are unchanged. No AI provider is connected. This is still the local presentation experiment, not a production workflow replacement; WF-019 remains available.

## WF-019 - Consistent pipeline visibility, planning feedback and existing access checks

**Date:** 2026-09-12. **Module/workflow:** Purchase pipeline, draft planning, tracking import, master maintenance and startup. **Evidence:** confirmed bug-fix instruction; implemented locally, not deployed. **Related decision:** DEC-025.
**Previous workflow:** 1. Filter POs in Table. 2. Switch to Board and lose orders in omitted stages. 3. Read incomplete Overview totals. Drafts compared base-day hints against a different server reference. Tracking import checked general import access, then updated every matching PO. Ordinary item/vendor saves could bypass approval/identity boundaries. Startup failures always showed login.
**Requested change/reason:** fix the identified issues while retaining business rules; preserve Show page guides in Minimal.
**New workflow:** 1. Filter/sort the same visible PO set. 2. View all records exactly once in Board groups and consistent Overview totals. 3. Draft hints follow the existing item maximum, supplier fallback and 30-day fallback rule; quantity changes refresh the reason field without replacing focused inputs. 4. Preflight every matched tracking PO against the caller's existing editing authority, then commit the complete permitted batch. 5. Validate scoped master targets and final vendor identity; item saves remain pending until the existing approval command. 6. Login on HTTP 401; other bootstrap failures offer Try again.
**Steps added:** batch preflight, final normalized-identity checks and non-authentication startup retry. **Steps removed:** no legitimate business step; unauthorized bypass paths removed. **Steps modified:** display grouping, planning hint source, data projection and error presentation. **Status changes:** no new domain status or transition; all current status labels are grouped. **Roles/users:** all users gain accurate displays; existing executive ownership and division restrictions are enforced on imports; no new approver grant.
**Dependencies/calculations:** existing permission helpers and unchanged productionReferenceDaysForOrderInput. No financial formula changes. **Reports:** Overview grouping now accounts for every visible order; CSV sorting and columns unchanged. **Data/database:** no migration or historical rewrite; rejected commands leave state unchanged. **API:** same endpoints/payloads; out-of-scope projections are filtered, unauthorized commands rejected. **UI:** populated Vendor master loads, sidebar scrolls on short screens, retry screen uses existing controls. **Backward compatibility:** crafted bypass requests are intentionally rejected; valid client workflows remain. **Risks:** mixed authorized/unauthorized imports now reject entirely; users must submit a permitted set or have an authorized editor process it.
**Final implementation/verification:** native and server/review browser checks recorded in current reports. This corrects WF-018's inherited incomplete Board coverage; the filtering/sorting workflow remains. Local mascot/minimal theme is still a prototype and Show page guides stays visible. **Replaces:** only defective paths described above; no completed approvals or historic WF records replaced.

## WF-020 - Adopt minimal presentation and persistent step guidance

**Date:** 2026-09-12. **Module/workflow:** global navigation/forms and contextual order guidance. **Decision/evidence:** DEC-026, explicit publication request. **Previous:** live original theme with full explanatory text; sample-only mascot. **Requested change/reason:** publish the reviewed build for a quieter workspace with optional guidance.
**New workflow:** 1. Open the authenticated workspace in Minimal. 2. Choose Current for the earlier presentation or Show page guides to restore explanations. 3. Open collapsed workflow/secondary actions when needed. 4. Tap Guide me for the current page, rendered order action or unfinished form. 5. Use Back/Next or Take me there to return focus and perform the action yourself. Appearance preference survives refresh; no automatic help popups.
**Steps added:** optional presentation toggle/disclosures and authored help. **Steps removed:** no business step; test-only replay/sample notice excluded. **Steps modified:** explanatory chrome defaults and presentation timing. **Status changes:** none. **Roles/users:** all existing roles see only their rendered available controls; help grants no access. **Dependencies:** real app DOM, validity, default brand, three pose assets. **Calculations/reports:** unchanged; DEC-025 consistency fixes included. **Data/database:** no migration, synthetic seed transfer or business writes. **API:** static asset allowlist additions only, no AI endpoint. **UI:** approved minimal CSS, short animations, reduced-motion support, always-visible mascot and Show page guides. **Backward compatibility:** Current presentation remains selectable, existing URLs/forms/actions persist. **Risks:** overlays, focus and mobile clipping; verified in server and review before release. **Final implementation:** web/ runtime plus normal standalone bundle; test/report references updated. **Replaces:** earlier local-only presentation limitation in DEC-020/024; preserves historical records.

## WF-021 - Capture a separate BOC reference during remittance and receipt

**Date:** 2026-09-12. **Workflow/module:** payment recording and supplier realization. **Evidence/decision:** explicit request and confirmed optional-reference answer; DEC-027. **Previous:** record Indian-bank rate and order conversion, then separately record actual supplier amount/rate. **Requested change/reason:** clearer currency labels and optional supplier-side BOC comparison.
**New steps:** 1. Enter USD to INR (Indian bank), or the matching selected currency pair. 2. Optionally enter USD to RMB (BOC) for a USD remittance. 3. Save the same amount/allocations and evidence under existing guards. 4. Read the reference in the remittance/PO allocation tables. 5. Record the actual supplier receipt separately, retaining or overriding/clearing its BOC reference; corrections still need a reason.
**Steps added:** optional BOC capture/display. **Steps removed:** none. **Steps modified:** labels and optional receipt metadata. **Status changes:** none. **Roles:** existing editors/initial-payment approval controls. **Dependencies:** toRate and existing payment commands, FormData and rate helpers. **Calculations:** none changed; reference is not multiplied into payment or receipt totals. **Reports:** additional reference column in both payment tables; absent values show a dash. **Data/database:** nullable optional payment/allocation attribute; no migration/backfill. **API:** existing commands accept optional bocUsdRmbRate; invalid precision/non-positive or non-USD nonblank values reject atomically. **UI:** labelled numeric optional field, USD-only, six decimals, native responsive grids. **Backward compatibility:** missing new field accepted; old receipt clients preserve existing allocation override. **Risks:** confusing reference with actual conversion mitigated by short reference-only hint; stale non-USD fields cleared before form replacement. **Implementation/verification:** domain invariants and native/review browser capture, correction, visibility and mobile checks in current report. **Related decision:** DEC-027. **Replaces:** generic per-unit payment label wording only. Local build, not deployed.

## WF-022 - Repair form overlay presentation during payment release

**Date:** 2026-09-12. **Module/workflow:** global forms, guide and notifications. **Decision/evidence:** DEC-028, confirmed fix/publish request. **Previous:** opening a tall form on mobile could put its heading behind appearance controls; notifications could meet the mascot dock. **Requested change/reason:** usable rebuilt forms before publication.
**New workflow:** open the same form with heading/close button above background appearance controls; keep the mascot available; continue saving/cancelling and receiving existing notifications. **Steps added/removed:** none. **Steps modified:** overlay order/notification spacing only. **Status, roles, dependencies:** existing roles/statuses; CSS layers and native guide remain. **Calculations/reports/data/database/API:** unchanged. **UI:** modal z-index 270, dock 300, toast bottom 94px. **Backward compatibility:** appearance toolbar remains on pages but is behind the active modal. **Risks:** layering/focus checked on native server and standalone with persistent guide. **Final implementation:** support.css and rebuilt review; mobile hit-test and guide regression recorded. **Related decisions:** DEC-027 released alongside DEC-028. No historical workflow record removed.

## Record template - next WF-024

**Date:**
**Workflow Change ID:**
**Module:**
**Workflow name:**
**Evidence / decision state:**
**Previous workflow (ordered steps):**
**Requested change:**
**Reason for change:**
**New workflow (ordered steps):**
**Steps added:**
**Steps removed:**
**Steps modified:**
**Status changes:**
**Roles/users affected:**
**Dependencies affected:**
**Calculations affected:**
**Reports affected:**
**Data/database impact:**
**API impact:**
**UI impact:**
**Backward compatibility concerns:**
**Risks:**
**Final implementation / verification:**
**Related decision IDs:**
**Replaces / Replaced by:**

When a later change supersedes only part of a workflow, say which steps are replaced and which continue. Leave unavailable historical details explicitly unknown.


## WF-023 — Expose existing setup and correct next-step guidance

**Date:** 2026-09-12. **Module/workflow:** LAE purchase progression, product/ERP setup, freight import. **Evidence:** user-requested pre-soft-launch QA and DEC-029; live Ashok reproductions plus isolated parser regression. **Previous workflow:** (1) create/approve PLM product, (2) no ERP creation control available, (3) new product cannot produce PO lines. Shipping previously (1) plan part quantity, (2) complete required shipment documents through secondary Shipping controls while header keeps proposing another shipment. Missing logistics offered only an empty required picker. Freight preview extracted the first positive-looking numeric substring.

**Requested change/reason:** fix blockages and misleading guidance while preserving approved rules. **New workflow:** (1) create PLM base, (2) use Add ERP item on product/library, (3) select explicit base/brand and save pending brand requirements, (4) approve using configured authority, (5) create PO using established quantities/specification selection. For shipping, existing shipment's required step is the primary action; optional further shipment remains available in Shipping. An empty logistics list directs authorized staff to Vendor master. Rate import still follows preview then explicit commit, now rejecting malformed/negative input instead of changing its meaning.

**Steps added:** access to existing ERP setup and explanatory recovery. **Steps removed:** none. **Modified:** primary guidance priority and numeric input validation. **Status changes:** none in domain; factual display corrected. **Roles affected:** existing authorized item creators/managers; no new grants. **Dependencies:** explicit brand/base mappings, approved brand delta, active LOGISTICS master, existing shipping evidence gates. **Calculations:** fee threshold/benchmark/financial formulas unchanged; parsed numeric amount now faithfully represents valid input. **Reports:** task attribution and freight preview accuracy improve. **Data/database impact:** new/edited SKU derives two existing metadata fields; no migration/backfill or historical record rewrite. **API impact:** existing commands and payloads; no new endpoint. **UI:** shared buttons/forms/notes, no redesign. **Backward compatibility:** owner fallback retained; legacy items/rates remain untouched; invalid future freight input rejected. **Risks:** local/review and live verification must remain distinguishable; a real forwarding agent is still required before operational launch. **Implementation/verification:** local fixes with targeted native/browser regressions; publication status in QA_RELEASE_READINESS.md. **Related decision:** DEC-029. No earlier history removed.


**WF-023 follow-up:** after entering brand quantities, Save validates every requested positive brand mapping before creating/editing a draft. Missing mapping retains the form and explains setup; zero-quantity brands remain optional. No server financial formula or approved-PLM policy changed.


**WF-023 audit follow-up:** Update commitment continues to accept a new promise and remarks; its selected reason now appears in the same append-only event. No new workflow step, mandatory legacy field, recalculation or history rewrite. Issued technical-package guidance states the snapshot’s missing-PLM fact.


**WF-023 continuation — guide obstruction:** no business step changed. Previously the fixed guide intercepted bottom pagination clicks in Minimal. Main content now has enough bottom scroll space for normal mouse/keyboard pagination while the guide remains visible. No added approval, state, API or database impact. Related DEC-029 / BUG-009; local browser verification covers both runtime modes/themes and desktop/mobile. Live release remains pending.


**WF-023 continuation — import preview recovery:** Previously a bad replacement could leave an older file ready to commit, and duplicate Ref/route rows were not rejected. New flow: choose file → clear prior preview → parse → show row errors → correct duplicate keys/required fields → explicitly commit. Closing or replacing invalidates pending reads; report date/week survives redraw. No business record changes during preview. Server rejects duplicate and empty normalized batches. Existing correction history and baseline tracking dates remain; no roles/statuses/calculations/reports change except validation-export explanations. Risk/trade-off: identical duplicate rows now need removal. Related DEC-029 / BUG-010–012; verified locally in both runtime modes.


**WF-023 continuation — bank-rate review:** register now displays the recorded rate precision through the existing formatter. Input/save/receipt sequence, permission, schema, conversion formula and original-order balance do not change. Related DEC-029 / BUG-013. TD-06 date-range observations are proposals only, with no implemented workflow change.


## WF-024 — Manager-owned purchase flow and setup recovery

**Date:** 2026-09-13. **Module/workflow:** LAE Import purchase from supplier/product setup to settlement. **Requested change/reason:** every Purchase Manager must operate independently; resolve the identified setup/approval blockages before soft launch. **Previous:** (1) Manager prepares product/PO, (2) missing technical Reject or product approval grants require another approver, (3) new product/upload and benchmark gaps require external setup, (4) continue normal purchase/production/shipping/payment gates.

**New:** (1) Admin reviews/saves Independent Manager preset once; (2) Manager verifies all 13 stages in Your workflow access; (3) maintains suppliers, imports/mappings, technical/brand/artwork approvals and prices; (4) creates/issues PO and completes confirmations, payments, sample/bulk QC; (5) records a supplied quote if benchmark missing and resumes booking; (6) completes shipment/BL/insurance/arrival and actual-receipt settlement.

**Steps added:** explicit preset, read-only access summary, vendor/price preview/commit, item mapping action, vendor audit visibility, quote-evidence recovery. **Steps removed:** recurring Product Manager handoff when the Manager grant is enabled. No business evidence/QC step removed. **Modified:** approval copy and setup entry points. **Status changes:** none; existing pending/approved/rejected and shipment/finance statuses retained. **Roles/users affected:** every active MANAGER in LAE Import, including Ashok/Suresh only if their actual accounts have that role/scope. Admin-only controls/deletion and other existing grants remain.

**Dependencies affected:** source master/quote files, approvalControls, supplier/base/ERP mapping, existing save commands. **Calculations affected:** none; imported prices reuse money precision and supplied freight uses existing O/F plus agent charge. **Reports affected:** source batch/history and access views; original QA ledger remains historical live evidence. **Data/database:** optional priceImports and appended vendor/import/audit records; one atomic revision per batch, no historical rewrite/schema migration. **API:** COMMIT_MASTER_IMPORT added under authenticated command endpoint; all other commands retained. **UI:** shared forms, buttons, tables, previews and source downloads, mobile layout preserved. **Backward compatibility:** restorable standard approvals remain; no startup grant overwrite; existing issued records untouched. **Risks:** self-approval relaxation is intentional, live deployment/policy save required, genuine quote/evidence still required. **Final implementation/verification:** local tests and current evidence in QA_EXECUTION_REPORT.md. **Related decision:** DEC-030; extends WF-017/023 rather than erasing their histories.
