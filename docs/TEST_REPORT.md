# Test Report — v0.6.1-alpha.16


## Payment reference build release checks - DEC-027/028

2026-09-12: normal review and isolated prototype builds pass; native startup module graph passes. The unchanged payment domain was verified by 124 native tests in the preceding implementation run. Final browser runs after the overlay fix: 31 payment checks in server/review (D:/CodexTestTemp/FarmingHub/reports/payment-rates/2026-09-12T17-19-16-583Z/) and 44 presentation/guide checks (D:/CodexTestTemp/FarmingHub/reports/presentation-release/2026-09-12T17-19-43-255Z/), no runtime errors. Mobile title hit-testing confirms appearance controls cannot obscure the form. Read-only live record hashes captured before deployment; live checks follow publication.


## Payment rate clarity and optional BOC reference - DEC-027 / WF-021

2026-09-12, local verification: node --test tests/*.test.mjs -> 124 passed, 0 failed. node tests/payment_rates_browser_flow.mjs -> 27 passed across native server and standalone review; no runtime errors. Verified initial/regular remittance currency labels, optional blank rate, six-decimal persistence/table display, supplier receipt inheritance/override/clear, actual-amount independence, non-USD visibility/stale-rate clearing, and 390px layout. Native tests cover invalid/zero/negative/overprecision/non-USD values, atomic rejection, correction reasons, legacy omission and unchanged settlement.

Evidence: D:/CodexTestTemp/FarmingHub/reports/payment-rates/2026-09-12T17-17-11-372Z/. First attempt found a focused BOC field could emit its old value while currency change replaced the form; clearing the DOM field before replacement fixes this. Normal standalone and isolated theme builds regenerated; syntax and git diff checks passed. Synthetic databases/evidence only; no live update or deployment performed.

Published 2026-09-12: application commit **b9d76e0e5a5017465994ce9c0c631018fc3b504b** is live at https://purchase.dvjassociates.com. Coolify deployment **wco6vztxn3hp1ptmhqgnslsy** finished; health HTTP 200. Fifteen signed-in live checks passed for Minimal/Current, Show page guides, mascot steps, Vendor master, mobile layout and no business writes/runtime errors. Eleven published module/style/pose assets match the local committed build. Hashes of orders, payments, files, events, users, vendors, items, bases, costs and approval controls, plus workspace revision, match the pre-release baseline. No business records, roles or approval controls changed. Evidence: ignored test-output/presentation-live-report.json and presentation-live-mobile.png. DEC-026 / WF-020; this supersedes earlier unpublished/local-only status notes for the adopted theme and DEC-025 fixes.


## Production presentation release verification - DEC-026 / WF-020

2026-09-12: node --test tests/*.test.mjs -> 122 passed. Browser consistency run after integration -> 36 passed (D:/CodexTestTemp/FarmingHub/reports/consistency-fixes/2026-09-12T17-01-25-173Z/). New presentation release suite -> 44 passed in native server and standalone review (D:/CodexTestTemp/FarmingHub/reports/presentation-release/2026-09-12T17-04-35-822Z/). Checks cover default/persisted appearance, visible Show page guides, loaded mascot poses, contextual guidance, preserved form input, real animations/reduced motion, 320/390px controls, no runtime errors and unchanged stored data/no business writes. Visual review found a narrow-phone header overflow; runtime CSS hides the redundant breadcrumb below 420px and truncates long account names while retaining navigation/sign-out. Explicit no-page-overflow checks now pass at 320/390px in both modes. Startup graph includes experience.mjs and its imports. Normal standalone build passes; production sample/replay controls absent. First presentation attempt missed expanding More actions in the test; locator flow corrected, no app workaround. Live verification follows deployment.


## Consistency fixes and guide-toggle preservation - 2026-09-12 (DEC-025 / WF-019)

Local source/review/preview verification; not a live deployment or live database audit.

- Native: node --test tests/*.test.mjs -> 122 passed, 0 failed. Includes seven new projection, tracking ownership/atomicity, forged approval, vendor identity, master scope and unchanged production-reference contract tests. After adding vendor-import-history projection, the seven targeted tests were rerun and passed.
- Browser: node tests/consistency_browser_flow.mjs -> 36 passed, 0 errors across native server and standalone review. Covers 16 currently derivable stages appearing once in Board, six previously missing filtered stages, complete Overview totals, populated Vendor master, short sidebar reachability, bootstrap 503/retry/401 login, item-versus-base production reference, override visibility and preservation of input focus/unsaved notes. Persisted business state unchanged. SAMPLE_REQUIRED remains a catalog label currently not returned by orderStatus; grouping includes it without changing status derivation.
- Preview: node prototypes/minimal-theme/check.mjs -> 42 passed; node prototypes/minimal-theme/check-support.mjs -> 66 passed. Minimal Show page guides visible/enabled, explanations toggle, responsive controls at 320/390px, theme/motion/reduced-motion and persistent mascot guide remain functional. No external host/API business writes or runtime errors.
- Builds: node scripts/build.mjs and node prototypes/minimal-theme/build.mjs passed. Syntax checks for changed runtime modules and git diff --check passed.

Current artifacts (ignored, synthetic fixtures): D:/CodexTestTemp/FarmingHub/reports/consistency-fixes/2026-09-12T16-55-35-696Z/, theme-preview/2026-09-12T16-56-01-380Z/, gaja-guide/2026-09-12T16-56-19-082Z/. Each directory has report.json and browser evidence. Earlier failed attempts remain separate and are not counted: duplicate fixture serials/missing sample prefix, then wrong heading/label-parent locators were corrected.

Scope limits: no production publication; no changes to active approval controls, payments, FX formulas or historical records. Future-effective price activation and invoice/price-list currency policy remain unresolved business decisions. Minimal theme and mascot remain isolated proposals, with Show page guides explicitly preserved.

## Persistent instruction-only guide verification - 2026-09-12, DEC-024

**66 guide checks and 41 theme regression checks passed.** Verified dock visibility in pages/forms/native tour, current order primary-action guidance, missing-required-field guidance, Take me there focus with no submission/state mutation, preserved unsaved remarks and underlying form on Escape, existing tour controls, brand/poses, reduced motion and 320/390px fit. Theme regressions include form validation/save, approval/deletion disclosures and filter/sort behavior with the reserved dock space. Desktop and mobile screenshots inspected.

Both browser runners saw no external requests, business API calls or runtime errors. Generated HTML has no AI endpoint/composer; provisional AI source/test files were removed and serve.mjs is GET-only again. No provider key or external model call was used. Syntax/build and diff checks passed. Guide evidence: D:/CodexTestTemp/FarmingHub/reports/gaja-guide/2026-09-12T16-42-18-784Z/. Theme evidence: D:/CodexTestTemp/FarmingHub/reports/theme-preview/2026-09-12T16-43-27-617Z/. Each directory includes report.json, trace.zip and screenshots. This remains local sample verification; no production publication.


## Farming Hub logo replacement verification - 2026-09-12, DEC-023

**58 guide browser checks passed.** Header logo matches the original repository logo source; guide text/image alternatives omit the former mascot name. All three replacement assets load and the welcome/pointing/final progression, Back/reopen, guide controls, role filtering, modal suppression, keyboard/Escape and reduced-motion checks pass. Mobile card verified at 320/390px; artwork and screenshot visually inspected. No browser errors, live-host/API writes or changes to saved purchase state. Syntax, isolated build and diff checks passed.

Evidence: D:/CodexTestTemp/FarmingHub/reports/gaja-guide/2026-09-12T16-29-12-692Z/ (report.json, trace.zip and desktop/mobile screenshots). Runner: prototypes/minimal-theme/check-support.mjs. Active assets: assets/farminghub-welcome.png, farminghub-pointing.png, farminghub-ready.png; full edit prompt/source reference: assets/BRANDING_PROMPT.md. Garment patches are generated renderings of the logo; HTML header uses the exact original. Local preview only; no deployment.


## Green/lime GAJA pose verification - 2026-09-12, DEC-022

**56 guide browser checks passed.** Verified three distinct bundled assets, welcome launcher/first step, pointing explanations, thumbs-up final step, reopening pose reset and unchanged purchase data. Existing guide checks still pass: Next/Back/Skip/Finish, focus containment, Escape/focus restoration, available-role filtering, route cleanup, business-dialog suppression, Current comparison, eleven additional pages, 320/390px layouts and reduced motion. No browser errors or live/API writes. Syntax checks and isolated build passed.

Desktop and mobile screenshots visually inspected; green/lime clothing, readable GAJA identity and clean white image surfaces fit the card. Original transparency requests returned opaque checkerboards; those outputs were replaced by white-background edits and are not included in the project. Final pose assets are RGB/white-background, not transparent; see assets/POSE_PROMPTS.md.

Evidence: D:/CodexTestTemp/FarmingHub/reports/gaja-guide/2026-09-12T16-23-14-147Z/ (report.json, trace.zip, desktop welcome/pointing/final and mobile screenshots). Runner: node prototypes/minimal-theme/check-support.mjs. This is current local guide verification only, not production deployment or a new full business-workflow test. Earlier 41 theme checks remain historical evidence for the preceding revision.


## GAJA guided support verification - 2026-09-12

**50 guide checks and 41 theme regression checks passed.** Guide coverage: opt-in entry, bundled mascot, seven pipeline steps, targeted highlight, Next/Back, focus containment, Escape/focus restore, Skip/Finish/reopen, Current/Minimal, order-stage explanation, business-dialog suppression, eleven additional page tours, stale-route cleanup, 320/390px layout, reduced motion and Viewer omission of unavailable creation controls. Saved order state remains identical after tours. Both runners report no browser errors, no live-host/API calls and no business writes from the guide. Syntax/build and diff checks passed.

Guide evidence: D:/CodexTestTemp/FarmingHub/reports/gaja-guide/2026-09-12T16-16-43-317Z/ (report.json, trace.zip, desktop/mobile screenshots). Theme regression evidence: D:/CodexTestTemp/FarmingHub/reports/theme-preview/2026-09-12T16-16-43-338Z/. Runners: prototypes/minimal-theme/check-support.mjs and check.mjs. An initial guide test caught Tab leaving the card for browser chrome; explicit boundary wrapping fixed it. Visual QA also corrected markup symbols affected by shell encoding. Final screenshots inspected on desktop and mobile. This verifies the isolated sample, not production UAT. DEC-021.


## Animation follow-up verification - 2026-09-12

**41 browser checks passed.** Page entrance now uses a 280 ms fade/12px slide; dialogs use 240 ms fade/12px slide with subtle scale; expanded workflow/guidance/actions use a 220 ms reveal. Replay animation restarts page motion without altering sample data or stacking animations. Current comparison disables replay. Reduced-motion preference cancels active prototype motion and disables replay; native disclosure and keyboard behavior remain available. Verified keyboard expansion, repeated replay without stacking or state mutation, reduced-motion disable/re-enable, 320/390px toolbar fit and existing sorting/filtering/forms/approval disclosures. No browser errors or live/API requests. Syntax and isolated build passed. Evidence: D:/CodexTestTemp/FarmingHub/reports/theme-preview/2026-09-12T16-07-55-863Z/ (report.json, trace.zip and screenshots). Runner: node prototypes/minimal-theme/check.mjs. Earlier 32-check record describes the initial version; this result verifies the updated prototype only. Live source/site unchanged.

## Isolated minimal theme trial - 2026-09-12

**32 browser checks passed** against http://127.0.0.1:8137 with eight illustrative sample orders. Verified Current/Minimal comparison without state mutation, separate normal-review storage, guide reveal, supplier/serial controls, expandable timeline with visible current stage, working required-field validation and a sample interaction-note save, visible deletion and approval risk disclosures, nine module views, actual page/dialog animation durations, reduced-motion disabling, mobile compare/filter controls, no live-host/business API requests and no runtime errors. CSS/JS/build syntax checks passed. Production application source/domain and normal build were not modified, so this is not a production UAT or full financial regression claim.

Evidence: D:/CodexTestTemp/FarmingHub/reports/theme-preview/2026-09-12T16-01-58-720Z/ (report.json, trace.zip, Current/Minimal pipeline, overview, order, form and mobile screenshots). Runner: node prototypes/minimal-theme/check.mjs. Generated preview HTML is ignored and uses separate localStorage/IndexedDB namespaces. The local server exposes only GET preview HTML and binds to loopback.

Early visual inspection found an embedded CSS BOM affecting the preview-strip offset; the generator now strips it. An initial exact-label test locator failed on a required-field marker; prefix matching corrected the locator. Final checks passed after both fixes. The user has not yet accepted/rejected the visual proposal. Live site unchanged; see DEC-020 and prototype README.


## Pipeline sorting live publication and requested test batch - 2026-09-12

Application commit **db6978cc249c7d8b039c34cdbceee4bedc7daea0** is live at https://purchase.dvjassociates.com through Coolify deployment **6fwkw5g3hzfiqxrq1bqry7me** (finished; application running:healthy). This publishes DEC-019 / WF-018 / UX-12. Earlier local-only statements for sorting are superseded by this record. Existing domain, runtime configuration and persistent volume retained.

The user explicitly requested ten test records across many suppliers on the published build. Created **TEST-SORT-001 through TEST-SORT-010** through authenticated Admin CREATE_ORDER commands in the live pipeline, across ten existing eligible supplier records. All are clearly labelled synthetic TEST DRAFTS, with varied quantities/prices, unsubmitted/unapproved and no PI, payment authorization, shipments or documents. The batch uses ordinary automatic serial allocation; deleting these drafts later will leave their serials unused under B-18. Test drafts are owned by the creating administrator and remain editable by scoped Purchase Managers.

This was an explicit one-time data action, not automatic build/startup seeding. The private local provisioning runner checks batch-number/notes identity, prevalidates draft payloads through the domain, uses current optimistic revisions and avoids duplicates on retry. Normal clean initialization remains unchanged; no private database or test artifact is included in the image/Git.

**8 batch verification checks passed:** exactly ten identified drafts/ten suppliers; no approvals/operations; distinct automatic serials; pre-existing order records unchanged; payments/users/approval controls unchanged; original audit prefix retained; new creations auditable. **16 live browser checks passed:** HTTPS/source match, controls, all ten visible through TEST-SORT- search, numeric serial ascending/descending, alphabetical supplier sorting, exact supplier and stage filtering, mobile fit, reset, no browser-write requests or runtime errors. Browser verification was read-only after the separately authorized creation batch; administrator logged out.

Release tests: 52 sorting browser checks, 31 bulk regression checks, native startup test and review build passed. Ignored artifacts: test-output/live-pipeline-test-batch-report.json and test-output/pipeline-sort-live-report.json. Screenshot: D:/CodexTestTemp/FarmingHub/pipeline-sort-live-test-orders.png. To find the live batch, search TEST-SORT- in Order pipeline.


## PO pipeline supplier/serial sorting - 2026-09-12

**52 browser checks passed** in isolated authenticated server and standalone review modes. Scenarios cover original order default; numeric serial sorting over multiple pages; ascending/descending headers and accessibility/focus; supplier-name sort with permanent serial ties; exact supplier ID for duplicate names; composed stage/search/code filtering; exported full filtered order with appended supplier name; empty/reset; cleared bulk selections; natural PO number order; deleted view; board filtering; 390px mobile controls; Manager access without Admin controls. Zero browser runtime errors, no business-write requests, and full stored state unchanged.

**31 bulk delete/restore regression checks passed** after updating the serial-header selector to its accessible sort-button name. Native `node --test tests/startup.test.mjs` passed (1 test); syntax check, `node scripts/build.mjs` and git diff --check passed. Shared domain/server code did not change, so no unrelated full financial suite rerun was needed.

Evidence: D:/CodexTestTemp/FarmingHub/reports/pipeline-sort/2026-09-12T15-28-04-138Z/ (report, screenshots, CSV downloads, traces and synthetic SQLite); bulk-orders/2026-09-12T15-28-29-304Z/. Runner: `node tests/pipeline_sort_browser_flow.mjs` with process TMP/TEMP and FH_TEST_OUTPUT_ROOT on D:. Test artifacts remain outside Git. No live orders/settings changed. Local implementation, not a publication record.


## Approval controls live publication - 2026-09-12

Application commit **36a0198304ec3c1f723f9fcb4aabe0376b2018f8** deployed to https://purchase.dvjassociates.com through Coolify deployment **evhfg1nzclwtzvfdlfsedofd** (finished; application running:healthy). This publishes DEC-018 / WF-017 / B-20. Earlier local-source/unpublished notes for these controls are superseded by this publication record. Domain, runtime configuration and persistent data volume retained; no schema migration or live role/policy rewrite.

**15 live checks passed:** HTTPS health, exact served app/domain source, Admin entry, all 13 stages, current-policy role selections, fixed Admin/Viewer restriction, required reason, confirmation/persistence guidance, selecting Manager artwork coverage, restore-form behavior, mobile fit, cancellation preserving controls, no business/settings/user/file writes and no browser runtime errors. Administrator logged out. The verification only edited and canceled a draft form; no live approval relaxation was saved.

Use Users & settings > Manage approval controls, select role permissions, provide a reason, confirm and save. Changes stay active until edited/restored; Admin retains access. Release validation also passed 115 native tests, 29 server/review controls browser checks and 55 full-flow checks covering three configured Manager-only purchases through port arrival and SETTLED with zero balance. These synthetic workflow transactions were isolated, not live business activity.

Ignored live report: test-output/approval-controls-live-report.json. Local mobile evidence: D:/CodexTestTemp/FarmingHub/approval-controls-live-mobile.png.


## Approval controls and configured Manager workflows - 2026-09-12

**Current source verification: PASS.** 115 native tests passed with no failures (`node --test --test-reporter=tap tests/*.test.mjs`). New tests cover Admin-only full-matrix validation, reason/confirmation, invalid/duplicate roles, scope/inactive/Viewer denial, Admin retention, immediate current-session grant/revoke, stale revision rejection, historical approval retention and sample/initial-payment shortcut enforcement. Existing native regression tests remain passing.

**29 controls browser checks passed** in authenticated server and standalone review modes: all 13 stages; non-editable Admin/Viewer grants; cancellation; required reason and confirmation; mobile 390px fit; saved settings survive reload; non-admin control visibility; independent technical rejection permission; actual Manager artwork approval; restore-form versus save distinction; appended history; completed approval retention; revoked UI access. Zero browser runtime errors. Evidence: D:/CodexTestTemp/FarmingHub/reports/approval-controls/2026-09-12T15-09-11-384Z/.

**55 full-flow browser checks passed across three configured Manager-only workflows.** Policy fixture explicitly represents an Admin granting Manager coverage; every order/financial/shipping action then used only the Manager account and its audit identity. No Product Manager/Executive/Admin workflow handoffs or seeded order approvals. UI saving/restoration of settings is independently covered above.

| Synthetic order | Quantity | Shipments | Payments | Final status | Balance |
|---|---|---|---|---|---|
| WF-A-TEST (USD advance/BL) | 10 | 1 | 2 | PORT_ARRIVED / SETTLED | 0 |
| WF-B-TEST (CNY advance/shipment/BL) | 20 | 1 | 3 | PORT_ARRIVED / SETTLED | 0 |
| WF-C-TEST (USD credit/partial shipments) | 12 | 2 | 2 | PORT_ARRIVED / SETTLED | 0 |

All three cover creation/submission/issue, supplier acknowledgement, PI, technical confirmation, artwork approval/acknowledgement, applicable initial payment, sample/bulk/QC, shipping documents/BL/insurance/arrival and supplier realization. Evidence: D:/CodexTestTemp/FarmingHub/reports/manager-relaxed-workflows/2026-09-12T15-10-18-290Z/. Command: `node tests/three_workflow_browser_flow.mjs --manager-relaxed`. This does not replace the earlier standard-role blocked result: defaults still require the Product Manager artwork handoff until controls are changed.

Earlier development test attempts found two harness problems: an artwork fixture lacked the existing PI gate, and an immediate visibility assertion ran before the submit request rendered. The fixture now satisfies the PI gate and direct-action tests wait for DOM replacement; reruns above passed. No production gate was removed to make tests pass.

Build and syntax checks passed; git diff --check clean. Native output: D:/CodexTestTemp/FarmingHub/approval-controls-final-native.tap. All artifacts and SQLite data remain ignored/local. No live approvals, account roles or settings were changed; this is not a publication record.


## Purchase Manager only verification - 2026-09-12

Current-source isolated browser run: **39 checks passed, three workflows BLOCKED_BY_ROLE** at artwork approval. Only the Purchase Manager account was used. UI and authenticated API both enforce Product Manager/Admin approval; each rejected command leaves state unchanged. No production, shipping or final settlement completion is claimed. Zero browser runtime errors and no unexpected API failures. Test-only runner option: `node tests/three_workflow_browser_flow.mjs --manager-only`. See [full evidence and limitations](WORKFLOW_BROWSER_TEST_REPORT.md). No application code or live data changed.


## Admin/order release live publication - 2026-09-12

Application commit **cc08c5de04bf3ccc1e6ed1a065cebee95039c4b7** is live at https://purchase.dvjassociates.com through Coolify deployment **iofjlpttbwbeibjdbyxb698s** (finished; application running:healthy). This publishes DEC-016/017 and WF-015/016: admin bulk deletion/restoration, permanent independent serial numbers and withdrawal of the September Executive approval delegation. Existing administrator role editing remains available. This record supersedes earlier source-only/pending-publication statements for these features.

**19 live checks passed**, including HTTPS health, exact served app/domain/shipping source, serial initialization audit, serial column, Deleted orders, required deletion reason/confirmation, mobile layout, role editor and absence of the September notice. Exact deployed policy rejects the withdrawn Executive approval powers; this policy check used live profiles plus an in-memory scoped test profile, not a live Executive login. No business or role writes and no browser runtime errors occurred during verification; the deletion dialog was canceled and the administrator logged out.

All original orders and prior audit entries were retained. One concurrent user evidence upload/technical confirmation was reconciled against its audit events separately from the serial migration; original order content, payments, users and pre-existing file metadata otherwise matched the predeployment fingerprints. Serial migration is idempotent and creates a pre-initialization SQLite backup beside the database before updating metadata. No live order was deleted, restored or approved by deployment verification.

Release validation also passed **110 native tests**, **31 bulk-order browser checks**, **13 approval-role browser checks** and **37 full-workflow browser checks**. Ignored local live evidence: test-output/admin-release-live-report.json and test-output/admin-release-concurrent-check.json. Historical workflow completion reports remain separate from this deployment.


## Admin bulk orders and approval withdrawal - 2026-09-12

**110 native tests passed** on final source, including admin-only atomic delete/restore, unchanged financials/documents/issued snapshots, serial non-reuse, stale/invalid selection rollback, deleted upload/write rejection, current session role enforcement and idempotent legacy initialization. The migration test opens the pre-initialization SQLite backup read-only and verifies the original workspace is preserved.

**31 bulk browser checks passed** in server and standalone review: select-all page limit, cross-page selection, cancel, explicit confirmation, 390px mobile, exact selected deletion, retained serials/history/financial visibility, read-only deleted detail, restore and hidden-selection clearing. **13 approval browser checks passed:** no September notice, Executive denied PO/technical approvals, Manager issue and Product Manager technical approval. **37 full workflow checks passed:** Executive operated the assigned synthetic PO with Manager/Product Manager handoffs through port arrival and SETTLED, zero balance.

Evidence from successful reruns: D:/CodexTestTemp/FarmingHub/reports/bulk-orders/2026-09-12T14-51-32-500Z/, approval-roles/2026-09-12T14-51-48-161Z/, three-workflows/2026-09-12T14-51-56-360Z/. Reports/traces are local test artifacts, not source or live business data. Final native log: test-output/admin-release-native.tap. Runners support FH_TEST_OUTPUT_ROOT for alternate artifact storage; TMP/TEMP were set only for test processes on D:.

An earlier run failed from a full C: disk, not a business-rule assertion. The interrupted app write was recovered from the generated build; source checks and complete browser reruns passed afterwards. Only a prior failed-test trace was removed. No real PO, role, payment or shipment was changed by testing. VH001's real workflow completion remains separate from this deployment and requires the actual manager/account and supporting records.

Earlier pending-deletion and September-delegation reports below are historical; DEC-016/017 and WF-015/016 define the current release. Deployment evidence will identify the live commit.


## Role-editing live publication - 2026-09-12

Application commit **dd8656cb02c7ea47aa45eb29143270095aa21e87** deployed from main to https://purchase.dvjassociates.com via Coolify deployment **heiuia7nadcjjtlvrxiaktdc** (finished; running:healthy). This publishes DEC-015 / WF-014 administrator role editing. Existing domain, persistent data volume and application configuration retained.

**12 live checks passed:** HTTPS health, exact served app/domain source, administrator settings, self-role protection, current role/five supported choices, Purchase Manager selection, required reason, mobile layout, cancellation preserving the original role, no role/business writes and no browser runtime errors. Administrator logged out after checking. No live role or PO was changed. Actual promotion/demotion and existing-session enforcement were already tested in the isolated suite (108 native tests, 11 browser checks).

Use Users & settings > Change role on another user's row. Earlier local-only/unpublished role-editing notes below are superseded by this deployment. Bulk deletion/serial-number work is not included. Ignored verification artifact: test-output/role-editing-live-report.json.


## Administrator role editing verification - 2026-09-12

Local source DEC-015 / WF-014: **108 native tests pass**, including changing Executive to Manager and then Viewer while keeping an already-authenticated session, immediate permission enforcement, unchanged credentials/scopes/ownership, correct audit, and rejection of self-demotion, unsupported roles, missing reasons, unauthorized callers, CSRF failures and stale revisions.

**11 browser checks passed** across server and standalone review: role-change form, promotion/demotion, self-change protection, non-admin visibility and 390px mobile layout. No browser runtime errors. Runner: tests/admin_management_browser_flow.mjs. Ignored evidence: test-output/admin-management/2026-09-12T14-14-14-900Z/ and test-output/admin-management-native.tap.

This source change is not published. Bulk PO deletion and automatic serial work remain pending clarification of retained-deletion versus draft-only deletion and separate S.No. versus automatic PO number. The user has confirmed that deleted serials must stay unused and remaining records must never be renumbered. No PO was deleted or real user role changed during implementation/testing.


## Live publication - 2026-09-12

Published application commit **64e67648cdc1adc315f2b20c8c5d68bdc546db45** from main to https://purchase.dvjassociates.com through Coolify deployment **e7p6hs4p1eatsbhp3mvg71ql** (finished; application running:healthy). This publishes DEC-013/WF-012 multiple attachments with 50 MB per file and DEC-014/WF-013 temporary purchase/product approval delegation. The existing domain, Docker configuration and persistent data volume were retained; no migration or role rewrite.

Live verification passed 11 checks: HTTPS health, exact served app/domain source, administrator login/bootstrap, deadline notice, executive eligibility across all delegated actions using live profiles and the exact deployed policy, October 1 IST expiry, multiple-file/50 MB form, mobile notice fit, no runtime errors and no business-write requests. Logout completed. This was read-only verification: no live executive password login or approval transaction was performed. Full Executive-only transactions were already verified in the isolated browser workflow. Earlier local-only statements below are superseded by this publication record.

Ignored local verification report: test-output/september-release-live-report.json. Application expiry remains **1 October 2026 00:00 IST**; completed approvals remain valid.


## Temporary approvals verification - 2026-09-12 (DEC-014 / WF-013)

Current local source: **106 native tests passed**. Coverage includes all 11 delegated approval/review actions, readiness and immutable snapshots, viewer/inactive/scope denials, unrelated management rights, exact IST boundaries, forged client dates/identity and persisted SQLite audit.

**WF-DELEGATED-TEST** used only Purchase Executive for the entire lifecycle: **37 checkpoints passed**, 15 units at port, one shipment, three payment records, 34 documents, SETTLED and zero balance. PO/PI/artwork/payment authorization events identify the executive and DEC-014. This is an isolated test, not a live purchase.

Server and standalone review passed **13 browser checks**: executive PO issue, technical approval/rejection with remarks, persisted audit, 390px mobile notice and automatic removal of delegated controls on an open page at expiry. API tests independently verify server expiry; browser clock changes test presentation only. Browser runtime errors: zero.

Runners: tests/three_workflow_browser_flow.mjs --delegated and tests/temporary_approval_browser_flow.mjs (active window and installed Playwright/Chrome required). Ignored local evidence: test-output/three-workflows/2026-09-12T13-59-02-145Z/ and test-output/temporary-approvals/2026-09-12T14-00-41-652Z/; native result test-output/temporary-approval-native.tap. Initial PLM browser harness selected the wrong newest-first revision; explicit specification ID fixed the harness and full rerun passed.

Earlier executive denial/handoff results below are historical before DEC-014. Current browser runners check visibility against the active policy. No deployment or live PO approval occurred in this task.


> Current project memory (2026-09-12): see [Project Rulebook](PROJECT_RULEBOOK.md), [Current Product Baseline](CURRENT_PRODUCT_BASELINE.md), [Decision Log](DECISION_LOG.md) and [Workflow Change Log](WORKFLOW_CHANGE_LOG.md). Historical release statements below remain evidence of their date, not necessarily current behaviour.

## Full workflow and Purchase Executive browser verification — 2026-09-12

Three complete purchase scenarios passed (49 checkpoints): standard USD, CNY with multiple attachments and shipment payments, and two partial shipments on credit terms. A subsequent dedicated Purchase Executive run passed 37 checkpoints, using manager/product-role handoffs only where required. All four orders reached PORT_ARRIVED and SETTLED with zero balance. Browser runtime errors: zero. No live records were modified; no application-code changes were needed. See [detailed results and evidence](WORKFLOW_BROWSER_TEST_REPORT.md).

## Multiple uploads verification — 2026-09-12

- `node scripts/build.mjs`: regenerated standalone review successfully.
- `node --test tests/*.test.mjs`: **102 passed / 0 failed**, evidence `test-output/multiple-upload-native-tests.tap`. Includes exactly 50 MiB accepted and persisted,50 MiB+1 rejected without state change, multi-file supplier/PI/documents/payment records, validation of every file, scalar-ID compatibility and unchanged optional/approval behaviour.
- `node tests/multiple_upload_browser_flow.mjs`: PASS for complete-selection validation before network writes, multiple files, partial failure/retry without duplicate uploads, duplicate-submit guard, document visibility/storage,390px mobile layout and standalone review uploads. Test databases and browser profiles are isolated; no live records are created.
- `node tests/user_access_browser_flow.mjs`: PASS after the shared form changes, covering administrator creation, validation, duplicate rejection, new-user login, non-admin visibility and standalone review. Browser tests use development-only Playwright and Chromium through `FH_PLAYWRIGHT_MODULE`/`CHROMIUM_PATH` as documented below.
- Deployment of this source update has not been verified. Earlier live evidence below belongs to user portal commit8a96a27.

## User access portal verification — 2026-09-12

**Publication verification:** commit `8a96a27`, Coolify deployment `wawt555szxwx5ukuprnayjbe`, finished. Live https://purchase.dvjassociates.com returned healthy HTTPS responses and app/domain modules matching local source. Headless Chrome verified administrator login, account metadata, Create user dialog, all five role options, mobile layout and logout with no page errors. No live user was created. This supersedes the local-only deployment qualification in the earlier test record below.

- `node scripts/build.mjs`: standalone review regenerated successfully.
- `node --test tests/*.test.mjs`: **97 passed, 0 failed** (`test-output/user-access-native-tests.tap`). New coverage includes admin creation/login, secret exclusion, permission/Origin/CSRF enforcement, input validation and duplicate/stale rollback.
- `node tests/user_access_browser_flow.mjs`: isolated Playwright/Chrome checks passed for creation, password confirmation, duplicate email with retained fields, mobile dialog, new-user login, non-admin visibility and standalone review. The script requires a development Playwright installation and optional `FH_PLAYWRIGHT_MODULE`/`CHROMIUM_PATH`; no application runtime dependency was added.
- Desktop and 390px mobile screenshots inspected. Tests create accounts only in disposable temporary databases.
- Restarted the local server and verified health, configured administrator login, authenticated account-list endpoint and logout. No real user was created during verification. This does not establish deployment of the feature to the live domain.

## Historical automated native tests
Command: `npm test`

Result: **93 passed / 0 failed**.

Coverage includes all prior PO/PI/payment/production/QC/shipping/PLM controls plus final Base Item / ERP Item master logic, supplier/base price inheritance, freight benchmark/trends, complaint roll-up, and the controlled missing-PLM warning bypass.

Evidence: `test-output/native-tests-v061.tap`.

## Integrated v0.6 browser regression
Command: `python tests/v060_browser_flow.py`

Result: **5 passed / 0 failed**.

Checks: master libraries, Base Item → ERP Item PO planning, filtered price list, complaint roll-up, and freight benchmark/trend screens.

Evidence: `test-output/v060-browser-results.json`.

## Missing-PLM browser flow
Command: `python tests/plm_bypass_browser_flow.py`

Result: **1 passed / 0 failed**.

Verified that a PO for a Base Item with no approved PLM revision can be saved, submitted and issued while the amber **PLM specification not available** warning remains visible. The flow does not falsely mark PLM approved.

Evidence: `test-output/plm-bypass-browser-results.json` and `test-output/plm_bypass_warning.png`.

## Total automated checks
**99 passed / 0 failed** (93 native + 6 browser).

## Limitations
Management UAT and production deployment are not complete. Live VMS, ERP, banking and carrier APIs remain disconnected.
