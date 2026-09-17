# LAE Import process exemptions — confirmed pre-QC boundary

2026-09-17 · DEC-058/059, WF-052/053 · tested local build; not published.

The user confirmed Purchase Manager/Admin authority and then clarified that bypasses are permitted only before pre-production/sample QC. QC itself and every later stage are mandatory. DEC-059 supersedes the broader trial catalogue in DEC-058.

## Using it
1. Open a PO's Processes & exemptions tab, or click any of the 25 timeline stages.
2. Read its explanation and actual status, and open the related records or normal update form.
3. Before sample QC, Manager/Admin can approve an eligible exemption with a reason, selected permitted actions, responsible user, follow-up date and confirmation.
4. Continue only those selected actions. All their other prerequisites remain enforced.
5. The skipped work stays Pending — exemption approved, with a clickable persistent banner and overdue flag in Minimal.
6. Complete the actual supplier reply, technical confirmation or artwork workflow. Fulfilment closes the exemption automatically and preserves its reference/history.
7. Finish all early deferred work before approving sample QC. Rejection can still record an honest adverse QC result, but it closes the exemption window too. A corrected/resubmitted sample does not reopen bypass access.
8. Manager/Admin can revoke future permission with a reason; previously recorded transactions stay in history. Revocation does not hide unfinished work. To change an early permission, revoke and approve a new record while the pre-QC window remains open.

## Allowed catalogue
| Pending early process | Actions that may be expressly permitted |
| --- | --- |
| Supplier PO acknowledgement | Record PI, confirm specifications, authorize/record payment |
| Technical specification confirmation | Submit/confirm artwork, authorize/record payment |
| Artwork approval and supplier confirmation | Authorize/record payment |

A PI-recording permission defers supplier acknowledgement only. It never waives PI verification or PI approval. A payment-only artwork exception never permits production, dispatch or sample QC approval. Sample completion can be recorded honestly before QC review; the actual QC decision remains a separate mandatory step.

## Mandatory cutoff and safeguards
- No exemptions for sample approval, bulk QC, production completion, container release, shipping documents, final BL, insurance, actual arrival or final costing. No production/dispatch/arrival action may be placed in an early grant.
- The first sample QC approval or rejection stamps processExemptionCutoffAt. New grants and existing bypass use are blocked thereafter, including after corrected-sample resubmission or a later PO revision. Legacy orders with existing QC decisions or later actual production/shipping events are also closed to exemptions.
- QC approval checks the actual early acknowledgement, specification and artwork confirmations. It cannot use exemptions to cross the boundary. QC rejection remains available for recording actual findings.
- No bypass of PO issue, PI verification/approval, user roles/scopes, duplicate references, payment evidence, exact amounts/allocations/FX, document identity, actual dates or quantities.
- No simulated bank transfer or fabricated artwork approval, sample/QC pass, production date, insurance, BL, departure, arrival or costing actual.
- A production lead-time baseline can start from an applicable actual payment under an early commercial exception. This is not permission to start bulk production.
- New PO revisions supersede old grants; they do not remove an already reached QC cutoff. Follow-up dates create overdue flags, not automatic expiry.
- Active, revoked or boundary-closed records retain pending follow-up until the actual early work is completed; one latest record per stage is shown. Grant/revoke/use/fulfilment/supersession/boundary closure retain append-only audit. New records use FH-EXM-N permanent references.
- All stages remain clickable for viewing, even when bypass is forbidden. Read-only users can inspect concepts/status but cannot approve or change records.

## Implementation
Shared enforcement: shared/process-exemptions.mjs and shared/domain.mjs. Additive metadata: order.processExemptions and first-QC cutoff timestamp. Existing actual stage fields remain authoritative. The command API uses current server identity, scope, optimistic revision, transaction and request-retry protections. No live records are seeded or advanced for testing.

## Verification
Final test results are recorded in the completion note below. Synthetic server/review fixtures exercise payment while artwork remains pending, actual later completion, mandatory sample QC, permanent cutoff after rejection, forbidden post-QC grants and retained financial checks. Local preview is isolated from the live database.

### Completion verification — 2026-09-17
- Native suite: 214 tests passed, zero failures (includes 9 targeted exemption tests).
- Server and standalone browser checks: 27 passed, zero runtime errors. Actual payment with pending artwork, later completion, mandatory sample QC and the permanent cutoff were verified.
- Three normal Purchase Manager workflows: PASS, 68 checks, including shipment completion and payment settlement. Synthetic isolated records only.
- Standalone review build completed; local preview verified with pending follow-up and no sample QC bypass button. Whitespace validation passed.
- Release status: local feature/process-exemptions candidate only; not pushed or deployed. Live orders were not changed by these tests.
