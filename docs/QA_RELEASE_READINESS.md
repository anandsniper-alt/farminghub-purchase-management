# Soft-launch release readiness

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


**Not ready for unconditional soft-launch sign-off.** Ashok/MANAGER completed 11 full live workflows; 15 QA POs remain active. The 340-row ledger is 235 PASS / 21 FAIL / 84 BLOCKED, with no generic unexecuted rows. Blocked cases still require their specific prerequisites.

1. Publish and live-retest the 13 local fixes, especially missing ERP setup, freight parsing and conflicting/stale import previews. Current live defects remain until verified release.
2. Admin/configured approver must review the technical Reject grant; QAAS01 QA-1.1 is still pending. Admin-only user/role/access and deletion/restore tests were not performed as Ashok. No requested relaxation was invented.
3. Finish the synthetic approved-PLM/brand scenarios after Add ERP item is available. Confirm the intended master-import entry point; retained history is not an importer.
4. Supply real operational logistics and correct route/container benchmarks. The retained QA12 20GP shipment has no matching real benchmark; its booking is unconfirmed. Synthetic QA freight rates are not operational quotes.
5. Resolve TD-04 differing price/invoice currency, TD-05 future-effective pricing, and TD-06 planning-date acceptance deliberately. Preserve established calculations until a policy is confirmed.
6. Complete controlled other-role, fault, restore and scale acceptance in an isolated environment. Ashok-only live testing cannot certify those properties. The original QA12 evidence download was also verified byte for byte after corrections.

Local validation: 131 native tests,38 import lifecycle checks,33 payment checks,8 mascot pagination checks,31 targeted UI checks,36 consistency checks,44 presentation checks and3 complete isolated manager workflows passed. Results are separate from live Ashok execution. Review build regenerated; git diff whitespace check passed.

Release through the established main/Docker/Coolify process when requested, preserving the data volume and all QA records. Retest the same live scenarios after deployment, then reassess readiness. No deployment, role switch, deletion, real transfer or external message was performed in this QA continuation.
