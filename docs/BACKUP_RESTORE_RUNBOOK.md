

### Executed pre-reset recovery drill - DEC-051 (2026-09-13)
A consistent live SQLite snapshot (88,252,416 bytes) was integrity-checked and privately downloaded. The exact selective reset was rehearsed on an isolated restored copy. Live application then verified clean registers and exact preservation of accounts/evidence/audit; full pre-reset state is also in soft_launch_archives. Original private backups remain in the app data backup directory and ignored operator storage. This is a one-time verified snapshot/drill, not scheduled encrypted cloud backup or disaster-recovery sign-off; AUD-014 remains deferred. Do not restore over post-reset work without reconciling the data-loss interval.


### DEC-052 serial restart recovery warning
The live launch sequence restarts at 1 after the user-confirmed empty-workspace reset. Old test archives retain their original serials. Recovery after new launch orders exist must reconcile serial collisions; never merge old archive orders into the live sequence unchanged. A consistent pre-serial-restart snapshot and ORDER_SERIAL_RESTARTED audit record were retained.


## Software reference preservation - DEC-053
A full SQLite backup must retain recordReferences namespace, entries, next counters and external links with business data/audit. First reference initialization makes a consistent backup before migration (or runs within the existing backed-up serial migration). Never reset this registry when resetting PO display serials or deleting data. Preserve reservations for removed records. Cloned/restored environments retain the original namespace and must remain disconnected from future production connectors until deliberate environment separation is implemented. Restoring pre-reference backups after an integration starts needs identity reconciliation; do not regenerate references and reconnect blindly.


## DEC-055 - Retry receipts and stricter reference recovery
Full SQLite recovery must retain request_receipts with workspace, recordReferences, audit_events and file_bodies. Dropping receipts can permit an old request to execute again. Missing/archived upload evidence must be recovered deliberately; replay must not manufacture a new body/reference. Stricter reference validation can stop startup on malformed IDs, duplicate numeric reservations or invalid maps/links: retain the original backup and perform an audited repair, never reset the registry to bypass validation. A local 10,000-order backup/restore drill passed integrity and reference comparisons; it does not replace the still-deferred off-site setup.


## Mandatory downloaded pre-release recovery ZIPs — DEC-067 / WF-061

User instruction, 2026-09-24: before every live release, download a website recovery backup as a ZIP and retain up to five backups. This applies to all future deployments, including small fixes. A server-only snapshot does not satisfy this gate.

1. Identify the currently running application commit, live database path and persistent volume. Create a fresh consistent SQLite snapshot with the existing VACUUM INTO procedure; never copy an active database file without its transaction state. Check integrity and calculate SHA-256 on the server.
2. Download that snapshot to private operator storage. Use the main checkout's ignored backups/releases/ directory so changing worktrees does not scatter recovery copies. Check the downloaded byte count and SHA-256 against the server snapshot.
3. Create a ZIP containing the complete snapshot, matching running application source/assets/templates (including Dockerfile/package manifest), a recovery guide and a manifest with UTC snapshot time, running commit, database revision and file sizes/checksums. Uploaded evidence bodies are stored in SQLite file_bodies and are included in the full database. Preserve accounts, audit, retry receipts, reference namespaces/counters, historical archives and all business records. Do not include .env files, tokens or SSH private keys. Record required environment variable names, not secret values. Protect the local directory because the database contains private records and account/session material.
4. Verify the finished ZIP's archive integrity and manifest hashes, extract into an isolated directory and check SQLite integrity again. Rehearse candidate startup/migrations on a separate restored copy; preserve the untouched recovery snapshot. Never use the live data path for a drill. Record the verified ZIP path/hash privately before proceeding with the release push/deployment.
5. Only after the new ZIP passes every check, keep the five newest verified release ZIPs, ordered by snapshot time. Delete older ZIPs created by this release procedure, after verifying their resolved paths remain within backups/releases/. Do not delete unrelated files or server backups, follow links outside the directory, or prune any good backup when creation/download/validation fails. Partial/failed files are not verified backups and cannot authorize a release.
6. Deploy and perform existing health, runtime-asset and read-only preservation checks. Retain the pre-release ZIP for recovery. Use a unique timestamp/commit filename; never overwrite a previous backup.

Recovery: stop writes, preserve the current failed state, identify and reconcile writes made after the selected snapshot, restore the matching source and database into a separate environment, verify references/evidence/financial history, restore required private runtime settings, invalidate recovered sessions and verify accounts/access before a deliberate production cutover. Never blindly overwrite a newer live database with an old snapshot. ZIP recovery does not make an old application compatible with every newer schema.

This is a mandatory release procedure, not a scheduled daily backup service. Encrypted cloud backups remain a separate deferred task. This policy was recorded during local BOM UI work; no new live release or downloaded ZIP is claimed in this documentation update. The first subsequent release must execute this gate before publication. Historical recovery evidence below remains unchanged.


## Downloaded recovery ZIP executed — 2026-09-24, DEC-067
Before publishing 9f7c3c804518dfed6db954bebdb7fa0cd2eeea58, a fresh 507,654,144-byte SQLite snapshot at revision 1513 was downloaded and matched to the server SHA-256. All 87 running source files matched the previous running commit 803bf34346735f781f1008c5d9000777ce50ded1. The 464,872,834-byte final ZIP includes that database, source archive, manifest and recovery guide. ZIP CRC/file hashes, extracted-database integrity/foreign keys and candidate startup/data preservation passed. Retention found 1 verified managed ZIP; no old backup needed deletion. Temporary unpacked download/restore copies were removed after final ZIP verification. The retained archive and receipt are in the main checkout's ignored backups/releases/. This is a pre-release recovery copy, not scheduled cloud backup.


## Downloaded recovery ZIP for manual prices — 2026-09-24
Before publishing 8f24c088b8fa25c7d098ccc39aed69d8f9f7b255, a fresh 507,654,144-byte consistent SQLite snapshot (revision 1513) was downloaded and matched to its server SHA-256. All 87 running source files matched 9f7c3c804518dfed6db954bebdb7fa0cd2eeea58. The verified 464,874,649-byte ZIP includes database/evidence, source archive, manifest and recovery guide. CRC, member hashes, SQLite integrity/foreign keys and isolated candidate startup/data preservation passed. Retention keeps 2 verified managed ZIPs; 0 older ZIPs removed. Files and verification receipts are held privately in backups/releases/. This remains a release recovery procedure, not scheduled off-site backup.


## Downloaded recovery ZIP for price comparison — 2026-09-24
Before publishing ef945cc01a51099f3c27e13a61122ff3e6be862f, a fresh 507,654,144-byte SQLite snapshot (revision 1513) was downloaded and matched to the server SHA-256. 87 running source files matched 8f24c088b8fa25c7d098ccc39aed69d8f9f7b255. The 464,877,213-byte verified recovery ZIP contains database/evidence, matching source, manifest and recovery instructions. CRC/member hashes, SQLite integrity/foreign keys and isolated candidate startup/data preservation passed. Retention keeps 3 verified managed ZIPs; 0 removed. Private files/verification receipts are in backups/releases/. This release recovery procedure does not establish scheduled off-site backup.


## Downloaded recovery ZIP for frame BOM save — 2026-09-24
Before publishing 45b19d41f38ce9672f36ae3531dc261686941baa, a fresh 507,658,240-byte snapshot (revision 1516) was downloaded and matched to the server hash. 88 running source files matched ef945cc01a51099f3c27e13a61122ff3e6be862f. The 464,883,507-byte recovery ZIP passed archive/member hashes, SQLite integrity, foreign keys and candidate startup with all business data preserved. Retention: 4 verified managed ZIPs, 0 pruned. Private ZIPs and receipts remain in backups/releases/. This is a release backup, not scheduled off-site backup.
