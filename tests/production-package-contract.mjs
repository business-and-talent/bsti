import assert from 'node:assert/strict';
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

console.log('Production package and launch-gate contract: PASS');
