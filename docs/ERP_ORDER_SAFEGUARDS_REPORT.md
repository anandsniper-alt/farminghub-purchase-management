# ERP references, order guidance and scale review

Date: 2026-09-13. Local candidate: `feature/erp-order-safeguards`, based on DEC-053/054 reference foundation. Decision DEC-055; workflow WF-049. No live database access, live writes, Tally posting or deployment occurred.

**Release assessment: safeguards improved; not certified for the requested business scale.** ₹300 crore is an annual value, not a traffic specification. Pending user sizing input, the provisional benchmark uses 10,000 POs/year and 20 simultaneous requests. English guidance is provisional pending the language answer. Neither assumption is a binding business decision.

## Confirmed issues and repairs

| ID | Finding | Result |
|---|---|---|
| ERP-001 | Different formatting could disguise a duplicate manual PO number; earlier renamed numbers were not all reserved | Reused the existing audit-trial normalization/history guards. PO numbers are global across retained orders, including deleted orders and issued snapshots. Renames append numberHistory. NFKC, whitespace/zero-width removal and uppercase comparison prevent visually disguised duplicates; meaningful punctuation remains distinct. |
| ERP-002 | PI and commercial invoice numbers lacked current-candidate uniqueness enforcement | User explicitly confirmed supplier-specific uniqueness. PI history remains reserved against other orders of that supplier. Invoice uniqueness is per supplier across different orders/shipments; multiple evidence files within the same order/shipment may share its invoice number. PI and commercial invoices use separate namespaces. |
| ERP-003 | Commercial invoices could be uploaded as anonymous evidence | Number and valid date required on new invoice attachments; fields shown/required only for that document type. Pre-vessel readiness needs named invoice evidence; dispatch checks named final invoices for conflicts. Existing files and history are not silently rewritten. |
| ERP-004 | Numeric aliases could evade uniqueness in the permanent registry, and malformed registry arrays could lose properties during JSON storage | Strict object/UUID/ID validation and numeric sequence uniqueness per type, across padded/unpadded and generic/LAE-I formats. Existing assignments and high-water marks remain immutable. Corrupt input fails before persistence. |
| ERP-005 | Current/historical PIs and order evidence wrappers were missing from the reference register | Added PI and ATT software references with parent order identity. Current and historical PIs share an existing identity when their internal ID is the same. Files retain DOC identities. There are now 17 supported record types. |
| ERP-006 | Stored external mappings were not fully validated on reload; export repeatedly scanned all links | Validate targets, systems, fields and duplicate mappings. Index external links once for export and use a set for immutable-link preservation. No new ERP posting or reassignment permission. |
| ERP-007 | A committed save with a lost response had no general durable command receipt in this candidate | Ported the audit-trial receipt pattern: actor/request key, content digest, access signature and original result in the same SQLite transaction. Same-key retries return the original result, including after restart. Changed content/access is rejected. Browser stores only pending request ID/digest in tab storage and resolves changed uncertain attempts before a new save. |
| ERP-008 | A lost upload response could create another file on retry | Atomic upload receipts reuse the same retained evidence ID/body. Browser uses a digest of filename, order links and content; same-account identical uploads reuse evidence. Changed content cannot reuse a request key. Archived/missing earlier evidence requires recovery. Review-mode uploads immediately receive references. |
| ERP-009 | Next-action selection could send an Executive past a pending PO approval toward PI entry | Central read-only orderProgress advisor checks current stage and role before selecting a primary action. Blocked steps name allowed roles. Domain commands still enforce every permission and prerequisite. |
| ERP-010 | Generic mascot text did not explain practical checks, and arrival could be mistaken for settlement | Always-visible 12-group next-step card, short checklist and Guide this step control in Minimal. Mascot explains the actual checklist; form help explains currency direction, supplier quote, bank reference and actual receipt. Final guidance reviews receipt/balance separately from arrival. No guide auto-submits or checks an approval box. |
| ERP-011 | Permanent PO references were not searchable in the pipeline or printed with the PO | Added to pipeline search and print metadata. Existing business numbers and immutable issued snapshots remain unchanged. |
| ERP-012 | Initial-payment shortcut did not enforce INR-to-INR rate 1 | Reused the remittance guard for initial payments. No financial formula or limit changed. Bank references also reject empty/invisible-only, control-character and overlong values; normalized duplicate matching includes voided records. |

The previous broad audit trial was not merged wholesale. Unrelated security, offline draft recovery, VMS audit and deployment findings remain governed by their existing reports. Stronger legacy reference guards can expose old ambiguous records; resolve those deliberately rather than renumbering or bypassing a gate. The one-time archived pre-launch demo dataset is outside active history, as established by DEC-051/052.

## Working model for staff

1. Complete supplier, items, invoice/list currencies, agreed quote rate/date, quantities, totals, terms and dates.
2. Submit and obtain PO approval; retain the issued revision.
3. Attach supplier acknowledgement of that revision.
4. Record, verify and approve the PI against the PO.
5. Confirm specifications and approved artwork with the supplier.
6. Record an actual bank advance if the agreed terms require one.
7. Record and approve the pre-production sample; correct a rejected sample.
8. Record production start, bulk QC and production completion.
9. Plan remaining quantities and book/release the container.
10. Record inland movement, invoice/packing list, required shipment payment and vessel loading.
11. Verify final BL, insurance and actual Indian-port arrival for each shipment.
12. Record actual supplier receipts and resolve the original-order balance.

These are guidance groups, not a replacement for the full stage timeline. Shipment branches, existing permitted parallel work, revisions, role controls and operational exceptions remain. Pending permissions are explained; they are never bypassed. Staff comprehension, translation and operational sign-off still require representative user testing.

## Capacity evidence and limitations

All benchmark datasets total exactly **300,000,000,000 paise = ₹300 crore**. The numeric test also verifies exact conversion and rejects negative values/excess decimals. Current per-record caps were not increased. This is arithmetic evidence, not a proof of accounting or tax compliance.

Synthetic local benchmark, one line per draft PO, no accumulated transaction history or file bodies:

| Orders | Workspace response | Store read | Projection/serialization | Simple write |
|---|---:|---:|---:|---:|
| 100 | 0.65 MB | 5 ms | 12 ms | 35 ms |
| 1,000 | 4.83 MB | 35 ms | 93 ms | 262 ms |
| 10,000 | 46.75 MB | 466 ms | 819 ms | 2,452 ms |

The 10,000-PO export was 64.59 MB, taking 906 ms to generate. Twenty HTTP writes sharing one initial workspace revision produced one successful commit and 19 expected 409 conflicts, with no overwrite, in 18,946 ms. This verifies the conflict guard, **not acceptable multi-user throughput**. Browser transfer/render time, longer orders, attachments, accumulated audit, network latency, multi-year retention and production hardware are additional costs. Timings are observations on this workstation, not an SLA.

The primary bottleneck is application architecture: the whole workspace is parsed, cloned, validated, serialized and returned for many operations. SQLite itself supports server applications but has one writer at a time; its [appropriate-use guidance](https://sqlite.org/whentouse.html) distinguishes low write concurrency from applications needing many simultaneous writers. Do not replace a measured application bottleneck with an unsupported claim that changing the database engine alone fixes it.

A consistent backup of the 10,000-order fixture was restored independently: integrity check OK, all orders and permanent references preserved. This is a local drill, not configured production off-site recovery.

## Required scale work before acceptance

**ERP-013 HIGH, open:** replace whole-workspace loading/writes with indexed entity storage and paginated APIs. Keep permanent identity, append-only audit, issued snapshots and existing calculations. Suggested staged design: SQL records/reference reservations plus transactional counters; per-order revisions and controlled multi-order payment transactions; scoped lists/search and on-demand detail/history; narrow session lookup; bounded exports. Validate migration on a restored copy, compare results with current domain behavior, and rehearse rollback before cutover. Choice of normalized SQLite versus a server database depends on actual concurrency, hosting and growth requirements. This material architecture change is proposed, not implemented or silently approved.

**ERP-014 HIGH, open:** full production recovery/monitoring. Off-site backup was deferred by the user to 2026-09-20; destination and alert owner remain unspecified. Test backup failures, restore time, integrity and newer-write reconciliation. Local backup presence alone is not recovery readiness.

**ERP-015 HIGH, open:** realistic acceptance testing with actual annual PO count, peak simultaneous staff, typical lines/order, attachment volume, retention years and required response/recovery times. Re-run load/soak tests after storage changes. The current 10,000/20 scenario is only a provisional probe.

**ERP-016 MEDIUM, open:** staff UAT/language validation and complete dirty-form recovery. This branch retains current form values on a failed save and handles receipt-based retry, but does not include the broader audit trial's IndexedDB draft/file recovery. Closing a tab or clearing browser storage can still lose unsaved form data. Opaque ERP IDs/company names remain exact mappings until the ERP contract defines their normalization; external-link correction and reconciliation need a controlled workflow.

**ERP-017 HIGH, open before accounting sync:** ERP interface, Tally version/company, ledger/item/unit/tax mapping, field ownership, reliable outbound/inbound processing and reconciliation are still unspecified. JSON remains a Farming Hub snapshot; no actual ERP/Tally posting was tested or enabled.

No changes were published. Do not treat the passing safety tests or the generated review HTML as production-scale approval.

## Verification ledger

- Full native regression: 191 passed, zero failed, including 13 new safeguard cases.
- Browser reference/guide suite: 28 checks passed in authenticated server and standalone review, including a deliberately lost committed response, unchanged business collections, current-step mascot guidance and mobile layout. No runtime errors.
- Three configured Purchase Manager workflows: final results recorded below after the release rerun. Manager approval coverage is explicitly configured in the isolated fixture; production approval controls were not changed.
- Local capacity/backup probe: exact annual total, one safe commit plus 19 stale-revision rejections, independent restored-copy integrity and reference preservation passed. Throughput was assessed as inadequate for the provisional concurrency scenario.
- One earlier browser attempt timed out waiting for a stable receipt Save control. A repeat completed all three workflows. This was not labeled a repaired production defect; the final rerun is retained separately.
- Screenshots were visually reviewed at mobile width. Build and whitespace checks pass. All databases, screenshots, traces and exported business fixtures remain ignored under test-output.

Final Manager rerun: **3 workflows / 55 checks passed**. USD, RMB/multiple attachments and credit/partial-shipment cases all reached port arrival and SETTLED with zero remaining balance. Final server/review guide suite also passed after upload-retry and conditional invoice-field changes.
