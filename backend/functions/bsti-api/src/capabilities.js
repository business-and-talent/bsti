export const P0_CAPABILITIES = Object.freeze({
  apiVersion: 'v1',
  healthCheck: true,
  assessmentSubmission: false,
  persistence: false,
  backendScoring: false,
  backendReportCompilation: false
});

export function getCapabilities(config = { submissionEnabled: false }) {
  const enabled = config.submissionEnabled === true;
  return {
    apiVersion: 'v1',
    healthCheck: true,
    assessmentSubmission: enabled,
    persistence: enabled,
    backendScoring: false,
    backendReportCompilation: false
  };
}
