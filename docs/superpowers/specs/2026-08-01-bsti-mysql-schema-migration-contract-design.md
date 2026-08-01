# BSTI PR #7｜MySQL Schema and Migration Contract Design

**Status:** Founder-approved, implemented, and self-reviewed

**Baseline:** `main` at `76b0600881c7e5fe57a4b358f3c3a936008a7178`

**Target:** `PR #7｜MySQL Schema and Migration Contract`

## 1. Purpose

PR #7 establishes the first repository-controlled relational schema for BSTI and proves that it can be applied, removed, and reapplied on an isolated MySQL 8 instance.

PR #7 does not:

- connect a real CloudBase or managed MySQL environment;
- enable assessment submission or persistence;
- add a production database SDK;
- alter `BSTI-40 V0.4.3`;
- alter `BSTM V0.4.4.1`;
- move scoring or report compilation away from the browser.

The backend remains limited to future validation, storage, association, and access control. It must not score assessments or compile reports.

## 2. Frozen Product Decisions

### 2.1 Independent assessment records

Each assessment is an independent measurement event.

PR #7 creates no persistent master entity for:

- persons;
- organizations;
- customers;
- accounts;
- tenants;
- cross-assessment identity resolution.

Corrections and retakes create a new assessment rather than attaching to or mutating a long-lived person or organization record.

### 2.2 One authoritative answer row per item

`assessment_answers` is the only authoritative stored answer representation.

- one row per item;
- composite primary key `(assessment_id, item_id)`;
- item IDs 1 through 40;
- answer values 1 through 5;
- no authoritative answer JSON copy;
- no score, quadrant total, focus group, or compiled report storage.

### 2.3 A+ research boundary

The operational schema preserves structured fields that may support future instrument validation, cohort analysis, theory development, and model iteration.

Research remains separate from product delivery:

- research consent is independent and optional;
- refusal does not block measurement or report delivery;
- PR #7 creates no research table, export, statistics pipeline, or model-training pipeline;
- future research projection must use an independent research identifier;
- operational `assessment_id` and reversible mapping keys must not enter the research layer.

### 2.4 Profile snapshot separation

Assessment lifecycle data belongs in `assessments`.

Assessment-specific identifying and contextual information belongs in the one-to-one `assessment_profile_snapshots` row.

Profile data never enters scoring. `revenue_band` and `headcount_band` remain context-only.

### 2.5 Redaction is not anonymization

Operational profile cleanup is called **redaction**, not anonymization.

The operational database still retains the assessment audit record and answer rows, so it must not claim that the entire record is anonymous.

Redaction:

- preserves the profile row and its assessment relationship;
- clears identifying and quasi-identifying profile fields;
- records time, reason, actor type, and opaque actor reference;
- preserves notice versions and consent audit evidence;
- does not alter answers or lifecycle facts.

True irreversible anonymization is reserved for a future research projection outside the operational schema.

### 2.6 Submitted assessments are immutable

Approved lifecycle:

```text
draft → submitted → voided
```

- `draft`: profile and answers may be created or replaced;
- `submitted`: profile facts and answers become immutable in the later transaction layer;
- `voided`: terminal audit state, excluded from new report delivery and future research projection.

Only PR #8 will implement transaction authorization and immutability enforcement. PR #7 defines the data contract.

## 3. Repository Architecture

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

The existing `.github/workflows/profile-capture.yml` runs both static contract checks and disposable MySQL 8 verification.

## 4. Database Conventions

- MySQL major version: 8;
- storage engine: InnoDB;
- character set: `utf8mb4`;
- collation: `utf8mb4_0900_ai_ci` for application text tables;
- timestamp precision: `DATETIME(3)`;
- timestamps are written and interpreted as UTC;
- application-generated UUID strings use `CHAR(36)` with ASCII binary collation;
- table and column names use plural snake case;
- constraints and indexes have explicit stable names;
- no triggers, stored procedures, scheduled events, or generated score logic.

PR #7 does not create a database, user, network route, environment resource, or credential.

## 5. Physical Tables

### 5.1 `schema_migrations`

| Column | SQL contract |
|---|---|
| `version` | `VARCHAR(20)` ASCII binary primary key |
| `filename` | `VARCHAR(255)` ASCII binary, unique |
| `checksum_sha256` | lowercase 64-character SHA-256 |
| `applied_at` | `DATETIME(3)` not null |

Merged migrations are immutable. Corrections require a new numbered migration.

Migration tooling introduced now or later must reject:

- a reused version with another filename;
- checksum mismatch;
- missing earlier migration;
- out-of-order application.

### 5.2 `assessments`

| Column | SQL contract |
|---|---|
| `id` | `CHAR(36)` ASCII binary primary key |
| `instrument_id` | `VARCHAR(32)`, checked as `BSTI-40` |
| `instrument_version` | `VARCHAR(32)`, checked as `V0.4.3` |
| `status` | `VARCHAR(16)`: `draft`, `submitted`, `voided` |
| `started_at` | `DATETIME(3)` not null |
| `submitted_at` | nullable |
| `voided_at` | nullable |
| `void_reason_code` | nullable, required when voided |
| `voided_by_actor_type` | nullable, required when voided |
| `voided_by_actor_reference` | nullable opaque audit reference, required when voided |
| `created_at` | `DATETIME(3)` not null |
| `updated_at` | `DATETIME(3)` not null |

Lifecycle checks:

- draft: submission and void fields are null;
- submitted: submission time is present and void fields are null;
- voided: submission time, void time, reason, actor type, and actor reference are present;
- `started_at <= submitted_at` when submitted;
- `submitted_at <= voided_at` when voided.

Indexes:

- `(status, created_at)`;
- `(submitted_at)`.

### 5.3 `assessment_profile_snapshots`

`assessment_id` is both primary key and restricted foreign key to `assessments.id`.

| Column | SQL contract |
|---|---|
| `assessment_id` | `CHAR(36)` primary/foreign key |
| `display_name` | `VARCHAR(128)`, required while not redacted |
| `business_entity_name` | `VARCHAR(255)`, required while not redacted |
| `current_role` | `VARCHAR(128)`, required while not redacted |
| `industry_code` | `VARCHAR(64)`, required while not redacted |
| `industry_other_text` | `VARCHAR(255)`, only when industry code is `other` |
| `revenue_band` | `VARCHAR(64)`, context-only, required while not redacted |
| `headcount_band` | `VARCHAR(64)`, context-only, required while not redacted |
| `privacy_notice_version` | `VARCHAR(64)` not null |
| `report_usage_notice_version` | `VARCHAR(64)` not null |
| `report_processing_consent_at` | `DATETIME(3)` not null |
| `marketing_consent_granted` | boolean, default false |
| `marketing_consent_text_version` | required only when marketing consent is true |
| `marketing_consent_at` | required only when marketing consent is true |
| `redacted_at` | nullable |
| `redaction_reason_code` | required when redacted |
| `redacted_by_actor_type` | required when redacted |
| `redacted_by_actor_reference` | required when redacted |
| `created_at` | `DATETIME(3)` not null |
| `updated_at` | `DATETIME(3)` not null |

Identity-state check:

- active profile: redaction audit fields are null and required profile fields are populated;
- redacted profile: redaction audit fields are populated and identifying/quasi-identifying fields are null;
- partial redaction is rejected.

Notice versions, report-processing consent evidence, and marketing-consent audit fields remain because they are audit metadata rather than identity master data.

Indexes support future controlled analysis by industry, revenue band, and headcount band.

### 5.4 `assessment_answers`

| Column | SQL contract |
|---|---|
| `assessment_id` | `CHAR(36)` restricted foreign key |
| `item_id` | `TINYINT UNSIGNED`, check 1–40 |
| `answer_value` | `TINYINT UNSIGNED`, check 1–5 |
| `created_at` | `DATETIME(3)` not null |
| `updated_at` | `DATETIME(3)` not null |

Constraints:

- primary key `(assessment_id, item_id)`;
- index `(item_id, answer_value)`;
- no answer JSON, score, quadrant, focus, or report columns.

PR #8 must atomically verify that submission contains exactly one row for every item 1 through 40.

### 5.5 `assessment_research_consents`

`assessment_id` is both primary key and restricted foreign key.

| Column | SQL contract |
|---|---|
| `assessment_id` | one-to-one parent reference |
| `consent_status` | `not_granted`, `granted`, or `withdrawn` |
| `consent_text_version` | required for granted or withdrawn |
| `granted_at` | required for granted or withdrawn |
| `withdrawn_at` | required only for withdrawn |
| `created_at` | `DATETIME(3)` not null |
| `updated_at` | `DATETIME(3)` not null |

Status checks:

- not granted: version and grant/withdrawal timestamps are null;
- granted: version and grant time are present, withdrawal is null;
- withdrawn: version, grant time, and withdrawal time are present;
- withdrawal cannot precede grant.

PR #8 will create a `not_granted` row in the assessment-creation transaction. The database cannot enforce reverse one-to-one existence.

Research consent does not authorize marketing; marketing consent does not authorize research.

## 6. Lifecycle Ownership

### Database ownership

The database enforces:

- primary keys;
- foreign keys;
- uniqueness;
- legal value ranges;
- status/timestamp coherence;
- consent/timestamp coherence;
- profile active/redacted coherence.

### PR #8 ownership

The later transaction layer must enforce:

- required profile completeness before submission;
- exactly 40 answers and exact item set 1–40;
- legal state transitions;
- submitted profile/answer immutability;
- research-consent transition authorization;
- authorized redaction;
- authorized voiding.

## 7. Future Anonymous Research Projection

PR #7 creates no research projection.

Future eligibility requires:

```text
assessment.status = submitted
AND research_consent.consent_status = granted
AND profile_snapshot.redacted_at IS NULL
```

Voided records are ineligible because their status is no longer submitted.

A future anonymous research layer must exclude:

- names and contact identifiers;
- business entity names;
- free-form profile text;
- IP or device data;
- exact operational submission timestamps;
- operational assessment IDs;
- reversible mapping keys.

Permitted future dimensions, after privacy-risk review, may include:

- instrument version;
- item and answer values;
- coarse industry bucket;
- revenue band;
- headcount band;
- role category;
- coarse collection period.

Future publication or model use must define minimum group sizes, rare-combination suppression, and re-identification-risk review.

## 8. Migration Contract

`0001_initial_bsti_schema.up.sql` creates:

1. `schema_migrations`;
2. `assessments`;
3. `assessment_profile_snapshots`;
4. `assessment_answers`;
5. `assessment_research_consents`.

`0001_initial_bsti_schema.down.sql` drops them in reverse dependency order.

The down migration is for disposable verification and pre-production rehearsal. It is not authorization to destroy production data.

A future production migration requires:

- authorized credentials outside the repository;
- current backup;
- verified restore capability;
- exact migration checksum review;
- rollback and incident procedure.

## 9. Verification Contract

Static Node verification must prove:

- exact machine-readable contract;
- five expected migration tables;
- all tables use InnoDB and `utf8mb4`;
- exact named checks and indexes;
- three restricted foreign keys;
- answer ranges and composite key;
- profile redaction fields and absence of false anonymization naming;
- reverse down-migration order;
- absence of master identity tables, triggers, scoring, report compilation, secrets, and real environment references;
- unchanged frozen instrument/report boundaries;
- disabled runtime submission, persistence, backend scoring, and backend report compilation.

Disposable MySQL 8 verification must prove:

1. apply up migration;
2. inspect table, column, primary-key, foreign-key, check, engine, and named-index counts;
3. record the real migration SHA-256;
4. insert legal draft, submitted, and voided states;
5. insert one legal profile, 40 legal answers, and one not-granted research consent;
6. reject duplicate answers, item 41, answer value 6, incoherent lifecycle data, incoherent consent data, and partial redaction;
7. complete one legal redaction;
8. apply down migration and verify removal;
9. reapply up migration and verify recreation;
10. rerun the existing backend smoke test with submission and persistence still disabled.

## 10. Acceptance Criteria

PR #7 is complete when:

- the schema and both migration directions are committed;
- the machine-readable data contract is committed;
- static and disposable MySQL 8 tests pass;
- existing product and backend contracts remain green;
- no product page, assessment logic, scoring logic, or report compiler changes;
- no real database or environment connection;
- runtime submission and persistence remain disabled;
- the PR remains unmerged until founder approval.
