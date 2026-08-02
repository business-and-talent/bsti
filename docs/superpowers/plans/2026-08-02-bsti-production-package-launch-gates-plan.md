# BSTI Production Package and Launch Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a disabled-by-default deployable BSTI package for `richboss.com/bsti/`, wire non-blocking browser submission with retry, and enforce a machine-checked manual launch gate.

**Architecture:** Keep the current GitHub Pages source unchanged. A Node.js build script copies the existing static files into `dist/bsti/`, injects runtime configuration and a browser submission client into the copied `index.html`, and emits a deployment manifest. Submission activation requires an uncommitted, complete release-approval file; CI only builds and uploads the disabled package.

**Tech Stack:** Node.js 22 built-ins, browser Fetch API, browser `localStorage`, existing native Node backend, GitHub Actions.

## Global Constraints

- `BSTI-40 V0.4.3` remains unchanged.
- `BSTM V0.4.4.1` remains unchanged.
- Browser scoring and report compilation remain authoritative.
- Canonical BSTI path is `/bsti/`; API path is `/api/v1/assessments`.
- Frontend and backend submission default to disabled.
- Report display must not wait for persistence.
- No production credentials, environment IDs, DNS changes, domain binding, cloud deployment, or real-data activation.
- No account, CRM, payment, cloud report history, research export, or Eliy interpretation.

---

### Task 1: Freeze the package and launch-gate contracts

**Files:**
- Create: `platform/contracts/production-launch-gates.v0.1.json`
- Create: `deployment/release-approval.example.json`
- Modify: `.gitignore`
- Test: `tests/production-package-contract.mjs`

**Interfaces:**
- Produces: launch-gate identifiers consumed by `scripts/build-production-package.mjs`.
- Produces: ignored local approval path `deployment/release-approval.json`.

- [ ] **Step 1: Write the failing contract test**

Assert that the launch-gate file exists, includes the twelve approved identifiers, states `richboss.com`, `/bsti/`, `/api/v1/assessments`, and keeps `submissionEnabledByDefault` false. Assert that the real approval file is ignored.

- [ ] **Step 2: Run the test and record RED**

Run:

```bash
node tests/production-package-contract.mjs
```

Expected: failure because the launch-gate contract is missing.

- [ ] **Step 3: Add the minimal contract files**

The contract must expose:

```json
{
  "schemaVersion": "bsti-production-launch-gates-v0.1",
  "submissionEnabledByDefault": false,
  "canonical": {
    "domain": "richboss.com",
    "bstiPath": "/bsti/",
    "apiPath": "/api/v1/assessments",
    "chineseEntryDomain": "fulaoban.cn"
  },
  "requiredGateIds": [
    "icp_filing_complete",
    "operating_legal_entity_confirmed",
    "personal_information_rights_contact_confirmed",
    "tencent_cloud_contracting_entity_confirmed",
    "cloudbase_shanghai_environment_confirmed",
    "production_mysql_empty_confirmed",
    "backup_restore_verified",
    "vendor_data_flow_inventory_approved",
    "legal_documents_finalized",
    "https_and_path_routing_verified",
    "final_legal_review_approved",
    "release_approval_recorded"
  ]
}
```

- [ ] **Step 4: Run the test and confirm GREEN**

Run `node tests/production-package-contract.mjs`.

- [ ] **Step 5: Commit**

```bash
git add platform/contracts/production-launch-gates.v0.1.json deployment/release-approval.example.json .gitignore tests/production-package-contract.mjs
git commit -m "test: freeze production launch gates"
```

### Task 2: Build the disabled deployment package

**Files:**
- Create: `scripts/build-production-package.mjs`
- Create: `production/submission-client.js`
- Modify: `tests/production-package-contract.mjs`

**Interfaces:**
- Consumes: `platform/contracts/production-launch-gates.v0.1.json`.
- Produces: `dist/bsti/*` and `dist/deployment-manifest.json`.
- Browser global: `window.BSTISubmission.prepareSubmission(instrument, state)`.
- Browser global: `window.BSTISubmission.submitPrepared(prepared)`.

- [ ] **Step 1: Extend the test before implementation**

The test runs:

```bash
node scripts/build-production-package.mjs --output .tmp/production-package --source-commit test-sha
```

Then assert:

- all package files exist;
- runtime config is disabled;
- copied `index.html` loads `runtime-config.js` and `submission-client.js` before the existing module script;
- the copied submit function displays the report before calling `submitPrepared`;
- relative privacy and report-usage links remain local to `/bsti/`;
- the manifest records `richboss.com`, `/bsti/`, `V0.4.3`, `V0.4.4.1`, and `submissionEnabled: false`;
- no secret patterns occur.

- [ ] **Step 2: Run the test and record RED**

Expected: failure because the build script is missing.

- [ ] **Step 3: Implement the minimal builder**

The builder must:

1. remove and recreate the requested output directory;
2. copy `index.html`, `privacy.html`, and `report-usage.html`;
3. write a public disabled runtime config;
4. copy `production/submission-client.js`;
5. replace the exact existing `submitAssessment()` function with a version that prepares the payload, renders the existing report, updates the existing continuation hash, then starts persistence;
6. emit `deployment-manifest.json`;
7. refuse enabled mode without valid approval evidence.

- [ ] **Step 4: Run the package test and confirm GREEN**

Run:

```bash
node tests/production-package-contract.mjs
```

- [ ] **Step 5: Commit**

```bash
git add scripts/build-production-package.mjs production/submission-client.js tests/production-package-contract.mjs
git commit -m "feat: build disabled BSTI production package"
```

### Task 3: Prove non-blocking persistence and retry

**Files:**
- Create: `tests/production-submission-client-contract.mjs`
- Modify: `production/submission-client.js`
- Modify: `tests/production-package-contract.mjs`

**Interfaces:**
- Pending storage key: `bsti.pendingSubmission.v1`.
- `prepareSubmission()` returns `null` when disabled; otherwise returns `{ payload, createdAt }` and stores it.
- `submitPrepared()` returns `{ status: 'saved' | 'failed' | 'disabled' }`.

- [ ] **Step 1: Write browser-client contract tests**

Use Node `vm` with fake `window`, `document`, `localStorage`, `crypto.randomUUID`, and `fetch` to prove:

- disabled mode returns `null` and performs zero requests;
- enabled mode maps 40 instrument items to numeric IDs 1–40;
- the payload matches the PR #8 schema and consent versions;
- failed fetch retains the exact pending payload and exposes retry copy;
- successful fetch clears the pending payload;
- retry reuses the same UUID and payload;
- pending data older than seven days is removed.

- [ ] **Step 2: Run the tests and record RED**

Run:

```bash
node tests/production-submission-client-contract.mjs
```

Expected: failure until the complete browser behavior exists.

- [ ] **Step 3: Implement only the required browser behavior**

Use one IIFE, one local-storage record, one status panel, and one retry button. Do not add queues, background sync, service workers, accounts, or report storage.

- [ ] **Step 4: Run both production tests and confirm GREEN**

```bash
node tests/production-submission-client-contract.mjs
node tests/production-package-contract.mjs
```

- [ ] **Step 5: Commit**

```bash
git add production/submission-client.js tests/production-submission-client-contract.mjs tests/production-package-contract.mjs
git commit -m "feat: add non-blocking submission retry"
```

### Task 4: Add CI artifact and operator runbook

**Files:**
- Create: `.github/workflows/production-package.yml`
- Create: `docs/operations/bsti-production-launch-runbook.md`
- Modify: `README.md`

**Interfaces:**
- CI artifact name: `bsti-production-ready-disabled`.
- CI never passes `--enable-submission` and never deploys.

- [ ] **Step 1: Extend static tests for CI and documentation boundaries**

Assert the workflow runs the two production tests, builds the disabled package, scans the artifact for secrets, and uploads it without cloud credentials or deploy commands.

- [ ] **Step 2: Run the test and record RED**

Expected: failure because workflow and runbook are absent.

- [ ] **Step 3: Add the minimal workflow and runbook**

The runbook must separate:

1. current disabled artifact generation;
2. evidence collection for all twelve gates;
3. future enabled build using an ignored local approval file;
4. manual Tencent Cloud deployment, migrations, domain binding, smoke test, and rollback;
5. explicit instruction that none of those production actions are authorized by PR #9.

- [ ] **Step 4: Run the full repository verification**

Run all existing contract commands from `README.md`, plus:

```bash
node tests/production-package-contract.mjs
node tests/production-submission-client-contract.mjs
git diff --check
```

Expected: all pass.

- [ ] **Step 5: Create Draft PR #9**

The PR description must state that the package is deployable but disabled, ICP filing is incomplete, no production action occurred, and merge does not authorize activation.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/production-package.yml docs/operations/bsti-production-launch-runbook.md README.md tests/production-package-contract.mjs
git commit -m "ci: package BSTI behind launch gates"
```

## Plan Self-Review

- Spec coverage: package, runtime config, non-blocking report, retry, seven-day pending boundary, manual gates, artifact, CI, and exclusions are covered.
- Placeholder scan: no implementation placeholder is permitted in runtime files; legal identity placeholders remain intentional launch blockers in existing documents.
- Type consistency: browser globals, storage key, paths, versions, and artifact name are consistent across tasks.