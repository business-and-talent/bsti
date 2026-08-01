# bsti

Business System Tension Instrument (BSTI) for assessing business system tensions.

## Environment boundary

GitHub Pages is a development/demo environment only. It must not collect real identifiable personal or enterprise data, and production submission remains disabled.

The future P0 production path is Tencent Cloud CloudBase in Shanghai. Production activation remains launch-gated until the registered entity, personal-information rights contact, approved first-party domain, Tencent Cloud contracting entity, vendor/data-flow inventory, storage and backup verification, and final legal review are complete.

## Backend API skeleton

PR #6 adds a deployable repository skeleton only. It does not create or connect a Tencent CloudBase environment, does not expose a public API URL, and does not accept or persist assessment data.

The backend exposes only:

- `GET /health`
- `GET /v1/capabilities`

Assessment submission, persistence, backend scoring, and backend report compilation remain disabled.

Run the backend locally with Node.js 20.19 or newer:

```bash
cd backend/functions/bsti-api
npm start
```

The process listens on `0.0.0.0:9000` by default. Test the read-only routes:

```bash
curl http://127.0.0.1:9000/health
curl http://127.0.0.1:9000/v1/capabilities
```

The committed `.env.example` contains only approved non-secret variables. Real `.env` files, `cloudbaserc.json`, CloudBase local state, and private-key files are ignored.

`cloudbaserc.example.json` is a non-deploying template. Before a later deployment, an authorized operator must copy it to `cloudbaserc.json`, supply the real CloudBase environment ID outside the repository, verify the complete environment-variable object, and complete the production activation requirements. CloudBase environment-variable deployment behavior can replace or update the cloud-side set depending on CLI version and operator choice, so it must be reviewed before every deployment.

## Contract verification

Run the complete contract suite with Node.js 22:

```bash
node tests/backend-api-skeleton-contract.mjs
node tests/backend-deployment-static-contract.mjs
node tests/report-continuation-contract.mjs
node tests/wechat-mobile-terminology-contract.mjs
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
```

The P0 platform contracts are stored under `platform/contracts/`. They preserve `BSTI-40 V0.4.3`, `BSTM V0.4.4.1`, browser-side report compilation, and the isolation of revenue/headcount as context-only inputs.
