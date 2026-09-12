# Project rulebook

## Temporary executive approvals (DEC-014 / WF-013)

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
