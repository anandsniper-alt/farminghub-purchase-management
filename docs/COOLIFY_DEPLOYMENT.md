# Coolify deployment

Deploy the repository's `main` branch using the root `Dockerfile`, with port `8000` exposed internally. Set the domain to `https://purchase.dvjassociates.com` and enable HTTPS redirection. No host port mapping is needed.

Set these runtime environment variables in Coolify (not build arguments):

```dotenv
HOST=0.0.0.0
PORT=8000
FH_DATA_DIR=/app/data
FH_ORIGIN=https://purchase.dvjassociates.com
FH_SECURE_COOKIE=true
FH_ADMIN_NAME=Purchase Administrator
FH_ADMIN_EMAIL=<admin email>
FH_ADMIN_PASSWORD=<password of at least 12 characters>
```

Mount a persistent Docker volume at `/app/data` before the first deployment. This contains the SQLite database and uploaded files. Keep a single application instance, and back up this volume. Do not copy a running local SQLite database into the image.

Admin environment variables create the first account only when the database does not exist. Changing them later does not change an existing account's password.

Health check: `GET /api/health`, HTTP port `8000`, expected status `200`. The image runs as the unprivileged `node` user. Its build context excludes local environment files, databases, and test output.

Use Coolify's Deploy action after pushing updates. This deployment uses the application's isolated SQLite pilot store; it does not connect to a live ERP or VMS database.


Presentation release (DEC-026): Docker continues to copy web/, server/, shared/ and templates/ only. The approved presentation modules/styles/guide assets are in web/. Do not deploy prototypes/minimal-theme/preview.html, transfer its browser storage, or run its synthetic seed against the live database. Persistent volume/environment/instance settings remain unchanged.


## Verified Manager release — 2026-09-13

Runtime commit f5d55146cd7428cc72d6f6ef6bcc52ead48b63df; deployment fghgsunna2djj2wpin1ytwao on the existing application. This instance uses POST /api/v1/deploy with the resource UUID; the older GET method returned 405 without queuing a deployment. Auto-deploy is disabled, so pushing documentation alone does not replace the runtime. Domain, port 8000, Dockerfile and /app/data persistent storage remained unchanged. See QA_EXECUTION_REPORT.md for verification. Tokens remain outside Git and reports.

**DEC-031 / WF-025 publication, 2026-09-13:** Runtime f686901 is now live at https://purchase.dvjassociates.com. Coolify deployment plcoe5ueeg0axgxtpqwoj7r2 finished successfully; the application is running:healthy. Both bottom corners, horizontal-only dragging, click suppression, saved-side reload and guide opening were verified in the live browser. This supersedes the preceding local-only publication status for the mascot change. Business data and approval controls remain unchanged.
