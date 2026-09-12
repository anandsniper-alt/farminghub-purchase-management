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
