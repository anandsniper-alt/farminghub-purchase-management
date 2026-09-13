# ERP reference foundation verification

Date: 2026-09-13. Local isolated server and standalone review fixtures only. No live database changes, ERP calls or Tally postings.

Eight focused native tests cover stable backfill and unchanged issued/business records; removal and serial-reset reservations; nested identity; namespace/counter protection; Admin-only company-scoped links, duplicate retries/conflicts; scoped projection; backed-up SQLite migration and reopen; rejected commands and new records; authenticated read-only export and identity relationships.

Twenty-two browser checks passed across authenticated server and standalone review: settings/register navigation, search, manual Tally mapping, duplicate-link rejection with retained form values, JSON export, persistence after reload, 390px/320px layouts, PO references, Manager read-only controls, unchanged business collections and no runtime errors. Desktop and 320px screenshots were visually inspected; narrow tables retain internal horizontal scrolling.

The existing module-layout browser suite also passed, including both modes and mobile navigation. Full native-suite results are recorded in the release checkpoint appended below. Private screenshots, exports and SQLite test fixtures remain ignored under test-output.

Limits: no live rollout, no real Tally company or ERP endpoint tested, no synchronization/reconciliation engine, and no external-link correction workflow. These tests validate the reference foundation, not end-to-end accounting integration. The existing VMS audit findings are not closed by this change.

## Final release checkpoint

Full native suite: 177 passed, 0 failed. Module-layout browser suite: 80 passed, no runtime errors or business-state mutations. Reference browser suite: 22 passed. Review build generated successfully and git diff whitespace checks passed. Candidate remains local on feature/erp-reference-foundation.

## DEC-054 format verification
Nine focused native tests and 22 browser checks passed after adding LAE-I for new import POs and removing numeric padding. Legacy assigned references, counter continuity, other divisions, exported keys, server/review display and substring search verified. Review build regenerated; no deployment.

## DEC-055 integrated safeguard checkpoint
The reference candidate is extended on feature/erp-order-safeguards. 191 native tests, 28 server/review browser checks and three configured Manager workflows (55 checks) pass. Capacity probing exposed a 46.75 MB workspace response and global revision contention at 10,000 orders. See ERP_ORDER_SAFEGUARDS_REPORT.md; these results do not certify production scale or publish the feature.

## DEC-056 automatic PO-number verification - 2026-09-13
Local candidate only. Native full run covered 196 tests: 194 passed, two historical-clone fixtures still carried the new automatic-identity marker. Corrected those synthetic legacy fixtures, then reran both affected suites: 20/20 passed. Five dedicated numbering cases cover client overrides, immutable number/source, registry loss, legacy collision skipping, deletion/serial reset, failed allocation and blank legacy drafts.
Three Purchase Manager browser workflows passed 61 checks (19/20/22), including read-only automatic PO numbers, reference equality, manual supplier PI entry and complete settlement. Admin configured approval coverage only in isolated test setup; no new production permissions. Six additional browser checks passed in native server and standalone review: automatic read-only field, successful allocation and reload persistence. No browser runtime errors; reviewed the new field screenshot.
Evidence (ignored local artifacts): test-output/automatic-po-native-final.log; test-output/automatic-po-fixtures.log; test-output/manager-relaxed-workflows/2026-09-13T15-03-30-003Z/report.json; test-output/automatic-po-browser-1789312174783/report.json. Browser harness corrections selected the actual branded clean-seed items and handled both HTTP/file review URLs. Build and diff whitespace checks passed. No live data writes or deployment; scale/recovery/ERP readiness gates from the earlier report remain open.

## Pending changes published - 2026-09-13
Runtime 519f9fee2d87ed7f8646ac46a502f1128df432b4 is live at https://purchase.dvjassociates.com through Coolify deployment bplm8iwbj2ojap0qttjiwx4l (finished, running:healthy). This publishes the implemented Minimal personal settings, VMS module expansion, clean module hierarchy/bottom selector, permanent ERP/Tally reference foundation, reference/retry safeguards, guided order steps and automatic PO numbering (DEC-045/046/048-050/053-056). Supersedes their local-only publication status; audit recommendations and pending divisions remain unimplemented.
196 native tests passed; three Manager workflows passed 61 checks; automatic numbering passed six server/review browser checks. A consistent 89,571,328-byte live SQLite backup was restored and migrated locally before deployment. All existing business collections were preserved. Live startup initialized permanent references once, revision 969 to 970. Thirty-nine live checks passed; account, evidence, archive and original audit hashes plus SQLite integrity were verified separately. Zero live test orders/business write requests; retained 37 vendors, 387 items, 106 prices and next PO/reference 1. Domain, single instance and /app/data storage retained. See RELEASE_2026-09-13_REFERENCE_MODULES.md.
