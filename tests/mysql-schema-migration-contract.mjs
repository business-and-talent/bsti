import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'backend/database/migrations');
const upPath = path.join(migrationsDir, '0001_initial_bsti_schema.up.sql');
const downPath = path.join(migrationsDir, '0001_initial_bsti_schema.down.sql');
const contractPath = path.join(root, 'platform/contracts/p0-data-model.v0.1.json');
const capabilitiesPath = path.join(root, 'backend/functions/bsti-api/src/capabilities.js');
const frozenBoundariesPath = path.join(root, 'platform/contracts/frozen-boundaries.v0.1.json');

assert.equal(fs.existsSync(upPath), true, 'Initial MySQL up migration is missing');
assert.equal(fs.existsSync(downPath), true, 'Initial MySQL down migration is missing');
assert.equal(fs.existsSync(contractPath), true, 'P0 data-model contract is missing');

const up = fs.readFileSync(upPath, 'utf8');
const down = fs.readFileSync(downPath, 'utf8');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const capabilities = fs.readFileSync(capabilitiesPath, 'utf8');
const frozenBoundaries = JSON.parse(fs.readFileSync(frozenBoundariesPath, 'utf8'));

assert.deepEqual(contract, {
  schemaVersion: 'p0-data-model-v0.1',
  database: {
    engine: 'mysql',
    majorVersion: 8,
    storageEngine: 'InnoDB',
    characterSet: 'utf8mb4',
    timestampPrecision: 3,
    timestampsUtc: true,
    uuidStorage: 'CHAR(36)'
  },
  tables: [
    'schema_migrations',
    'assessments',
    'assessment_profile_snapshots',
    'assessment_answers',
    'assessment_research_consents'
  ],
  assessment: {
    instrumentId: 'BSTI-40',
    instrumentVersion: 'V0.4.3',
    statuses: ['draft', 'submitted', 'voided'],
    submittedImmutable: true,
    voidedTerminal: true,
    retakeCreatesNewAssessment: true
  },
  answers: {
    authoritativeRepresentation: 'one-row-per-item',
    itemIdMinimum: 1,
    itemIdMaximum: 40,
    answerMinimum: 1,
    answerMaximum: 5,
    jsonCopyAllowed: false
  },
  profileSnapshot: {
    oneToOne: true,
    identifyingFieldsSeparatelyGoverned: true,
    anonymizationAuditRequired: true,
    scoringInput: false,
    contextOnlyFields: ['revenueBand', 'headcountBand']
  },
  research: {
    independentConsent: true,
    defaultStatus: 'not_granted',
    statuses: ['not_granted', 'granted', 'withdrawn'],
    pipelineImplemented: false,
    operationalAssessmentIdExportable: false,
    reversibleMappingAllowed: false,
    voidedEligible: false
  },
  identity: {
    personMaster: false,
    organizationMaster: false,
    customerMaster: false,
    accountMaster: false,
    tenantMaster: false,
    crossAssessmentResolution: false
  },
  runtimeCapabilitiesRemainDisabled: [
    'assessmentSubmission',
    'persistence',
    'backendScoring',
    'backendReportCompilation'
  ],
  forbiddenDatabaseResponsibilities: [
    'scoring',
    'quadrantTotals',
    'focusRouting',
    'reportCompilation',
    'researchExport',
    'modelTraining'
  ]
});

for (const table of contract.tables) {
  assert.match(up, new RegExp(`CREATE\\s+TABLE\\s+${table}\\b`, 'i'), `Missing table ${table}`);
}

assert.equal((up.match(/ENGINE\s*=\s*InnoDB/gi) ?? []).length, 5, 'Every table must use InnoDB');
assert.equal((up.match(/DEFAULT\s+CHARSET\s*=\s*utf8mb4/gi) ?? []).length, 5, 'Every table must use utf8mb4');
assert.ok((up.match(/DATETIME\(3\)/g) ?? []).length >= 15, 'Millisecond timestamps must use DATETIME(3)');
assert.match(up, /CHECK\s*\(\s*item_id\s+BETWEEN\s+1\s+AND\s+40\s*\)/i);
assert.match(up, /CHECK\s*\(\s*answer_value\s+BETWEEN\s+1\s+AND\s+5\s*\)/i);
assert.match(up, /PRIMARY\s+KEY\s*\(\s*assessment_id\s*,\s*item_id\s*\)/i);
assert.match(up, /CREATE\s+TABLE\s+assessment_profile_snapshots[\s\S]*?PRIMARY\s+KEY\s*\(\s*assessment_id\s*\)/i);
assert.match(up, /CREATE\s+TABLE\s+assessment_research_consents[\s\S]*?PRIMARY\s+KEY\s*\(\s*assessment_id\s*\)/i);
assert.match(up, /status\s+VARCHAR\([^)]*\)[\s\S]*?CHECK\s*\([\s\S]*?'draft'[\s\S]*?'submitted'[\s\S]*?'voided'/i);
assert.match(up, /consent_status\s+VARCHAR\([^)]*\)[\s\S]*?CHECK\s*\([\s\S]*?'not_granted'[\s\S]*?'granted'[\s\S]*?'withdrawn'/i);
assert.equal((up.match(/ON\s+DELETE\s+RESTRICT\s+ON\s+UPDATE\s+RESTRICT/gi) ?? []).length, 3, 'All three foreign keys must restrict deletion and update');
assert.match(up, /anonymized_at\s+DATETIME\(3\)/i);
assert.match(up, /anonymization_reason_code/i);
assert.match(up, /anonymized_by_actor_type/i);
assert.match(up, /anonymized_by_actor_reference/i);

const requiredConstraintNames = [
  'chk_schema_migrations_checksum',
  'chk_assessments_status',
  'chk_assessments_instrument',
  'chk_assessments_started_before_submission',
  'chk_assessments_lifecycle',
  'chk_profile_snapshots_marketing_consent',
  'chk_profile_snapshots_identity_state',
  'chk_assessment_answers_item_id',
  'chk_assessment_answers_value',
  'chk_research_consents_status',
  'chk_research_consents_lifecycle'
];
for (const constraintName of requiredConstraintNames) {
  assert.match(up, new RegExp(`CONSTRAINT\\s+${constraintName}\\b`, 'i'), `Missing constraint ${constraintName}`);
}

const requiredIndexNames = [
  'uq_schema_migrations_filename',
  'idx_assessments_status_created_at',
  'idx_assessments_submitted_at',
  'idx_profile_snapshots_industry_code',
  'idx_profile_snapshots_revenue_band',
  'idx_profile_snapshots_headcount_band',
  'idx_assessment_answers_item_id',
  'idx_research_consents_status'
];
for (const indexName of requiredIndexNames) {
  assert.match(up, new RegExp(`\\b${indexName}\\b`, 'i'), `Missing index ${indexName}`);
}

const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
assert.deepEqual(migrationFiles, [
  '0001_initial_bsti_schema.down.sql',
  '0001_initial_bsti_schema.up.sql'
]);

const dropOrder = [
  'assessment_research_consents',
  'assessment_answers',
  'assessment_profile_snapshots',
  'assessments',
  'schema_migrations'
];
let priorIndex = -1;
for (const table of dropOrder) {
  const index = down.search(new RegExp(`DROP\\s+TABLE\\s+IF\\s+EXISTS\\s+${table}\\b`, 'i'));
  assert.ok(index > priorIndex, `${table} must be dropped in reverse dependency order`);
  priorIndex = index;
}

const forbiddenSqlPatterns = [
  /CREATE\s+TRIGGER/i,
  /CREATE\s+PROCEDURE/i,
  /CREATE\s+EVENT/i,
  /answers_json/i,
  /quadrant_score/i,
  /focus_group/i,
  /report_html/i,
  /report_json/i,
  /CREATE\s+TABLE\s+(persons?|organizations?|customers?|accounts?|tenants?)\b/i
];
for (const pattern of forbiddenSqlPatterns) {
  assert.doesNotMatch(up, pattern);
}

const secretPatterns = [
  /cloudbase-[a-z0-9-]+/i,
  /tencentdb/i,
  /mysql:\/\//i,
  /password\s*=/i,
  /PRIVATE KEY/i,
  /10\.\d+\.\d+\.\d+/
];
for (const pattern of secretPatterns) {
  assert.doesNotMatch(`${up}\n${down}\n${JSON.stringify(contract)}`, pattern);
}

assert.equal(frozenBoundaries.instrument.id, 'BSTI-40');
assert.equal(frozenBoundaries.instrument.version, 'V0.4.3');
assert.equal(frozenBoundaries.report.rulesVersion, 'V0.4.4.1');
assert.equal(frozenBoundaries.report.authoritativeCompiler, 'browser');
assert.deepEqual(frozenBoundaries.scoreInputs, ['answers']);
assert.deepEqual(frozenBoundaries.contextOnlyInputs, ['revenueBand', 'headcountBand']);

for (const capability of contract.runtimeCapabilitiesRemainDisabled) {
  assert.match(capabilities, new RegExp(`${capability}: false`), `${capability} must remain disabled`);
}

console.log('MySQL schema and migration contract: PASS');
