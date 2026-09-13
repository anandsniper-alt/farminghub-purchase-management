## Minimal timeline published - 2026-09-13

**DEC-032 / WF-026 publication, 2026-09-13:** Runtime a5a9b24 is live at https://purchase.dvjassociates.com; deployment 3ontnhztuhusfj6ei7ltqodd finished successfully. The order timeline opens expanded in Minimal, survives guide toggles/reload and fits the checked 390/320px layouts. Eleven served assets match the release commit and health returns 200. All 29 POs / 15 QA orders, checked business collections and approval controls are unchanged at revision 904. This supersedes the earlier local-only publication status for the timeline update.

19 live browser checks passed with zero browser errors and business-write requests. Existing domain and /app/data persistent volume preserved. No seed, migration or policy change. Evidence (ignored): test-output/timeline-live-release/after-report.json, assets.json and live-timeline-mobile.png; test-output/timeline-deploy-status.json. These checks are separate from the 60 prior local browser checks.

## Mascot live release verified - 2026-09-13

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.

21 live browser checks passed; no browser errors or business-write requests. Eleven served assets match the exact release commit; /api/health returned 200. Workspace revision 904, all 29 purchase orders (including 15 retained QA POs), and hashes of the checked business collections/approval settings were identical before and after deployment and interaction checks. Existing domain and /app/data volume preserved. No seed, migration or policy change was run. Screenshots reviewed for left-corner placement; browser verified both sides.

Evidence (ignored): test-output/mascot-live-release/after-report.json, assets.json and mascot-left.png / mascot-right.png; deployment status in test-output/mascot-deploy-status.json. The 92 prior local browser checks remain separate from this current live verification.

# Complete purchase workflow browser tests

## Published and activated — 13 September 2026

The user requested publication after the bug fixes. Runtime commit **f5d55146cd7428cc72d6f6ef6bcc52ead48b63df** is deployed at https://purchase.dvjassociates.com. Coolify deployment **fghgsunna2djj2wpin1ytwao** finished successfully; application status is running:healthy and /api/health returns HTTP 200. Eleven served assets match the release commit byte for byte.

The independent Manager preset was saved through the live Admin browser, with the confirmed reason and self-approval acknowledgement. All 13 stages include MANAGER and survive reload. Ashok and Suresh were both verified as active MANAGER accounts assigned to LAE Import; their existing roles/scopes were not changed. Approval-control revision is **2**. Other configured role grants remain intact, and Admin retains later per-stage editing.

The deployment preserved the business state exactly: 29 orders, including all 15 retained QA POs. The policy save appended exactly one APPROVAL_CONTROLS_UPDATED event; orders, payments, files, users, vendors, items, bases and costs stayed unchanged. The existing /app/data persistent volume and domain configuration are unchanged. No new test purchase, deletion, payment or shipment action was performed.

Live verification: 10 release-browser checks, 27 activation checks, 11 asset comparisons and health checks passed. Evidence remains in ignored test-output/manager-release and sanitized Coolify deployment reports. Earlier local verification remains 135 native checks, 33 setup checks, 29 approval-control checks, 38 import-lifecycle checks and six complete flows across two isolated Manager accounts.

This establishes deployment, published entry points, retained data and effective Manager approval policy. It does not replace the original live 340-scenario QA ledger or claim a new end-to-end login run as Ashok/Suresh. Real supplier/quote/evidence prerequisites and the previously documented infrastructure and finance/date-policy acceptance items remain. Earlier “local only / activation pending” paragraphs below describe pre-release history.


## Current local Manager build — DEC-030, 13 September 2026

135 native checks and six complete workflows across two isolated Manager accounts pass; all arrived and settled. Setup, approval-control and import lifecycle checks pass in server/review. The build includes the earlier 13 QA fixes plus the independent Manager and setup recovery changes. Live deployment and Admin policy activation remain pending; all live QA creations are untouched. See [QA_EXECUTION_REPORT.md](QA_EXECUTION_REPORT.md) and [MANAGER_WORKFLOW.md](MANAGER_WORKFLOW.md). Historical evidence follows.


## Continued Ashok live QA — 13 September2026 IST

Current report: [QA_EXECUTION_REPORT.md](QA_EXECUTION_REPORT.md), [QA_ACCESS_BLOCKERS.md](QA_ACCESS_BLOCKERS.md), [QA_RELEASE_READINESS.md](QA_RELEASE_READINESS.md).340 scenarios accounted: 235 PASS / 21 FAIL / 84 BLOCKED; blocked cases are not passed. Eleven complete workflows and four open QA POs remain active. Thirteen fixes are local only, verified with 131 native tests plus focused server/review checks. No QA-continuation deployment occurred; earlier publication paragraphs below describe prior releases.


Published 2026-09-12: payment-reference application commit **8c2e303df7765430fb247ee57c56cd9f0ad3c331** is live at https://purchase.dvjassociates.com. Coolify deployment **4n8iiclyxsmdrk1n8ctn4zct** finished; health HTTP 200. Nineteen signed-in live checks passed, including Indian-bank label, optional BOC column/field, mobile modal heading and persistent guide. All three changed runtime assets match the committed build. Business-record, user and approval-control hashes/revision match the pre-release baseline; no live payment or receipt was created. Evidence: ignored test-output/payment-rates-live-report.json and payment-rates-live-mobile.png. DEC-027/028 and WF-021/022 are now published; this supersedes their earlier local-only release notes.


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


## Purchase Manager only browser run - 2026-09-12

**Outcome: BLOCKED_BY_ROLE, not a completed end-to-end workflow.** User requested the entire flow with only Purchase Manager access. Tested current application source cc08c5d using the native local server, Chrome/Playwright and isolated clean masters/synthetic data. The runner created credentials only for u-manager, rejected attempts to switch to another role and verified every order audit event belonged to that manager. No live site login, order change, role change or permission bypass occurred.

Command: `node tests/three_workflow_browser_flow.mjs --manager-only`, with FH_TEST_OUTPUT_ROOT set to the D: test-artifact directory and process TMP/TEMP on D:. **39 checks passed across three attempted scenarios; none reached full completion.**

| Scenario | Intended workflow | Observed result |
|---|---|---|
| WF-A-TEST | USD, 10 units, 30/70 terms, one shipment | PI approved; blocked at artwork approval |
| WF-B-TEST | CNY, 20 units, advance/shipment/BL terms, multiple evidence files | PI approved; blocked at artwork approval |
| WF-C-TEST | USD, 12 units, credit terms, two planned partial shipments | PI approved; blocked at artwork approval |

All three completed Manager-only draft creation, submission, immutable PO issue, supplier PO acknowledgement, PI receipt/verification/approval, supplier technical confirmation and artwork submission. Buyer assignment to the seeded executive was retained as order metadata; that user never logged in or performed any action.

**Exact blocker:** APPROVE_ARTWORK requires PRODUCT_MANAGER or ADMIN under B-19 / DEC-017 / WF-016. The UI hides Approve artwork from MANAGER. An intentional authenticated API probe returned HTTP 403 with "Product Manager final approval is required." The complete workspace remained unchanged after each denied request. All three orders remain AWAITING_ARTWORK_CONFIRM, with pending artwork and no production-window start.

**Not reached in this run:** supplier artwork acknowledgement, production lead-time start, sample/bulk production/QC, shipment booking through arrival, remittances and final supplier settlement. No approval was pre-seeded or granted by a second role to bypass the blocker. Historical multi-role completed runs below do not establish Manager-only completion.

**Errors:** zero browser runtime errors; no unexpected API failures. The three intentional 403 responses and initial unauthenticated bootstrap 401 were expected. An initial harness run misclassified the normal login bootstrap 401; its assertion was corrected and all three scenarios rerun. This was a test-harness correction, not an application change.

**Evidence:** D:/CodexTestTemp/FarmingHub/reports/manager-only-workflows/2026-09-12T15-03-07-467Z/ contains report.json, three screenshots, trace.zip and isolated SQLite data; artifacts stay out of Git. The report deliberately separates verificationStatus PASS from workflow status BLOCKED_BY_ROLE.

**Follow-up:** keep the established Product Manager/Admin approval handoff. Allowing Purchase Manager to approve artwork would be a new permissions decision requiring explicit instruction and a decision/workflow record. This test request does not authorize that change.


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


Date: 2026-09-12. Result: **three complete scenarios passed, followed by a dedicated Purchase Executive scenario**. Tests used installed Chrome through Playwright, authorized by the user when the computer-use connection had no available browser. The application ran against isolated SQLite databases with synthetic accounts. No live records, credentials from `.env`, bank transactions or external messages were used.

## Results

| Test order | Scenario | Quantity | Shipments | Payments | Evidence documents | Final result |
|---|---|---:|---:|---:|---:|---|
| WF-A-TEST | USD, 30% advance and 70% BL balance | 10 | 1 | 2 | 15 | Port arrived; settled; zero balance |
| WF-B-TEST | CNY, multiple files, 10% advance / 20% before shipment / 70% BL credit | 20 | 1 | 3 | 34 | Port arrived; settled; zero balance |
| WF-C-TEST | USD credit purchase, partial shipments of 5 and 7 | 12 | 2 | 2 | 38 | First arrival kept order open; final arrival closed it; settled |
| WF-EXEC-TEST | Purchase Executive operates assigned order; restricted approvals use appropriate roles | 15 | 1 | 3 | 34 | Port arrived; settled; zero balance |

The first three scenarios passed 49 checkpoints; the dedicated executive scenario passed 37 checkpoints. Both final runs recorded zero browser runtime errors. The initial unauthenticated `/api/bootstrap` returned the expected 401 before sign-in; no other failed API responses occurred in the successful runs.

## Workflow exercised through browser forms

1. Sign in as Purchase Executive; select supplier/Base Item, brand quantity, currency, price and terms; save draft; submit for approval.
2. Sign in as Manager to issue the immutable PO revision.
3. Record supplier acknowledgement; receive and verify PI; obtain Manager PI approval.
4. Record technical confirmation; submit artwork; obtain Product Manager approval; record supplier artwork acknowledgement.
5. Record applicable initial remittance or follow the no-advance credit path; verify production lead time starts.
6. Record sample completion and approval; start bulk production; record QC PASS; complete production.
7. Allocate shipment quantities; book and release container; record inland tracking; upload CI and packing list.
8. Authorize and record any before-shipment payment; record vessel loading, final BL, insurance and India-port arrival.
9. Record BL-triggered payments after the final BL exists; record supplier realization for each allocation; verify original-order balance is zero and no realization remains pending.
10. Verify each document has retained file bytes, and partial arrival does not prematurely close unshipped quantities.

All orders used the existing BS20 master, which lacks an approved technical revision. Its explicit missing-PLM warning remained visible through completion. These runs verify that permitted path, not the separate approved-PLM revision workflow. Test payments used the PO currency (no cross-currency realized-rate discrepancy scenario). Future credit obligations were deliberately settled early after BL for test completion; the tests did not wait for real credit days to elapse.

## Dedicated Purchase Executive verification

`WF-EXEC-TEST` used the assigned executive for supplier responses, PI entry/verification, technical/artwork submissions, initial payment, sample/production/QC, shipping, remittance reporting and supplier receipts. UI checks confirmed the executive could not issue the PO, approve the PI, approve artwork or authorize ordinary payment milestones. Manager handled PO/PI approval and ordinary payment authorization; Product Manager handled artwork approval.

Audit assertions verified the executive's identity for 16 operational action types. All 34 document records were attributed to Purchase Executive. Initial-payment auto-authorization and sample approval followed existing editor permissions; this test did not introduce a stricter manager requirement or change existing roles.

## Evidence and reproducibility

Runner: [tests/three_workflow_browser_flow.mjs](../tests/three_workflow_browser_flow.mjs).

```powershell
node tests/three_workflow_browser_flow.mjs
node tests/three_workflow_browser_flow.mjs --executive
```

Requires development Playwright and installed Chromium. The runner accepts `FH_PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` and optional `FH_HEADED=1`. It creates only test accounts/master fixtures before launch; all transactional business writes use the browser UI. Direct database reads are assertions, not a substitute for workflow actions.

Local artifacts (ignored by Git):

- Three scenarios: `test-output/three-workflows/2026-09-12T13-45-30-506Z/` — report JSON, trace ZIP, six commercial/completion screenshots and isolated test database.
- Executive scenario: `test-output/three-workflows/2026-09-12T13-47-50-868Z/` — report JSON, trace ZIP, executive screenshots and isolated test database.
- Earlier runner attempt: `test-output/three-workflows/2026-09-12T13-44-15-294Z/`. It stopped on an ambiguous automation selector matching both the finance tab and a finance shortcut. The runner selector was narrowed and the complete three-scenario run then passed. No application-code fix was required.

This is browser verification of the current local source, including unpublished multiple-upload changes. It is not a claim that the same changes have been deployed to the live domain, or that all unrelated modules have been audited. Product code, permissions, calculations and workflows were preserved during this test task.


## Latest Ashok live pre-soft-launch QA — 12–13 September2026 IST

See [QA_EXECUTION_REPORT.md](QA_EXECUTION_REPORT.md), [QA_DEFECT_LOG.md](QA_DEFECT_LOG.md), [QA_TEST_MATRIX.md](QA_TEST_MATRIX.md) and [QA_RELEASE_READINESS.md](QA_RELEASE_READINESS.md). This is separate from historical fixture/release runs above. Ten live POs were completed as Ashok/MANAGER and retained, plus three labelled synthetic complaints, QAAS01 PLM product/specification and V98-QALF test logistics provider. Find the orders in Order pipeline with All stages and search QA-ASHOK-0912; serials15–24. QA02 did not create a PO because its new base had no ERP mappings. All fixes are local and verified separately; soft-launch sign-off remains blocked pending publication/live retest and operational recovery/setup checks.


Final browser handoff: **12 retained QA POs**, serials15–26. Ten are Port arrived and settled. QA-ASHOK-0912-12 and QA-ASHOK-0912-13 remain at Production lead time with USD30 received and USD70 outstanding each, ready for sample completion. One USD60 remittance split30/30, duplicate-reference rejection and excess-receipt correction were verified through Ashok's browser. Search QA-ASHOK-0912 with All stages / All suppliers. No test records were deleted; fixes remain local, not deployed.

## Mascot corner movement - local verification, 2026-09-13

DEC-031 / WF-025 implements the user-confirmed horizontal-only mascot movement with left/right bottom snapping and browser-local persistence. Native/review x Current/Minimal x 1440/390px coverage: 48 checks passed for normal pagination, horizontal drag without vertical displacement/accidental guide opening, reload and dialog persistence, keyboard positioning/activation, touch swipe and settled tap, and 320px resize bounds. Chrome may suppress taps briefly after the target moves; the touch runner waits for that settling interval rather than forcing clicks.

The existing presentation suite also passed 44 checks, including guide steps, unsaved forms, reduced motion, mobile sizing, zero runtime errors, zero business-write requests and unchanged test workspace data. Standalone review build regenerated; diff whitespace check passed. All tests used isolated fixtures, no live records were created or changed. This mascot update has not been published. Ignored evidence: test-output/mascot-pagination/2026-09-13T01-35-22-126Z/report.json and test-output/presentation-release/2026-09-13T01-35-00-904Z/report.json.

## Minimal timeline - local verification, 2026-09-13

DEC-032 / WF-026: 60 browser checks passed across native server and standalone review. Verified default timeline visibility, guide toggles, reload, 390/320px layouts, existing guide/form behavior, reduced motion, unchanged business data and zero runtime errors/write requests. Initial mobile check found 6px intrinsic grid overflow in order panels; corrected the Minimal mobile grid and verified both sizes without document overflow. Mobile screenshot reviewed. Build and whitespace checks passed. Evidence: test-output/minimal-timeline/2026-09-13T01-47-20-855Z/report.json. Not yet published live.
