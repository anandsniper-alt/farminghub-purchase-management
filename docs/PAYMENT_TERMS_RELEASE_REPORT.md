# Vendor payment terms release — 2026-09-26

## Included

- Supplier Payment Terms Master: create/edit, active/inactive status, validated milestones totalling 100%, reason and history.
- Vendor master fields follow Product supplier versus Logistics partner type.
- Logistics terms appear directly on Supplier master as ten presets, including 90/120 days from logistics invoice; blank is allowed, Custom entry is removed, recorded unlisted agreements are preserved.
- Inactive supplier defaults cannot silently replace an existing agreement or become a new default. New POs require an explicit active selection when their supplier default is inactive/unavailable. Existing PO snapshots/custom agreements are retained.

## Boundaries

These logistics values describe the agreement; they do not calculate logistics payment due dates or generate follow-ups. Mixed-order/supplier RO loading and the separate voided-payment replacement issue are not included. Existing financial calculations, actual payments, references, issued snapshots and permissions are preserved.

DEC-086–089 / WF-080–083 record the final decisions and superseded local designs. Supplier-template changes require a reason; existing vendor edits use their existing audit/Remarks contract.

## Verification and release

Release authorized by the user. Local focused native tests: 20 passed. Full suite, final browser checks, fresh downloaded recovery ZIP/isolated restore and live verification are in progress. No production publication is claimed by this candidate record.

Private raw evidence is stored in ignored test-output/terms-release/ and test-output/terms-release-*. Recovery ZIPs remain in the main checkout backups/releases/ with the five-backup retention policy.
