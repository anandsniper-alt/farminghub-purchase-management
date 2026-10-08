# Farming Hub UI and change rulebook

2026-09-29 · DEC-101 / WF-095 · GLOBAL RULE · Confirmed by the user's request to keep the learnings permanent.

## Authority and scope

Read this before creating a module or changing an existing screen. It turns the approved DEC-098–100 implementation and verified release lessons into reusable requirements for LAE Import, Domestic, VMS and future modules. It extends the [project rulebook](../PROJECT_RULEBOOK.md), [brand rulebook](../BRAND_RULEBOOK.md) and [engineering standards](ENGINEERING_STANDARDS.md); it does not create a second decision ledger.

The [Apple HIG reference](../APPLE_HIG_RULEBOOK.md) is preserved unchanged. Use [the web adaptations](../APPLE_HIG_APPLICATION.md), relevant HIG rule IDs, semantic HTML and CSS units. Native Apple assets, fonts, materials and APIs are not automatic web requirements. User-approved business rules and later explicit decisions remain authoritative. Record material exceptions in the existing DEC/WF logs with scope, reason and superseded rule; do not silently reopen settled choices.

## Required rules for every affected module

| ID | Rule | What to verify |
|---|---|---|
| UI-01 | Understand -> document -> standardise -> preserve -> improve. Search and reuse shared components before extending/refactoring or creating a new one. Confirm the active checkout and its actual runtime source. | Identify current behavior, governing DEC/WF entries and affected shared screens; leave unrelated work intact. |
| UI-02 | Keep Farming Hub branding, approved logo/typography, green/lime identity and Minimal as the standard. Appearance/help preferences remain per login in Settings. | No duplicate theme system or new top appearance toolbar; follow shared tokens. |
| UI-03 | Use clear headings, consistent spacing, plain action labels and a visible next step. Keep obligations, required fields, pending work and actionable warnings visible; disclose optional detail progressively. | A user can identify what is pending, what to enter and what happens next without technical knowledge. |
| UI-04 | Give every input a programmatic name and associate relevant help/error text. Use semantic controls, visible focus and status text/icons in addition to color. Measure actual rendered contrast rather than trusting a token name. | Keyboard access, sampled normal text contrast of at least 4.5:1, readable errors and native required/disabled states. |
| UI-05 | Reuse responsive panels/forms. Mobile controls use the approved minimum 44 CSS-pixel height; this is a web choice, not a conversion from Apple points. Support larger text without losing required actions. | Desktop/mobile, narrow viewports and relevant text zoom; no page-wide overflow. Dense tables may scroll inside a named keyboard-accessible region. |
| UI-06 | Tables retain meaningful column headers, readable values and tabular numeric alignment. Summary cards/charts intended for drill-down open the matching filtered list. | Filters, counts, sorting, pagination and exports use consistent scope; keyboard users can reach the same result. |
| UI-07 | Dialogs focus their heading/appropriate entry point, isolate background interaction, keep focus within visible enabled controls, and return focus after closing. Nested dialogs/pictures own their Escape handling. | Tab/Shift+Tab, open/close, error focus, nested overlays and restored background access. Hidden controls must not enter the focus loop. |
| UI-08 | Cancel, Close, Escape and leaving/reloading protect unsaved entries. Explicit Keep editing / Discard changes preserves user intent. Track button-driven line additions/removals as well as typed fields. Successful saves still close normally. | Unchanged forms close without a false warning; changed forms retain data until explicit discard; no claim of durable autosave. Saved financial records use existing audited correction commands, not generic Undo. |
| UI-09 | Hide the mascot launcher and tour globally for every user and module (DEC-120, user instruction 2026-10-08). Keep normal page-guide preferences and shared accessibility/motion. Do not reserve mascot space when the dock is absent. This supersedes the earlier requirement to keep the mascot visible. | No mascot launcher, dock or tour in server/standalone pages; reachable footer controls and normal notification positioning on mobile and desktop. |
| UI-10 | Use the existing GSAP shared motion path for page/dialog/disclosure transitions. Motion explains a change and never delays an action or becomes the only status indicator. | Short restrained opacity/transform transitions; no new continuous loops, per-record stagger or duplicated animation engine. See the motion contract below. |
| UI-11 | Separate screen presentation from issued PO/PDF presentation. Preserve immutable issued snapshots, images, contacts and approved pagination rules. | Screen-only changes stay screen-scoped. If print/shared print markup changes, verify exported PDF content and multi-page layout independently. |
| UI-12 | UI convenience cannot weaken permissions, division scope, QC/payment gates, references, money calculations, revision conflicts, retry safety or audit history. | Keep enforcement in shared domain/server commands. Test affected invariants; do not infer permission from a visible button. |

## GSAP motion contract

- Reuse the vendored core and shared enhancer described in [GSAP_MOTION.md](../GSAP_MOTION.md). The approved release uses 3.15.0; this is a pinned baseline, not a claim that it stays newest or vulnerability-free. Upgrade deliberately with provenance, license/security/maintenance review and focused tests.
- Keep the same local asset available through the server static route and embedded standalone build; Docker must include it. Preserve upstream notices. Avoid a CDN dependency for these shared transitions. A missing animation asset must not prevent app operation.
- Current shared durations are 280 ms for pages, 240 ms for dialogs and 220 ms for optional detail. Reuse these defaults; document a justified change rather than scattering new timings.
- Respect prefers-reduced-motion on initial load and when it changes mid-transition. Stop active contexts immediately, restore original inline styles and prevent new decorative motion while enabled.
- Revert contexts on completion, replacement and detached targets. No lingering opacity/transform, accumulating listeners/tweens or per-row work as record volume grows.
- Test the actual GSAP path in both server and standalone modes, cleanup after completion/interruption, and useful fully visible content without motion. Do not treat visual movement alone as proof of lifecycle correctness.

## Verified lessons to carry forward

These are lessons from the September 2026 work, not fresh results for a future change.

| Lesson | Problem prevented | Applies to / boundary |
|---|---|---|
| A high-specificity shared selector can override sidebar contrast even when its color token is correct. Inspect rendered styles on each surface. | Pale/unreadable navigation introduced by a general text rule. | Shared CSS; do not assume one white-panel sample covers the green sidebar. |
| Input/change listeners miss Add/Remove row buttons. Compare the form structure/values as well as dirty events. | Lost BOM edits on dismissal. | Dynamic forms; not authorization to autosave or mutate financial history. |
| A nested picture viewer and its parent edit dialog need distinct Escape behavior. | Losing an item edit while closing a picture. | Nested overlays; test the affected stack explicitly. |
| Motion interruption must restore styles, not merely kill a tween. | Content stuck faint, translated or scaled after navigation/reduced-motion changes. | GSAP contexts and future animated containers. |
| Shared UI changes affect many routes, and native-server success does not prove standalone behavior. | Broken review builds and regressions in another module. | Shared components; select representative routes plus affected end-to-end flows. |
| Running source, deployment source and a local checkout may differ. Verify the exact release and build asset hashes. | Publishing an untested checkout or archiving mismatched recovery source. | Every release; previous commit IDs and test counts are historical. |
| A downloaded file existing is not proof of a complete recovery backup. Verify size, hashes, archive members and isolated restore. | Truncated or unusable recovery copies. | Every live release, including UI-only changes. |

## Required change review record

For each significant change, record in the existing owner documents:

1. Request, affected module/shared components, current rule and confirmed scope.
2. Reused components, relevant UI/HIG rule IDs and justified exceptions.
3. Expected/observed behavior with evidence and Pass / Fix / Not applicable / Not tested. Mark missing accessibility evidence honestly.
4. Affected desktop/mobile/keyboard, larger-text, reduced-motion, loading/empty/error/success and recovery scenarios. Run only relevant checks; meaningful finance/auth/concurrency tests remain required when those contracts change.
5. For shared code: both authenticated server and standalone review verification. Existing tests/hig_browser_flow.mjs provides a reusable regression harness; extend where the new risk requires it, rather than copying a previous pass count.
6. Implementation, local verification and live verification as separate dated statuses. A proposed rule, copied-data demo or historical report is not production proof.

## Release and recovery rule

Follow [BACKUP_RESTORE_RUNBOOK.md](../BACKUP_RESTORE_RUNBOOK.md) before every live release. Download a fresh consistent production snapshot and package it with matching running application source, recovery instructions and a checksum manifest into a private ZIP. Verify the complete download, archive integrity and isolated candidate startup/restore before release push/deployment. Keep the five newest verified managed ZIPs in the main checkout's ignored backups/releases/; prune only older managed copies after the new archive passes, with checked paths. Failure blocks release.

Deploy the exact tested commit; verify healthy runtime, served assets, affected live screens and read-only data preservation. Reconcile legitimate concurrent changes instead of overwriting them. Demos, credentials, databases, backups and private test artifacts stay out of Git and public output. Keep temporary maintenance credentials private, restrict access, avoid printing their values and remove them after use. Do not turn release snapshots into a claim that scheduled off-site backup is configured.

A documentation-only update needs document/link/scope checks, not a production deployment or a fresh database read. This rulebook does not itself authorize unrelated code changes, infrastructure changes or future publication.

## Evidence and ownership

The [HIG review](../HIG_UI_REVIEW.md), [GSAP assessment](../GSAP_MOTION.md) and [2026-09-29 release report](../HIG_RELEASE_REPORT.md) record the implementation that informed these rules. They are not an exhaustive accessibility certification or a capacity guarantee. Future maintainers must update the applicable rulebook, baseline, learnings and append-only DEC/WF records in the same development cycle when an approved rule changes.
