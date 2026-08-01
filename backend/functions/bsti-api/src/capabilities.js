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
