# Concurrent access

Different users may remain signed in and work on separate orders or suppliers. This release fixes unnecessary whole-workspace conflicts; it does not introduce shared logins or change role permissions.

If another user changes the same record or a required dependency, the save stops safely. Keep the form open, select **Review latest changes**, inspect the linked saved record, then confirm keeping your entries. **Continue editing with my entries** adopts the reviewed version without submitting. Review your entries and press **Save**. Selected attachments remain in the form and successful uploads are reused on retry.

Independent new POs allocate their numbers from the latest transaction. Payment changes guard all associated orders; orders also depend on their suppliers, forwarders and shared configuration/catalogues. Supplier changes and personal settings have bounded guards. Shared-master/administration commands remain conservative; this is not automatic field merging.

Server-issued AES-GCM contexts bind versions to actor and revision, expire after eight hours and reset with the application process. An expired view follows the same review path. Old clients without contexts retain strict revision checks. GET /api/revision is authenticated; idle views check every 15 seconds and on focus. Open/dirty forms and conflict panels prevent replacement.

Implementation: server/concurrency.mjs defines the dependency catalogue. Review that catalogue whenever adding a command; unknown commands compare all business state. Identity, authorization, current business validation, immediate SQLite transactions, immutable references and append-only audit remain authoritative. Uploads append evidence and cannot advance a pinned form context. No schema migration or reference reset is required.

Limitations: one application instance, serialized writes, whole-state storage/bootstrap. This change does not resolve the documented storage/API scaling work or certify a throughput target. See DEC-060, WF-054 and CONCURRENT_ACCESS_RELEASE_REPORT.md.

If the login or request token expires while a form is open, the form now remains in place with its selected files. Use **Sign in again** with the same account, review the unchanged form, then press **Save**. Signing in as another valid account is rejected for that form. Reauthentication does not submit or adopt newer record versions; the original context remains pinned, so an intervening edit still opens the normal conflict review. See DEC-062 / WF-056.
