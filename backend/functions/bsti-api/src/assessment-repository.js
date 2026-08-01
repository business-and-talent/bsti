export class AssessmentPersistenceError extends Error {
  constructor(cause) {
    super('Assessment persistence failed', { cause });
    this.name = 'AssessmentPersistenceError';
  }
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function currentRole(profile) {
  return profile.roleCode === 'other'
    ? `other:${profile.roleOther}`
    : profile.roleCode;
}

async function findExisting(connection, assessmentId) {
  const [rows] = await connection.execute(
    'SELECT id, status, submitted_at, submission_fingerprint FROM assessments WHERE id = ?',
    [assessmentId]
  );
  return rows[0] ?? null;
}

function replayOutcome(existing, fingerprint) {
  if (
    existing
    && existing.status === 'submitted'
    && existing.submission_fingerprint === fingerprint
    && existing.submitted_at
  ) {
    return {
      kind: 'replayed',
      assessmentId: existing.id,
      submittedAt: toIso(existing.submitted_at)
    };
  }
  return { kind: 'conflict' };
}

export function createAssessmentRepository(pool) {
  return Object.freeze({
    async submit({ submission, fingerprint, now }) {
      const connection = await pool.getConnection();
      let transactionOpen = false;

      try {
        await connection.beginTransaction();
        transactionOpen = true;

        try {
          await connection.execute(
            'INSERT INTO assessments (id, instrument_id, instrument_version, submission_fingerprint, status, started_at, submitted_at, voided_at, void_reason_code, voided_by_actor_type, voided_by_actor_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?)',
            [
              submission.assessmentId,
              submission.instrument.id,
              submission.instrument.version,
              fingerprint,
              'draft',
              now,
              now,
              now
            ]
          );
        } catch (error) {
          if (error?.code !== 'ER_DUP_ENTRY') throw error;
          await connection.rollback();
          transactionOpen = false;
          const existing = await findExisting(connection, submission.assessmentId);
          return replayOutcome(existing, fingerprint);
        }

        const marketingConsentAt = submission.consents.marketing ? now : null;
        await connection.execute(
          'INSERT INTO assessment_profile_snapshots (assessment_id, display_name, business_entity_name, current_role, industry_code, industry_other_text, revenue_band, headcount_band, privacy_notice_version, report_usage_notice_version, report_processing_consent_at, marketing_consent_granted, marketing_consent_text_version, marketing_consent_at, redacted_at, redaction_reason_code, redacted_by_actor_type, redacted_by_actor_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)',
          [
            submission.assessmentId,
            submission.profile.displayName,
            submission.profile.businessUnit,
            currentRole(submission.profile),
            submission.profile.industryCode,
            submission.profile.industryOther || null,
            submission.profile.revenueBand,
            submission.profile.headcountBand,
            submission.consents.reportProcessingVersion,
            submission.consents.reportUsageVersion,
            now,
            submission.consents.marketing,
            submission.consents.marketingVersion,
            marketingConsentAt,
            now,
            now
          ]
        );

        const answerPlaceholders = submission.answers.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const answerParams = submission.answers.flatMap(({ itemId, value }) => [
          submission.assessmentId,
          itemId,
          value,
          now,
          now
        ]);
        await connection.execute(
          `INSERT INTO assessment_answers (assessment_id, item_id, answer_value, created_at, updated_at) VALUES ${answerPlaceholders}`,
          answerParams
        );

        await connection.execute(
          'INSERT INTO assessment_research_consents (assessment_id, consent_status, consent_text_version, granted_at, withdrawn_at, created_at, updated_at) VALUES (?, ?, NULL, NULL, NULL, ?, ?)',
          [submission.assessmentId, 'not_granted', now, now]
        );

        const [updateResult] = await connection.execute(
          "UPDATE assessments SET status = 'submitted', submitted_at = ?, updated_at = ? WHERE id = ? AND status = 'draft'",
          [now, now, submission.assessmentId]
        );
        if (updateResult.affectedRows !== 1) {
          throw new Error('Draft transition did not update exactly one row');
        }

        await connection.commit();
        transactionOpen = false;
        return {
          kind: 'created',
          assessmentId: submission.assessmentId,
          submittedAt: toIso(now)
        };
      } catch (error) {
        if (transactionOpen) {
          try {
            await connection.rollback();
          } catch {
            // Preserve the original persistence failure.
          }
        }
        throw new AssessmentPersistenceError(error);
      } finally {
        connection.release();
      }
    }
  });
}
