## Mascot live release verified - 2026-09-13

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.

21 live browser checks passed; no browser errors or business-write requests. Eleven served assets match the exact release commit; /api/health returned 200. Workspace revision 904, all 29 purchase orders (including 15 retained QA POs), and hashes of the checked business collections/approval settings were identical before and after deployment and interaction checks. Existing domain and /app/data volume preserved. No seed, migration or policy change was run. Screenshots reviewed for left-corner placement; browser verified both sides.

Evidence (ignored): test-output/mascot-live-release/after-report.json, assets.json and mascot-left.png / mascot-right.png; deployment status in test-output/mascot-deploy-status.json. The 92 prior local browser checks remain separate from this current live verification.

# Ashok live browser QA execution

## Published and activated — 13 September 2026

The user requested publication after the bug fixes. Runtime commit **f5d55146cd7428cc72d6f6ef6bcc52ead48b63df** is deployed at https://purchase.dvjassociates.com. Coolify deployment **fghgsunna2djj2wpin1ytwao** finished successfully; application status is running:healthy and /api/health returns HTTP 200. Eleven served assets match the release commit byte for byte.

The independent Manager preset was saved through the live Admin browser, with the confirmed reason and self-approval acknowledgement. All 13 stages include MANAGER and survive reload. Ashok and Suresh were both verified as active MANAGER accounts assigned to LAE Import; their existing roles/scopes were not changed. Approval-control revision is **2**. Other configured role grants remain intact, and Admin retains later per-stage editing.

The deployment preserved the business state exactly: 29 orders, including all 15 retained QA POs. The policy save appended exactly one APPROVAL_CONTROLS_UPDATED event; orders, payments, files, users, vendors, items, bases and costs stayed unchanged. The existing /app/data persistent volume and domain configuration are unchanged. No new test purchase, deletion, payment or shipment action was performed.

Live verification: 10 release-browser checks, 27 activation checks, 11 asset comparisons and health checks passed. Evidence remains in ignored test-output/manager-release and sanitized Coolify deployment reports. Earlier local verification remains 135 native checks, 33 setup checks, 29 approval-control checks, 38 import-lifecycle checks and six complete flows across two isolated Manager accounts.

This establishes deployment, published entry points, retained data and effective Manager approval policy. It does not replace the original live 340-scenario QA ledger or claim a new end-to-end login run as Ashok/Suresh. Real supplier/quote/evidence prerequisites and the previously documented infrastructure and finance/date-policy acceptance items remain. Earlier “local only / activation pending” paragraphs below describe pre-release history.


## Current local resolution — DEC-030 / WF-024, 13 September 2026

**Operational fixes implemented and tested locally; not deployed or activated on live.** The user confirmed independent access for every Purchase Manager. The build includes the 13 prior QA fixes, an Admin-saved preset for all 13 approval stages, Manager access visibility, item upload/mapping, vendor/price imports, vendor audit/source history and quote-backed freight setup recovery.

| Verification | Result |
|---|---|
| Native regression | 135 PASS, 0 FAIL |
| Manager setup, server and standalone review | 33 PASS; two separate Manager accounts; new supplier → base → ERP → technical/brand/artwork approvals; imports/history; missing benchmark recovery |
| Approval controls and restoration | 29 PASS |
| Import lifecycle | 38 PASS |
| First isolated Manager account | 3 complete flows, all PORT_ARRIVED and SETTLED with zero balance |
| Second isolated Manager account | 3 complete flows, all PORT_ARRIVED and SETTLED with zero balance |
| Build / diff | Standalone regenerated; whitespace check passed; mobile booking screenshot reviewed |

The six flows cover USD advance/BL balance, CNY 10/20/70 with multiple attachments, and USD credit with two partial shipments. Audit checks require every workflow action to belong to the single Manager for that flow. These are synthetic local accounts, not current login tests of the real Ashok/Suresh accounts.

Evidence under ignored test-output: manager-independence-native.txt; manager-setup/2026-09-13T01-12-00-775Z/report.json; approval-controls/2026-09-13T01-15-21-183Z/report.json; import-preview/2026-09-13T01-15-31-380Z/report.json; manager-relaxed-workflows/2026-09-13T01-07-37-160Z/report.json and 2026-09-13T01-13-06-944Z/report.json.

Initial setup test failures were harness assertions: a subtitle hidden in Minimal and duplicate header/card booking locators. They now assert visible access rows and target the shipment-card action. An initial zero-price expectation was corrected to the documented master policy; no formula was changed to satisfy a test.

| Original blocker | Resolution / remaining prerequisite |
|---|---|
| ACCESS-001 | Preset covers technical rejection and every other approval stage; Admin must save it on live. |
| ACCESS-002 / ACCESS-003 | User expressly retained Admin-only account/policy/delete/restore controls. They are not purchase-progress steps. |
| DEP-001 | ERP creation and imported-item mapping tested through technical/brand/artwork approvals; publish and live-retest. |
| DEP-002 | Item upload plus vendor/price templates, validation, atomic commit and source history implemented; live-retest required. |
| DEP-003 | Vendor View shows local actor and before/after audit; no missing historical audit fabricated. |
| DEP-004 | Supplied quote recovery implemented; QA12 still needs a correct actual 20GP quote. No operational rate invented. |
| ENV-001 / ENV-002 | Separate local Manager accounts and authorization checks pass. Wider fault/restore/scale/live-auth preconditions are not waived. |

**Live completion still requires deployment and one-time Admin activation.** Verify Ashok/Suresh are active MANAGER accounts assigned to LAE Import, then save the preset and retest with retained live records. The prior live runner did not respond and the browser connector listed no sessions. A separate visible Playwright window is open at the live sign-in page for Admin login. No credentials were read, no live grants changed and no live QA creations deleted or modified.

See [MANAGER_WORKFLOW.md](MANAGER_WORKFLOW.md) for activation and the complete operating sequence. The original live ledger remains historical 235 PASS / 21 FAIL / 84 BLOCKED. Local regressions do not relabel those live cases as passed. Real evidence/quotes, infrastructure acceptance and unresolved finance/date policies still apply. No unconditional soft-launch sign-off is claimed.


Run: 12–13 September2026 IST (captured server/browser transaction dates use12 September UTC). Application: https://purchase.dvjassociates.com. User: **Ashok / MANAGER**, manually signed in by the user. All live operations used the visible headed Chrome browser with the previously authorized Playwright runner. No direct live API/database writes, role switch, approval-policy edit, test cleanup, real bank transfer or external supplier message was performed. Every new test record remains active/retained.

## Completed live orders

11 full live purchase workflows reached **Port arrived + SETTLED**, with zero outstanding original-order balance and no pending actual receipt allocations. This count is distinct from the scenario catalogue and from local fixture tests.

| Retained PO | Currency / term | Coverage | Evidence |
|---|---|---|---|
| [QA-ASHOK-0912-01](https://purchase.dvjassociates.com/#/order/6dd9dec4-1a9e-4ccc-9f7f-e25144c436c1) | USD / 30-70 | Two partial shipments; rejected sample/QC recovery; corrected receipt; BOC reference; freight100/101 boundary | q1-settled / q1-history JSON/PNG; case summary where present |
| [QA-ASHOK-0912-03](https://purchase.dvjassociates.com/#/order/c7564622-c56d-4898-a232-ff550d74dbeb) | CNY / 30-70 | CNY price, remittance and supplier receipt | case03 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-04](https://purchase.dvjassociates.com/#/order/2ed76d0c-1b61-4b0d-a0bc-edd76ab1b1c8) | USD / 30-70-bl60 | BL plus 60 calendar days | case04 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-05](https://purchase.dvjassociates.com/#/order/c4357cb2-7b9c-46a4-9688-73b50c7dc1ac) | USD / 30-70-bl120 | BL plus 120 calendar days | case05 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-06](https://purchase.dvjassociates.com/#/order/7ffe1d34-9294-41e0-bf07-9c35cb37b10a) | USD / 10-20-70-bl120 | Three-stage payment including pre-shipment payment | case06 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-07](https://purchase.dvjassociates.com/#/order/dcd4cb09-ea5a-4d72-b4f2-b8ae303c77f6) | USD / 20-80 | TT-only quantity and 20-80 payment | case07 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-08](https://purchase.dvjassociates.com/#/order/b296024c-d21a-4535-90f1-25466ebb28a6) | CNY / credit60 | No-advance production and CNY credit term | case08 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-09](https://purchase.dvjassociates.com/#/order/01a5fb49-2a5d-40fd-80de-f7dd66b924ec) | USD / 20-80-bl120 | 20-80 BL120 and supplier planning override | case09 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-10](https://purchase.dvjassociates.com/#/order/17ebb29f-0004-4696-a8ac-eb2110342d4f) | USD / 30-70 | Third-brand mixed order | case10 JSON/PNG; case summary where present |
| [QA-ASHOK-0912-11](https://purchase.dvjassociates.com/#/order/0a693ae6-d090-4e56-b345-fdef91a66321) | USD / credit60 | Three-brand USD full-credit control; additional full case while new-product case02 remains blocked | case11 JSON/PNG; case summary where present |
| [QA-ASHOK-0913-14](https://purchase.dvjassociates.com/#/order/b7e5f26a-8e7b-423e-982e-6267055d3067) | USD /30-70 | Return/resubmit; PI value/quantity recovery; exactly50MiB plus second file; rail/river/port tracking; CI/PL/vessel/voyage gates; bank/BOC precision; settled | round2-14-settled; round2-final14-history |

Each completed case followed create → submit → issue → supplier acknowledgement → PI record/verification/approval → technical confirmation → artwork submission/approval/acknowledgement → required advance or no-advance readiness → sample completion/approval → bulk start/QC/completion → shipment → booking/release → inland tracking → CI/PL → vessel/voyage → final BL → insurance → port arrival → remaining reported payments/actual supplier receipts → settlement → visible history. Actions use labelled synthetic TXT evidence (including the QA14 exactly50MiB boundary file); they do not assert genuine supplier documents or real-world shipment timing.

## Four retained orders ready for the team to continue

| Open PO | Current stage | Reported / actual receipt | Outstanding |
|---|---|---|---|
| [QA-ASHOK-0912-12](https://purchase.dvjassociates.com/#/order/2025962a-0a0a-4aa8-99d0-1bd32746c1d5) | Bulk production active; QC pending;20GP planned shipment awaits its matching benchmark | USD30 / USD30 | USD70 |
| [QA-ASHOK-0912-13](https://purchase.dvjassociates.com/#/order/39d7fac4-2b81-4a68-bba5-8242a6669181) | Production lead time; next: Record sample completion | USD30 / USD30 | USD70 |
| [QA-ASHOK-0913-15](https://purchase.dvjassociates.com/#/order/76d20111-fd92-479a-bfc1-a8dd4e4b5f0f) | Draft; date restored to15Dec2026 | None | USD10 unissued |
| [QA-ASHOK-0913-16](https://purchase.dvjassociates.com/#/order/b17f5ec8-6750-44a2-a483-67995492d9da) | Production lead time; sample next;90-day commitment | Full credit; none yet | USD10 |

QA12/13 (serials25/26) remain open intentionally. QA15 (serial28; [open draft](https://purchase.dvjassociates.com/#/order/76d20111-fd92-479a-bfc1-a8dd4e4b5f0f)) retains its date-boundary history, restored15Dec2026 date, USD10 obligation and no issued purchase. QA16 (serial29; [open order](https://purchase.dvjassociates.com/#/order/b17f5ec8-6750-44a2-a483-67995492d9da)) is at production lead time under full-credit terms, USD10 unpaid, next sample completion; its90-day commitment starts12Sept and reaches11Dec. QA14 serial27 is complete. One reference QA-ASHOK-MULTI-12-13 reports USD60 split30/30. Duplicate reference submission was rejected. The intentional USD101 actual-receipt test on QA12 displayed EXCESS TO SETTLE; its correction to30 preserved prior history. These are synthetic records, not real money movement. Evidence: multi-payment-summary and the multi-* UI snapshots.

## Blockages and recovery

- QA01: sample rejected and QC ISSUES correctly held progression, then corrected records resumed it. Vessel loading before booked/released container was rejected. A one-cent bank-allocation mismatch was rejected and corrected in the same form. Actual receipt correction preserved earlier history.
- No active logistics provider existed. Ashok created **V98-QALF**, explicitly named QA ONLY / not a real forwarder. It remains active for review. A verified real logistics provider is still required before genuine shipments.
- **QAAS01** is a retained synthetic PLM base with approved technical revision QA-1.0 and two attachments. The approved-PLM purchase case is blocked on live by the missing ERP setup path (BUG-005). The local fix is not a claim that live ERP creation or that full case has passed.
- Thirteen tracked code/UI defects are in QA_DEFECT_LOG.md, including the freight import parsing integrity defect reproduced locally and in live preview. Publication/retest remains separate. BUG-007 is now also confirmed by live preview: negative3000 became positive3000, and grouped3,001.25 became3; both previews were cancelled. BUG-008 lost commitment cause is fixed locally after expanded live history review.

Four retained BS20 complaints cover MINOR, MODERATE, MAJOR and CRITICAL; GJ2 + KD1 + TT1 =4. QAAS01 QA-1.1 remains pending because Ashok has no Reject action. QAAS02 independently verifies supersession of QA-1.0 by QA-1.1. Three synthetic logistics references V98-QALF/V98-QAS2/V97-QALF remain active. Fifteen QA POs (serials15–29, with no QA02 PO created) remain active: eleven complete, four open. Final browser pipeline is captured across two pages in round2-handoff-pipeline-page1/page2. No deletion, void or cleanup was performed.

Synthetic weekly freight snapshots QA-ONLY-W1–W4 use a separate QA ONLY TEST ORIGIN → QA ONLY TEST DESTINATION /1X20GP route. They prove flat/rising/falling behavior without replacing real route benchmarks. Tracking commits affect only QA14 and retain previous events/baselines. Other invalid imports were cancelled.

## Scenario ledger

340 scenarios are accounted for: **235 PASS / 21 FAIL / 84 BLOCKED / 0 NOT RUN**. FAIL rows retain live failures even where local repairs pass; multiple rows can reference one of13 code/UI defects. Two date-policy failures refer to TD-06. BLOCKED rows each name a missing permission, feature, fixture or evidence capability in QA_ACCESS_BLOCKERS.md. This is complete accounting, not a claim that blocked cases were executed or that the whole system passed.

## Local fix verification (not live Ashok execution)

| Run | Result | Evidence |
|---|---|---|
| Native tests after domain/import fixes |131 passed,0 failed|test-output/ashok-live-qa/native-regression-imports.txt|
| Import preview/lifecycle browser |38 passed|D:/CodexTestTemp/FarmingHub/reports/import-preview/2026-09-12T19-27-43-995Z|
| Mascot pagination browser |8 passed|D:/CodexTestTemp/FarmingHub/reports/mascot-pagination/2026-09-12T18-52-37-148Z|
| Targeted native + standalone browser |31 passed|D:/CodexTestTemp/FarmingHub/reports/soft-launch-ui/2026-09-12T18-26-05-783Z|
| Existing consistency browser checks |36 passed|D:/CodexTestTemp/FarmingHub/reports/consistency-fixes/2026-09-12T18-05-54-738Z|
| Payment-rate browser checks |33 passed|D:/CodexTestTemp/FarmingHub/reports/payment-rates/2026-09-12T19-31-30-235Z|
| Presentation browser checks |44 passed|D:/CodexTestTemp/FarmingHub/reports/presentation-release/2026-09-12T18-06-50-698Z|
| Configured-manager isolated complete workflows |3 completed, all settled|D:/CodexTestTemp/FarmingHub/reports/manager-relaxed-workflows/2026-09-12T18-22-48-729Z|

The isolated manager fixture configures its own approval grants; it never changes live controls. Native tests cover authorization, transaction rollback/stale revisions and storage behavior, but are not production failure-injection evidence. Earlier failed reproductions and corrected test assumptions remain in local artifacts. Build regenerated with node scripts/build.mjs.

## Evidence and limits

Live snapshots/screenshots are in ignored test-output/ashok-live-qa; case summaries identify exact retained order IDs. QA reports contain no credential values or private database dump. Database invariants, all-role attack testing, real backup/restore, live restart resilience, destructive deletion,5000-record performance and network/database/storage fault injection were not performed on the live service. The active session is intentionally retained for review. See QA_RELEASE_READINESS.md before soft launch.


Download closure: original QA12 evidence remained accessible after actual-receipt corrections. A fresh browser download matched the original225-byte test file by SHA-256. Evidence: round2-download-integrity; r2download12-005/006. This uses local inspection of the browser-downloaded file, not a live API/database query.

## Mascot corner movement - local verification, 2026-09-13

DEC-031 / WF-025 implements the user-confirmed horizontal-only mascot movement with left/right bottom snapping and browser-local persistence. Native/review x Current/Minimal x 1440/390px coverage: 48 checks passed for normal pagination, horizontal drag without vertical displacement/accidental guide opening, reload and dialog persistence, keyboard positioning/activation, touch swipe and settled tap, and 320px resize bounds. Chrome may suppress taps briefly after the target moves; the touch runner waits for that settling interval rather than forcing clicks.

The existing presentation suite also passed 44 checks, including guide steps, unsaved forms, reduced motion, mobile sizing, zero runtime errors, zero business-write requests and unchanged test workspace data. Standalone review build regenerated; diff whitespace check passed. All tests used isolated fixtures, no live records were created or changed. This mascot update has not been published. Ignored evidence: test-output/mascot-pagination/2026-09-13T01-35-22-126Z/report.json and test-output/presentation-release/2026-09-13T01-35-00-904Z/report.json.

## Minimal timeline - local verification, 2026-09-13

DEC-032 / WF-026: 60 browser checks passed across native server and standalone review. Verified default timeline visibility, guide toggles, reload, 390/320px layouts, existing guide/form behavior, reduced motion, unchanged business data and zero runtime errors/write requests. Initial mobile check found 6px intrinsic grid overflow in order panels; corrected the Minimal mobile grid and verified both sizes without document overflow. Mobile screenshot reviewed. Build and whitespace checks passed. Evidence: test-output/minimal-timeline/2026-09-13T01-47-20-855Z/report.json. Not yet published live.
