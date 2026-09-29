# GSAP motion integration

2026-09-29 · DEC-100 / WF-094 · GLOBAL interface · local review only.

The user requested GSAP after the shared HIG revision. GSAP 3.15.0 core now replaces the Web Animations calls in `web/theme.mjs`. Page entry uses 280 ms, dialogs 240 ms and optional-detail reveals 220 ms with `power2.out` easing. Motion uses opacity and transforms; it does not delay clicks, alter values or change workflow gates. Existing CSS focus/hover feedback and mascot docking remain intact.

`web/vendor/gsap-3.15.0.min.js` is the unmodified npm browser distribution. Its notice, pinned package integrity and file checksum are documented in `web/vendor/README.md`. The native server explicitly serves this asset and `web/index.html` loads it before the application modules. `scripts/build.mjs` embeds the same file in standalone reviews. Docker already copies `web/`, so no runtime npm install or CDN is required.

Each transition owns a GSAP context. Completion restores original inline styles; replacement, removed DOM nodes or a change to reduced motion reverts the context and clears its tracking entry. The existing browser media-query listener prevents new transitions for reduced-motion users. If GSAP is unavailable, the interface remains visible and skips decorative transitions.

## Dependency assessment

- Need: explicit user request for GSAP; replace the existing motion implementation without introducing another framework or bundler.
- Alternatives considered: retain native Web Animations, use a CDN, or vendor GSAP core. Local vendoring matches the existing JSZip distribution model and preserves standalone review operation.
- Maintenance: pin 3.15.0; verify source/integrity and repeat lifecycle tests on upgrade. Upstream [installation guidance](https://gsap.com/docs/v3/Installation/) and [context cleanup](https://gsap.com/docs/v3/GSAP/gsap.context/) guide integration.
- License: [Standard No Charge GSAP License](https://gsap.com/community/standard-license/), with proprietary notices preserved. This purchasing application uses motion directly; it does not expose a visual animation builder. Do not relabel the library as MIT.
- Security: official npm package, no install scripts executed, no new external requests or authentication/data access in the motion wrapper. Version pinning/provenance do not certify absence of vulnerabilities; review upstream updates during maintenance.
- Performance: 72,927 additional uncompressed library bytes, no plugins or per-row animation. Current/10x/100x record growth does not create one animation per record; only rendered page/dialog/reveal containers animate. Existing data/render scaling limits remain separate.

## Verification

`tests/hig_browser_flow.mjs` verifies the pinned GSAP version in authenticated server and standalone review modes, actual GSAP calls for page/dialog transitions, inline-style restoration, interruption when reduced motion is enabled, and no new tweens under that preference. Existing label, focus, unsaved-form/BOM protection and 24-route desktop/mobile checks remain included. Relevant native server tests cover the unchanged authenticated runtime surrounding the new static asset.

HIG R060–R064 and R066 apply. Native Apple animation APIs are not applicable; retain the web adaptations in APPLE_HIG_APPLICATION.md. This change does not publish the previous HIG candidate or modify live records. A later release requires the established recovery ZIP and verification process.

Verification completed 2026-09-29: 24 native server tests passed. Authenticated server and standalone browser suites passed all 24 desktop/mobile route checks and GSAP lifecycle/reduced-motion assertions, with no JavaScript errors or business-state changes. Evidence: ignored test-output/hig-review/browser.json.

