import assert from 'node:assert/strict';
import { createPool } from 'mysql2/promise';

const apiBaseUrl = process.env.BSTI_TEST_API_BASE_URL ?? 'http://127.0.0.1:9001';
const assessmentId = '550e8400-e29b-41d4-a716-446655440000';

const validBody = {
  schemaVersion: 'bsti-assessment-submission-v1',
  assessmentId,
  instrument: { id: 'BSTI-40', version: 'V0.4.3' },
  profile: {
    displayName: 'MySQL Contract User',
    businessUnit: 'MySQL Contract Entity',
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
  answers: Array.from({ length: 40 }, (_, index) => ({
    itemId: index + 1,
    value: (index % 5) + 1
  }))
};

async function post(body) {
  const response = await fetch(`${apiBaseUrl}/v1/assessments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

const first = await post(validBody);
assert.equal(first.status, 201);
assert.deepEqual(first.body, {
  assessmentId,
  status: 'submitted',
  submittedAt: first.body.submittedAt,
  replayed: false
});
assert.match(first.body.submittedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

const replay = await post(validBody);
assert.equal(replay.status, 200);
assert.deepEqual(replay.body, {
  assessmentId,
  status: 'submitted',
  submittedAt: first.body.submittedAt,
  replayed: true
});

const changed = structuredClone(validBody);
changed.answers[0].value = changed.answers[0].value === 5 ? 4 : 5;
const conflict = await post(changed);
assert.equal(conflict.status, 409);
assert.equal(conflict.body.error.code, 'SUBMISSION_CONFLICT');

const invalid = structuredClone(validBody);
invalid.assessmentId = 'd9428888-122b-4f65-8f6c-2f123b44aa11';
invalid.answers = [];
const invalidResponse = await post(invalid);
assert.equal(invalidResponse.status, 422);
assert.equal(invalidResponse.body.error.code, 'INVALID_SUBMISSION');
assert.equal(JSON.stringify(invalidResponse.body).includes('MySQL Contract User'), false);

const pool = createPool({
  host: process.env.BSTI_DB_HOST,
  port: Number(process.env.BSTI_DB_PORT),
  database: process.env.BSTI_DB_NAME,
  user: process.env.BSTI_DB_USER,
  password: process.env.BSTI_DB_PASSWORD,
  connectionLimit: 1,
  timezone: 'Z'
});

try {
  const [[assessment]] = await pool.execute(
    'SELECT id, instrument_id, instrument_version, submission_fingerprint, status, submitted_at FROM assessments WHERE id = ?',
    [assessmentId]
  );
  assert.equal(assessment.id, assessmentId);
  assert.equal(assessment.instrument_id, 'BSTI-40');
  assert.equal(assessment.instrument_version, 'V0.4.3');
  assert.match(assessment.submission_fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(assessment.status, 'submitted');
  assert.ok(assessment.submitted_at);

  const [[profile]] = await pool.execute(
    'SELECT display_name, business_entity_name, current_role, industry_code, revenue_band, headcount_band, privacy_notice_version, report_usage_notice_version, marketing_consent_granted, marketing_consent_text_version, marketing_consent_at FROM assessment_profile_snapshots WHERE assessment_id = ?',
    [assessmentId]
  );
  assert.equal(profile.display_name, 'MySQL Contract User');
  assert.equal(profile.business_entity_name, 'MySQL Contract Entity');
  assert.equal(profile.current_role, 'founder_controller');
  assert.equal(profile.industry_code, 'professional_services');
  assert.equal(profile.revenue_band, 'prefer_not_to_say');
  assert.equal(profile.headcount_band, 'prefer_not_to_say');
  assert.equal(profile.privacy_notice_version, 'BSTI_PRIVACY_V0.1');
  assert.equal(profile.report_usage_notice_version, 'BSTI_REPORT_USAGE_V0.1');
  assert.equal(Number(profile.marketing_consent_granted), 0);
  assert.equal(profile.marketing_consent_text_version, null);
  assert.equal(profile.marketing_consent_at, null);

  const [[answerCount]] = await pool.execute(
    'SELECT COUNT(*) AS count FROM assessment_answers WHERE assessment_id = ?',
    [assessmentId]
  );
  assert.equal(Number(answerCount.count), 40);

  const [[researchConsent]] = await pool.execute(
    'SELECT consent_status, consent_text_version, granted_at, withdrawn_at FROM assessment_research_consents WHERE assessment_id = ?',
    [assessmentId]
  );
  assert.deepEqual(researchConsent, {
    consent_status: 'not_granted',
    consent_text_version: null,
    granted_at: null,
    withdrawn_at: null
  });

  const [[aggregateCounts]] = await pool.execute(
    `SELECT
      (SELECT COUNT(*) FROM assessments) AS assessments,
      (SELECT COUNT(*) FROM assessment_profile_snapshots) AS profiles,
      (SELECT COUNT(*) FROM assessment_answers) AS answers,
      (SELECT COUNT(*) FROM assessment_research_consents) AS research_consents`
  );
  assert.deepEqual({
    assessments: Number(aggregateCounts.assessments),
    profiles: Number(aggregateCounts.profiles),
    answers: Number(aggregateCounts.answers),
    researchConsents: Number(aggregateCounts.research_consents)
  }, {
    assessments: 1,
    profiles: 1,
    answers: 40,
    researchConsents: 1
  });

  const [[forbiddenColumns]] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND (column_name LIKE '%score%'
         OR column_name LIKE '%quadrant%'
         OR column_name LIKE '%focus%'
         OR column_name IN ('report_html', 'report_json', 'answers_json'))`
  );
  assert.equal(Number(forbiddenColumns.count), 0);
} finally {
  await pool.end();
}

console.log('Assessment submission MySQL integration: PASS');
