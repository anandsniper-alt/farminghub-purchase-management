# Software references and ERP/Tally foundation

Date: 2026-09-13. Decision DEC-053; workflow WF-047. Status: implemented and tested locally, not deployed. Tally is the accounting base; the intended ERP is its frontend. The ERP interface, Tally version and company details are not yet specified.

## Identity contract

New PO numbers equal their permanent software reference (DEC-056), for example FH-LAE-I-PO-1. Internal IDs, saved legacy PO numbers, supplier PI/invoice numbers, item codes and display serials retain their meanings. Supplier PI/invoice numbers remain manual. Never match integrations by a display serial or supplier document number alone; use the namespace and permanent reference.

| Record | Prefix | Example |
|---|---|---|
| LAE Import purchase order | LAE-I-PO | FH-LAE-I-PO-1 |
| Vendor | VEN | FH-VEN-1 |
| Base product | BAS | FH-BAS-1 |
| Item / ERP variant | ITM | FH-ITM-1 |
| Supplier price record | PRC | FH-PRC-1 |
| Payment | PAY | FH-PAY-1 |
| Complaint | CMP | FH-CMP-1 |
| Uploaded file | DOC | FH-DOC-1 |
| Order cost | CST | FH-CST-1 |
| Shipment | SHP | FH-SHP-1 |
| PO line | POL | FH-POL-1 |
| Payment allocation | PAL | FH-PAL-1 |
| Order task | TSK | FH-TSK-1 |
| Supplier PI (current/history) | PI | FH-PI-1 |
| Order evidence attachment | ATT | FH-ATT-1 |
| Vendor interaction / visit | VIS | FH-VIS-1 |
| Vendor sample | SMP | FH-SMP-1 |

Examples are illustrative. Each type has an independent monotonic counter, without leading zeros for new assignments. Numbers are reserved permanently; deletion, sorting, code changes and the display-serial restart in DEC-052 cannot reuse them. Existing records receive references in stored collection order on first initialization, not inferred historical chronological order. Supported records must have valid string IDs; malformed IDs fail visibly. Current/historical PIs and order evidence wrappers have parent-scoped identities. Approval events, catalogue values and CRM document-link wrappers do not acquire fabricated IDs. Uploaded files have DOC references.

`shared/references.mjs` is authoritative. The sidecar `state.recordReferences` stores version, workspace UUID namespace, per-type next counters, immutable entries and external links. It does not modify business records or issued snapshots. Nested identities include their parent type and ID. The external integration key is `<workspaceNamespace>:<softwareReference>`; the internal `recordKey` is a JSON tuple `[type,parentType,parentId,id]`. Readable references alone are not globally unique across independent installations.

## Migration and persistence

The server initializes legacy references before serving requests, takes a consistent SQLite backup before the reference migration, then applies an audited transaction and advances the workspace revision. A combined earlier serial migration can initialize references inside that migration's backed-up transaction. Reopening does not allocate again. Domain commands assign new references within the existing transaction; rejected commands do not consume numbers. Store commits reject changed namespaces, removed/reassigned entries, decreasing counters and overwritten existing links.

Full backups include the registry. Retain reserved entries even when a record is removed. Restoring a clone retains its namespace: keep test copies disconnected from future production connectors. An old backup predating this feature requires explicit identity reconciliation before integration; do not assume a newly generated namespace can replace an already connected workspace.

## Register and access

Users & settings → Open register opens `#/references`. Users can search supported records within their existing server scope. Compact references appear on PO, vendor, item/base, payment and complaint surfaces; the full register covers the other supported types. The PO CSV includes Software reference.

Only Admin can save external mappings and download the integration snapshot. Each mapping records ERP or TALLY, a stable company key, external ID/GUID and optional Master ID, Alter ID and voucher number. Company keys must be consistently entered; these are exact identifiers, not fuzzy company-name matching. Optional Tally IDs are reference metadata, not confirmation of a posting. An identical retry creates no second link/event. Conflicting reassignment is blocked, as is assigning the same external ID to another record of the same type/system/company. There is no correction UI yet; corrections require a separately designed audited process. Mapping rules do not establish cross-type uniqueness or validate a live Tally company.

## Common export, not a connector

Authenticated Admin endpoint: `GET /api/integration/v1/snapshot`. The UI exports the same common format and labels its source environment. This is a read-only full snapshot of authorized business data. It contains no user-account collection, passwords or connector credentials. Protect downloaded files as business records.

Envelope fields: `schema: farminghub.integration.snapshot`, `version: 1`, workspace namespace/revision, `mode: snapshot-only`, `connectionStatus: Not connected`, money convention and records. Each record includes type, internal ID, permanent reference, integration key, parent identity, external links, common vendor/base/item/order relations, deleted flag and original data. Preserve field-specific units: existing monetary minor-unit amounts remain integers; quantities and exchange rates retain their existing conventions. No conversion or financial recalculation occurs. Physically removed records are absent from the export even though their registry reservations remain; this is not a complete deletion-event feed.

This JSON is Farming Hub's common format. It is not directly importable Tally XML/JSON. Tally documents company selection and XML integration in its [XML integration guide](https://help.tallysolutions.com/xml-integration/), and master/transaction identifiers in [sample XML](https://help.tallysolutions.com/sample-xml/). Native JSON support depends on the deployed version; see [TallyPrime JSON integration](https://help.tallysolutions.com/tally-prime-integration-using-json-1/). The implementation intentionally selects no Tally transport until the actual ERP/Tally interface is known.

## Required before actual push/pull

Agree the ERP API/transport, Tally version/company keys and responsibility for each record/field. Tally remains accounting authority; recording a Purchase payment does not itself create a Tally voucher. Map ledgers, stock items, units, currencies, tax treatment and voucher types explicitly. Define approval/issuance triggers, durable outbound events, idempotency, acknowledgements, retry/reconciliation, incoming validation/permissions, conflicts, deletions and reversal handling. Use scoped service authentication with protected server credentials. Test against an isolated company first. No sync service, scheduling, outbox, incoming import endpoint or accounting posting is implemented here.

## Format refinement - DEC-054 / WF-048
New LAE Import PO references use FH-LAE-I-PO-1, then FH-LAE-I-PO-2. All newly allocated software references use unpadded positive integers. Already-assigned references retain their exact text and ERP integration keys, including padded or generic PO forms. Counters remain monotonic per record type across formats and divisions; no renumbering or reuse.

## Safeguard update - DEC-055 / WF-049
See ERP_ORDER_SAFEGUARDS_REPORT.md for history-aware business-number checks, 17-type coverage, strict registry validation, safe retries and measured capacity limitations. This remains a local foundation with no Tally posting.
