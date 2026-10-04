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
