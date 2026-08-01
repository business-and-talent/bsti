ALTER TABLE assessments
  ADD COLUMN submission_fingerprint CHAR(64)
    CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    AFTER instrument_version,
  ADD CONSTRAINT chk_assessments_submission_fingerprint
    CHECK (submission_fingerprint REGEXP '^[0-9a-f]{64}$');
