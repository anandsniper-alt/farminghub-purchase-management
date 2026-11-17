# Project rulebook

Current operating guide · 2026-11-17 · DEC-170 / WF-165.
User request: remove unnecessary rules and clutter while preserving correctness and live work.

## Read only what applies

1. Confirm the checkout, dirty files and current remote changes once at task start. Read accessible relevant cloud updates; record an unavailable source once, then continue independent work.
2. Read this guide. Search the relevant module contract and current source before editing. Consult the decision ledger only for the affected behavior or a conflict.
3. For screen changes, read [UI rules](standards/UI_UX_RULEBOOK.md) and [brand rules](BRAND_RULEBOOK.md). The long [Apple reference](APPLE_HIG_RULEBOOK.md) is lookup material for relevant rule IDs, not mandatory cover-to-cover reading.
4. For publishing or data writes, use the change classes in [Recovery and release](BACKUP_RESTORE_RUNBOOK.md).

Do not reread all six historical knowledge documents, the entire DEC/WF logs, every release report or every module guide for a small fix. Revisit only changed inputs, affected dependencies or unresolved evidence. Old test counts and deployed SHAs are dated facts, never current proof.

## Rules that remain mandatory

- Follow the user's latest explicit decisions. Preserve unrelated records, ongoing staff edits, calculations, terminology and workflows. Clarify a genuinely ambiguous business choice; routine reversible fixes do not require another approval ceremony.
- Reuse existing native ESM components and shared calculation helpers. No framework rewrite, duplicate formula or speculative infrastructure change. Keep edits within scope.
- Enforce identity, role/division permissions, Origin/CSRF, validation, atomic transactions, optimistic revisions, retry identities and append-only audit on the server. UI visibility never grants permission.
- Preserve stable item/reference IDs, original PO ownership, issued snapshots, evidence and historical accounts. Missing is not zero; estimates and incomplete totals must be labelled.
- Keep credentials, databases, private reports and recovery files out of Git, logs and public assets. Maintain the static-file allowlist and scope-controlled downloads.
- Never test business writes on live data. Use isolated temporary data for mutations, failures, retries and recovery. Live verification is read-only unless the user explicitly requested a scoped business update.
- Validate affected behavior, money, stock, permissions and concurrency. Share exact final-source evidence across the release; rerun only for a material change, a failed check or a coverage gap. Local focused tests plus exact-commit CI may replace a duplicate local full-suite run. Required checks must still pass.
- Preserve source-to-runtime traceability, a compatible rollback, healthy runtime and affected live verification. Use the release classes below; a push is not a deployment.

## Current presentation

Minimal is the only theme (DEC-045); Farming Hub logo, green/lime identity and shared navigation remain. The mascot launcher/dock/tour stay hidden (DEC-120). Per-login page-guide preferences remain. Do not test removed Current-theme or mascot flows for unrelated changes. Accessible labels, keyboard/focus, responsive controls, dirty-form protection, contrast and reduced motion still apply to affected UI.

## Business contracts: consult by affected module

The [detailed reference](PROJECT_RULEBOOK_REFERENCE.md) retains existing stable rule IDs and module-specific contracts; it is not an additional global reading requirement. Later confirmed decisions and the owner documents below resolve dated entries.

| Area | Owner / additional contract |
|---|---|
| Accounts, approvals, identity, retries, evidence | [Detailed rules](PROJECT_RULEBOOK_REFERENCE.md), [Administration](ADMINISTRATION.md), [Concurrency](CONCURRENT_ACCESS.md) |
| Import purchase, payments and shipping | [Manager workflow](MANAGER_WORKFLOW.md), [Process exemptions](PROCESS_EXEMPTIONS.md), [Payment planner](PAYMENT_PLANNER.md) |
| Domestic items, BOMs, quotes and issued POs | [Detailed rules](PROJECT_RULEBOOK_REFERENCE.md), [Domestic POs](DOMESTIC_PO_RELEASE_REPORT.md) |
| Implements item master, suppliers and purchasing | [Suppliers](IMPLEMENTS_SUPPLIERS.md), [PO lifecycle](IMPLEMENTS_PROCUREMENT_LIFECYCLE.md) |
| Cost-free BOM checking and approval | Preserve technical-only projection, correction proposals, revision checks and approved shared BOM; see detailed reference and current BOM store/domain tests |
| Implements fabrication and costing | Final uploaded combined kg per machine; do not multiply by piece count. Preserve shield exclusion, current subtotal warnings, pending inputs and confirmed rounding/pricing decisions (DEC-109/153) |
| Monthly plans and MRP | [Plan entry and approval](IMPLEMENTS_MONTHLY_PLANNING.md); approved plans only, chronological stock allocation, consistent filter/selection/PO scope (DEC-169) |
| Production and stores | [Production](PRODUCTION_STOCK_MANAGEMENT.md), [Segment material issue](STORES_MATERIAL_ISSUE.md); no double deduction, preserve batch snapshots and serial history |
| RO costs and stock analytics | [RO costs](RO_COSTINGS.md), [Landing prices](LANDING_PRICES.md), [Sales analytics](LAE_SALES_ANALYTICS.md); preserve actual/provisional distinction and source ownership |
| Utility prices | [Utility price workings](UTILITY_PRICE_WORKINGS.md); existing division and stock contracts remain |

## Proportionate documentation and release work

- Update the owning contract when behavior changes. A meaningful decision gets one DEC entry; a changed workflow gets one WF entry. Append a learning only when there is a new reusable lesson.
- Do not copy the same release narrative into brand, baseline, deployment, recovery, learnings and both ledgers. Keep detailed verification privately; reference it once from the applicable handover. Preserve earlier evidence as dated history.
- Small fixes need a concise impact note, not an architecture report or a 10x/100x study. Significant architecture, data-volume or concurrency changes still require those assessments.
- Batch related work into one tested release. Do not push the same candidate to several branches merely to run duplicate CI. Do not repeat backup/restore checks for each file edit in one release.
- Documentation-only work needs link, consistency and scope checks. It does not require a database read, full runtime tests, deployment or a recovery download.

## Supersession

DEC-170 replaces blanket six-document reading and repeated documentation/release rituals in G-03/G-04, the old maintenance contract, AGENTS, and earlier engineering/UI wording. [BACKUP_RESTORE_RUNBOOK.md](BACKUP_RESTORE_RUNBOOK.md) is the single release/recovery authority. Two verified recovery ZIPs and two verified learning ZIPs remain the separate local retention sets. Business approvals, data protections and module calculation contracts are unchanged. No global personal configuration is changed.
