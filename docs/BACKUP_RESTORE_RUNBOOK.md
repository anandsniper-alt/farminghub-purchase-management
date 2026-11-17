# Recovery and release

Current operating policy · 2026-11-17 · DEC-170 / WF-165. This is the single release gate, replacing copied release checklists and the blanket fresh-download requirement for every small presentation edit. Earlier drills remain in [recovery history](BACKUP_RESTORE_HISTORY.md).

## Classify the complete change from running release to candidate

| Change class | Required checks and recovery |
|---|---|
| Documentation only | Links, scope, consistency and diff review. No live DB read, recovery download, runtime build or deployment. |
| Presentation only | Must change only browser presentation/assets, with unchanged API requests/write payloads, permissions, stock/cost calculations, shared domain, server, startup/migrations, runtime dependencies and hosting configuration. Record a known healthy compatible rollback commit and verify an existing complete recovery archive. No fresh DB download/restore is required solely for this class. Run affected UI/build checks, exact-commit CI, live health/served assets and read-only preservation checks. |
| Behavior, data or platform change | Includes shared calculations, API/commands, persistence, identity/access, migrations/startup, runtime dependencies, deployment configuration, or uncertainty about classification. Require a fresh consistent full recovery archive and isolated candidate restore before live deployment; use the full procedure below. |
| Authorized data import without code release | Preview/reconcile source; capture affected current records/revision; rehearse changed rows in isolation; apply through guarded audited APIs; verify changed and preserved records. No application deployment for an unchanged runtime. Destructive imports, schema changes or broad replacements require the full recovery procedure. |

Classification is against the entire running-to-candidate diff, not just the last commit. A file under web/ is not automatically presentation only: financial calculations, save behavior and authorization changes belong in the full-gate class. If rollback compatibility or a complete verified archive is unavailable, use the full gate. Never restore an old DB to roll back a presentation change; roll back compatible application code while preserving current records.

## One gate per release batch

1. Reconcile source and concurrent work. Confirm live source identity and reviewed candidate diff. Preserve the existing persistent volume and single-instance configuration.
2. Run affected local checks. Run the required complete suites/build once on the final candidate in CI; do not repeat an unchanged full suite locally merely to duplicate CI. Shared runtime changes require relevant server and standalone checks. A changed candidate invalidates the affected evidence; use CI for the exact final commit.
3. Complete the recovery check for the change class. If class requires a fresh archive, it must pass before deployment; source push for CI is allowed when auto-deploy is verified disabled. Never trigger auto-deployment before its recovery gate.
4. Deploy the exact tested commit. Verify deployment completion, health/SHA, affected served assets/screens and read-only data preservation. Reconcile legitimate concurrent user edits rather than replacing them with the earlier snapshot.
5. Record verification once privately. Perform local recovery/learning archive rotation once after the release batch, not after every edit or investigation. Keep failures/pending checks explicit.

## Full recovery procedure

1. Identify running commit, actual data path and persistent volume. Create a fresh consistent SQLite snapshot using the established backup endpoint/VACUUM INTO; never copy the active database without its transaction state. Check integrity/foreign keys and record byte length and SHA-256.
2. Transfer to private operator storage. Prefer compressed transport. A verified delta may reconstruct a complete fresh snapshot using unchanged bytes from a prior local baseline only if the reconstructed full length/SHA-256 exactly match the fresh server snapshot. A partial download or old snapshot is never a substitute. Use existing approved credentials only; this policy grants no broader SSH access.
3. Package complete snapshot, exact running source/assets/templates, manifest and recovery instructions in a private ZIP. Include all records, file bodies, accounts, audit, retry receipts, stable references/counters and historical archives. Exclude credentials and private keys; list environment variable names only.
4. Verify ZIP CRCs, member SHA-256 and extracted DB integrity/FKs. Rehearse candidate startup/migrations on a separate restored copy; compare required table contents and only authorized schema changes. Preserve the untouched recovery snapshot. No drill may use the live DB path.
5. Keep the verified receipt with source/revision/time/size/hash. Existing verification can be reused within the same release batch only while its snapshot and candidate startup/migration inputs remain applicable. Recheck affected migration inputs after edits. Concurrent production writes require reconciliation during live verification, not overwriting live with backup data.

## Local retention and cleanup

Keep the newest **two** verified website recovery ZIPs and **two** verified cloud-learning ZIPs as separate sets in the canonical PMS `backups/releases/` and `backups/cloud-learnings/` directories (user instruction 2026-10-09). This replaces every older five-backup statement.

Verify retained archives before pruning. Use the existing cleanup dry-run inventory, inspect resolved paths, refuse reparse points, then apply only to older managed archives/obsolete restore folders/orphan sidecars. Do not remove active databases, sources, unrelated backups, server backups or in-progress files. The local full snapshot retained as a verified incremental-transfer baseline is not an obsolete extraction. Failed backups never authorize deletion of a good archive.

## Restore and recovery boundaries

Stop writes and preserve the failed current state. Reconcile writes after the selected snapshot. Restore matching source/database into isolation, verify references/evidence/financial history, supply private settings, invalidate recovered sessions and verify access before a deliberate cutover. Do not merge/reset permanent reference registries or retry receipts; do not overwrite newer staff work with an older backup.

Release snapshots are not scheduled off-site disaster recovery. Off-site destination, key custody, schedule, failure alerts and an independent restore drill remain a separate uncompleted setup. No retention of live business/audit records is authorized here.
