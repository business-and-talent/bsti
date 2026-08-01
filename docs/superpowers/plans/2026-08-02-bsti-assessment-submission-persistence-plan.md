# BSTI Assessment Submission and Persistence Transaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one disabled-by-default `POST /v1/assessments` capability that validates a complete BSTI submission and persists the aggregate atomically to MySQL 8.

**Architecture:** Keep the browser as the authoritative scorer and report compiler. The backend is split into pure contract/validation/fingerprint modules, an HTTP adapter, a submission service, and a MySQL repository. A client-generated UUID v4 plus a canonical SHA-256 fingerprint provides safe retry without an extra idempotency table.

**Tech Stack:** Node.js 20.19+, ES modules, native `http`, native `crypto`, `mysql2/promise`, MySQL 8.0, Node assertion scripts, GitHub Actions.

## Global Constraints

- Instrument remains `BSTI-40 V0.4.3`.
- Report rules remain `BSTM V0.4.4.1`.
- Browser scoring and report compilation remain authoritative.
- Only answers are scoring inputs; revenue/headcount remain context-only.
- GitHub Pages remains a submission-disabled demo and must not collect real identifiable data.
- No server-side drafts, read/list/update/void/redaction/delete API, report storage, research UI/export, accounts, CRM, payment, or real cloud deployment.
- Research consent is always persisted as `not_granted` in PR #8.
- Submission and persistence are enabled or disabled together.
- SQL must be parameterized; logs and errors must not echo profile values or answers.

---

## File Map

**Create**

- `backend/functions/bsti-api/src/submission-contract.js` — frozen request constants and accepted option codes.
- `backend/functions/bsti-api/src/submission-validation.js` — pure exact-schema validation and normalization.
- `backend/functions/bsti-api/src/submission-fingerprint.js` — canonical serialization and SHA-256.
- `backend/functions/bsti-api/src/request-body.js` — bounded JSON body reader.
- `backend/functions/bsti-api/src/submission-errors.js` — stable internal error classes/codes.
- `backend/functions/bsti-api/src/assessment-repository.js` — MySQL transaction and replay lookup.
- `backend/functions/bsti-api/src/assessment-submission-service.js` — validation/fingerprint/repository orchestration.
- `backend/functions/bsti-api/src/database.js` — `mysql2/promise` pool creation.
- `backend/database/migrations/0002_add_submission_fingerprint.up.sql`.
- `backend/database/migrations/0002_add_submission_fingerprint.down.sql`.
- `tests/assessment-submission-validation-contract.mjs`.
- `tests/assessment-submission-http-contract.mjs`.
- `tests/assessment-repository-contract.mjs`.

**Modify**

- `backend/functions/bsti-api/src/app.js` — method-aware routing and submission HTTP adapter.
- `backend/functions/bsti-api/src/config.js` — enabled-mode database configuration.
- `backend/functions/bsti-api/src/capabilities.js` — configuration-derived capability response.
- `backend/functions/bsti-api/index.js` — create pool/repository/service only when enabled.
- `backend/functions/bsti-api/package.json` — add `mysql2` dependency.
- `backend/functions/bsti-api/.env.example` — document disabled defaults and database variables.
- `platform/contracts/p0-data-model.v0.1.json` — add submission fingerprint contract.
- `.github/workflows/profile-capture.yml` — run PR #8 tests and real MySQL transaction proof.
- `README.md` and `backend/database/README.md` — document the new disabled capability and migration order.

---

### Task 1: Freeze request validation and fingerprint behavior

**Files:**
- Create: `backend/functions/bsti-api/src/submission-contract.js`
- Create: `backend/functions/bsti-api/src/submission-validation.js`
- Create: `backend/functions/bsti-api/src/submission-fingerprint.js`
- Create: `tests/assessment-submission-validation-contract.mjs`

**Interfaces:**
- Produces `validateAndNormalizeSubmission(value)` returning `{ ok: true, submission }` or `{ ok: false, issues }`.
- Produces `fingerprintSubmission(submission)` returning a 64-character lowercase SHA-256 string.
- `submission.answers` is sorted by numeric `itemId` and contains exactly 40 `{ itemId, value }` objects.

- [ ] **Step 1: Write the failing validation/fingerprint contract**

The test must import the three modules and assert:

```js
const valid = validSubmissionFixture();
const result = validateAndNormalizeSubmission(valid);
assert.equal(result.ok, true);
assert.equal(result.submission.answers.length, 40);
assert.deepEqual(result.submission.answers.map(({ itemId }) => itemId), Array.from({ length: 40 }, (_, i) => i + 1));
assert.match(fingerprintSubmission(result.submission), /^[0-9a-f]{64}$/);
```

Also assert rejection of unknown fields, non-v4 UUID, wrong instrument/version, invalid option codes, incoherent `other` fields, missing report-processing consent, incoherent marketing consent, duplicate/missing item IDs, values outside 1–5, and score/report fields.

- [ ] **Step 2: Run the test and record RED**

Run:

```bash
node tests/assessment-submission-validation-contract.mjs
```

Expected: fail because `submission-validation.js` does not exist.

- [ ] **Step 3: Implement exact frozen option sets**

Use these existing frontend codes exactly:

```js
export const ROLE_CODES = Object.freeze([
  'founder_controller', 'owner_chair', 'ceo_president_gm',
  'cofounder_partner', 'business_unit_owner', 'cxo_core_executive',
  'middle_manager', 'professional_advisor', 'other'
]);

export const REVENUE_BANDS = Object.freeze([
  'lt_10m_cny', '10m_30m_cny', '30m_100m_cny',
  '100m_300m_cny', '300m_1b_cny', 'gte_1b_cny',
  'prefer_not_to_say'
]);

export const HEADCOUNT_BANDS = Object.freeze([
  'lt_10', '10_30', '30_100', '100_300', '300_1000',
  'gte_1000', 'prefer_not_to_say'
]);
```

Industry codes are the fourteen frozen values already listed in the PR #8 design spec.

- [ ] **Step 4: Implement validation and normalization**

Enforce exact keys at every object level. Trim string values. Require canonical lowercase RFC 4122 UUID v4:

```js
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
```

Use bounded issue objects only:

```js
{ path: 'profile.displayName', code: 'required' }
```

Do not include submitted values in issues.

- [ ] **Step 5: Implement deterministic fingerprinting**

Build a new fixed-order object excluding `assessmentId` and timestamps, then:

```js
createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
```

- [ ] **Step 6: Run validation/fingerprint test to GREEN**

```bash
node tests/assessment-submission-validation-contract.mjs
```

Expected: `Assessment submission validation contract: PASS`.

- [ ] **Step 7: Commit**

```bash
git add backend/functions/bsti-api/src/submission-contract.js \
  backend/functions/bsti-api/src/submission-validation.js \
  backend/functions/bsti-api/src/submission-fingerprint.js \
  tests/assessment-submission-validation-contract.mjs
git commit -m "feat: add BSTI submission validation contract"
```

---

### Task 2: Add disabled-by-default HTTP submission route

**Files:**
- Create: `backend/functions/bsti-api/src/request-body.js`
- Create: `backend/functions/bsti-api/src/submission-errors.js`
- Create: `tests/assessment-submission-http-contract.mjs`
- Modify: `backend/functions/bsti-api/src/app.js`
- Modify: `backend/functions/bsti-api/src/config.js`
- Modify: `backend/functions/bsti-api/src/capabilities.js`
- Modify: `backend/functions/bsti-api/.env.example`

**Interfaces:**
- `readJsonBody(request, { limitBytes: 65536 })` resolves parsed JSON or throws a stable request error.
- `createRequestHandler(config, { submissionService, capabilitiesProvider, onUnhandledError })` supports the existing GET routes plus `POST /v1/assessments`.
- `getCapabilities(config)` derives submission/persistence booleans from `config.submissionEnabled`.

- [ ] **Step 1: Write the failing HTTP contract**

Start an ephemeral server with injected fake services and assert:

```js
assert.equal((await post('/v1/assessments', validBody, disabledConfig)).status, 503);
assert.equal((await post('/v1/assessments', validBody, enabledConfig)).status, 201);
assert.equal((await get('/v1/assessments')).status, 405);
assert.equal((await post('/unknown', {})).status, 404);
```

Also cover invalid content type, malformed JSON, payload over 64 KiB, 200 replay, 409 conflict, 422 validation, and no PII echo.

- [ ] **Step 2: Run and record RED**

```bash
node tests/assessment-submission-http-contract.mjs
```

Expected: fail because the POST route is absent.

- [ ] **Step 3: Implement enabled-mode configuration**

When `BSTI_SUBMISSION_ENABLED=false`, database variables are optional and no database object is returned.

When true, require non-empty `BSTI_DB_HOST`, `BSTI_DB_NAME`, `BSTI_DB_USER`, and `BSTI_DB_PASSWORD`; use exact defaults:

```text
BSTI_DB_PORT=3306
BSTI_DB_CONNECTION_LIMIT=4
```

Validate port 1–65535 and connection limit 1–20.

- [ ] **Step 4: Implement method-aware routing and bounded body parsing**

Known route rules:

```text
GET  /health
GET  /v1/capabilities
POST /v1/assessments
```

Unknown paths return 404 before method handling. Disabled submission returns 503 before body parsing or service invocation.

- [ ] **Step 5: Map stable service outcomes**

```text
created   -> 201 replayed=false
replayed  -> 200 replayed=true
conflict  -> 409 SUBMISSION_CONFLICT
invalid   -> 422 INVALID_SUBMISSION
unavailable -> 503 PERSISTENCE_UNAVAILABLE
```

- [ ] **Step 6: Run HTTP and existing backend tests**

```bash
node tests/assessment-submission-http-contract.mjs
node tests/backend-api-skeleton-contract.mjs
node tests/backend-deployment-static-contract.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/functions/bsti-api/src/request-body.js \
  backend/functions/bsti-api/src/submission-errors.js \
  backend/functions/bsti-api/src/app.js \
  backend/functions/bsti-api/src/config.js \
  backend/functions/bsti-api/src/capabilities.js \
  backend/functions/bsti-api/.env.example \
  tests/assessment-submission-http-contract.mjs
git commit -m "feat: add disabled BSTI submission route"
```

---

### Task 3: Implement migration, repository transaction, and service

**Files:**
- Create: `backend/database/migrations/0002_add_submission_fingerprint.up.sql`
- Create: `backend/database/migrations/0002_add_submission_fingerprint.down.sql`
- Create: `backend/functions/bsti-api/src/database.js`
- Create: `backend/functions/bsti-api/src/assessment-repository.js`
- Create: `backend/functions/bsti-api/src/assessment-submission-service.js`
- Create: `tests/assessment-repository-contract.mjs`
- Modify: `backend/functions/bsti-api/package.json`
- Modify: `backend/functions/bsti-api/index.js`
- Modify: `platform/contracts/p0-data-model.v0.1.json`

**Interfaces:**
- `createDatabasePool(databaseConfig)` returns a bounded `mysql2/promise` pool using `timezone: 'Z'`.
- `createAssessmentRepository(pool)` returns `{ submit({ submission, fingerprint, now }) }`.
- Repository result is `{ kind: 'created'|'replayed'|'conflict', assessmentId, submittedAt }`.
- `createAssessmentSubmissionService(repository, { clock })` returns `{ submit(rawBody) }`.

- [ ] **Step 1: Write failing repository/service tests with a fake pool**

Verify call order:

```text
getConnection → beginTransaction → assessment draft insert → profile insert
→ 40-answer insert → research not_granted insert → draft-to-submitted update
→ commit → release
```

Verify rollback on every intermediate failure and duplicate-key replay/conflict behavior.

- [ ] **Step 2: Run and record RED**

```bash
node tests/assessment-repository-contract.mjs
```

Expected: fail because repository/service modules do not exist.

- [ ] **Step 3: Add migration 0002**

Up migration:

```sql
ALTER TABLE assessments
  ADD COLUMN submission_fingerprint CHAR(64)
    CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    AFTER instrument_version,
  ADD CONSTRAINT chk_assessments_submission_fingerprint
    CHECK (submission_fingerprint REGEXP '^[0-9a-f]{64}$');
```

Down migration drops the check before the column. This migration is valid only because PR #7 has not been deployed to a database containing persisted assessments.

- [ ] **Step 4: Implement parameterized transaction**

Use one connection and one transaction. Insert one draft assessment, one profile, one research-consent row, and exactly 40 answers. The final update is:

```sql
UPDATE assessments
SET status = 'submitted', submitted_at = ?, updated_at = ?
WHERE id = ? AND status = 'draft'
```

Require `affectedRows === 1` before commit.

- [ ] **Step 5: Implement replay handling**

On duplicate primary key, rollback and load only:

```sql
SELECT id, status, submitted_at, submission_fingerprint
FROM assessments
WHERE id = ?
```

Same fingerprint plus `submitted` returns replay; otherwise conflict.

- [ ] **Step 6: Wire service and process bootstrap**

The service validates, fingerprints, and calls the repository. `index.js` imports/creates `mysql2` pool only when `config.submissionEnabled` is true. Disabled startup must remain dependency-safe and database-free.

- [ ] **Step 7: Run repository and existing tests**

```bash
node tests/assessment-repository-contract.mjs
node tests/assessment-submission-validation-contract.mjs
node tests/assessment-submission-http-contract.mjs
node tests/backend-api-skeleton-contract.mjs
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/database/migrations/0002_* \
  backend/functions/bsti-api/src/database.js \
  backend/functions/bsti-api/src/assessment-repository.js \
  backend/functions/bsti-api/src/assessment-submission-service.js \
  backend/functions/bsti-api/package.json \
  backend/functions/bsti-api/index.js \
  platform/contracts/p0-data-model.v0.1.json \
  tests/assessment-repository-contract.mjs
git commit -m "feat: persist submitted BSTI assessments atomically"
```

---

### Task 4: Prove the complete transaction on MySQL 8 CI

**Files:**
- Modify: `.github/workflows/profile-capture.yml`
- Modify: `README.md`
- Modify: `backend/database/README.md`

**Interfaces:**
- CI applies `0001` then `0002`, runs the enabled API against disposable MySQL, then reverses `0002` and `0001` and recreates both.

- [ ] **Step 1: Add all PR #8 tests to the frozen contract step**

```bash
node tests/assessment-submission-validation-contract.mjs
node tests/assessment-submission-http-contract.mjs
node tests/assessment-repository-contract.mjs
```

- [ ] **Step 2: Install backend dependency in CI**

```bash
npm install --prefix backend/functions/bsti-api --ignore-scripts --no-audit --no-fund
```

- [ ] **Step 3: Extend migration proof to 0002**

Apply both migrations and assert `submission_fingerprint` exists with the named check constraint. Reverse in the exact order `0002.down`, `0001.down`; recreate `0001.up`, `0002.up`.

- [ ] **Step 4: Add enabled API integration proof**

Start the backend with disposable values:

```text
BSTI_SUBMISSION_ENABLED=true
BSTI_DB_HOST=127.0.0.1
BSTI_DB_PORT=3306
BSTI_DB_NAME=bsti_contract
BSTI_DB_USER=root
BSTI_DB_PASSWORD=root
BSTI_DB_CONNECTION_LIMIT=2
PORT=9001
```

Submit one valid 40-answer request and assert:

```text
201 first submission
200 identical replay
409 changed-answer retry
1 assessment
1 profile snapshot
40 answer rows
1 research consent with not_granted
0 partial rows after invalid submissions
```

- [ ] **Step 5: Document the activation boundary**

State that PR #8 adds capability but keeps defaults off; PR #9 supplies real environment values, frontend wiring, domain, legal text, backup/restore, and production activation.

- [ ] **Step 6: Run full CI and inspect logs**

Expected GitHub Actions steps:

```text
Run frozen contract tests: PASS
Verify MySQL schema migration: PASS
Verify assessment submission transaction: PASS
Smoke test backend process: PASS
Report Summary and Print Contract: PASS
```

- [ ] **Step 7: Scope audit**

Confirm no changes to `index.html`, `privacy.html`, `report-usage.html`, BSTI scoring, or BSTM compilation.

- [ ] **Step 8: Commit and open Draft PR #8**

```bash
git add .github/workflows/profile-capture.yml README.md backend/database/README.md
git commit -m "test: prove BSTI submission transaction on MySQL 8"
```

Open `PR #8｜Assessment Submission and Persistence Transaction` against `main`, leave it Draft until final verification and founder merge approval.
