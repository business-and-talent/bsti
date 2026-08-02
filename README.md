# bsti

Business System Tension Instrument (BSTI) for assessing business system tensions.

## Environment boundary

GitHub Pages is a development/demo environment only. It must not collect real identifiable personal or enterprise data, and production submission remains disabled.

The future P0 production path is Tencent Cloud CloudBase in Shanghai. Production activation remains launch-gated until the registered entity, personal-information rights contact, approved first-party domain, Tencent Cloud contracting entity, vendor/data-flow inventory, storage and backup verification, and final legal review are complete.

## Backend API

The backend repository contains:

- `GET /health`
- `GET /v1/capabilities`
- `POST /v1/assessments`

The assessment route accepts only a complete `BSTI-40 V0.4.3` submission and persists it as one MySQL transaction. It does not score answers or compile BSTM reports. The browser remains the authoritative scoring and report compiler.

Submission and persistence are disabled by default. With the committed defaults:

- no database variables are required;
- no MySQL pool is created;
- the capability response reports submission and persistence as false;
- `POST /v1/assessments` returns `503 SUBMISSION_DISABLED`.

Run the disabled backend locally with Node.js 20.19 or newer:

```bash
cd backend/functions/bsti-api
npm start
```

The process listens on `0.0.0.0:9000` by default. Test the read-only routes:

```bash
curl http://127.0.0.1:9000/health
curl http://127.0.0.1:9000/v1/capabilities
```

Enabled submission additionally requires `npm install` and the complete database environment-variable set shown in `backend/functions/bsti-api/.env.example`. PR #8 does not supply real credentials, connect a production environment, or connect the GitHub Pages demo to the API. Those actions remain launch-gated for PR #9.

The committed `.env.example` contains names and safe defaults only. Real `.env` files, `cloudbaserc.json`, CloudBase local state, and private-key files are ignored.

`cloudbaserc.example.json` is a non-deploying template. Before a later deployment, an authorized operator must copy it to `cloudbaserc.json`, supply the real CloudBase environment ID outside the repository, verify the complete environment-variable object, and complete the production activation requirements. CloudBase environment-variable deployment behavior can replace or update the cloud-side set depending on CLI version and operator choice, so it must be reviewed before every deployment.

## MySQL schema and migration contract

The repository-controlled MySQL 8 migration chain is stored under `backend/database/migrations/`:

1. `0001_initial_bsti_schema`
2. `0002_add_submission_fingerprint`

The schema contains independent assessment records, one profile snapshot per assessment, one authoritative answer row per item, independent research consent, migration audit metadata, and a SHA-256 request fingerprint for safe retry. It deliberately does not create person, organization, customer, account, or tenant master records and does not store scores, quadrant totals, focus routing, or compiled reports.

Run the static database contract test with Node.js 22:

```bash
node tests/mysql-schema-migration-contract.mjs
```

GitHub Actions verifies the SQL against disposable MySQL 8 services, including legal and illegal records, the complete submission transaction, identical replay, conflicting replay rejection, rollback behavior, and the reversible `0001 → 0002 → reverse → recreate` chain.

A future production migration requires authorized credentials outside the repository, a current backup, verified restore capability, checksum review, and an approved rollback procedure. Down migrations are disposable verification mechanisms, not authorization to destroy production data.

## Contract verification

Run the static contract suite with Node.js 22:

```bash
node tests/assessment-submission-validation-contract.mjs
node tests/assessment-submission-http-contract.mjs
node tests/assessment-repository-contract.mjs
node tests/mysql-schema-migration-contract.mjs
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
