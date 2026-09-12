# Decision log

Started 2026-09-12. Append records; never erase earlier decisions. Each entry distinguishes evidence from retrospective analysis. "Historical requirement" means an existing source records the requirement, not independent confirmation of management UAT. Benefits/trade-offs below are present-day analysis unless the source explicitly records them. Unrecorded alternatives are not invented as historical discussions.

Related documents: [rulebook](PROJECT_RULEBOOK.md), [learnings](PROJECT_LEARNINGS.md), [baseline](CURRENT_PRODUCT_BASELINE.md), [workflow history](WORKFLOW_CHANGE_LOG.md), [brand](BRAND_RULEBOOK.md).

## DEC-001 — Active architecture and separate review runtime

**Date:** original 2026-09-11; documented 2026-09-12. **Area:** architecture. **State/evidence:** IMPLEMENTED / observed code and initial SW-0001..0008; preservation confirmed by current master instruction. **Scope:** GLOBAL.

**Decision considered:** how to run the purchase alpha and portable review. **Existing behaviour:** recovered VMS source uses React/Express/Prisma; no initial Purchase runtime is shown before the alpha. **Proposed/implemented behaviour:** native Node HTTP/SQLite, vanilla ESM UI, shared commands and an independent standalone browser review.

**Alternatives considered:** original discussion not available. Current alternatives are retain stack, incrementally modularize, or migrate to reference stack. **Advantages:** minimal dependencies and rules reusable in both runtimes. **Disadvantages:** monolithic source and whole-workspace writes. **Risks:** build concatenation/import order, storage limits, confusing review role switch with auth. **Dependencies:** Node SQLite, JSZip, shared modules, build script.

**Workflow impact:** same business commands across server/review. **Other-module impact:** all modules rely on state shape and shared helpers. **Final decision/reason:** preserve current stack; a migration is a separate decision because an apparently equivalent rewrite can change storage/auth/business behaviour. **Files:** `package.json`, `server/*`, `shared/*`, `web/*`, `scripts/build.mjs`. **Documentation updated:** rulebook G-05..13, learnings architecture, baseline. **Workflow:** WF-001.

## DEC-002 — Supplied brand guideline supersedes inferred theme

**Date:** 2026-09-12, releases0.3.1..0.3.3. **Area:** branding. **State/evidence:** IMPLEMENTED / historical user requirement SW-0018..0020, supplied PDF and CSS. **Scope:** GLOBAL.

**Decision considered:** source of visual identity. **Existing behaviour:** inferred public-site green theme/remote logo, and earlier Inter styling. **Proposed behaviour:** supplied RGB logo, green/lime palette, AmsiPro-first stack and controlled decorative curves. **Alternatives considered:** earlier source records show inferred site theme and standalone logo application; broader alternatives are not recorded.

**Advantages:** consistent local assets and explicit brand authority. **Disadvantages:** licensed font absent; fallbacks vary. **Risks:** legacy CSS still influences some components/breakpoints. **Dependencies:** official PDF/PNG, CSS cascade, print/build logo embedding. **Workflow impact:** visual only. **Other-module impact:** all screens and printed POs. **Final decision/reason:** supplied guideline controls future changes because it is the explicit brand source. **Files:** `web/styles.css`, `web/app.mjs`, `web/index.html`, `web/assets`, `docs/brand`, `scripts/build.mjs`. **Documentation updated:** brand rulebook; G/UX rules; baseline TD-03. **Supersession:** inferred 0.3.1/0.3.2 visual decisions are superseded by this entry, while original release records remain. **Workflow:** none changed.

## DEC-003 — Immutable business history with explicit assignment exception

**2026-09-12 addendum:** approval eligibility temporarily superseded by DEC-014 through September; other rules remain. Normal roles resume at the documented IST expiry.

**Date:** observed since initial alpha; exception date unknown, recorded2026-09-12. **Area:** audit and permissions. **State/evidence:** IMPLEMENTED / code, tests, administration guide; scope-assignment exclusion explicitly attributed to user in code. **Scope:** GLOBAL with EX-01.

**Decision considered:** how to record edits/corrections and access assignments. **Existing behaviour:** no earlier implementation available. **Proposed/implemented behaviour:** issued snapshots, append-only events and correction links; `SAVE_SCOPES` changes workspace revision but omits business interaction event. **Alternatives considered:** historical discussion unavailable; immutable corrections versus in-place edits assessed now.

**Advantages:** traceable business history and preserved issued values. **Disadvantages:** storage growth; scope history not available in business log. **Risks:** conflating logged profile creation with unlogged assignment changes. **Dependencies:** `execute`, `dEvent`, `dSnapshot`, Store audit triggers/revision checks. **Workflow impact:** amendments and corrections append instead of overwrite. **Other-module impact:** pricing/PLM/payments/shipping evidence and user administration.

**Final decision/reason:** preserve immutable business history and the recorded narrow assignment exception; do not extend it to other actions. **Files:** `shared/domain.mjs`, `server/store.mjs`, `docs/ADMINISTRATION.md`, tests. **Documentation updated:** G-10/12, EX-01, learnings/baseline. **Workflow:** WF-001; future audit exceptions need new decisions.

## DEC-004 — Reported payment, supplier realization and production readiness

**2026-09-12 addendum:** approval eligibility temporarily superseded by DEC-014 through September; other rules remain. Normal roles resume at the documented IST expiry.

**Date:** 2026-09-12 (0.4.1 sequence); recorded2026-09-12. **Area:** finance/production. **State/evidence:** IMPLEMENTED / code, tests and SW-0023/24 workflow records; shortcut approval intent unknown. **Scope:** MODULE-SPECIFIC Purchase/Payments.

**Decision considered:** what completes payment stage and starts production. **Existing behaviour:** separate generic manager authorization/remittance/realization. **Proposed/implemented behaviour:** initial SWIFT-backed reported payment after commercial confirmations starts production clock; supplier actual receipt remains separate. Initial shortcut auto-adds authorization for eligible order editor.

**Alternatives considered:** historical alternatives unavailable; current options include require receipt first, require explicit manager authorization before shortcut, or preserve observed flow. **Advantages:** production can start on confirmed bank remittance without waiting for supplier reconciliation. **Disadvantages:** shortcut and generic permissions differ. **Risks:** INR check mismatch; payment void does not unwind production clock. **Dependencies:** schedule/FX helpers, current PI/spec/artwork/PO acknowledgements, evidence.

**Workflow impact:** payment -> clock -> sample -> bulk. **Other-module impact:** due dates, payment register, flags and manager controls. **Final decision/reason:** preserve observed readiness contract but classify shortcut as unresolved approval/permission debt, not confirmed policy. **Files:** `COMPLETE_INITIAL_PAYMENT`, `RECORD_PAYMENT`, `initialPaymentStatus`, `dRefreshProductionWindow` in domain; UI payment forms. **Documentation updated:** CAL-02/05..09, EX-02, TD-06/16. **Workflow:** WF-004. No new finance authority approved here.

## DEC-005 — Historical pre-vessel gate package

**Date:** 2026-09-12,0.3.0-alpha.3. **Area:** shipping. **State/evidence:** SUPERSEDED / archived `a2daf48`, SW-0013..0017 and old policy document. **Scope:** MODULE-SPECIFIC Shipping.

**Decision considered:** conditions before vessel loading. **Existing behaviour:** basic partial shipments. **Proposed behaviour:** sample/bulk QC, booking/release, separate pre-dispatch QC, draft BL and insurance checks before vessel loading. **Alternatives considered:** not documented. **Advantages:** explicit document checklist and stage evidence. **Disadvantages:** later required workflow placed final BL/insurance after departure. **Risks:** enforcing obsolete gates against current sequence. **Dependencies:** shipment state, documents, QC and payment readiness.

**Workflow impact:** added shipping gates and tracking imports. **Other-module impact:** production/sample, artwork checks, payments. **Final decision/reason:** historical implementation retained as evidence; **Superseded by DEC-006** for gate order. **Files:** archived domain/shipping/app; old `DECISIONS_FOR_REVIEW.md`. **Documentation updated:** this log and WF-003/004 mark replacement; old file preserved. **Workflow:** WF-003, Replaced by WF-004.

## DEC-006 — Visible current workflow and post-vessel BL/insurance

**Date:** 2026-09-12,0.4.1-alpha.8. **Area:** Purchase/Shipping UX and gates. **State/evidence:** IMPLEMENTED / historical requested change in VERSION_HISTORY and SW-0023/24, verified current domain/tests. **Scope:** MODULE-SPECIFIC Purchase/Shipping.

**Decision considered:** align real sequence and next actions. **Existing behaviour:** DEC-005 pre-vessel QC/draft BL/insurance controls and incomplete visible stage progression. **Proposed behaviour:** complete visible timeline, separate sample completion/approval, no mandatory separate pre-dispatch QC, vessel -> final BL -> insurance -> India-port closure. **Alternatives considered:** retaining old gates is evidenced by previous release; original deliberation unavailable.

**Advantages:** clear required next action and consistent physical/document progression. **Disadvantages:** legacy commands still coexist. **Risks:** old docs or UI code may reintroduce obsolete blocks; stage list is not itself enforcement. **Dependencies:** `STAGES`, domain gates, `orderActions`, timeline, `shippingDocReadiness`. **Workflow impact:** CI/PL and bulk QC remain before vessel; final BL/insurance become post-vessel. **Other-module impact:** credit due dates, payment/production stages, alerts.

**Final decision/reason:** preserve latest evidenced sequence; old requirements were explicitly replaced. **Files:** domain/shipping/app; workflow tests. **Documentation updated:** B-08/09, baseline, WF-004 and historical addenda. **Supersedes:** DEC-005. **Workflow:** WF-004.

## DEC-007 — Final supplier/base/ERP master and freight benchmark

**Date:** 2026-09-12,0.5.3 and0.6.x source records. **Area:** masters, PO entry, PLM, freight. **State/evidence:** IMPLEMENTED / source workbook provenance, changelog and current seed/tests. **Scope:** MODULE-SPECIFIC LAE Import, shared across its modules.

**Decision considered:** authoritative item/supplier/pricing granularity. **Existing behaviour:** supplier library and earlier item/brand mapping; supplier production defaults and raw O/F benchmark. **Proposed behaviour:**37 suppliers,129 final Base Items,3 ERP brand codes each, base-level currency prices, product-first production reference, ERP complaint roll-up and O/F+agent benchmark. **Alternatives considered:** original discussion unavailable; previous SKU/manual/raw-rate behaviours documented historically.

**Advantages:** one technical parent, consistent brand expansion, exact reference master and comparable freight total. **Disadvantages:** two unmapped bases; placeholder transit times; legacy item mapping/prices still supported. **Risks:** generated seed != migration of existing data; base/UI versus item/domain reference drift. **Dependencies:** approved-source constants, vendor mapping, templates, shared calculations. **Workflow impact:** base-first entry and supplier-default term handling. **Other-module impact:** PLM/complaints/prices/imports/freight trends/PO snapshots.

**Final decision/reason:** preserve final source-derived masters and benchmark rule; do not substitute earlier samples. **Files:** clean-seed/final-master-data/domain/shipping/app and master tests. **Documentation updated:** B-02/05/08/10, CAL-08/11..15, baseline counts. **Workflow:** WF-005/006. Counts describe a fresh seed, not user-edited live records.

## DEC-008 — Missing approved PLM warns without fabricating approval

**Date:** 2026-09-12,0.6.1-alpha.16. **Area:** Purchase/PLM. **State/evidence:** IMPLEMENTED / explicit controlled-bypass release requirement, code and `plm_bypass.test.mjs`. **Scope:** MODULE-SPECIFIC PO submission/issue/amendment.

**Decision considered:** whether absent PLM blocks purchasing. **Existing behaviour:** approved technical package required for issue; unpopulated approved master could prevent PO progress. **Proposed behaviour:** if no approved revision exists, allow with persistent exact warning, audit and snapshot flag; no override reason and no fake approval. Where approved revisions exist, require valid approved selection.

**Alternatives considered:** hard block is evidenced by prior behaviour; other options not recorded. **Advantages:** purchasing continues without misrepresenting product approval. **Disadvantages:** operations can proceed without approved technical content. **Risks:** confusing warning bypass with pending-brand/invalid-selection bypass; print warning wording differs. **Dependencies:** `missingApprovedPlmLines`, `issueReadiness`, snapshots/flags, PO UI/tests. **Workflow impact:** removes only the no-approved-PLM block. **Other-module impact:** PLM state remains unchanged; audit/print consume warning metadata.

**Final decision/reason:** preserve narrowly scoped warning bypass recorded in latest release. **Files:** domain/app; PLM bypass tests. **Documentation updated:** B-03, learnings, TD-15; WF-007. **Workflow:** WF-007. Supersedes older mandatory-PLM assumption only for this missing-approval case.

## DEC-009 — Local startup repair and persistent Coolify deployment

**Date:** 2026-09-12. **Area:** delivery/operations. **State/evidence:** IMPLEMENTED / explicit user request in current conversation; commits7507416 andced3d3b and observed live checks. **Scope:** GLOBAL runtime deployment.

**Decision considered:** make local app load, then host repository main in Coolify with requested domain. **Existing behaviour:** final-master-data module returned404 locally; no root Docker deployment. **Proposed behaviour:** add explicit module route/test, root Dockerfile, scoped build context, unprivileged container, persistent/app/data volume, HTTPS domain and runtime admin settings.

**Alternatives considered:** broad static serving, other hosting platforms or ephemeral data were not approved/discussed alternatives; they are merely current technical comparisons. **Advantages:** fixes actual dependency failure and preserves database across container replacement. **Disadvantages:** server remains single-instance SQLite pilot; image lacks admin scripts. **Risks:** backup/recovery/UAT not yet established; future upstream image tag changes. **Dependencies:** Git main, Coolify, DNS/TLS, runtime environment, volume.

**Workflow impact:** local direct Node start and hosted login become available. **Other-module impact:** no finance/business gate change. **Final decision/reason:** deploy requested app/domain with persistent data and private runtime credentials. **Files:** server route, startup test, Dockerfile/.dockerignore, deployment doc. **Documentation updated:** baseline deployment facts replace stale "not deployed" summaries via addenda; TD-19. **Workflow:** WF-008. No credential values belong in this log.

## DEC-010 — Persistent memory and preservation/change control

**Date:** 2026-09-12. **Area:** product governance. **State/evidence:** CONFIRMED by user's current master prompt; IMPLEMENTED by these files. **Scope:** GLOBAL.

**Decision considered:** how to keep future changes consistent. **Existing behaviour:** useful scattered historical docs, no root future-session instruction or unified rules/decision/workflow records. **Proposed behaviour:** six linked living documents plus root AGENTS, evidence classes, stable IDs, append-only decisions/workflows, explicit exceptions and same-cycle updates.

**Alternatives considered:** preserve scattered docs or create one unstructured note; these are present-day comparisons, not prior user proposals. **Advantages:** discoverable rules, calculations and rationale prevent session-by-session reinvention. **Disadvantages:** maintenance work and risk of drift across docs. **Risks:** labelling observed code as approved policy or prescribing unapproved fixes. **Dependencies:** source/record review, current tests and maintainers updating docs.

**Workflow impact:** documentation review precedes future code changes; ambiguous material decisions are discussed. **Other-module impact:** all future work reuses existing rules/brand unless explicitly changed. **Final decision/reason:** implement the user's stated persistent-memory system while retaining raw historical evidence and clearly labelling uncertainties. **Files:** root AGENTS and all six memory docs; README/legacy document pointers. **Documentation updated:** all six; root entry point. **Workflow:** WF-009. No app redesign or new approval gate for routine authorized compatible work.

## DEC-011 — Supplier price history and negotiated exceptions

**Date:** 2026-09-12,0.4.0 with0.6.x base-key evolution. **Area:** pricing. **State/evidence:** IMPLEMENTED / SW-0021/22 and current domain/tests. **Scope:** MODULE-SPECIFIC Supplier price lists/Purchase.

**Decision considered:** reference prices versus negotiated PO value. **Existing behaviour:** manual PO price; later item-specific supplier/currency references. **Proposed behaviour:** auto-fill current reference, allow negotiated difference with warning, retain price revisions and issued snapshot; latest master keys are supplier/base/currency.

**Alternatives considered:** original deliberation unavailable; hard-block negotiated variance is a possible current alternative, not approved. **Advantages:** traceability without preventing negotiation. **Disadvantages:** multiple compatibility lookup paths. **Risks:** effective-date and mixed-currency ambiguities TD-04/05. **Dependencies:** price lookup, PO line creation/edit/issue, currency utilities. **Workflow impact:** reference lookup and warning before issue. **Other-module impact:** no retroactive update to issued PO or realized payment.

**Final decision/reason:** preserve warn-and-snapshot model documented as user-required; investigate current effective-date/currency differences before changing financial results. **Files:** domain `SAVE_PRICE_LIST`/`currentApprovedPrice`/`dLines`, app price forms/tests. **Documentation updated:** B-05, CAL-11, debt register. **Workflow:** WF-010; base-level evolution also WF-006.

## DEC-012 — Administrator user creation portal

**Date:** 2026-09-12. **Area:** Administration/authentication. **State/evidence:** IMPLEMENTED; current user request to provide a user-access portal with user creation. **Scope:** MODULE-SPECIFIC Administration; existing global roles and authentication preserved.

**Decision considered:** how to create usable sign-in accounts from the current application. **Existing behaviour:** local CLI provisions accounts; settings only changes scope assignments. The deployed Docker image omits CLI scripts. **Proposed behaviour:** add Create user to existing Users & settings, backed by an ADMIN-only account resource sharing the CLI's atomic storage operation.

**Alternatives considered:** keep CLI-only administration (requires server access); public self-registration (introduces a different access policy); admin form using shared business commands (risks credentials entering review state/history). **Advantages:** administrators can provision without filesystem access; reuse existing scrypt/session/role/scope controls and brand components. **Disadvantages:** initial password is entered and shared manually; no invitation, reset or deactivation flow. **Risks/assumptions:** an administrator is trusted to assign any existing role; duplicate/stale writes must roll back; credentials must never enter audit or browser persistence. This follows existing administrator authority, not a new non-admin permission.

**Dependencies:** USER_ROLES/SCOPES, Store.createLocalAccount, SQLite transaction/revision checks, session/Origin/CSRF middleware, existing form/modal/error helpers. **Workflow impact:** adds web provisioning while retaining CLI and scope toggles. **Other-module impact:** newly assigned users participate under existing permissions; no purchase, PLM, financial or calculation rule changes.

**Final decision/reason:** implement an authenticated admin form and distinct `/api/users` credential resource. It satisfies requested creation while keeping secret handling inside the server and preserving product conventions. **Files/components:** shared/domain.mjs, server/index.mjs, server/store.mjs, web/app.mjs, generated clean-review HTML, server/browser tests, administration and project memory docs. **Documentation updated:** rulebook B-13/G-16, learnings, baseline, brand reuse note, administration guide and changelog. **Verification:** 97 native tests pass; isolated browser checks cover creation, failed confirmation, duplicate rollback, new-user login, mobile and non-admin visibility; standalone review checked. **Related workflow:** WF-011. Extends DEC-003/009; existing scope-audit exception remains.

### DEC-012 publication evidence — 2026-09-12

The user explicitly requested publication. Application commit `8a96a27` was pushed to repository main and deployed through existing Coolify configuration, deployment `wawt555szxwx5ukuprnayjbe` (finished). Live HTTPS health, exact served source, administrator login/account list, Create user form and mobile rendering passed; logout completed and no live account was created. This executes the confirmed feature without adding a new role policy, workflow or database migration. Baseline and test report updated with live evidence.

## DEC-013 — Multiple attachments and 50 MB per file

**Date:** 2026-09-12. **Area:** evidence, supplier responses and workflow forms. **State/evidence:** IMPLEMENTED; user explicitly requested multiple uploads and 50 MB per file. **Scope:** GLOBAL evidence handling, with a MODULE-SPECIFIC single-source import exception.

**Decision considered:** attach several supplier responses/documents in one submission without losing files or changing transaction semantics. **Existing behaviour:** most forms choose/read one file, PLM/complaints already accept several, browser/server enforce 8 MiB per file, API bodies cap at 12 MiB. **Proposed behaviour:** shared multiple picker and 50 MiB byte limit, sequential uploads with a final attachment collection in one existing business command; legacy primary ID preserved.

**Alternatives considered:** submit all base64 files in one large HTTP body (larger memory/request limits); issue a separate business command per file (could duplicate payments or replace confirmations); replace transport/storage with streaming/object storage (broader architecture change than required). **Advantages:** meets requested selection/size, preserves one workflow response and current SQLite/API design, bounds each request to one file, supports retry and backward compatibility. **Disadvantages:** sequential uploads take cumulative time; JSON/base64 still uses additional memory; an abandoned partially uploaded selection retains uploaded evidence without completing its workflow. **Risks/assumptions:** every attachment must be validated, retry must not duplicate successful uploads, and existing financial gates must stay authoritative. UI MB follows the established binary convention: 50 × 1024 × 1024 bytes.

**Dependencies:** shared size/extension constants; file-field/upload helpers; domain dEvidence/dAttach and response collections; SQLite file BLOBs; request-body cap and auth/CSRF middleware; standalone builder; tests. **Existing-workflow impact:** several attachments now accompany one submission; workflow changes only after all upload requests succeed. **Other-module impact:** PI/artwork/payment/QC/shipping and PLM reuse the collection; import file size rises but preview/row validation and one-source commit remain.

**Final decision/reason:** extend existing upload/storage and domain patterns with collections, keep first-file compatibility, validate all files before sending, retain permission checks for every file, and guard the entire submit phase. This solves the requested limitation without duplicating business actions or introducing a new storage platform. **Files/components affected:** shared/domain.mjs, server/index.mjs, web/app.mjs, generated review HTML, domain/server/browser tests and memory documents. **Documentation updated:** G-17/UX-12/B-14, learnings, brand reuse, baseline/API, changelog, test report and WF-012. **Verification:** 102 native tests pass; isolated multi-file browser tests cover failures/retries, duplicate prevention, mobile and review mode. **Related records:** WF-012; extends DEC-001 storage model, preserves DEC-003 authorization/audit and DEC-012 user administration.

## DEC-014 - Temporary executive purchase and product approvals

**Date:** 2026-09-12. **Area:** Purchase/payments/PLM authorization. **State/evidence:** IMPLEMENTED from the user's request for executive approval coverage through September and explicit clarification: "All approvals, including Product Manager." **Scope:** GLOBAL approval delegation in implemented LAE Import workflows.

**Existing behaviour:** scoped MANAGER/ADMIN issue/return POs, approve amendments/PI and authorize/void payment records; PRODUCT_MANAGER/ADMIN approve artwork/specifications/brand revisions and reject specifications. EXECUTIVE operates assigned orders with existing initial-payment/sample exceptions. **Proposed behaviour:** temporarily add executives to approval actions, including their own submissions and other visible in-scope orders, retaining their real role and ordinary edit boundaries.

**Alternatives considered:** promote executives to MANAGER (grants unrelated edits and misses product approvals); broaden generic role helpers (leaks master/template powers); manual role rollback (can be forgotten); timed command allowlist (selected). **Advantages:** resolves missing-approver bottleneck, covers both confirmed approval areas, expires automatically, preserves identity, no account/schema migration. **Disadvantages:** self-approval relaxes independent review; manager coverage is needed after September. **Risks/assumptions:** server clock accuracy, preserved readiness/scope enforcement, no reliance on client time/role. Returns/rejections and payment void-as-correction accompany approval review; cancellation, short closure, master/template/user administration remain excluded.

**Dependencies:** shared execute/permission helpers/trusted now; persisted session actor; optimistic SQLite transaction/audit; purchase/product controls; standalone builder. **Existing-workflow impact:** executives can perform manager handoff steps without removing submission, verification, evidence or reasons. **Other-module impact:** financial formulas, shipping gates, immutable snapshots and ordinary editing/administration unchanged. Existing sample/initial-payment/price-list powers remain independent.

**Final decision/reason:** use TEMPORARY_APPROVAL_POLICY, APPROVAL_ROLES and canPerformApproval. Start 2026-09-12T00:00:00+05:30 inclusive; end 2026-10-01T00:00:00+05:30 exclusive. Each server transaction checks time/identity; completed approvals survive expiry. Delegated audit events add policy ID, command and expiry alongside the executive actor; new submission/rejection summaries use neutral role wording. Existing management helpers retain their permissions. UI reuses buttons/warning note and refreshes at the boundary. This delivers the confirmed scope with automatic restoration and bounded powers.

**Files/components affected:** shared/domain.mjs, web/app.mjs, generated review, domain/server tests, three_workflow_browser_flow.mjs, temporary_approval_browser_flow.mjs and project docs. **Documentation updated:** B-15/EX-05, learnings, brand, baseline, WF-013, changelog and reports. **Verification:** 106 native tests; Executive-only lifecycle 37 checkpoints to port arrival/settlement; 13 server/review browser checks for technical approve/reject, expiry, mobile and audit; zero runtime errors. **Deployment:** local source only; no live PO mutation/deployment.

**Related/supersession:** temporarily supersedes only approval eligibility in DEC-003/004 and WF-001/002/004; other requirements continue. Normal roles resume automatically at expiry. Extension requires another confirmed record; see WF-013.

## Record template - next DEC-015

**Date:**
**Area/module:**
**Decision ID and title:**
**State and evidence class/source:**
**Existing behaviour:**
**Proposed behaviour / decision considered:**
**Alternatives actually considered:**
**Advantages:**
**Disadvantages:**
**Risks and assumptions:**
**Dependencies:**
**Impact on existing workflows:**
**Impact on other modules:**
**Final decision:**
**Reason:**
**Files/components affected:**
**Scope (GLOBAL / MODULE-SPECIFIC):**
**Documentation/rulebooks updated:**
**Verification:**
**Related WF/DEC IDs / supersession:**

Use "not recorded" for unavailable historical rationale. A recommendation remains PROPOSED/RECOMMENDATION until a final choice is explicit. When superseded, add a new entry and cross-link the old one; never delete history.
