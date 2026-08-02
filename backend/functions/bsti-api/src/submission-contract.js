export const SUBMISSION_SCHEMA_VERSION = 'bsti-assessment-submission-v1';
export const INSTRUMENT_ID = 'BSTI-40';
export const INSTRUMENT_VERSION = 'V0.4.3';
export const REPORT_PROCESSING_VERSION = 'BSTI_PRIVACY_V0.1';
export const REPORT_USAGE_VERSION = 'BSTI_REPORT_USAGE_V0.1';
export const MARKETING_VERSION = 'BSTI_MARKETING_V0.1';
export const MAX_REQUEST_BYTES = 64 * 1024;

export const ROLE_CODES = Object.freeze([
  'founder_controller',
  'owner_chair',
  'ceo_president_gm',
  'cofounder_partner',
  'business_unit_owner',
  'cxo_core_executive',
  'middle_manager',
  'professional_advisor',
  'other'
]);

export const REVENUE_BANDS = Object.freeze([
  'lt_10m_cny',
  '10m_30m_cny',
  '30m_100m_cny',
  '100m_300m_cny',
  '300m_1b_cny',
  'gte_1b_cny',
  'prefer_not_to_say'
]);

export const HEADCOUNT_BANDS = Object.freeze([
  'lt_10',
  '10_30',
  '30_100',
  '100_300',
  '300_1000',
  'gte_1000',
  'prefer_not_to_say'
]);

export const INDUSTRY_CODES = Object.freeze([
  'manufacturing',
  'retail_consumer',
  'food_hospitality',
  'technology_internet',
  'professional_services',
  'education_training',
  'healthcare',
  'finance_insurance',
  'construction_real_estate',
  'transport_logistics',
  'culture_media',
  'agriculture_food',
  'energy_environment',
  'other'
]);
