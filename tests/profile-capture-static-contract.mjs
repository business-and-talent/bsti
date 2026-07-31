import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const baseline = execFileSync(
  'git',
  ['show', 'v0.4.4.1:index.html'],
  { encoding: 'utf8' }
);

function importPayload(source, exportName) {
  const pattern = new RegExp(
    `import \\{[^}]*\\b${exportName}\\b[^}]*\\} from 'data:text/javascript;base64,([^']+)'`
  );
  const match = source.match(pattern);
  assert.ok(match, `${exportName} import not found`);
  return match[1];
}

function instrumentPayload(source) {
  return source.match(/const instrument = (\{.*?\});\n\s*const pages =/s)?.[1] ?? null;
}

function decodedModules(source) {
  return [...source.matchAll(/data:text\/javascript;base64,([^']+)'/g)]
    .map((match) => Buffer.from(match[1], 'base64').toString('utf8'));
}

async function importEmbeddedModule(source, exportName) {
  const payload = importPayload(source, exportName);
  return import(`data:text/javascript;base64,${payload}`);
}

const modules = decodedModules(html);
const decoded = modules.join('\n');

for (const key of [
  'assessmentProfile',
  'displayName',
  'businessUnit',
  'roleCode',
  'roleOther',
  'revenueBand',
  'headcountBand',
  'industryCode',
  'industryOther',
  'profileVersion',
  'currentlyOperatingBusiness',
  'participatesInKeyBusinessDecisions',
  'canReferenceRecent6Months',
  'usesConsistentBusinessReference',
  'reportProcessing',
  'marketing',
  'validatePreAssessmentState'
]) {
  assert.ok(decoded.includes(key), `missing contract key: ${key}`);
}

for (const code of [
  'founder_controller',
  'owner_chair',
  'ceo_president_gm',
  'cofounder_partner',
  'business_unit_owner',
  'cxo_core_executive',
  'middle_manager',
  'professional_advisor',
  'lt_10m_cny',
  '10m_30m_cny',
  '30m_100m_cny',
  '100m_300m_cny',
  '300m_1b_cny',
  'gte_1b_cny',
  'prefer_not_to_say',
  'lt_10',
  '10_30',
  '30_100',
  '100_300',
  '300_1000',
  'gte_1000'
]) {
  assert.ok(decoded.includes(code), `missing stable code: ${code}`);
}

for (const text of [
  '以下资料用于固定本次作答情境',
  '上述资料不改变 BSTI 计分结果',
  '我已阅读并同意《BSTI 个人信息处理规则》',
  '我愿意接收与本次报告相关的解读、活动和服务信息',
  '确认资料，开始测试',
  '当前为开发演示环境，请勿填写真实个人或企业资料'
]) {
  assert.ok(decoded.includes(text), `missing frozen copy: ${text}`);
}

for (const id of [
  'eligibility-operating',
  'eligibility-decisions',
  'eligibility-six-months',
  'eligibility-reference',
  'profile-display-name',
  'profile-business-unit',
  'profile-role-code',
  'profile-role-other',
  'profile-revenue-band',
  'profile-headcount-band',
  'profile-industry-other',
  'consent-report-processing',
  'consent-marketing',
  'profile-continue'
]) {
  assert.ok(decoded.includes(id), `missing gate control: ${id}`);
}

assert.ok(decoded.includes("profileVersion: 'BSTI_PROFILE_V0.1'"));
assert.ok(decoded.includes("reportProcessingVersion: 'BSTI_PRIVACY_V0.1'"));
assert.ok(decoded.includes("marketingVersion: 'BSTI_MARKETING_V0.1'"));

assert.equal(
  instrumentPayload(html),
  instrumentPayload(baseline),
  'profile capture must not change the frozen instrument'
);
assert.equal(
  importPayload(html, 'scoreAssessment'),
  importPayload(baseline, 'scoreAssessment'),
  'profile capture must not change the scoring module'
);

const submitBody = html.match(/function submitAssessment\(\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
assert.ok(submitBody.includes('scoreAssessment(instrument, state.answers)'));
assert.ok(!/assessmentProfile|eligibility|consents/.test(submitBody));

const stateModule = await importEmbeddedModule(html, 'createInitialState');
const {
  createInitialState,
  reduceState,
  validatePreAssessmentState
} = stateModule;

const initial = createInitialState();
assert.deepEqual(initial.eligibility, {
  currentlyOperatingBusiness: false,
  participatesInKeyBusinessDecisions: false,
  canReferenceRecent6Months: false,
  usesConsistentBusinessReference: false
});
assert.deepEqual(initial.assessmentProfile, {
  displayName: '',
  businessUnit: '',
  roleCode: '',
  roleOther: '',
  revenueBand: '',
  headcountBand: '',
  industryCode: 'other',
  industryOther: '',
  profileVersion: 'BSTI_PROFILE_V0.1'
});
assert.equal(initial.consents.reportProcessing, false);
assert.equal(initial.consents.marketing, false);
assert.equal(initial.consents.reportProcessingVersion, 'BSTI_PRIVACY_V0.1');
assert.equal(initial.consents.marketingVersion, 'BSTI_MARKETING_V0.1');
assert.deepEqual(validatePreAssessmentState(initial), {
  valid: false,
  firstInvalidField: 'currentlyOperatingBusiness'
});

const complete = {
  ...initial,
  eligibility: {
    currentlyOperatingBusiness: true,
    participatesInKeyBusinessDecisions: true,
    canReferenceRecent6Months: true,
    usesConsistentBusinessReference: true
  },
  assessmentProfile: {
    ...initial.assessmentProfile,
    displayName: '测试用户',
    businessUnit: '测试企业',
    roleCode: 'founder_controller',
    revenueBand: 'prefer_not_to_say',
    headcountBand: 'prefer_not_to_say',
    industryOther: '测试行业'
  },
  consents: {
    ...initial.consents,
    reportProcessing: true
  }
};

assert.equal(validatePreAssessmentState(complete).valid, true);
assert.equal(
  reduceState(complete, { type: 'CONFIRM_PROFILE' }, []).view,
  'intro'
);
assert.equal(
  reduceState(
    { ...complete, consents: { ...complete.consents, marketing: false } },
    { type: 'CONFIRM_PROFILE' },
    []
  ).view,
  'intro'
);
assert.equal(
  validatePreAssessmentState({
    ...complete,
    assessmentProfile: {
      ...complete.assessmentProfile,
      roleCode: 'other',
      roleOther: ''
    }
  }).firstInvalidField,
  'roleOther'
);

const draftModule = await importEmbeddedModule(html, 'shouldResetAssessmentViewport');
const serialized = draftModule.serializeDraft(
  { ...complete, result: { stale: true } },
  '0.4.3'
);
const restored = draftModule.restoreDraft(serialized, '0.4.3');
assert.equal(restored.assessmentProfile.displayName, '测试用户');
assert.equal(restored.consents.reportProcessing, true);
assert.equal(restored.result, null);
assert.deepEqual(
  reduceState(complete, { type: 'RESET' }, []),
  createInitialState()
);

assert.ok(
  decoded.includes('state.assessmentProfile.businessUnit'),
  'results must read the business unit from assessmentProfile'
);

console.log('Assessment profile capture static contract: PASS');
