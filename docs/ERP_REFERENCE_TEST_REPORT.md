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
