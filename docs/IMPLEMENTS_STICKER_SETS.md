# Implements sticker sets and common name plate

User-confirmed module rule, 2026-10-02; DEC-108 / WF-102.

Every catalogue model uses one common **Warning sticker set**, one **brand sticker set matching its series**, and one common **Name plate**. Brand items are separate shared identities for Emperor, Leader, Minister, Deltavator and Bananovator. A sticker set is counted as one pcs entry representing the complete set. Warning sets and name plates aggregate across models in MRP; brand sets aggregate only within their series.

The combined Sticker kit is superseded in current BOMs and labelled legacy in the Item Master. Its identity, previous item snapshot and model histories remain available. No historic purchase order, stock balance or plan was reassigned. All six new sticker identities have price, supplier and actual IMP/Tally code pending; the common name plate retains its existing identity and pending price/code. Missing details are flagged per model. These identifiers are internal identities, not invented Tally codes.

## Applied and verified

Authenticated online data-only update: Implements revision 6 to 7, with optimistic revision, fresh before-state, append-only server audit and saved-state reread. All 187 model allocations are correct, including the three Bananovators. The 17 existing complete/active BOMs remain 17; adding these accessories does not make the other 170 model BOMs complete. Each changed model retains its previous lines/fabrication/costs in history and increments its revision. Thirty-four prior sticker/name-plate quantity records are resolved; 561 model/item records retain pending commercial details. Original source comparisons stay unchanged.

Validation checks one of each item per model, no combined-kit active use, no brand mismatch, retained model metadata/fabrication/other PPM, unchanged purchase prices, known cost totals and other cost rows. An isolated two-machine plan for each of the 17 active BOMs verifies 34 warning sets and 34 name plates, with brand demand grouped by series. Bananovator remains blocked for MRP while its full BOM is pending. Synthetic plans were not saved online. Main purchasing state, revision 1859 and 36 orders are unchanged. Live Minister S3.V14 Accessories filter visibly shows all three quantities as 1 with Price pending.

No runtime code or hosting change. This records the confirmed allocations; copying a BOM from another series must preserve or remap the target series brand item before use. The existing copy operation's automated target preservation is currently implemented for PTO; equivalent automatic brand remapping is not part of this data edit.


**Sticker/name plate prices confirmed - 2026-10-02 (DEC-108 / WF-102 follow-up):** Live Implements revision 8 stores user base quotes with transport included once: warning 49 +5%=51.45; Leader45 +5%=47.25; Emperor47 +5%=49.35; Deltavator65 +5%=68.25; Minister56 +5%=58.80; Bananovator70 +5%=73.50; common name plate70 +2%=71.40. All quantities remain 1 per machine. Previous price entries retained in append-only histories; supplier and actual IMP/Tally codes remain pending in 561 model/item flags. Shared costing and isolated MRP verify the same landed rates, with every model's known cost increasing only by its warning + matching brand + common name plate total. No other prices, BOMs, fabrication, plans, stock, orders or model histories changed; main revision1859/36 orders and whole-state hash retained. Fresh before-state, optimistic save, server audit and reread passed. Data-only edit; no runtime deployment.
