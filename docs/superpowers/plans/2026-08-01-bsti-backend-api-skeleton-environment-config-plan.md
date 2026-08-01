# BSTI P0 Backend API Skeleton and Environment Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free Node.js HTTP backend skeleton that exposes only safe health and capability endpoints, remains submission-disabled, and is structurally ready for a later Tencent CloudBase HTTP-function deployment without connecting a real cloud environment.

**Architecture:** A small configuration module normalizes and validates the approved environment variables; a capability module exposes the frozen P0 backend boundary; a native `node:http` application serves deterministic JSON routes; a thin bootstrap listens on `0.0.0.0:9000`. Deployment examples and repository guardrails remain separate from runtime code and contain no real environment identifiers or secrets.

**Tech Stack:** Node.js 20.19-compatible ES modules, Node.js 22 CI, built-in `node:http`, built-in `assert`, built-in `fetch`, POSIX shell bootstrap, JSON, GitHub Actions.

## Global Constraints

- Baseline is merged PR #5 at `4139b664f206610e0450d1d0b2bc6ecdc54501e4`.
- `BSTI-40 V0.4.3` remains unchanged.
- `BSTM V0.4.4.1` remains unchanged.
- The browser remains the authoritative P0 scoring and report compiler.
- PR #6 does not modify `index.html`, `privacy.html`, `report-usage.html`, assessment flow, scoring, focus routing, evidence rules, or report narratives.
- PR #6 creates no real CloudBase environment, resource, domain, route, credential, or public API URL.
- The backend exposes only `GET /health` and `GET /v1/capabilities`.
- Assessment submission, persistence, backend scoring, and backend report compilation remain `false`.
- No `POST /assessment` or other write route is created.
- No MySQL, migration, storage, authentication, OAuth, WeChat, WeCom, Eliy, CRM, booking, payment, or qualification code enters this PR.
- No third-party runtime or test dependency is introduced.
- CloudBase HTTP deployment defaults to port `9000` and runtime `Nodejs20.19`.
- Real `.env`, `cloudbaserc.json`, `.cloudbase/`, private keys, credentials, and environment IDs must not be committed.

---

## Planned File Structure

```text
backend/
└── functions/
    └── bsti-api/
        ├── index.js                 # process bootstrap only
        ├── package.json             # dependency-free runtime metadata
        ├── scf_bootstrap            # executable CloudBase HTTP entry
        ├── .env.example             # approved non-secret variable names
        └── src/
            ├── app.js               # native HTTP routing and safe responses
            ├── capabilities.js      # immutable P0 capability declaration
            └── config.js            # environment parsing and fail-closed validation
cloudbaserc.example.json             # non-deploying placeholder template
.gitignore                           # secrets and local CloudBase state
.github/workflows/profile-capture.yml
README.md
tests/backend-api-skeleton-contract.mjs
tests/backend-deployment-static-contract.mjs
```

---

### Task 1: Define the Backend Configuration and Capability Contract in RED

**Files:**
- Create: `tests/backend-api-skeleton-contract.mjs`
- Modify: `.github/workflows/profile-capture.yml`

**Interfaces:**
- Consumes: planned exports `ConfigError`, `loadConfig`, `P0_CAPABILITIES`, and `getCapabilities`.
- Produces: a permanent executable contract test that later tasks must satisfy.

- [ ] **Step 1: Create the failing contract test**

Create `tests/backend-api-skeleton-contract.mjs` with exactly this initial content:

```js
import assert from 'node:assert/strict';

import {
  ConfigError,
  loadConfig
} from '../backend/functions/bsti-api/src/config.js';
import {
  P0_CAPABILITIES,
  getCapabilities
} from '../backend/functions/bsti-api/src/capabilities.js';

function expectConfigError(env, expectedCode) {
  assert.throws(
    () => loadConfig(env),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.code, expectedCode);
      assert.equal(error.message.includes(String(env.BSTI_SUBMISSION_ENABLED ?? '')), false);
      return true;
    }
  );
}

const defaults = loadConfig({});
assert.deepEqual(defaults, {
  service: 'bsti-api',
  runtimeEnv: 'development',
  submissionEnabled: false,
  apiVersion: 'v1',
  port: 9000
});
assert.equal(Object.isFrozen(defaults), true);

const productionClosed = loadConfig({
  BSTI_RUNTIME_ENV: 'production',
  BSTI_SUBMISSION_ENABLED: 'false',
  BSTI_API_VERSION: 'v1',
  PORT: '9000'
});
assert.deepEqual(productionClosed, {
  service: 'bsti-api',
  runtimeEnv: 'production',
  submissionEnabled: false,
  apiVersion: 'v1',
  port: 9000
});

expectConfigError({ BSTI_RUNTIME_ENV: 'staging' }, 'INVALID_RUNTIME_ENV');
expectConfigError({ BSTI_SUBMISSION_ENABLED: 'true' }, 'SUBMISSION_DISABLED');
expectConfigError({ BSTI_SUBMISSION_ENABLED: '1' }, 'INVALID_SUBMISSION_FLAG');
expectConfigError({ BSTI_API_VERSION: 'v2' }, 'INVALID_API_VERSION');
expectConfigError({ PORT: '0' }, 'INVALID_PORT');
expectConfigError({ PORT: '65536' }, 'INVALID_PORT');
expectConfigError({ PORT: '9000.5' }, 'INVALID_PORT');
expectConfigError({ PORT: 'secret-port-value' }, 'INVALID_PORT');

assert.deepEqual(P0_CAPABILITIES, {
  apiVersion: 'v1',
  healthCheck: true,
  assessmentSubmission: false,
  persistence: false,
  backendScoring: false,
  backendReportCompilation: false
});
assert.equal(Object.isFrozen(P0_CAPABILITIES), true);

const firstCapabilities = getCapabilities();
const secondCapabilities = getCapabilities();
assert.deepEqual(firstCapabilities, P0_CAPABILITIES);
assert.deepEqual(secondCapabilities, P0_CAPABILITIES);
assert.notEqual(firstCapabilities, P0_CAPABILITIES);
assert.notEqual(firstCapabilities, secondCapabilities);

console.log('Backend API configuration and capability contract: PASS');
```

- [ ] **Step 2: Add the new contract to the existing CI suite**

In `.github/workflows/profile-capture.yml`, insert this line as the first command under `Run frozen contract tests`:

```yaml
          node tests/backend-api-skeleton-contract.mjs
```

The resulting command block begins:

```yaml
      - name: Run frozen contract tests
        run: |
          node tests/backend-api-skeleton-contract.mjs
          node tests/report-continuation-contract.mjs
          node tests/wechat-mobile-terminology-contract.mjs
```

- [ ] **Step 3: Run the new contract to verify RED**

Run:

```bash
node tests/backend-api-skeleton-contract.mjs
```

Expected result: FAIL with `ERR_MODULE_NOT_FOUND` for `backend/functions/bsti-api/src/config.js`.

- [ ] **Step 4: Run existing contracts to prove the RED is isolated**

Run:

```bash
node tests/report-continuation-contract.mjs
node tests/wechat-mobile-terminology-contract.mjs
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
```

Expected result: all existing suites remain PASS.

- [ ] **Step 5: Commit the RED contract**

```bash
git add tests/backend-api-skeleton-contract.mjs .github/workflows/profile-capture.yml
git commit -m "test: define backend API skeleton contract"
```

---

### Task 2: Implement Fail-Closed Configuration and Frozen Capabilities

**Files:**
- Create: `backend/functions/bsti-api/src/config.js`
- Create: `backend/functions/bsti-api/src/capabilities.js`
- Test: `tests/backend-api-skeleton-contract.mjs`

**Interfaces:**
- Produces: `ConfigError`, `loadConfig(env)`, immutable `P0_CAPABILITIES`, and `getCapabilities()`.
- Consumed by: Task 3 HTTP transport and bootstrap.

- [ ] **Step 1: Implement configuration parsing**

Create `backend/functions/bsti-api/src/config.js`:

```js
const SERVICE_NAME = 'bsti-api';
const DEFAULT_RUNTIME_ENV = 'development';
const DEFAULT_API_VERSION = 'v1';
const DEFAULT_PORT = 9000;
const ALLOWED_RUNTIME_ENVS = new Set(['development', 'production']);

export class ConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
  }
}

function readString(env, key, fallback) {
  const value = env[key];
  return value === undefined ? fallback : String(value).trim();
}

function parseRuntimeEnv(env) {
  const runtimeEnv = readString(env, 'BSTI_RUNTIME_ENV', DEFAULT_RUNTIME_ENV);
  if (!ALLOWED_RUNTIME_ENVS.has(runtimeEnv)) {
    throw new ConfigError('INVALID_RUNTIME_ENV', 'Unsupported runtime environment');
  }
  return runtimeEnv;
}

function parseSubmissionEnabled(env) {
  const value = readString(env, 'BSTI_SUBMISSION_ENABLED', 'false').toLowerCase();
  if (value !== 'true' && value !== 'false') {
    throw new ConfigError('INVALID_SUBMISSION_FLAG', 'Submission flag must be true or false');
  }
  if (value === 'true') {
    throw new ConfigError('SUBMISSION_DISABLED', 'Assessment submission is disabled');
  }
  return false;
}

function parseApiVersion(env) {
  const apiVersion = readString(env, 'BSTI_API_VERSION', DEFAULT_API_VERSION);
  if (apiVersion !== DEFAULT_API_VERSION) {
    throw new ConfigError('INVALID_API_VERSION', 'Unsupported API version');
  }
  return apiVersion;
}

function parsePort(env) {
  const rawPort = readString(env, 'PORT', String(DEFAULT_PORT));
  if (!/^\d+$/.test(rawPort)) {
    throw new ConfigError('INVALID_PORT', 'Port must be an integer from 1 through 65535');
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError('INVALID_PORT', 'Port must be an integer from 1 through 65535');
  }
  return port;
}

export function loadConfig(env = process.env) {
  return Object.freeze({
    service: SERVICE_NAME,
    runtimeEnv: parseRuntimeEnv(env),
    submissionEnabled: parseSubmissionEnabled(env),
    apiVersion: parseApiVersion(env),
    port: parsePort(env)
  });
}
```

- [ ] **Step 2: Implement immutable capabilities**

Create `backend/functions/bsti-api/src/capabilities.js`:

```js
export const P0_CAPABILITIES = Object.freeze({
  apiVersion: 'v1',
  healthCheck: true,
  assessmentSubmission: false,
  persistence: false,
  backendScoring: false,
  backendReportCompilation: false
});

export function getCapabilities() {
  return { ...P0_CAPABILITIES };
}
```

- [ ] **Step 3: Run the contract to verify GREEN**

Run:

```bash
node tests/backend-api-skeleton-contract.mjs
```

Expected output:

```text
Backend API configuration and capability contract: PASS
```

- [ ] **Step 4: Verify configuration error messages do not echo rejected values**

Run:

```bash
node --input-type=module <<'NODE'
import { loadConfig } from './backend/functions/bsti-api/src/config.js';
try {
  loadConfig({ PORT: 'do-not-echo-this-secret' });
} catch (error) {
  if (error.message.includes('do-not-echo-this-secret')) process.exit(1);
  console.log(error.code, error.message);
}
NODE
```

Expected output:

```text
INVALID_PORT Port must be an integer from 1 through 65535
```

- [ ] **Step 5: Commit configuration and capabilities**

```bash
git add backend/functions/bsti-api/src/config.js backend/functions/bsti-api/src/capabilities.js
git commit -m "feat: add fail-closed backend configuration"
```

---

### Task 3: Add the Native HTTP Application and Process Bootstrap

**Files:**
- Modify: `tests/backend-api-skeleton-contract.mjs`
- Create: `backend/functions/bsti-api/src/app.js`
- Create: `backend/functions/bsti-api/index.js`
- Create: `backend/functions/bsti-api/package.json`

**Interfaces:**
- Consumes: `loadConfig(env)` and `getCapabilities()` from Task 2.
- Produces: `createRequestHandler(config, options)` and `createServer(config, options)`.
- Future deployment bootstrap consumes: `index.js`.

- [ ] **Step 1: Extend the contract with HTTP runtime tests**

Add these imports below the existing imports in `tests/backend-api-skeleton-contract.mjs`:

```js
import {
  createRequestHandler,
  createServer
} from '../backend/functions/bsti-api/src/app.js';
```

Insert the following helpers and runtime assertions immediately before the final `console.log`:

```js
const REQUIRED_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff'
};

async function withServer(options, callback) {
  const config = loadConfig({
    BSTI_RUNTIME_ENV: 'development',
    BSTI_SUBMISSION_ENABLED: 'false',
    BSTI_API_VERSION: 'v1',
    PORT: '9000'
  });
  const server = createServer(config, options);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function assertSafetyHeaders(response) {
  for (const [name, value] of Object.entries(REQUIRED_HEADERS)) {
    assert.equal(response.headers.get(name), value);
  }
}

await withServer({}, async (baseUrl) => {
  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assertSafetyHeaders(healthResponse);
  assert.deepEqual(await healthResponse.json(), {
    status: 'ok',
    service: 'bsti-api',
    environment: 'development',
    submissionEnabled: false
  });

  const capabilitiesResponse = await fetch(`${baseUrl}/v1/capabilities`);
  assert.equal(capabilitiesResponse.status, 200);
  assertSafetyHeaders(capabilitiesResponse);
  assert.deepEqual(await capabilitiesResponse.json(), P0_CAPABILITIES);

  const missingResponse = await fetch(`${baseUrl}/missing`);
  assert.equal(missingResponse.status, 404);
  assertSafetyHeaders(missingResponse);
  assert.deepEqual(await missingResponse.json(), {
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });

  const methodResponse = await fetch(`${baseUrl}/health`, { method: 'POST', body: 'ignored' });
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get('allow'), 'GET');
  assertSafetyHeaders(methodResponse);
  assert.deepEqual(await methodResponse.json(), {
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed'
    }
  });
});

const observedErrors = [];
await withServer({
  capabilitiesProvider() {
    throw new Error('seeded-secret-runtime-value');
  },
  onUnhandledError(error) {
    observedErrors.push(error);
  }
}, async (baseUrl) => {
  const response = await fetch(`${baseUrl}/v1/capabilities`);
  assert.equal(response.status, 500);
  assertSafetyHeaders(response);
  const bodyText = await response.text();
  assert.equal(bodyText.includes('seeded-secret-runtime-value'), false);
  assert.deepEqual(JSON.parse(bodyText), {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});
assert.equal(observedErrors.length, 1);
assert.equal(observedErrors[0].message, 'seeded-secret-runtime-value');

const handler = createRequestHandler(defaults);
assert.equal(typeof handler, 'function');
```

Replace the final log line with:

```js
console.log('Backend API skeleton runtime contract: PASS');
```

- [ ] **Step 2: Run the extended contract to verify RED**

Run:

```bash
node tests/backend-api-skeleton-contract.mjs
```

Expected result: FAIL with `ERR_MODULE_NOT_FOUND` for `backend/functions/bsti-api/src/app.js`.

- [ ] **Step 3: Implement the HTTP application**

Create `backend/functions/bsti-api/src/app.js`:

```js
import http from 'node:http';

import { getCapabilities } from './capabilities.js';

const BASE_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
});

function sendJson(response, statusCode, body, additionalHeaders = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    ...BASE_HEADERS,
    ...additionalHeaders,
    'Content-Length': Buffer.byteLength(payload)
  });
  response.end(payload);
}

function routePath(request) {
  const host = request.headers.host ?? 'localhost';
  return new URL(request.url ?? '/', `http://${host}`).pathname;
}

export function createRequestHandler(config, options = {}) {
  const capabilitiesProvider = options.capabilitiesProvider ?? getCapabilities;
  const onUnhandledError = options.onUnhandledError ?? (() => {});

  return function requestHandler(request, response) {
    try {
      if (request.method !== 'GET') {
        sendJson(response, 405, {
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Method not allowed'
          }
        }, { Allow: 'GET' });
        return;
      }

      const pathname = routePath(request);

      if (pathname === '/health') {
        sendJson(response, 200, {
          status: 'ok',
          service: config.service,
          environment: config.runtimeEnv,
          submissionEnabled: config.submissionEnabled
        });
        return;
      }

      if (pathname === '/v1/capabilities') {
        sendJson(response, 200, capabilitiesProvider());
        return;
      }

      sendJson(response, 404, {
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    } catch (error) {
      onUnhandledError(error);
      sendJson(response, 500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  };
}

export function createServer(config, options = {}) {
  return http.createServer(createRequestHandler(config, options));
}
```

- [ ] **Step 4: Add the process bootstrap**

Create `backend/functions/bsti-api/index.js`:

```js
import { createServer } from './src/app.js';
import { loadConfig } from './src/config.js';

const config = loadConfig();
const server = createServer(config, {
  onUnhandledError() {
    console.error('[bsti-api] request failed');
  }
});

server.on('error', () => {
  console.error('[bsti-api] server failed');
  process.exitCode = 1;
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(
    `[bsti-api] listening environment=${config.runtimeEnv} port=${config.port}`
  );
});
```

- [ ] **Step 5: Add dependency-free package metadata**

Create `backend/functions/bsti-api/package.json`:

```json
{
  "name": "@bsti/backend-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.19 <23"
  },
  "scripts": {
    "start": "node index.js",
    "test": "node ../../../tests/backend-api-skeleton-contract.mjs"
  }
}
```

Do not add `dependencies`, `devDependencies`, lockfiles, or framework packages.

- [ ] **Step 6: Run the runtime contract to verify GREEN**

Run:

```bash
node tests/backend-api-skeleton-contract.mjs
```

Expected output:

```text
Backend API skeleton runtime contract: PASS
```

- [ ] **Step 7: Verify the package contains no dependency declaration**

Run:

```bash
node --input-type=module <<'NODE'
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync('backend/functions/bsti-api/package.json', 'utf8'));
if ('dependencies' in pkg || 'devDependencies' in pkg) process.exit(1);
console.log('Dependency-free package contract: PASS');
NODE
```

Expected output:

```text
Dependency-free package contract: PASS
```

- [ ] **Step 8: Commit the HTTP runtime**

```bash
git add tests/backend-api-skeleton-contract.mjs backend/functions/bsti-api/index.js backend/functions/bsti-api/package.json backend/functions/bsti-api/src/app.js
git commit -m "feat: add native BSTI HTTP API skeleton"
```

---

### Task 4: Add CloudBase Deployment Examples and Secret Guardrails

**Files:**
- Create: `tests/backend-deployment-static-contract.mjs`
- Create: `backend/functions/bsti-api/scf_bootstrap`
- Create: `backend/functions/bsti-api/.env.example`
- Create: `cloudbaserc.example.json`
- Create: `.gitignore`
- Modify: `.github/workflows/profile-capture.yml`

**Interfaces:**
- Consumes: Task 3 runtime entry `backend/functions/bsti-api/index.js`.
- Produces: a non-deploying CloudBase template, executable bootstrap, and permanent repository secret/static contract.

- [ ] **Step 1: Create the failing deployment/static contract**

Create `tests/backend-deployment-static-contract.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const functionRoot = path.join(root, 'backend/functions/bsti-api');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

for (const requiredPath of [
  'backend/functions/bsti-api/index.js',
  'backend/functions/bsti-api/package.json',
  'backend/functions/bsti-api/scf_bootstrap',
  'backend/functions/bsti-api/.env.example',
  'backend/functions/bsti-api/src/app.js',
  'backend/functions/bsti-api/src/capabilities.js',
  'backend/functions/bsti-api/src/config.js',
  'cloudbaserc.example.json',
  '.gitignore'
]) {
  assert.equal(fs.existsSync(path.join(root, requiredPath)), true, `${requiredPath} is missing`);
}

const bootstrap = read('backend/functions/bsti-api/scf_bootstrap');
assert.equal(bootstrap, '#!/bin/sh\nset -eu\nexec node index.js\n');

const indexMode = execFileSync(
  'git',
  ['ls-files', '-s', 'backend/functions/bsti-api/scf_bootstrap'],
  { encoding: 'utf8' }
);
assert.match(indexMode, /^100755 /);

const envExample = read('backend/functions/bsti-api/.env.example');
assert.equal(envExample, [
  'BSTI_RUNTIME_ENV=development',
  'BSTI_SUBMISSION_ENABLED=false',
  'BSTI_API_VERSION=v1',
  'PORT=9000',
  ''
].join('\n'));

const cloudbase = JSON.parse(read('cloudbaserc.example.json'));
assert.equal(cloudbase.version, '2.0');
assert.equal(cloudbase.envId, 'replace-with-cloudbase-env-id');
assert.equal(cloudbase.functionRoot, 'backend/functions');
assert.equal(cloudbase.functions.length, 1);
assert.deepEqual(cloudbase.functions[0], {
  name: 'bsti-api',
  type: 'HTTP',
  runtime: 'Nodejs20.19',
  memorySize: 256,
  timeout: 5,
  envVariables: {
    BSTI_RUNTIME_ENV: 'development',
    BSTI_SUBMISSION_ENABLED: 'false',
    BSTI_API_VERSION: 'v1',
    PORT: '9000'
  }
});

const gitignore = read('.gitignore');
for (const ignoredPattern of [
  '.env',
  '.env.*',
  '!.env.example',
  'cloudbaserc.json',
  'cloudbaserc.json.local',
  '.cloudbase/',
  '*.pem',
  '*.key'
]) {
  assert.ok(gitignore.split('\n').includes(ignoredPattern), `${ignoredPattern} is not ignored`);
}

for (const forbiddenPath of [
  '.env',
  'cloudbaserc.json',
  'cloudbaserc.json.local'
]) {
  assert.equal(fs.existsSync(path.join(root, forbiddenPath)), false, `${forbiddenPath} must not be committed`);
}

const backendFiles = listFiles(functionRoot).filter((file) => !file.endsWith('.env.example'));
const backendSource = backendFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const forbiddenText of [
  '@cloudbase/node-sdk',
  '@cloudbase/functions-framework',
  'express',
  'mysql',
  'scoreAssessment',
  'buildReportViewModel',
  'POST /assessment',
  'SECRETID',
  'SECRETKEY',
  'BEGIN PRIVATE KEY',
  'BEGIN RSA PRIVATE KEY'
]) {
  assert.equal(backendSource.includes(forbiddenText), false, `Forbidden backend content: ${forbiddenText}`);
}

const repositoryTextFiles = [
  ...listFiles(path.join(root, 'backend')),
  path.join(root, 'cloudbaserc.example.json'),
  path.join(root, '.gitignore')
];
const repositoryText = repositoryTextFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.equal(repositoryText.includes('replace-with-cloudbase-env-id'), true);
assert.equal(/env-[a-z0-9-]{6,}/i.test(repositoryText), false);
assert.equal(/tcb-[a-z0-9-]{6,}/i.test(repositoryText), false);

const packageJson = JSON.parse(read('backend/functions/bsti-api/package.json'));
assert.equal('dependencies' in packageJson, false);
assert.equal('devDependencies' in packageJson, false);

console.log('Backend deployment and secret guardrails: PASS');
```

- [ ] **Step 2: Add the static contract to CI**

In `.github/workflows/profile-capture.yml`, add the second backend command immediately after the runtime contract:

```yaml
          node tests/backend-api-skeleton-contract.mjs
          node tests/backend-deployment-static-contract.mjs
```

- [ ] **Step 3: Run the static contract to verify RED**

Run:

```bash
node tests/backend-deployment-static-contract.mjs
```

Expected result: FAIL with `backend/functions/bsti-api/scf_bootstrap is missing`.

- [ ] **Step 4: Add the executable CloudBase bootstrap**

Create `backend/functions/bsti-api/scf_bootstrap`:

```sh
#!/bin/sh
set -eu
exec node index.js
```

Mark it executable:

```bash
git update-index --add --chmod=+x backend/functions/bsti-api/scf_bootstrap
```

Verify:

```bash
git ls-files -s backend/functions/bsti-api/scf_bootstrap
```

Expected output begins with:

```text
100755
```

- [ ] **Step 5: Add the approved environment example**

Create `backend/functions/bsti-api/.env.example`:

```dotenv
BSTI_RUNTIME_ENV=development
BSTI_SUBMISSION_ENABLED=false
BSTI_API_VERSION=v1
PORT=9000
```

- [ ] **Step 6: Add the non-deploying CloudBase example**

Create `cloudbaserc.example.json`:

```json
{
  "version": "2.0",
  "envId": "replace-with-cloudbase-env-id",
  "functionRoot": "backend/functions",
  "functions": [
    {
      "name": "bsti-api",
      "type": "HTTP",
      "runtime": "Nodejs20.19",
      "memorySize": 256,
      "timeout": 5,
      "envVariables": {
        "BSTI_RUNTIME_ENV": "development",
        "BSTI_SUBMISSION_ENABLED": "false",
        "BSTI_API_VERSION": "v1",
        "PORT": "9000"
      }
    }
  ]
}
```

- [ ] **Step 7: Add repository secret/local-state ignores**

Create `.gitignore`:

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

- [ ] **Step 8: Run both backend contracts to verify GREEN**

Run:

```bash
node tests/backend-api-skeleton-contract.mjs
node tests/backend-deployment-static-contract.mjs
```

Expected output:

```text
Backend API skeleton runtime contract: PASS
Backend deployment and secret guardrails: PASS
```

- [ ] **Step 9: Commit deployment examples and guardrails**

```bash
git add .gitignore .github/workflows/profile-capture.yml cloudbaserc.example.json tests/backend-deployment-static-contract.mjs backend/functions/bsti-api/.env.example backend/functions/bsti-api/scf_bootstrap
git commit -m "feat: add CloudBase deployment skeleton guardrails"
```

---

### Task 5: Document Local Operation and Verify the Complete Branch

**Files:**
- Modify: `README.md`
- Verify: all PR #6 files

**Interfaces:**
- Consumes: the complete runtime and deployment skeleton from Tasks 1–4.
- Produces: operator-facing local commands, explicit non-deployment notice, and a fully verified Draft PR #6.

- [ ] **Step 1: Replace the README contract-verification section with the complete current suite**

In `README.md`, retain the existing title, product description, and environment boundary. Replace the current `## Contract verification` section with:

```markdown
## Backend API skeleton

PR #6 adds a deployable repository skeleton only. It does not create or connect a Tencent CloudBase environment, does not expose a public API URL, and does not accept or persist assessment data.

Run the backend locally with Node.js 20.19 or newer:

```bash
cd backend/functions/bsti-api
npm start
```

The process listens on `0.0.0.0:9000` by default and exposes only:

- `GET /health`
- `GET /v1/capabilities`

Assessment submission, persistence, backend scoring, and backend report compilation remain disabled. Stop the process with `Ctrl+C` after local verification.

`cloudbaserc.example.json` is a non-deploying template. A future operator must copy it to the ignored `cloudbaserc.json`, replace the placeholder environment ID, review the complete `envVariables` object, configure the CloudBase HTTP access path, and complete all production launch gates before deployment. PR #6 performs none of those operations.

## Contract verification

Run the complete contract suite with Node.js 22:

```bash
node tests/backend-api-skeleton-contract.mjs
node tests/backend-deployment-static-contract.mjs
node tests/report-continuation-contract.mjs
node tests/wechat-mobile-terminology-contract.mjs
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
git status --short
test -z "$(git status --porcelain)"
```

The P0 platform contracts are stored under `platform/contracts/`. They preserve `BSTI-40 V0.4.3`, `BSTM V0.4.4.1`, browser-side report compilation, and the isolation of revenue/headcount as context-only inputs.
```

When editing Markdown, use a four-backtick outer fence or edit the file directly so the nested shell fences remain valid.

- [ ] **Step 2: Run the local process smoke test**

From the repository root:

```bash
before_status="$(git status --porcelain)"
(
  cd backend/functions/bsti-api
  BSTI_RUNTIME_ENV=development \
  BSTI_SUBMISSION_ENABLED=false \
  BSTI_API_VERSION=v1 \
  PORT=9000 \
  node index.js > /tmp/bsti-api-smoke.log 2>&1 &
  echo $! > /tmp/bsti-api-smoke.pid
)
```

Wait for the process without hiding failures:

```bash
for attempt in 1 2 3 4 5; do
  if curl --fail --silent http://127.0.0.1:9000/health > /tmp/bsti-health.json; then
    break
  fi
  sleep 1
done
```

Verify the health response:

```bash
node --input-type=module <<'NODE'
import fs from 'node:fs';
import assert from 'node:assert/strict';
assert.deepEqual(JSON.parse(fs.readFileSync('/tmp/bsti-health.json', 'utf8')), {
  status: 'ok',
  service: 'bsti-api',
  environment: 'development',
  submissionEnabled: false
});
console.log('Local health smoke: PASS');
NODE
```

Verify capabilities:

```bash
curl --fail --silent http://127.0.0.1:9000/v1/capabilities > /tmp/bsti-capabilities.json
node --input-type=module <<'NODE'
import fs from 'node:fs';
import assert from 'node:assert/strict';
assert.deepEqual(JSON.parse(fs.readFileSync('/tmp/bsti-capabilities.json', 'utf8')), {
  apiVersion: 'v1',
  healthCheck: true,
  assessmentSubmission: false,
  persistence: false,
  backendScoring: false,
  backendReportCompilation: false
});
console.log('Local capability smoke: PASS');
NODE
```

Stop the process and remove temporary files:

```bash
kill "$(cat /tmp/bsti-api-smoke.pid)"
wait "$(cat /tmp/bsti-api-smoke.pid)" 2>/dev/null || true
rm -f /tmp/bsti-api-smoke.pid /tmp/bsti-api-smoke.log /tmp/bsti-health.json /tmp/bsti-capabilities.json
```

Confirm the smoke test wrote nothing to the repository:

```bash
after_status="$(git status --porcelain)"
test "$before_status" = "$after_status"
```

Expected result: both smoke assertions PASS and repository status is unchanged.

- [ ] **Step 3: Run the complete verification suite**

Run:

```bash
node tests/backend-api-skeleton-contract.mjs
node tests/backend-deployment-static-contract.mjs
node tests/report-continuation-contract.mjs
node tests/wechat-mobile-terminology-contract.mjs
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
git status --short
```

Expected output includes eight PASS lines, no diff errors, and only the intended README modification before commit.

- [ ] **Step 4: Commit the README**

```bash
git add README.md
git commit -m "docs: document backend skeleton operation"
```

- [ ] **Step 5: Verify the committed branch is clean**

Run:

```bash
node tests/backend-api-skeleton-contract.mjs
node tests/backend-deployment-static-contract.mjs
node tests/report-continuation-contract.mjs
node tests/wechat-mobile-terminology-contract.mjs
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
test -z "$(git status --porcelain)"
```

Expected result: all suites PASS and checkout is clean.

- [ ] **Step 6: Confirm frozen product surfaces were not modified**

Run:

```bash
git diff --name-only 4139b664f206610e0450d1d0b2bc6ecdc54501e4...HEAD
```

Expected list must not contain:

```text
index.html
privacy.html
report-usage.html
platform/contracts/environments.v0.1.json
platform/contracts/frozen-boundaries.v0.1.json
```

- [ ] **Step 7: Open Draft PR #6**

Title:

```text
PR #6｜Backend API Skeleton and Environment Configuration
```

PR body:

```markdown
## Scope

Add the smallest production-shaped BSTI backend boundary without connecting or deploying a real Tencent CloudBase environment.

## Included

- dependency-free native Node.js HTTP service;
- `GET /health` and `GET /v1/capabilities` only;
- fail-closed environment configuration;
- submission, persistence, backend scoring, and backend report compilation permanently disabled in this PR;
- CloudBase HTTP-function bootstrap and non-deploying example configuration;
- repository secret/local-state guardrails;
- runtime, static, smoke, and existing regression verification;
- operator documentation.

## Frozen boundaries

- `BSTI-40 V0.4.3` unchanged;
- `BSTM V0.4.4.1` unchanged;
- browser compiler remains authoritative;
- no product UI change;
- no submission route, MySQL, persistence, storage, authentication, CloudBase SDK, WeChat, WeCom, Eliy, CRM, booking, payment, or qualification logic;
- no real CloudBase environment ID, credential, deployment, domain, HTTP access path, or public API URL.

## Verification

Include the final GitHub Actions run IDs and exact PASS lines after CI completes.

## Next unit

After merge, the next separately designed engineering unit is the MySQL schema and migration contract.
```

Keep the PR Draft until CI and founder review are complete.

---

## Plan Self-Review Result

- **Spec coverage:** Every design requirement is assigned to Tasks 1–5: configuration, capabilities, HTTP routes, errors, headers, logging boundary, CloudBase bootstrap/template, secret guardrails, local smoke, documentation, CI, and frozen-surface checks.
- **Placeholder scan:** No `TBD`, `TODO`, “implement later,” unspecified validation step, or undefined interface remains in the implementation instructions.
- **Type consistency:** `loadConfig(env)`, `ConfigError.code`, `P0_CAPABILITIES`, `getCapabilities()`, `createRequestHandler(config, options)`, and `createServer(config, options)` use the same names and shapes across all tasks.
- **Scope check:** Database, persistence, frontend integration, authentication, and deployment remain excluded and are not required by any task.
