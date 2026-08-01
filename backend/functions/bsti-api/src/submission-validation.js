import {
  HEADCOUNT_BANDS,
  INDUSTRY_CODES,
  INSTRUMENT_ID,
  INSTRUMENT_VERSION,
  MARKETING_VERSION,
  REPORT_PROCESSING_VERSION,
  REPORT_USAGE_VERSION,
  REVENUE_BANDS,
  ROLE_CODES,
  SUBMISSION_SCHEMA_VERSION
} from './submission-contract.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_ISSUES = 32;

const ROOT_KEYS = ['schemaVersion', 'assessmentId', 'instrument', 'profile', 'consents', 'answers'];
const INSTRUMENT_KEYS = ['id', 'version'];
const PROFILE_KEYS = [
  'displayName',
  'businessUnit',
  'roleCode',
  'roleOther',
  'revenueBand',
  'headcountBand',
  'industryCode',
  'industryOther'
];
const CONSENT_KEYS = [
  'reportProcessing',
  'reportProcessingVersion',
  'reportUsageVersion',
  'marketing',
  'marketingVersion'
];
const ANSWER_KEYS = ['itemId', 'value'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function createCollector() {
  const issues = [];
  return {
    add(path, code) {
      if (issues.length < MAX_ISSUES) {
        issues.push({ path, code });
      }
    },
    issues
  };
}

function rejectUnknownKeys(value, allowedKeys, path, collector) {
  if (!isPlainObject(value)) return;
  const allowed = new Set(allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    collector.add(path, 'unknown_field');
  }
}

function exactString(value, expected, path, collector) {
  if (typeof value !== 'string' || value !== expected) {
    collector.add(path, 'unsupported');
    return expected;
  }
  return value;
}

function requiredString(value, path, collector, maxLength) {
  if (typeof value !== 'string') {
    collector.add(path, 'type');
    return '';
  }
  const normalized = value.trim();
  if (!normalized) {
    collector.add(path, 'required');
  } else if (normalized.length > maxLength) {
    collector.add(path, 'too_long');
  }
  return normalized;
}

function optionalString(value, path, collector, maxLength) {
  if (typeof value !== 'string') {
    collector.add(path, 'type');
    return '';
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    collector.add(path, 'too_long');
  }
  return normalized;
}

function enumString(value, allowedValues, path, collector) {
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    collector.add(path, 'unsupported');
    return '';
  }
  return value;
}

function validateInstrument(value, collector) {
  if (!isPlainObject(value)) {
    collector.add('instrument', 'type');
    return { id: INSTRUMENT_ID, version: INSTRUMENT_VERSION };
  }
  rejectUnknownKeys(value, INSTRUMENT_KEYS, 'instrument', collector);
  return {
    id: exactString(value.id, INSTRUMENT_ID, 'instrument.id', collector),
    version: exactString(value.version, INSTRUMENT_VERSION, 'instrument.version', collector)
  };
}

function validateProfile(value, collector) {
  if (!isPlainObject(value)) {
    collector.add('profile', 'type');
    return {
      displayName: '',
      businessUnit: '',
      roleCode: '',
      roleOther: '',
      revenueBand: '',
      headcountBand: '',
      industryCode: '',
      industryOther: ''
    };
  }

  rejectUnknownKeys(value, PROFILE_KEYS, 'profile', collector);
  const roleCode = enumString(value.roleCode, ROLE_CODES, 'profile.roleCode', collector);
  const roleOther = optionalString(value.roleOther, 'profile.roleOther', collector, 120);
  const industryCode = enumString(value.industryCode, INDUSTRY_CODES, 'profile.industryCode', collector);
  const industryOther = optionalString(value.industryOther, 'profile.industryOther', collector, 255);

  if (roleCode === 'other' && !roleOther) {
    collector.add('profile.roleOther', 'required');
  } else if (roleCode && roleCode !== 'other' && roleOther) {
    collector.add('profile.roleOther', 'must_be_empty');
  }

  if (industryCode === 'other' && !industryOther) {
    collector.add('profile.industryOther', 'required');
  } else if (industryCode && industryCode !== 'other' && industryOther) {
    collector.add('profile.industryOther', 'must_be_empty');
  }

  return {
    displayName: requiredString(value.displayName, 'profile.displayName', collector, 128),
    businessUnit: requiredString(value.businessUnit, 'profile.businessUnit', collector, 255),
    roleCode,
    roleOther,
    revenueBand: enumString(value.revenueBand, REVENUE_BANDS, 'profile.revenueBand', collector),
    headcountBand: enumString(value.headcountBand, HEADCOUNT_BANDS, 'profile.headcountBand', collector),
    industryCode,
    industryOther
  };
}

function validateConsents(value, collector) {
  if (!isPlainObject(value)) {
    collector.add('consents', 'type');
    return {
      reportProcessing: false,
      reportProcessingVersion: REPORT_PROCESSING_VERSION,
      reportUsageVersion: REPORT_USAGE_VERSION,
      marketing: false,
      marketingVersion: null
    };
  }

  rejectUnknownKeys(value, CONSENT_KEYS, 'consents', collector);

  if (value.reportProcessing !== true) {
    collector.add('consents.reportProcessing', 'required_true');
  }

  const reportProcessingVersion = exactString(
    value.reportProcessingVersion,
    REPORT_PROCESSING_VERSION,
    'consents.reportProcessingVersion',
    collector
  );
  const reportUsageVersion = exactString(
    value.reportUsageVersion,
    REPORT_USAGE_VERSION,
    'consents.reportUsageVersion',
    collector
  );

  let marketing = false;
  if (typeof value.marketing !== 'boolean') {
    collector.add('consents.marketing', 'type');
  } else {
    marketing = value.marketing;
  }

  let marketingVersion = null;
  if (marketing) {
    if (value.marketingVersion === null || value.marketingVersion === undefined || value.marketingVersion === '') {
      collector.add('consents.marketingVersion', 'required');
    } else if (value.marketingVersion !== MARKETING_VERSION) {
      collector.add('consents.marketingVersion', 'unsupported');
    } else {
      marketingVersion = MARKETING_VERSION;
    }
  } else if (value.marketingVersion !== null) {
    collector.add('consents.marketingVersion', 'must_be_null');
  }

  return {
    reportProcessing: value.reportProcessing === true,
    reportProcessingVersion,
    reportUsageVersion,
    marketing,
    marketingVersion
  };
}

function validateAnswers(value, collector) {
  if (!Array.isArray(value)) {
    collector.add('answers', 'type');
    return [];
  }

  if (value.length !== 40) {
    collector.add('answers', 'complete_40');
  }

  const seen = new Set();
  let duplicateFound = false;
  const normalized = value.map((answer, index) => {
    const path = `answers[${index}]`;
    if (!isPlainObject(answer)) {
      collector.add(path, 'type');
      return { itemId: 0, value: 0 };
    }

    rejectUnknownKeys(answer, ANSWER_KEYS, path, collector);

    let itemId = 0;
    if (!Number.isInteger(answer.itemId)) {
      collector.add(`${path}.itemId`, 'integer');
    } else {
      itemId = answer.itemId;
      if (itemId < 1 || itemId > 40) {
        collector.add(`${path}.itemId`, 'range');
      } else if (seen.has(itemId)) {
        duplicateFound = true;
      } else {
        seen.add(itemId);
      }
    }

    let answerValue = 0;
    if (!Number.isInteger(answer.value)) {
      collector.add(`${path}.value`, 'integer');
    } else {
      answerValue = answer.value;
      if (answerValue < 1 || answerValue > 5) {
        collector.add(`${path}.value`, 'range');
      }
    }

    return { itemId, value: answerValue };
  });

  if (duplicateFound) {
    collector.add('answers', 'duplicate_item');
  }

  normalized.sort((left, right) => left.itemId - right.itemId);
  return normalized;
}

export function validateAndNormalizeSubmission(value) {
  const collector = createCollector();
  if (!isPlainObject(value)) {
    return { ok: false, issues: [{ path: '$', code: 'type' }] };
  }

  rejectUnknownKeys(value, ROOT_KEYS, '$', collector);
  const schemaVersion = exactString(
    value.schemaVersion,
    SUBMISSION_SCHEMA_VERSION,
    'schemaVersion',
    collector
  );

  let assessmentId = '';
  if (typeof value.assessmentId !== 'string' || !UUID_V4.test(value.assessmentId)) {
    collector.add('assessmentId', 'uuid_v4');
  } else {
    assessmentId = value.assessmentId;
  }

  const submission = {
    schemaVersion,
    assessmentId,
    instrument: validateInstrument(value.instrument, collector),
    profile: validateProfile(value.profile, collector),
    consents: validateConsents(value.consents, collector),
    answers: validateAnswers(value.answers, collector)
  };

  if (collector.issues.length > 0) {
    return { ok: false, issues: collector.issues };
  }

  return { ok: true, submission };
}
