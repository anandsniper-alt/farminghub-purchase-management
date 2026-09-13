

### Executed pre-reset recovery drill - DEC-051 (2026-09-13)
A consistent live SQLite snapshot (88,252,416 bytes) was integrity-checked and privately downloaded. The exact selective reset was rehearsed on an isolated restored copy. Live application then verified clean registers and exact preservation of accounts/evidence/audit; full pre-reset state is also in soft_launch_archives. Original private backups remain in the app data backup directory and ignored operator storage. This is a one-time verified snapshot/drill, not scheduled encrypted cloud backup or disaster-recovery sign-off; AUD-014 remains deferred. Do not restore over post-reset work without reconciling the data-loss interval.


### DEC-052 serial restart recovery warning
The live launch sequence restarts at 1 after the user-confirmed empty-workspace reset. Old test archives retain their original serials. Recovery after new launch orders exist must reconcile serial collisions; never merge old archive orders into the live sequence unchanged. A consistent pre-serial-restart snapshot and ORDER_SERIAL_RESTARTED audit record were retained.


## Software reference preservation - DEC-053
A full SQLite backup must retain recordReferences namespace, entries, next counters and external links with business data/audit. First reference initialization makes a consistent backup before migration (or runs within the existing backed-up serial migration). Never reset this registry when resetting PO display serials or deleting data. Preserve reservations for removed records. Cloned/restored environments retain the original namespace and must remain disconnected from future production connectors until deliberate environment separation is implemented. Restoring pre-reference backups after an integration starts needs identity reconciliation; do not regenerate references and reconnect blindly.


## DEC-055 - Retry receipts and stricter reference recovery
Full SQLite recovery must retain request_receipts with workspace, recordReferences, audit_events and file_bodies. Dropping receipts can permit an old request to execute again. Missing/archived upload evidence must be recovered deliberately; replay must not manufacture a new body/reference. Stricter reference validation can stop startup on malformed IDs, duplicate numeric reservations or invalid maps/links: retain the original backup and perform an audited repair, never reset the registry to bypass validation. A local 10,000-order backup/restore drill passed integrity and reference comparisons; it does not replace the still-deferred off-site setup.
