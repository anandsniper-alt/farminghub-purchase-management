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
