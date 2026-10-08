# Production workflow audit - 7 October 2026

Status: fixes published and independently verified live on 7 October 2026. Temporary demos are complete; physical mobile-device QA remains outstanding as described below.

The audit covers Production & Stock only. Staff BOM/syntax edits and pending corrections are protected. No live production demo, BOM edit, stock posting, account grant or reset is part of this audit. Browser demos use a separate synthetic SQLite database; its write wrapper rejects every non-production mutation.

## Findings and fixes

| ID | Finding | Result |
|---|---|---|
| PROD-A01 | Model/machine count could change while old preview quantities remained active. | Preview is tied to its model and count; stale consumption is disabled and saving requires a fresh preview. |
| PROD-A02 | Repeating Preview silently discarded entered consumption. | Same-selection refresh retains the batch quantities; a different model/count calculates fresh requirements. |
| PROD-A03 | Partial completion retained every remaining suggested serial. | Suggested serials follow machines completed now. Manually edited serials are retained. |
| PROD-A04 | A partial batch could show full draft overrides instead of cumulative issued consumption; subsequent completion showed the wrong material basis. | Batch detail displays the exact issued snapshot; stage review shows the full locked basis. |
| PROD-A05 | An older serial could be absent from the first 100 substring matches and fail to open. | Exact indexed serial lookup, with authenticated cost-free projection and a not-found recovery screen. |
| PROD-A06 | Redispatch/reversal could be dated before a serial return. | Server rejects dates before the latest serial movement; form minimum dates match. |
| PROD-A07 | Download stock ignored name/type filters. | The server export uses the displayed filter scope. |
| PROD-A08 | A refreshed revision after a lost save response could replace the retry identity and duplicate a posting. | Same action retains its original receipt and revisions until confirmed. A changed action cannot silently replace an uncertain save. Definite validation/conflict responses allow correction. |
| PROD-A09 | Valid shortages/quantity/date errors were reported as generic server failures; inherited styling hid error text. | Known production validation returns actionable client errors. Nonempty errors are visible/focusable and retain entries. Unexpected storage faults remain generic server errors. |
| PROD-A10 | Recovery links were absent on stage/stock/dispatch forms; planned/completed numbers ran together. | Refresh keeps entries, draft review provides a next step, table sublabels occupy separate lines. |

## Temporary demos and regression evidence

1. Direct production: three machines completed as 1 + 2, with exactly 12 bolts, 3.375 litres and three fabrication sets consumed once; three distinct serials.
2. Issue-first production: full three-machine issue followed by partial completion; stock stayed at the issued balance. Native tests also finish the remaining two and verify no second deduction, including legacy issued batches.
3. Dispatch, return and manager reversal: a completed serial was dispatched and returned; reversal restored the exact issued 12 bolts/3.375 litres/three sets and permanently voided the serial.
4. Shortage and recovery: a 50-machine posting failed transactionally with the specific missing item shown and focused. Refresh retained the reason/count. Correcting completion to one machine succeeded with proportional consumption.
5. Model/count preview: an actual override survived same-selection preview; count change blocked saving; refreshing recalculated 12 bolts and changing model recalculated 18. No master BOM was edited.
6. Stock receipt and count: receipt added five pieces once; manager physical count recorded a minus-two movement. The register and ledger retained references/reasons.
7. Native failure cases: unknown PPM, fractional pieces, future/invalid dates, limits, duplicate/void serial reuse, stale BOM/unit definitions, malformed material input, insufficient stock and stale revisions roll back atomically.
8. Native access/retry/report cases: unauthorized/readonly roles, accidental commercial scopes, CSRF, private cost exclusion, manager-only actions, durable receipt replay, filtered CSVs, 205-row cursor paging and earliest-month MRP/reversal.
9. Lost-response simulation: a stock receipt committed before the connection failed; refreshed balances and retry kept the original receipt and changed stock once.

Current verification: 19 production/retry native tests passed; full 397-test regression suite passed; standalone review build passed. Desktop browser demos and visible error focus passed. The browser viewport override did not change the measured 1280px viewport; a true 390px mobile result is not claimed. Mobile-only controls have a 44px rule and existing responsive table regions remain; physical mobile-device verification is an outstanding QA limitation.

Relevant UI rules: UI-01/02/03/04/06/08/12 and HIG R100/R102/R105/R114. Existing branding, navigation, unsaved guard and server authority retained. No new motion or print layout.

## Preservation, scale and remaining boundaries

The native fixtures assert protected financial/BOM/main state equality across production postings. Production inventory saves remain allowlisted, transactional and append-only. No BOM management route/approval code was changed. Existing roles and grants remain unchanged. Read-only live preservation is checked around deployment; legitimate concurrent staff changes must be retained rather than reverted.

Exact serial detail uses the existing primary-key index, independent of catalogue size. History stays bounded to 100 rows and batches to 1,000 machines. At current/10x catalogues, existing projections/filter scans remain linear; 100x inventory writes still clone the shared aggregate and need measured capacity work. This audit does not certify 100x load, offline autosave, accounting integration or scheduled backups.

Defective-material/scrap disposition remains a separate unconfirmed business policy. Pending BOM quantities stay pending and require explicit batch consumption. No rates or substitute BOM values are invented.

Private evidence: ignored test-output/production-audit-20261007 (test logs, recovery receipts, screenshots and isolated helper). Fresh running-source recovery ZIP passed server/member SHA, CRC, SQLite integrity/FKs and running/candidate/extracted all-table restore checks; canonical copy retained with all prior archives.

## Publication verification

Live runtime and remote main: `52dc76e63dbdfeabfb2a8f5b2e3680e55347f4eb`. Hosted quality run `37662630422` succeeded. Coolify deployment `cvubt4ynw6figxtu7z4qfk3j` completed its rolling update at 17:56:52 UTC, with the first health check healthy. The public health response confirms the intended release; seven authenticated served assets match committed bytes exactly.

Main, Implements, technical BOM/review, production stock/register state and account identities match the immediate predeployment capture exactly. All 187 models were preserved; no reset events were added. No live demo transaction or BOM correction was posted. Read-only live dashboard and empty production-entry checks passed with no browser warnings/errors. Screenshot: `test-output/production-audit-20261007/live-production.png`; private receipts: `live-verified.json` and `final.json`.

Recovery archive `FH_Purchase_Recovery_2026-10-07T17-34-31-791646Z_8add5b717fa4.zip` is retained in canonical backups with all 13 archives. Its SHA-256 is `bdf9683c5e82f18aa9098a273f229bf955044b96f75784138587ac3eaa315420`. The final candidate and exact running source each restore all 20 tables without changing recorded data.
