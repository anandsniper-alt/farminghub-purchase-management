# Data architecture

Observed 2026-09-26 in `server/store.mjs`, `server/concurrency.mjs`, `shared/domain.mjs` and module helpers. No private database was inspected for this audit.

## Storage model

The live-server design is a single SQLite database, not normalized SQL per business entity. Startup enables WAL, foreign keys and a 5-second busy timeout. Six tables are created by the current Store:

| Table | Key, contents and protection |
|---|---|
| workspace | One row, id=1; revision and full JSON business payload |
| audit_events | Event ID primary key; append-only JSON event mirror; SQL triggers reject UPDATE/DELETE |
| accounts | Profile ID primary key; unique email, password hash and active flag |
| sessions | Hashed token primary key; account foreign key, CSRF token, expiry |
| request_receipts | Composite actor/request key; request digest, access signature, result and timestamp |
| file_bodies | File ID primary key and evidence BLOB |

Historical reset tooling may leave `soft_launch_archives`; current Store does not create or purge that table. Recovery must preserve every table actually present. There are no explicit secondary business-query indexes in Store; primary/unique keys create their own indexes. Foreign-key enforcement does not enforce relationships hidden in workspace JSON.

## Business aggregates

- Import order: automatic reference, item lines, revisions/issued snapshots, PI/history, tasks, approvals, shipments, documents, process exemptions and arrival costings.
- Shared vendor: stable identity, division scopes, commercial fields and embedded VMS CRM interactions/evaluations/samples. Accounts/profiles remain shared across modules.
- Import product: base item, brand ERP variants, technical/artwork histories; Import quotations, complaints, payments, allocations and order costs link these identities.
- Domestic: items, models, hierarchical assembly/model BOMs, quotation snapshots and separate Domestic POs with issued snapshots.
- Permanent reference registry: namespace, per-type counters, reservations and external mapping links. Business document numbers and external accounting IDs are distinct concepts.
- Workspace events also reside in the SQL audit mirror. Audit grows both the workspace and SQL history.
- Evidence metadata is in workspace; bytes are in file_bodies. Successful uploads may precede a failed business command, leaving retained unlinked evidence.

Use existing [reference contracts](../ERP_REFERENCE_FOUNDATION.md), [rulebook](../PROJECT_RULEBOOK.md) and module calculation documentation rather than duplicating their formulas.

## Transaction and retry sequence

1. HTTP authenticates and validates request origin/CSRF/scope.
2. Store begins IMMEDIATE, loads latest workspace and resolves the active actor.
3. If a durable request receipt matches actor, command content and access signature, return its result without repeating the mutation.
4. Otherwise validate expected revision and server-issued edit context.
5. Execute shared domain rules against cloned state; enforce monetary, identity, permission, workflow and immutable-history rules.
6. Preserve reference registry, compare the existing event prefix, append SQL events, replace workspace JSON and save the request receipt in the same transaction.
7. Commit all or roll back all; return scoped state plus a new edit context.

Receipts are optional at transport level and used by the browser for command/upload retries. Account creation has a separate transactional path. Do not assume every endpoint is automatically idempotent. Retrying a lost acknowledgement must not allocate a second reference or duplicate a payment.

## Concurrency boundaries

DEC-083 replaces the earlier encrypted full-catalogue token with a 256-bit random handle bound to actor, source revision and an eight-hour expiry. Its record/dependency hashes stay in a bounded process cache (512 handles, 32 MiB serialized catalogue budget, shared identical catalogues; runtime object overhead is additional). Restart/eviction/expiry invalidates handles while login sessions remain in SQLite. No handle, including a catalogue over budget, means strict workspace-revision matching.

Import order commands guard their orders, linked payments/costs, suppliers/forwarders and shared configuration. Personal preferences and selected vendor commands have narrower guards. Domestic PO/BOM and supplier address/tax commands now guard their target and original/proposed dependencies (nested assemblies, items, quotes, suppliers), plus shared access/configuration. Cancel guards the target PO. Unknown/global commands and other unreviewed Domestic commands still compare all business state. This is conflict rejection, not automatic field merging.

Creating a context still hashes the entire version catalogue, but payments/costs are grouped once by order. Session checks extract only the matching profile into JavaScript with SQLite JSON functions and recheck current activity/permissions; they still depend on the monolithic JSON storage. Each normal save still loads/clones/validates/serializes the workspace. A narrow conflict guard does not imply a narrow SQL transaction. Both reads and writes execute synchronously in the application process.

## Migration and recovery rules

Startup initializes missing serials/references with an idempotent, backed-up path. `SCHEMA_VERSION=7` is not a numbered SQL migration ledger. Issued snapshots, reserved/deleted references, request receipts, evidence and audit must survive any future migration.

Before entity storage is introduced, define aggregate ownership, database uniqueness reservations/counters, foreign keys, index/query patterns, per-entity revisions and cross-order payment transactions. Rehearse against an isolated restored copy; compare financial outputs, every retained identity and evidence hash, replay safety and printed historical documents. Measure duration and rollback compatibility. Database replacement, destructive migration and new infrastructure remain proposed until explicitly approved.

This audit approves no schema or data changes. Recovery procedures remain solely in [Backup/restore runbook](../BACKUP_RESTORE_RUNBOOK.md).
