import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryPath = path.join(root, 'backend/functions/bsti-api/src/assessment-repository.js');
const servicePath = path.join(root, 'backend/functions/bsti-api/src/assessment-submission-service.js');

assert.equal(fs.existsSync(repositoryPath), true, 'Assessment repository module is missing');
assert.equal(fs.existsSync(servicePath), true, 'Assessment submission service module is missing');

const { createAssessmentRepository } = await import(`file://${repositoryPath}`);
const { createAssessmentSubmissionService } = await import(`file://${servicePath}`);

function normalizedSubmission() {
  return {
    schemaVersion: 'bsti-assessment-submission-v1',
    assessmentId: '550e8400-e29b-41d4-a716-446655440000',
    instrument: { id: 'BSTI-40', version: 'V0.4.3' },
    profile: {
      displayName: '测试用户',
      businessUnit: '测试企业',
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
    answers: Array.from({ length: 40 }, (_, index) => ({ itemId: index + 1, value: 3 }))
  };
}

function createFakePool({ failAt, duplicateRow } = {}) {
  const events = [];
  let executeCount = 0;
  const connection = {
    async beginTransaction() {
      events.push({ type: 'begin' });
    },
    async execute(sql, params = []) {
      executeCount += 1;
      events.push({ type: 'execute', sql, params });
      if (executeCount === failAt) {
        const error = new Error('seeded database failure');
        error.code = 'SEEDED_FAILURE';
        throw error;
      }
      if (executeCount === 1 && duplicateRow) {
        const error = new Error('duplicate key');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      if (/^SELECT\s+/i.test(sql.trim())) {
        return [[duplicateRow].filter(Boolean), []];
      }
      if (/^UPDATE\s+assessments/i.test(sql.trim())) {
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 1 }, []];
    },
    async commit() {
      events.push({ type: 'commit' });
    },
    async rollback() {
      events.push({ type: 'rollback' });
    },
    release() {
      events.push({ type: 'release' });
    }
  };
  return {
    events,
    async getConnection() {
      events.push({ type: 'getConnection' });
      return connection;
    }
  };
}

const submission = normalizedSubmission();
const fingerprint = 'a'.repeat(64);
const now = new Date('2026-08-02T00:00:00.000Z');

const successPool = createFakePool();
const successRepository = createAssessmentRepository(successPool);
const success = await successRepository.submit({ submission, fingerprint, now });
assert.deepEqual(success, {
  kind: 'created',
  assessmentId: submission.assessmentId,
  submittedAt: '2026-08-02T00:00:00.000Z'
});
assert.deepEqual(
  successPool.events.filter(({ type }) => type !== 'execute').map(({ type }) => type),
  ['getConnection', 'begin', 'commit', 'release']
);

const statements = successPool.events.filter(({ type }) => type === 'execute');
assert.equal(statements.length, 5);
assert.match(statements[0].sql, /^INSERT\s+INTO\s+assessments/i);
assert.match(statements[1].sql, /^INSERT\s+INTO\s+assessment_profile_snapshots/i);
assert.match(statements[2].sql, /^INSERT\s+INTO\s+assessment_answers/i);
assert.match(statements[3].sql, /^INSERT\s+INTO\s+assessment_research_consents/i);
assert.match(statements[4].sql, /^UPDATE\s+assessments/i);
assert.equal(statements[2].params.length, 40 * 5);
assert.equal(statements[2].sql.includes('测试用户'), false);
assert.equal(statements[2].sql.includes('测试企业'), false);
assert.equal(statements[2].sql.toLowerCase().includes('score'), false);
assert.equal(statements[2].sql.toLowerCase().includes('report'), false);
assert.equal(statements[3].params.includes('not_granted'), true);

for (const failAt of [1, 2, 3, 4, 5]) {
  const pool = createFakePool({ failAt });
  const repository = createAssessmentRepository(pool);
  await assert.rejects(
    repository.submit({ submission, fingerprint, now }),
    /Assessment persistence failed/
  );
  assert.equal(pool.events.some(({ type }) => type === 'rollback'), true, `missing rollback at ${failAt}`);
  assert.equal(pool.events.some(({ type }) => type === 'commit'), false, `unexpected commit at ${failAt}`);
  assert.equal(pool.events.at(-1).type, 'release');
}

const replayPool = createFakePool({
  duplicateRow: {
    id: submission.assessmentId,
    status: 'submitted',
    submitted_at: new Date('2026-08-02T00:00:00.000Z'),
    submission_fingerprint: fingerprint
  }
});
const replay = await createAssessmentRepository(replayPool).submit({ submission, fingerprint, now });
assert.deepEqual(replay, {
  kind: 'replayed',
  assessmentId: submission.assessmentId,
  submittedAt: '2026-08-02T00:00:00.000Z'
});
assert.equal(replayPool.events.some(({ type }) => type === 'rollback'), true);
assert.equal(replayPool.events.some(({ type }) => type === 'commit'), false);
assert.equal(replayPool.events.filter(({ type }) => type === 'execute').length, 2);

const conflictPool = createFakePool({
  duplicateRow: {
    id: submission.assessmentId,
    status: 'submitted',
    submitted_at: new Date('2026-08-02T00:00:00.000Z'),
    submission_fingerprint: 'b'.repeat(64)
  }
});
const conflict = await createAssessmentRepository(conflictPool).submit({ submission, fingerprint, now });
assert.deepEqual(conflict, { kind: 'conflict' });

const draftConflictPool = createFakePool({
  duplicateRow: {
    id: submission.assessmentId,
    status: 'draft',
    submitted_at: null,
    submission_fingerprint: fingerprint
  }
});
assert.deepEqual(
  await createAssessmentRepository(draftConflictPool).submit({ submission, fingerprint, now }),
  { kind: 'conflict' }
);

let receivedRepositoryInput = null;
const service = createAssessmentSubmissionService({
  async submit(input) {
    receivedRepositoryInput = input;
    return {
      kind: 'created',
      assessmentId: input.submission.assessmentId,
      submittedAt: input.now.toISOString()
    };
  }
}, {
  clock: () => new Date('2026-08-02T00:00:00.000Z')
});
const serviceResult = await service.submit({
  ...submission,
  profile: { ...submission.profile, displayName: ' 测试用户 ' }
});
assert.equal(serviceResult.kind, 'created');
assert.equal(receivedRepositoryInput.submission.profile.displayName, '测试用户');
assert.match(receivedRepositoryInput.fingerprint, /^[0-9a-f]{64}$/);
assert.equal(receivedRepositoryInput.now.toISOString(), '2026-08-02T00:00:00.000Z');

const invalidServiceResult = await service.submit({ ...submission, answers: [] });
assert.equal(invalidServiceResult.kind, 'invalid');
assert.equal(receivedRepositoryInput.submission.answers.length, 40);

console.log('Assessment repository transaction contract: PASS');
