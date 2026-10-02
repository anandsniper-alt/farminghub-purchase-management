# Implements navigation consistency

2026-10-02 - DEC-104 / WF-098

## Change

Implements now reuses the main Farming Hub sidebar, module selector, original home/logo destination, breadcrumbs, account controls, Minimal theme and typography. Ten scoped tool links remain available. Implements settings is distinct from global Users & settings. The entire model card opens its BOM, including footer/flag area. Phone navigation has a 230px scrollable sidebar, scrim/Escape dismissal and focus restoration.

No BOM, PPM, weights, purchase/sales prices, charges, plans, orders, scopes or domain calculations were changed. Recent common additional costs total INR5,000 per model and remain present. Shared guide/motion inside the isolated module remains the earlier scoped exception; this release corrects navigation only. Current/10x/100x navigation requires no persisted records and does not change aggregate scaling limits.

## Candidate verification

An isolated authenticated preview imported the actual module revision 2 without modifying production. Eight focused tests passed: navigation destination/active/escaping contracts, existing main/domestic/vendor behavior, protected module permission/CSRF/revision/recovery/snapshot contracts and startup import graph. The standalone review build completed. Browser checks passed all ten scoped links, an SVG icon click, logo -> main home -> division -> module return path, full model-card footer click, module switching, and 390px phone menu/Escape/focus with no page overflow. Further main regression and production checks are recorded below when complete.

A fresh full production recovery snapshot was taken before this release; final restore/retention evidence follows. Candidate state alone does not establish live publication.


Further browser checks passed shared VMS and LAE Domestic navigation, Implements -> main version history, unsaved settings Keep editing (draft value retained) / Discard changes, and local sign-out returning to the main login. All ten module screens fit the desktop viewport. Direct file:// browser visual review was blocked by the browser URL policy; it was not bypassed. The standalone HTML build and automated build contract are the available review-artifact checks.

## Pre-release recovery verified

Fresh production snapshot at 2026-10-02T01:07:24.158Z: full SQLite 617,140,224 bytes, main revision 1859 and Implements revision 2. The 630,245,265-byte ZIP includes exact pre-release runtime source 4217df4e2adbb15f0f50b2572d57a6f45ce50bd0, database and recovery guide. Download/server checksum, archive CRC, extracted hashes, SQLite integrity/foreign keys and isolated startup passed. All nine tables matched before/after startup; zero business changes. The copied archive checksum matched and the newest five verified archives are retained in the established private backup directory. No private data or credentials are committed.


Full native regression suite passed: 334 tests, zero failures/skips, including standalone review build/dependency contracts. Final syntax and staged whitespace checks passed. No test database or operator artifacts are staged.
