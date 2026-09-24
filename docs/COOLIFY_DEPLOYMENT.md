# Coolify deployment

Deploy the repository's `main` branch using the root `Dockerfile`, with port `8000` exposed internally. Set the domain to `https://purchase.dvjassociates.com` and enable HTTPS redirection. No host port mapping is needed.

Set these runtime environment variables in Coolify (not build arguments):

```dotenv
HOST=0.0.0.0
PORT=8000
FH_DATA_DIR=/app/data
FH_ORIGIN=https://purchase.dvjassociates.com
FH_SECURE_COOKIE=true
FH_ADMIN_NAME=Purchase Administrator
FH_ADMIN_EMAIL=<admin email>
FH_ADMIN_PASSWORD=<password of at least 12 characters>
```

Mount a persistent Docker volume at `/app/data` before the first deployment. This contains the SQLite database and uploaded files. Keep a single application instance, and back up this volume. Do not copy a running local SQLite database into the image.

Admin environment variables create the first account only when the database does not exist. Changing them later does not change an existing account's password.

Health check: `GET /api/health`, HTTP port `8000`, expected status `200`. The image runs as the unprivileged `node` user. Its build context excludes local environment files, databases, and test output.

Use Coolify's Deploy action after pushing updates. This deployment uses the application's isolated SQLite pilot store; it does not connect to a live ERP or VMS database.


Presentation release (DEC-026): Docker continues to copy web/, server/, shared/ and templates/ only. The approved presentation modules/styles/guide assets are in web/. Do not deploy prototypes/minimal-theme/preview.html, transfer its browser storage, or run its synthetic seed against the live database. Persistent volume/environment/instance settings remain unchanged.


## Verified Manager release — 2026-09-13

Runtime commit f5d55146cd7428cc72d6f6ef6bcc52ead48b63df; deployment fghgsunna2djj2wpin1ytwao on the existing application. This instance uses POST /api/v1/deploy with the resource UUID; the older GET method returned 405 without queuing a deployment. Auto-deploy is disabled, so pushing documentation alone does not replace the runtime. Domain, port 8000, Dockerfile and /app/data persistent storage remained unchanged. See QA_EXECUTION_REPORT.md for verification. Tokens remain outside Git and reports.

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.

**DEC-032 / WF-026 publication, 2026-09-13:** Runtime a5a9b24 is live at https://purchase.dvjassociates.com; deployment 3ontnhztuhusfj6ei7ltqodd finished successfully. The order timeline opens expanded in Minimal, survives guide toggles/reload and fits the checked 390/320px layouts. Eleven served assets match the release commit and health returns 200. All 29 POs / 15 QA orders, checked business collections and approval controls are unchanged at revision 904. This supersedes the earlier local-only publication status for the timeline update.


## Worksheet publication verified — 2026-09-13

Runtime commit **8353e01f8742ca8b0e24223ea3397583a2a6a83c** is live at https://purchase.dvjassociates.com. Coolify deployment **qyvgv6b0coxnxtjh1dno47p5** finished; application running:healthy and health HTTP 200. This publishes the compact supplier worksheet independently under DEC-041 / WF-036, superseding its release-candidate status. **17 live checks passed:** committed app/style/domain bytes, Minimal/Current, catalogue selection/search/duplicate disabling, live totals, expandable terms, mobile fit/internal scrolling, no runtime errors or business writes. All **30 orders**, checked business collections, users and approval controls match the fresh pre-release baseline at **revision 961**. Persistent /app/data volume and runtime settings were retained. No audit-trial schema, FX, recovery or security policies were deployed. Evidence is privately retained in ignored test-output/worksheet-live-report.json, worksheet-live-desktop.png, worksheet-live-mobile.png and worksheet-deploy-status.json.


## Manual supplier FX publication verified — 2026-09-13

Runtime **a087dc45a20378cc8b400c1ff6cbbb6ae1a8fd8f** is live at https://purchase.dvjassociates.com. Coolify deployment **rqo6ohuhqrbcdiq5tybzyfup** finished and application is running:healthy. This publishes DEC-042/043 and WF-037/038, superseding their local-only/candidate status. Manual supplier-agreed USD-to-RMB rate/date are entered during PO creation; later changes use controlled revisions. No automatic lookup was published. **23 live checks passed**, including committed app/style/domain matches, health, required manual rate/date, blank invoice price before conversion, no market-fetch control, both themes, source selection, editable prices/totals and mobile layout. Business hashes, users and approval controls match the fresh baseline: **30 orders, revision 961**; no business writes occurred. Persistent volume/runtime configuration retained. Broader audit changes remain separate/unpublished. Private evidence: test-output/po-fx-live-report.json, po-fx-live-desktop.png, po-fx-live-mobile.png, po-fx-deploy-status.json.


## VMS live publication — 2026-09-13

The user explicitly requested publication of the reviewed VMS integration. Runtime **6a2a366afb01aef313c1aeed366d8eff7b1edcdb** is live at https://purchase.dvjassociates.com/#/vms through Coolify deployment **cjiv0ehnqmoajlkidfy84gfb** (finished; running:healthy). This publishes DEC-044 / WF-039 and supersedes their local-only status. Existing domain, port, single application instance, environment and /app/data persistent volume retained; no historical VMS import, role rewrite or startup CRM seed. Broader audit-trial changes remain separate.

**36 live checks passed**, covering committed app/VMS/domain/styles/guide assets, health, existing login, all VMS tabs, legacy supplier profile, creation/evaluation/sample/interaction/document forms opened and cancelled, multiple-file input, linked purchase history, Current/Minimal/mobile, mascot guidance, existing vendor master and PO pipeline. Zero browser runtime errors or business-write requests. All 32 saved state sections match the fresh predeployment fingerprint: **30 orders, revision 961**, including vendors, users, files, events, payments and approval controls. Isolated release validation already passed 156 native tests and 41 browser checks.

Use **Libraries → Vendor Management (VMS)** with the existing Purchase login. Core CRM is live; source-only historical data and unported offline/voice/PWA/export/geography tools remain outside this release as documented in VMS_MODULE.md. Private verification files remain ignored under test-output.

## Pending changes published - 2026-09-13
Runtime 519f9fee2d87ed7f8646ac46a502f1128df432b4 is live at https://purchase.dvjassociates.com through Coolify deployment bplm8iwbj2ojap0qttjiwx4l (finished, running:healthy). This publishes the implemented Minimal personal settings, VMS module expansion, clean module hierarchy/bottom selector, permanent ERP/Tally reference foundation, reference/retry safeguards, guided order steps and automatic PO numbering (DEC-045/046/048-050/053-056). Supersedes their local-only publication status; audit recommendations and pending divisions remain unimplemented.
196 native tests passed; three Manager workflows passed 61 checks; automatic numbering passed six server/review browser checks. A consistent 89,571,328-byte live SQLite backup was restored and migrated locally before deployment. All existing business collections were preserved. Live startup initialized permanent references once, revision 969 to 970. Thirty-nine live checks passed; account, evidence, archive and original audit hashes plus SQLite integrity were verified separately. Zero live test orders/business write requests; retained 37 vendors, 387 items, 106 prices and next PO/reference 1. Domain, single instance and /app/data storage retained. See RELEASE_2026-09-13_REFERENCE_MODULES.md.

### Arrival costing publication — 2026-09-17
DEC-057 / WF-051 is published in runtime cd87b60 through deployment hdaqomsos7zk6dagzziiwiom (finished, running:healthy). Candidate-only status is superseded. 205 native tests, 29 server/review costing checks, three full Manager workflows (68 checks) and 45 live checks passed; backup/restored-copy rehearsal and live preservation verified. Existing business data retained; LC counter initialization alone moved revision 1007 to 1008. No live test orders or business-write requests. See ARRIVAL_COSTING_RELEASE_REPORT.md for evidence and scope.


### Process exemptions published — 2026-09-17
DEC-058/059 and WF-052/053 are live in runtime ec0863ffa49450cc8a36f63e03fb9611c849a107 through Coolify deployment phgvkrkb9eliy749fqpjvhes (finished, running:healthy). This supersedes local-only publication status; only the confirmed pre-QC catalogue was deployed. Manager/Admin early exceptions retain pending work and history. Sample QC and every later stage remain mandatory. Backup/restored-copy rehearsal passed; 58 live checks passed with zero runtime errors or business-write requests. Existing records are preserved; EXM counter initialization alone moved revision 1008 to 1009. See PROCESS_EXEMPTIONS_RELEASE_REPORT.md.


## Concurrent access published — 2026-09-21
DEC-060 / WF-054 is live at https://purchase.dvjassociates.com in runtime **6578f18501f135c70000c54390da253db291ddca**, Coolify deployment **veyiohrvuqauviaswztf9eyk** (finished; running:healthy). This supersedes the preceding candidate/publication-pending status. Independent order/vendor/personal-setting saves and retained-entry conflict review are published; same-record/shared-dependency conflicts still require explicit review. Refresh open browsers once to load the new client.

225 native tests, 16 two-user/server/review browser checks and three complete Manager workflows (68 checks) passed. Fresh consistent SQLite backup **399114240 bytes** passed integrity and candidate startup on an isolated server-side restored copy. All saved state and protected account/evidence/audit/archive/retry tables matched exactly. The initial network download timed out; no partial download was used as recovery evidence.

**66 live checks passed**, including committed assets, two independent live sessions, authenticated revision endpoint, existing module/workflow navigation and mobile layout. Zero browser runtime errors or business-write requests. Post-deployment SQLite verification preserved all 20 original orders, existing master records, attachments, accounts, archive rows, audit history and retry receipts. Live work progressed from revision 1326 to 1335: 1 new order and 2 new files were reconciled to 10 user audit events. The live order count was 21; no rollback or migration was performed. Unchanged masters: 37 vendors, 388 items and 106 price lists. Existing domain, port 8000, single instance and persistent /app/data retained. No migration or reference reset. Private reports/backups remain outside Git in ignored operator storage and the application data volume.

## Supplier PI pipeline publication — 2026-09-21
DEC-061 / WF-055 is live in runtime `364866ca6b9878b8dffa75b14f2a67d4fcbefb10` through deployment `zx4csoitx8proml4nxodw0cg` (finished; running:healthy). Fresh 405,504,000-byte backup and restored-copy rehearsal passed. Fifty-eight isolated and 18 live checks passed, including PI display/search/board/export/mobile with zero test business writes. All pre-release records and protected tables were preserved; one concurrent approved price-list addition was retained and matched its audit event. Existing `/app/data`, single instance, domain and port 8000 remain unchanged. See SUPPLIER_PI_PIPELINE_RELEASE_REPORT.md.

DEC-062 / WF-056 is live in runtime `6efbf29813a59ba372fd5755d014692a41713209` through deployment `matuydmgjm7fvtjyv71mv3va` (finished; running:healthy). Fresh 407,355,392-byte backup/restored-copy rehearsal passed. Fifteen read-only live checks and final preservation passed at unchanged revision 1355 with no business writes. Existing `/app/data`, single instance, domain and port 8000 remain unchanged. See SESSION_RECOVERY_RELEASE_REPORT.md.

DEC-063 / WF-057 is live in runtime `d11918f147a236e85c5f010e5373d923ecc0c03d` through deployment `biiv5slzzxdju89x2dugfdov` (finished; running:healthy). Fresh 415,895,552-byte backup/restored-copy rehearsal passed. Sixteen read-only live checks and final preservation passed at unchanged revision 1372 with no business writes. Existing `/app/data`, single instance, domain and port 8000 remain unchanged. See ITEM_MASTER_CORRECTION_RELEASE_REPORT.md.


## Domestic BOM and price lists published — 2026-09-24
DEC-064–066 / WF-058–060 are live at https://purchase.dvjassociates.com in runtime **803bf34346735f781f1008c5d9000777ce50ded1**, deployment **dihpggiuw45cg7swfijdky31** (finished, running:healthy). This supersedes the prior local-only/candidate status. **241 native tests, 52 local browser checks and 39 live read-only checks passed.** A fresh consistent 507,609,088-byte SQLite backup and restored-copy candidate rehearsal passed. Original orders, payments, masters, accounts, evidence, audit, references and serials were preserved; only reference setup and the approved source catalogue were added. No test supplier or price data was seeded. Both active Managers already had Domestic access; no scope change was needed. Assembly contents/quantities and supplier rates remain for the user to enter. See DOMESTIC_RELEASE_REPORT.md and DOMESTIC_PRICE_LIST_GUIDE.md.


## Mandatory pre-release download — DEC-067
Before every release push/deployment, complete the downloaded, verified recovery ZIP and five-copy retention procedure in BACKUP_RESTORE_RUNBOOK.md. A server-local snapshot alone is insufficient. Stop release if download, ZIP verification or isolated restore fails. Runtime credentials stay in private configuration, outside the ZIP and repository.


**Publication verified, 2026-09-24:** runtime **9f7c3c804518dfed6db954bebdb7fa0cd2eeea58**, Coolify deployment **iqbhj3adw7rti1f0eyof60tk** (finished; running:healthy). **241 native tests, 66 local server/review browser checks and 42 live checks passed.** The picture/name click-to-add BOM editor is live. A fresh **464,872,834-byte recovery ZIP** was downloaded/packaged and checked against the server snapshot; isolated restored-copy candidate startup preserved all data. The archive includes the complete database/evidence and matching previous running source. Five-copy retention applied: 1 verified ZIP currently retained, 0 older ZIPs removed. Live business workspace is unchanged at revision **1513**; all accounts, uploaded bodies, audit rows, archives and retry receipts match the pre-release snapshot. Browser verification made **zero business-write requests**. This supersedes DEC-068 / WF-062's local-only status. Private evidence remains under test-output/bom-picker-release/ and backups/releases/.


**Publication verified, 2026-09-24:** runtime **8f24c088b8fa25c7d098ccc39aed69d8f9f7b255**, Coolify deployment **nhhrvupva9q8qyiyq7zeusxn** (finished; running:healthy). Manual supplier prices with photos/item codes/Used in BOM and same-row BOM Remove are live. **242 native tests, 143 local server/review browser checks and 56 read-only live checks passed.** A fresh **464,874,649-byte recovery ZIP** was downloaded and verified, including the complete database/evidence and matching previous running source. Extracted-database integrity and isolated candidate startup preserved all data. Retention: 2 verified managed ZIPs, 0 older ZIPs removed. Live workspace remains at revision **1513**; accounts, evidence bodies, audit records, archives and retry receipts match the pre-release snapshot. No live business-write requests were made. This supersedes local-only status for DEC-069/070 and WF-063/064. Private evidence: test-output/manual-entry-release/; recovery archives remain outside Git in backups/releases/.


**Publication verified, 2026-09-24:** runtime **ef945cc01a51099f3c27e13a61122ff3e6be862f**, Coolify deployment **k11t2xx3yzvakh3vpjkc20xa** (finished; running:healthy). Domestic Price lists → Compare prices is live, with supplier comparison and same-supplier old/new quotations. **247 native tests, 97 local server/review browser checks and 61 read-only live checks passed.** A fresh **464,877,213-byte recovery ZIP** was downloaded and verified with full database/evidence, matching prior source, archive/member hashes and isolated restored-copy startup. Retention: 3 verified managed ZIPs, 0 older ZIPs removed. Workspace revision **1513**, accounts, evidence bodies, audit records, archives and retry receipts match the pre-release snapshot. No live business-write requests were made. Supersedes candidate publication status for DEC-071 / WF-065. Private evidence: test-output/price-comparison-release/; recovery ZIPs: backups/releases/.


**Publication verified, 2026-09-24:** runtime **45b19d41f38ce9672f36ae3531dc261686941baa**, Coolify deployment **fvlltkmx31apzhb0h9pvlste** (finished; running:healthy). Frame assembly creation opens the parts editor; BOM save errors now have persistent, field-specific guidance beside Save. **247 native tests, 328 local server/review browser checks and 87 read-only live checks passed.** The live check exercised missing-reason recovery for all four frames and mobile 390/320px layouts without submitting business mutations. A fresh **464,883,507-byte recovery ZIP** passed download hashes, archive verification and isolated restore/startup checks. **4** verified managed backups retained; 0 older copies removed. Complete workspace revision **1516**, accounts, evidence, audit, archives and retry receipts match the pre-release snapshot. Supersedes candidate status for DEC-072 / WF-066. Private evidence: test-output/frame-save-release/.

**Publication verified, 2026-09-24:** runtime **7ed0898cc34fdd7e9ec97da7802f45e0d1c09112**, Coolify deployment **3xnrtzsjedqt7nbv6kgddydo** (finished; running:healthy). Assembly supplier-total comparison and BOM-based Domestic purchase orders with pictured PDF output are live. Executives prepare drafts; Managers/Admins issue and cancel. **264 native tests, 17 final focused checks, 184 local server/review browser checks and 22 read-only live checks passed.** Nine served runtime files match the tested commit. A fresh **464,909,914-byte recovery ZIP** passed download/hash, archive and isolated restored-copy startup verification; **5** verified managed ZIPs retained, none removed. Workspace revision **1528** and all business content remain unchanged; accounts, evidence bodies, audit records, archives and retry receipts match the backup exactly. Zero live business-write requests or runtime errors. No demonstration data was published. Supersedes candidate-only publication status for DEC-073/074 and WF-067/068. Domestic receipts, payments, stock/MRP and ERP transfer remain outside this release. Private evidence: test-output/domestic-po-release/; recovery ZIPs: backups/releases/.
**Publication verified, 2026-09-24 — DEC-075 / WF-069:** Supplier GSTIN/PAN changes are live at runtime 609bdce8bec24545aa152347ba50552ea9ad009f, Coolify deployment 3zphtqiphctqkty03jtvuyuj (finished; running:healthy). 20 focused native tests and 38 server/review browser checks passed before release; 26 read-only live checks passed. New supplier fields, existing-supplier tax edit with required reason, exact served source bytes and role retention verified. Fresh 464,926,368-byte recovery ZIP passed download/archive/hash and isolated restored-copy startup verification. Five verified managed ZIPs retained; oldest verified ZIP pruned. Entire workspace revision 1531, accounts, evidence, audit, archives and retry receipts match the pre-release snapshot exactly. Zero business writes during live checks. Supersedes local-only status above. Private evidence: test-output/domestic-tax-release/; backups remain in backups/releases/.