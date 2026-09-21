# Concurrent access release — 2026-09-21

Publication requested by the user. Candidate validation: **225/225 native tests**, **16 two-user/server/review browser checks**, and **three complete Purchase Manager workflows, 68 checks**, all passed.

Coverage: independent orders and vendors, overlapping record protection, typed-entry and attachment retention, explicit reviewed retry, no duplicate upload, unique concurrent PO references, payment dependency conflict, actor/token tampering and restart, legacy compatibility, idle refresh, mobile layout and standalone startup. Browser tests use isolated synthetic databases. Existing workflow tests cover USD/RMB, split shipments, payments and arrival costing.

Private evidence remains ignored: test-output/concurrent-access-full-native.log; test-output/concurrent-browser/1789992149475/report.json and screenshots; test-output/manager-relaxed-workflows/2026-09-21T11-59-50-396Z/report.json. No live test business records are required.

Release gate: fresh consistent live backup, restored-copy rehearsal with exact business-state/table preservation, persistent storage confirmation, deployed commit and healthy runtime, committed asset checks, existing login/browser read-only checks, post-release live database preservation. Publication results will be appended after verification. No data migration is expected.


## Concurrent access published — 2026-09-21
DEC-060 / WF-054 is live at https://purchase.dvjassociates.com in runtime **6578f18501f135c70000c54390da253db291ddca**, Coolify deployment **veyiohrvuqauviaswztf9eyk** (finished; running:healthy). This supersedes the preceding candidate/publication-pending status. Independent order/vendor/personal-setting saves and retained-entry conflict review are published; same-record/shared-dependency conflicts still require explicit review. Refresh open browsers once to load the new client.

225 native tests, 16 two-user/server/review browser checks and three complete Manager workflows (68 checks) passed. Fresh consistent SQLite backup **399114240 bytes** passed integrity and candidate startup on an isolated server-side restored copy. All saved state and protected account/evidence/audit/archive/retry tables matched exactly. The initial network download timed out; no partial download was used as recovery evidence.

**66 live checks passed**, including committed assets, two independent live sessions, authenticated revision endpoint, existing module/workflow navigation and mobile layout. Zero browser runtime errors or business-write requests. Post-deployment SQLite verification preserved all 20 original orders, existing master records, attachments, accounts, archive rows, audit history and retry receipts. Live work progressed from revision 1326 to 1335: 1 new order and 2 new files were reconciled to 10 user audit events. The live order count was 21; no rollback or migration was performed. Unchanged masters: 37 vendors, 388 items and 106 price lists. Existing domain, port 8000, single instance and persistent /app/data retained. No migration or reference reset. Private reports/backups remain outside Git in ignored operator storage and the application data volume.
