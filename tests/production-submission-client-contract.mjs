import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../production/submission-client.js', import.meta.url), 'utf8');
const STORAGE_KEY = 'bsti.pendingSubmission.v1';
const NOW = Date.parse('2026-08-02T06:10:00.000Z');
const UUID = '123e4567-e89b-42d3-a456-426614174000';
const normalize = (value) => JSON.parse(JSON.stringify(value));

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.className = '';
    this.textContent = '';
    this.listeners = new Map();
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
    this.textContent = '';
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  click() {
    return this.listeners.get('click')?.();
  }

  allText() {
    return [this.textContent, ...this.children.map((child) => child.allText())].join(' ');
  }
}

function makeStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set(STORAGE_KEY, initialValue);
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    has(key) {
      return values.has(key);
    }
  };
}

function makeHarness({ enabled, responses = [], stored = null } = {}) {
  const storage = makeStorage(stored);
  const statusHost = new FakeElement('section');
  const fetchCalls = [];
  let responseIndex = 0;

  const document = {
    body: statusHost,
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    querySelector(selector) {
      if (selector === '[data-bsti-submission-status]') {
        return statusHost.children.find((child) => child.dataset.bstiSubmissionStatus === 'true') ?? null;
      }
      if (selector === '.result-shell' || selector === 'main') return statusHost;
      return null;
    }
  };

  class FixedDate extends Date {
    static now() {
      return NOW;
    }
  }

  const windowObject = {
    __BSTI_RUNTIME_CONFIG__: Object.freeze({
      environment: 'production-ready',
      submissionEnabled: enabled,
      apiBasePath: '/api'
    }),
    localStorage: storage,
    document,
    crypto: { randomUUID: () => UUID },
    fetch: async (url, options) => {
      fetchCalls.push({ url, options });
      const response = responses[responseIndex++] ?? { ok: false, status: 503 };
      return response;
    }
  };
  windowObject.window = windowObject;

  const context = vm.createContext({
    window: windowObject,
    document,
    localStorage: storage,
    crypto: windowObject.crypto,
    fetch: windowObject.fetch,
    Date: FixedDate,
    JSON,
    Object,
    Array,
    String,
    Number,
    Error,
    Promise,
    console
  });
  vm.runInContext(source, context, { filename: 'submission-client.js' });

  return {
    api: windowObject.BSTISubmission,
    storage,
    statusHost,
    fetchCalls
  };
}

function makeInstrumentAndState() {
  const items = Array.from({ length: 40 }, (_, index) => ({ id: `item-${index + 1}` }));
  const answers = Object.fromEntries(items.map((item, index) => [item.id, (index % 5) + 1]));
  return {
    instrument: {
      id: 'BSTI-40',
      version: '0.4.3',
      items
    },
    state: {
      assessmentProfile: {
        displayName: ' 林老板 ',
        businessUnit: ' 测试事业部 ',
        roleCode: 'founder_controller',
        roleOther: '',
        revenueBand: '10m_30m_cny',
        headcountBand: '10_30',
        industryCode: 'professional_services',
        industryOther: '',
        profileVersion: 'BSTI_PROFILE_V0.1'
      },
      consents: {
        reportProcessing: true,
        marketing: false,
        reportProcessingVersion: 'BSTI_PRIVACY_V0.1',
        marketingVersion: 'BSTI_MARKETING_V0.1'
      },
      answers
    }
  };
}

{
  const harness = makeHarness({ enabled: false });
  const { instrument, state } = makeInstrumentAndState();
  assert.equal(harness.api.prepareSubmission(instrument, state), null);
  assert.equal((await harness.api.submitPrepared(null)).status, 'disabled');
  assert.equal(harness.fetchCalls.length, 0);
  assert.equal(harness.storage.has(STORAGE_KEY), false);
}

{
  const harness = makeHarness({
    enabled: true,
    responses: [
      { ok: false, status: 503 },
      { ok: true, status: 200 }
    ]
  });
  const { instrument, state } = makeInstrumentAndState();
  const prepared = harness.api.prepareSubmission(instrument, state);
  const preparedValue = normalize(prepared);

  assert.equal(preparedValue.createdAt, NOW);
  assert.equal(preparedValue.status, 'pending');
  assert.deepEqual(preparedValue.payload, {
    schemaVersion: 'bsti-assessment-submission-v1',
    assessmentId: UUID,
    instrument: {
      id: 'BSTI-40',
      version: 'V0.4.3'
    },
    profile: {
      displayName: ' 林老板 ',
      businessUnit: ' 测试事业部 ',
      roleCode: 'founder_controller',
      roleOther: '',
      revenueBand: '10m_30m_cny',
      headcountBand: '10_30',
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
    answers: Array.from({ length: 40 }, (_, index) => ({
      itemId: index + 1,
      value: (index % 5) + 1
    }))
  });
  assert.deepEqual(JSON.parse(harness.storage.getItem(STORAGE_KEY)), preparedValue);

  assert.equal((await harness.api.submitPrepared(prepared)).status, 'failed');
  assert.equal(harness.storage.has(STORAGE_KEY), true);
  assert.match(harness.statusHost.allText(), /报告已生成，但资料尚未保存/);
  assert.match(harness.statusHost.allText(), /重新保存/);

  const firstBody = harness.fetchCalls[0].options.body;
  assert.equal(harness.fetchCalls[0].url, '/api/v1/assessments');
  assert.equal(harness.fetchCalls[0].options.method, 'POST');
  assert.equal(harness.fetchCalls[0].options.headers['Content-Type'], 'application/json');

  assert.equal((await harness.api.retryPending()).status, 'saved');
  assert.equal(harness.fetchCalls.length, 2);
  assert.equal(harness.fetchCalls[1].options.body, firstBody);
  assert.equal(harness.storage.has(STORAGE_KEY), false);
  assert.match(harness.statusHost.allText(), /资料已安全保存/);
}

{
  const stale = JSON.stringify({
    payload: { assessmentId: UUID },
    createdAt: NOW - (7 * 24 * 60 * 60 * 1000) - 1,
    status: 'pending'
  });
  const harness = makeHarness({ enabled: true, stored: stale });
  assert.equal(harness.api.getPendingSubmission(), null);
  assert.equal(harness.storage.has(STORAGE_KEY), false);
}

for (const forbidden of ['scoreAssessment', 'buildReportViewModel', 'quadrant_score', 'report_html']) {
  assert.equal(source.includes(forbidden), false, `browser submission client must not contain ${forbidden}`);
}

console.log('Production submission client contract: PASS');
