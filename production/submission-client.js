(function initializeBSTISubmission(globalObject) {
  'use strict';

  const STORAGE_KEY = 'bsti.pendingSubmission.v1';
  const MAX_PENDING_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const config = globalObject.__BSTI_RUNTIME_CONFIG__ ?? Object.freeze({
    environment: 'production-ready',
    submissionEnabled: false,
    apiBasePath: '/api'
  });

  function storage() {
    return globalObject.localStorage;
  }

  function removePending() {
    storage().removeItem(STORAGE_KEY);
  }

  function readPending() {
    const raw = storage().getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const record = JSON.parse(raw);
      const valid = record
        && Number.isFinite(record.createdAt)
        && record.status === 'pending'
        && record.payload
        && typeof record.payload === 'object';
      if (!valid || Date.now() - record.createdAt > MAX_PENDING_AGE_MS) {
        removePending();
        return null;
      }
      return record;
    } catch {
      removePending();
      return null;
    }
  }

  function writePending(record) {
    storage().setItem(STORAGE_KEY, JSON.stringify(record));
  }

  function createStatusPanel() {
    const documentObject = globalObject.document;
    let panel = documentObject.querySelector('[data-bsti-submission-status]');
    if (panel) return panel;

    panel = documentObject.createElement('section');
    panel.dataset.bstiSubmissionStatus = 'true';
    panel.style.margin = '20px auto';
    panel.style.padding = '14px 16px';
    panel.style.maxWidth = '760px';
    panel.style.border = '1px solid #ddd6fe';
    panel.style.borderRadius = '14px';
    panel.style.background = '#faf8ff';
    panel.style.lineHeight = '1.6';

    const host = documentObject.querySelector('.result-shell')
      ?? documentObject.querySelector('main')
      ?? documentObject.body;
    host.appendChild(panel);
    return panel;
  }

  function showStatus(status) {
    const panel = createStatusPanel();
    const message = globalObject.document.createElement('span');

    if (status === 'saved') {
      message.textContent = '资料已安全保存';
      panel.replaceChildren(message);
      return;
    }

    if (status === 'saving') {
      message.textContent = '正在安全保存资料…';
      panel.replaceChildren(message);
      return;
    }

    message.textContent = '报告已生成，但资料尚未保存。';
    const retryButton = globalObject.document.createElement('button');
    retryButton.type = 'button';
    retryButton.textContent = '重新保存';
    retryButton.style.marginLeft = '10px';
    retryButton.addEventListener('click', () => {
      retryPending();
    });
    panel.replaceChildren(message, retryButton);
  }

  function buildPayload(instrument, state) {
    const profile = state.assessmentProfile;
    const consents = state.consents;

    return {
      schemaVersion: 'bsti-assessment-submission-v1',
      assessmentId: globalObject.crypto.randomUUID(),
      instrument: {
        id: 'BSTI-40',
        version: 'V0.4.3'
      },
      profile: {
        displayName: profile.displayName,
        businessUnit: profile.businessUnit,
        roleCode: profile.roleCode,
        roleOther: profile.roleOther,
        revenueBand: profile.revenueBand,
        headcountBand: profile.headcountBand,
        industryCode: profile.industryCode,
        industryOther: profile.industryOther
      },
      consents: {
        reportProcessing: consents.reportProcessing,
        reportProcessingVersion: consents.reportProcessingVersion,
        reportUsageVersion: 'BSTI_REPORT_USAGE_V0.1',
        marketing: consents.marketing,
        marketingVersion: consents.marketing ? consents.marketingVersion : null
      },
      answers: instrument.items.map((item, index) => ({
        itemId: index + 1,
        value: state.answers[item.id]
      }))
    };
  }

  function prepareSubmission(instrument, state) {
    if (!config.submissionEnabled) return null;

    const record = {
      payload: buildPayload(instrument, state),
      createdAt: Date.now(),
      status: 'pending'
    };
    writePending(record);
    return record;
  }

  function endpoint() {
    const basePath = String(config.apiBasePath || '/api').replace(/\/$/, '');
    return `${basePath}/v1/assessments`;
  }

  async function submitPrepared(prepared) {
    if (!config.submissionEnabled) return { status: 'disabled' };

    const record = prepared ?? readPending();
    if (!record) return { status: 'failed' };

    showStatus('saving');
    try {
      const response = await globalObject.fetch(endpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record.payload)
      });
      if (!response.ok) throw new Error('Assessment persistence failed');

      removePending();
      showStatus('saved');
      return { status: 'saved' };
    } catch {
      showStatus('failed');
      return { status: 'failed' };
    }
  }

  async function retryPending() {
    return submitPrepared(readPending());
  }

  globalObject.BSTISubmission = Object.freeze({
    prepareSubmission,
    submitPrepared,
    retryPending,
    getPendingSubmission: readPending
  });

  if (config.submissionEnabled && readPending()) {
    showStatus('failed');
  }
})(window);
