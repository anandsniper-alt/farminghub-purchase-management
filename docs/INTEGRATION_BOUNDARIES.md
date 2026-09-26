# Integration boundaries — alpha 0.1.0-alpha.1

> **Current architecture audit — 2026-09-26:** native VMS is integrated using shared vendors (DEC-044/046); the old planned PostgreSQL/Prisma replacement below was superseded, not implemented. Common ERP references/export exist, but an actual Tally/ERP connector does not. See [current system boundaries](architecture/SYSTEM_ARCHITECTURE.md) and [current state](handover/CURRENT_STATE.md).

> Current project memory (2026-09-12): see [Project Rulebook](PROJECT_RULEBOOK.md), [Current Product Baseline](CURRENT_PRODUCT_BASELINE.md), [Decision Log](DECISION_LOG.md) and [Workflow Change Log](WORKFLOW_CHANGE_LOG.md). Historical release statements below remain evidence of their date, not necessarily current behaviour.

## Existing systems are not overwritten

- Existing VMS: authoritative real vendor identity, vendor-development data, qualification and historic interactions. The new website's pilot vendor records are isolated examples, not a second live master. No sync worker or API credential is active.
- Interim package: only enough controlled technical text/artwork to make PO review possible. Full PLM is a separate planned system, with category templates, product lineage and all approval requirements still to be completed there.
- Purchase website: owns local pilot PO execution, documents, payment feedback, production, shipping and visible history.
- ERP: remains responsible for live accounting, payment/finance acknowledgement, stock, warehouse receiving and GRN. A recorded port arrival in this website does not create inventory.

## Recovered VMS source

`vms-reference/` was reconstructed from the user-supplied FH-VMS-Full-Code.docx file headings. It is read-only reference material for this build. Word formatting can alter original code. Native lockfiles/assets or repository files absent from that export are not silently invented. No run, deployment or compatibility test of that recovered VMS has been claimed. Example administrator password/JWT defaults were replaced where recognized; use fresh secrets in any actual deployment. Never distribute a populated .env file.

## Planned migration approach — not yet implemented

Confirm the native VMS repository and runtime first. Preserve real vendor/user identifiers. Define the vendor-code convention supplied by the user rather than infer it from names. Implement one authoritative write path for VMS-controlled fields, and division-aware read access. Link a stable VMS vendor identifier to each base SKU. Purchase communications remain order-owned; read prior VMS interactions without copying or recreating follow-up obligations. Keep transactional FX independent of the current-rate lookup.

Map shared business commands to the chosen authenticated VMS adapter. Replace the local workspace JSON persistence with reviewed PostgreSQL/Prisma entities and migrations. Carry order revisions, artwork references, payment allocations, shipment quantities and audit entries without altering issued history. Validate migration with record counts, balances, file hashes and sample printed POs. No SQL migration or finalized production schema is included in this alpha.


## Native VMS feature integration — DEC-044, 2026-09-13

The user confirmed adapting VMS into Purchase with one login and shared vendor records. Core CRM is now implemented locally on the native architecture; this supersedes the earlier planned PostgreSQL replacement as the approach for this feature. The recovered React/Express/Prisma tree remains reference-only and unchanged. New CRM writes use the existing Purchase supplier ID, transactions and file storage. Source company/contact fields are explicitly mapped and primary contacts synchronized.

This source integration does not migrate or synchronize a separate live VMS database, users or historic files, and does not establish competing live writers. No source-stack server, source seed or external account store was started. Only a separately approved publication/migration may change live integration ownership. ERP and PO/financial boundaries above remain. Capability differences and preserved formulas are listed in VMS_MODULE.md.


## Current direction - DEC-053, 2026-09-13
The user confirmed Tally is accounting base and ERP is its frontend. This supersedes unspecified ERP direction in historical planning, without approving old framework assumptions. The active native Node/SQLite app now has a local identity/mapping foundation documented in ERP_REFERENCE_FOUNDATION.md. Its versioned JSON is an authenticated read-only common snapshot, not native Tally input. Actual connector, ownership, ledger/unit/tax mappings, service authentication, retries/conflicts and reversals remain to be designed against the selected ERP interface and Tally version. No live synchronization is configured.
