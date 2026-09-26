# Engineering audit repairs — local candidate

Date: 2026-09-26. Branch: `codex/domestic-bom`, working tree on audited HEAD `1297840ecac1dbe26893f086d32fd776383dedfe`. **Not pushed or deployed. No production reads/writes or live backup operation in this pass.** DEC-082–084 / WF-076–078 apply. Prior audit and failed pressure observations remain in the handover registers.

## Implemented and locally tested

| Area | Result and limits |
|---|---|
| VMS open actions | Older open follow-ups remain visible after newer interactions and completions; due counts share the same rule |
| Visit entry/history | Direct Record visit; optional next action; India business date; occurrence-date sorting; readable completion outcome; existing ownership and audit retained |
| Offline visits | Multiple independent visits to the same supplier, separate IDs and exactly-once retry; replacement profiles keep conflict review |
| Unfinished forms | Empty/background outbox sync avoids rerendering dirty page controls |
| Location integrity | Master city/country changes invalidate stale hierarchy IDs; unchanged legacy-stale links reconcile during the next explicit audited profile save |
| Visit attachments | Reject invalid visit dates before upload; current attached-save retry verified after dropped response with one retained visit. General abandoned/orphan evidence lifecycle is still open |
| Domestic concurrency | Separate PO issues from one starting view succeed; same PO/BOM, related item/quote/vendor/access changes require review. Original/proposed and nested assembly dependencies checked; unknown/bulk commands remain conservative |
| Edit context | 43-character random handle instead of full encrypted hash catalogue. Actor/revision/expiry bound; process-local, 512 handle/32 MiB serialized catalogue budget; expired/evicted/restarted handles fail closed. Memory overhead beyond serialized content still exists |
| Session projection | Read the current matching profile from SQLite JSON; preserve immediate account/profile revocation. Does not normalize business storage |
| Build checks | Shared review-source manifest; imports/syntax/static-route contract tests; GitHub Actions native tests/review build workflow. Hosted CI has not run yet |
| Health/diagnostics | Readable workspace revision checked; 503 on unavailable storage; optional validated source SHA; request IDs and redacted slow/5xx logs. Not complete monitoring, disk/write readiness or alert configuration |

## Verification

- Full native suite: **285 passed, 0 failed, 0 skipped**, 114.381 seconds. Synthetic/local fixtures only. Final small location/diagnostic edits receive a separate focused retest.
- Browser regression: **24 checks passed** across authenticated native server (15) and standalone review (9), zero runtime errors. Includes three offline visits, dropped attached-save response, invalid date before upload, dirty settings, full open-action visibility and 390px mobile layout. Mobile screenshot visually inspected.
- Review build generated successfully; final candidate size **40,872,397 bytes**. No change to purchase money/date formulas or issued snapshots.
- Final focused regression: **20 passed, 0 failed** for VMS, build contract, current-session and readiness behavior; the final browser rerun repeats the 24 checks. Documentation links and `git diff --check` also verified.

Private evidence is ignored under `test-output/engineering-repairs-*` and `test-output/vms-repairs/`. Tests use synthetic suppliers/accounts, not Ashok/Suresh or live orders. The browser report is verification evidence, not dummy data seeded into production.

## Not completed / decisions needed

1. **Whole-state scale architecture:** still one JSON workspace with full command responses and synchronous work. Indexed aggregate storage, paginated loading and a safe restored-copy migration need the pending architecture choice. No schema migration performed.
2. **Automatic encrypted off-site backups:** destination/provider, private credential configuration, key custody, schedule/retention and alert owner are not set. Access requirements are in BACKUP_RESTORE_RUNBOOK.md. Existing mandatory five verified pre-release recovery ZIPs remain unchanged.
3. **Operational acceptance:** real workload/headroom/RPO/RTO, external alerts, sustained/load/failure drills, trusted-proxy login controls, upload streaming/content scanning, job queues and retention policies remain open. This pass does not certify INR 300 crore business capacity.
4. **Additional VMS capability:** structured person/place/outcome fields, reasoned visit corrections, dedicated retrieval/export/pagination, inactive catalogue assignment policy and full evidence lifecycle remain to be specified/implemented. No silent deletion, privilege relaxation or legacy migration.
5. **Live release:** not requested for this repair turn. Before a later authorized release, download/verify a fresh consistent production recovery ZIP and isolated restore, retain newest five, then deploy and verify exact running code/read-only preservation.

## Capacity retest and limits

Same synthetic harness: 100 / 1,000 / 10,000 fresh one-line orders, total INR 300 crore, no accumulated history/evidence. This is not a representative production workload or SLA.

| Orders | Scoped JSON bytes | Read ms | Projection ms | Simple write ms |
|---|---:|---:|---:|---:|
| 100 | 657,709 | 3 | 9 | 29 |
| 1,000 | 4,930,817 | 25 | 74 | 190 |
| 10,000 | 47,733,825 | 990 | 1,558 | 4,994 |

Twenty distinct-order HTTP writes using the same initial view: **20/20 HTTP 200, exactly 20 persisted, 212.162 seconds total**, responses 209.120–212.156 seconds. Edit context **43 bytes**, previously 907,738. Legacy strict-revision control remains one accepted write and 19 conflicts. Independent synthetic backup/restore retained 10,000 orders/reference registry with integrity `ok`; snapshot creation 722 ms. These data-safety assertions pass; **interactive scalability remains unacceptable/open**.

The earlier audit run had 18/20 successful writes in about 75 seconds. This run avoided resets but was markedly slower; do not claim a throughput improvement or certification. The harness has an in-process client/server, heap pressure, minimal fixtures and a single burst. CPU/memory and full request-stage profiling are still needed before interpreting causality or approving scale.

A separate same-dataset control compared old/new context generation and assertion twice in one process: old issue 501/519 ms, candidate 488/554 ms; old assertion 525/482 ms, candidate 467/523 ms. The new hash guard was similar in that microcheck, not demonstrated as the cause of the much slower full burst. Separate session projection microchecks: full JavaScript workspace parse 270–307 ms versus SQLite matching-profile query 90–92 ms. These are narrow diagnostics, not an end-to-end speed claim. Whole-state cloning, reference validation, serialization, synchronous execution and ~47.7 MB responses remain the unresolved architecture constraint.

Raw current benchmark: `test-output/erp-capacity-1790410359040/report.json`; previous evidence remains in the scalability audit. No production test records, migrations, credentials or backups were used.


## Authorized final release candidate — 2026-09-26
The user authorized publication, superseding the earlier no-release-request boundary. Final native suite: **287 passed, 0 failed, 0 skipped** (53.869 seconds). Final server/review browser run: **24 passed**, no runtime errors. Review build: **40,872,481 bytes**. Indexed reference preservation and correct Domestic conflict link retain all business rules (DEC-085/WF-079).

Final synthetic 10,000-order measurements: read 392 ms, projection 695 ms / 47,733,825 bytes, simple write 1,712 ms. **The stress test FAILED: 17 of 20 HTTP 200 and persisted, three ECONNRESET; 64.203 seconds total.** Snapshot/isolated restore retained 10,000 orders and registry with integrity OK. Earlier measurements remain historical; variable timings do not establish throughput improvement. The existing whole-state architecture remains a release operating constraint. This release covers functional repairs verified with small fixtures, not high-volume readiness or certification. No schema migration or off-site provider was configured.

Ignored evidence: test-output/engineering-release-native.tap, engineering-release-browser.txt, engineering-release-capacity.txt and erp-capacity-1790414688888/report.json. Backup and live preservation evidence will follow execution.


## Published and verified — 2026-09-26
Runtime **88a630393f63b63211d41aca02c63cf0282cb9d2** was pushed to main and deployed by Coolify **k34g9op2bnial2cfzkddmird** (finished, running:healthy). HTTPS health reports this exact SHA; all 90 runtime source files and the existing persistent volume were verified. **49 read-only live browser checks passed**, including existing-account login, Domestic order/master/BOM controls, mobile layouts, PDF contacts and the new optional-follow-up Record visit form. Ashok and Suresh retain Manager/Domestic access. No verification business writes or runtime browser errors.

Before pushing, downloaded the consistent **1564-revision, 524,791,808-byte** production snapshot. Packaged **FH_Purchase_Recovery_2026-09-26T09-29-58-237Z_335a6cd9bdae.zip** (480,846,238 bytes, SHA-256 `876c1e546390df7d9f302b03802b5eff87b21279ea5483b3d222c6c063d35815`) with matching running source and recovery instructions; ZIP CRC/member hashes and isolated candidate startup passed, zero business changes. Five verified managed ZIPs retained privately in the main checkout backups/releases; one older managed ZIP pruned after verification.

Live users continued working after verification began: the database advanced from **1564 to 1571** through seven audited Ashok actions (payment correction, evidence/payment recording, QC, production completion and shipment planning). These were reconciled without rollback: all 3 earlier accounts, 602 evidence bodies, 1,683 audit rows, one archive and 591 retry receipts retained byte-for-byte; unrelated business collections and earlier references preserved. Added evidence/audit/receipts explain the new totals. SQLite integrity and foreign keys passed; zero unexplained changes. An initial exact-snapshot comparison correctly detected these later writes and was replaced by this audited reconciliation, not a restore.

The additional 100-order synthetic burst accepted and persisted **20/20** independent saves in **1.116 seconds**; this does not override the failed 10,000-order stress test or certify production capacity. Off-site backup and scale redesign remain separate pending work.

### Hosted build correction
GitHub run 36233175675 passed native tests but failed the standalone review build. A clean checkout has no ignored test-output directory; the builder now creates its output parent. An isolated fresh-tree build plus module/static contracts passed **3/3** focused tests. This follow-up affects scripts/tests/docs only; Docker runtime source remains the verified commit above, so no second production rollout is needed. The quality workflow will repeat the full native suite and actual build on the follow-up push.


### Final hosted verification and cleanup
Follow-up `22265f7989a04624486161d6cabe85b628e7ad1a` passed the complete hosted native suite and standalone build: [GitHub Actions run 36233816493](https://github.com/anandsniper-alt/farminghub-purchase-management/actions/runs/36233816493). This closes the missing-output-directory CI failure above. Runtime remains the verified 88a6303 because the follow-up changes only scripts/tests/documentation outside the Docker runtime. Temporary SSH private key and unpacked recovery staging copies were removed; the five verified recovery ZIPs remain. Deployment credential sessions were closed.
