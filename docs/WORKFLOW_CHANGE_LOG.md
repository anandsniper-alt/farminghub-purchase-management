# Workflow change log

Started 2026-09-12. Historical records are reconstructed from sources, not invented user discussions. A version date is not independent management approval. Preserve previous records; use `Replaced by WF-...` for replacement and reference the successor. Current flow lives in the [baseline](CURRENT_PRODUCT_BASELINE.md); policy/rationale lives in [decisions](DECISION_LOG.md).

## WF-001 — Initial controlled LAE Import purchasing

**Date:** 2026-09-11. **Module:** Purchase/system. **Workflow name:** authenticated order execution. **Evidence/status:** historical SW-0001..0008, source/tests; IMPLEMENTED and later extended by WF-002..007.

**Previous workflow:** no previous executable Purchase flow is present in supplied history; cannot reconstruct an earlier manual business process. **Requested change/reason:** initial working LAE Import purchase alpha with controlled execution and visible history.

**New workflow:** (1) authenticated/scope-bound user creates draft; (2) submit/manager issue; (3) PI/payment/production/artwork/shipment controls; (4) actual port arrival and independent settlement; (5) corrections retain history. **Steps added:** order drafts, approvals, documents, payments, follow-ups, shipments, audit. **Steps removed:** none evidenced. **Steps modified:** none evidenced before initial build. **Status changes:** initial draft/pending/issued and derived operational/financial states introduced.

**Roles/users affected:** ADMIN, MANAGER, EXECUTIVE, PRODUCT_MANAGER, VIEWER with scoped/assigned authority. **Dependencies affected:** native server, Store, shared commands and UI adapters. **Calculations affected:** integer money/FX, payment slices, date/quantity/status helpers. **Reports affected:** pipeline, tasks, payments, PO print/history. **Data/database impact:** workspace JSON, append-only audit mirror, accounts/sessions/evidence. **API impact:** authenticated bootstrap/commands/files. **UI impact:** shared shell and modal actions. **Backward compatibility:** no earlier native schema migration documented. **Risks:** pilot assumptions are not management sign-off. **Final implementation:** active domain/server/UI architecture, subsequently revised as recorded below. **Related decisions:** DEC-001/003.

## WF-002 — Integrated product lifecycle control

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

## Record template — next WF-012

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
