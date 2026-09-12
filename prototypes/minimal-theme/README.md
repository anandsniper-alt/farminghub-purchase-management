# Minimal theme lab - experimental

Status: working local sample, awaiting user review. Not approved for production and not published.

Open http://127.0.0.1:8137/#/orders while the preview server is running. The self-contained preview.html can also be opened directly after building.

Build/run from the repository root:

```powershell
node prototypes/minimal-theme/build.mjs
node prototypes/minimal-theme/serve.mjs
```

The server binds only to 127.0.0.1 and serves only the generated HTML. It has no API or write endpoints. Stop it with Ctrl+C in its running session. FH_THEME_PORT may select another local port.

Use Replay animation to replay the page entrance in Minimal. It is disabled in Current and when the device requests reduced motion. Use Current / Minimal at the top to compare the same sample records. Show page guides restores explanatory subtitles. Workflow stages, lengthy informational guidance and More actions can be expanded. The Current comparison retains the existing layout with the common preview strip; its inaccurate clean-build seed banner is replaced by the preview strip's sample-data notice.

What is being proposed:

- Existing Farming Hub logo, green/lime palette, font stack and icon set.
- Quieter borders/cards, lighter heading weights, fewer decorative elements and concise Overview title.
- General page/panel explanations optional; long informational guidance expandable.
- Current workflow stage visible; complete timeline and additional actions expandable.
- Unimplemented division placeholders omitted from Minimal, still visible in Current.
- Page entrance 280 ms, dialogs 240 ms, disclosure reveal 220 ms; control hover/focus colour transitions 120-150 ms. No animation on each search keystroke. Reduced-motion preference disables JS/CSS motion.

Safety/functional boundaries:

- All approval, financial, validation and workflow code is reused unchanged.
- Required labels, form guidance, approval/deletion warnings, errors, amounts and statuses remain visible.
- Uses eight illustrative records from shared/seed.mjs, not the live database or its TEST-SORT records.
- Separate localStorage key fh-theme-lab-v1-state and IndexedDB fh-theme-lab-v1-files. No .env or live login.
- Existing application source, normal build, production server and Docker context remain unchanged. Generated preview.html is ignored.
- Theme/layout switches do not mutate business data. User form actions affect only the sample browser workspace.

Review suggested: compare the pipeline, open an order, expand the timeline/More actions, try a sample form, inspect overview/payments/settings, and check a narrow/mobile viewport. Decide what to keep before any production integration. Rejecting this sample requires no production rollback; discard the prototype files and mark DEC-020 rejected while retaining project history.

Automated verification:

```powershell
node prototypes/minimal-theme/check.mjs
```

Requires the existing local Playwright runner and Chrome. Set process TMP/TEMP and FH_TEST_OUTPUT_ROOT to a spacious test directory if needed. 41 browser checks passed on 2026-09-12: comparison/storage isolation, guide toggles, sorting/filtering, expandable stages, required form validation and sample save, preserved deletion/approval disclosures, nine module views, actual animations, reduced motion, mobile controls, no live-host/API requests and no browser runtime errors. Evidence is recorded in docs/WORKFLOW_BROWSER_TEST_REPORT.md.


## GAJA guided support - DEC-021

An opt-in Guide me launcher opens a native modal walkthrough with the user-requested GAJA elephant, step count, highlighted control, concise explanation, Next/Back, Skip, Finish and Escape. Reopening restarts the current page tour. Pipeline, order detail, overview, payments and settings have tailored steps; other pages use only visible heading/filter/tab/table steps. Unavailable controls are omitted. The tour never invokes application actions or changes orders, forms, roles, approvals or financials. It hides during business dialogs, closes on route/target replacement, contains keyboard focus and restores it on close. Mobile uses a bottom card; 220ms entry respects reduced motion.

Refresh the preview and choose Guide me at the bottom-right. Help is available in both Current and Minimal. Close it to use the highlighted control, then reopen when needed. This is authored page guidance, not a chatbot or a complete transactional training flow. No automatic popups or external service calls.

Files: support.mjs, support.css, assets/gaja-guide.png. Asset provenance and exact built-in imagegen prompt: assets/README.md. Run node prototypes/minimal-theme/check-support.mjs for guide acceptance, and check.mjs for existing theme regression. Production integration remains pending user review.


## Multiple mascot poses - DEC-022

GAJA wears Farming Hub green with lime trim. The launcher/first step uses a welcoming wave, intermediate explanations use a pointing pose, and the last available step uses a thumbs-up. Back/reopen restores the matching pose. The final pose marks the end of help only; no order status or approval changes. Images load from the embedded local asset manifest with stable dimensions and existing reduced-motion behavior. Asset paths and exact generation prompts are in assets/POSE_PROMPTS.md. Refresh the local preview to load the new build.


## Farming Hub branding - DEC-023

The user replaced GAJA lettering with Farming Hub logos. The active three-pose set is now assets/farminghub-welcome.png, farminghub-pointing.png and farminghub-ready.png. The guide header uses the original repository logo; guide text and accessible labels use Farming Hub. Previous GAJA files remain historical references only. See assets/BRANDING_PROMPT.md for the built-in imagegen edit prompt and sources. Refresh the preview to load the new artwork.


## Current support behavior - DEC-024

The Farming Hub logo and mascot remain in a fixed, keyboard-accessible dock on pages, in business forms and while the tour is open. Tap to open guidance; tap again to close. Order guidance starts with the actual primary action already rendered for the current role. In a form, it starts with a displayed error or invalid visible field, then a review/submission explanation. Take me there closes help and focuses the target without clicking it, submitting, approving or changing values. Guide Escape leaves the underlying form and unsaved entries intact. Back/Next/Skip/Finish remain, and mobile reserves space for the dock. No AI, API key, chat input or external model call is used.

This supersedes earlier guide documentation saying the launcher hides during forms. On any order, tap the mascot to find its next available action. In an unfinished form, tap it to locate an error or missing field. Take me there returns focus for you to continue. No OpenAI setup is needed: the user explicitly deferred the proposed API integration, and all provisional AI/chat files were removed. Existing local start/build commands are unchanged.


## Guide toggle preservation - DEC-025

Show page guides stays visible and enabled in Minimal, including mobile. It restores page explanations on demand and becomes Hide page guides; the mascot continues to provide separate contextual steps. The preview now includes the corrected native application views and guards from DEC-025. Production adoption is still pending.
