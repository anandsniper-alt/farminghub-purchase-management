# Soft-launch QA defect log

## Current local Manager build — DEC-030, 13 September 2026

135 native checks and six complete workflows across two isolated Manager accounts pass; all arrived and settled. Setup, approval-control and import lifecycle checks pass in server/review. The build includes the earlier 13 QA fixes plus the independent Manager and setup recovery changes. Live deployment and Admin policy activation remain pending; all live QA creations are untouched. See [QA_EXECUTION_REPORT.md](QA_EXECUTION_REPORT.md) and [MANAGER_WORKFLOW.md](MANAGER_WORKFLOW.md). Historical evidence follows.


Current status: **13 fixes implemented locally; deployment and live retest pending.** Latest validation: 131 native tests, 38 import lifecycle checks, 33 payment checks and 8 mascot pagination checks passed. Earlier run counts below are historical. TD-06 remains an unapproved planning-date policy question.

## BUG-009 — Persistent mascot blocks pagination clicks

- Discovered during continued live module coverage on 13 September IST. Severity P2; Item Master and other page-bottom controls.
- Reproduction: Minimal theme, Base Item Master page 1, click Next with the mouse. The fixed support launcher covers the target after scrolling; Playwright's ordinary click reports pointer interception by `.support-launcher`. Keyboard Enter on Next recovers navigation.
- Evidence: live r2pages-002 and runner pointer-interception log; 130 bases and 387 ERP items subsequently reconciled with keyboard navigation in round2-pagination. This recovery does not pass mouse accessibility.
- Cause: content bottom padding is smaller than the persistent dock's occupied area. Minimal's compact page layout places pagination underneath it.
- Local solution: reserve 112px plus safe-area bottom space when the support dock exists. Preserve the mascot, themes, business controls and print layout.
- Verification: isolated server/review, Current/Minimal, 1440/390px. Before fix: all four Minimal combinations failed; after fix: all eight combinations pass ordinary Next/Previous clicks with the mascot visible. Evidence: D:/CodexTestTemp/FarmingHub/reports/mascot-pagination/2026-09-12T18-52-04-718Z and 2026-09-12T18-52-37-148Z.
- Files: web/support.css, generated review build, tests/mascot_pagination_browser_flow.mjs. Status: FIXED LOCALLY; live release/retest pending. DEC-029 follow-up; no workflow or permission change.

Execution: 2026-09-12, live website, Ashok / MANAGER, browser controls only. This is an active log; none of the entries below is a claim of a deployed fix. Evidence remains in ignored `test-output/ashok-live-qa/`.

## BUG-001 — Current-stage card describes incomplete actions as completed

- Severity: P2; module: PO workflow presentation.
- Reproduction: create QA-ASHOK-0912-01; save draft, submit, verify PI, and reject its pre-production sample.
- Expected: clearly distinguish current status, next action and completed milestones.
- Actual: draft card says “Submitted for approval”; pending issue says “PO approved & issued”; verified PI says “PI approved”; rejected sample says “Pre-production sample approved.” These are the first incomplete milestone's past-tense labels under “Current workflow stage.”
- Root cause: `orderOverview` uses `STAGES.find(... !done)` label as current status. The domain and primary buttons correctly retain pending/rejected states in these reproductions.
- Data integrity: no incorrect approval observed; misleading operational display can lead to mistaken decisions.
- Evidence: `q1-save`, `q1-submit`, `q1-pi-verify`, `q1-sample-rejected-state` JSON/PNG.
- Proposed fix: label the incomplete milestone as pending/next, and render actual state/action wording without claiming approval. Preserve stage and permission calculations.
- Files: `web/app.mjs`, generated review build; browser regression pending.
- Status: OPEN; no fix/deployment claimed.

## BUG-002 — Assigned follow-up displays Unassigned

- Severity: P2; module: tasks and follow-ups.
- Reproduction: select Ashok as owner of QA-ASHOK-0912-01; issue PO; inspect auto-created supplier follow-up.
- Expected: follow-up owner displays Ashok.
- Actual: row displays Unassigned.
- Root cause: source `dTask` writes `ownerId`, but `taskTable` reads `t.owner`.
- Data integrity: observed source mismatch is presentation-only; verify live visible audit/owner before claiming persisted identity.
- User impact: team cannot identify responsibility from the task table.
- Evidence: `q1-issue`, `q1-sample-rejected-state` JSON/PNG.
- Proposed fix: read authoritative `ownerId`, preserve any established legacy `owner` compatibility. No reassignment/migration.
- Files: `web/app.mjs`; browser regression pending.
- Status: OPEN.

## BUG-003 — Container booking gives an unexplained empty logistics dropdown

- Severity: P1 operational blocker before real launch; module: Shipping/master setup.
- Reproduction: finish test production, plan shipment QA-ASHOK-01-S1, open Book container.
- Expected: choose active logistics provider, or see explicit setup/recovery guidance if none exists.
- Actual: required Forwarding agent contains only “Select active logistics provider.” Vendor master lists 37 product suppliers and no logistics provider. No local recovery instruction is shown in the booking form.
- Root cause: initial approved master contains suppliers only; booking correctly filters ACTIVE LOGISTICS records; missing-empty-state guidance hides the dependency.
- Data integrity: booking is blocked; no bypass or false booking recorded.
- Evidence: `q1-book-form`, `q1-book-missing-forwarder`, `qa-vendors`, `qa-add-forwarder-form` JSON/PNG.
- Solution: Purchase Manager can use Add vendor → Party type LOGISTICS → ACTIVE. QA adds only a clearly labelled synthetic logistics provider, retained active. Real launch still requires a verified real forwarding agent; QA data is not that setup.
- Proposed code fix: add role-appropriate empty-state guidance to booking; do not seed fake production providers or loosen the logistics gate.
- Files: `web/app.mjs`; setup recovery and regression pending.
- Status: OPEN; synthetic QA recovery in progress.

## BUG-004 — Partial-quantity planning hides the existing shipment's next action

- Severity: P2; Shipping / order guidance.
- Reproduction: QA-ASHOK-0912-01 allocated four of eight units; after vessel loading, the header still offered Plan shipment instead of the first shipment's final BL/insurance progression. Shipping tab controls remained usable.
- Expected: required work on an existing shipment remains discoverable; further planning stays available.
- Root cause: the unallocated-quantity branch precedes active-shipment requirements in orderActions.
- Solution implemented locally: move optional next-shipment planning after required existing-shipment branches. Preserve all gates and Shipping controls.
- Evidence: first-order UI sequence around vessel loading and BL; local `soft_launch_ui_browser_flow.mjs` asserts primary BL action with unallocated quantity in both modes.
- Status: FIXED LOCALLY; live retest after publication pending. No data/permission change.

## BUG-005 — A new PLM product has no reachable ERP setup path

- Severity: P1; PLM → Item master → new PO.
- Reproduction: create synthetic QAAS01, save and approve technical QA-1.0. Product shows zero Brand SKUs. Item master search for QAAS01 shows zero ERP items and no creation action. New PO cannot expand brand quantities for this base.
- Root cause: item-edit / SAVE_ITEM exist but no visible button exposes them. SAVE_ITEM also omits baseItemCode and brandPrefix, which base-first PO selection consumes.
- Solution implemented locally: Add ERP item in the existing library/product panel; reuse existing form/command; derive metadata from the explicit selected base and active brand. Newly saved brand requirements stay PENDING; configured approval remains required. No automatic item seed, approval or role change.
- Evidence: `qa-plm-created`, `qa-spec-approved-state`, `qa-erp-search`; native `erp_mapping.test.mjs` and native/review browser regression verify mapping and visible setup. The new base remains active on live.
- Risks: live approved-PLM end-to-end case remains BLOCKED until this fix is published and its new ERP brand records approved through Ashok's UI.
- Status: FIXED LOCALLY; live verification pending.

## BUG-006 — PLM readiness explanations contradict the missing-specification rule

- Severity: P2; PLM guidance.
- Reproduction: inspect create-product dialog and no-approved-spec product detail. They say an approved specification is always required and the base cannot be issued.
- Expected: DEC-008 allows missing approved technical PLM with a visible warning; existing approved revisions must be selected. ERP brand approval is a separate gate.
- Root cause: old copy survived the missing-PLM behavior change.
- Solution implemented locally: distinguish missing-spec warning, existing approved-version selection and required brand setup. No workflow bypass added.
- Evidence: `qa-plm-create-form`, `qa-plm-created`; source review against DEC-008 and successful live BS20 issue.
- Status: FIXED LOCALLY; live copy verification pending.

## BUG-007 — Freight import silently changes negative/grouped amounts

- Severity: P1; financial input integrity in weekly freight rates.
- Initial discovery: source audit, reproduced in isolated native tests; live preview reproduction pending. This is not yet labelled a live observation.
- Reproduction: preview O/F USD `-1` or `USD 3,001.25`. Old normalization extracts the first unsigned numeric substring: `1` or `3`. Both can be READY, producing an incorrect benchmark.
- Expected: negative/malformed values rejected; valid grouped USD3,001.25 retained with agent120 and benchmark3,121.25.
- Root cause: unanchored unsigned-number regex.
- Solution implemented locally: parse complete positive finite USD cells, accepting plain numbers, optional USD/$ notation and valid thousands grouping. Preview/commit share normalization. Fee thresholds and variance formulas unchanged; old snapshots are not rewritten.
- Evidence: `tests/freight_input.test.mjs` failed on both defects before fix and passes after; local native/review preview verifies rejection disables commit and grouped amount preserves benchmark.
- Compatibility: malformed ranges/text previously misinterpreted now rejected. No historical data correction is inferred or performed.
- Status: FIXED LOCALLY; live preview/release verification pending.

## Verification update — DEC-029 / WF-023

BUG-001 and BUG-002 are now FIXED LOCALLY using authoritative status/ownerId (legacy owner fallback). BUG-003 recovery was exercised by creating retained, clearly synthetic V98-QALF; the explanatory empty state is fixed locally. A verified **real** forwarding agent is still an operational launch prerequisite and is not supplied by the QA fixture.

Targeted native/review browser regression: 23 checks passed, evidence under `D:\CodexTestTemp\FarmingHub\reports\soft-launch-ui\2026-09-12T18-02-32-064Z`. Earlier fixture/assertion failures remain retained: partial-shipment fixture initially had an unrelated initial-payment requirement; a grouped-number assertion initially forgot display commas. Those were test corrections, not extra product defects. Native suite: 127 passed after all current changes. No entry here certifies live deployment or closes unexecuted risks.


### BUG-005 follow-up: partial mapping can silently drop requested brand quantities

An isolated native/review reproduction created a base with only GJ configured, entered GJ2 and KD3, and saved. Before the guard, a draft was created (five fixture orders became six) while the unmapped KD request was omitted by expandedDraftLines. The same defect can occur after partial new-product setup. Submission now rejects any positive quantity without its active ERP mapping and retains the form; the hint points to Item master. After the fix, both modes remain at five orders and explain the missing KD ERP item. No live order was changed by this reproduction. Latest targeted regression: **25 checks passed**, `D:/CodexTestTemp/FarmingHub/reports/soft-launch-ui/2026-09-12T18-19-02-384Z`. Previous failed runs are retained.

## BUG-008 — Commitment change drops the selected reason from history

- Severity: P2; production audit completeness.
- Reproduction: QA09 Update commitment selected Supplier production and changed the date from 11 to 18 November. Expanded COMMITMENT UPDATED history contains date and remarks but no selected reason. Evidence: `audit09-values-state`.
- Expected: retain the supplied cause along with the changed promise and original baseline.
- Root cause: UPDATE_COMMITMENT ignores payload.reason when writing its event.
- Fix: validate a supplied reason against existing REASONS and retain it in the append-only event; legacy omitted reasons remain null. Baseline, committed-date calculation and old events are unchanged. No new mandatory step or reason inference/backfill.
- Verification: `commitment_audit.test.mjs` fails before and passes after; native/review UI opens history and confirms the selected Payment processing reason and both dates. Initial browser test was corrected to select Overview explicitly before Update commitment; it had retained the Shipping tab.
- Status: FIXED LOCALLY, not published.

## Final evidence update

- BUG-005 live save attempt now captured in `case02-blocked-live`: GJ/KD quantities entered for approved QAAS01, but the old build says to enter a positive brand quantity because all unmapped requests were dropped. No QA02 PO was created; the product/specification remain retained.
- BUG-006 also reproduced in issued QA10 Items & artwork: absent specifications show a green Unselected and instruction to choose a version before issue. Local copy now states historical absence and uses amber, preserving issued snapshots. Evidence: `revision-case10-old-state`, `revision-case10-new-state`.
- BUG-007 confirmed through live browser preview: USD -3000 becomes3000/benchmark3120 (`preview-006`); USD3,001.25 becomes3/benchmark63 (`preview-008`). Both previews were cancelled; no bad rate was committed. Boundaries2999/3000/3001 correctly produce3059/3120/3121 (`preview-010`).
- Latest targeted native/review suite: **31 checks passed**, `D:/CodexTestTemp/FarmingHub/reports/soft-launch-ui/2026-09-12T18-26-05-783Z`. Current native suite: **128 passed**. All eight fixes remain local pending publication/live retest.


## BUG-010 — Tracking rejection reason hidden (P2)
Live missing-Ref preview rejected the row but displayed only warnings, leaving the operator without its required correction. Evidence: round2-tracking-missing-ref / round2-tracking-malformed. Fixed locally: merge errors and warnings in preview and validation export. Verify missing Ref explicitly.

## BUG-011 — Duplicate keys inside one import batch (P1)
Live preview accepted two conflicting ETAs for the same Ref and two different rates for the same route/container/week. Evidence: round2-tracking-duplicate-ref; round2-rate-duplicate. No conflicting batch was committed live. Fixed locally: reject every repeated nonblank Ref or normalized route/container within a file with a one-row-per-key explanation. Distinct containers and later correction batches remain supported. Authoritative commands reuse this validation and reject empty normalized batches.

## BUG-012 — Failed replacement leaves previous import ready (P1)
Live invalid-heading replacement retained the preceding valid file, rows and commit action. Evidence: round2-tracking-missing-headings; round2-rate-missing-headings. Fixed locally: clear the preview before reading, disable commit until valid nonempty rows exist, ignore obsolete reads after replacement/close, and preserve the selected report date/week. No old import was accidentally committed during QA.

Local verification: tests/import_validation.test.mjs plus freight_input.test.mjs: 5 passed; tests/import_preview_browser_flow.mjs: 26 passed across server and standalone review. Report: D:/CodexTestTemp/FarmingHub/reports/import-preview/2026-09-12T19-17-06-081Z. Live failures remain open until deployment and browser retest.


## BUG-013 — Indian-bank rate loses precision in register (P2)
Live QA14 stored input85.123456 is displayed as85.1235 while BOC7.123456 remains visible. Evidence: round2-live-payment-register; input r2close14-033; bank amount USD70. This is a display loss, not evidence of altered stored calculation. Fixed locally by reusing the existing six-decimal rate-text formatter. tests/payment_rates_browser_flow.mjs now checks the bank rate as well as BOC, actual receipts and responsive layout:33 checks pass across server/review (D:/CodexTestTemp/FarmingHub/reports/payment-rates/2026-09-12T19-31-30-235Z). No financial formula or historical payment changed. Live retest pending.

Further import race verification:38 server/review checks pass, including disabled commit during a delayed read, newer selection winning over an older completion, and close staying closed after a late read. Evidence: D:/CodexTestTemp/FarmingHub/reports/import-preview/2026-09-12T19-27-43-995Z. Full native suite:131 passed,0 failed (native-regression-imports.txt).

## TD-06 — Planning-date range needs a product decision
QA15 accepted a past1Jan2020 and extreme31Dec9999 required-port date for submission. It was returned to draft and restored to15Dec2026 without issuing either extreme date. No arithmetic overflow was observed. The application does not define a reasonable planning horizon or explicit past-date exception. Recommendation: preserve historical records; on new submission show an explicit past-date acknowledgement and a configurable planning horizon. Hard rejection, warnings, and manager exceptions have different operational effects; no binding date policy was silently introduced. Scope: PO planning; evidence round2-past-date-submitted, round2-future-date-submitted, round2-date-order-retained.
