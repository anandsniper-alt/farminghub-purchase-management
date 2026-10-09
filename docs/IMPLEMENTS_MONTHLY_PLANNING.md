# Implements monthly plan entry and approval

2026-10-09 | DEC-122 / WF-117 | Implemented and locally verified. Publication pending recovery and authenticated deployment.

## Operating flow

Implements Division -> Monthly plan entry (also linked from purchasing monthly planner). A Monthly Planner selects a month, enters model quantities, saves a draft, submits and views their own status/history. Purchase Manager/Admin reviews, approves or returns with a reason. Returned plans can be edited and resubmitted by their owner.

Approval replaces the selected month's quantities, rather than adding to them. New entry starts from approved quantities, including hidden SKU/series/search rows. Draft/pending requests never affect MRP or purchasing. Existing manager planning remains available.

## Access

Create an account with role Monthly Planner (`PLAN_OPERATOR`). Its only effective scope is `IMPLEMENTS_PLANNING`, even if other scopes are mistakenly assigned. No live account is created by the release. Explicit server projections provide model syntax, SKU finalisation and planned machines without costs, prices, stock, suppliers, POs or BOM editing. Owners see their requests; Purchase Manager/Admin with Implements purchasing access sees all and approves. Technical-only managers cannot approve. Authentication, CSRF and authoritative user identities are reused; the restricted main bootstrap exposes an empty business state and the actor's profile.

Authenticated `/planning/` uses `/api/planning/workspace`, `/request` and `/commands`. Two additive tables retain requests and append-only audit/retry receipts. Draft -> Pending -> Approved or Returned. Only owners edit Draft/Returned; versions block stale edits. Stable actor-bound receipt IDs apply once. Approval and purchasing update commit together. A submitted month baseline prevents stale overwrites; return/resubmit refreshes it. Quantities cannot be below completed production. Other months, active-month selection, adjustments, BOMs, costs, stock, production and financial histories are preserved.

## Validation and limits

Whole, nonnegative machines, maximum 100,000 per model and 500 model entries per request. Submission requires a positive quantity; zero excludes that model. No empty-month submission, anonymous public access, notifications, supplier messaging, automatic staff grants or live demos are included.

Reads return at most 50 requests with cursor pagination. Details show the latest 100 history entries; durable full history remains retained. Current 187-model and synthetic phone flows passed. Model projections remain linear. At 10x the explicit 500-entry limit remains; at 100x payload-filtered queries and whole-workspace purchasing saves need measured indexing/entity-storage work. No 100x performance certification or dependency added.

## Design and verification

Existing branded shell, clickable home/division breadcrumbs, semantic native 44px controls, unsaved-entry protection, internal table scrolling and pinned phone model identification. UI-01 to UI-12 and HIG R021/R024/R025/R027/R081 apply. Current mascot-removal behavior is retained.

Integrated onto current production source 9722da5. All 441 regressions passed. Isolated desktop/390px flows verified filtered quantities, drafts, submission, approvals, status visibility, unchanged BOM/stock, dirty forms, visible interrupted-save errors, retry after two lost responses without duplicate plans, and creating a planning-only account. Standalone restricted-role navigation and phone fit passed. No browser runtime errors. Demos exist only in temporary databases. Private evidence: ignored test-output/planning-release/ and test-output/stock-master-20261008/planning-browser/. Recovery, CI, deployment, served-code and live readback remain independent release gates.


## Release preparation - 2026-10-09

Fresh 762,036,224-byte production SQLite snapshot downloaded and matched its server SHA-256. Exact running 9722da5 source (216 runtime files), all 22 original-table payloads, integrity/foreign keys, original/candidate startup, ZIP CRC/member hashes and extracted restore passed. Candidate adds only two empty planning tables. Verified recovery retained privately in the workspace backup folder; no older archive deleted. No live business writes or staff grants. Publication is blocked pending valid Coolify credentials; prior release scripts exist, but their temporary host key is absent from original and relocated paths.


Concurrent publication: preserved the newly published c09b8df LAE landing-price register during integration. Planner records use DEC-122/WF-117 to avoid colliding with its DEC-121/WF-116. The verified recovery above is dated against 9722da5; obtain a fresh matching-source recovery again before eventual live deployment.


## Final integrated verification - 2026-10-09

After preserving live c09b8df, all 458 native tests passed with no skips (bundled Python configured for existing exports). Final build and standalone phone navigation passed; seven isolated browser checks passed without runtime errors, including both lost save responses and manual retry. All seeded master/price arrays are excluded from Planner bootstrap, and the new LAE price report/exports are denied to Planner. Draft PR #1 retains the tested implementation without changing main or live. Deployment remains pending valid Coolify access and a refreshed matching-source recovery.

## Monthly plan entry publication verified - 2026-10-09

DEC-122 / WF-117 is live at https://purchase.dvjassociates.com/planning/. Runtime `0766a3910573bf2391ae654aef5a85c72ce8d62c`; Coolify deployment `jhnhscnb9chvc60ivsm6ua3h` finished and is running:healthy. This supersedes the candidate-only publication status above. Own model-wise drafts/submissions remain outside MRP; Purchase Manager/Admin approval alone replaces that month's purchasing plan. No live staff account, grant, demo plan or BOM correction was created by publication.

All 458 native tests, isolated server/standalone/browser checks and GitHub CI passed. Six live read-only check groups passed, including 11 exact served-commit assets, authenticated approval/entry screens, 390px layout and unauthenticated API/asset denial, with no browser errors or business-write requests. Entire main, Implements, BOM & Syntax and Production durable projections match the immediate pre-release baseline; only generated CSRF values were excluded. Main revision 1865 and Implements revision 79 remain unchanged (187 models, 170 items, 17 suppliers). Existing account permissions, BOMs, costs, stock, production and financial histories are preserved.

A fresh 776,208,384-byte consistent snapshot of running c09b8df was packaged with 220 exact runtime source files. Integrity/FKs, all 22 original-table payloads, original/candidate initialization, ZIP CRC/member SHA and extracted restore passed. Candidate initialization adds only two empty planning tables. The 642,267,847-byte verified recovery archive is retained privately in the main checkout backups/releases; no older archive was removed. The existing /app/data persistent volume and hosting settings remain unchanged. Private receipts/screenshots remain in ignored test-output/planning-live-release/. This entry documents runtime publication; subsequent documentation-only commits do not replace that runtime.
