# Concurrent access release — 2026-09-21

Publication requested by the user. Candidate validation: **225/225 native tests**, **16 two-user/server/review browser checks**, and **three complete Purchase Manager workflows, 68 checks**, all passed.

Coverage: independent orders and vendors, overlapping record protection, typed-entry and attachment retention, explicit reviewed retry, no duplicate upload, unique concurrent PO references, payment dependency conflict, actor/token tampering and restart, legacy compatibility, idle refresh, mobile layout and standalone startup. Browser tests use isolated synthetic databases. Existing workflow tests cover USD/RMB, split shipments, payments and arrival costing.

Private evidence remains ignored: test-output/concurrent-access-full-native.log; test-output/concurrent-browser/1789992149475/report.json and screenshots; test-output/manager-relaxed-workflows/2026-09-21T11-59-50-396Z/report.json. No live test business records are required.

Release gate: fresh consistent live backup, restored-copy rehearsal with exact business-state/table preservation, persistent storage confirmation, deployed commit and healthy runtime, committed asset checks, existing login/browser read-only checks, post-release live database preservation. Publication results will be appended after verification. No data migration is expected.
