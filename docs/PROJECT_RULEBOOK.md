# Project rulebook

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
