# VS Code — Start Here

## Requirements
- Node.js 22.16 or newer
- VS Code

## Open the project
1. Extract this folder.
2. In VS Code choose **File → Open Folder**.
3. Open `Farming_Hub_Purchase_Management_VSCode_v0.6.1-alpha.16`.

## Run locally
Open **Terminal → New Terminal**, then run:

```bash
npm start
```

The project has no npm package dependencies at this alpha stage, so `npm install` is not required unless you add packages later.

## Tests

```bash
npm test
```

## Build the self-contained review HTML

```bash
npm run build
```

## Main code locations
- `web/app.mjs` — application UI and workflows
- `web/styles.css` — Farming Hub UI theme
- `server/index.mjs` — local Node server
- `server/store.mjs` — local persistence layer
- `shared/domain.mjs` — purchase/order business rules
- `shared/plm.mjs` — PLM logic
- `shared/shipping.mjs` — shipping/freight logic
- `shared/final-master-data.mjs` — current master/reference data
- `tests/` — automated tests
- `docs/` — requirements, test reports, references and brand files

## Environment
Copy `.env.example` to `.env` only if you later need to override environment settings. Do not commit real credentials.
