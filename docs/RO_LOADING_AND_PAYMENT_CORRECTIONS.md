# Combined RO loading and void-payment corrections

Status: release candidate, 2026-09-26. Publication requires the verified recovery ZIP and live checks; local tests alone are not publication.

## What changes

- Supplier master > Payment terms: the existing master gains percentage, fixed-currency and remaining-balance milestones (DEC-092). Existing POs keep their agreement until a controlled revision; no automatic conversion.
- Shipping & freight control > RO loading & pending items: filter by supplier, PO or item/PI text. Ordered, reserved, available to allocate and pending departure are separate quantities.
- Create combined RO: enter an RO, dates, route and quantities from approved-PI orders whose bulk production has started. Select only the required item lines. Different suppliers and PIs can share the RO while each original order retains its shipment, financial allocations and evidence. An existing ungrouped, undeparted shipment with no recorded forwarder reference can also be included.
- Container booking uses the same RO and forwarding agent across the explicitly linked members. Weekly tracking updates every active member of that group. An accidental duplicate reference across unlinked shipments still rejects the import.
- Payments & settlement > Replace voided entry: prefill the old reference, bank values and allocations; require a replacement reason and newly selected evidence. Manager/configured correction permission is enforced on the server. The old VOID entry remains; the new entry links back to it. Active duplicate references and replacements above the current milestone balance are rejected.

## Calculations and safeguards

MODULE-SPECIFIC RULE — LAE Import. For each original PO line:

- Reserved = sum of quantities on non-cancelled shipment allocations.
- Available to allocate = ordered quantity minus reserved quantity.
- Departed = sum of quantities on allocations with actual departure.
- Pending departure = ordered quantity minus departed quantity, including reserved but undeparted items.
- Units are the existing whole PO units; no rounding or currency conversion is involved.
- Example: 100 ordered, 40 reserved and 25 departed means 60 available to allocate and 75 pending departure. Cancelling an undeparted allocation releases its reserved quantity; it does not claim cargo departed or reverse payments.
- Negative, fractional, duplicate or excessive selected quantities reject the entire command. Orders require edit access, approved PI and existing shipment-planning readiness. Every member is committed atomically under the normal workspace concurrency check.

One RO identifies the physical consolidation, not a combined commercial invoice or remittance. Each member retains its QC, dispatch, commercial invoice, packing list, final BL, insurance, arrival and costing requirements. Departure/arrival are recorded per member after its own checks. Freight entered on a member is that member's allocated cost; do not repeat the full consolidated freight on every member. This change does not implement automatic freight cost allocation.

RO creation may combine different origins but requires one destination and at most one already assigned forwarder. Existing RO/forwarder references are never silently overwritten. Recorded RO references are not reused, including cancelled history. Additional allocations to an already created RO are not implemented in this release: select the intended members together. To replan an undeparted member, use existing reasoned cancellation and a new RO; payment allocations must first be reconciled where required.

## PO-26 finding

Read-only live inspection on 2026-09-26 found the initial 10% advance already covered by an acknowledged payment. The voided record is excluded from totals correctly. The separate reuse-of-bank-reference restriction and absence of a correction link were genuine usability gaps. This release does not void or alter the acknowledged payment, create a replacement, or change the PO's terms. The next payment must use its appropriate unpaid, authorized milestone.

## Verification

- Full native suite before final input/filter refinement: 314 passed, zero failed.
- Seven focused native tests passed after refinement: partial cross-supplier allocation, atomic failures, duplicate RO, cancellation balances, explicit-group tracking, common-agent booking and safe void replacement.
- Synthetic server and standalone browser runs passed partial allocation/save, cross-supplier grouping, filtered-input preservation, reason/evidence replacement and mobile control visibility with no JavaScript errors.
- Review build generated successfully. Private test records, screenshots, captured live data and credentials remain under ignored test-output storage.
- No live business data has been modified during development. Release evidence will be appended only after deployment succeeds.

### Final verification / release gate
Final full suite on the release candidate: **314 passed, 0 failed** (59.45 seconds). Native-server and standalone browser tests passed again after the filters were finalized; supplier and PO dropdown filtering, partial quantities, persisted RO grouping, corrected-evidence replacement and mobile rendering verified with no JavaScript errors. Desktop/mobile screenshots were inspected. Build and whitespace checks passed.

Publication is blocked by deployment authentication: Coolify dashboard is signed out and the existing SSH agent has no usable server key. No fresh recovery ZIP could be created, so no push or deployment was attempted. User has been asked to sign in or identify the privately configured credential. This is an access blocker, not a request for broader privileges.

The interactive copied-data trial contains subsequent local user edits. A comparison against the original capture therefore no longer asserts the entire trial unchanged; those edits were retained. The original captured file remains separate. Synthetic browser/native tests use independent databases, and no live payment or order was changed by this work.
