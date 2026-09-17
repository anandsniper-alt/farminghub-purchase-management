# Process exemption release — 2026-09-17

Status: live, verified. Runtime ec0863ffa49450cc8a36f63e03fb9611c849a107. Deployment phgvkrkb9eliy749fqpjvhes finished; application running:healthy at https://purchase.dvjassociates.com.

## Scope
DEC-058/059 and WF-052/053: Manager/Admin can grant bounded supplier acknowledgement, specification or artwork exemptions before pre-production/sample QC. Actual early confirmations remain required for QC approval. The first QC decision permanently closes bypass access; corrections/revisions cannot reopen it. QC and later stages have no bypass. All 25 stages support viewing/explanation, pending work remains clickable, and actual completion, revocation and usage retain audit/reference history. No financial calculations or approval-policy defaults changed.

## Verification
- 214 native tests passed, including 9 targeted exemption tests.
- 27 server/standalone browser checks passed, including payment with artwork pending, actual later completion and mandatory QC cutoff.
- Three normal Manager workflows passed 68 checks, using isolated synthetic records.
- 58 live read-only checks passed: HTTPS health, 17 served assets matching the release, existing login, navigation/VMS, automatic PO references, costing, all process rows, mandatory stages without bypass controls, Minimal preferences and mobile layout. No runtime errors or business-write requests. The live order's actual stage state was retained; exemption creation/use was tested in isolation rather than advancing live work.
- The first live run expected an optional page-guide subtitle to be visible with guides hidden. The assertion was corrected to check the mandatory QC explanation in its dialog; the complete rerun passed. No application patch was required.

## Preservation
A fresh consistent 132,284,416-byte SQLite snapshot was retained on the existing persistent volume and downloaded privately. Candidate startup on a restored copy passed integrity and preserved all business collections, account/evidence/archive tables, original audit, existing references and counters. EXM counter initialization alone moved revision 1008 to 1009. Live checks confirmed the same preservation and original audit prefix, retry table and retained backup. One PO, 37 vendors, 387 items, 106 supplier prices and next PO/serial 2 remain intact. No data reset or test seeding occurred. Domain, single application instance and /app/data volume retained.

Private evidence remains ignored under test-output/exemption-release. The temporary deployment key was removed after verification. Off-site backup work remains a separate previously deferred item.
