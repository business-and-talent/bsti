# BSTI MySQL Schema and Migration Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repository-controlled MySQL 8 schema and reversible migration contract for independent BSTI assessment records without connecting a real database or enabling runtime persistence.

**Architecture:** One initial up/down SQL migration creates five InnoDB tables with explicit checks, foreign keys, indexes, and no triggers or scoring logic. A machine-readable P0 data-model contract and permanent Node static test protect frozen boundaries, while GitHub Actions uses a disposable MySQL 8 service to prove `up → inspect/negative tests → down → up` repeatability.

**Tech Stack:** MySQL 8.0, SQL, Node.js 22 standard library, GitHub Actions service containers, existing native Node.js backend skeleton.

## Global Constraints

- `BSTI-40 V0.4.3` remains unchanged.
- `BSTM V0.4.4.1` remains unchanged.
- Browser scoring and browser report compilation remain authoritative.
- `revenueBand` and `headcountBand` remain context-only.
- Runtime capabilities remain `assessmentSubmission: false`, `persistence: false`, `backendScoring: false`, and `backendReportCompilation: false`.
- Do not connect CloudBase, TencentDB, or any real MySQL environment.
- Do not add database credentials, real environment IDs, hosts, users, private addresses, or production records.
- Do not add person, organization, customer, account, or tenant master tables.
- Do not add cross-assessment identity resolution.
- Do not add answer JSON, score, quadrant, focus-group, report, research-export, trigger, procedure, event, or generated-score storage.
- Use MySQL 8, InnoDB, `utf8mb4`, `DATETIME(3)`, and application-generated UUID strings stored as `CHAR(36)`.
- PR #7 defines schema only; PR #8 will implement submission, persistence transactions, immutability enforcement, and authorization.

---

## File Map

- Create `backend/database/migrations/0001_initial_bsti_schema.up.sql`: canonical initial schema.
- Create `backend/database/migrations/0001_initial_bsti_schema.down.sql`: reverse dependency-order teardown for disposable verification.
- Create `backend/database/README.md`: migration immutability, checksum, UTC, deployment, rollback, and no-production-destructive-use rules.
- Create `platform/contracts/p0-data-model.v0.1.json`: machine-readable product/data boundary.
- Create `tests/mysql-schema-migration-contract.mjs`: static SQL, contract, filename, secret, and frozen-capability checks.
- Modify `.github/workflows/profile-capture.yml`: run static test and disposable MySQL 8 migration proof.
- Modify `README.md`: document PR #7 scope and local/CI verification commands.

---

### Task 1: Add RED static contract for the approved data model

**Files:**
- Create: `tests/mysql-schema-migration-contract.mjs`
- Test: `tests/mysql-schema-migration-contract.mjs`

**Interfaces:**
- Consumes: repository paths and existing `platform/contracts/frozen-boundaries.v0.1.json` plus `backend/functions/bsti-api/src/capabilities.js`.
- Produces: one dependency-free Node test that later tasks must satisfy.

- [ ] **Step 1: Create a failing contract test**

The test must:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upPath = path.join(root, 'backend/database/migrations/0001_initial_bsti_schema.up.sql');
const downPath = path.join(root, 'backend/database/migrations/0001_initial_bsti_schema.down.sql');
const contractPath = path.join(root, 'platform/contracts/p0-data-model.v0.1.json');

assert.equal(fs.existsSync(upPath), true, 'Initial MySQL up migration is missing');
assert.equal(fs.existsSync(downPath), true, 'Initial MySQL down migration is missing');
assert.equal(fs.existsSync(contractPath), true, 'P0 data-model contract is missing');
```

After the existence checks, verify exact table names, `item_id` 1–40, `answer_value` 1–5, composite answer primary key, one-to-one profile/research primary keys, status and consent checks, restricted foreign-key deletion, reverse drop order, migration filename ordering, absence of forbidden entities/logic/secrets, and unchanged disabled runtime capabilities.

- [ ] **Step 2: Run the test and record RED**

Run:

```bash
node tests/mysql-schema-migration-contract.mjs
```

Expected: FAIL with `Initial MySQL up migration is missing`.

- [ ] **Step 3: Commit the RED test**

```bash
git add tests/mysql-schema-migration-contract.mjs
git commit -m "test: define MySQL schema migration contract"
```

---

### Task 2: Add the machine-readable P0 data-model contract

**Files:**
- Create: `platform/contracts/p0-data-model.v0.1.json`
- Test: `tests/mysql-schema-migration-contract.mjs`

**Interfaces:**
- Consumes: frozen founder decisions in the approved design.
- Produces: stable JSON values used by static tests and later PR #8 validation design.

- [ ] **Step 1: Extend the RED test with exact JSON assertions**

Assert the contract contains:

```json
{
  "schemaVersion": "p0-data-model-v0.1",
  "database": {
    "engine": "mysql",
    "majorVersion": 8,
    "characterSet": "utf8mb4",
    "timestampPrecision": 3,
    "timestampsUtc": true
  },
  "assessment": {
    "instrumentId": "BSTI-40",
    "instrumentVersion": "V0.4.3",
    "statuses": ["draft", "submitted", "voided"],
    "submittedImmutable": true,
    "retakeCreatesNewAssessment": true
  },
  "answers": {
    "authoritativeRepresentation": "one-row-per-item",
    "itemIdMinimum": 1,
    "itemIdMaximum": 40,
    "answerMinimum": 1,
    "answerMaximum": 5,
    "jsonCopyAllowed": false
  },
  "identity": {
    "personMaster": false,
    "organizationMaster": false,
    "customerMaster": false,
    "tenantMaster": false,
    "crossAssessmentResolution": false
  },
  "research": {
    "independentConsent": true,
    "defaultStatus": "not_granted",
    "pipelineImplemented": false,
    "operationalAssessmentIdExportable": false,
    "reversibleMappingAllowed": false
  }
}
```

Also include explicit `runtimeCapabilitiesRemainDisabled` and `forbiddenDatabaseResponsibilities` arrays in the final file.

- [ ] **Step 2: Create the JSON contract**

Create valid, deterministically formatted JSON with two-space indentation and a trailing newline. Include table names:

```json
[
  "schema_migrations",
  "assessments",
  "assessment_profile_snapshots",
  "assessment_answers",
  "assessment_research_consents"
]
```

- [ ] **Step 3: Run the static test**

Run:

```bash
node tests/mysql-schema-migration-contract.mjs
```

Expected: still FAIL because SQL migrations are missing, but all JSON assertions before that point pass.

- [ ] **Step 4: Commit**

```bash
git add platform/contracts/p0-data-model.v0.1.json tests/mysql-schema-migration-contract.mjs
git commit -m "docs: freeze P0 assessment data model"
```

---

### Task 3: Implement the reversible MySQL 8 migration

**Files:**
- Create: `backend/database/migrations/0001_initial_bsti_schema.up.sql`
- Create: `backend/database/migrations/0001_initial_bsti_schema.down.sql`
- Create: `backend/database/README.md`
- Test: `tests/mysql-schema-migration-contract.mjs`

**Interfaces:**
- Consumes: exact tables and invariants in `p0-data-model.v0.1.json`.
- Produces: SQL that MySQL 8 can apply, remove, and reapply without application code.

- [ ] **Step 1: Create `schema_migrations` and `assessments`**

Use:

```sql
CREATE TABLE schema_migrations (
  version VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  filename VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  checksum_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  applied_at DATETIME(3) NOT NULL,
  PRIMARY KEY (version),
  UNIQUE KEY uq_schema_migrations_filename (filename),
  CONSTRAINT chk_schema_migrations_checksum
    CHECK (checksum_sha256 REGEXP '^[0-9a-f]{64}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

Create `assessments` with explicit checks for:

```text
draft: all submitted/void fields null
submitted: submitted_at present and all void fields null
voided: submitted_at, voided_at, reason, actor type, actor reference present
voided_at >= submitted_at
instrument_id = BSTI-40
instrument_version = V0.4.3
```

Use `VARCHAR` status plus `CHECK`, not MySQL `ENUM`, so later migrations can extend values without rebuilding enum definitions.

- [ ] **Step 2: Create profile snapshot with anonymization fields**

Use `assessment_id` as primary key and restricted foreign key. Identification/context fields are required while `anonymized_at IS NULL`; once anonymized they must be null. Preserve notice versions and processing-consent audit fields. Include:

```text
anonymized_at DATETIME(3) NULL
anonymization_reason_code VARCHAR(64) NULL
anonymized_by_actor_type VARCHAR(32) NULL
anonymized_by_actor_reference VARCHAR(128) NULL
```

The check must prevent a partially anonymized record and must require all anonymization audit fields when `anonymized_at` is present.

- [ ] **Step 3: Create answers and research-consent tables**

`assessment_answers`:

```sql
PRIMARY KEY (assessment_id, item_id)
CHECK (item_id BETWEEN 1 AND 40)
CHECK (answer_value BETWEEN 1 AND 5)
FOREIGN KEY ... ON DELETE RESTRICT ON UPDATE RESTRICT
```

`assessment_research_consents` uses `assessment_id` as primary key and exact statuses `not_granted`, `granted`, `withdrawn`, with timestamp/version coherence and `withdrawn_at >= granted_at`.

- [ ] **Step 4: Create the reverse migration**

Drop in this exact order:

```sql
DROP TABLE IF EXISTS assessment_research_consents;
DROP TABLE IF EXISTS assessment_answers;
DROP TABLE IF EXISTS assessment_profile_snapshots;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS schema_migrations;
```

- [ ] **Step 5: Document migration rules**

`backend/database/README.md` must state:

- merged migrations are immutable;
- corrections use new numbered migrations;
- application and database timestamps are UTC;
- checksum is SHA-256 over exact file bytes;
- `down` is for disposable verification and pre-production rehearsal, not authorization to destroy production data;
- production deployment later requires backup and restore verification;
- no real credentials belong in the repository;
- PR #7 does not enable persistence.

- [ ] **Step 6: Run the static test to GREEN**

Run:

```bash
node tests/mysql-schema-migration-contract.mjs
```

Expected: PASS and print `MySQL schema and migration contract: PASS`.

- [ ] **Step 7: Commit**

```bash
git add backend/database platform/contracts/p0-data-model.v0.1.json tests/mysql-schema-migration-contract.mjs
git commit -m "feat: add initial BSTI MySQL schema"
```

---

### Task 4: Add disposable MySQL 8 migration verification to CI

**Files:**
- Modify: `.github/workflows/profile-capture.yml`
- Test: `.github/workflows/profile-capture.yml`

**Interfaces:**
- Consumes: up/down migration files and existing contract-test workflow.
- Produces: permanent PR/push verification against isolated MySQL 8.

- [ ] **Step 1: Add MySQL 8 service configuration**

Add to the existing `contract-tests` job:

```yaml
services:
  mysql:
    image: mysql:8.0
    env:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: bsti_contract
    ports:
      - 3306:3306
    options: >-
      --health-cmd="mysqladmin ping -h 127.0.0.1 -proot"
      --health-interval=5s
      --health-timeout=5s
      --health-retries=20
```

These are disposable CI-only credentials, not production credentials.

- [ ] **Step 2: Add the Node static test to the existing frozen-test step**

Add before prior product tests:

```bash
node tests/mysql-schema-migration-contract.mjs
```

- [ ] **Step 3: Add a MySQL migration proof step**

Run exact phases:

```bash
mysql --protocol=tcp -h 127.0.0.1 -P 3306 -uroot -proot bsti_contract \
  < backend/database/migrations/0001_initial_bsti_schema.up.sql
```

Then use `information_schema` assertions for all five tables, insert one legal draft assessment/profile/40 answers/not-granted consent, and run negative statements that must fail for:

- duplicate `(assessment_id, item_id)`;
- `item_id = 41`;
- `answer_value = 6`;
- incoherent submitted/voided timestamps;
- incoherent research-consent timestamps.

Apply the down migration, verify no five contract tables remain, apply up again, and verify all five tables return.

Each expected-failure command must invert its result explicitly:

```bash
if mysql ... -e "INSERT illegal statement"; then
  echo "Illegal statement unexpectedly succeeded" >&2
  exit 1
fi
```

- [ ] **Step 4: Run CI and inspect RED/GREEN evidence**

Expected final job phases:

```text
Run frozen contract tests: PASS
Verify MySQL schema migration: PASS
Smoke test backend process: PASS
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/profile-capture.yml
git commit -m "ci: verify MySQL schema migrations"
```

---

### Task 5: Update repository operating documentation and complete final verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-01-bsti-mysql-schema-migration-contract-plan.md` only to check completed boxes if tracking is retained.

**Interfaces:**
- Consumes: final migration and CI commands.
- Produces: operator-facing scope and verification instructions with no deployment implication.

- [ ] **Step 1: Add the database-contract section to README**

Document:

```text
PR #7 establishes schema/migration contracts only.
No real CloudBase/TencentDB connection exists.
Runtime submission and persistence remain disabled.
```

List local static verification:

```bash
node tests/mysql-schema-migration-contract.mjs
```

State that dynamic SQL verification runs in GitHub Actions using a disposable MySQL 8 service and that future production migration requires backup/restore rehearsal and authorized credentials outside the repository.

- [ ] **Step 2: Run complete static suite**

```bash
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

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 3: Verify scope**

Confirm changed product files exclude:

```text
index.html
privacy.html
report-usage.html
backend/functions/bsti-api/src/app.js
backend/functions/bsti-api/src/capabilities.js
backend/functions/bsti-api/src/config.js
```

Confirm no production environment, host, user, password, private address, assessment record, or API submission route was introduced.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md docs/superpowers/plans/2026-08-01-bsti-mysql-schema-migration-contract-plan.md
git commit -m "docs: add MySQL migration operating guidance"
```

- [ ] **Step 5: Open Draft PR #7**

Title:

```text
PR #7｜MySQL Schema and Migration Contract
```

The PR body must enumerate scope, frozen boundaries, RED/GREEN evidence, dynamic migration proof, changed files, and explicitly state that no real database was connected and runtime persistence remains disabled.

---

## Plan Self-Review

- Spec coverage: independent assessments, one-row answers, A+ research consent boundary, profile anonymization, immutable lifecycle, voiding, all five tables, up/down repeatability, secret guardrails, and disabled runtime capabilities are mapped to tasks.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step remains.
- Type/name consistency: table, file, status, consent, timestamp, instrument, and capability names match the approved design.
- Scope: one testable subsystem—repository-controlled MySQL schema and migration contract. Runtime persistence is deferred to PR #8.
