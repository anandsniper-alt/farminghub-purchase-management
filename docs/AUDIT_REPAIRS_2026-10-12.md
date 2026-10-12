# Workflow audit repairs — 2026-10-12

Local candidate based on `0e3e147b1f2fb06ebc56d920c08f66fc830b464a`. The user requested repair of the audit findings for up to ten simultaneous desktop/laptop users. These changes do not publish pending product modules. Implementation, local verification and production state are separate below.

## Repair coverage

| Finding | Candidate behavior | Verification owner |
|---|---|---|
| AUD-01 | Amendment approval rechecks current reservations, departed lines, payment terms and allocated payment obligations. A manager can return a blocked proposal with its full history retained. | Finance/domain regression and approval review |
| AUD-02 | Dispatch requires the current approved, matching PI under both legacy and value-based terms. PI replacement revokes prior authorization with history. | Finance/domain regression |
| AUD-03, AUD-06 | Counts, imports and deliveries respect stock chronology. Ambiguous count membership requires explicit manager reconciliation; the original stock history remains available. | Stock regression and independent counterexample review |
| AUD-04 | Private commercial seed modules are absent from the native public allowlist. The private standalone review build retains its separate seed provider. | Anonymous HTTP checks, module graph and standalone build/browser checks |
| AUD-05 | HTTP remains in use at the user's explicit direction. No transport encryption repair is claimed. | Accepted transport exception; hosting configuration unchanged |
| AUD-07 | Receipt movement business date and immutable recording timestamp are stored separately. | Stock regression |
| AUD-08 | Managers correct a PO acknowledgment through a linked append-only correction, including corrections of the latest correction and a reconciled-count path. Stale predecessors reject; original records and every correction stay intact. | Stock regression and correction-chain browser checks |
| AUD-09 | Repeated item/reference/quantity receipt is blocked by default; a distinct legitimate delivery needs a recorded override reason. | Stock regression |
| AUD-10 | Copied BOM stickers follow the final target series; incompatible stickers block approval. | BOM/stock regression |
| AUD-11 | Authorized residual settlement covers an acknowledged supplier shortfall with a reason, order/milestone caps, and pending-payment protection. No original payment is rewritten. | Finance/domain regression |
| AUD-12 | Approval review displays current and proposed artwork requirements and linked proposed technical evidence. | Approval review regression |
| AUD-13 | Ambiguous unformatted percentage values require explicit units. Excel percent formatting is interpreted conservatively. | Import and XLSX regression |
| AUD-14, AUD-15 | Supplier change protects entered lines/rates; untouched production lead time follows the selected product reference and reveals required override fields. | Focused UI regression |
| AUD-16, AUD-17 | Production completion displays the actual deduction for the selected completion quantity. Physical-count and delivery screens distinguish replacement from addition and preview the resulting balance. | Production regression and focused UI checks |
| AUD-18 | Wrong-account recovery is rejected before creating a session or replacing the cookie; the form remains with its original user. | HTTP and browser recovery regression |
| AUD-19, AUD-20 | Purchase saves have bounded waiting and receipt recovery. User creation uses actor-bound idempotency and recovers the original committed account after a lost response. | HTTP and browser recovery regression |
| AUD-21 | Bounded read caching and current-profile projection reduce repeated reads. Full aggregate persistence and synchronous work remain scale limitations; see measured capacity evidence below. | Separate-process synthetic ten-session benchmark |
| AUD-22 | Admin-only reasoned test classification excludes only explicitly marked orders from business totals. Mixed remittances retain original evidence and separate business/test portions. Serial numbers, shipments and payment history remain intact. | Domain and financial UI regression; live sample classification pending |
| AUD-23, AUD-24 | Dynamic form IDs are unique. Monthly plan drafts show draft wording and a clear submission action. | Focused UI regression |
| AUD-25 | Future-dated Implements POs are rejected at creation. | Stock regression |
| AUD-26 | Workspace text explains local records and absent automatic external updates in plain language. | UI review |
| POL-01 | As confirmed by the user, against-BL payment authorization and recording require the shipment's final BL number/date. The payment date cannot precede the BL date. | Finance/domain regression |

## Preservation and design

The implementation reuses native forms, shared dialogs, warning notes, tables and existing role controls. Farming Hub Minimal, approved logo, green/lime tokens and font stack are preserved. Relevant rules: UI-01–UI-05, UI-08, UI-12; Apple HIG web adaptations for labels, focus, recoverable edits and feedback. No new theme or visual identity is introduced.

Financial records remain immutable through explicit corrective events. Deleted legitimate orders remain eligible for financial reporting; operational views continue to exclude deleted records. Test classification is distinct from deletion, is read-only afterward, and never reuses a PO number. No production record is classified merely by matching a name or number during startup.

Private seeds, local instructions, credentials, databases and raw test evidence must not be published with the candidate. The tracked standalone review artifact contains commercial review data and must not be added to the native public static allowlist.

## Verification and capacity

The native suite passed **544 tests, zero failures and zero skips**, including authorization, stale writes, payment calculations, BL prerequisites, explicit test classification, stock chronology and sequential receipt corrections. Independent counterexample review checked correction deltas, immutable prefixes, stale rollback, counts between corrections and per-item count evidence.

Browser verification covers three complete import purchase/payment/shipping workflows (58 assertions), Domestic BOM (118), Domestic PO (78), VMS (26), HIG route/layout checks in server and standalone modes (126), payment/test-data reporting (12), interrupted-session/save recovery (8), and standalone purchase form protection (5). Human-flow tests add 24 passing assertions covering supplier changes, untouched lead time, partial production deductions, count-versus-delivery choices, and interrupted uploads. A separate final correction-chain browser run passed 18 assertions: 6 → 5 → 4 → 5 quantities, latest-entry selection, original-versus-last-saved values, and subsequent count-reconciled corrections without another stock adjustment. Its desktop dialog screenshot was visually reviewed against the existing design. These are assertions within finite scenarios, not a claim to have tested every possible real-world action. Browser runs used isolated test databases and synthetic transactions.

The final chain harness needed fixture repairs: one authenticated event per save and a tab reload after an out-of-band fixture count. The stale revision was correctly rejected before the reload; no production validation was relaxed to pass the test. Final chain evidence is `test-output/ui-repairs/server-chain-only.log` and `chain-second-correction.png` in the repair worktree. Syntax and CRLF-aware diff checks pass.

Both standalone review variants are rebuilt from the candidate. Commercial seeds remain private to the review artifact; the native HTTP server rejects direct requests for the private seed modules. Production access, business records and hosting settings were not changed by these tests.

Final capacity measurements used separate HTTP client/server processes, ten authenticated sessions and isolated synthetic SQLite databases. Each fixture also contained 700 models, 3,000 parts and 21,000 BOM lines. Mixed traffic used approximately 4% writes, 450 ms user think time, and a 30-second / 450-request bound; the smaller fixture reached its request cap in 27.5 seconds.

| Orders | Workload | Requests | 95th percentile | Peak server memory | Errors / conflicts / timeouts |
|---|---|---:|---:|---:|---|
| 1,000 | Three ten-user read waves | 30 | 679 ms | 345.2 MiB | 0 / 0 / 0 |
| 1,000 | Mixed reads/writes | 450 | 356 ms | 497.5 MiB | 0 / 0 / 0 |
| 5,000 | Three ten-user read waves | 30 | 1,872 ms | 839.1 MiB | 0 / 0 / 0 |
| 5,000 | Mixed reads/writes | 185 | 2,379 ms | 1,100.2 MiB | 0 / 0 / 0 |

Both database integrity checks passed; order counts remained exact, and all 18/8 successful writes respectively persisted exactly once. No scenario was skipped or stopped by a safety threshold. Evidence run: `repair-load/target10-run-2026-10-12T16-48-57.631Z` in the private local audit evidence directory. Native-suite evidence: `repair-native-accepted.log`.

AUD-21 is **mitigated, not closed**: the 5,000-order run still needs roughly 1.1 GB of server memory and multi-second tail latency. Synthetic capacity results do not certify hosting headroom, WAN latency or every real-world workload. Long-duration operation, maximum concurrent uploads, replica failover and live integrations remain outside this candidate's verified scope.

An in-memory rehearsal against the previously captured sample PO verified that classification preserves original shipments, payment detail, deleted status and the existing numbering counter. The input snapshot remained unchanged. Detailed business values and verification evidence remain private locally. This is a rehearsal, not a live classification or a current live balance check.

## Production boundary

No deployment or live business mutation is included in this repair candidate. Applying the approved sample classification to FH-LAE-I-PO-37 still requires an audited live command after the candidate is released. The current production release continues to behave as before until publication. Follow the existing fresh-backup, source-match and isolated-restore release safeguards.
