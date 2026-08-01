import assert from 'node:assert/strict';
import http from 'node:http';

import { createServer } from '../backend/functions/bsti-api/src/app.js';

const disabledConfig = Object.freeze({
  service: 'bsti-api',
  runtimeEnv: 'development',
  submissionEnabled: false,
  apiVersion: 'v1',
  port: 9000,
  database: null
});

const enabledConfig = Object.freeze({
  ...disabledConfig,
  submissionEnabled: true,
  database: Object.freeze({})
});

async function withServer(config, submissionService, callback) {
  const unhandled = [];
  const server = createServer(config, {
    submissionService,
    capabilitiesProvider(currentConfig) {
      return {
        apiVersion: 'v1',
        healthCheck: true,
        assessmentSubmission: currentConfig.submissionEnabled,
        persistence: currentConfig.submissionEnabled,
        backendScoring: false,
        backendReportCompilation: false
      };
    },
    onUnhandledError(error) {
      unhandled.push(error);
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address();
    await callback({ port, unhandled });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function request({ port, method = 'GET', path = '/', body, contentType = 'application/json' }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined
      ? null
      : typeof body === 'string'
        ? body
        : JSON.stringify(body);
    const headers = {};
    if (payload !== null) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const requestObject = http.request({
      host: '127.0.0.1',
      port,
      method,
      path,
      headers
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: response.statusCode,
          headers: response.headers,
          text,
          json: text ? JSON.parse(text) : null
        });
      });
    });
    requestObject.on('error', reject);
    if (payload !== null) requestObject.write(payload);
    requestObject.end();
  });
}

const validBody = {
  schemaVersion: 'bsti-assessment-submission-v1',
  assessmentId: '550e8400-e29b-41d4-a716-446655440000',
  instrument: { id: 'BSTI-40', version: 'V0.4.3' },
  profile: {
    displayName: '测试用户',
    businessUnit: '测试企业',
    roleCode: 'founder_controller',
    roleOther: '',
    revenueBand: 'prefer_not_to_say',
    headcountBand: 'prefer_not_to_say',
    industryCode: 'professional_services',
    industryOther: ''
  },
  consents: {
    reportProcessing: true,
    reportProcessingVersion: 'BSTI_PRIVACY_V0.1',
    reportUsageVersion: 'BSTI_REPORT_USAGE_V0.1',
    marketing: false,
    marketingVersion: null
  },
  answers: Array.from({ length: 40 }, (_, index) => ({ itemId: index + 1, value: 3 }))
};

let disabledCalls = 0;
await withServer(disabledConfig, {
  async submit() {
    disabledCalls += 1;
    throw new Error('disabled service must not run');
  }
}, async ({ port, unhandled }) => {
  const response = await request({
    port,
    method: 'POST',
    path: '/v1/assessments',
    body: '{not-json',
    contentType: 'text/plain'
  });
  assert.equal(response.status, 503);
  assert.deepEqual(response.json, {
    error: {
      code: 'SUBMISSION_DISABLED',
      message: 'Assessment submission is disabled'
    }
  });
  assert.equal(disabledCalls, 0);
  assert.deepEqual(unhandled, []);
});

const createdAt = '2026-08-02T00:00:00.000Z';
await withServer(enabledConfig, {
  async submit() {
    return {
      kind: 'created',
      assessmentId: validBody.assessmentId,
      submittedAt: createdAt
    };
  }
}, async ({ port, unhandled }) => {
  const response = await request({ port, method: 'POST', path: '/v1/assessments', body: validBody });
  assert.equal(response.status, 201);
  assert.deepEqual(response.json, {
    assessmentId: validBody.assessmentId,
    status: 'submitted',
    submittedAt: createdAt,
    replayed: false
  });
  assert.deepEqual(unhandled, []);
});

await withServer(enabledConfig, {
  async submit() {
    return {
      kind: 'replayed',
      assessmentId: validBody.assessmentId,
      submittedAt: createdAt
    };
  }
}, async ({ port }) => {
  const response = await request({ port, method: 'POST', path: '/v1/assessments', body: validBody });
  assert.equal(response.status, 200);
  assert.equal(response.json.replayed, true);
});

await withServer(enabledConfig, {
  async submit() {
    return { kind: 'conflict' };
  }
}, async ({ port }) => {
  const response = await request({ port, method: 'POST', path: '/v1/assessments', body: validBody });
  assert.equal(response.status, 409);
  assert.equal(response.json.error.code, 'SUBMISSION_CONFLICT');
});

await withServer(enabledConfig, {
  async submit() {
    return {
      kind: 'invalid',
      issues: [{ path: 'profile.displayName', code: 'required' }]
    };
  }
}, async ({ port }) => {
  const response = await request({ port, method: 'POST', path: '/v1/assessments', body: validBody });
  assert.equal(response.status, 422);
  assert.deepEqual(response.json.error.details, [{ path: 'profile.displayName', code: 'required' }]);
  assert.equal(response.text.includes('测试用户'), false);
  assert.equal(response.text.includes('测试企业'), false);
});

await withServer(enabledConfig, {
  async submit() {
    return { kind: 'unavailable' };
  }
}, async ({ port }) => {
  const response = await request({ port, method: 'POST', path: '/v1/assessments', body: validBody });
  assert.equal(response.status, 503);
  assert.equal(response.json.error.code, 'PERSISTENCE_UNAVAILABLE');
});

await withServer(enabledConfig, { async submit() { throw new Error('must not run'); } }, async ({ port }) => {
  const wrongContentType = await request({
    port,
    method: 'POST',
    path: '/v1/assessments',
    body: validBody,
    contentType: 'text/plain'
  });
  assert.equal(wrongContentType.status, 400);
  assert.equal(wrongContentType.json.error.code, 'INVALID_CONTENT_TYPE');

  const malformed = await request({
    port,
    method: 'POST',
    path: '/v1/assessments',
    body: '{invalid',
    contentType: 'application/json; charset=utf-8'
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.error.code, 'INVALID_JSON');

  const tooLarge = await request({
    port,
    method: 'POST',
    path: '/v1/assessments',
    body: JSON.stringify({ payload: 'x'.repeat(70 * 1024) })
  });
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.json.error.code, 'PAYLOAD_TOO_LARGE');

  const wrongMethod = await request({ port, method: 'GET', path: '/v1/assessments' });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.allow, 'POST');

  const unknown = await request({ port, method: 'POST', path: '/unknown', body: {} });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.json.error.code, 'NOT_FOUND');
});

await withServer(disabledConfig, null, async ({ port }) => {
  const health = await request({ port, path: '/health' });
  assert.equal(health.status, 200);
  assert.deepEqual(health.json, {
    status: 'ok',
    service: 'bsti-api',
    environment: 'development',
    submissionEnabled: false
  });

  const capabilities = await request({ port, path: '/v1/capabilities' });
  assert.equal(capabilities.status, 200);
  assert.deepEqual(capabilities.json, {
    apiVersion: 'v1',
    healthCheck: true,
    assessmentSubmission: false,
    persistence: false,
    backendScoring: false,
    backendReportCompilation: false
  });
});

console.log('Assessment submission HTTP contract: PASS');
