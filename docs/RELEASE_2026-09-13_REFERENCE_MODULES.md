# Module and reference release - 2026-09-13

Published at https://purchase.dvjassociates.com. Runtime commit: 519f9fee2d87ed7f8646ac46a502f1128df432b4. Coolify deployment: bplm8iwbj2ojap0qttjiwx4l, finished and running:healthy. Main branch was fast-forwarded; later documentation-only commits do not require a runtime replacement. Auto-deploy remains disabled.

Implemented release scope:
- Minimal standard theme; guide preferences per login in Settings.
- Expanded twelve-entry VMS with previously tested vendor sync/conflict handling.
- Order Management and VMS module selector, four division cards and cleaner contextual navigation. Only LAE Import is implemented.
- Permanent record references, common read-only integration export and manual ERP/Tally identity mappings.
- Historical/supplier-scoped duplicate protections, command/upload retry receipts and state/role-aware next-step guidance.
- New PO number equals its permanent reference. PI numbers remain manual. Existing saved numbers and issued snapshots are preserved.

Verification and preservation:
- 196 native tests passed on the final candidate. Three configured Purchase Manager workflows passed 61 checks; six automatic-number browser checks passed in server/review modes.
- Consistent live backup: 89,571,328 bytes, SQLite integrity OK. Restored-copy startup migration passed before publication; account/evidence/archive hashes and all business collections preserved.
- 39 live checks passed: 13 served source assets match the runtime commit, health/login, module/division navigation, automatic PO field, item reference register, twelve VMS routes, Minimal/personal settings, mobile layout, no browser errors or business-write requests.
- Live SQLite integrity, original audit hash, account/evidence/archive hashes, retry table and retained pre-release backup verified separately.
- Startup initialized references once: revision 969 to 970 with RECORD_REFERENCES_INITIALIZED. Zero orders; 37 vendors, 129 bases, 387 items, 106 prices retained. Next display serial and PO reference counters remain 1. First new PO will be FH-LAE-I-PO-1.

Boundaries: no new synthetic production data, permission grants, business calculations or external Tally postings. The existing VMS working-model audit findings, deferred off-site backup, physical-device checks, pending divisions and production-scale architecture/ERP connector work are not closed by this rollout. Do not restore the pre-release database over later business writes without reconciliation.

Private evidence remains ignored under root test-output/pending-release: baseline.json, migration-drill.sqlite, deploy-status.json, application-after.json, live-report.json, storage-report.json and screenshots. Backups include confidential accounts/evidence and are not committed. Live verification only opened/cancelled the PO form; no number was consumed.
