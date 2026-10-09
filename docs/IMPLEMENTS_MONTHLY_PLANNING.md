# Implements monthly plan entry and approval

2026-10-09 | DEC-121 / WF-116 | Implemented and locally verified. Publication pending recovery and authenticated deployment.

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
