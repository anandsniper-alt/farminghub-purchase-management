# Live soft-launch data reset

Date: 2026-09-13. Status: completed on https://purchase.dvjassociates.com . Final workspace revision: 968. Application runtime was not deployed or changed.

## Active workspace

| Collection | Remaining |
|---|---:|
| Purchase orders | 0 |
| Remittances | 0 |
| Order costs | 0 |
| Complaints | 0 |
| Genuine vendors | 37 |
| Genuine base products | 129 |
| ERP items | 387 |
| Genuine supplier price records | 106 |
| Genuine freight rate records | 98 |
| User accounts | 3 |

Archived 30 historical POs (26 were active), 23 remittances, 2 costs, 1 operational import, 5 shipping imports, 4 synthetic complaints, 3 explicitly QA-only logistics vendors, 2 QA-only PLM products, 3 QA-only price records, 4 QA freight rates and their 4 import batches. Removed 423 associated test-file metadata entries from active state; original evidence bytes remain protected in storage. Genuine masters, supporting configuration, accounts and approval policies are preserved. Two original unassigned base products remain unassigned; this reset does not alter their mappings.

## Preservation and recovery

Used normal Admin deletion first, then a verified one-time host maintenance transaction because deletion retains entries in the remittance register and the application has no general QA cleanup action. The complete pre-reset workspace is retained in the protected soft_launch_archives database table; existing append-only audit rows remain byte-for-byte unchanged, with one new SOFT_LAUNCH_RESET event. These archived records are outside active screens and cannot be restored through ordinary Deleted orders controls.

Consistent SQLite backups include accounts, sessions, all evidence BLOBs and audit history. Verified an 88,252,416-byte snapshot and downloaded a private copy to the operator workspace. Ran the exact reset on a separate restored database before applying it live. Private backup paths, hashes, plans and detailed maintenance evidence remain in ignored storage. Recovery requires an operator-controlled database restore or archive recovery, with review of any transactions created after the reset; never overwrite later business activity.

Next PO serial remains 31, following the user's never-reuse/never-renumber decision. Manual PO numbers have not been precreated. No test order was added during verification.

## Verification

- 41 live checks: expected retained collections, ten module pages, and opening/cancelling the new-PO form; no business writes during verification and no browser runtime errors.
- Live SQLite integrity check passed; no foreign-key violations.
- Account rows, all 423 evidence bodies and prior audit rows match the full backup exactly.
- Archived workspace checksum matches the original state.
- Genuine master rows and configuration compare exactly with pre-reset values.

This completes the requested data cleanup. It does not resolve the separate audit/backup automation findings or publish the local module-dropdown UI candidate.
