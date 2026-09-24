# Domestic frame BOM save verification

Date: 2026-09-24. Status: published and verified.

The user reported that adding a frame BOM would not save. Reproduction confirmed that leaving the required revision reason blank stops native form submission while the application's error panel stays empty. With a valid reason, new and existing frames saved correctly even with unknown quantities or prices. No data-loss or server persistence failure was reproduced. The exact user's attempted inputs were unavailable.

The fix shows persistent guidance beside Save, identifies numeric errors by item code, focuses the invalid input, and preserves entered data. Creating a frame opens its parts editor directly. No audit requirement, cost formula, permissions, schema or snapshot rule changed.

## Current verification

- 247 native tests passed; 0 failures.
- 116 frame-specific browser checks passed: server and standalone review, each as Purchase Manager and Purchase Executive.
- 94 existing picker checks and 118 integrated supplier-to-model-cost checks passed again.
- Covered new Frame creation, automatic reference and direct entry, missing/whitespace reasons, fractional PCS and excessive price decimals, mobile 390/320px, partial Draft save/reload, completed frame cost (INR 112.50), retained revision history and all four pre-existing frame assemblies.
- Full model flow retained original costs until explicit assembly adoption. Existing Import records and masters remained unchanged in isolated tests.

Test sources: tests/domestic-frame-save-browser.mjs, tests/domestic-picker-browser.mjs, tests/domestic-full-flow-browser.mjs. Private execution evidence remains under ignored test-output/. All synthetic writes were local; live diagnosis was read-only at revision 1516.

## Use

Open Assembly BOMs, choose an existing frame and Edit BOM, or Add assembly BOM to create one. Select parts, enter known quantities and prices, and enter the revision reason. Press Save BOM revision. Unknown values remain Draft and can be completed later. A newly created assembly exists even if the subsequent parts editor is cancelled.


## Live release

**Publication verified, 2026-09-24:** runtime **45b19d41f38ce9672f36ae3531dc261686941baa**, Coolify deployment **fvlltkmx31apzhb0h9pvlste** (finished; running:healthy). Frame assembly creation opens the parts editor; BOM save errors now have persistent, field-specific guidance beside Save. **247 native tests, 328 local server/review browser checks and 87 read-only live checks passed.** The live check exercised missing-reason recovery for all four frames and mobile 390/320px layouts without submitting business mutations. A fresh **464,883,507-byte recovery ZIP** passed download hashes, archive verification and isolated restore/startup checks. **4** verified managed backups retained; 0 older copies removed. Complete workspace revision **1516**, accounts, evidence, audit, archives and retry receipts match the pre-release snapshot. Supersedes candidate status for DEC-072 / WF-066. Private evidence: test-output/frame-save-release/.

Saved-frame persistence was exercised only in isolated Manager/Executive workspaces. Live verification blocked all business-write requests and cancelled unsaved selections. Existing user draft tabs were not reloaded or discarded. The exact original user input remained unavailable; this release fixes the reproduced validation-feedback gap and assembly-entry continuation.
