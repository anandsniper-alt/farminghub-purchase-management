# Integrated Vendor Management module

2026-09-13 · DEC-044 / WF-039 · local feature build, not published.

## Open and use

Open **Libraries → Vendor Management (VMS)** with the existing Purchase login. The local review build uses review roles, not live authentication.

1. A Purchase Manager sets up **Catalogues**: expos, sourcing stages, product lines, component tags and photo/document types. Deactivate an obsolete entry to retain its existing links.
2. Choose **Vendors**, search by supplier/reference/contact/city, and open the existing supplier. **Add vendor** and **Vendor master / import** use the established Purchase master workflow and stable codes.
3. **Edit profile** to enter multiple contacts, owner, location, expo, product lines, component tags, website, annual production volume and notes. The first contact is the shared primary contact; edits in either VMS or Vendor master synchronize primary name/email/phone/WeChat and city/country. Company name and vendor identity are not replaced with a person's name.
4. **Evaluate vendor** with available 1–5 ratings. View the calculation and individual scores in Evaluation breakdown. Ratings never automatically activate a supplier or approve a PO.
5. Record sample status, price/currency and quality notes under **Samples**. These are sourcing records, separate from order-specific pre-production sample approval.
6. **Add interaction** with notes or supporting files and a required next-follow-up date. Choose NOTE, CALL, MEETING, VISIT, ONLINE or DOCUMENT. Files use protected Purchase storage, supported extensions and the existing 50 MB per-file limit; one VMS submission accepts up to 20 files.
7. **Follow-ups** lists each supplier's latest dated interaction. Its owner, assigned Purchase owner or a Purchase Manager can complete/reschedule it with notes. Older interactions and changes remain recorded.
8. **Photos & documents** retains downloadable evidence. **Purchase history** opens the supplier's existing POs. **Sourcing risk** compares product and component coverage. CSV exports use Purchase's existing spreadsheet-escaping helper.

## Source and adaptation map

The supplied `FH-VMS-Full-Code (1).docx` was inspected read-only. It contains the same 133 recovered file sections already in `vms-reference/`: 127 application files match normalized text exactly; six differences are confined to README, deployment/environment/seed/configuration files. Those reference files were not executed, seeded or deployed. Example credentials are not part of the integration.

| Recovered VMS capability | Native Purchase integration |
|---|---|
| Dashboard and vendor directory/detail | VMS overview, searchable/sortable 12-row directory, profile and linked PO history |
| Vendor company/contact details | Existing vendor ID/code/company retained; shared primary contact and location synchronized; extra contacts and CRM fields extend that record |
| Expos, product lines, components, stages, photo types | Editable catalogues; inactive entries and existing links retained |
| Weighted evaluation | One shared calculation for domain and browser, including partial-score disclosure and breakdown |
| Samples | Explicit status, integer minor-unit price, USD/RMB/INR currency and quality/price notes |
| Interactions, follow-ups, attachments | Authenticated commands, dated interactions, completion/reopening with notes, retained protected files |
| Category and component concentration | Both source formulas retained separately, with assumptions shown; not actual purchase-spend analysis |
| User administration and role settings | Existing Purchase Users & settings; no second account store, legacy VIEWER promotion, JWT or role matrix |
| Vendor import | Existing stable-code Purchase import reused. The old VMS spreadsheet format is **not** automatically interpreted as the Purchase format |
| Offline queue/PWA install, voice recording, draggable column preferences, PDF/XLSX report writers, hierarchical geography administration | Not ported in this integrated version. Browser tables/CSV and city-region-country fields are available; no silent offline save/replay |
| Existing VMS database and uploaded historical files | Not supplied in this source document and not migrated. No external VMS synchronization or competing live writer enabled |

The old offline queue used last-write-wins updates. This build keeps Purchase's authoritative session, CSRF, division restrictions and optimistic workspace revisions. On a save conflict, reload/review before saving again. User administration, approval controls and PO deletion retain their existing permissions. Catalogue changes are manager-controlled, not approval-policy edits.

## Storage and permissions

`vendors[].crm` holds contacts, classification references, owner, evaluation, samples, interactions and document links. `state.vms` holds LAE Import catalogues. Missing metadata is backward compatible: the module renders without a database migration or startup write. Only explicit saves persist new metadata.

CRM write commands run through `shared/domain.mjs` and `applyVmsCommand`, inside the existing SQLite transaction. Files use the existing private file API. Vendor-scoped audit entries retain relevant before/after values; appending an interaction does not duplicate all prior interactions in its audit payload. No hard-delete command is added.

| Role | Access |
|---|---|
| Admin / scoped Purchase Manager | Profile, evaluation, sample and catalogue editing; interactions, evidence, follow-ups; existing vendor master actions |
| Scoped Purchase Executive | Read VMS; add interactions/evidence; update own or assigned follow-ups; existing Vendor master correction-request path |
| Scoped Product Manager / Viewer | Read VMS; no new write permissions |
| User without LAE Import | VMS data is unavailable; commands are rejected and configuration is removed from server projection |

## Calculation contracts

### Vendor evaluation

**Purpose:** consistent supplier evaluation, not purchase authorization. **Inputs:** optional integer ratings 1–5 and eleven weights (20, 15, 12, 10, 8, 8, 8, 6, 5, 4, 4 percent). **Formula:** sum(rating × weight) / sum(weights of rated criteria). **Output/units:** score out of 5, percentage, grade and recommendation. **Rounding:** score to two decimals; percentage = rounded score / 5 × 100, rounded to one decimal. **Grades:** ≥4.5 A+, ≥4 A, ≥3.5 B, ≥3 C, otherwise D. **Edge cases:** blank criteria excluded; no ratings returns null score/grade, not zero; invalid scores rejected; partial counts visible. **Example:** quality 5 at 20% and quality-control 3 at 15% → 145/35 → 4.14 → 82.8%, A, 2/11 rated.

### Sourcing coverage

**Purpose:** identify supplier alternatives/gaps. **Inputs:** vendor classification links, record status and sourcing stages. **Product formula:** count all suppliers linked to the product; Critical if count 0–1 or no supplier is ACTIVE, High at 2, Medium at 3, Low at 4+. **Component formula:** count linked suppliers in stages marked counts-in-sourcing, plus suppliers with no stage; High at 0–1, Medium at 2, Low at 3+. These are intentionally distinct source reports. **Outputs/units:** supplier counts, ordinal risk and illustrative equal-share percentage. **Rounding:** round(100 / count) to whole percent; zero suppliers displays no share. **Edge cases:** inactive supplier statuses are shown separately from CRM stages; a sourcing stage never makes a supplier ACTIVE for purchase. **Example:** three product suppliers, at least one ACTIVE → Medium and 33%; three eligible component suppliers → Low and 33%. No actual spend, order allocation or currency calculation is implied.

### Samples and dates

**Sample purpose:** retain supplier quoted sample price. **Formula:** existing `toMinor` parser converts explicit currency amount to integer minor units; display via `formatMoney`. **Units:** USD/CNY/INR minor units; no cross-currency conversion. **Rounding:** use existing two-decimal money input contract; blank stays null and zero remains zero. **Example:** RMB 125.25 → 12525 CNY minor units. Sample prices do not rewrite price lists, POs or remittances.

**Follow-up purpose:** next CRM action per vendor. Select the latest interaction by occurred date, then creation timestamp and ID. Completed timestamp → Completed; otherwise due day < today's shared `isoDay()` → Overdue, = today → Today, > today → Upcoming. This uses Purchase's existing ISO-day convention. Dates must be real calendar dates; next date cannot precede interaction; future actual interactions are rejected. A backdated note does not displace a later interaction. No background notifications/email messages or PO task copies are created.

## Validation and release boundary

Run `node --test tests/*.test.mjs`, `node scripts/build.mjs`, then `node scripts/test-vms-browser.mjs`. The browser runner uses isolated synthetic SQLite/browser data and headless Chrome; set `FH_PLAYWRIGHT_MODULE`, `FH_CHROME_PATH`, and optionally `FH_TEST_OUTPUT_ROOT` for the machine. Private artifacts and test databases stay ignored.

See [VMS test report](VMS_TEST_REPORT.md). This module is isolated on `feature/vms-module` from the production baseline. The separate audit trial is not bundled. No live vendor, PO, account, permission or deployment was changed by this work.
