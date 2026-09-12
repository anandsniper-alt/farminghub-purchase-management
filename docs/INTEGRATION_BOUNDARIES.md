# Integration boundaries — alpha 0.1.0-alpha.1

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
