# BSTI PR #7｜MySQL Schema and Migration Contract Design

**Status:** Founder-approved design

**Baseline:** `main` at `76b0600881c7e5fe57a4b358f3c3a936008a7178` after merged PR #6

**Target pull request:** `PR #7｜MySQL Schema and Migration Contract`

## 1. Purpose

PR #7 establishes the first versioned relational data model for BSTI and proves that the schema can be created, rolled back, and recreated on an isolated MySQL 8 instance.

This pull request does **not** connect a real Tencent CloudBase or TencentDB environment. It does **not** enable assessment submission or persistence in the running backend. It only establishes the repository-controlled database contract required by the later submission and production-launch pull requests.

The current product boundary remains unchanged:

- `BSTI-40 V0.4.3` is the frozen instrument;
- `BSTM V0.4.4.1` is the frozen report-rules version;
- the browser remains the authoritative scoring and report compiler;
- revenue band and headcount band remain context-only inputs;
- the backend may validate, store, associate, and control access;
- the backend and database must not score assessments or compile reports.

## 2. Approved Product Decisions

### 2.1 Independent assessment records

Each assessment is an independent record and snapshot.

PR #7 must not create persistent master entities for:

- persons;
- organizations;
- customers;
- tenants;
- accounts;
- cross-assessment identity resolution.

The system must not infer that two assessments belong to the same person or business entity. Future cross-assessment association, if approved, must be introduced by a later migration with explicit authorization and access rules.

### 2.2 Authoritative answers: one row per item

The only authoritative stored answer representation is one row per item in `assessment_answers`.

The database must not store a second authoritative copy of all 40 answers as JSON. The combination of `assessment_id` and `item_id` must be unique.

### 2.3 A+ research boundary

The operational schema preserves the minimum structured fields that may support future anonymous research, instrument validation, cohort analysis, theory development, and model iteration.

Research use remains separate from product delivery:

- research consent is independent and optional;
- research refusal must not block assessment completion or report delivery;
- PR #7 does not implement a research dataset, research export, statistics pipeline, or model-training pipeline;
- future research projection must use an independently generated research identifier and must not expose an operational `assessment_id` or reversible mapping key.

### 2.4 Profile snapshot separation

Assessment lifecycle data belongs in `assessments`.

The name, business entity, role, industry, revenue band, headcount band, and notice/consent evidence belong in a one-to-one `assessment_profile_snapshots` record.

This separation permits tighter access control, retention, deletion, or anonymization treatment for identifying data without altering the authoritative answers or assessment audit record.

### 2.5 Submitted assessments are immutable

The approved lifecycle is:

```text
draft → submitted → voided
```

- `draft`: profile and answers may be created or replaced;
- `submitted`: profile and answers are immutable;
- `voided`: terminal state; the audit record remains, but the assessment is excluded from further report delivery and future research projection.

Corrections or retakes create a new assessment. A submitted or voided assessment is never edited back into a draft.

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

The implementation may add a narrowly scoped CI helper when required to run MySQL 8 migration verification. It must not add a production database SDK, a live connection configuration, or a deployment credential.

The runtime API created in PR #6 remains unchanged and continues to declare:

- `assessmentSubmission: false`;
- `persistence: false`;
- `backendScoring: false`;
- `backendReportCompilation: false`.

## 4. Database Conventions

### 4.1 Database target

- MySQL 8;
- InnoDB tables;
- `utf8mb4` character set;
- millisecond timestamps using `DATETIME(3)`;
- application-generated UUID values stored as `CHAR(36)` using ASCII-compatible collation;
- all application timestamps are written and interpreted as UTC.

PR #7 does not create a database, database user, network route, or CloudBase resource.

### 4.2 Naming

- plural snake-case table names;
- snake-case columns;
- constraint and index names are explicit and stable;
- migration files use zero-padded monotonic numeric prefixes;
- migration ordering is lexical and therefore deterministic.

### 4.3 Constraint ownership

The database enforces structural integrity:

- primary keys;
- foreign keys;
- uniqueness;
- allowed value ranges;
- required values;
- timestamp/status coherence where expressible as a check constraint.

The later backend transaction layer enforces workflow integrity:

- exactly 40 answers before submission;
- exact instrument and version match;
- complete required profile data;
- legal state transitions;
- submitted-record immutability;
- research-consent transition rules.

PR #7 must not use database triggers, stored procedures, scheduled jobs, generated quadrant scores, or report-compiler logic.

## 5. Table Design

## 5.1 `assessments`

Purpose: aggregate root for one independent BSTI measurement event.

Required columns:

| Column | Contract |
|---|---|
| `id` | `CHAR(36)` primary key; application-generated UUID |
| `instrument_id` | required; frozen value `BSTI-40` for P0 |
| `instrument_version` | required; frozen value `V0.4.3` for P0 |
| `status` | required; `draft`, `submitted`, or `voided` |
| `started_at` | required UTC timestamp |
| `submitted_at` | null for draft; required for submitted and voided |
| `voided_at` | null unless voided |
| `void_reason_code` | null unless voided; required for voided |
| `voided_by_actor_type` | null unless voided; required for voided |
| `voided_by_actor_reference` | null unless voided; required for voided; opaque audit reference, not a new user master entity |
| `created_at` | required UTC timestamp |
| `updated_at` | required UTC timestamp |

Status coherence:

- `draft`: `submitted_at`, `voided_at`, and all void metadata are null;
- `submitted`: `submitted_at` is not null and all void metadata are null;
- `voided`: `submitted_at`, `voided_at`, reason, actor type, and actor reference are not null;
- a voided timestamp cannot precede the submitted timestamp.

Indexes:

- status plus creation time for operational queueing;
- submitted time for later retention and audit operations.

No score, quadrant, focus group, report narrative, report HTML, or report JSON column is permitted in this table.

## 5.2 `assessment_profile_snapshots`

Purpose: one-to-one snapshot of identifying and contextual information provided for one assessment.

Primary and foreign key:

- `assessment_id` is both the primary key and a foreign key to `assessments.id`;
- deletion is restricted rather than cascaded because assessment records are audit records.

Required or conditionally required fields:

| Column | Contract |
|---|---|
| `assessment_id` | one-to-one parent reference |
| `display_name` | assessment-specific name snapshot |
| `business_entity_name` | company or primary operating entity snapshot |
| `current_role` | role snapshot; not a person master record |
| `industry_code` | stable application code |
| `industry_other_text` | allowed only when `industry_code` represents `other`; otherwise null |
| `revenue_band` | context-only classification |
| `headcount_band` | context-only classification |
| `privacy_notice_version` | version shown when report-processing consent was obtained |
| `report_usage_notice_version` | report-use notice version shown |
| `report_processing_consent_at` | required evidence for product delivery processing |
| `marketing_consent_granted` | required boolean; false by default |
| `marketing_consent_text_version` | required only when marketing consent is granted |
| `marketing_consent_at` | required only when marketing consent is granted |
| `created_at` | required UTC timestamp |
| `updated_at` | required UTC timestamp |

Scoring isolation:

- none of these fields may enter BSTI scoring;
- `revenue_band` and `headcount_band` remain context-only;
- the database must not derive or store a score from any profile field.

The schema does not create separate person or organization foreign keys.

## 5.3 `assessment_answers`

Purpose: the single authoritative answer store.

Required columns:

| Column | Contract |
|---|---|
| `assessment_id` | parent assessment reference |
| `item_id` | integer item identifier from 1 through 40 |
| `answer_value` | integer Likert response from 1 through 5 |
| `created_at` | required UTC timestamp |
| `updated_at` | required UTC timestamp |

Keys and constraints:

- composite primary key: `assessment_id`, `item_id`;
- foreign key to `assessments.id` with restricted deletion;
- `item_id` check: 1–40;
- `answer_value` check: 1–5;
- an index beginning with `item_id` may support future quality analysis without changing the answer authority model.

The database can constrain legal item identifiers and answer ranges. The later submission transaction must verify that a submitted assessment has exactly one answer for every item from 1 through 40.

Forbidden answer representations:

- no `answers_json` column;
- no duplicated response payload table;
- no score columns;
- no quadrant totals;
- no calculated focus group.

## 5.4 `assessment_research_consents`

Purpose: one-to-one research permission record, independent from report-processing consent.

Required columns:

| Column | Contract |
|---|---|
| `assessment_id` | primary key and parent reference |
| `consent_status` | `not_granted`, `granted`, or `withdrawn` |
| `consent_text_version` | required for granted or withdrawn consent; nullable while never granted |
| `granted_at` | required for granted or withdrawn status |
| `withdrawn_at` | required only for withdrawn status |
| `created_at` | required UTC timestamp |
| `updated_at` | required UTC timestamp |

Status coherence:

- `not_granted`: grant and withdrawal timestamps are null;
- `granted`: grant timestamp and text version are present; withdrawal timestamp is null;
- `withdrawn`: grant and withdrawal timestamps and text version are present;
- withdrawal cannot precede grant.

The future persistence transaction should create this row as `not_granted` when creating an assessment. The database cannot enforce reverse one-to-one existence, so PR #8 must enforce that operational invariant.

Research consent does not authorize marketing and marketing consent does not authorize research.

## 5.5 `schema_migrations`

Purpose: repository-controlled audit record for applied migrations.

Required columns:

| Column | Contract |
|---|---|
| `version` | migration identifier and primary key, such as `0001` |
| `filename` | exact repository migration filename |
| `checksum_sha256` | lowercase SHA-256 of the applied migration file |
| `applied_at` | required UTC timestamp |

Migration execution tooling, introduced now or later, must reject:

- a reused version with a different filename;
- an applied migration whose current checksum differs from the recorded checksum;
- out-of-order application when an earlier migration is missing.

Merged migration files are immutable. Corrections use a new migration rather than rewriting an applied migration.

## 6. Lifecycle and Immutability Contract

### 6.1 Draft creation

A later API transaction may create:

1. one `assessments` row with `draft` status;
2. one profile snapshot;
3. zero to 40 answer rows while the assessment is incomplete;
4. one research-consent row with `not_granted` status.

PR #7 does not implement this transaction.

### 6.2 Submission

A later submission transaction may transition `draft` to `submitted` only after validating:

- `instrument_id = BSTI-40`;
- `instrument_version = V0.4.3`;
- one complete required profile snapshot;
- required report-processing consent evidence;
- exactly 40 answer rows;
- item identifiers exactly 1 through 40;
- all answer values are integers from 1 through 5.

The transition and validation must be atomic in PR #8.

### 6.3 Submitted immutability

After submission, the backend must reject changes to:

- instrument identity or version;
- profile snapshot;
- answer rows;
- submission timestamp.

Research consent may still move from `granted` to `withdrawn` before irreversible anonymization. That consent change does not modify the submitted assessment facts.

### 6.4 Voiding

Only a submitted assessment may become voided.

A voided assessment:

- remains in the operational database for audit;
- is not restored to submitted or draft;
- is excluded from new report delivery;
- is excluded from future research projection even if research consent was previously granted;
- retains reason and actor audit metadata.

PR #7 defines the data contract. PR #8 implements authorization and transaction behavior.

## 7. Anonymous Research Projection Boundary

PR #7 does not create a research table or export.

A future research projection may consider a record only when:

```text
assessment.status = submitted
AND research_consent.consent_status = granted
AND assessment.status != voided
```

The future research layer must not contain:

- display name;
- phone, email, WeChat, or other contact identifiers;
- business entity name;
- free-form profile text;
- IP address or device information;
- exact operational submission timestamp;
- operational `assessment_id`;
- a reversible mapping key back to the operational database.

Permitted future research dimensions, after privacy-risk review, may include:

- instrument version;
- item identifier and answer value;
- coarse industry bucket;
- revenue band;
- headcount band;
- role category;
- coarse collection period.

Future research publication or model use must define minimum group sizes, rare-combination suppression, and re-identification-risk review. Those controls are not implemented in PR #7.

## 8. Migration Contract

### 8.1 Initial migration

`0001_initial_bsti_schema.up.sql` creates, in dependency order:

1. `schema_migrations`;
2. `assessments`;
3. `assessment_profile_snapshots`;
4. `assessment_answers`;
5. `assessment_research_consents`.

`0001_initial_bsti_schema.down.sql` drops the application tables in reverse dependency order and drops `schema_migrations` last.

### 8.2 Repeatability proof

CI must prove on an isolated MySQL 8 instance:

1. clean database;
2. apply `up`;
3. inspect required tables, columns, keys, indexes, and checks;
4. insert representative legal records;
5. prove illegal item IDs and answer values fail;
6. prove duplicate answers fail;
7. apply `down`;
8. prove the schema is removed;
9. apply `up` again;
10. prove the recreated schema matches the contract.

The test database must be disposable and must contain no production data.

### 8.3 Repository checks

Permanent tests must also verify:

- only expected migration filenames exist;
- migrations are numerically ordered;
- no credential, real environment ID, host, username, or password appears;
- no trigger, stored procedure, score, quadrant, report compiler, research export, person master, organization master, customer master, or tenant master is introduced;
- existing frozen platform contracts remain unchanged;
- PR #6 capabilities remain disabled.

## 9. Error and Rollback Principles

- Migration failure stops immediately and returns a non-zero exit status;
- CI must expose the failing migration version without printing credentials;
- partial schema application is treated as failure and the disposable database is discarded;
- production deployment procedures must later back up and verify restore capability before applying migrations;
- PR #7 does not claim transactional DDL rollback across all MySQL operations;
- the down migration is a development and pre-deployment verification mechanism, not permission to destroy production data.

## 10. Security and Privacy Boundaries

PR #7 must not commit:

- database passwords;
- connection strings;
- CloudBase environment IDs;
- TencentDB instance IDs;
- private network addresses;
- real personal or enterprise data;
- real consent records.

The schema must preserve separation between:

- assessment lifecycle;
- identifying/context profile snapshot;
- authoritative answers;
- optional research consent.

No database object may expose a public report token or create a public report URL in PR #7.

## 11. Testing Strategy

The PR #7 permanent verification set must include:

1. **Static data-model contract test**
   - expected files and tables;
   - no forbidden entities or fields;
   - frozen authority boundaries;
   - research projection remains unimplemented.

2. **MySQL migration integration test**
   - `up → down → up` against disposable MySQL 8;
   - constraint and foreign-key verification;
   - legal and illegal fixture cases;
   - no live cloud dependency.

3. **Existing regression suite**
   - all profile, mobile, continuation, scoring, report, cause-cost, platform, backend API, and deployment guardrail tests remain green;
   - `index.html`, scoring, report compiler, and runtime API behavior remain untouched unless a test-only workflow entry is required.

## 12. Files Expected in PR #7

Minimum expected additions or modifications:

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

A small CI-only helper is permitted if required for deterministic MySQL inspection. It must remain dependency-light and must not become a production migration service.

## 13. Explicit Non-Goals

PR #7 does not implement:

- a real CloudBase or TencentDB environment;
- database provisioning;
- runtime database connection;
- assessment create, save, submit, or void endpoints;
- frontend-to-backend submission;
- production persistence enablement;
- report snapshots;
- public report tokens;
- backend scoring or report compilation;
- research tables, export, analysis, publication, or model training;
- personal, organization, customer, account, or tenant master records;
- cross-assessment linking;
- login, OAuth, WeChat, WeCom callbacks, CRM, booking, payment, or Eliy interpretation;
- production legal-text finalization;
- production domain or launch deployment.

## 14. Acceptance Criteria

PR #7 is complete only when:

- the four operational tables and `schema_migrations` are created by versioned SQL;
- the schema matches every approved product decision in this design;
- one row per item is the only authoritative answer representation;
- profile snapshot and research consent are separate one-to-one records;
- no person or organization master entity exists;
- state and timestamp check constraints reject structurally incoherent records;
- the isolated MySQL 8 `up → down → up` proof passes;
- illegal answer ranges and duplicates are rejected;
- no real environment, database, credential, or customer data is used;
- the runtime capabilities remain submission-disabled and persistence-disabled;
- all pre-existing BSTI regression tests remain green;
- the PR remains unmerged until founder acceptance.

## 15. Position in the Launch Sequence

After PR #7:

- **PR #8** implements assessment submission and persistence transactions against this contract while preserving browser-authoritative scoring and report compilation;
- **PR #9** performs production-environment creation, migration, frontend connection, legal closure, backup/restore verification, domain configuration, end-to-end launch rehearsal, and rollback preparation.

Account systems, cross-assessment history, public report tokens, research pipelines, management dashboards, CRM, payment, and Eliy remain outside the minimum launch path.