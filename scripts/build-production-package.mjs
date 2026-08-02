import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

function parseArgs(argv) {
  const options = {
    output: path.join(repoRoot, 'dist'),
    sourceCommit: 'unknown',
    enableSubmission: false,
    releaseApproval: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--output') {
      options.output = path.resolve(argv[++index] ?? '');
    } else if (argument === '--source-commit') {
      options.sourceCommit = argv[++index] ?? 'unknown';
    } else if (argument === '--enable-submission') {
      options.enableSubmission = true;
    } else if (argument === '--release-approval') {
      options.releaseApproval = path.resolve(argv[++index] ?? '');
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.output) throw new Error('Output path is required');
  return options;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function assertReleaseApproval(approvalPath, gateContract) {
  if (!approvalPath) {
    throw new Error('Enabled submission requires --release-approval');
  }
  if (!fs.existsSync(approvalPath)) {
    throw new Error('Release approval file does not exist');
  }

  const approval = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
  if (approval.schemaVersion !== 'bsti-production-release-approval-v0.1') {
    throw new Error('Release approval schema version is invalid');
  }
  if (approval.approvedDomain !== gateContract.canonical.domain) {
    throw new Error('Release approval domain is invalid');
  }
  if (!approval.approvedBy || String(approval.approvedBy).includes('REPLACE_')) {
    throw new Error('Release approver is missing');
  }

  const approvedAt = Date.parse(approval.approvedAt);
  const expiresAt = Date.parse(approval.expiresAt);
  const now = Date.now();
  if (!Number.isFinite(approvedAt) || approvedAt > now) {
    throw new Error('Release approval time is invalid');
  }
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error('Release approval is expired or invalid');
  }

  for (const gateId of gateContract.requiredGateIds) {
    if (approval.gates?.[gateId] !== true) {
      throw new Error(`Launch gate is not approved: ${gateId}`);
    }
  }
}

function buildRuntimeConfig(submissionEnabled) {
  return `window.__BSTI_RUNTIME_CONFIG__ = Object.freeze({\n  environment: 'production-ready',\n  submissionEnabled: ${submissionEnabled},\n  apiBasePath: '/api'\n});\n`;
}

const originalSubmitFunction = `      function submitAssessment() {\n        const result = scoreAssessment(instrument, state.answers);\n        const report = buildReportViewModel(instrument, result);\n        dispatch({ type: 'SET_RESULT', result: { result, report } });\n        history.replaceState(null, '', createReportContinuationHash(\n          instrument.version,\n          state.assessmentProfile.businessUnit,\n          state.answers\n        ));\n      }`;

const packagedSubmitFunction = `      function submitAssessment() {\n        const preparedSubmission = window.BSTISubmission.prepareSubmission(instrument, state);\n        const result = scoreAssessment(instrument, state.answers);\n        const report = buildReportViewModel(instrument, result);\n        dispatch({ type: 'SET_RESULT', result: { result, report } });\n        history.replaceState(null, '', createReportContinuationHash(\n          instrument.version,\n          state.assessmentProfile.businessUnit,\n          state.answers\n        ));\n        window.BSTISubmission.submitPrepared(preparedSubmission);\n      }`;

function packageIndex(source) {
  if (!source.includes(originalSubmitFunction)) {
    throw new Error('Source submitAssessment contract no longer matches');
  }
  const withSubmission = source.replace(originalSubmitFunction, packagedSubmitFunction);
  const moduleMarker = '<script type="module">';
  if (!withSubmission.includes(moduleMarker)) {
    throw new Error('Source module script marker is missing');
  }
  return withSubmission.replace(
    moduleMarker,
    '<script src="./runtime-config.js"></script><script src="./submission-client.js"></script>' + moduleMarker
  );
}

function copyFile(sourceName, outputDirectory) {
  fs.copyFileSync(path.join(repoRoot, sourceName), path.join(outputDirectory, sourceName));
}

const options = parseArgs(process.argv.slice(2));
const gateContract = readJson('platform/contracts/production-launch-gates.v0.1.json');

if (options.enableSubmission) {
  assertReleaseApproval(options.releaseApproval, gateContract);
}

const bstiOutput = path.join(options.output, 'bsti');
fs.rmSync(options.output, { recursive: true, force: true });
fs.mkdirSync(bstiOutput, { recursive: true });

const sourceIndex = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
fs.writeFileSync(path.join(bstiOutput, 'index.html'), packageIndex(sourceIndex));
copyFile('privacy.html', bstiOutput);
copyFile('report-usage.html', bstiOutput);
fs.copyFileSync(
  path.join(repoRoot, 'production/submission-client.js'),
  path.join(bstiOutput, 'submission-client.js')
);
fs.writeFileSync(
  path.join(bstiOutput, 'runtime-config.js'),
  buildRuntimeConfig(options.enableSubmission)
);

const manifest = {
  schemaVersion: 'bsti-deployment-manifest-v0.1',
  sourceCommit: options.sourceCommit,
  builtAt: new Date().toISOString(),
  canonicalDomain: gateContract.canonical.domain,
  bstiPath: gateContract.canonical.bstiPath,
  apiPath: gateContract.canonical.apiPath,
  submissionEnabled: options.enableSubmission,
  bstiVersion: 'V0.4.3',
  bstmVersion: 'V0.4.4.1',
  privacyVersion: 'BSTI_PRIVACY_V0.1',
  reportUsageVersion: 'BSTI_REPORT_USAGE_V0.1',
  launchGateContractVersion: gateContract.schemaVersion
};
fs.writeFileSync(
  path.join(options.output, 'deployment-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`BSTI production package created at ${options.output}`);
