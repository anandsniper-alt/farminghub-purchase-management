# RO worksheet comparison candidate

This additive candidate displays historical or provisional AI and Suresh worksheet references beside the existing verified-actual calculation. It does not import stock, replace order arrival costing, infer payments or complete missing actual expense coverage. DEC-106 and the existing shared financial calculation remain authoritative.

## Data contract

An RO may contain `worksheetComparison`. Legacy records retain their previous shape when it is absent. Saving through an older editor that omits this property preserves an existing comparison, in both server and standalone flows. Explicit `null` clears the current comparison while the existing version history retains previous server records.

Exact combined RO identifiers may contain interior ASCII spaces. They are retained verbatim as one record identity, never split or normalized. Surrounding whitespace, control characters and path separators remain invalid. Expense RO references, URLs, persistence and history preserve the same exact identifier.

```js
{
  version: 1,
  status: 'Historical reference', // also Provisional reference, Partial reference, Pending
  basis: 'Explanation of the chosen headline reference',
  reviewedOn: '2026-10-04',
  source: 'Reviewed worksheet register',
  selectedWorkingIds: ['synthetic-working-1'],
  ai: {rate: null, totalInr: null, goodsUsd: null, basis: '', formula: ''},
  suresh: {rate: null, totalInr: null, goodsUsd: null, basis: '', formula: ''},
  workings: [{
    id: 'synthetic-working-1', invoice: 'SYNTHETIC-CI', supplier: 'Synthetic supplier',
    status: 'Historical reference', basis: '',
    source: {file: 'synthetic.xlsx', sheet: 'Synthetic worksheet', sha256: ''},
    ai: {rate: null, totalInr: null, goodsUsd: null, basis: '', formula: '', rows: []},
    suresh: {rate: null, totalInr: null, goodsUsd: null, basis: '', formula: '', rows: [
      {label: 'Original source component', value: null, unit: 'INR', cell: 'D21', formula: '=D19*18%', basis: ''}
    ]}
  }]
}
```

Headlines are independent references. A pooled or accepted historical rate need not equal an invented total divided by goods value. Source formulas are inert text and remain independent for each side, including GST deductions and cached values. Missing values stay null; explicit zero and signed component deductions are preserved. `Pending` requires blank headline rates, but can retain conflicting alternatives with no selected IDs.

Source evidence belongs in protected RO payloads, never static assets. Use workbook basename, exact sheet name and verified SHA-256; do not insert absolute filesystem paths. The payload does not contain document bodies. Source worksheets and protected evidence stay separate.

Bounds retain the existing 150,000-character record and 30-record/5-MB import limits. Maximum 100 workings, 600 component rows per side, 100 unique selected IDs. Keep every populated/formula source cell; omit empty grid cells. Rates are positive up to 1,000,000; other reference numbers have magnitude at most 1,000,000,000,000. References preserve source precision and never enter actual-payment arithmetic. Selected IDs must identify retained workings. Text is bounded and escaped in HTML.

## Presentation and preservation

The list exposes worksheet AI, worksheet Suresh, worksheet status and verified actual AI separately. Actual-status filters still use the original actual-completeness logic. Detail presents headline references and independent per-invoice source workings in native disclosures, above verified actual calculations. Export keeps actual and worksheet rate columns distinct. Existing protected API, scopes, CSRF, request receipts, optimistic revisions, document hashes and append-only history remain in force.

Important document cards show Commercial Invoice, Inward/Main BOE and explicitly classified Importer copy. Assessed BOE and OOC are not automatically reclassified as importer copies. Other original documents remain in immutable storage and a collapsed, paginated retained-document archive. The upload choices do not delete or alter earlier classifications.

The implementation reuses native ESM, existing panels, table regions, status badges and disclosures (UI-01, UI-03, UI-05, UI-06 and UI-12). No dependency, framework, CSS token, authentication or database-schema migration is introduced. Shared calculations are unchanged. Lists retain at most 50 records per request and evidence pages at most 100; full component details are confined to one RO. Existing substring search and buffered evidence storage remain unchanged capacity constraints.

## Review and release boundary

Only these files comprise the patch:

- `shared/ro-costing.mjs`
- `shared/ro-documents.mjs`
- `server/ro-costing-store.mjs`
- `web/ro-costing.mjs`
- `tests/ro-worksheet-comparison.test.mjs`
- `docs/RO_WORKSHEET_COMPARISON.md`

All test data is synthetic. Private RO records, source archives, upload manifests and credentials must remain outside the public repository. Apply the patch to the current source branch without overwriting newer documentation or unrelated work. The candidate does not authorize deployment or data import. Follow the current recovery/backup and isolated-restore gates before any subsequent live release.

Validation targets: original RO money/auth/revision/document tests; source-formula and precision retention; null/zero and bounds; unchanged actual calculation; legacy save preservation; SQLite history; server and standalone HTML rendering; escaped formulas and retained archived evidence. Full visual, mobile, keyboard, zoom and reduced-motion verification must be completed in the matching app shell before release; string rendering tests alone do not certify these behaviors.

Local verification on 4 October 2026: all 13 targeted tests passed (five existing RO tests and eight comparison/identity tests), including authenticated HTTP scope/CSRF/privacy, actual-payment arithmetic, SQLite revision/history, legacy server/standalone preservation, isolated archive pagination and exact combined-RO identity through expenses, persistence and authenticated URL routing. Command: `node --test --experimental-test-isolation=none tests/ro-costing.test.mjs tests/ro-worksheet-comparison.test.mjs`. Single-process isolation avoided the local Windows child-process restriction. Matching runtime domain/server dependencies were used; unrelated static assets were not exercised. Deployment and live-data verification have not been performed for this candidate.

## Cloud continuation — DEC-113 / WF-107 (2026-10-04)

The user explicitly authorized publication and subsequently requested individual private Google Drive links and a protected costing-learning/source-library link. This supersedes the approval-pending statement above; recovery and access prerequisites still apply. Website publication and private import have not yet been performed by this cloud task.

POST `/api/ro-costings/drive-documents` registers one reviewed essential PDF reference: exact `ro`, basename `name`, explicit `kind`, canonical `driveUrl`, source `sha256`, positive `bytes` and audit `reason`. Only Commercial invoice, Inward BOE and explicitly identified Importer copy are accepted. Canonical Drive file-view URLs are independently validated on server and display. Arbitrary URLs, redirects, userinfo, ports, encoded paths and executable schemes are rejected. This stores metadata, not a downloaded PDF or independently verified current Drive bytes. No server redirect or Drive-sharing change occurs. Existing local evidence retains original bytes, download/view routes and classification history.

Two additive SQLite tables hold immutable Drive references and append-only source-library versions. The `ro_document_metadata` view unifies protected local/external metadata for indexed per-RO pagination (100 rows) and bounded important-document queries (100 rows). Same-RO/file-ID conflicts stop; same-RO/hash/role duplicates reuse the retained reference. Main purchasing state, actual costing revisions and earlier costing events are unaffected. Existing scopes, write permissions, Origin/CSRF checks and actor-bound request receipts apply. Record/list responses include the current protected source-library link. GET/POST `/api/ro-costings/source-library` uses a current `expectedSequence`, name, canonical Drive file/folder URL and reason; no static business links are bundled.

The UI labels external evidence **Open in Google Drive**, with `noopener noreferrer` and no-referrer behavior. A local document and a Drive reference with the same exact RO, SHA-256 and role share one important-document card offering both access options; distinct hashes/roles retain separate cards. Original local bodies and both metadata entries remain in the retained archive. Google permissions continue to govern access. Learning/library links appear on the protected RO register and detail. Google Drive ZIP viewers are not used as individual-document links. Native disclosures preserve independent formulas. Scoped reference text wraps long source basenames, and the shared account header wraps at narrow widths so sign-out stays reachable.

Private preparation: `scripts/prepare-ro-reference-batches.mjs` takes the audited comparison patch array, null-actual creation array and final verified individual-PDF manifest. It checks exact catalogue agreement, comparison equality and every shared-RO association, then writes batches of at most 30 outside the checkout or in ignored `test-output`. It refuses to overwrite prior batch files. Input patches update existing ROs; `creationRecord` is used only when that exact RO is absent. Raw source paths do not enter website references.

`scripts/import-ro-costings.mjs` accepts `mode: 'worksheetComparison'`. It preflights the bounded batch, snapshots each current record/history/document list in a new private per-attempt report, retains every existing actual field and rejects conflicting prior comparisons. Remote runs require `expectedReleaseSha` to match the healthy deployed candidate. Atomic record writes use exact per-RO revisions and stable request IDs. Local PDF uploads accept essential individual documents only, deduplicate by same-RO checksum and verify downloaded stored hashes. Explicit reason/sequence/checksum-bound classification corrections preserve original bodies. `driveDocuments` adds reviewed references sequentially and verifies stored metadata; the report distinguishes this from downloading/verifying Drive bytes. Optional `sourceLibrary` retains previous versions and skips an identical retry. Final records are read back again. Reports distinguish created/updated/skipped/pending records, uploaded/skipped/reclassified documents and verified Drive references.

Current/10x/100x: references stay separate from the financial aggregate, with exact-RO/file and checksum indexes, bounded bodies, one reference per write and 30-record imports. Drive access/content can change independently; metadata read-back does not establish current content or sharing permissions. Raising document limits, streaming evidence or changing holding/stock accounting remains outside this work.


Cloud verification on 4 October 2026: Node 24.19.0 Linux completed **383 native tests, 0 failed, 0 skipped** with `node --test tests/*.test.mjs`. The final scoped RO run completed **20 tests, 0 failed**. The standalone build and Chromium server/standalone flows passed: separate source rates/formulas retained through actual save, merged local/Drive card with both links, protected source-library rendering, keyboard disclosure, reduced motion, long source basename wrapping, 390px modal/page fit and 320px register/detail fit, with no browser errors. Generated tracked HTML was restored after validation. Native tests also exercise protected link persistence/reopen, source-library revisions/replay, actual/history preservation, checksum/role/source conflicts, bounded preparation, record/document read-back, per-attempt snapshots and reference/actual pending counts. These are synthetic local checks; private package download, live recovery/deployment/import and current Google sharing/content verification remain unperformed because runtime access is not active.
