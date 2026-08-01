# BSTI MySQL Schema and Migration Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a repository-controlled MySQL 8 schema and reversible migration contract for independent BSTI assessment records without connecting a real database or enabling runtime persistence.

**Architecture:** One initial up/down SQL migration creates five InnoDB tables. A machine-readable contract and dependency-free Node test protect product boundaries. GitHub Actions runs a disposable MySQL 8 service to prove schema structure, legal and illegal records, redaction behavior, rollback, and recreation.

**Tech Stack:** MySQL 8.0, SQL, Node.js 22 standard library, GitHub Actions service containers.

## Global Constraints

- `BSTI-40 V0.4.3` unchanged.
- `BSTM V0.4.4.1` unchanged.
- Browser scoring and report compilation remain authoritative.
- `revenueBand` and `headcountBand` remain context-only.
- Runtime capabilities remain disabled for submission, persistence, backend scoring, and backend report compilation.
- No real CloudBase or managed MySQL connection.
- No credentials, environment IDs, private hosts, or real records.
- No person, organization, customer, account, or tenant master.
- No cross-assessment identity resolution.
- No answer JSON, score, quadrant, focus-routing, report, research-export, trigger, procedure, or event logic.
- Operational profile cleanup uses **redaction** terminology; irreversible anonymization is reserved for a future research projection.

---

## File Map

- `backend/database/migrations/0001_initial_bsti_schema.up.sql`: canonical initial schema.
- `backend/database/migrations/0001_initial_bsti_schema.down.sql`: reverse dependency-order teardown.
- `backend/database/README.md`: migration and production-boundary rules.
- `platform/contracts/p0-data-model.v0.1.json`: machine-readable data boundary.
- `tests/mysql-schema-migration-contract.mjs`: static contract verification.
- `.github/workflows/profile-capture.yml`: disposable MySQL 8 verification.
- `README.md`: operating guidance.

---

### Task 1: Establish the RED contract

**Files:**
- Create: `tests/mysql-schema-migration-contract.mjs`
- Modify: `.github/workflows/profile-capture.yml`

- [x] Create a Node test that first requires:

```js
assert.equal(fs.existsSync(upPath), true, 'Initial MySQL up migration is missing');
assert.equal(fs.existsSync(downPath), true, 'Initial MySQL down migration is missing');
assert.equal(fs.existsSync(contractPath), true, 'P0 data-model contract is missing');
```

- [x] Add the new test to the existing frozen-contract workflow.
- [x] Run CI before adding migrations.
- [x] Record RED evidence: run `30702289355` failed with `Initial MySQL up migration is missing`.

---

### Task 2: Freeze the machine-readable contract

**Files:**
- Create: `platform/contracts/p0-data-model.v0.1.json`
- Test: `tests/mysql-schema-migration-contract.mjs`

- [x] Define exact MySQL 8, InnoDB, `utf8mb4`, `DATETIME(3)`, and `CHAR(36)` conventions.
- [x] Define five expected tables.
- [x] Freeze `BSTI-40 V0.4.3`, statuses, one-row-per-item answer authority, 1–40 item range, and 1–5 answer range.
- [x] Freeze no master identity entities and no cross-assessment resolution.
- [x] Freeze independent research consent and no research pipeline.
- [x] Freeze profile redaction audit, not false operational anonymization.
- [x] Freeze disabled runtime capabilities and forbidden database responsibilities.

---

### Task 3: Implement reversible MySQL 8 migrations

**Files:**
- Create: `backend/database/migrations/0001_initial_bsti_schema.up.sql`
- Create: `backend/database/migrations/0001_initial_bsti_schema.down.sql`
- Create: `backend/database/README.md`

- [x] Create `schema_migrations` with version, filename, exact SHA-256, and applied time.
- [x] Create `assessments` with exact instrument/version checks and coherent `draft`, `submitted`, and `voided` states.
- [x] Create one-to-one `assessment_profile_snapshots` with required active fields, independent consent evidence, and complete redaction audit:

```text
redacted_at
redaction_reason_code
redacted_by_actor_type
redacted_by_actor_reference
```

- [x] Require complete redaction: identifying and quasi-identifying fields must all be null when redacted; partial redaction fails.
- [x] Create `assessment_answers` with composite primary key, item 1–40, answer 1–5, and restricted foreign key.
- [x] Create one-to-one `assessment_research_consents` with coherent `not_granted`, `granted`, and `withdrawn` states.
- [x] Use explicit stable constraint and index names.
- [x] Create the down migration in exact reverse dependency order.
- [x] Document immutable migrations, checksum rules, UTC timestamps, no credentials, backup/restore gates, and non-production use of down migration.

---

### Task 4: Prove real MySQL behavior in CI

**Files:**
- Modify: `.github/workflows/profile-capture.yml`

- [x] Add a disposable `mysql:8.0` service.
- [x] Apply the up migration.
- [x] Verify five tables, 48 columns, five primary keys, three foreign keys, eleven checks, eight named indexes, and five InnoDB engines.
- [x] Compute the real migration SHA-256 and store it in `schema_migrations`.
- [x] Insert legal draft, submitted, and voided assessment states.
- [x] Insert one legal profile, one not-granted research consent, and exactly 40 answers.
- [x] Prove rejection of:

```text
duplicate answer
item_id = 41
answer_value = 6
submitted without submitted_at
voided_at before submitted_at
granted research consent without grant evidence
partial profile redaction
```

- [x] Complete one legal profile redaction.
- [x] Apply down migration and verify all five tables are removed.
- [x] Reapply up migration and verify all five tables return.
- [x] Rerun the existing backend process smoke test and confirm capabilities remain disabled.

---

### Task 5: Complete documentation and scope verification

**Files:**
- Modify: `README.md`
- Replace: `docs/superpowers/specs/2026-08-01-bsti-mysql-schema-migration-contract-design.md`
- Replace: `docs/superpowers/plans/2026-08-01-bsti-mysql-schema-migration-contract-plan.md`

- [x] Document that PR #7 establishes schema/migration contracts only.
- [x] Document that no real database or runtime persistence exists.
- [x] Document local static verification:

```bash
node tests/mysql-schema-migration-contract.mjs
```

- [x] Align design, contract, SQL, tests, and CI on `redacted_*` terminology.
- [x] Align exact field lengths and SQL types:

```text
schema_migrations.version: VARCHAR(20)
profile names: VARCHAR(128) / VARCHAR(255) / VARCHAR(128)
assessment_answers.item_id: TINYINT UNSIGNED
```

- [x] Confirm no changes to `index.html`, `privacy.html`, `report-usage.html`, assessment logic, scoring, report compilation, or backend runtime routes.

---

## Verification Commands

Static suite:

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

Dynamic SQL verification runs in GitHub Actions against the disposable MySQL 8 service.

## Final Scope

PR #7 produces a testable database contract only. Submission and persistence transactions, immutability authorization, redaction authorization, and voiding authorization remain PR #8 responsibilities.
