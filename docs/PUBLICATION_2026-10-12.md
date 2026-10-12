# Pending-work publication — 2026-10-12

User instruction: publish all pending updates. This record separates the integrated application release from protected data refreshes and integrations that still lack target-system setup. Publication is not claimed until live verification is appended.

## Application scope

- Audit repairs under DEC-132 / WF-127: current-state approval checks, final BL payment prerequisites, append-only stock corrections, explicit test-data classification, recoverable saves, private seed protection and bounded read optimizations. See [repair report](AUDIT_REPAIRS_2026-10-12.md).
- 3D container scenarios and reviewed packing imports under recovered DEC-129/130 and WF-124/125. The [planner contract](CONTAINER_PLANNER.md) preserves original PO/shipment quantities, permissions and commercial state. Missing dimensions remain pending; browser drafts are explicitly local and do not mark a shipment loaded.
- Whole-form Product group in Order details under DEC-133 / WF-128. It defaults to All product groups, combines with catalogue search and narrows new choices using the selected supplier's existing categories. Existing mixed-category lines, quantities, rates, specifications and totals remain intact. It is a choice filter, not a saved single-category restriction on a PO. Per-item category controls remain available.

The established Farming Hub Minimal design, approved logo, shared controls and existing roles are preserved. Product group follows UI-01/03/04/05/08/11/12 and HIG R100/R102/R104. Planner/import lifecycle, labels, focus, dirty-work recovery and tables follow the existing UI/HIG web adaptations. No new runtime dependency, schema migration or framework is introduced.

## Private data publication

After code deployment, the approved sample PO classification must run through its authenticated, reasoned domain command, preserving original history and number continuity. The reviewed RO refresh must use guarded resource APIs with current revisions and stable request identities. Actual payments, source quantities, source currencies and unresolved mappings are preserved. Private source files, costing values, business snapshots, credentials and operational receipts stay outside Git and public assets.

## Recovery and verification

A fresh consistent production SQLite snapshot was captured on 2026-10-12 with the matching running source. Downloaded/server hashes match; all 231 deployed runtime files match the recovery source byte-for-byte after resolving only newline representation. Recovery ZIP checksums, member hashes, archive integrity and isolated original/candidate startup passed. All 23 existing tables remained exactly equal through restore. The confidential archive is retained in the main checkout's ignored release-backup directory.

Product-group browser verification passed 32 checks across server and standalone modes, including keyboard/mobile access, canceled supplier changes, mixed-line preservation and viewer permissions. Final combined native, planner/import and live verification results are recorded below when complete.

Pre-publication acceptance: the integrated native suite passed 570 tests with zero failures or skips. After the final identity and streaming-limit regression additions, all 29 focused packing tests passed. Planner/import browser acceptance passed 44 checks across authenticated server and standalone modes, with zero browser errors and zero business-write requests; server business state remained byte-equivalent. Both standalone and domestic-preview builds passed. Independent review findings on missing item identity and expanded workbook size were fixed and retested. Live verification remains pending until deployment.

## Remaining boundaries

ERP and external VMS synchronization cannot be enabled until the intended systems, API contracts and credentials are supplied and tested. Existing native VMS remains active. The 3D scenario engine does not infer geometry from CBM and does not certify physical loading, manoeuvring or securing. Full aggregate persistence remains a growth limitation despite the verified ten-user read improvements; no replica/database migration is included. Management and direct server verification use HTTP; public proxy settings remain separately managed.
