# Local pilot administration

## Local accounts
Start the server once to create the desired database. To add a user, copy `.env.user.example` to `.env.user` and enter name, email, a 12+ character password, role and comma-separated scopes. Point FH_DATA_DIR to the same database directory as the server. Then run:

```sh
node --env-file=.env.user scripts/add-user.mjs
```

Supported roles: ADMIN, MANAGER, EXECUTIVE, PRODUCT_MANAGER, VIEWER. Scope values: LAE_IMPORT, LAE_DOMESTIC, UTILITY_DOMESTIC, IMPLEMENTS_DOMESTIC. Only LAE_IMPORT has a transaction workflow in this alpha. Give the purchase writer LAE_IMPORT and assign the order to that executive. Product Manager can release specification/artwork but does not automatically gain purchase-manager payment approval.

The script requires local filesystem access to the database. It is not a remotely callable account-registration endpoint. It does not print passwords. Delete or protect the populated environment file after use. Account creation is atomic and logged; assignment toggles are excluded from the business interaction log under the user's stated exception. A web form for account creation and the existing VMS password-reset workflow are not integrated in this alpha.

## Database backup

The local database includes order data, audit history, encrypted password hashes, sessions and uploaded evidence BLOBs. Protect backups as confidential records. Do not post them publicly or send them with bug screenshots.

```sh
node scripts/backup.mjs
```

For a custom directory:

```sh
node --env-file=.env scripts/backup.mjs
```

This makes a consistent SQLite snapshot into `backups/` or FH_BACKUP_DIR. Keep a backup before changing software. Test restoration in a separate directory, not over a live database. Stop the pilot server, keep the original data directory unchanged, place the backup as `purchase-pilot.sqlite` in a NEW directory, set FH_DATA_DIR to that directory and start the same software version. Existing local logins persist. Clear expired sessions through normal logout/login. Schema migrations beyond storage version 1 are not supplied.

Do not copy only the SQLite file while it is writing and discard its WAL; use the snapshot script or stop the server cleanly first. Do not delete an existing database simply to regenerate demo credentials. There is no production disaster-recovery sign-off yet.
