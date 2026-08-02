(function initializeBSTISubmission(globalObject) {
  'use strict';

  const config = globalObject.__BSTI_RUNTIME_CONFIG__ ?? Object.freeze({
    environment: 'production-ready',
    submissionEnabled: false,
    apiBasePath: '/api'
  });

  globalObject.BSTISubmission = Object.freeze({
    prepareSubmission() {
      return null;
    },

    async submitPrepared() {
      return { status: config.submissionEnabled ? 'failed' : 'disabled' };
    }
  });
})(window);
