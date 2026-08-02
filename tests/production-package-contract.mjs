import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relativePath) => fs.readFileSync(new URL(relativePath, root), 'utf8');

const gatePath = new URL('platform/contracts/production-launch-gates.v0.1.json', root);
assert.equal(fs.existsSync(gatePath), true, 'production launch-gate contract is missing');

const gates = JSON.parse(fs.readFileSync(gatePath, 'utf8'));
assert.equal(gates.schemaVersion, 'bsti-production-launch-gates-v0.1');
assert.equal(gates.submissionEnabledByDefault, false);
assert.deepEqual(gates.canonical, {
  domain: 'richboss.com',
  bstiPath: '/bsti/',
  apiPath: '/api/v1/assessments',
  chineseEntryDomain: 'fulaoban.cn',
  chineseEntryRedirectMode: 'path_preserving_permanent_redirect'
});

assert.deepEqual(gates.requiredGateIds, [
  'icp_filing_complete',
  'operating_legal_entity_confirmed',
  'personal_information_rights_contact_confirmed',
  'tencent_cloud_contracting_entity_confirmed',
  'cloudbase_shanghai_environment_confirmed',
  'production_mysql_empty_confirmed',
  'backup_restore_verified',
  'vendor_data_flow_inventory_approved',
  'legal_documents_finalized',
  'https_and_path_routing_verified',
  'final_legal_review_approved',
  'release_approval_recorded'
]);

const approvalExamplePath = new URL('deployment/release-approval.example.json', root);
assert.equal(fs.existsSync(approvalExamplePath), true, 'release approval example is missing');
const approvalExample = JSON.parse(fs.readFileSync(approvalExamplePath, 'utf8'));
assert.equal(approvalExample.schemaVersion, 'bsti-production-release-approval-v0.1');
assert.equal(approvalExample.approvedDomain, 'richboss.com');
assert.equal(approvalExample.gates.icp_filing_complete, false);

const gitignore = read('.gitignore').split('\n');
assert.equal(gitignore.includes('deployment/release-approval.json'), true);
assert.equal(gitignore.includes('dist/'), true);
assert.equal(gitignore.includes('.tmp/'), true);

const workflowPath = new URL('.github/workflows/production-package.yml', root);
assert.equal(fs.existsSync(workflowPath), true, 'production package workflow is missing');
const workflow = fs.readFileSync(workflowPath, 'utf8');
assert.match(workflow, /node tests\/production-package-contract\.mjs/);
assert.doesNotMatch(workflow, /cloudbase\s+deploy|tcb\s+framework|secretId|secretKey/i);

const buildScriptPath = new URL('scripts/build-production-package.mjs', root);
assert.equal(fs.existsSync(buildScriptPath), true, 'production package builder is missing');
const clientSourcePath = new URL('production/submission-client.js', root);
assert.equal(fs.existsSync(clientSourcePath), true, 'production submission client is missing');

const outputPath = new URL('.tmp/production-package-contract/', root);
fs.rmSync(outputPath, { recursive: true, force: true });
execFileSync(process.execPath, [
  new URL('scripts/build-production-package.mjs', root).pathname,
  '--output', outputPath.pathname,
  '--source-commit', 'test-sha'
], { cwd: root.pathname, stdio: 'pipe' });

const requiredPackageFiles = [
  'bsti/index.html',
  'bsti/privacy.html',
  'bsti/report-usage.html',
  'bsti/runtime-config.js',
  'bsti/submission-client.js',
  'deployment-manifest.json'
];
for (const relativePath of requiredPackageFiles) {
  assert.equal(fs.existsSync(new URL(relativePath, outputPath)), true, `package file missing: ${relativePath}`);
}

const packagedIndex = fs.readFileSync(new URL('bsti/index.html', outputPath), 'utf8');
const runtimeScriptPosition = packagedIndex.indexOf('<script src="./runtime-config.js"></script>');
const clientScriptPosition = packagedIndex.indexOf('<script src="./submission-client.js"></script>');
const moduleScriptPosition = [
  packagedIndex.indexOf("<script type='module'>"),
  packagedIndex.indexOf('<script type="module">')
].find((position) => position >= 0) ?? -1;
assert.equal(runtimeScriptPosition >= 0, true);
assert.equal(clientScriptPosition > runtimeScriptPosition, true);
assert.equal(moduleScriptPosition > clientScriptPosition, true);
assert.match(packagedIndex, /window\.BSTISubmission\.prepareSubmission\(instrument, state\)/);
assert.match(packagedIndex, /window\.BSTISubmission\.submitPrepared\(preparedSubmission\)/);
assert.equal(
  packagedIndex.indexOf("dispatch({ type: 'SET_RESULT'") < packagedIndex.indexOf('window.BSTISubmission.submitPrepared(preparedSubmission)'),
  true,
  'report rendering must start before persistence'
);

const runtimeConfig = fs.readFileSync(new URL('bsti/runtime-config.js', outputPath), 'utf8');
assert.match(runtimeConfig, /environment:\s*'production-ready'/);
assert.match(runtimeConfig, /submissionEnabled:\s*false/);
assert.match(runtimeConfig, /apiBasePath:\s*'\/api'/);

const manifest = JSON.parse(fs.readFileSync(new URL('deployment-manifest.json', outputPath), 'utf8'));
assert.equal(manifest.schemaVersion, 'bsti-deployment-manifest-v0.1');
assert.equal(manifest.sourceCommit, 'test-sha');
assert.equal(manifest.canonicalDomain, 'richboss.com');
assert.equal(manifest.bstiPath, '/bsti/');
assert.equal(manifest.apiPath, '/api/v1/assessments');
assert.equal(manifest.submissionEnabled, false);
assert.equal(manifest.bstiVersion, 'V0.4.3');
assert.equal(manifest.bstmVersion, 'V0.4.4.1');

const packageText = requiredPackageFiles
  .map((relativePath) => fs.readFileSync(new URL(relativePath, outputPath), 'utf8'))
  .join('\n');
for (const forbidden of [
  'TENCENTCLOUD_SECRETID',
  'TENCENTCLOUD_SECRETKEY',
  'BEGIN PRIVATE KEY',
  'replace-with-cloudbase-environment-id'
]) {
  assert.equal(packageText.includes(forbidden), false, `forbidden package content: ${forbidden}`);
}
assert.doesNotMatch(packageText, /mysql:\/\//i);
assert.doesNotMatch(packageText, /10\.\d+\.\d+\.\d+/);

fs.rmSync(outputPath, { recursive: true, force: true });
console.log('Production package and launch-gate contract: PASS');
