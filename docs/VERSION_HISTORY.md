# Software version history

> Current project memory (2026-09-12): see [Project Rulebook](PROJECT_RULEBOOK.md), [Current Product Baseline](CURRENT_PRODUCT_BASELINE.md), [Decision Log](DECISION_LOG.md) and [Workflow Change Log](WORKFLOW_CHANGE_LOG.md). Historical release statements below remain evidence of their date, not necessarily current behaviour.

## 0.6.1-alpha.16 — 2026-09-12

Controlled PLM availability correction. A Base Item with no approved PLM revision no longer blocks PO submission or issue. The order displays a persistent amber **PLM specification not available** warning, records the condition in the audit trail and issued snapshot, and continues through the existing workflow without falsely approving PLM or requiring an override reason. If approved PLM revisions exist, selection remains mandatory.

Automated verification: **99/99 checks passed** (93 native + 6 browser).

Management acceptance: **Pending**. Deployment: **Not deployed**.


## 0.4.1-alpha.8 — 2026-09-12

Current review build. Corrects the LAE Import order workflow so every mandatory commercial, production and shipping gate is visible in the top timeline and has a direct next-action control. The sequence now runs from PO creation/approval through supplier acknowledgement, PI, technical/artwork confirmation, SWIFT-backed payment, production lead time, separate pre-production sample completion/approval, bulk production/QC/completion, container booking/release, structured China inland tracking, CI/PL, vessel loading, final BL, insurance and India-port arrival.

The separate pre-dispatch QC stage is removed. Bulk-production QC remains mandatory before production completion. Final BL and insurance are post-vessel controls, in that order. Physical India-port arrival completes the operational order workflow while financial settlement may remain open.

Automated verification: **145/145 checks passed** (76 native + 28 Purchase browser + 7 PLM + 7 Shipping + 5 Supplier Price List + 22 dedicated end-to-end workflow).

Farming Hub Brand Guidelines remain the visual source of truth; no brand-system deviation was introduced.

Management acceptance: **Pending**. Deployment: **Not deployed**.

## 0.4.0-alpha.7 — 2026-09-12

Adds a supplier commercial price-list master for LAE Import. Product-wise supplier prices can be maintained independently in **RMB/CNY** and **USD** with effective date, supplier reference, remarks and full revision history. Revising a price preserves the earlier same-currency entry as superseded history.

When a new PO uses a supplier + brand SKU + currency with a current price-list entry, the latest price is auto-filled. Purchase may still enter a different negotiated price; the application shows a visible warning and snapshots the price-list revision/override state onto the PO. Later supplier price revisions never rewrite an existing PO snapshot.

The 0.3.3 Farming Hub Brand Guideline implementation remains unchanged and is the visual source of truth. Seeded prices are demonstration values only.

Automated verification: **117/117 checks passed** (71 native + 27 Purchase browser + 7 PLM browser + 7 Shipping browser + 5 Supplier Price List browser).

Management acceptance: **Pending**. Deployment: **Not deployed**.

## 0.3.3-alpha.6 — 2026-09-12

Current review build. Reworked the application to the user-supplied **Farming Hub Brand Guidelines** and supplied RGB logo. Primary colors are `#204321` and `#C5DA41`; the approved secondary palette is used for operational accents; AmsiPro is declared as the preferred typeface with system fallbacks because no licensed font file was supplied. Logo proportions, clear-space, color and no-effects rules are enforced in the application surfaces.

The original guideline PDF and RGB logo are bundled under `docs/brand/` as the visual source of truth for future revisions. This is a visual/brand-compliance release only; Purchase, PLM, Shipping, payment, QC, freight and database rules are unchanged.

Management acceptance: **Pending**. Deployment: **Not deployed**.

## 0.3.2-alpha.5 — 2026-09-12

Official Farming Hub logo applied to sidebar, login, favicon and Purchase Order print header using the unmodified public company asset at https://farminghub.in/wp-content/uploads/2025/09/farming-hub-re.png. Branding-only release; no workflow, business-rule or database changes.

Management acceptance: **Pending**. Deployment: **Not deployed**.

## 0.3.1-alpha.4 — 2026-09-12

FarmingHub.in corporate-theme refresh across Purchase, PLM and Shipping UI. Visual-only release: no business-rule, database or workflow changes. Public reference: https://farminghub.in/.

Management acceptance: **Pending**. Deployment: **Not deployed**.

## 0.3.0-alpha.3 — 2026-09-12

Current review build. Adds LAE Import Shipping & Freight Control on top of the Purchase + PLM alpha. New controls include mandatory pre-production sample approval, bulk-production QC before production completion, container booking and release, structured China inland milestones, manual weekly forwarder tracking Excel import by forwarding-agent Ref, preserved planned/revised/actual dates, pre-vessel QC/document/insurance/BL-draft gates, vessel/voyage capture, India destination-port arrival, weekly freight benchmarks, >USD 100 variance warning and rate trend/advance-booking watch.

User-supplied VJ weekly tracking and Week-36 rate spreadsheets are retained as reference/test inputs. Cost-per-USD remains deferred until a costing sample is supplied. Live carrier APIs and same-supplier cross-PO combined loading remain future work.

Management acceptance: **Pending**. Deployment: **Not deployed**.

## 0.2.0-alpha.2 — 2026-09-12

Adds integrated PLM to the LAE Import purchase-management alpha: category-specific specification templates, controlled technical revisions, Product Manager approval/rejection, predecessor/successor model lineage, brand-specific deltas, artwork revisions, PLM documents and audit history. Existing PO snapshots remain immutable.

Management acceptance: **Pending**. Deployment: **Not deployed**.

## 0.1.0-alpha.1 — 2026-09-11

Initial working LAE Import purchase-management alpha covering PO, PI/payment, production, artwork, shipment, QC, Item Master upload and audit controls.

Management acceptance: **Pending**. Deployment: **Not deployed**.

Requirement-document versions, PO revisions, PLM technical revisions, artwork revisions and freight-rate weeks are separate version namespaces from the software release number.

## 0.5.2-alpha.13
- Supersedes 0.5.1-alpha.12.
- Corrects Commercial Terms & Planning UI: Supplier-agreed TAT override reason appears only when production commitment differs from vendor standard days.
- Native tests passed: 84/84.
- Browser test could not run in this container due missing Chromium executable.
