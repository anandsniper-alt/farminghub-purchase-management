# Local pilot administration

> Current project memory (2026-09-12): see [Project Rulebook](PROJECT_RULEBOOK.md), [Current Product Baseline](CURRENT_PRODUCT_BASELINE.md), [Decision Log](DECISION_LOG.md) and [Workflow Change Log](WORKFLOW_CHANGE_LOG.md). Historical release statements below remain evidence of their date, not necessarily current behaviour.
> Correction: passwords are salted scrypt **hashes**, not encrypted passwords. The hosted Docker image currently omits administration scripts; the commands below describe local source-checkout administration.

## Create users from the application

Available in the user-access update (2026-09-12). Sign in as an **Administrator**, open **Users & settings**, and click **Create user**. Enter the user's full name, unique email address, role, password and matching confirmation. Select the required divisions and submit. Passwords require 12–256 characters. The new account can sign in immediately; email invitations are not sent.

The table shows account email, sign-in status, role and division assignments to administrators. Existing scope toggles continue to apply. Administrators retain access to all divisions; only LAE Import currently has transaction workflows. Account creation is atomic and audited with the administrator as actor. Invalid, duplicate or stale submissions create neither a partial profile nor a partial account.

This form is available in the authenticated server application, including Docker deployments after updating the app. The standalone clean-review HTML contains sample profiles only. Password reset is available to administrators in the authenticated application. User editing and activation/deactivation controls are not included. The CLI below remains an alternative for local source-checkout administration.

## Local accounts (CLI alternative)
Start the server once to create the desired database. To add a user, copy `.env.user.example` to `.env.user` and enter name, email, a 12+ character password, role and comma-separated scopes. Point FH_DATA_DIR to the same database directory as the server. Then run:

```sh
node --env-file=.env.user scripts/add-user.mjs
```

Supported roles: ADMIN, MANAGER, EXECUTIVE, PRODUCT_MANAGER, VIEWER. Scope values: LAE_IMPORT, LAE_DOMESTIC, UTILITY_DOMESTIC, IMPLEMENTS_DOMESTIC. Only LAE_IMPORT has a transaction workflow in this alpha. Give the purchase writer LAE_IMPORT and assign the order to that executive. Product Manager can release specification/artwork but does not automatically gain purchase-manager payment approval.

The script requires local filesystem access to the database. It does not print passwords. Delete or protect the populated environment file after use. Account creation is atomic and logged; assignment toggles are excluded from the business interaction log under the user's stated exception. The user-access update adds the admin web form described above; the VMS password-reset workflow remains unintegrated.

## Database backup

The local database includes order data, audit history, salted password hashes, sessions and uploaded evidence BLOBs. Protect backups as confidential records. Do not post them publicly or send them with bug screenshots.

```sh
node scripts/backup.mjs
```

For a custom directory:

```sh
node --env-file=.env scripts/backup.mjs
```

This makes a consistent SQLite snapshot into `backups/` or FH_BACKUP_DIR. Keep a backup before changing software. Test restoration in a separate directory, not over a live database. Stop the pilot server, keep the original data directory unchanged, place the backup as `purchase-pilot.sqlite` in a NEW directory, set FH_DATA_DIR to that directory and start the same software version. Existing local logins persist. Clear expired sessions through normal logout/login. Schema migrations beyond storage version 1 are not supplied.

Do not copy only the SQLite file while it is writing and discard its WAL; use the snapshot script or stop the server cleanly first. Do not delete an existing database simply to regenerate demo credentials. There is no production disaster-recovery sign-off yet.

## Reset an existing user password

In **Users & settings**, administrators select **Reset password** beside a sign-in account. Enter and confirm a new password (12–256 characters), a reason without credentials, and confirm session sign-out. **Change my password** additionally requires the current password. Save invalidates all sessions for the selected account and records the administrator, reason and number of revoked sessions; roles, scopes and business records remain unchanged. Credentials are salted scrypt hashes and are never returned or included in audit/retry metadata. Share the new password through your approved secure channel. No email is sent. Profile-only users cannot be reset. Stale requests, unconfirmed resets and unauthorized callers are rejected atomically. Repeated attempts are rate limited. An administrator changing their own password must sign in again. Standalone review mode has no reset actions.
