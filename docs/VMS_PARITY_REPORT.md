# VMS module restoration

2026-09-13 · DEC-046 / WF-041 · local `feature/vms-module-parity`, **not published**.

The first VMS release adapted the core CRM, with five combined tabs. It did not reproduce the twelve-module navigation in the supplied VMS. This update restores those entry points within the native Purchase application, on top of the pending Minimal-only/personal-guides change (DEC-045).

## Module map

| Original module | Restored screen and behavior |
|---|---|
| Dashboard | Supplier, follow-up, evaluation and expo summaries; due follow-ups and sourcing pipeline. |
| Vendor Follow-up | Latest interaction per supplier; due/status/search/sort, complete/reopen with existing role checks. |
| Vendors | Shared Purchase suppliers, contacts, evaluation, samples, interactions, evidence and purchase history. Existing vendor master/import is reused. |
| Analytics | Vendors per grouped/ungrouped product line, component and stage; product-line counts per vendor; drill-down to matching suppliers; CSV. |
| Expos & Fairs | Dedicated list, add/edit, edition/year/location/date range, active/inactive, linked supplier counts and drill-down. |
| Product Lines | Dedicated product-line and group maintenance, descriptions, group assignment, linked suppliers and CSV. |
| Component Tags | Dedicated maintenance and linked supplier counts, drill-down and CSV. |
| Sourcing Risk | Existing product and stage-filtered component coverage calculations, kept distinct. |
| Pending Sync | Account-owned durable queue for profile edits and text interactions; automatic non-conflicting sync; conflict comparison, explicit resolution, retry and discard. |
| Get the App | Installable web manifest, browser installation control when offered, Safari instructions and public offline reconnect page. No native APK was supplied. |
| Users & Roles | Existing Purchase user/role/division portal and approval controls. Admin management remains Admin-only; no separate VMS account database. |
| Settings | Personal page guides plus vendor stages, photo types, product classifications, countries/regions/districts and manual currency references. Existing catalogue types are also accessible here. |

Each module has a durable `#/vms/module/<module>` route, visible submenu and mobile module selector. Existing `#/vms/<vendor-id>` links remain valid. The sidebar reuses approved green/lime colors with readable inactive entries. Current/Minimal switches and top guide toolbar remain removed.

## Operating workflow

1. Open **Libraries → Vendor Management (VMS)**.
2. Maintain expos, product groups/lines and component tags in their named modules. Use Settings for supporting catalogues. Deactivate obsolete entries; preserve historical links.
3. Open a supplier and edit its profile. Location catalogue choices cascade country → region → district. Existing free-text locations remain supported. Product classifications are separate from multi-select product lines, reflecting distinct original source entities.
4. Use Analytics or catalogue supplier counts to open a filtered supplier list. Return through Vendors to clear the drill-down filter.
5. Use the existing Purchase account in Users & Roles. Purchase Managers can manage VMS catalogues and profiles, but cannot create accounts or alter approval policies.
6. Open VMS before losing connectivity. Profile edits and text-only interactions can be saved locally from the open workspace. Reconnect while signed in; allowed, non-conflicting edits sync automatically. The queue also resumes on the next authenticated startup.
7. Review conflicts in Pending Sync. Compare current values with the proposed changes. **Apply my reviewed changes** explicitly rebases only originally edited fields onto the reviewed profile. Unrelated changes remain. Another intervening change can still stop the submission.
8. **Discard** asks for confirmation and removes only the unsynced browser record. It never deletes a saved vendor or PO. For a validation/permission failure, restore the prerequisite and retry, or discard and re-enter a corrected edit.

## Offline boundaries and data protection

- Queue scope: existing vendor CRM profiles and text-only interactions. Attachments, new supplier creation, evaluation/sample/catalogue writes, purchase approvals and payments require a connection. No last-write-wins replay or automatic financial operation.
- One pending edit of each supported type per supplier per login. Storage is separated by login and origin; individual queue keys avoid replacing an entire outbox from another tab. Different tabs may retry the same request safely.
- Local queue records contain the submitted CRM fields and their comparison baseline. They contain no passwords, session tokens or cached API bootstrap. Use the same browser and login; clearing site data removes unsynced edits. They do not roam across devices.
- An open page supports offline entry. A closed/reloaded offline page shows a reconnect screen. The service worker caches **only `/offline.html`**, never API responses, authenticated business state, attachments or app transactions. The reconnect form forces a real page request, including when only the route hash differed.
- The server rechecks current identity, active role/scope, domain validation and workspace revision on every replay. User/role changes are not bypassed.
- Profile conflict comparison covers editable CRM fields; disjoint edits merge, overlapping different values stop. Related location fields still pass hierarchy validation after a merge. Purchase eligibility, commercial defaults and issued snapshots are outside the queued payload.
- Each request has an account-owned ID and bounded signature receipt on the vendor. Replaying after a lost acknowledgement returns the existing result without a second business audit event or duplicate interaction. Reusing an ID with different content fails. Compact receipt retention grows with synced edits; retain it while clients may still retry.
- Browser storage failure before queuing leaves the form open. Conflict rebase saves the replacement before removing the original, so storage-full failure does not lose the original edit.
- Server availability is checked on reconnect/startup and retried every 30 seconds while the app is open. No OS background execution is promised. Expired sessions wait for sign-in; validation/permission failures remain for attention.

## Calculations and compatibility

**Analytics purpose:** show sourcing coverage, not spend or order approval. **Formula:** count scoped vendors linked to each catalogue ID; vendor coverage is the number of distinct linked product/component IDs on the profile. **Inputs:** scoped vendors, CRM tag/stage references and configured groups. **Output/units:** integer supplier/product/component counts. **Rounding:** none. **Edge cases:** empty catalogue and zero-coverage rows remain visible; inactive linked entries are retained; missing stage does not count in a named stage. Groups organize lines; their counts are not added into a misleading unique-supplier total. **Example:** one supplier linked to Engine and Pump produces one vendor in each line and two product lines for that supplier.

**Currency references:** optional manual metadata, one entry per USD/CNY/INR, positive decimal up to six places, dated; INR must equal 1. No new monetary calculation consumes these values. No automatic rate provider, sample-price conversion, PO repricing or bank/BOC linkage is introduced. The supplier-agreed PO/PI rate and controlled revision rules remain authoritative.

The eleven-criterion evaluation, follow-up selection, product risk and component risk formulas remain in shared helpers, documented in VMS_MODULE.md. Groups and location collections default to empty for old states; existing IDs, company identity, contacts and transaction history remain. All new catalogue/profile mutations use the same native command transaction/audit path.

## Remaining source differences

These twelve working entry points are **not a claim of complete old-stack feature parity**. The following remain unported or unavailable: offline cold-start business editing, offline new-supplier/file capture, voice recording/transcription, column designer, original spreadsheet import format, geography bulk import/template, PDF/XLSX report writers, automatic currency-rate refresh/reference sample conversion, native Android APK and historical VMS data migration. Current CSV exports and existing Purchase master imports remain available. The recovered React/Express/Prisma source is reference material; it is not deployed alongside Purchase.

## Verification

- **169 native tests passed:** the 168-test native suite plus the added outbox storage/account/reconnect test. The 20 VMS domain tests were rerun after final domain changes.
- **53 new browser checks passed** in isolated authenticated server and standalone review modes: all twelve routes/reloads, supporting editors, cascade selection, grouped analytics/drill-down, role restrictions, per-login guide control, mobile width, queue/reconnect, conflict review, offline reload, lost-response retry and account isolation.
- **39 existing VMS browser checks passed**, including contacts, evaluations, samples, multiple evidence, downloads, search, CSV, follow-ups, viewer restrictions and responsive dialogs.
- Zero browser runtime errors. Purchase orders, payments and price-list collections matched their synthetic fixture baseline. No live website data was read or mutated by this testing; all fixtures remain in ignored test-output.
- Screenshot review caught low-contrast submenu labels and a screenshot taken during an animation. Submenu colors were corrected to the existing sidebar palette. Route transitions retain reduced-motion support.
- Browser install manifest/reconnect behavior is implemented; actual installation on physical Android/iOS devices and a native APK are not claimed as tested.
- Review build regenerated. Diff whitespace check clean. Preview: `http://127.0.0.1:8138/#/vms`.

Private evidence: `test-output/vms-parity-1789301530454/report.json` (53 checks), `test-output/vms-1789301450088/report.json` (39 checks), native logs and screenshots. These paths refer to this isolated feature worktree. This change has not been pushed or deployed.
