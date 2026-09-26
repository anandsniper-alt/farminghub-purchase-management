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


## Published and verified — 2026-09-26, DEC-086–089 / WF-080–083

Runtime **602af7d1d5db6488220fc11ef0f6e33aa71e686b** is live at https://purchase.dvjassociates.com, Coolify deployment **uxgduymps8acx4myppbte1o9** finished and HTTPS healthy. This supersedes the local-only publication status of the final payment-terms/vendor changes; superseded intermediate designs remain historical. Supplier Payment Terms Master, type-specific vendor fields, direct ten-choice Logistics payment terms including 90/120 days, no Custom entry, recorded-value preservation and inactive-template safeguards are published.

**298 native tests passed**. Fresh synthetic native-server and standalone-review browser runs verified logistics 90/120-day save/reopen and supplier template creation/revision/deactivation, default assignment, explicit new-PO selection and unchanged historical PO snapshots. Review build passed. [Hosted native tests and build](https://github.com/anandsniper-alt/farminghub-purchase-management/actions/runs/36240951283) passed. **27 read-only live browser checks passed**, with no business-write requests or JavaScript errors. All **90 runtime files** match the commit; existing persistent volume retained.

Fresh consistent **1584-revision, 525,332,480-byte** snapshot was downloaded and checksum verified before pushing. Recovery ZIP **FH_Purchase_Recovery_2026-09-26T12-03-11-218Z_88a630393f63.zip** is **481,314,303 bytes**, SHA-256 `f15dfcecc91c0f3d988f10c2cf2233e29617b91fc2b067ef6e70ee1341948300`. Archive/member checks and isolated candidate startup passed with zero business changes. **Five verified managed ZIPs retained**, one older managed ZIP pruned only after verification. Archives and private evidence remain ignored in main-checkout backups/releases/ and test-output/terms-release/.

Final live revision remains **1584**. Entire workspace, all 3 accounts, 606 uploaded evidence bodies, 1,703 audit rows, one archive and 611 retry receipts match the pre-release snapshot exactly. No test records were created in production. Logistics terms are descriptive only: automatic due dates/follow-ups, combined cross-order/supplier RO loading and the separate voided-payment replacement issue remain outside this release.
