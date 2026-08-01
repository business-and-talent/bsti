# BSTI PR #7｜MySQL Schema and Migration Contract Design

**Status:** Founder-approved and self-reviewed

**Baseline:** `main` at `76b0600881c7e5fe57a4b358f3c3a936008a7178` after merged PR #6

**Target pull request:** `PR #7｜MySQL Schema and Migration Contract`

## 1. Purpose

PR #7 establishes the first versioned relational data model for BSTI and proves that the schema can be created, rolled back, and recreated on an isolated MySQL 8 instance.

This pull request does **not** connect a real Tencent CloudBase or TencentDB environment. It does **not** enable assessment submission or persistence in the running backend. It only establishes the repository-controlled database contract required by the later submission and production-launch pull requests.

The frozen product boundary remains unchanged:

- `BSTI-40 V0.4.3` is the instrument;
- `BSTM V0.4.4.1` is the report-rules version;
- the browser remains the authoritative scoring and report compiler;
- revenue band and headcount band remain context-only inputs;
- the backend may validate, store, associate, and control access;
- the backend and database must not score assessments or compile reports.

## 2. Approved Decisions

### 2.1 Independent assessment records

Each assessment is an independent measurement event and snapshot.

PR #7 must not create master entities for persons, organizations, customers, accounts, or tenants. It must not infer that two assessments belong to the same person or business entity. Any future cross-assessment association requires a later migration, explicit authorization, and separate access rules.

### 2.2 One authoritative answer row per item

`assessment_answers` is the only authoritative answer store. The database must not store a second authoritative 40-answer JSON document.

### 2.3 A+ research boundary

The operational schema preserves structured fields that may support future anonymous research, instrument validation, cohort analysis, theory development, and model iteration.

Research remains separate from product delivery:

- research consent is independent and optional;
- refusal does not block assessment completion or report delivery;
- PR #7 does not implement a research dataset, export, statistics pipeline, or model-training pipeline;
- future research projection must use an independently generated research identifier and must not expose an operational `assessment_id` or reversible mapping key.

### 2.4 Separate profile snapshot

Assessment lifecycle data belongs in `assessments`. Identifying and contextual information belongs in one `assessment_profile_snapshots` row.

The snapshot row remains linked for audit, but its identifying and quasi-identifying fields may later be redacted. Redaction clears those fields and records redaction metadata; it does not delete the assessment, answers, or audit relationship.

### 2.5 Submitted assessments are immutable

The lifecycle is:

```text
draft → submitted → voided
```

- `draft`: profile and answers may be created or replaced;
- `submitted`: instrument identity, profile facts, and answers are immutable;
- `voided`: terminal state; the audit record remains, but no new report delivery or future research projection is permitted.

Corrections or retakes create a new assessment.

## 3. Architecture

```text
backend/database/
├── migrations/
│   ├── 0001_initial_bsti_schema.up.sql
│   └── 0001_initial_bsti_schema.down.sql
└── README.md

platform/contracts/
└── p0-data-model.v0.1.json

tests/
└── mysql-schema-migration-contract.mjs
```

A narrowly scoped CI helper may be added only when required to inspect an isolated MySQL 8 database. No production database SDK, live connection configuration, or credential is added.

The PR #6 runtime remains unchanged and continues to declare:

- `assessmentSubmission: false`;
- `persistence: false`;
- `backendScoring: false`;
- `backendReportCompilation: false`.

## 4. Database Conventions

- MySQL 8 and InnoDB;
- `utf8mb4` for application text;
- `DATETIME(3)` timestamps, written and interpreted as UTC;
- application-generated UUIDs stored as `CHAR(36) CHARACTER SET ascii COLLATE ascii_bin`;
- plural snake-case table names and snake-case columns;
- explicit, stable constraint and index names;
- zero-padded monotonic migration numbers;
- lexical migration order.

PR #7 does not create a database, database user, network route, CloudBase resource, or TencentDB instance.

The database enforces structural integrity: primary keys, foreign keys, uniqueness, value ranges, required values, and status/timestamp coherence.

PR #8 will enforce workflow integrity: complete 40-answer submission, exact instrument/version match, required profile fields at submission, legal state transitions, submitted-record immutability, consent transitions, and authorization.

PR #7 must not use triggers, stored procedures, scheduled jobs, generated scores, quadrant totals, focus routing, or report-compiler logic.

## 5. Physical Table Design

### 5.1 `assessments`

Purpose: aggregate root for one independent BSTI measurement event.

| Column | SQL contract |
|---|---|
| `id` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_bin` primary key |
| `instrument_id` | `VARCHAR(32)` not null; P0 check value `BSTI-40` |
| `instrument_version` | `VARCHAR(32)` not null; P0 check value `V0.4.3` |
| `status` | `VARCHAR(16)` not null; `draft`, `submitted`, or `voided` |
| `started_at` | `DATETIME(3)` not null |
| `submitted_at` | `DATETIME(3)` nullable |
| `voided_at` | `DATETIME(3)` nullable |
| `void_reason_code` | `VARCHAR(64)` nullable |
| `voided_by_actor_type` | `VARCHAR(32)` nullable |
| `voided_by_actor_reference` | `VARCHAR(128)` nullable; opaque audit reference, not a user entity |
| `created_at` | `DATETIME(3)` not null, default current timestamp |
| `updated_at` | `DATETIME(3)` not null, default/current update timestamp |

Status coherence check:

- `draft`: submission and void fields are null;
- `submitted`: `submitted_at` is present and void fields are null;
- `voided`: `submitted_at`, `voided_at`, reason, actor type, and actor reference are present;
- `voided_at >= submitted_at`.

Indexes:

- `(status, created_at)`;
- `(submitted_at)`.

Forbidden columns include scores, quadrant totals, focus groups, report narratives, report HTML, and report JSON.

### 5.2 `assessment_profile_snapshots`

Purpose: one-to-one profile and context snapshot for one assessment.

`assessment_id` is the primary key and a foreign key to `assessments.id` with restricted deletion.

| Column | SQL contract |
|---|---|
| `assessment_id` | UUID-format `CHAR(36)` primary/foreign key |
| `display_name` | `VARCHAR(100)` nullable at database level; required by PR #8 before submission |
| `business_entity_name` | `VARCHAR(200)` nullable at database level; required before submission |
| `current_role` | `VARCHAR(100)` nullable at database level; required before submission |
| `industry_code` | `VARCHAR(64)` nullable at database level; required before submission |
| `industry_other_text` | `VARCHAR(200)` nullable; permitted only for the `other` industry code |
| `revenue_band` | `VARCHAR(64)` nullable at database level; context-only and required before submission |
| `headcount_band` | `VARCHAR(64)` nullable at database level; context-only and required before submission |
| `privacy_notice_version` | `VARCHAR(64)` nullable after redaction; required before submission |
| `report_usage_notice_version` | `VARCHAR(64)` nullable after redaction; required before submission |
| `report_processing_consent_at` | `DATETIME(3)` nullable after redaction; required before submission |
| `marketing_consent_granted` | `TINYINT(1)` not null, default `0`, check 0 or 1 |
| `marketing_consent_text_version` | `VARCHAR(64)` nullable; required when marketing consent is 1 |
| `marketing_consent_at` | `DATETIME(3)` nullable; required when marketing consent is 1 |
| `redacted_at` | `DATETIME(3)` nullable |
| `redaction_reason_code` | `VARCHAR(64)` nullable |
| `created_at` | `DATETIME(3)` not null |
| `updated_at` | `DATETIME(3)` not null |

Redaction contract:

- while `redacted_at` is null, `redaction_reason_code` is null;
- when `redacted_at` is present, `redaction_reason_code` is required;
- a redaction operation clears identifying and quasi-identifying profile fields, consent-display metadata, and marketing fields as legally and operationally required;
- `assessment_id`, `redacted_at`, `redaction_reason_code`, `created_at`, and `updated_at` remain for audit;
- redaction does not alter answers or assessment lifecycle facts.

The schema permits nullable profile fields to support redaction. PR #8 must nevertheless require a complete, non-redacted profile before submission.

No profile field may enter scoring. No person or organization foreign key is permitted.

### 5.3 `assessment_answers`

Purpose: single authoritative answer store.

| Column | SQL contract |
|---|---|
| `assessment_id` | UUID-format `CHAR(36)` parent reference |
| `item_id` | `SMALLINT UNSIGNED` not null, check 1–40 |
| `answer_value` | `TINYINT UNSIGNED` not null, check 1–5 |
| `created_at` | `DATETIME(3)` not null |
| `updated_at` | `DATETIME(3)` not null |

Constraints:

- composite primary key `(assessment_id, item_id)`;
- foreign key to `assessments.id` with restricted deletion;
- index `(item_id, answer_value)` for future quality analysis.

PR #8 must verify that a submitted assessment has exactly one answer for each item 1 through 40.

Forbidden representations:

- `answers_json`;
- duplicated answer payload tables;
- score columns;
- quadrant totals;
- calculated focus groups.

### 5.4 `assessment_research_consents`

Purpose: one-to-one research permission, independent from report-processing and marketing consent.

| Column | SQL contract |
|---|---|
| `assessment_id` | UUID-format `CHAR(36)` primary/foreign key |
| `consent_status` | `VARCHAR(16)` not null; `not_granted`, `granted`, or `withdrawn` |
| `consent_text_version` | `VARCHAR(64)` nullable |
| `granted_at` | `DATETIME(3)` nullable |
| `withdrawn_at` | `DATETIME(3)` nullable |
| `created_at` | `DATETIME(3)` not null |
| `updated_at` | `DATETIME(3)` not null |

Status coherence check:

- `not_granted`: text version, grant time, and withdrawal time are null;
- `granted`: text version and grant time are present; withdrawal time is null;
- `withdrawn`: text version, grant time, and withdrawal time are present;
- `withdrawn_at >= granted_at`.

PR #8 will create this row as `not_granted` in the assessment-creation transaction. The database cannot enforce reverse one-to-one existence, so the later transaction layer owns that invariant.

Research consent does not authorize marketing; marketing consent does not authorize research.

### 5.5 `schema_migrations`

Purpose: repository-controlled audit of applied migrations.

| Column | SQL contract |
|---|---|
| `version` | `VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin` primary key |
| `filename` | `VARCHAR(255)` not null and unique |
| `checksum_sha256` | `CHAR(64) CHARACTER SET ascii COLLATE ascii_bin` not null |
| `applied_at` | `DATETIME(3)` not null |

Migration tooling must reject reused versions, filename mismatches, checksum mismatches, and missing earlier migrations.

Merged migration files are immutable. Corrections use a new migration.

## 6. Lifecycle Contract

### Draft

A later transaction may create one draft assessment, one complete or partial profile snapshot, zero to 40 answers, and one `not_granted` research-consent row.

### Submission

PR #8 may transition draft to submitted only after atomically validating:

- `instrument_id = BSTI-40`;
- `instrument_version = V0.4.3`;
- profile exists, is not redacted, and contains all required fields;
- report-processing consent evidence exists;
- exactly 40 answer rows exist;
- item IDs are exactly 1–40;
- all values are integers 1–5.

### Submitted immutability

After submission, the backend rejects changes to instrument identity, version, profile facts, answers, and submission time.

Research consent may still move from granted to withdrawn before irreversible anonymization. Profile redaction is a privacy-governance operation, not an ordinary edit, and requires separate authorization and audit handling in a later PR.

### Voiding

Only submitted assessments may become voided. Voided assessments remain for audit, cannot be restored, receive no new report delivery, and are excluded from future research projection.

## 7. Anonymous Research Projection Boundary

PR #7 creates no research table or export.

Future eligibility requires:

```text
assessment.status = submitted
AND research_consent.consent_status = granted
AND profile_snapshot.redacted_at IS NULL
```

A voided assessment is ineligible because its status is no longer submitted.

A future research layer must not contain:

- name or contact identifiers;
- business entity name;
- free-form profile text;
- IP or device information;
- exact operational submission time;
- operational `assessment_id`;
- reversible mapping keys.

Permitted future dimensions, after privacy-risk review, may include instrument version, item/answer values, coarse industry, revenue and headcount bands, role category, and coarse collection period.

Future research publication or model use must define minimum group sizes, rare-combination suppression, and re-identification-risk review. PR #7 implements none of those processes.

## 8. Migration Contract

`0001_initial_bsti_schema.up.sql` creates, in order:

1. `schema_migrations`;
2. `assessments`;
3. `assessment_profile_snapshots`;
4. `assessment_answers`;
5. `assessment_research_consents`.

`0001_initial_bsti_schema.down.sql` drops application tables in reverse dependency order and drops `schema_migrations` last.

CI must prove on a disposable MySQL 8 instance:

1. apply `up` to a clean database;
2. inspect required tables, columns, keys, indexes, and checks;
3. insert representative legal records;
4. prove illegal item IDs and answer values fail;
5. prove duplicate answers fail;
6. prove incoherent lifecycle, consent, marketing, and redaction records fail;
7. apply `down` and prove removal;
8. apply `up` again and prove the recreated schema matches.

The test database contains no production data and has no live cloud dependency.

Permanent repository tests must also verify:

- expected migration filenames and ordering;
- absence of credentials, real environment IDs, hosts, usernames, and passwords;
- absence of triggers, stored procedures, scores, quadrant logic, report compilation, research exports, and master identity entities;
- existing frozen platform contracts are unchanged;
- PR #6 capabilities remain disabled.

## 9. Error and Rollback Principles

- migration failure returns non-zero immediately;
- logs may name the migration version but never print credentials;
- partial schema application in CI causes the disposable database to be discarded;
- PR #7 does not claim transactional DDL rollback across all MySQL operations;
- the down migration is for development and pre-deployment verification, not permission to destroy production data;
- production procedures must later back up and prove restore capability before applying migrations.

## 10. Security and Privacy Boundaries

PR #7 must not commit database passwords, connection strings, CloudBase environment IDs, TencentDB IDs, private addresses, or real personal/enterprise data.

The schema separates lifecycle, profile snapshot, authoritative answers, and optional research consent. It creates no public report token or public report URL.

## 11. Testing Strategy

1. **Static contract test**
   - expected files and tables;
   - exact authority and entity boundaries;
   - no research projection implementation;
   - no live configuration or secrets.

2. **MySQL integration test**
   - isolated MySQL 8;
   - `up → down → up`;
   - schema inspection and legal/illegal fixtures.

3. **Existing regression suite**
   - all existing profile, mobile, continuation, scoring, report, cause-cost, platform, backend API, and deployment guardrail tests remain green;
   - `index.html`, scoring, report compilation, and runtime API behavior remain untouched apart from a test-workflow entry.

## 12. Expected PR #7 Files

```text
backend/database/README.md
backend/database/migrations/0001_initial_bsti_schema.up.sql
backend/database/migrations/0001_initial_bsti_schema.down.sql
platform/contracts/p0-data-model.v0.1.json
tests/mysql-schema-migration-contract.mjs
.github/workflows/profile-capture.yml
README.md
docs/superpowers/specs/2026-08-01-bsti-mysql-schema-migration-contract-design.md
docs/superpowers/plans/2026-08-01-bsti-mysql-schema-migration-contract-plan.md
```

A small CI-only helper is permitted only when needed for deterministic MySQL inspection.

## 13. Explicit Non-Goals

PR #7 does not implement:

- real CloudBase/TencentDB resources or database provisioning;
- runtime database connection;
- create, save, submit, redact, or void endpoints;
- frontend submission or production persistence;
- report snapshots or public report tokens;
- backend scoring or report compilation;
- research tables, export, analysis, publication, or model training;
- person, organization, customer, account, or tenant masters;
- cross-assessment linking;
- login, OAuth, WeChat/WeCom callbacks, CRM, booking, payment, or Eliy;
- production legal closure, domain, or deployment.

## 14. Acceptance Criteria

PR #7 is complete only when:

- versioned SQL creates the four operational tables and `schema_migrations`;
- every approved product decision is represented;
- one row per item is the only authoritative answer format;
- profile and research consent are separate one-to-one records;
- no master identity entity exists;
- structurally incoherent status, consent, marketing, redaction, item, and answer records are rejected;
- profile redaction is structurally possible without altering answers or assessment audit identity;
- isolated MySQL 8 `up → down → up` passes;
- no real environment, credential, or customer data is used;
- runtime submission and persistence capabilities remain disabled;
- all existing BSTI tests remain green;
- the PR remains unmerged until founder acceptance.

## 15. Launch Sequence

After PR #7:

- **PR #8** implements assessment submission, persistence, consent, redaction, and void transactions while preserving browser-authoritative scoring and report compilation;
- **PR #9** creates and verifies the production environment, applies migrations, connects the frontend, completes legal/domain/backup/restore controls, and performs launch and rollback rehearsal.

Accounts, cross-assessment history, public report tokens, research pipelines, dashboards, CRM, payment, and Eliy remain outside the minimum launch path.