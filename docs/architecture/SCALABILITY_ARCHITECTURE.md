# Scalability architecture and evidence

Date: 2026-09-26. Status: audit/recommendations, not certified production capacity. Refer to [scale risk register](../handover/SCALABILITY_RISKS.md) for priority, status and closure gates.

## Assumptions and unknowns

The user's target of INR 300 crore/year measures money, not request throughput. Current production user count, peak active editors, requests/sec, typical PO lines, multi-year record retention, file growth, branch/warehouse scope, acceptable downtime and recovery data-loss window were not measured in this documentation audit. Do not substitute synthetic counts for current live volume.

The existing synthetic probe uses 100, 1,000 and 10,000 one-line draft orders, empty transactional history/evidence bodies and the same INR 300 crore aggregate. These are a small reference point and 10x/100x **data** probes, not a claim of 10x/100x user coverage. Their limited richness makes them optimistic about real record/history costs.

## Fresh verification

- Native regression: 273 passed, zero failed/skipped, 2026-09-26; includes permissions, financial invariants, references, persistent receipts, current Import concurrency and Domestic/VMS behavior.
- Initial capacity harness failed before timing: synthetic orders retained automatic number identity while discarding its registry. Corrected the fixture to create blank automatic drafts and let the real allocator assign references; no production identity guard was weakened.
- Updated benchmark separates legacy no-context conflicts from current-context independent-order writes. The latter uses one synthetic actor on 20 distinct orders, so it is not a distinct-user, browser, proxy, soak or production stress test.
- Final instrumented run: **FAIL at current-context HTTP pressure**, with successful synthetic backup/restore checks. Raw fixtures and outputs remain ignored under test-output.

### Measured local results — 2026-09-26

Windows workstation, Node 24.19.0; same process hosts both client and server for this diagnostic. One run per dataset, no warmup/statistical confidence; no production hardware, office network or browser rendering included. Values below are from the final instrumented run, not selected averages.

| Draft orders | Scoped state bytes | Store read | Scope projection + serialization | Simple store write |
|---|---:|---:|---:|---:|
| 100 | 657,709 | 4 ms | 20 ms | 25 ms |
| 1,000 | 4,930,817 | 27 ms | 91 ms | 203 ms |
| 10,000 | 47,733,825 | 349 ms | 605 ms | 2,080 ms |

The scoped state sizes above exclude the separate edit-context/response envelope. At 10,000 orders the integration snapshot was 65,565,959 bytes (692 ms generation); the edit context itself was 907,738 bytes.

- **Legacy control:** 20 same-view preference writes without contexts gave one 200 and 19 expected 409 conflicts in 14.438 s. This is not the modern independent-edit result.
- **Current-context pressure:** 20 requests on distinct orders gave **18 HTTP 200, two ECONNRESET, and 18 persisted tasks**. Successful responses completed in 74.754–75.749 s; total run 75.767 s. Revision advanced exactly by the committed count and no synthetic task duplicated. The benchmark correctly exits nonzero because all 20 were not acknowledged and persisted.
- **Interpretation:** this workload fails interactive acceptance. The full state and version catalogue cause substantial work and transfer per request. The exact transport-reset cause was not isolated; client/server sharing a process and connection reuse are methodological limitations. Do not assert a live outage, irrecoverable data loss, or a specific server timeout from this result.
- **Recovery check:** VACUUM INTO took 267 ms; an independently opened synthetic copy passed integrity, preserved 10,000 orders and the reference registry. This is not an off-site disaster recovery drill or a measured production RTO.
- **Variability/history:** the preceding run measured 952 ms read / 1,762 ms projection / 5,801 ms simple write at 10,000, then its old fail-fast collector aborted on ECONNRESET. The final run records each request before closing the server. Do not hide that failure or treat the faster rerun as an SLA.

Reproduce with `node scripts/benchmark-erp-capacity.mjs`; it creates new synthetic SQLite files under ignored test-output and a loopback server, not a live connection. Preserve its failed result until architecture/load behavior changes. Raw reports are timestamped; do not commit database fixtures.

Standalone review generation also completed using `node scripts/build.mjs --domestic-preview`: 40,869,526-byte self-contained HTML including pictures. This is a generated-review artifact size, not the live site's initial network payload. No browser or visual QA was performed in this audit.

## Three-level review

| Dimension | Current source behavior | 10x growth concern | 100x pressure / incremental response |
|---|---|---|---|
| Users/transactions | One process, synchronous Store; context guards allow independent Import saves | Hashing, serialization and buffered responses occupy the request path; Domestic conflicts remain broad | Normalize aggregate access and versions before adding workers/instances; measure queued requests and p95 latency |
| Records/history | Workspace JSON plus growing event history; full scoped bootstrap | Local paging still downloads all allowed records; repeated reference/event validation | Indexed, scoped, paginated lists/detail/history; bounded snapshot/export jobs |
| Files/storage | Up to 50 MiB per file, base64 JSON and SQLite BLOB; multiple copies buffered | Heap/network/backup growth, especially concurrent uploads | Stream/stage files with bounded concurrency and authorized downloads; evaluate object storage with evidence migration |
| Reporting/integrations | Synchronous common snapshot and in-browser comparisons | Heavy export/import competes with everyday saves; no durable job recovery | Persist jobs/checkpoints/results, bounded batches, retry/idempotency/reconciliation; separate reporting workload if measured |
| Locations/organization | Division scopes and one workspace/company default; no tenant partitioning | New warehouses/companies need explicit ownership, not just a new label | Specify company/warehouse data model and access boundaries before cross-company accounting |
| Engineering/features | Shared helper modules plus large shell/dispatcher, manual review build order | Greater regression and merge risk | Extract cohesive modules as touched; automate contract/import/build checks |
| Operations/cost | Single persistent volume, manual verified release archives | More evidence increases backup/download duration; errors often surface from users | Agree recovery objectives; monitored scheduled off-site recovery; telemetry before infrastructure expansion |

## Proposed performance acceptance budgets

These are starting targets for discussion, not an existing SLA or silent release gate:

- Normal list/detail/search API p95 <=500 ms and ordinary save p95 <=1 s at the agreed peak workload.
- Usable authenticated first page <=3 s on a representative office connection; local filter response <=200 ms.
- Aim for <=1 MiB compressed initial business payload; paginate growing histories instead of increasing that budget indefinitely.
- Return job identity/progress promptly for imports/reports that exceed a short interactive operation; job limits and completion targets depend on input sizes.
- Zero lost updates, duplicate committed requests, reference reuse or silent financial changes in any load test.
- Agree RPO/RTO and evidence-retention requirements with the owner before selecting a backup schedule or storage provider.

Record hardware/runtime, dataset shapes, warm/cold behavior, test duration, concurrency, p50/p95/max, error mix, heap/RSS, CPU, event-loop delay, payload bytes and database growth. A single local timing is diagnostic, not a percentile. Add long histories, realistic attachments, read/write mixes and burst reporting; test failure/restart/disk-full conditions in isolation.

## Incremental evolution recommendation

1. Measure real workload without recording sensitive payloads. Add release identity and request/DB timing, errors, event-loop/storage/backup alerts.
2. Design indexed entity storage and scoped paginated reads. Preserve shared domain behavior, transactional counters, snapshots and cross-order financial invariants. Compare normalized SQLite and a server database against measured concurrency and recovery needs; changing engine alone cannot fix full-state APIs.
3. Add a durable import/costing/export job path with idempotent checkpoints and immutable run/source versions; bound file memory and retention.
4. Consider object storage and multiple application instances only with an approved operating model. Current local DB, process-keyed contexts and in-memory rate limits are not ready for a replica switch.
5. Introduce separate reporting/search infrastructure or service extraction only when measured load and ownership justify it.

A wholesale framework rewrite, cache layer or microservices split is not the first step. Read-only caching later needs explicit scope key, revision/invalidation, TTL, stale tolerance and fallback. Do not cache away authorization or stale-money checks.

## Gate for the proposed LAE costing extension

An isolated costing prototype can reuse existing fixed-point helpers and golden calculation vectors. Bulk historic RO/invoice/stock/evidence ingestion should wait for bounded storage/API/job design. Version actual inputs and formula policy; keep invoice arrival actual cost distinct from dated stock holding allocations. See the [proposal](../LAE_COSTING_INTEGRATION_PROPOSAL.md); no costing policy or migration is approved here.


## Local repair retest — 2026-09-26, DEC-083

The original audit measurements above are preserved. With compact context handles and explicit Domestic guards, the same minimal 10,000-order harness committed all 20 distinct-order writes, but total time was **212.162 seconds** (responses 209.120–212.156 seconds). Tokens were 43 bytes; scoped state remained 47,733,825 bytes. Backup/independent restore kept 10,000 orders and registry with integrity `ok`. Data-safety assertions pass; latency is worse than the prior diagnostic run and **SC-01/02/09 remain open**. No throughput improvement is claimed. The in-process harness/heap/load need profiling; isolated old/new context timings were comparable and narrow session projection was faster in a separate microcheck. See [repair report](../ENGINEERING_REPAIR_REPORT.md) for numbers, controls and limitations. No storage migration or pagination was implemented.
