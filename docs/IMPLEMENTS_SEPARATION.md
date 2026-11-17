# Independent Implements application

Implements runs as a separate application at `https://implements.dvjassociates.com`, using the native server in `FH_APP_MODE=implements`. Its database is `/app/data/implements.sqlite` on a **new, exclusive persistent volume**. Purchase continues to use `purchase-pilot.sqlite` on its existing volume. Never mount the Purchase volume into the Implements application. Both applications require one instance each.

The Implements entry page loads only the shared shell and its small portal. Purchasing, BOM & Syntax, Production & Stock and Monthly plan entry keep their established routes, permissions and business rules. LAE and Utility APIs are unavailable in this application, including for administrators. The technical and planning roles remain cost-free.

## Configuration

Use the root Dockerfile and internal port 8000. Set `HOST=0.0.0.0`, `FH_DATA_DIR=/app/data`, `FH_SECURE_COOKIE=true`, `FH_ORIGIN=https://implements.dvjassociates.com`, and `FH_APP_MODE=implements`. Initial administrator credentials are private runtime variables, used only to initialize an empty database. Preserve the normal release SHA. Disable automatic deployment on both applications; deploy only the reviewed commit.

The source defaults to `FH_APP_MODE=purchase`. Migration partners default to the two production HTTPS origins; isolated tests can override `FH_MIGRATION_SOURCE` and `FH_MIGRATION_TARGET`. These values must be trusted HTTPS origins. Cookies are host-only; users sign in separately. Existing eligible user IDs, password hashes, roles, scopes and preferences transfer unchanged. Subsequent account administration is independent in each application.

## Controlled cutover

Follow the behavior/data/platform recovery gate in [Recovery and release](BACKUP_RESTORE_RUNBOOK.md). Retain a verified full source recovery before deployment. First deploy compatible migration guards to Purchase and an empty, write-blocked Implements application. Staff may continue using Purchase until the explicit freeze.

All transfer actions are administrator-only POST requests under `/api/admin/implements-transfer/`, with the normal session, Origin and CSRF protections:

1. Source `freeze`, supplying the current Implements `expectedRevision`, persists a write barrier. All four Implements module mutations check this barrier at the mutation boundary, including requests whose bodies arrived before the freeze. User account edits pause during this brief window. LAE business operations remain available.
2. Source `export` creates a consistent subset SQLite snapshot in a worker and streams gzip with the uncompressed SHA-256 and size headers. It includes ten complete Implements/BOM/production/planning tables, their history and retry receipts, row identities and sequence counters; eligible accounts and their account history are included. LAE business records, evidence bodies and sessions are excluded. Repeated exports of an unchanged frozen source are identical.
3. Destination `import` verifies stream bounds, SHA-256, schema, integrity, foreign keys and per-table fingerprints before committing into an empty database. It refuses repeated imports or existing business/account history. Initial sessions are invalidated. Imported data remains write-blocked in `INSTALLED` state.
4. Sign in again with the carried-over administrator account. Verify models, prices, stock, plans, pending corrections, production history and access against the frozen snapshot.
5. Destination `activate` verifies the source is still `FROZEN` with the same transfer ID and checksum. Source `complete` verifies the destination is `ACTIVE` with the same proof and changes source status to `MOVED`. The source barrier remains throughout; there is no interval with two writable copies.
6. Old module-page links redirect to the equivalent path on the new host. Old API write requests fail with a moved message; they are never transparently forwarded. The source records remain retained and read-only. Verify both hosts, the exact release, served assets, HTTPS, preserved data and the new recovery backup.

`/api/implements-migration-status` exposes only the application, phase and transfer proof, not business records or credentials. Administrative scripts and exported databases belong in private operator storage, never Git.

## Failure and rollback

Before activation, destination `cancel` permanently blocks that imported destination. Source `resume` permits writes only after verifying the matching destination is `CANCELLED`. Both transitions recheck persisted state after the network wait. If import has not succeeded, fix the failed import while the source stays frozen; do not guess that a destination is inactive.

After activation, never restore the old source database or deploy pre-migration code to the source: that would reopen a second writer. Keep compatible source guards during code rollback. Any reverse migration requires a new controlled freeze and reconciliation of all new Implements writes. Do not delete the original source records as part of separation.

Tests in `tests/implements-separation.test.mjs` cover isolation, complete transfer, independent credentials, production continuation, retries, streaming checksums, stale in-flight writes and cancellation. Browser verification uses temporary data; no live demonstration records are permitted.
