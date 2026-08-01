import assert from 'node:assert/strict';
import fs from 'node:fs';

const environmentUrl = new URL('../platform/contracts/environments.v0.1.json', import.meta.url);
const boundaryUrl = new URL('../platform/contracts/frozen-boundaries.v0.1.json', import.meta.url);

assert.ok(fs.existsSync(environmentUrl), 'P0 environment contract is missing');
assert.ok(fs.existsSync(boundaryUrl), 'P0 frozen-boundary contract is missing');

const environments = JSON.parse(fs.readFileSync(environmentUrl, 'utf8'));
const boundaries = JSON.parse(fs.readFileSync(boundaryUrl, 'utf8'));
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/profile-capture.yml', import.meta.url), 'utf8');
const design = fs.readFileSync(new URL('../docs/superpowers/specs/2026-08-01-bsti-p0-platform-foundation-guardrails-design.md', import.meta.url), 'utf8');
const plan = fs.readFileSync(new URL('../docs/superpowers/plans/2026-08-01-bsti-p0-platform-foundation-guardrails-plan.md', import.meta.url), 'utf8');
const decoded = [...html.matchAll(/data:text\/javascript;base64,([^']+)'/g)]
  .map((match) => Buffer.from(match[1], 'base64').toString())
  .join('\n');

assert.equal(environments.schemaVersion, 'p0-environment-contract-v0.1');
assert.equal(environments.defaultEnvironment, 'development');
assert.deepEqual(environments.environments.development, {
  hostClass: 'github_pages',
  realIdentifiableDataAllowed: false,
  submissionMode: 'disabled',
  apiMode: 'disabled',
  visibleDemoMarkerRequired: true
});
assert.equal(environments.environments.production.hostClass, 'tencent_cloudbase');
assert.equal(environments.environments.production.region, 'shanghai');
assert.equal(environments.environments.production.submissionMode, 'launch_gated');
assert.equal(environments.environments.production.submissionEnabledByDefault, false);
assert.equal(environments.environments.production.frontendSecretsAllowed, false);
assert.deepEqual(environments.environments.production.activationRequirements, [
  'registered_legal_entity',
  'personal_information_rights_contact',
  'approved_first_party_domain',
  'tencent_cloud_contracting_entity',
  'vendor_data_flow_inventory',
  'storage_backup_location_verified',
  'final_legal_review'
]);

assert.equal(boundaries.schemaVersion, 'p0-frozen-boundaries-v0.1');
assert.deepEqual(boundaries.instrument, { id: 'BSTI-40', version: 'V0.4.3' });
assert.deepEqual(boundaries.report, {
  id: 'BSTM',
  rulesVersion: 'V0.4.4.1',
  authoritativeCompiler: 'browser'
});
assert.deepEqual(boundaries.scoreInputs, ['answers']);
assert.deepEqual(boundaries.contextOnlyInputs, ['revenueBand', 'headcountBand']);
assert.deepEqual(boundaries.backend.allowedResponsibilities, [
  'validate',
  'store',
  'associate',
  'control_access'
]);
assert.equal(boundaries.backend.reimplementsScoring, false);
assert.equal(boundaries.backend.recompilesReports, false);
assert.deepEqual(boundaries.handoff, {
  configurable: true,
  providerNeutral: true
});
assert.deepEqual(boundaries.excludedP0Integrations, [
  'wechat_oauth',
  'wecom_callbacks',
  'eliy_interpretation',
  'full_crm',
  'booking',
  'payment',
  'automated_qualification'
]);

assert.ok(decoded.includes('当前为开发演示环境，请勿填写真实个人或企业资料。'));
assert.ok(workflow.includes('node tests/p0-platform-foundation-contract.mjs'));
assert.ok(design.includes('GitHub Pages is development/demo only'));
assert.ok(plan.includes('No API, MySQL, persistence, complexity-context rendering'));

console.log('P0 platform foundation guardrails: PASS');
