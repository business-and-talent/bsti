export function createInitialState() {
  return {
    view: 'gate',
    eligibility: {
      currentlyOperatingBusiness: false,
      participatesInKeyBusinessDecisions: false,
      canReferenceRecent6Months: false,
      usesConsistentBusinessReference: false
    },
    assessmentProfile: {
      displayName: '',
      businessUnit: '',
      roleCode: '',
      roleOther: '',
      revenueBand: '',
      headcountBand: '',
      industryCode: 'other',
      industryOther: '',
      profileVersion: 'BSTI_PROFILE_V0.1'
    },
    consents: {
      reportProcessing: false,
      marketing: false,
      reportProcessingVersion: 'BSTI_PRIVACY_V0.1',
      marketingVersion: 'BSTI_MARKETING_V0.1'
    },
    pageIndex: 0,
    answers: {},
    result: null
  };
}

export function isPageComplete(state, pages, pageIndex = state.pageIndex) {
  const page = pages[pageIndex] ?? [];
  return page.length > 0 && page.every((item) => Number.isInteger(state.answers[item.id]));
}

export function isAssessmentComplete(state, pages) {
  return pages.flat().every((item) => Number.isInteger(state.answers[item.id]));
}

export function completedCount(state) {
  return Object.keys(state.answers).length;
}

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validatePreAssessmentState(state) {
  const checks = [
    ['currentlyOperatingBusiness', state.eligibility.currentlyOperatingBusiness],
    ['participatesInKeyBusinessDecisions', state.eligibility.participatesInKeyBusinessDecisions],
    ['canReferenceRecent6Months', state.eligibility.canReferenceRecent6Months],
    ['usesConsistentBusinessReference', state.eligibility.usesConsistentBusinessReference],
    ['displayName', trimmed(state.assessmentProfile.displayName)],
    ['businessUnit', trimmed(state.assessmentProfile.businessUnit)],
    ['roleCode', trimmed(state.assessmentProfile.roleCode)],
    ['roleOther', state.assessmentProfile.roleCode !== 'other' || trimmed(state.assessmentProfile.roleOther)],
    ['revenueBand', trimmed(state.assessmentProfile.revenueBand)],
    ['headcountBand', trimmed(state.assessmentProfile.headcountBand)],
    ['industryOther', trimmed(state.assessmentProfile.industryOther)],
    ['reportProcessing', state.consents.reportProcessing]
  ];
  const invalid = checks.find(([, value]) => !value);
  return { valid: !invalid, firstInvalidField: invalid?.[0] ?? null };
}

function normalizedProfile(profile) {
  return {
    ...profile,
    displayName: trimmed(profile.displayName),
    businessUnit: trimmed(profile.businessUnit),
    roleOther: trimmed(profile.roleOther),
    industryOther: trimmed(profile.industryOther)
  };
}

export function reduceState(state, action, pages) {
  switch (action.type) {
    case 'SET_ELIGIBILITY':
      if (!(action.field in state.eligibility)) return state;
      return {
        ...state,
        eligibility: {
          ...state.eligibility,
          [action.field]: Boolean(action.value)
        }
      };
    case 'SET_PROFILE':
      if (!(action.field in state.assessmentProfile)) return state;
      return {
        ...state,
        assessmentProfile: {
          ...state.assessmentProfile,
          [action.field]: action.value ?? ''
        }
      };
    case 'SET_CONSENT':
      if (!['reportProcessing', 'marketing'].includes(action.field)) return state;
      return {
        ...state,
        consents: {
          ...state.consents,
          [action.field]: Boolean(action.value)
        }
      };
    case 'CONFIRM_PROFILE':
      if (!validatePreAssessmentState(state).valid) return state;
      return {
        ...state,
        assessmentProfile: normalizedProfile(state.assessmentProfile),
        view: 'intro'
      };
    case 'START_ASSESSMENT':
      return { ...state, view: 'assessment', pageIndex: 0 };
    case 'ANSWER':
      if (!Number.isInteger(action.value) || action.value < 1 || action.value > 5) return state;
      return { ...state, answers: { ...state.answers, [action.itemId]: action.value } };
    case 'NEXT_PAGE':
      if (!isPageComplete(state, pages)) return state;
      if (state.pageIndex >= pages.length - 1) return { ...state, view: 'review' };
      return { ...state, pageIndex: state.pageIndex + 1 };
    case 'PREV_PAGE':
      return { ...state, pageIndex: Math.max(0, state.pageIndex - 1), view: 'assessment' };
    case 'GO_TO_PAGE':
      if (!Number.isInteger(action.pageIndex) || action.pageIndex < 0 || action.pageIndex >= pages.length) return state;
      return { ...state, view: 'assessment', pageIndex: action.pageIndex };
    case 'OPEN_REVIEW':
      return isAssessmentComplete(state, pages) ? { ...state, view: 'review' } : state;
    case 'SET_RESULT':
      return { ...state, result: action.result, view: 'results' };
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
}
