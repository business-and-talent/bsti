ALTER TABLE assessments
  DROP CHECK chk_assessments_submission_fingerprint,
  DROP COLUMN submission_fingerprint;
