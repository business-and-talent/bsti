import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relativePath) => fs.readFileSync(new URL(relativePath, root), 'utf8');

const requiredFiles = [
  'backend/functions/bsti-api/scf_bootstrap',
  'backend/functions/bsti-api/.env.example',
  'backend/functions/bsti-api/package.json',
  'backend/functions/bsti-api/index.js',
  'backend/functions/bsti-api/src/app.js',
  'backend/functions/bsti-api/src/config.js',
  'backend/functions/bsti-api/src/capabilities.js',
  'cloudbaserc.example.json',
  '.gitignore'
];

for (const relativePath of requiredFiles) {
  assert.equal(fs.existsSync(new URL(relativePath, root)), true, `${relativePath} is missing`);
}

const bootstrap = read('backend/functions/bsti-api/scf_bootstrap');
assert.equal(bootstrap.startsWith('#!/bin/bash\n'), true);
assert.equal(bootstrap.includes('export PORT="${PORT:-9000}"'), true);
assert.equal(bootstrap.includes('/var/lang/node20/bin/node index.js'), true);
assert.equal(bootstrap.includes('\r'), false);

const stagedBootstrap = execFileSync('git', [
  'ls-files',
  '--stage',
  'backend/functions/bsti-api/scf_bootstrap'
], { encoding: 'utf8' }).trim();
assert.match(stagedBootstrap, /^100755\s/);

const envExample = read('backend/functions/bsti-api/.env.example').trim().split('\n');
assert.deepEqual(envExample, [
  'BSTI_RUNTIME_ENV=development',
  'BSTI_SUBMISSION_ENABLED=false',
  'BSTI_API_VERSION=v1',
  'PORT=9000'
]);

const cloudbase = JSON.parse(read('cloudbaserc.example.json'));
assert.equal(cloudbase.version, '2.0');
assert.equal(cloudbase.envId, 'replace-with-cloudbase-environment-id');
assert.equal(cloudbase.functionRoot, 'backend/functions');
assert.equal(cloudbase.functions.length, 1);
assert.deepEqual(cloudbase.functions[0], {
  name: 'bsti-api',
  type: 'HTTP',
  runtime: 'Nodejs20.19',
  timeout: 5,
  memorySize: 256,
  installDependency: false,
  envVariables: {
    BSTI_RUNTIME_ENV: 'development',
    BSTI_SUBMISSION_ENABLED: 'false',
    BSTI_API_VERSION: 'v1',
    PORT: '9000'
  }
});

const packageJson = JSON.parse(read('backend/functions/bsti-api/package.json'));
assert.equal(packageJson.private, true);
assert.equal(packageJson.type, 'module');
assert.equal(packageJson.engines.node, '>=20.19.0');
assert.equal(packageJson.scripts.start, 'node index.js');
assert.equal(packageJson.dependencies, undefined);
assert.equal(packageJson.devDependencies, undefined);

const gitignore = read('.gitignore');
for (const pattern of [
  '.env',
  '.env.*',
  '!.env.example',
  'cloudbaserc.json',
  'cloudbaserc.json.local',
  '.cloudbase/',
  '*.pem',
  '*.key'
]) {
  assert.equal(gitignore.split('\n').includes(pattern), true, `.gitignore is missing ${pattern}`);
}

const backendSources = [
  read('backend/functions/bsti-api/index.js'),
  read('backend/functions/bsti-api/src/app.js'),
  read('backend/functions/bsti-api/src/config.js'),
  read('backend/functions/bsti-api/src/capabilities.js'),
  bootstrap,
  JSON.stringify(cloudbase)
].join('\n');

for (const forbidden of [
  '@cloudbase/',
  'mysql',
  'BEGIN PRIVATE KEY',
  'TENCENTCLOUD_SECRETID',
  'TENCENTCLOUD_SECRETKEY',
  "from '../../../index.html'",
  'scoreAssessment',
  'buildReportViewModel'
]) {
  assert.equal(backendSources.includes(forbidden), false, `forbidden backend content: ${forbidden}`);
}
assert.equal(/POST\s+\/assessment/i.test(backendSources), false);

const environments = JSON.parse(read('platform/contracts/environments.v0.1.json'));
assert.equal(environments.environments.development.submissionMode, 'disabled');
assert.equal(environments.environments.production.submissionEnabledByDefault, false);

const boundaries = JSON.parse(read('platform/contracts/frozen-boundaries.v0.1.json'));
assert.equal(boundaries.report.authoritativeCompiler, 'browser');
assert.equal(boundaries.backend.reimplementsScoring, false);
assert.equal(boundaries.backend.recompilesReports, false);

assert.equal(fs.existsSync(new URL('cloudbaserc.json', root)), false);

console.log('Backend CloudBase deployment and secret guardrail contract: PASS');
