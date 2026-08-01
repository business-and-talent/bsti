import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = path.join(root, 'backend/functions/bsti-api/src/submission-contract.js');
const validationPath = path.join(root, 'backend/functions/bsti-api/src/submission-validation.js');
const fingerprintPath = path.join(root, 'backend/functions/bsti-api/src/submission-fingerprint.js');

assert.equal(fs.existsSync(contractPath), true, 'Submission contract module is missing');
assert.equal(fs.existsSync(validationPath), true, 'Submission validation module is missing');
assert.equal(fs.existsSync(fingerprintPath), true, 'Submission fingerprint module is missing');

const contract = await import(`file://${contractPath}`);
const { validateAndNormalizeSubmission } = await import(`file://${validationPath}`);
const { fingerprintSubmission } = await import(`file://${fingerprintPath}`);

const expectedRoles = [
  'founder_controller',
  'owner_chair',
  'ceo_president_gm',
  'cofounder_partner',
  'business_unit_owner',
  'cxo_core_executive',
  'middle_manager',
  'professional_advisor',
  'other'
];
const expectedRevenueBands = [
  'lt_10m_cny',
  '10m_30m_cny',
  '30m_100m_cny',
  '100m_300m_cny',
  '300m_1b_cny',
  'gte_1b_cny',
  'prefer_not_to_say'
];
const expectedHeadcountBands = [
  'lt_10',
  '10_30',
  '30_100',
  '100_300',
  '300_1000',
  'gte_1000',
  'prefer_not_to_say'
];
const expectedIndustries = [
  'manufacturing',
  'retail_consumer',
  'food_hospitality',
  'technology_internet',
  'professional_services',
  'education_training',
  'healthcare',
  'finance_insurance',
  'construction_real_estate',
  'transport_logistics',
  'culture_media',
  'agriculture_food',
  'energy_environment',
  'other'
];

assert.equal(contract.SUBMISSION_SCHEMA_VERSION, 'bsti-assessment-submission-v1');
assert.equal(contract.INSTRUMENT_ID, 'BSTI-40');
assert.equal(contract.INSTRUMENT_VERSION, 'V0.4.3');
assert.equal(contract.REPORT_PROCESSING_VERSION, 'BSTI_PRIVACY_V0.1');
assert.equal(contract.REPORT_USAGE_VERSION, 'BSTI_REPORT_USAGE_V0.1');
assert.equal(contract.MARKETING_VERSION, 'BSTI_MARKETING_V0.1');
assert.deepEqual([...contract.ROLE_CODES], expectedRoles);
assert.deepEqual([...contract.REVENUE_BANDS], expectedRevenueBands);
assert.deepEqual([...contract.HEADCOUNT_BANDS], expectedHeadcountBands);
assert.deepEqual([...contract.INDUSTRY_CODES], expectedIndustries);

function validSubmissionFixture() {
  return {
    schemaVersion: 'bsti-assessment-submission-v1',
    assessmentId: '550e8400-e29b-41d4-a716-446655440000',
    instrument: {
      id: 'BSTI-40',
      version: 'V0.4.3'
    },
    profile: {
      displayName: ' 测试用户 ',
      businessUnit: ' 测试企业 ',
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
}

function expectInvalid(mutator, expectedPath, expectedCode) {
  const fixture = validSubmissionFixture();
  mutator(fixture);
  const result = validateAndNormalizeSubmission(fixture);
  assert.equal(result.ok, false, `Expected invalid result for ${expectedPath}`);
  assert.ok(
    result.issues.some((issue) => issue.path === expectedPath && issue.code === expectedCode),
    `Missing issue ${expectedPath}:${expectedCode}; got ${JSON.stringify(result.issues)}`
  );
  assert.equal(JSON.stringify(result.issues).includes('测试用户'), false, 'Issues must not echo profile data');
  assert.equal(JSON.stringify(result.issues).includes('测试企业'), false, 'Issues must not echo business data');
}

const valid = validateAndNormalizeSubmission(validSubmissionFixture());
assert.equal(valid.ok, true, JSON.stringify(valid));
assert.equal(valid.submission.profile.displayName, '测试用户');
assert.equal(valid.submission.profile.businessUnit, '测试企业');
assert.equal(valid.submission.answers.length, 40);
assert.deepEqual(
  valid.submission.answers.map(({ itemId }) => itemId),
  Array.from({ length: 40 }, (_, index) => index + 1)
);
assert.match(fingerprintSubmission(valid.submission), /^[0-9a-f]{64}$/);

const shuffledFixture = validSubmissionFixture();
shuffledFixture.answers.reverse();
shuffledFixture.assessmentId = 'd9428888-122b-4f65-8f6c-2f123b44aa11';
const shuffled = validateAndNormalizeSubmission(shuffledFixture);
assert.equal(shuffled.ok, true);
assert.equal(
  fingerprintSubmission(valid.submission),
  fingerprintSubmission(shuffled.submission),
  'Fingerprint must exclude assessmentId and normalize answer order'
);

const changedAnswerFixture = validSubmissionFixture();
changedAnswerFixture.answers[0].value = 5;
const changedAnswer = validateAndNormalizeSubmission(changedAnswerFixture);
assert.equal(changedAnswer.ok, true);
assert.notEqual(fingerprintSubmission(valid.submission), fingerprintSubmission(changedAnswer.submission));

const otherFixture = validSubmissionFixture();
otherFixture.profile.roleCode = 'other';
otherFixture.profile.roleOther = ' 联合经营者 ';
otherFixture.profile.industryCode = 'other';
otherFixture.profile.industryOther = ' 新兴复合服务 ';
const other = validateAndNormalizeSubmission(otherFixture);
assert.equal(other.ok, true, JSON.stringify(other));
assert.equal(other.submission.profile.roleOther, '联合经营者');
assert.equal(other.submission.profile.industryOther, '新兴复合服务');

const marketingFixture = validSubmissionFixture();
marketingFixture.consents.marketing = true;
marketingFixture.consents.marketingVersion = 'BSTI_MARKETING_V0.1';
assert.equal(validateAndNormalizeSubmission(marketingFixture).ok, true);

expectInvalid((body) => { body.unexpected = true; }, '$', 'unknown_field');
expectInvalid((body) => { body.profile.unexpected = true; }, 'profile', 'unknown_field');
expectInvalid((body) => { body.answers[0].score = 20; }, 'answers[0]', 'unknown_field');
expectInvalid((body) => { body.assessmentId = '550e8400-e29b-11d4-a716-446655440000'; }, 'assessmentId', 'uuid_v4');
expectInvalid((body) => { body.instrument.id = 'OTHER'; }, 'instrument.id', 'unsupported');
expectInvalid((body) => { body.instrument.version = '0.4.3'; }, 'instrument.version', 'unsupported');
expectInvalid((body) => { body.profile.displayName = '   '; }, 'profile.displayName', 'required');
expectInvalid((body) => { body.profile.businessUnit = ''; }, 'profile.businessUnit', 'required');
expectInvalid((body) => { body.profile.roleCode = 'invented'; }, 'profile.roleCode', 'unsupported');
expectInvalid((body) => { body.profile.roleCode = 'other'; body.profile.roleOther = ''; }, 'profile.roleOther', 'required');
expectInvalid((body) => { body.profile.roleOther = 'not allowed'; }, 'profile.roleOther', 'must_be_empty');
expectInvalid((body) => { body.profile.revenueBand = 'unknown'; }, 'profile.revenueBand', 'unsupported');
expectInvalid((body) => { body.profile.headcountBand = 'unknown'; }, 'profile.headcountBand', 'unsupported');
expectInvalid((body) => { body.profile.industryCode = 'unknown'; }, 'profile.industryCode', 'unsupported');
expectInvalid((body) => { body.profile.industryCode = 'other'; body.profile.industryOther = ''; }, 'profile.industryOther', 'required');
expectInvalid((body) => { body.profile.industryOther = 'not allowed'; }, 'profile.industryOther', 'must_be_empty');
expectInvalid((body) => { body.consents.reportProcessing = false; }, 'consents.reportProcessing', 'required_true');
expectInvalid((body) => { body.consents.reportProcessingVersion = 'old'; }, 'consents.reportProcessingVersion', 'unsupported');
expectInvalid((body) => { body.consents.reportUsageVersion = 'old'; }, 'consents.reportUsageVersion', 'unsupported');
expectInvalid((body) => { body.consents.marketingVersion = 'BSTI_MARKETING_V0.1'; }, 'consents.marketingVersion', 'must_be_null');
expectInvalid((body) => { body.consents.marketing = true; }, 'consents.marketingVersion', 'required');
expectInvalid((body) => { body.answers.pop(); }, 'answers', 'complete_40');
expectInvalid((body) => { body.answers[39].itemId = 1; }, 'answers', 'duplicate_item');
expectInvalid((body) => { body.answers[0].itemId = 41; }, 'answers[0].itemId', 'range');
expectInvalid((body) => { body.answers[0].value = 6; }, 'answers[0].value', 'range');
expectInvalid((body) => { body.answers[0].value = 3.5; }, 'answers[0].value', 'integer');
expectInvalid((body) => { body.scores = { I: 50 }; }, '$', 'unknown_field');

console.log('Assessment submission validation contract: PASS');
