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
