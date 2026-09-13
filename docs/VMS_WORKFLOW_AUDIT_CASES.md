# VMS working-model audit execution ledger

2026-09-13 · baseline aed1a0a · isolated fixtures, no live writes.

7 PASS / 4 POLICY GAP / 9 FAIL / 3 GAP. GAP means missing capability/UX; POLICY GAP means current enforced behavior needs a product decision. These are product outcomes, not test-harness assertion counts.

| Scenario | Area | Outcome | Observation |
|---|---|---|---|
| WM-01 | Visits | PASS | Manager can record a dated visit with notes and follow-up. |
| WM-02 | Permissions | PASS | Executive can append a visit without Admin. |
| WM-03 | Permissions | PASS | Viewer rejected: Purchase access required. |
| WM-04 | Visits | POLICY GAP | A historical visit with no next action is blocked: Enter a valid next follow-up date. |
| WM-05 | Dates | FAIL | At 01:30 IST, the current Indian visit date is rejected against UTC: Interaction date cannot be in the future. |
| WM-06 | Follow-ups | POLICY GAP | Old overdue action remains open in storage; vendor queue contains only the newer Completed interaction. |
| WM-07 | Shared vendor/location | FAIL | Vendor master city Shanghai becomes Ningbo after a CRM notes-only save with old district ID. |
| WM-08 | Catalogues | POLICY GAP | A new profile assignment to an inactive product catalogue entry is accepted. |
| WM-09 | Visit discovery | GAP | Vendors list has no Add visit/Record visit action; entry is inside a supplier under Add interaction. |
| WM-10 | Visit form | GAP | Form fields: type, title, occurredAt, nextFollowUpAt, notes, vmsFiles. No visited contact, place, purpose or outcome fields. |
| WM-11 | Visit defaults | POLICY GAP | Default type NOTE; next follow-up 2026-09-13; required true. |
| WM-12 | Visit history | FAIL | First displayed row after backfilling: 10 Sept 2026 VISIT · Demo Purchase Manager Backfilled older visit Synthetic audit visit 15 Sept 2026 Open Update. Source original sorted by occurredAt; native reverses insertion order. |
| WM-13 | Completion history | FAIL | Completion remarks are stored but absent from profile history and generic change-summary table. |
| WM-14 | History correction | GAP | Visit row exposes Update follow-up, but no correction of visit date/notes/type, visit-specific filter, or history export. |
| WM-15 | Multiple offline visits | FAIL | This vendor already has a pending edit. Review it in Pending Sync first. |
| WM-16 | Unsaved settings | FAIL | An idle 30-second sync refresh resets an unsaved page-guide checkbox. |
| WM-17 | Evidence atomicity | FAIL | Rejected visit saved 1 file metadata record(s), 0 visits; cancel leaves evidence unlinked. |
| WM-18 | Evidence save recovery | FAIL | Attached visit exists on server: true; form displays: Failed to fetch |
| WM-19 | Evidence retry recovery | FAIL | Retry after lost acknowledgement: HTTP 409 {"error":"Another user changed this workspace. Reload before saving; nothing was overwritten."} |
| WM-20 | File limit | PASS | over-limit.txt: maximum file size is 50 MB. |
| WM-21 | Mobile visit form | PASS | Visit dialog fits 390px viewport. |
| WM-23 | File limit | PASS | 50 MiB boundary result: saved and linked |
| WM-22 | Financial isolation | PASS | POs and payments unchanged by audit visit workflows. |

The first large-file attempt encountered the deliberately stale recovery-test session and is not a valid file-limit result. WM-23 above used a fresh bootstrap. The completed run is authoritative. Browser runtime errors: 0. See [the consolidated report](VMS_WORKFLOW_AUDIT.md) for priorities, proposed workflow and repair acceptance.
