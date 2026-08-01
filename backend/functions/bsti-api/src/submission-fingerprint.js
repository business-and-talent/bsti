import { createHash } from 'node:crypto';

function canonicalSubmission(submission) {
  return {
    schemaVersion: submission.schemaVersion,
    instrument: {
      id: submission.instrument.id,
      version: submission.instrument.version
    },
    profile: {
      displayName: submission.profile.displayName,
      businessUnit: submission.profile.businessUnit,
      roleCode: submission.profile.roleCode,
      roleOther: submission.profile.roleOther,
      revenueBand: submission.profile.revenueBand,
      headcountBand: submission.profile.headcountBand,
      industryCode: submission.profile.industryCode,
      industryOther: submission.profile.industryOther
    },
    consents: {
      reportProcessing: submission.consents.reportProcessing,
      reportProcessingVersion: submission.consents.reportProcessingVersion,
      reportUsageVersion: submission.consents.reportUsageVersion,
      marketing: submission.consents.marketing,
      marketingVersion: submission.consents.marketingVersion
    },
    answers: submission.answers.map(({ itemId, value }) => ({ itemId, value }))
  };
}

export function fingerprintSubmission(submission) {
  const payload = JSON.stringify(canonicalSubmission(submission));
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
