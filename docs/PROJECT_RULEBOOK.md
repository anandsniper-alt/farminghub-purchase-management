# Project rulebook

**GLOBAL RULE — persistent guide clearance (DEC-029 QA follow-up):** page-bottom actions must remain reachable by ordinary pointer and keyboard input while the mascot stays visible. Reserve scrollable content space for the dock and device safe area. Do not solve overlap by hiding the guide or bypassing click hit-testing. Verify both Current/Minimal and desktop/mobile.

## Current approved presentation - DEC-026 / WF-020 (2026-09-12)

The user's publication request approves production adoption of the reviewed Minimal theme, animations and persistent Farming Hub mascot guide. This supersedes earlier local-only/adoption-pending notes below for this presentation. Runtime files live in web/; the prototype remains historical test material. Default Minimal, retain Current choice and Show/Hide page guides in the fixed appearance toolbar. Keep colors/fonts/logo and reduced-motion support. Help is authored, never an AI chat, and Take me there only focuses the existing control. Live identity/data/approval logic remain authoritative; do not deploy the sample seed or test-only replay controls.


## Theme experiment boundary - DEC-020

**GLOBAL preservation rule remains:** the user's request to build/test a sample does not authorize production theme replacement. Prototype files are isolated under prototypes/minimal-theme, excluded from the runtime/build/Docker deployment paths. Compare Current/Minimal against synthetic state in separate browser storage; keep warning/error/required-field/financial/permission behavior intact. Production adoption, rejection or partial adoption needs the user's review decision and a subsequent decision/workflow record. No business workflow changed in this experiment.


## UX-12 - Pipeline supplier filter and sorting (DEC-019 / WF-018)

**MODULE-SPECIFIC RULE: PO pipeline.** Reuse one filteredOrders result for table pagination, current-page selection, board lanes and CSV export. Apply active/deleted and scope visibility, exact supplier ID, existing stage and substring search first; sort the complete result before slicing 12-row pages. Supplier choices show name/code and include suppliers represented in the visible active/deleted list, without stage/search narrowing the choices.

Keep Original order as default. Supplier sorting uses name A-Z/Z-A, case-insensitive natural text comparison, with ascending permanent S.No. for ties. S.No. sorts numerically in either direction; manual PO number sorts naturally (PO-2 before PO-10). Missing sort values go last; serial/ID tie-breakers keep results deterministic. Do not mutate persisted order arrays or renumber records.

Headers toggle ascending/descending and expose aria-sort; toolbar Sort orders provides the same choices for mobile/board. Supplier/sort/search/stage changes reset page and clear bulk selections; switching active/deleted clears supplier filtering; route/role changes reset pipeline filter/sort. Header/select focus remains usable after render. Reset view clears search/stage/supplier/sort/page/selection and restores original ordering. Existing board-lane status coverage remains unchanged.

Show supplier name plus established code/SKUs in the pipeline; CSV appends Supplier name after existing columns and exports all filtered rows in chosen order. Preserve all original CSV column positions and csvCell escaping. These view controls never change approval rights, financials, PO identities or deletion history.


## Configurable approval controls - B-20 (DEC-018 / WF-017)

**GLOBAL RULE:** only ADMIN can save approval controls, using SAVE_APPROVAL_CONTROLS, a complete validated stage-to-role matrix, explicit confirmation, reason and expected workspace revision. Persist in approvalControls; append APPROVAL_CONTROLS_UPDATED with full before/after, actor, timestamp and increasing control revision. Existing databases with no controls use standard B-19 defaults. B-19's removal of automatic September delegation continues; its role assignments are now restorable defaults rather than unchangeable permissions.

**MODULE-SPECIFIC RULE: LAE Import.** All 13 stages below use shared canPerformApproval with persisted workspace controls on every command. ADMIN always retains access; only MANAGER, PRODUCT_MANAGER and EXECUTIVE may be selected; VIEWER cannot approve. Unchecked all roles means ADMIN-only. Division/active-user checks remain. Executive sample approval and initial-payment completion still require assigned ownership. Other configured approvals allow in-scope self-approval, explicitly disclosed on save. An approval grant does not grant master editing, user management or arbitrary order editing.

| Group | Configurable approval stages |
|---|---|
| Purchase | PO approval/issue; return PO; amendment approval; PI approval |
| Payments | Milestone authorization; void payment record; initial payment completion/automatic authorization |
| Artwork | Order artwork approval |
| Product Lifecycle | Technical specification approval; technical rejection; brand-specific change approval; brand artwork approval |
| Production | Pre-production sample approval/rejection |

Changes apply to subsequent requests, including existing sessions/pending records, and remain until manually changed/restored. No automatic expiry or date-based relaxation. Restore standard roles populates the edit form; reason, confirmation and Save are still required. Completed approvals/snapshots/financials remain unchanged. New approval events identify control revision and allowed roles; previous history stays intact. Never skip evidence, verification, readiness, financial validation, deleted-order or transaction guards. Supplier responses, PI verification, QC, shipping and settlement remain operational gates, not additional approval permissions.


## Current admin/order rules (DEC-016 / DEC-017)

**GLOBAL RULE B-17 - Recoverable deletion.** Only ADMIN may issue DELETE_ORDERS / RESTORE_ORDERS, selecting 1-200 distinct IDs with a reason and current workspace revision. Validate the complete selection before mutation. Deletion marks deletedAt/deletedBy/deletedById/deletionReason, retains the order and all linked records, and appends ORDER_DELETED. Restoration clears current deletion markers, appends ORDER_RESTORED, and preserves the original stage, serial, PO number and issued snapshots. No hard purge is implemented.

Deleted POs leave the operational pipeline, task flags and shipment/document work queues. Admins manage them through Order pipeline > Deleted orders. Scope-authorized users may still read a deleted PO from retained financial links; all balances/remittances remain in Payments & settlement. Deletion does not cancel a supplier commitment, reverse a payment or write off a balance. Deleted POs are read-only: block order commands, remittance changes, linked file uploads and matched tracking imports until an admin restores them.

**GLOBAL RULE B-18 - Stable S.No.** serialNumber is an automatic positive integer, separate from manual supplier-facing PO number. nextOrderSerial is a persisted high-water counter. Assign existing missing serials once by createdAt then original array order; preserve existing valid serials, references and immutable snapshots. Assign on CREATE_ORDER inside the optimistic transaction. Never renumber or reuse deleted serials, including when all orders are deleted. Display S.No. in pipeline/detail/CSV; selection/pagination do not calculate serials.

Store startup performs an idempotent serial initialization. Before migrating a non-empty legacy workspace, create a consistent SQLite VACUUM INTO backup beside the database with a unique .before-order-serials-*.sqlite suffix; failed backup/migration aborts startup. Migration commits metadata plus ORDER_SERIALS_INITIALIZED audit atomically. Backup is confidential and remains outside Git/static serving. Review mode initializes its isolated browser state.

**GLOBAL RULE B-19 - Standard approval roles restored.** DEC-017 supersedes B-15 / EX-05 / DEC-014 immediately upon publication. Purchase approval/review/payment authorization/correction actions require ADMIN or scoped MANAGER. Technical/artwork/brand approvals require ADMIN or scoped PRODUCT_MANAGER. EXECUTIVE has no temporary or permanent delegation of those actions. Remove date-based authorization and the September notice/timer. Retain past delegated approvals and policy audit metadata. Existing executive sample approval, initial-payment shortcut, ordinary editing and supplier-price entry remain separate established behavior.

Use canPerformApproval's explicit command/role map; do not broaden management helpers. The role editor (B-16) remains available so admins can assign actual Manager/Product Manager roles. Selection controls are admin-only; select-all means the current page, cross-page selections are explicitly listed in confirmation, and filter/list/layout/navigation changes clear hidden selections.

## Administrator role editing (DEC-015 / WF-014)

**GLOBAL RULE B-16:** an authenticated ADMIN may change another user's role through Users & settings > Change role. Reuse USER_ROLES and CHANGE_USER_ROLE in the shared domain, with expected workspace revision. Require a supported different role, target user and reason. Do not allow changing the acting administrator's own role; this preserves administrator access. Non-admin roles require an assigned division.

Preserve user ID, name, credentials, assigned scopes, account status and existing order ownership. Record USER_ROLE_CHANGED with the authenticated admin, target, previous/new role and reason. This is distinct from the existing scope-assignment logging exception. Session lookup re-reads the current profile on every request, so promotion/demotion takes effect on the server immediately. Existing accounts need no password reset or recreation. Review mode supports profile-role simulation only.

## Temporary executive approvals (DEC-014 / WF-013) - SUPERSEDED

**Superseded by B-19 / DEC-017 / WF-016.** This historical exception is withdrawn by the current release.

**GLOBAL RULE B-15 / exception EX-05:** the user confirmed that Purchase Executives may perform both Purchase Manager and Product Manager approvals through September 2026. The window is 12 September 2026 00:00 IST inclusive to 1 October 2026 00:00 IST exclusive (expiry UTC: 30 September 18:30). This temporarily overrides the approver-role portions of B-06/B-07/B-11, DEC-003/004 and WF-001/002/004; other workflow rules remain authoritative.

Use shared canPerformApproval(user,command,scope,now) and the explicit APPROVAL_ROLES allowlist: RETURN_ORDER, APPROVE_ORDER, APPROVE_AMENDMENT, APPROVE_PI, AUTHORIZE_PAYMENT, VOID_PAYMENT, APPROVE_ARTWORK, APPROVE_SPEC, REJECT_SPEC, APPROVE_BRAND_DELTA, APPROVE_BRAND_ARTWORK. Returns/rejections accompany approval review; payment void remains a reasoned record correction, never a bank reversal. Existing executive sample approval, initial-payment shortcut and supplier-price entry retain their established rules.

Executives may approve any visible order within their assigned scope, including their own submissions. Ordinary edits remain limited to the assigned owner. Active-user/scope checks, readiness, evidence, verification, immutable snapshots, transaction revisions and audit remain mandatory. PLM targets require their own scope validation. This exception grants no master administration, template editing, user administration, shipment cancellation or short-closure privileges.

TEMPORARY_APPROVAL_POLICY centralizes dates and decision ID. Production authorization uses server command time on every transaction; never accept client dates or roles as authority. Normal Manager/Product Manager approval permissions resume automatically at expiry without restart; completed approvals remain valid history. Invalid policy times fail closed. Keep canApprove and canProductApprove unchanged for non-approval management capabilities.

Each delegated command adds approvalPolicy (id, command, endsAt) to its new audit events alongside the real executive actor. Reuse existing approval buttons and warning note; refresh eligibility when the window changes on an open page. Browser time controls presentation only. Extending the window or authority scope needs a new confirmed decision and append-only history.

Established: 2026-09-12. Product baseline: 0.6.1-alpha.16, schema 7, source commit `ced3d3b`. This is the authoritative change-control guide, not a claim that every pilot rule has completed management UAT.

## Read first and authority

The [baseline](CURRENT_PRODUCT_BASELINE.md) describes implemented behaviour and known gaps. [Learnings](PROJECT_LEARNINGS.md) supplies architecture and calculation contracts. The [brand rulebook](BRAND_RULEBOOK.md) governs visuals. [Decisions](DECISION_LOG.md) and [workflow changes](WORKFLOW_CHANGE_LOG.md) preserve reasoning and history.

**GLOBAL RULE G-01 — Authority.** Follow the user's explicit final instruction. This rulebook records the confirmed preservation/change-control policy. Existing code is the default implementation baseline, including documented limitations; it does not turn an unapproved historical assumption into an approved business policy. If code, an older document and a newer confirmed decision disagree, identify the discrepancy and relevant source before changing behaviour. Do not silently resolve a material business conflict.

**GLOBAL RULE G-02 — Decision states.** Use `IDEA`, `OPTION`, `RECOMMENDATION`, `PROPOSED`, `CONFIRMED`, `IMPLEMENTED`, `SUPERSEDED` or `REJECTED`. Also record evidence class: current user confirmation, historical recorded requirement, observed implementation, or inferred rationale. Only confirmed requirements are binding new product decisions. Existing observed behaviour is preserved pending a decision.

**GLOBAL RULE G-03 — Reuse and impact.** Before any feature, read all six memory documents at least for their relevant sections; search existing components, workflows, calculations, constants and tests; identify consumers and both runtime modes. Reuse -> extend -> refactor -> new. Do not introduce a framework, state library, router, UI kit or alternative formula solely for convenience.

**GLOBAL RULE G-04 — Change control.** For a material conflict describe the user's approach, existing rule, potential issue, alternatives, trade-off and recommendation. Obtain clarity on genuinely ambiguous business choices while continuing independent work. Routine compatible fixes do not need a new permission ceremony. After a confirmed change, implement consistently and update decisions, workflows, reusable rules, learnings and baseline as applicable. Do not reopen settled decisions without new information.

## A. Development rules

| ID / scope | Rule and source |
|---|---|
| G-05 GLOBAL RULE | Use the active plain `.mjs` ESM structure: browser views in `web/`, domain rules in `shared/`, transport/storage in `server/`, operations in `scripts/`, tests in `tests/`, product records in `docs/`. `vms-reference/` is a separate recovered reference tree. |
| G-06 GLOBAL RULE | Existing syntax: named imports/exports, single-quoted strings, semicolons, `const` by default, `let` for reassignment, camelCase functions/fields, UPPER_SNAKE_CASE command/status constants, kebab-case file names. `d*` helpers are domain internals. Do not mass-reformat compressed files in unrelated changes. No configured linter or TypeScript contract exists. |
| G-07 GLOBAL RULE | Reuse `field`, `button`, `icon`, `head`, `ph`, `badge`, `empty`, `note`, `renderModal`, `showError`, `toast` and event delegation in `web/app.mjs`. Escape variable HTML with `esc`; use `textContent` for errors. Do not interpolate unsanitized user content as HTML. |
| G-08 GLOBAL RULE | Business writes pass through `execute(state,{type,payload},actor)`; it clones state, validates, emits history, increments revision, returns `{state,result}`. The server chooses actor identity from its session, never a client role. |
| G-09 GLOBAL RULE | Reuse `/api/commands` and `{type,payload,expectedRevision}` unless a distinct resource contract is needed. Reuse `{error}` responses and existing 400 validation / 401 login / 403 permission / 404 missing / 409 stale revision / 429 throttling / generic 500 handling. |
| G-10 GLOBAL RULE | Store writes are atomic `BEGIN IMMEDIATE`/commit/rollback; retain the expected workspace revision check. No direct UI writes to SQLite, silent stale overwrite, mutation of past audit entries, or editing issued snapshots. New schema work needs a migration/rollback decision; schema constant 7 is not seven SQL migrations. |
| G-11 GLOBAL RULE | Reuse `ensure`, `RuleError`, `dateRequired`, `integer`, `toMinor`, `toRate`, `dEvidence`, and permission helpers. UI validation improves feedback but cannot replace server/domain validation. Preserve correction reasons and evidence links. |
| G-12 GLOBAL RULE | Store business events with actor, time, entity, action, summary and old/new values. Corrections append and reference original events. Server errors may log operational detail; never log passwords, tokens or private payloads by default. Scope-assignment exception EX-01 remains explicit. |
| G-13 GLOBAL RULE | Keep the static-file allowlist narrow. A new browser module must be reachable through the server and included in standalone build order if needed. `tests/startup.test.mjs` guards the current import graph. Do not expose arbitrary repository files. |
| G-14 GLOBAL RULE | Keep credentials in ignored local environment files or deployment runtime settings. Do not commit local SQLite/WAL files, backups or test output. No secrets in images, examples, documentation, URLs or logs. |
| G-15 GLOBAL RULE | Test according to impact, report exact commands/results and distinguish historical evidence. Domain changes need invariant/edge-case tests; UI changes need appropriate browser checks; shared changes need both runtime modes considered. Documentation-only changes require link, source and consistency checks rather than invented application tests. |

## B. UI/UX rules

These are preservation rules for the observed shared patterns, not authorization for a redesign.

| ID / scope | Pattern to preserve |
|---|---|
| UX-01 GLOBAL RULE | Shared sidebar, sticky topbar, breadcrumb, page eyebrow/title/subtitle, contextual actions, panels and footer. Use the [brand tokens](BRAND_RULEBOOK.md); preserve logo and typography. |
| UX-02 GLOBAL RULE | Hash navigation through `navigate`/`route`. Navigation closes modals/mobile drawer and resets search/status/page. Do not introduce parallel routing or a new URL convention without considering deep links. |
| UX-03 GLOBAL RULE | Forms use labelled `field` controls, explicit required indicators, helper text, two/three-column grids collapsing on mobile, and a shared dialog footer with Cancel/Close then the primary submit action on the right. Preserve entered values on validation failures where the existing form supports it. |
| UX-04 GLOBAL RULE | Buttons keep existing primary, normal, danger, ghost, small and icon variants. Use native buttons and labels for equivalent actions; dangerous/corrective operations require the existing reason/evidence forms or confirmations. There is no universal custom confirmation component. |
| UX-05 GLOBAL RULE | Reuse native selects and the existing filter row. Search is local substring matching; order page search matches PO/vendor/item codes. It resets page to 1 and preserves text cursor during render. Topbar Enter opens the first matching visible PO or falls back to Item master. Do not silently redefine matching semantics. |
| UX-06 GLOBAL RULE | Use `.table-wrap` overflow, existing header/row styles, right-aligned quantities/money, status badges and explicit empty rows. Order table pagination is 12 rows through `pageButtons`; other views have their own limits. A universal pagination/sort policy is not implemented or approved. |
| UX-07 GLOBAL RULE | Modal uses `role=dialog`, `aria-modal`, labelled title, scrollable body and persistent footer. Escape and close/cancel close it; keyboard Tab cycles through controls. Check focus entry/return and backdrop behaviour before extending; do not claim they are universally implemented. |
| UX-08 GLOBAL RULE | Command busy guard disables submit; failures go to inline modal error or error toast. Toasts last 6.5 seconds and use status semantics. Empty states and bootstrap text are distinct from errors. Retain visible actionable validation; do not show a successful save after failure. |
| UX-09 GLOBAL RULE | Preserve responsive grids and horizontal overflow, mobile navigation toggle and readable order detail/timeline. See baseline CSS-cascade risks: a breakpoint appearing earlier in the file may be overridden later. |
| UX-10 MODULE-SPECIFIC RULE: Purchase | Keep table/board choice and next-action stage card. Board missing-status coverage is known debt, not a precedent for new boards. Export uses current order filters, not just the visible page. |
| UX-11 MODULE-SPECIFIC RULE: Imports | Choose file -> preview raw/normalized rows, warnings and errors -> explicit commit. Rejected rows disable commit. Item, forwarder and rate imports are distinct workflows; no silent legacy-PO interpretation. |

## C. Business rules and sources of truth

| ID / scope | Rule |
|---|---|
| B-01 MODULE-SPECIFIC RULE: LAE Import | This is the implemented transaction scope. Other scope identifiers are permission metadata/placeholders, not finished workflows. |
| B-02 MODULE-SPECIFIC RULE: Masters/Purchase/PLM | One supplier per Base Item; ERP Item Code is brand prefix + `-` + Base Item Code. Technical specifications belong to base; artwork/outlook/brand deltas and complaints belong to ERP Item. Preserve stable used identities. |
| B-03 MODULE-SPECIFIC RULE: PO | Supplier -> Base Item -> GJ/KD/TT quantities -> positive ERP lines. Only ACTIVE eligible suppliers/items may proceed. Missing approved PLM is a persistent warning, never fabricated approval; when approved revisions exist, a valid selection is mandatory. Pending brand changes still block issue. See DEC-008 and WF-007. |
| B-04 GLOBAL RULE | Monetary transaction inputs use `toMinor`; FX uses millionths and `convertMinor`; schedules use `proportionalSlices`. Preserve units and rounding in CAL-01 through CAL-15 in [learnings](PROJECT_LEARNINGS.md). No new tax, GST, margin, landed-cost or currency-conversion assumption. |
| B-05 MODULE-SPECIFIC RULE: Pricing | Supplier/base/currency price history is retained; negotiated differences warn and are snapshotted. Preserve implemented exact-item/base/legacy lookup precedence and the known effective-date issue until deliberately resolved. |
| B-06 MODULE-SPECIFIC RULE: PO/PI | Draft -> submit -> manager issue immutable revision. Amendments retain history, require reasons/approval and reset current confirmation/PI validity. PI amount, currency, quantity, terms and commitment must match/confirm before approval. |
| B-07 MODULE-SPECIFIC RULE: Payments | Reported remittance and actual supplier realization are distinct. Keep original-order balances, exact allocation totals, same-supplier multi-PO allocation, current authorization/revision checks, and void-as-correction. The initial-payment shortcut differs from manager authorization (EX-02); do not present it as a universal manager gate. |
| B-08 MODULE-SPECIFIC RULE: Production | Production reference uses product days before supplier fallback; deviation requires reason. Planning TAT is manual. Production clock follows completed initial reported payment (or confirmed no-advance readiness); sample completion and approval are separate; bulk QC PASS precedes completion. |
| B-09 MODULE-SPECIFIC RULE: Shipping | Booking may occur during production; release needs production completion; vessel loading needs released container, bulk QC, current confirmations, CI/PL, shipment-triggered reported payment, vessel/voyage and valid actual date. Final BL then insurance follow departure. Arrival closes operations, not financial balance or ERP inventory. |
| B-10 MODULE-SPECIFIC RULE: Freight | Benchmark per container = O/F + USD 60 below O/F 3,000, else USD 120. Warn only above the configured excess threshold (default USD 100). Exact route/via/destination/container matching; preserve historical snapshots. |
| B-11 MODULE-SPECIFIC RULE: PLM | Approval belongs to ADMIN/PRODUCT_MANAGER. Revisions, successors, brand deltas and artwork retain distinct identities and audit history. Template fields control specification/QC/PO/supplier-confirmation projections. |
| B-12 GLOBAL RULE | Operational arrival/short closure, financial settlement, warehouse receipt, vendor status and document approval are different concepts. Do not couple them implicitly. No automatic messaging, bank execution, stock/GRN or VMS synchronization exists. |

## D. Terminology

| Established term | Meaning / avoid conflation |
|---|---|
| Farming Hub Purchase Management | Product name; LAE Import is first transaction scope. |
| Libraries | Shared master navigation group; retain Vendor master, Item master, Supplier price lists, Product Lifecycle (PLM). |
| Base Item Code | Supplier-linked technical product parent. |
| ERP Item Code / brand SKU | Brand variant; prefer current UI's ERP Item Code for new comparable fields. Historical code names remain for compatibility. |
| PO / PI | Purchase Order / supplier Proforma Invoice; separate verification and issue processes. |
| Submit for approval / Approve & issue | Draft handoff / manager-issued immutable PO. Not interchangeable with Save. |
| Supplier PO acknowledgement / Technical specification confirmation / Artwork confirmation | Three different controls, tied to current relevant revision. |
| PLM specification not available | Exact warning for absent approved PLM; do not replace with Approved or make it an unexplained hard block. |
| Production lead time / Bulk production start | Commercial clock start / physical bulk start after sample approval. |
| Container booking / Container release / Loaded on vessel | Reservation / empty container release / actual ocean departure. |
| Final BL / Insurance completed / India port arrival | Post-departure sequence; port arrival is not warehouse receipt. |
| Reported / Realized / Settled / Excess to settle | Payment reporting / supplier acknowledgement / zero actual balance without pending acknowledgements / negative original-order balance. |
| RMB/CNY | UI may explain RMB; stored currency code is CNY. USD and INR remain separate currencies. |

Use `STATUS_LABELS`, `STAGES`, `TRACKING_MILESTONES`, `SCOPES`, `CURRENCIES`, `TERMS`, `PAYMENT_METHODS`, `PORTS`, `COST_TYPES` and `REASONS` rather than alternate wording/constants. Exact inventories are in the baseline appendix.

## Exceptions and unresolved differences

| ID | Base rule | Exception / module | Reason and approval evidence | Date / decision |
|---|---|---|---|---|
| EX-01 | Audit business changes | `SAVE_SCOPES` updates assignments without a business event | Explicit user exception recorded in code comment and administration guide; workspace revision still advances | Historical date not independently known; recorded 2026-09-12 / DEC-003 |
| EX-02 | Manager authorizes payments | `COMPLETE_INITIAL_PAYMENT` auto-creates outstanding PI authorizations for an eligible order editor | Implemented shortcut; separate approval not proven. Record as observed, not an approved expansion of finance rights | Observed 2026-09-12 / DEC-004 |
| EX-03 | Authenticated server state | Standalone clean-review role switch/localStorage/IndexedDB | Demonstration/review mode only; not authentication, production authorization or server backup | Historical review design / DEC-001 |
| EX-04 | Reuse shared math | Seed `majorToMinor`, UI TAT/commercial previews and complaint counts use local calculations | Existing duplication, not approval to add further copies; see debt register | Observed 2026-09-12 / DEC-010 |

For each future exception record base rule, exact module, reason, approving decision/date, impact, and removal criteria. Unknown approval is labelled unknown, not retroactively invented.

## User access portal (DEC-012 / WF-011)

**MODULE-SPECIFIC RULE B-13 — Administration.** Authenticated ADMIN users create sign-in accounts from **Users & settings → Create user**. Reuse `USER_ROLES` and `SCOPES`; this feature does not change the existing powers of any role. Administrator access continues to bypass division filtering. Non-admin users cannot list account email/status metadata or create accounts through the API. Standalone review mode cannot create real accounts.

**MODULE-SPECIFIC RULE G-16 — Credential resource.** Account provisioning uses authenticated `GET/POST /api/users`, a distinct resource under G-09. Passwords must never enter shared business commands, workspace state, audit payloads or responses. `Store.createLocalAccount` validates, hashes with existing scrypt, and atomically inserts account/profile/audit with an optimistic revision check. Only whitelisted profile fields are persisted. The existing local CLI remains supported.

Names are trimmed and required (maximum 120 characters); email is normalized to lowercase and must be valid and unique (maximum 254 characters); passwords are 12–256 characters; the form confirms the password. Require a supported role and at least one valid division. Preserve inline errors and entered values after failed submissions. Creation appends `USER_PROFILE_CREATED` with the authenticated actor; subsequent scope toggles retain EX-01. No invitations, public registration, password reset or account-deactivation control is implied by this feature.

## Multiple attachments and upload size (DEC-013 / WF-012)

**GLOBAL RULE G-17 — Evidence uploads.** Each file may contain up to `MAX_UPLOAD_BYTES = 50 * 1024 * 1024` bytes, displayed as **50 MB per file**. Use `UPLOAD_EXTENSIONS` and this shared constant for browser/server validation. Keep authenticated session, Origin/CSRF, role and order/division enforcement on every file. Only the file endpoint receives a larger JSON-body allowance for base64 expansion; ordinary API requests retain their existing limit.

**GLOBAL RULE UX-12 — Multiple evidence files.** Comparable evidence forms use the shared multiple-file picker. Validate the complete selection before uploading, upload files sequentially with progress, and apply one business command containing the complete `fileIds` collection. A failed file upload prevents the business command. Keep selected files on failure and reuse successfully uploaded files when retrying the same selection/order/user. Guard duplicate submissions until uploads and the command finish. Completed uploads remain audited even if the user abandons the form; they are not automatically deleted.

**GLOBAL RULE B-14 — Attachment collections.** Every attachment must pass the existing scope/order checks. Preserve `fileId` as the first file for existing clients and store all `fileIds` on the applicable response, PI, artwork, payment or QC record. Each order/shipment document retains its own download, type, revision and shipment link. Every remittance proof must link to every allocated order. Multiple files form one submission and do not create multiple payments, approvals or status transitions. Existing optional evidence remains optional.

**MODULE-SPECIFIC RULE — Spreadsheet imports.** Import sources accept up to 50 MB but remain one workbook/CSV per preview and explicit commit. Row-count/header/mapping checks remain intact. Multiple evidence attachments do not authorize merging independently previewed import batches.

## Documentation maintenance contract

Every meaningful decision gets a DEC record; workflow evolution gets a WF record. Keep old records, mark `Superseded by DEC-...` or `Replaced by WF-...`, and link both directions. Update reusable rules, calculation contracts, baseline and branding where affected. Add source paths, relevant tests and verification date. Preserve earlier release evidence; correct stale current summaries through an explicit addendum. Start the next IDs after the highest existing number. Documentation-only work does not bump product/schema versions or require a redeployment.


## Prototype support boundary - DEC-021

**MODULE-SPECIFIC, local theme experiment only:** keep help opt-in, concise, read-only and tied to visible controls. Do not infer authority from a tour step or auto-complete business actions. Reuse real validation/authorization messages; explain configurable approvals without inventing role grants. Hide help during business dialogs and preserve keyboard, Escape and reduced-motion behavior. User requested the mascot guide in the ongoing sample; this does not confirm production theme adoption.


## Always-visible instruction guide - DEC-024

**MODULE-SPECIFIC RULE: local prototype.** The Farming Hub logo and mascot remain in a fixed, keyboard-accessible dock on pages, in business forms and while the tour is open. Tap to open guidance; tap again to close. Order guidance starts with the actual primary action already rendered for the current role. In a form, it starts with a displayed error or invalid visible field, then a review/submission explanation. Take me there closes help and focuses the target without clicking it, submitting, approving or changing values. Guide Escape leaves the underlying form and unsaved entries intact. Back/Next/Skip/Finish remain, and mobile reserves space for the dock. No AI, API key, chat input or external model call is used. This explicitly supersedes DEC-021's instruction to hide help during business dialogs. Keep the help launcher in the keyboard loop and preserve form drafts/focus. Reuse rendered next actions and native validity instead of duplicating approval/readiness logic. Do not label authored instructions as AI answers. The user deferred OpenAI integration; do not retain endpoints or request an API key for this feature. Production adoption remains pending.


## Consistency corrections - DEC-025 / WF-019

**GLOBAL RULE:** project scope applies to related prices, complaints and import histories as well as primary records. Tracking imports must preflight every matched PO using the same edit/ownership check as manual updates; reject the whole batch if any target is forbidden. Master writes validate target scope, and vendor immutability/uniqueness applies to the final normalized composite code. SAVE_ITEM cannot grant brand approval; use the dedicated approval command and current controls.

**MODULE-SPECIFIC RULE: PO pipeline.** Board and Overview reuse pipelineStageGroups. Every current STATUS_LABELS value occurs in exactly one group; Preparation covers pre-production statuses, followed by In production, Shipment readiness, Transit and Port arrived / closed. This supersedes UX-12's preservation of incomplete board coverage. Status derivation, filtering, sorting, totals and permanent serials are unchanged.

**MODULE-SPECIFIC RULE: draft planning.** Production-day hints call productionReferenceDaysForOrderInput with expanded ordered lines. Do not invent a separate base-day formula. Input quantities update hint/override visibility without changing quantities, commitment or unrelated unsaved text. Base-master reference is labelled separately.

**GLOBAL UI RULE:** HTTP 401 at startup opens login; other bootstrap failures show a retryable workspace error. Preserve the existing brand and allow short sidebars to scroll.

**MODULE-SPECIFIC RULE: local Minimal prototype.** Keep Show page guides visible and enabled in Minimal, including narrow screens. It toggles to Hide page guides and remains separate from the persistent mascot. This is explicit user steering, not approval to publish the prototype.


## Payment currency wording and BOC reference - DEC-027 / WF-021

**MODULE-SPECIFIC RULE:** payment rate labels name the actual currency pair and source: USD to INR (Indian bank), USD to RMB (supplier), and optional USD to RMB (BOC). Use RMB as the CNY display name in these labels; retain CNY storage codes. Adapt labels when currency changes. The BOC rate is manual reference metadata only: positive, at most six decimals, blank allowed, USD remittances only. Never use it to replace invoice conversion, supplier actual receipt, settlement or production-readiness calculations. Preserve legacy records and receipt omission semantics; explicit receipt clearing must remain cleared even when a parent payment has a reference.


**GLOBAL RULE - modal layering (DEC-028):** business dialogs appear above the appearance toolbar; the persistent mascot remains accessible. Keep notification space above the dock. Do not cover form headings, close controls or footer actions with presentation chrome.


## Soft-launch consistency repairs — DEC-029 / WF-023

**GLOBAL RULE:** label current state from authoritative status, not a past-tense incomplete milestone. Resolve follow-up responsibility from ownerId; legacy owner is a compatibility fallback, not a reassignment. **MODULE-SPECIFIC:** keep active shipment requirements visible in the primary action before optional additional planning. Explain missing active LOGISTICS setup without weakening booking gates.

**MODULE-SPECIFIC: ERP setup.** Reuse item-edit/SAVE_ITEM, explicit base and brand selection. Persist baseItemCode/brandPrefix from selected master records, never caller-provided approval flags. Newly saved brand requirements remain PENDING and use configured approval. Add ERP item is available to existing canCreate users; this does not grant master/admin or approval access.

**MODULE-SPECIFIC: freight imports.** Parse a complete positive USD amount; accept plain numbers, optional USD/dollar notation and correctly grouped thousands. Reject negative, zero, non-finite, ranges and malformed text. Preview and commit share normalization. Preserve fee60 below3000 and120 at/above3000; warning remains strictly greater than100. Do not rewrite old imported snapshots during validation repairs.

**QA boundary:** live Ashok tests retain every newly created QA record. Never count local fixtures, source review, historical reports or blocked scenarios as current live passes.


**DEC-029 / MODULE-SPECIFIC PO entry:** before saving a base-first draft, validate every positive brand quantity has an active ERP mapping. Reject with the base/brand and Item master recovery instruction; never silently omit the requested quantity. Keep preview calculation separate from save validation so incomplete typing does not discard form state.


**DEC-029 / MODULE-SPECIFIC production audit:** retain the reason selected in Update commitment with the date and remarks. Validate supplied causes against REASONS; preserve legacy omission and original baseline. **MODULE-SPECIFIC issued PO display:** absent technical data is a historical warning, not a green approval or instruction to change the issued snapshot.


MODULE-SPECIFIC RULE — Tracking and freight imports: require one normalized Ref (tracking) or route/container (rates) per file. Show validation errors before commit and enforce the same rejection in the domain command. Later correction batches remain append-only. GLOBAL RULE — Replacement-file previews must clear stale rows, remain uncommittable on parse failure/empty usable input, ignore obsolete reads, and preserve other entered form values.


MODULE-SPECIFIC RULE — Remittance register: display Indian-bank and optional BOC rates with their recorded precision, using the shared rate-text presentation helper. Monetary rounding and actual supplier realization remain governed by the existing financial utilities.


## Independent Manager workflow — DEC-030 / WF-024

**MODULE-SPECIFIC RULE: LAE Import.** The user confirmed every Purchase Manager may complete all 13 purchase/product/artwork/payment/sample approval stages, including rejection and correction. Activate through the Admin-saved Independent Manager preset, which adds MANAGER to every effective stage while retaining other grants. Do not hard-code a bypass or overwrite future saved controls. Self-approval is a deliberate trade-off; no automatic expiry. Production activation is a separate verified action, currently pending. Admin-only user/role/division/policy and delete/restore controls remain separate. Read [MANAGER_WORKFLOW.md](MANAGER_WORKFLOW.md).

Use existing master save validation for new vendor/price imports. One source file, max 500 rows, explicit preview/commit, no partial batch, immutable source/audit retention, one workspace revision. Full vendor codes and explicit Base Item Codes are required; duplicate normalized keys reject the batch. Price zero/date/currency behavior remains the existing save contract. Item imports retain max 2,000 rows and explicit mapping; ambiguous supplier shorthand and foreign-division identity updates reject. A supplied freight quote may create an evidence-backed snapshot through the existing importer; never invent a rate or change the agent-charge formula. Managers can read their effective stage grants; visibility is not an authorization check.


**DEC-030 live activation, 2026-09-13:** Independent Manager workflow is now the saved production matrix at approval-control revision 2. Every active scoped Manager has all 13 approval stages. This is persisted configuration, not a hard-coded bypass: later Admin saves remain effective. Other grants, evidence/readiness, ownership/division rules and Admin-only controls remain.

## Bottom-corner mascot movement - DEC-031 / WF-025

**GLOBAL UI RULE:** the persistent Guide me launcher may move horizontally only. On release, snap to the nearer bottom-left or bottom-right corner; never persist a free-floating or vertical position. Default right, remember the side in browser-local presentation storage, and tolerate unavailable/invalid storage. Left/Right arrows while focused provide equivalent keyboard control. Dragging must not activate guidance. Keep ordinary click/tap and Enter/Space guidance, top-layer availability and existing bottom content clearance.

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.

## Order timeline visibility - DEC-032 / WF-026

**MODULE-SPECIFIC UI RULE:** the order Overview workflow timeline opens expanded in Minimal and Current. Show/Hide page guides must not hide it. Users may collapse it manually; reopening the page restores the expanded default. Keep existing stage calculations, ordering and Activity history unchanged.

**DEC-032 / WF-026 publication, 2026-09-13:** Runtime a5a9b24 is live at https://purchase.dvjassociates.com; deployment 3ontnhztuhusfj6ei7ltqodd finished successfully. The order timeline opens expanded in Minimal, survives guide toggles/reload and fits the checked 390/320px layouts. Eleven served assets match the release commit and health returns 200. All 29 POs / 15 QA orders, checked business collections and approval controls are unchanged at revision 904. This supersedes the earlier local-only publication status for the timeline update.


## PO worksheet release — DEC-041 / WF-036

**MODULE-SPECIFIC RULE:** create/edit PO drafts use the searchable supplier catalogue and compact item worksheet. Reuse current price lookup and shared validation. Catalogue Add and direct row selection use existing production-reference behavior. Preserve brand expansion, explicit planning TAT, price override warnings, specification selection and Save draft commands. Tab is native; numeric Enter advances cells, Up/Down moves between rows; search Enter only adds an item. Terms remain available in expandable details. No audit-trial FX, draft recovery, security policy or database migration is part of this UI release.


## USD/RMB PO pricing — DEC-042 / WF-037

**MODULE-SPECIFIC RULE:** supplier list prices retain their source currency. New USD/RMB conversions use one explicit quote, **1 USD = X RMB**, with positive rate (up to six decimals) and valid date. RMB-to-USD divides by this quote; USD-to-RMB multiplies by it. Use priceListInvoiceMinor for conversion and variance; round to invoice minor units once before quantity extension. Missing FX blocks cross-currency create/edit/submit/issue, including direct API calls. The worksheet leaves automatic invoice prices blank until a valid conversion is available. Same-currency prices need no rate. Preserve manual price overrides with warnings, historical direct-quote interpretation and immutable issued snapshots. Never substitute optional BOC remittance reference or mutate the supplier list. This supersedes the earlier direct-direction USD/RMB input convention, not unrelated audit policies.


**MODULE-SPECIFIC RULE — DEC-043 / WF-038:** the USD-to-RMB rate is the supplier-agreed quote for that PO/PI. Enter it manually at PO creation and record its date. Later changes use a controlled PO revision. Do not automatically fetch/apply market rates or reprice existing records.


## VMS integration — DEC-044 / WF-039

**MODULE-SPECIFIC RULE:** VMS extends the existing LAE Import supplier record. Do not create a parallel vendor or account master. Company name/code/ID remain Purchase identity; the first CRM contact maps to existing contact/email/phone/WeChat and location fields. Both editing paths must synchronize these fields while retaining secondary contacts. Source instructions, seeds and legacy role aliases are reference only.

Reuse native roles, scope checks, command revisions, protected files and append-only audit. Managers maintain CRM profiles/evaluation/samples/catalogues. Executives may record interactions/evidence and update their own or assigned follow-ups. Viewers remain read-only. No CRM grade, sourcing stage or sample approval grants purchase eligibility or order approval. No extra September delegation or permission-policy edit is introduced.

Keep VMS_CRITERIA, vmsEvaluation, vmsFollowups and vmsConcentration as shared sources of truth. Product coverage and stage-filtered component coverage intentionally have different risk thresholds inherited from source; never conflate their counts or treat equal-share estimates as real spend. Classify this as module exception VMS-EX-01, observed source behavior preserved under DEC-044 (2026-09-13). Keep CRM samples separate from order production sample gates, and CRM follow-ups separate from PO tasks. See VMS_MODULE.md for formula, rounding, units, examples and missing-source features.

**GLOBAL preservation rule:** no last-write-wins offline replay, new authentication store, live migration or source-stack deployment follows from integrating a UI module. Preserve existing conflicting-edit protection and issued history. The current implementation is a local feature build until explicitly published.


**DEC-044 / WF-039 publication:** user-approved VMS integration is now live (2026-09-13); its earlier local-only release boundary is superseded. Preserve the established VMS identity, scope, permissions and calculation rules. Historical data migration and unported source features remain outside the release. See the current baseline for verified runtime and deployment.


## Standard Minimal theme and personal guides — DEC-045 / WF-040

**GLOBAL RULE:** Minimal is the sole application theme. Remove Current/Minimal switches and the top appearance/page-guidance toolbar. Ignore the old browser-wide fh-appearance-style key; do not adopt it as an account preference. Retain existing branding, animations, reduced-motion support and the permanent mascot.

**GLOBAL RULE:** Users & settings → My preferences → Show page guides is available to every active login, including Viewer and users without purchasing divisions. Default off preserves the established Minimal view. Saving applies only to the authenticated profile through SAVE_PERSONAL_PREFERENCES, with one boolean showPageGuides field; do not accept a target user ID, role, scope, arbitrary setting or theme. Persist under users[].preferences, using the existing optimistic transaction and append-only personal-preference event. These are display settings, not administrative permissions.

The saved preference follows the account on subsequent bootstrap/reload and applies after a successful save. Other logins keep their settings. Clear the previous user's displayed preference at logout/login screen; standalone review uses the selected review profile. Only optional descriptions/guidance change. Required fields, warnings, errors, available actions, the mascot and expanded-by-default order timeline remain. This supersedes DEC-026's Current comparison and top toolbar, and the toolbar portions of later UI records. No business calculation or approval policy changes.


## VMS module restoration — DEC-046 / WF-041

**MODULE-SPECIFIC RULE:** expose the twelve original VMS module names through durable native routes and a readable, scrollable submenu/mobile selector. Reuse Purchase users, roles, approvals, supplier identity and master imports. Supporting classifications/groups/locations use existing Manager catalogue validation and soft deactivation. Keep product classification distinct from multi-select Product Lines; do not create a second commercial vendor master.

**MODULE-SPECIFIC RULE — user-confirmed offline policy:** automatically sync non-conflicting queued vendor profile edits and text interactions while the same account is signed in. Retain conflicts for explicit comparison/resolution. Compare changed editable fields, preserve unrelated updates, and rerun current server identity/scope/role/domain/revision checks. Use account-owned request IDs and durable receipts to prevent duplicate interactions/audit on lost acknowledgements. Offline uploads, new suppliers, approvals and payments remain unavailable; the app shell caches only the public reconnect page. Never replay old last-write-wins code. This extends DEC-044; it does not supersede optimistic transactions or Admin-only controls.

**MODULE-SPECIFIC RULE:** VMS currency entries are optional dated manual reference metadata, positive and at most six decimals, unique by currency; INR reference equals 1. They do not calculate PO, payment, invoice or sample amounts. Preserve DEC-043 supplier-specific FX.

See VMS_PARITY_REPORT.md for queue limits, safe discard/rebase, module map, formulas and known remaining source differences. Local build only.


## Audit checkpoint — DEC-047

VMS_WORKFLOW_AUDIT.md records confirmed defects and proposed policy changes against DEC-044/046. In particular, all-open follow-ups, optional follow-up creation and inactive-catalogue assignment restrictions are recommendations requiring a confirmed product decision. The audit does not silently supersede existing rules or authorize migration of historical records. Current visit/follow-up rollout has five high-priority findings; use their acceptance cases before claiming readiness.


## GLOBAL RULE - Module hierarchy (DEC-048 / WF-042)
The default workspace has two main areas: Order Management and Vendor Management System. Order Management contains LAE Import (all existing purchase tools), LAE Domestic, Utility Division and Implements Division. The latter three are Pending development, with informational pages only. Show only the current area's tools in its sidebar. LAE Import keeps the six daily-work links and a collapsible Master data & products group; shared account settings and version history remain accessible. Preserve existing deep links, scopes and server authorization. Do not interpret a division card as permission to create data for that division. Supersedes the mixed Purchase/VMS sidebar portion of DEC-046; personal Minimal preferences from DEC-045 remain. This is a confirmed user-requested navigation change, not approval of pending VMS audit workflow proposals.


**GLOBAL RULE - DEC-048 sidebar sizing correction:** Sidebar sections must retain their content height. When the menu exceeds the viewport, scroll the sidebar; do not compress a section so its links overlap the shared footer.


**MODULE-SPECIFIC RULE - DEC-049:** Use the top Order Management button to switch divisions. Do not add a duplicate All divisions shortcut below the LAE Import sidebar tools.


**GLOBAL RULE - DEC-050:** Use the bottom Modules dropdown for Order Management and Vendor Management System. Keep its neutral Select module prompt so the current module can be selected again to return to its hub. This supersedes DEC-049 top-button placement, while retaining the no-duplicate-All-divisions rule. Logo returns to module home.


**GLOBAL data-history rule - DEC-051:** The one-time live reset preserves serial high-water mark 31 and genuine masters. Archived test data stays outside active screens; do not reseed it or reset counters during later deployment. This reset is not a reusable permission to purge production transactions. Recovery must protect business writes made after the reset.


**MODULE-SPECIFIC EXCEPTION - DEC-052 (2026-09-13):** User explicitly restarted the empty post-cleanup live PO sequence at 1. This supersedes DEC-051's retained counter 31 for this one operation. Subsequent serial allocation remains monotonic; deletions leave gaps. Archived test serials are a separate historical dataset and must not be merged back without collision reconciliation.


## GLOBAL RULE - Permanent record identity (DEC-053 / WF-047)
Use shared/references.mjs for software references. Preserve workspace namespace, assigned entries, high-water counters and existing external links. Never derive identity from display serial, supplier document number or editable item code; never reset reference counters with nextOrderSerial. Keep identity metadata outside immutable business snapshots. Allocate only inside existing successful transactions and filter reference projections to authorized records. Use the existing common register, not separate counters per screen.
**MODULE-SPECIFIC RULE - ERP/Tally:** Tally is accounting base; ERP is its frontend. External mapping is company-scoped, Admin-only and currently manual. JSON export is a read-only Farming Hub format, not a Tally import or synchronization acknowledgement. Actual postings/pull updates need a separately verified connector and explicit ownership rules. See ERP_REFERENCE_FOUNDATION.md.


## Reference format update - DEC-054 / WF-048
New LAE Import PO references use FH-LAE-I-PO-1, then FH-LAE-I-PO-2. All newly allocated software references use unpadded positive integers. Already-assigned references retain their exact text and ERP integration keys, including padded or generic PO forms. Counters remain monotonic per record type across formats and divisions; no renumbering or reuse. Local candidate only.


## DEC-055 / WF-049 - Reference and guided-order safeguards
**GLOBAL RULE:** reject malformed reference registry/record IDs and numeric alias collisions before persistence; retain all prior reference assignments and counters. Current/historical PIs and evidence wrappers use parent-scoped PI/ATT identities. Use one shared helper; never invent a second counter. Treat a saved request receipt as evidence of the original transaction, not permission to execute changed content. Preserve receipts and evidence in full backups.
**MODULE-SPECIFIC RULE:** manual PO references are globally unique across retained PO history. PI and commercial invoice references are separately unique within each supplier; identical invoice numbers can identify multiple files for the same order/shipment, but cannot identify another order/shipment of that supplier. New commercial invoices require number/date; keep old documents/history. Bank references normalize whitespace/case and remain reserved after voiding. Initial INR payments use INR-to-INR rate 1.
**GLOBAL UX RULE:** next-step guidance must reflect current state and role and give concrete checks. It must not auto-submit, approve, infer evidence or declare an arrived shipment financially settled. Minimal keeps critical guidance visible. See ERP_ORDER_SAFEGUARDS_REPORT.md for open scale/recovery/UAT gates; no ?300-crore readiness claim based solely on amount arithmetic.

## MODULE-SPECIFIC RULE - Automatic PO numbers (DEC-056 / WF-050)
New LAE Import POs use their software reference as their PO number, e.g. FH-LAE-I-PO-1. Remove manual PO-number input. Allocate atomically with existing transaction/retry controls, skip reserved legacy numbers and never reuse a deleted reference. CREATE_ORDER ignores supplied number/counter overrides; EDIT_DRAFT rejects renaming. Preserve saved nonempty legacy numbers and issued snapshots. Only a blank unissued draft acquires its existing reference on explicit save after uniqueness validation. Missing assigned automatic references require recovery; do not renumber. Supplier PI numbers remain manually entered and unique within that supplier. This supersedes the manual-new-PO policy in DEC-053/055.

## Arrival invoice costing — DEC-057, 2026-09-17
**MODULE-SPECIFIC RULE, LAE Import.** Use the shared arrival-costing calculator and command enforcement. Follow ARRIVAL_COSTING.md for inputs, formulas, rounding, provisional/final states and evidence. Keep GST separate, unknown amounts pending, FX manual with date/source for non-USD invoices, and product allocation visibly based on invoice value with confirmation. Never infer customs rates, actual payments or expenses from missing data. Final records require approved access; corrections retain prior snapshots and reasons. Finalize/reopen are configurable approval stages, default Manager plus Admin. Do not alter physical arrival status, accounting authority or existing PO/payment values as a side effect.

## Process-exemption trial — DEC-058, 2026-09-17
**MODULE-SPECIFIC, confirmed authority:** only Purchase Manager or Admin approves/revokes LAE Import process exceptions. User requested pending status, later completion and process explanations. **Trial implementation, stage extent awaiting clarification:** use the bounded catalogue in PROCESS_EXEMPTIONS.md. A grant authorizes specific subsequent actions on one PO revision, optionally one shipment; it never marks the skipped process complete. Actual financial amounts, identities, evidence, dates, scopes and normal non-exempt approvals remain enforced. Do not treat this trial or the unfinished phrase "all process up to" as approval for unrestricted bypass or live deployment.

## Confirmed boundary — DEC-059 / WF-053
**MODULE-SPECIFIC RULE:** exemptions are allowed only before pre-production/sample QC, approved by Manager/Admin. Only the early supplier acknowledgement, specification and artwork catalogue in PROCESS_EXEMPTIONS.md is supported. QC approval requires actual early confirmations. The first QC decision permanently closes new and existing bypass authority; corrected sample submission or later PO revision cannot reopen it. Sample QC and all subsequent gates are mandatory. This supersedes the wider DEC-058 trial catalogue and resolves its scope clarification. Keep all stages clickable for explanation/status.


## Concurrent work — DEC-060 / WF-054 (2026-09-21)
GLOBAL RULE: preserve each user's session and typed entries. Permit unrelated order, supplier and personal-preference commands only when server-authenticated versions prove their required dependencies unchanged. Execute against current state inside the existing transaction. Same-record/dependency conflicts require explicit review; never silently overwrite or automatically resubmit. Keep normal authorization, monetary validation, references, audit and retry receipts authoritative. Unknown/global commands remain conservative. A modal pins its opening version; uploads must not advance that version. See CONCURRENT_ACCESS.md for boundaries.
