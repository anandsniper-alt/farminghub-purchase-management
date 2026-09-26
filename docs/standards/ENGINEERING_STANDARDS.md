# Engineering operating standard

GLOBAL engineering standard, confirmed by the user's 2026-09-26 instruction; DEC-081. Business/brand rules remain in their existing canonical documents. Start from the [knowledge index](../README.md).

## Substantial-task cycle

Understand → assess → design → scale check → implement → validate → review → learn → document.

Before changing code, identify the requirement, existing implementation/decisions, impacted records, shared calculations, APIs, roles, UI, history, reporting and integration consumers. Distinguish a product idea from confirmed scope. Reuse → extend → refactor → create, preserving the established native architecture and Minimal presentation.

For meaningful work, record:
- Requirement and success/failure behavior.
- Component/domain ownership and reuse.
- Data keys, uniqueness, references, snapshots, retention and migration impact.
- API/event and authorization boundaries, including read/export access.
- Failure, retry, stale-edit and partial-save handling.
- Current/10x/100x assumptions; bounded query/payload/file/job behavior.
- Diagnostics and proportionate validation.
- Remaining debt, lessons and exact evidence.

Small compatible fixes need a concise impact check, not a separate design document.

## Engineering rules

- Shared domain functions remain authoritative for financial, workflow and permission decisions. Reuse existing fixed-point calculations and document units, rounding, zero/null and date handling where a rule changes.
- No silently unbounded collection API for new large features. Define scope, filters, stable ordering/pagination and maximum batch sizes; existing whole-state limitations are known debt, not a new-feature pattern to copy.
- Before data changes, review primary/foreign/unique keys, indexes and actual read/write patterns. Define transaction boundaries and concurrent-edit dependencies. Preserve immutable reference reservations and issued history.
- Durable retries use stable actor-bound request identities and payload checks; a queue, scheduled task or integration needs replay, partial failure, timeout, backoff, cancellation and visible failure policies.
- Long-running work should have bounded interactive impact. Propose a durable job design when expected volume warrants it; do not install queue/cache infrastructure without evidence and approval where required.
- Cache only with explicit scope/keys, invalidation, lifetime, stale tolerance and fallback. Never cache credentials or use stale financial/permission state as write authority.
- Bound file memory and batch sizes; retain access controls and recovery integrity. Changing evidence storage requires verified hashes/link migration and retention decisions.
- Add structured diagnostics without credentials, tokens, private payloads or full personal records. Distinguish business audit history from operational logs/metrics.
- New dependencies require a concrete need, maintenance/license/security/runtime assessment and review of existing vendored code. No framework/state/ORM substitution for convenience.
- Keep functions/modules cohesive; prefer scoped extraction over giant new dispatch branches. Avoid unrelated reformatting, competing helpers and speculative abstraction.
- Tests prioritize money, permissions, invariants, persistence/replay, concurrency, historical bugs and failure recovery. Do not add tests that only mirror implementation. Test both server and standalone when shared behavior changes.
- Do not claim a run passed, a bug is fixed, performance improved or a release is live without evidence. Label implemented, locally verified and live verified separately, including date/source.
- Follow the existing [release backup gate](../BACKUP_RESTORE_RUNBOOK.md). No audit or passing local suite waives backup, preservation or live verification.

## Decisions and approval boundaries

The existing [DEC log](../DECISION_LOG.md) remains the only decision ledger. For substantial architecture decisions, extend a DEC entry with ADR fields rather than introduce a second numbering system:

Status; Date; Context; Scale assumptions; Options; Decision; Reason; Consequences; Performance/scalability impact; Operational impact; Revisit when. Include scope, affected files, dependencies, workflow impact and documentation updates required by the original rulebook.

Record alternatives and reasoning. A proposal to normalize storage, switch database/framework, change authentication, break an API, perform destructive migration, add significant infrastructure cost or split services is not implementation authorization. Obtain explicit approval unless already authorized. Routine reversible choices and fixes within confirmed scope proceed without repeated permission.

Supersede decisions explicitly; never delete history. Update workflow history when a business or engineering workflow meaningfully changes. Do not promote an observed workaround or local assumption into a global policy.

## Learning and handover

Use the existing [Project Learnings](../PROJECT_LEARNINGS.md), scoped as GLOBAL, DOMAIN/MODULE, FEATURE, BRAND/UI, INTEGRATION, SCALABILITY, TASK-SPECIFIC or TEMPORARY.

For durable new lessons record: Learning; Scope; Area; Rule; Reason; Discovered during; Problem prevented; Applies to; Does NOT apply to; Date; Status. Prefer an enforceable guard/test when it prevents recurrence. Do not repeat rules already owned elsewhere.

After substantial work, update [Current state](../handover/CURRENT_STATE.md) and relevant owner documents with completed/changed work, decisions, affected modules, verification, scale assumption, remaining bottlenecks/issues and the next step. Keep transient command logs and artifacts in ignored task output. Do not label dated historical evidence as current.
