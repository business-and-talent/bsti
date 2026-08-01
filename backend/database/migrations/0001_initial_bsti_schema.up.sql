CREATE TABLE schema_migrations (
  version VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  filename VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  checksum_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  applied_at DATETIME(3) NOT NULL,
  PRIMARY KEY (version),
  UNIQUE KEY uq_schema_migrations_filename (filename),
  CONSTRAINT chk_schema_migrations_checksum
    CHECK (checksum_sha256 REGEXP '^[0-9a-f]{64}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessments (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  instrument_id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  instrument_version VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  started_at DATETIME(3) NOT NULL,
  submitted_at DATETIME(3) NULL,
  voided_at DATETIME(3) NULL,
  void_reason_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  voided_by_actor_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  voided_by_actor_reference VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_assessments_status_created_at (status, created_at),
  KEY idx_assessments_submitted_at (submitted_at),
  CONSTRAINT chk_assessments_status
    CHECK (status IN ('draft', 'submitted', 'voided')),
  CONSTRAINT chk_assessments_instrument
    CHECK (instrument_id = 'BSTI-40' AND instrument_version = 'V0.4.3'),
  CONSTRAINT chk_assessments_started_before_submission
    CHECK (submitted_at IS NULL OR started_at <= submitted_at),
  CONSTRAINT chk_assessments_lifecycle
    CHECK (
      (
        status = 'draft'
        AND submitted_at IS NULL
        AND voided_at IS NULL
        AND void_reason_code IS NULL
        AND voided_by_actor_type IS NULL
        AND voided_by_actor_reference IS NULL
      )
      OR
      (
        status = 'submitted'
        AND submitted_at IS NOT NULL
        AND voided_at IS NULL
        AND void_reason_code IS NULL
        AND voided_by_actor_type IS NULL
        AND voided_by_actor_reference IS NULL
      )
      OR
      (
        status = 'voided'
        AND submitted_at IS NOT NULL
        AND voided_at IS NOT NULL
        AND void_reason_code IS NOT NULL
        AND voided_by_actor_type IS NOT NULL
        AND voided_by_actor_reference IS NOT NULL
        AND voided_at >= submitted_at
      )
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessment_profile_snapshots (
  assessment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_name VARCHAR(128) NULL,
  business_entity_name VARCHAR(255) NULL,
  current_role VARCHAR(128) NULL,
  industry_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  industry_other_text VARCHAR(255) NULL,
  revenue_band VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  headcount_band VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  privacy_notice_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  report_usage_notice_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  report_processing_consent_at DATETIME(3) NOT NULL,
  marketing_consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent_text_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  marketing_consent_at DATETIME(3) NULL,
  anonymized_at DATETIME(3) NULL,
  anonymization_reason_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  anonymized_by_actor_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  anonymized_by_actor_reference VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (assessment_id),
  KEY idx_profile_snapshots_industry_code (industry_code),
  KEY idx_profile_snapshots_revenue_band (revenue_band),
  KEY idx_profile_snapshots_headcount_band (headcount_band),
  CONSTRAINT fk_profile_snapshots_assessment
    FOREIGN KEY (assessment_id) REFERENCES assessments (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_profile_snapshots_marketing_consent
    CHECK (
      (
        marketing_consent_granted = FALSE
        AND marketing_consent_text_version IS NULL
        AND marketing_consent_at IS NULL
      )
      OR
      (
        marketing_consent_granted = TRUE
        AND marketing_consent_text_version IS NOT NULL
        AND marketing_consent_at IS NOT NULL
      )
    ),
  CONSTRAINT chk_profile_snapshots_identity_state
    CHECK (
      (
        anonymized_at IS NULL
        AND anonymization_reason_code IS NULL
        AND anonymized_by_actor_type IS NULL
        AND anonymized_by_actor_reference IS NULL
        AND display_name IS NOT NULL
        AND CHAR_LENGTH(TRIM(display_name)) > 0
        AND business_entity_name IS NOT NULL
        AND CHAR_LENGTH(TRIM(business_entity_name)) > 0
        AND current_role IS NOT NULL
        AND CHAR_LENGTH(TRIM(current_role)) > 0
        AND industry_code IS NOT NULL
        AND revenue_band IS NOT NULL
        AND headcount_band IS NOT NULL
        AND (
          (
            industry_code = 'other'
            AND industry_other_text IS NOT NULL
            AND CHAR_LENGTH(TRIM(industry_other_text)) > 0
          )
          OR
          (
            industry_code <> 'other'
            AND industry_other_text IS NULL
          )
        )
      )
      OR
      (
        anonymized_at IS NOT NULL
        AND anonymization_reason_code IS NOT NULL
        AND anonymized_by_actor_type IS NOT NULL
        AND anonymized_by_actor_reference IS NOT NULL
        AND display_name IS NULL
        AND business_entity_name IS NULL
        AND current_role IS NULL
        AND industry_code IS NULL
        AND industry_other_text IS NULL
        AND revenue_band IS NULL
        AND headcount_band IS NULL
      )
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessment_answers (
  assessment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  item_id TINYINT UNSIGNED NOT NULL,
  answer_value TINYINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (assessment_id, item_id),
  KEY idx_assessment_answers_item_id (item_id, answer_value),
  CONSTRAINT fk_assessment_answers_assessment
    FOREIGN KEY (assessment_id) REFERENCES assessments (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_assessment_answers_item_id
    CHECK (item_id BETWEEN 1 AND 40),
  CONSTRAINT chk_assessment_answers_value
    CHECK (answer_value BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assessment_research_consents (
  assessment_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  consent_status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'not_granted',
  consent_text_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  granted_at DATETIME(3) NULL,
  withdrawn_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (assessment_id),
  KEY idx_research_consents_status (consent_status, updated_at),
  CONSTRAINT fk_research_consents_assessment
    FOREIGN KEY (assessment_id) REFERENCES assessments (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_research_consents_status
    CHECK (consent_status IN ('not_granted', 'granted', 'withdrawn')),
  CONSTRAINT chk_research_consents_lifecycle
    CHECK (
      (
        consent_status = 'not_granted'
        AND consent_text_version IS NULL
        AND granted_at IS NULL
        AND withdrawn_at IS NULL
      )
      OR
      (
        consent_status = 'granted'
        AND consent_text_version IS NOT NULL
        AND granted_at IS NOT NULL
        AND withdrawn_at IS NULL
      )
      OR
      (
        consent_status = 'withdrawn'
        AND consent_text_version IS NOT NULL
        AND granted_at IS NOT NULL
        AND withdrawn_at IS NOT NULL
        AND withdrawn_at >= granted_at
      )
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
