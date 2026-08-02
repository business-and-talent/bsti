import assert from 'node:assert/strict';

import {
  ConfigError,
  loadConfig
} from '../backend/functions/bsti-api/src/config.js';
import {
  P0_CAPABILITIES,
  getCapabilities
} from '../backend/functions/bsti-api/src/capabilities.js';
import {
  createRequestHandler,
  createServer
} from '../backend/functions/bsti-api/src/app.js';

function expectConfigError(env, expectedCode) {
  assert.throws(
    () => loadConfig(env),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.code, expectedCode);
      for (const suppliedValue of Object.values(env)) {
        assert.equal(error.message.includes(String(suppliedValue)), false);
      }
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

const enabled = loadConfig({
  BSTI_RUNTIME_ENV: 'development',
  BSTI_SUBMISSION_ENABLED: 'true',
  BSTI_API_VERSION: 'v1',
  PORT: '9001',
  BSTI_DB_HOST: '127.0.0.1',
  BSTI_DB_NAME: 'bsti_contract',
  BSTI_DB_USER: 'bsti_user',
  BSTI_DB_PASSWORD: 'test-password'
});
assert.deepEqual(enabled, {
  service: 'bsti-api',
  runtimeEnv: 'development',
  submissionEnabled: true,
  apiVersion: 'v1',
  port: 9001,
  database: {
    host: '127.0.0.1',
    port: 3306,
    name: 'bsti_contract',
    user: 'bsti_user',
    password: 'test-password',
    connectionLimit: 4
  }
});
assert.equal(Object.isFrozen(enabled), true);
assert.equal(Object.isFrozen(enabled.database), true);

expectConfigError({ BSTI_RUNTIME_ENV: 'staging' }, 'INVALID_RUNTIME_ENV');
expectConfigError({ BSTI_SUBMISSION_ENABLED: '1' }, 'INVALID_SUBMISSION_FLAG');
expectConfigError({ BSTI_API_VERSION: 'v2' }, 'INVALID_API_VERSION');
expectConfigError({ PORT: '0' }, 'INVALID_PORT');
expectConfigError({ PORT: '65536' }, 'INVALID_PORT');
expectConfigError({ PORT: '9000.5' }, 'INVALID_PORT');
expectConfigError({ PORT: 'secret-port-value' }, 'INVALID_PORT');
expectConfigError({ BSTI_SUBMISSION_ENABLED: 'true' }, 'MISSING_DB_HOST');
expectConfigError({ BSTI_SUBMISSION_ENABLED: 'true', BSTI_DB_HOST: 'host' }, 'MISSING_DB_NAME');
expectConfigError({ BSTI_SUBMISSION_ENABLED: 'true', BSTI_DB_HOST: 'host', BSTI_DB_NAME: 'db' }, 'MISSING_DB_USER');
expectConfigError({
  BSTI_SUBMISSION_ENABLED: 'true',
  BSTI_DB_HOST: 'host',
  BSTI_DB_NAME: 'db',
  BSTI_DB_USER: 'user'
}, 'MISSING_DB_PASSWORD');
expectConfigError({
  BSTI_SUBMISSION_ENABLED: 'true',
  BSTI_DB_HOST: 'host',
  BSTI_DB_NAME: 'db',
  BSTI_DB_USER: 'user',
  BSTI_DB_PASSWORD: 'password',
  BSTI_DB_PORT: '0'
}, 'INVALID_DB_PORT');
expectConfigError({
  BSTI_SUBMISSION_ENABLED: 'true',
  BSTI_DB_HOST: 'host',
  BSTI_DB_NAME: 'db',
  BSTI_DB_USER: 'user',
  BSTI_DB_PASSWORD: 'password',
  BSTI_DB_CONNECTION_LIMIT: '21'
}, 'INVALID_DB_CONNECTION_LIMIT');

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
assert.deepEqual(getCapabilities(enabled), {
  apiVersion: 'v1',
  healthCheck: true,
  assessmentSubmission: true,
  persistence: true,
  backendScoring: false,
  backendReportCompilation: false
});

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

console.log('Backend API configuration, capability and HTTP contract: PASS');
