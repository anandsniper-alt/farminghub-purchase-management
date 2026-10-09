# Final BL loading date — 2026-10-09

DEC-123 / WF-118. User confirmed that the final BL date is its actual loading/document date and may precede the recorded vessel-departure workflow date.

Changed shared `RECORD_BL` validation to omit the minimum departure-date comparison. Required valid dates, future-date rejection, shipment stage, evidence, permissions, correction reason and before/after audit history remain. No existing BL or departure values are changed automatically. BL-based credit terms still calculate due dates from the entered document date.

Based on fetched origin/main `3513e901a351f625ff5f874125a492d82f87e4a8`, preserving current landing-price and monthly-planner work. Cloud chat `Set up farminghub-purchase-management` reported the same request unimplemented because its environment was unavailable. GitHub CLI PR/CI discovery was unavailable (not signed in); remote branch fetch succeeded.

Focused validation: five BL/credit/insurance/arrival tests passed. A BL dated 2026-09-03 with departure 2026-09-28 saves and gives a 60-day due date of 2026-11-02. A reasoned correction retains both dates in audit history and recalculates credit. Blank, malformed, impossible and future dates, missing evidence and viewer writes remain blocked. Initial test-fixture errors were corrected to supply the existing late-departure reason and match the existing permission message; no runtime safeguards were relaxed for those tests.

Standalone review build passed (40,506,440 bytes), retained in ignored test-output. Server and standalone share the same domain command implementation. No UI redesign or data migration. Local change only; publication must follow the separate fresh recovery-ZIP and live-verification gates.

Final regression: **102 tests passed, 0 failed** across domain and server suites. Standalone bundle assertion confirms the corrected BL validation is included and the old departure minimum is absent. `git diff --check` passed. Local verified; not deployed.
