# BSTI PR #8｜Assessment Submission and Persistence Transaction Design

**Status:** Founder-approved design  
**Date:** 2026-08-02  
**Repository:** `business-and-talent/bsti`  
**Branch:** `feat/assessment-submission-persistence-v01`  
**Baseline:** `main` after merged PR #7, commit `118926b5034dd7d0d8d7fd1c6b4fd41b9d2e7946`

## 1. Goal

Add one disabled-by-default backend write capability that accepts a completed BSTI assessment and persists it atomically to MySQL.

PR #8 does not create server-side drafts, connect the GitHub Pages demo to the API, deploy a real Tencent Cloud environment, or enable production collection. It prepares the backend transaction that PR #9 will activate and connect.

The frozen product boundary remains:

- instrument: `BSTI-40 V0.4.3`;
- report rules: `BSTM V0.4.4.1`;
- browser scoring and report compilation remain authoritative;
- only answers enter scoring;
- revenue and headcount remain context-only;
- backend responsibilities are validation, storage, association, and access control;
- backend and database must not score or compile reports.

## 2. Approved Scope

PR #8 implements:

- `POST /v1/assessments`;
- strict JSON request validation;
- one-shot persistence after all 40 answers are complete;
- one MySQL transaction covering the full assessment aggregate;
- deterministic request fingerprinting for safe retry;
- identical retry replay and conflicting retry rejection;
- disabled-by-default submission configuration;
- real MySQL 8 integration verification in CI.

PR #8 does not implement:

- server-side draft creation, autosave, resume tokens, or partial-answer APIs;
- assessment read, list, update, void, redaction, or delete APIs;
- report storage, report retrieval, backend scoring, or backend report compilation;
- research consent UI, research export, research projection, or model training;
- accounts, login, person or organization master records, cross-assessment identity resolution;
- CRM, booking, payment, WeChat OAuth, WeCom callbacks, or Eliy interpretation;
- real CloudBase/TencentDB resources, credentials, domain, or deployment;
- any change to the GitHub Pages demo submission behavior.

## 3. Public API Contract

### 3.1 Route

```http
POST /v1/assessments
Content-Type: application/json
```

Maximum request body: 64 KiB.

When submission is disabled, the route exists but returns `503 SUBMISSION_DISABLED` without parsing or storing the body.

### 3.2 Request body

```json
{
  "schemaVersion": "bsti-assessment-submission-v1",
  "assessmentId": "550e8400-e29b-41d4-a716-446655440000",
  "instrument": {
    "id": "BSTI-40",
    "version": "V0.4.3"
  },
  "profile": {
    "displayName": "测试用户",
    "businessUnit": "测试企业",
    "roleCode": "founder_controller",
    "roleOther": "",
    "revenueBand": "prefer_not_to_say",
    "headcountBand": "prefer_not_to_say",
    "industryCode": "professional_services",
    "industryOther": ""
  },
  "consents": {
    "reportProcessing": true,
    "reportProcessingVersion": "BSTI_PRIVACY_V0.1",
    "reportUsageVersion": "BSTI_REPORT_USAGE_V0.1",
    "marketing": false,
    "marketingVersion": null
  },
  "answers": [
    { "itemId": 1, "value": 3 },
    { "itemId": 2, "value": 4 }
  ]
}
```

The real request contains exactly 40 answer objects, one for each `itemId` from 1 through 40.

### 3.3 Profile-code contract

The implementation creates one machine-readable profile-options contract from the option codes already emitted by the current frontend. It must preserve the existing codes exactly and must not rename, broaden, or invent customer-facing classifications.

The contract contains the accepted sets for:

- `roleCode`;
- `revenueBand`;
- `headcountBand`;
- `industryCode`.

Conditional rules:

- `roleOther` is required and non-empty only when `roleCode = other`; otherwise it must be empty;
- `industryOther` is required and non-empty only when `industryCode = other`; otherwise it must be empty.

Database mapping for `current_role`:

- non-`other`: store the exact `roleCode`;
- `other`: store `other:` followed by the trimmed `roleOther` value.

`businessUnit` maps to `business_entity_name`.

### 3.4 Consent contract

Report processing is mandatory:

- `reportProcessing` must be `true`;
- `reportProcessingVersion` must equal `BSTI_PRIVACY_V0.1`;
- `reportUsageVersion` must equal `BSTI_REPORT_USAGE_V0.1`.

Marketing remains optional:

- when `marketing = false`, `marketingVersion` must be `null`;
- when `marketing = true`, `marketingVersion` must equal `BSTI_MARKETING_V0.1`.

Research is not exposed in this request. Every successful submission creates `assessment_research_consents` with:

```text
consent_status = not_granted
consent_text_version = null
granted_at = null
withdrawn_at = null
```

This does not block assessment or report delivery.

### 3.5 Answer validation

The backend requires:

- `answers` is an array of exactly 40 objects;
- each object contains only `itemId` and `value`;
- `itemId` is an integer from 1 through 40;
- every item ID appears exactly once;
- `value` is an integer from 1 through 5;
- no score, quadrant total, focus group, report content, or derived result is accepted.

### 3.6 Success responses

First successful submission:

```http
HTTP/1.1 201 Created
```

```json
{
  "assessmentId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "submittedAt": "2026-08-02T00:00:00.000Z",
  "replayed": false
}
```

Identical retry using the same `assessmentId`:

```http
HTTP/1.1 200 OK
```

```json
{
  "assessmentId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "submittedAt": "2026-08-02T00:00:00.000Z",
  "replayed": true
}
```

Responses contain no profile data, answers, scores, report content, or research status.

## 4. Error Contract

All errors retain the existing JSON envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Stable public message"
  }
}
```

Validation failures may add a bounded `details` array containing only field paths and stable codes; it must not echo submitted personal information or answers.

Required mappings:

| Status | Code | Condition |
|---|---|---|
| `400` | `INVALID_JSON` | malformed JSON |
| `400` | `INVALID_CONTENT_TYPE` | request is not JSON |
| `413` | `PAYLOAD_TOO_LARGE` | body exceeds 64 KiB |
| `422` | `INVALID_SUBMISSION` | schema, profile, consent, version, or answer validation failure |
| `409` | `SUBMISSION_CONFLICT` | same `assessmentId` exists with different normalized content, or existing record is not replayable |
| `503` | `SUBMISSION_DISABLED` | submission feature flag is false |
| `503` | `PERSISTENCE_UNAVAILABLE` | database transaction cannot be completed |
| `405` | `METHOD_NOT_ALLOWED` | known route called with wrong method |
| `404` | `NOT_FOUND` | unknown route |

Internal database, stack, SQL, credential, host, and request-body details must never be returned.

## 5. Idempotency Contract

### 5.1 Client identifier

`assessmentId` must be a canonical RFC 4122 version-4 UUID. PR #9 will generate it with browser `crypto.randomUUID()` before submission.

### 5.2 Canonical fingerprint

After validation, the backend builds a canonical object containing:

- schema version;
- instrument ID/version;
- normalized profile fields;
- normalized consent fields;
- answers sorted by numeric `itemId`.

It excludes `assessmentId` and all server-generated timestamps.

The backend serializes the canonical object with fixed key order and stores the lowercase SHA-256 digest as `submission_fingerprint`.

The fingerprint is operational retry metadata. It is not anonymity evidence and must not be exported to research data.

### 5.3 Retry rules

- missing `assessmentId`: validation failure;
- new ID: create the aggregate and return `201`;
- existing ID, same fingerprint, status `submitted`: return the original `submitted_at` and `200 replayed=true`;
- existing ID with different fingerprint: `409`;
- existing ID in `draft` or `voided`: `409`.

A primary-key race is handled by rolling back, loading the committed existing record, and applying the same retry rules. No idempotency table, queue, or distributed lock is introduced.

## 6. Database Migration

PR #8 adds:

```text
backend/database/migrations/
├── 0002_add_submission_fingerprint.up.sql
└── 0002_add_submission_fingerprint.down.sql
```

The up migration adds to `assessments`:

```sql
submission_fingerprint CHAR(64)
  CHARACTER SET ascii
  COLLATE ascii_bin
  NOT NULL
```

and a named check constraint requiring lowercase hexadecimal SHA-256 format.

The down migration removes the check and column.

No unique index is added: two independently identified assessments may legitimately contain identical answers and profile values.

PR #8 updates the machine-readable data-model contract and CI to apply migrations `0001` then `0002`, reverse `0002` then `0001`, and recreate both.

## 7. Transaction Design

One submission uses one MySQL connection and one transaction.

```text
validate request outside transaction
→ normalize and fingerprint
→ begin transaction
→ attempt assessments draft insert
→ insert profile snapshot
→ insert 40 answer rows
→ insert research consent as not_granted
→ update assessments draft → submitted
→ commit
```

Server timestamps:

- `started_at`, `created_at`, and initial `updated_at` use the transaction start time;
- because PR #8 has no server draft, `started_at` represents persistence-transaction start, not browser questionnaire start;
- `submitted_at` and final `updated_at` use the submission completion time;
- consent timestamps use server time;
- all timestamps are UTC.

Any failure before commit rolls back the whole aggregate. The database must never retain a partial profile, partial answers, or orphan consent row from a failed submission.

The final update must affect exactly one row in `draft` status. Otherwise the transaction fails and rolls back.

## 8. Component Boundaries

### `src/submission-contract.js`

Owns frozen API constants and accepted profile option codes. Contains no database or HTTP logic.

### `src/submission-validation.js`

Pure validation and normalization. Returns either a normalized submission or bounded path/code validation issues. Does not score.

### `src/submission-fingerprint.js`

Builds fixed-order canonical content and returns SHA-256. Contains no database or HTTP logic.

### `src/assessment-repository.js`

Owns MySQL transaction and replay lookup. Accepts only normalized submissions and fingerprints. Does not validate customer-facing semantics, score, or compile reports.

### `src/assessment-submission-service.js`

Coordinates validation, fingerprinting, repository persistence, replay, and conflict mapping.

### `src/request-body.js`

Reads JSON with a 64 KiB hard limit and stable parse errors.

### `src/database.js`

Creates the `mysql2/promise` pool only when submission is enabled. Does not log credentials.

### `src/app.js`

Routes HTTP requests, injects the submission service, maps service outcomes to stable HTTP responses, and preserves existing read-only routes.

## 9. Configuration and Capability Rules

Existing defaults remain safe:

```text
BSTI_RUNTIME_ENV=development
BSTI_SUBMISSION_ENABLED=false
BSTI_API_VERSION=v1
PORT=9000
```

When `BSTI_SUBMISSION_ENABLED=false`:

- database variables are not required;
- no pool is created;
- `/health` reports `submissionEnabled: false`;
- `/v1/capabilities` reports submission and persistence false;
- `POST /v1/assessments` returns `503 SUBMISSION_DISABLED`.

When `BSTI_SUBMISSION_ENABLED=true`, all database variables are required:

```text
BSTI_DB_HOST
BSTI_DB_PORT
BSTI_DB_NAME
BSTI_DB_USER
BSTI_DB_PASSWORD
BSTI_DB_CONNECTION_LIMIT
```

`BSTI_DB_CONNECTION_LIMIT` defaults to a small bounded value suitable for a serverless function and must be validated as a positive integer.

Capabilities become configuration-derived:

```json
{
  "apiVersion": "v1",
  "healthCheck": true,
  "assessmentSubmission": true,
  "persistence": true,
  "backendScoring": false,
  "backendReportCompilation": false
}
```

Submission and persistence are one capability in PR #8: they are enabled or disabled together. PR #9 controls the production values.

## 10. HTTP Method Rules

- `GET /health`: only GET; other methods return 405 with `Allow: GET`;
- `GET /v1/capabilities`: only GET; other methods return 405 with `Allow: GET`;
- `POST /v1/assessments`: only POST; other methods return 405 with `Allow: POST`;
- unknown path: 404 regardless of method.

The existing GET behavior and response bodies remain backward-compatible when submission is disabled.

## 11. Security and Privacy Boundaries

PR #8 must not persist or log:

- IP address;
- user agent or device identifier;
- raw request bodies;
- database credentials or connection strings;
- report HTML/JSON;
- quadrant scores, focus routing, or model outputs;
- research projection identifiers.

Operational logs may contain only stable error category, route, method, and assessment ID when necessary for transaction diagnosis. They must not contain name, business entity, role text, answers, or consent text.

SQL uses parameterized statements only. Dynamic customer data must never be interpolated into SQL strings.

The GitHub Pages demo remains submission-disabled and continues warning against real personal or enterprise data.

## 12. Testing Strategy

### 12.1 Pure unit contracts

Test:

- exact request schema and unknown-field rejection;
- UUID v4 validation;
- frozen instrument/version validation;
- profile option and conditional-other validation;
- mandatory report-processing consent;
- optional marketing consent coherence;
- exactly 40 unique answers, IDs 1–40, values 1–5;
- canonical ordering and stable fingerprint;
- no scoring/report fields accepted.

### 12.2 HTTP contracts

Using injected fake services, test:

- default disabled response;
- content type, malformed JSON, and body limit;
- 201 first success;
- 200 identical replay;
- 409 conflict;
- 422 validation response without PII echo;
- method-specific 405 and unknown-route 404;
- existing health and capabilities behavior.

### 12.3 Repository transaction contracts

Using fake `mysql2` connections, prove:

- begin/commit on success;
- rollback on every intermediate failure;
- exactly 40 parameterized answer rows;
- draft insert precedes child rows;
- final draft-to-submitted update affects exactly one row;
- duplicate-key path performs replay lookup;
- no score or report SQL exists.

### 12.4 Real MySQL 8 CI proof

On disposable MySQL 8:

1. apply migrations `0001` and `0002`;
2. start API with submission enabled and test-only database values;
3. submit one valid 40-answer request;
4. verify one submitted assessment, one profile snapshot, 40 answers, and one `not_granted` research-consent row;
5. verify stored fingerprint format and no score/report columns;
6. retry identical request and receive replay without new rows;
7. retry same ID with one changed answer and receive 409 without mutation;
8. submit invalid profile/consent/answer payloads and verify zero rows;
9. verify disabled configuration still returns 503 and creates no pool;
10. reverse and recreate both migrations;
11. run all existing BSTI, report, backend, and migration contracts.

## 13. Acceptance Criteria

PR #8 is complete only when:

- the route, validation, fingerprint, transaction, and replay contracts are implemented;
- the new migration is reversible and verified on MySQL 8;
- a valid request creates exactly one complete submitted aggregate;
- identical retry is idempotent and conflicting retry is rejected;
- any failure leaves no partial aggregate;
- research consent is always stored as `not_granted`;
- default runtime remains submission-disabled;
- no frontend production connection or real environment is introduced;
- browser scoring/report compilation and all frozen product tests remain unchanged and green.
