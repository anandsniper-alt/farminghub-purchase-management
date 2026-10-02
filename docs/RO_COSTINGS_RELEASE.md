# RO costing publication — 2 October 2026

The reviewed RO cost capture and important-document page is live at [RO costings](https://purchase.dvjassociates.com/#/ro-costings). Open LAE Import → RO costings and click an exact RO number to view its evidence and workings.

Runtime: `f1acbb2f60d29e74d855b6cb92f33169a75239b7`. Coolify deployment: `bm0xltjw7mcmvjvyn1ysf5ji`; completed rolling update and healthy on its first health check. DEC-106 / WF-100. Supersedes earlier local-only status.

## Documents and cost records

Thirty user-reviewed records and 473 original attachments were imported through authenticated scoped APIs. All 30 record payloads match the reviewed source, and every stored document body matches its registered SHA-256. Originals remain separate and immutable. The page shows only Commercial Invoice, Forwarding Agent Invoice, and Inward BOE / Main BOE, with protected PDF view/download links.

The forwarding agent must be the issuer billing Farming Hub: Yasuda, World Gates or Future Consol. Twelve reviewed document classifications were imported as append-only annotations: five Future Consol proformas remain visible and explicitly provisional; five overseas-agent debit notes and two carrier invoices addressed to the agent remain archived. For RO1547, the visible agent bill is Future Consol's own proforma. Its Y-Shing debit note does not substitute for that bill. Missing important evidence stays visible.

All 30 final INR/USD conversions remain Pending, reflecting their reviewed missing actual supplier INR payments and expense coverage. Reference customs FX and received proformas do not automatically become final actual costs. AI and Suresh fields and actual workings are retained separately. See [calculation and access contract](RO_COSTINGS.md).

## Verification and preservation

- Native suite: 347 checks; 345 passed in the restricted run. The two child-process checks blocked by Windows sandbox then passed; all three build-contract tests passed. Review build passed. Hosted GitHub verification succeeded.
- Authenticated server and standalone review browser checks passed, including exact RO routing, financial save protections, and mobile layout. Live browser checks passed for the three evidence groups, Future Consol/provisional label, PDF responses, missing agent bills, agent upload choices, 390px fit, and zero runtime errors or business-write requests.
- All 137 checked served assets match the tested runtime source. Private seeds, credentials, original attachments and local preview adapters were excluded from Git and static deployment assets.
- Main purchasing remained exactly unchanged at revision1859 with 36 orders. Implements business fields are unchanged from the baseline. A separately audited revision6 update at 03:39:45 UTC, before this 03:41 deployment, added review notes/flags and PPM policy; its original audit prefix, unchanged business fields and complete later snapshot were preserved. No prior module data was restored over concurrent work.

## Recovery gate

Before pushing/deploying, a fresh consistent 624,652,288-byte production snapshot at revision1859 matched the server SHA-256. All 134 checked prior served assets matched runtime `ff31c40`. The 630,841,880-byte private recovery ZIP includes the full database, exact matching application source, manifest and guide. Archive CRC, immutable member hashes, SQLite integrity/foreign keys, matching-source startup, and candidate startup on separate restored copies passed. All nine original tables remained identical; new RO tables started empty. Five verified managed backups were retained under the existing policy.

The checked receipt write was retried after a Windows file-writing issue; only the verified, read-back receipt authorized retention and deployment. Restored database contents were compared separately from immutable archive member hashes, since startup can change SQLite file bytes without changing business rows.

Recovery and verification evidence is private under ignored `test-output/ro-live/`; retained recovery ZIPs are in the established main checkout's ignored `backups/releases/`. This is a point-in-time release recovery package, not scheduled off-site backup.
