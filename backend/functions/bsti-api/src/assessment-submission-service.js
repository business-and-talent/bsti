import { fingerprintSubmission } from './submission-fingerprint.js';
import { validateAndNormalizeSubmission } from './submission-validation.js';

export function createAssessmentSubmissionService(repository, options = {}) {
  const clock = options.clock ?? (() => new Date());

  return Object.freeze({
    async submit(rawSubmission) {
      const validation = validateAndNormalizeSubmission(rawSubmission);
      if (!validation.ok) {
        return {
          kind: 'invalid',
          issues: validation.issues
        };
      }

      const fingerprint = fingerprintSubmission(validation.submission);
      const now = clock();

      try {
        return await repository.submit({
          submission: validation.submission,
          fingerprint,
          now
        });
      } catch {
        return { kind: 'unavailable' };
      }
    }
  });
}
