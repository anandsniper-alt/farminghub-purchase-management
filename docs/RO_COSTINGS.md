# RO costings module

2026-10-02 · DEC-106 / WF-100 · Implemented and locally verified. Not published to the production website.

Open **Order Management → LAE Import → RO costings**. This is an RO document archive and cost capture module. It does not import FTWZ/Tally stock, post accounting entries, replace order arrival costing, or apply stock holding interest/rent/revised duty.

## Costing contract

Preserve the exact RO identifier, including letter suffixes. Multiple supplier invoices, BOEs and containers are valid within one RO. Invoice identity is supplier plus invoice number. Sum unique supplier **goods USD**, retain invoice extras and face value separately. A payment including invoice extras belongs in actual supplier payment INR; invoice extras are not added again to the denominator.

**AI calculated INR per USD = (actual supplier payment INR + bank charges net of GST + forwarder net expenses + other landing expenses net of GST + BCD + SWS) / total unique goods invoice USD.**

The editable INR amounts are already allocated to this RO. When a bill covers multiple ROs, allocate its net total once in proportion to their combined confirmed goods invoice values, using the retained document/allocation note. Multiple vendors in the same RO use its total goods invoice value. Never repeat a common charge for each vendor. Received expense lines are reference evidence, not additional automatically summed actual costs.

GST is excluded. Customs exchange rate is separately labelled reference and never used as actual payment FX or final landed INR/USD. Proforma, partial-DTA, reference calculations and conflicting currencies remain evidence; they do not silently become actuals. A blank charge stays missing; explicit zero means confirmed nil. Final calculated rate remains pending until goods USD, actual supplier payment, every cost head, currency verification and actual expense coverage are complete. Expense completion needs a verification explanation. Supplier payment must be positive for a paid goods invoice. Suresh calculated rate stays separately editable and the percentage difference is shown.

Money and goods USD are rounded through the existing minor-unit helper. Calculated INR/USD retains ratio precision; displays use four decimals. The capture UI has an explicit currency conflict choice; it does not manufacture a CNY-to-USD conversion. Enter a verified USD goods basis before completing that record.

## Page and evidence

- Search by exact/partial RO or supplier, filter Pending/Complete and page through 50 records.
- Open an RO to review supplier invoices, dates, customs FX, actual workings, received net/GST reference lines, source flags and documents.
- Edit workings with a required reason. Earlier versions remain in append-only history. Incomplete records can be saved.
- Add more supplier invoice rows as needed. Shared modal controls protect unsaved changes, including added rows.
- Upload separate supporting files. Files are scoped to LAE Import, bounded to 50 MB, checksum retained and downloaded as attachments through authenticated routes. Legacy XLS is accepted as a download-only evidence type in this module. No local computer path is served.
- Export one RO's actual workings and pending reasons as CSV.
- Import up to 30 prepared records in one atomic batch. Review the RO list first. Existing records require their exact current revision; no implicit overwrite or renaming.

## Implementation and access

Shared business rules: `shared/ro-costing.mjs`. Page factory: `web/ro-costing.mjs`, reused by server and standalone review. Native SQLite storage: `server/ro-costing-store.mjs`. Shared navigation places RO costings immediately after Loading.

GET `/api/ro-costings`, `/record?ro=...`, `/documents?ro=...&offset=...`, `/files/:id`; POST `/import` and `/files`. Reuse session identity, exact Origin and CSRF checks. LAE_IMPORT scope is required. ADMIN, MANAGER and EXECUTIVE use the existing scoped cost-entry permission; VIEWER/PRODUCT_MANAGER are read-only. No approval role is expanded. Server identity is re-read for writes.

Four additive tables retain independent per-RO revisions, costing events, evidence and actor-bound request receipts (the existing receipt table). Records/updates never rewrite main purchasing or Implements workspaces. Imports are atomic; stale revision fails the whole batch. Stable request IDs reconcile identical retries and reject changed-content reuse. Cost events and documents reject SQL UPDATE/DELETE. Files deduplicate on exact RO, filename and checksum, retaining different revisions.

Standalone review uses a separate per-login browser key. It is an isolated review, not authentication or server persistence. Evidence uploading is server-only. Production SQLite backups already cover all database tables; verify the new tables during the mandatory release recovery gate.

## Private data import

The October 2 refresh was imported locally through the authenticated API: **30 RO costings, 473 original attachments, 75,763,794 bytes**. Every record matches the prepared source, and every stored document body matches its SHA-256 register. All 30 final rates remain pending, reflecting missing actual INR payment/expense coverage. This is not a claim that all 290 Desktop archive ROs are imported or newly costed.

Private import data, source paths, documents, databases, credentials and reports stay in ignored storage. No private seed is bundled in browser assets or committed. `scripts/import-ro-costings.mjs` imports a prepared private JSON plus documents under the exact permitted RO library folder. It uses `FH_RO_IMPORT_EMAIL` and `FH_RO_IMPORT_PASSWORD`, validates root containment, file size/hash, uploads sequentially and retains resumable results. Existing changed records require review rather than automatic overwrite. Use HTTPS remotely. It does not fetch mail.

## Scale, verification and limits

Current: 30 costing rows / 473 evidence files. At 10x/100x, list queries return at most 50 rows, record detail remains bounded (100 invoices / 200 received expense lines / 150 KB), evidence pages return 100 metadata rows and imports are at most 30 records. No raw evidence bytes enter list/bootstrap. File buffering remains the existing 50 MB-per-file SQLite BLOB approach; uploads are sequential in the private loader. Substring search scans the lightweight RO/supplier fields. Event history UI shows the latest 50 entries; all older events remain in storage. A dedicated history export and normalized streaming evidence storage remain future work if actual volume warrants them.

The full native suite passed 342 tests with zero failures; final scoped costing tests passed after the invoice-basis and missing-value refinement. Native tests cover joint-load arithmetic, explicit missing/nil amounts, GST/reference exclusion, currency conflicts, stale/atomic imports, safe replay, immutable history, main-state preservation, scope/role/CSRF, evidence deduplication and bounded list requests. Browser checks verify both authenticated server and standalone review, costing save, added-row discard protection, no browser errors and 390px page/modal fit. UI-01–12 and HIG R021/R022/R100/R105/R114/R135 apply through the existing branded shared shell, forms, tables, focus and GSAP/reduced-motion path. Local import verification checks all values, SHA-256 bodies, SQLite integrity and foreign keys. Production release and accessibility certification are separate.

## Publication boundary

The module is ready for review locally. Production publication requires the established fresh consistent backup plus matching running source, private recovery ZIP, checksum/contents/isolated restore, source-preserving deployment and read-only live verification. Import the private records only after the authenticated empty module is online. Never ship the local private database or review data as a default production seed.


## Important documents — user clarification (2026-10-02)

Commercial Invoice and Inward BOE now appear above the RO costing workings, with original filenames, PDF view/download links and explicit missing status. Keep every invoice revision available; prioritize invoices whose checksum matches the recorded supplier invoice. An assessed BOE matches the inward role only when its filename begins with the recorded inward BOE reference, or an authorized upload explicitly identifies it as Inward BOE. Preliminary checklists and other assessed/DTA documents remain in the archive and do not satisfy the inward requirement. Generic invoice filenames and forwarder proformas are not promoted to supplier commercial invoices. Important-role metadata is fetched separately from archive paging (at most 100 qualifying files). Uploads can explicitly select Commercial invoice, Inward BOE or Supporting document.

Authenticated PDF viewing retains the existing scope/login checks and only uses inline application/pdf for a PDF signature; other files remain attachments. The ignored local populated review contains readonly document metadata and a separate loopback-only preview adapter for original files. This adapter is not shipped with the production application and does not weaken its protected API.

Verified this follow-up with six scoped native tests and both local server/private review browsers: original PDF responses, correct full-inward BOE versus DTA separation, missing CI status, 390px fit and no browser errors.

RO numbers in the costing register are visibly underlined native hyperlinks to that exact RO detail route. Opening one returns to the page top and focuses its important-document panel; original RO text is preserved.


**2026-10-02 important documents only:** Only Commercial Invoice, Forwarder Invoice and Inward BOE / Main BOE are shown on the RO page. The general document archive is removed from the page; all originals remain unchanged in protected storage. Forwarder proforma/debit-note labels remain explicit and do not change actual costing. Register document counts include only these important categories.

**2026-10-02 forwarding-agent issuer correction — DEC-106 / WF-100:** Forwarding Agent Invoice means a bill issued by Yasuda, World Gates or Future Consol to Farming Hub. An overseas agent debit note addressed to Future Consol, or a carrier/shipping-line invoice addressed to the agent, does not satisfy this category. Display the verified issuer and retain proforma status. Do not infer the issuer from a filename or a party merely mentioned in a document. Unknown legacy roles remain visibly missing until verified; typed uploads identify the agent and invoice/proforma/debit-note type.

Document-role corrections use POST `/api/ro-costings/document-classification` with the reviewed file ID/checksum, allowed role, reason and expected classification sequence. Existing scope/role, Origin/CSRF and actor-bound retry enforcement apply. Append immutable classification events in `ro_document_classifications`; preserve original kind, filename and document bytes. The paginated documents API returns current role and sequence. This does not revise financial records or auto-finalize expenses. Each indexed latest-role lookup is bounded by the existing document pagination/important-file limit.

Local content verification reclassified 12 legacy documents: five Future Consol proformas, five overseas-agent debit notes and two shipping-line invoices. All 473 document bodies/checksums and all 30 costing payloads/revisions stayed unchanged. Six scoped native tests passed; both authenticated server and populated review checks passed for issuer selection, exclusions, provisional status, PDF viewing, missing agent bills, upload choices and 390px fit. No production publication.

## Live publication preparation — 2026-10-02

The user authorized publication of the reviewed RO module and private RO records/evidence. The release checkout is based on the newest published lubricant changes (DEC-107/WF-101), preserving the full existing Implements code and data. Native verification: 345 of 347 checks passed in the restricted run; the two process-spawning build checks then passed with process execution enabled (all three build-contract checks passed). Authenticated-server and standalone browser checks passed. All 134 checked running assets match the pre-release source. A fresh 624,652,288-byte full production snapshot matched the server SHA-256 at revision 1859. Recovery ZIP verification, candidate restore and production deployment are still in progress; these preparation results alone do not claim publication.
