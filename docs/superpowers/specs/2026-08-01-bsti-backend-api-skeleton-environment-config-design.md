# BSTI P0 Backend API Skeleton and Environment Configuration Design

**Status:** Frozen for PR #6 implementation  
**Date:** 2026-08-01  
**Repository:** `business-and-talent/bsti`  
**Baseline:** `4139b664f206610e0450d1d0b2bc6ecdc54501e4` / merged PR #5  
**Delivery mode:** Deployable repository skeleton only; no real CloudBase environment is created or connected in PR #6.

## 1. Purpose

Establish the smallest production-shaped backend boundary required before database or persistence work begins.

PR #6 proves that BSTI can run a dependency-free Node.js HTTP service locally and can later be deployed as a Tencent CloudBase HTTP cloud function. It does not accept assessment submissions, store data, score answers, or compile reports.

The browser remains the authoritative P0 scoring and report compiler. The backend remains limited to the future responsibilities already frozen in `platform/contracts/frozen-boundaries.v0.1.json`: validation, storage, association, and access control.

## 2. Selected Approach

Use a native Node.js HTTP server packaged as a CloudBase HTTP cloud function.

Reasons:

- CloudBase HTTP functions require the application to listen on port `9000`.
- Native `node:http` introduces no application framework dependency.
- A server factory can be tested locally on an ephemeral port while the deployment bootstrap remains fixed to port `9000` by default.
- The same route behavior is used in local tests and future CloudBase deployment.
- No CloudBase SDK is needed until a later PR introduces an actual platform service such as MySQL, storage, or identity.

The alternatives are intentionally rejected for PR #6:

- `@cloudbase/functions-framework`: unnecessary dependency for two read-only routes.
- Event-style function plus API conversion: introduces an avoidable transport translation layer.
- Express or another web framework: no current routing or middleware complexity justifies it.

## 3. Architecture and Component Boundaries

Planned repository structure:

```text
backend/
└── functions/
    └── bsti-api/
        ├── index.js
        ├── package.json
        ├── scf_bootstrap
        ├── .env.example
        └── src/
            ├── app.js
            ├── capabilities.js
            └── config.js
cloudbaserc.example.json
.gitignore
tests/backend-api-skeleton-contract.mjs
```

### `src/config.js`

Responsibilities:

- read only the approved environment variable names;
- apply safe defaults;
- reject malformed or unsupported values;
- reject any attempt to enable assessment submission;
- return a minimal normalized configuration object.

It must not read or expose CloudBase environment IDs, Tencent credentials, database URLs, API keys, or arbitrary `process.env` values.

### `src/capabilities.js`

Responsibilities:

- define the immutable P0 backend capability declaration;
- make explicit that submission, persistence, backend scoring, and backend report compilation are disabled;
- expose no runtime or infrastructure secrets.

### `src/app.js`

Responsibilities:

- create the native HTTP request handler/server;
- enforce method and route contracts;
- serialize deterministic JSON responses;
- set safe response headers;
- avoid logging request bodies or environment values.

The module must be importable by tests without opening a network port.

### `index.js`

Responsibilities:

- load normalized configuration;
- create the server;
- listen on the configured port, defaulting to `9000`;
- bind to `0.0.0.0` for CloudBase compatibility;
- log only service name, non-sensitive runtime environment, and port.

### `scf_bootstrap`

Responsibilities:

- start the Node.js process for the CloudBase HTTP function;
- contain no credentials or environment-specific identifiers;
- be committed with executable mode.

## 4. HTTP API Contract

All responses use:

```http
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
X-Content-Type-Options: nosniff
```

No production CORS policy is introduced in PR #6 because the current frontend does not call the API. CORS will be designed when the first real frontend-to-backend operation is introduced.

### `GET /health`

Purpose: prove that the process and configuration boundary are healthy.

Response: `200 OK`

```json
{
  "status": "ok",
  "service": "bsti-api",
  "environment": "development",
  "submissionEnabled": false
}
```

The response must not include timestamps, request IDs, hostnames, CloudBase environment IDs, regions, credentials, file paths, stack traces, or the complete runtime environment.

### `GET /v1/capabilities`

Purpose: expose the frozen P0 backend boundary to tests and future clients.

Response: `200 OK`

```json
{
  "apiVersion": "v1",
  "healthCheck": true,
  "assessmentSubmission": false,
  "persistence": false,
  "backendScoring": false,
  "backendReportCompilation": false
}
```

### Unknown path

Response: `404 Not Found`

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  }
}
```

### Any method other than `GET`

Response: `405 Method Not Allowed`

Headers include:

```http
Allow: GET
```

Body:

```json
{
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Method not allowed"
  }
}
```

No placeholder `POST /assessment`, submission route, database route, or report route is created.

## 5. Environment Configuration Contract

Approved variables:

```text
BSTI_RUNTIME_ENV=development
BSTI_SUBMISSION_ENABLED=false
BSTI_API_VERSION=v1
PORT=9000
```

Rules:

- `BSTI_RUNTIME_ENV` defaults to `development` and accepts only `development` or `production`.
- `BSTI_SUBMISSION_ENABLED` defaults to `false` and must remain `false` in PR #6. Any truthy value causes startup validation to fail closed.
- `BSTI_API_VERSION` defaults to and accepts only `v1`.
- `PORT` defaults to `9000`; it must parse as an integer from `1` through `65535`.
- The deployment example uses port `9000`, as required by CloudBase HTTP functions.
- Tests may bypass the deployment bootstrap and bind the imported server to port `0` to obtain an ephemeral local test port.
- Environment variables are strings and are normalized explicitly.
- Configuration errors must use stable error codes and must not echo rejected values.

The repository contains only `.env.example`. Real `.env` files are ignored and never committed.

## 6. CloudBase Deployment Template

`cloudbaserc.example.json` is a non-deploying template. It contains:

- config version `2.0`;
- placeholder `envId`;
- `functionRoot` set to `backend/functions`;
- one function named `bsti-api`;
- function `type` set to `HTTP`;
- runtime `Nodejs20.19`;
- timeout `5` seconds;
- memory `256` MB;
- only the four non-secret environment variables defined above.

A real `cloudbaserc.json` is ignored because it will contain the actual CloudBase environment ID. PR #6 does not create that file, log in to Tencent Cloud, deploy the function, configure an HTTP access path, or produce a public API URL.

CloudBase CLI environment variables can replace the complete cloud-side variable set during deployment. The README must warn future operators to review the full environment-variable object before deployment rather than assuming an incremental merge.

## 7. Repository Secret and Local-State Guardrails

Create `.gitignore` rules for at least:

```gitignore
.env
.env.*
!.env.example
cloudbaserc.json
cloudbaserc.json.local
.cloudbase/
*.pem
*.key
```

Permanent tests must fail if the repository contains:

- a real `.env` file;
- a non-example `cloudbaserc.json`;
- a CloudBase environment ID that does not equal the explicit placeholder;
- common private-key delimiters;
- Tencent secret key variable names in committed backend configuration;
- frontend secrets or a frontend API activation path.

## 8. Error Handling and Logging

- Route errors are deterministic JSON with stable error codes.
- Configuration errors fail startup before the server listens.
- Unexpected request-handler errors return `500` with a generic `INTERNAL_ERROR` response.
- Stack traces and raw exception messages are not returned to clients.
- Logs must not contain request bodies, answers, profile fields, environment dumps, credentials, or CloudBase environment IDs.
- Since PR #6 has no write endpoint, it must not read a request body.

## 9. Testing Strategy

### Runtime tests

Use Node.js built-in test/runtime facilities only; no external test framework is required.

Verify:

1. default configuration is development, API `v1`, port `9000`, submission disabled;
2. submission cannot be enabled by environment configuration;
3. invalid environment, API version, Boolean value, or port fails closed;
4. `GET /health` returns the exact safe contract;
5. `GET /v1/capabilities` returns the exact frozen capabilities;
6. unknown paths return `404`;
7. non-GET methods return `405` and `Allow: GET`;
8. responses contain required safety headers;
9. responses do not expose seeded secret values or arbitrary environment variables;
10. unexpected handler failures return a generic `500` contract.

### Static repository contract

Verify:

- planned files exist;
- `scf_bootstrap` starts the expected entry point and has executable mode where the repository API supports it;
- `cloudbaserc.example.json` uses placeholder environment ID, HTTP type, Node.js 20.19, and function root `backend/functions`;
- `.gitignore` blocks real local configuration and key files;
- there is no submission route, persistence dependency, CloudBase SDK, scoring import, or report compiler import;
- the existing environment and frozen-boundary contracts remain unchanged;
- all existing BSTI and BSTM regression suites remain green.

### Local smoke test

The implementation plan will include a local process smoke test:

```bash
cd backend/functions/bsti-api
npm start
```

Then verify `/health` and `/v1/capabilities` against `localhost:9000`, terminate the process, and confirm no files or data were written.

## 10. Explicit Non-Goals

PR #6 does not:

- modify `index.html`, the assessment flow, or report UI;
- connect the frontend to the backend;
- collect or transmit real customer data;
- add an assessment submission endpoint;
- add MySQL, migrations, storage, report snapshots, or public report tokens;
- add backend scoring or backend report compilation;
- add CloudBase SDK, authentication, OAuth, WeChat, WeCom, CRM, booking, payment, Eliy, or qualification logic;
- establish a final production CORS policy;
- create or deploy a Tencent Cloud resource;
- contain a real CloudBase environment ID, domain, credential, or API URL.

## 11. Acceptance Criteria

PR #6 is acceptable when:

- the native Node.js HTTP service starts locally without third-party runtime dependencies;
- `/health` and `/v1/capabilities` match the exact contracts above;
- all other paths and methods fail predictably;
- assessment submission remains disabled in both configuration and capabilities;
- no persistence, scoring, or report compilation code is introduced;
- the CloudBase example configuration is structurally deployable after an operator supplies a real environment ID;
- secret/local-state guardrails are committed and tested;
- all new tests and every existing repository contract test pass;
- no product page behavior changes;
- the PR remains a repository skeleton only and does not claim successful CloudBase deployment.

## 12. Next Unit After PR #6

After PR #6 is merged, the next engineering unit is the MySQL schema and migration contract. It must be designed separately and must not be pulled into this PR.