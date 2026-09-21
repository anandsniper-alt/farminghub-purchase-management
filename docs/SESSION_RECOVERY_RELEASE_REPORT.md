# Expired-session recovery release report

**Released:** 2026-09-21  
**Site:** https://purchase.dvjassociates.com  
**Runtime:** `6efbf29813a59ba372fd5755d014692a41713209`  
**Coolify deployment:** `matuydmgjm7fvtjyv71mv3va` — finished, running:healthy

DEC-062 / WF-056 is live. When a session or request token expires during a save, the open form and browser-selected files stay in place. The named account must sign in inline; another valid account cannot inherit the form. Reauthentication updates only the active session identity/token, does not submit the failed action and retains the original edit context. The user reviews the form and presses Save again; any concurrent record change still follows DEC-060 conflict review.

Verification:

- 225 native tests passed.
- 23 isolated two-user/session browser checks passed, including retained file selection, wrong-account rejection, no automatic submission, reviewed retry, standalone build startup and zero runtime errors.
- The Minimal mobile recovery and normal live purchase-order dialog were visually checked at 390 × 844.
- 15 read-only live checks passed: HTTPS health, exact committed `app.mjs`, `concurrency.mjs` and styles, recovery source, authenticated Order pipeline/Create PO, mobile fit, zero runtime errors and zero business-write requests.

Data protection:

- A fresh consistent 407,355,392-byte SQLite backup passed integrity and isolated restored-copy startup before deployment.
- Final live preservation remained at revision 1355 with 23 orders, 37 vendors, 389 items, 107 price lists, 133 file records and 1,455 workspace events.
- Every pre-release account, file body, audit event, soft-launch archive and request receipt remained present and unchanged; SQLite integrity remained `ok`.
- Persistent `/app/data`, the single application instance, HTTPS domain and port 8000 were unchanged. No schema migration, seed, reference reset or live test business write was performed.

Operators should refresh an already-open browser once to load the new client. Closing or reloading an unsaved form still discards it; this release protects an open form while reauthenticating in place.
