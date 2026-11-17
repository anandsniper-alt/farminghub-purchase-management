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



## Release procedure

Use [Recovery and release](BACKUP_RESTORE_RUNBOOK.md), including change classification. Verify the actual branch, auto-deploy setting, application UUID, live SHA and volume before release; dated values are not current proof. Push one candidate branch for CI rather than the same change to several branches solely to rerun tests. If auto-deploy is enabled, its required recovery gate must pass before the triggering push.

Use existing authenticated deployment tools and keep secrets outside Git/output. Verify completion and the exact running commit, not merely an accepted deploy request. Keep the existing volume and single-instance settings unless separately authorized. Never seed synthetic data into production.

No deployment is needed for a documentation-only change or a data update applied through existing APIs. No Docker/cache/network/database changes are authorized by a documentation cleanup.

## Historical evidence

Earlier deployments and their dated test results are in [release history](COOLIFY_RELEASE_HISTORY.md). Do not append the same release report here, in the recovery procedure and in every rulebook. Keep detailed new receipts privately and record an applicable decision/handover once.


## Separate Implements deployment

See [Independent Implements application](IMPLEMENTS_SEPARATION.md) for the separate hostname, exclusive volume, runtime mode and guarded database cutover. Purchase and Implements are independently deployed applications; an additional DNS name alone is not the separation.
