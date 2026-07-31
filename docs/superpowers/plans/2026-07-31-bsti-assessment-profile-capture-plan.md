# BSTI Assessment Profile Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the frozen pre-assessment profile, eligibility, and consent contract without changing scoring or report compilation.

**Architecture:** Keep the current `index.html` single-file structure and embedded Base64 ES modules. Extend only the state and gate modules; add one Node static-contract test; keep the instrument, `scoreAssessment`, `buildReportViewModel`, and V0.4.4.1 behavior unchanged.

**Tech Stack:** Static HTML/CSS, browser ES modules embedded as Base64 data URLs, Node.js `node:assert/strict`, Git.

## Global Constraints

- Baseline: `7cebc0ed2e7dfa06ed5ec3d36be183c2e37749f8` / `v0.4.4.1`.
- Instrument: `BSTI-40 V0.4.3`; report rules: `BSTM V0.4.4.1`.
- Profile/context fields never enter scoring.
- GitHub Pages is demo-only and must not imply production persistence.
- No CloudBase, report-context module, WeChat, WeCom, Eliy, whitepaper, CRM, booking, or payment work.
- No repository restructuring.

---

### Task 1: Define the static contract (RED)

**Files:**
- Create: `tests/profile-capture-static-contract.mjs`
- Read: `index.html`

**Produces:** a test that decodes embedded modules and guards profile keys, stable codes, exact consent copy, demo notice, and score isolation.

- [ ] **Step 1: Create the failing test**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const baseline = execFileSync('git', ['show', 'v0.4.4.1:index.html'], { encoding: 'utf8' });

function importPayload(source, exportName) {
  const pattern = new RegExp(
    `import \\{[^}]*\\b${exportName}\\b[^}]*\\} from 'data:text/javascript;base64,([^']+)'`
  );
  const match = source.match(pattern);
  assert.ok(match, `${exportName} import not found`);
  return match[1];
}

const modules = [...html.matchAll(/data:text\/javascript;base64,([^']+)'/g)]
  .map((match) => Buffer.from(match[1], 'base64').toString('utf8'));
const decoded = modules.join('\n');

for (const key of [
  'assessmentProfile', 'displayName', 'businessUnit', 'roleCode', 'roleOther',
  'revenueBand', 'headcountBand', 'industryCode', 'industryOther', 'profileVersion',
  'currentlyOperatingBusiness', 'participatesInKeyBusinessDecisions',
  'canReferenceRecent6Months', 'usesConsistentBusinessReference',
  'reportProcessing', 'marketing', 'validatePreAssessmentState'
]) assert.ok(decoded.includes(key), `missing contract key: ${key}`);

for (const code of [
  'founder_controller', 'owner_chair', 'ceo_president_gm', 'cofounder_partner',
  'business_unit_owner', 'cxo_core_executive', 'middle_manager',
  'professional_advisor', 'lt_10m_cny', '10m_30m_cny', '30m_100m_cny',
  '100m_300m_cny', '300m_1b_cny', 'gte_1b_cny', 'prefer_not_to_say',
  'lt_10', '10_30', '30_100', '100_300', '300_1000', 'gte_1000'
]) assert.ok(decoded.includes(code), `missing stable code: ${code}`);

for (const text of [
  '以下资料用于固定本次作答情境',
  '上述资料不改变 BSTI 计分结果',
  '我已阅读并同意《BSTI 个人信息处理规则》',
  '我愿意接收与本次报告相关的解读、活动和服务信息',
  '确认资料，开始测试',
  '当前为开发演示环境，请勿填写真实个人或企业资料'
]) assert.ok(decoded.includes(text), `missing frozen copy: ${text}`);

assert.equal(importPayload(html, 'scoreAssessment'), importPayload(baseline, 'scoreAssessment'));
const submitBody = html.match(/function submitAssessment\(\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
assert.ok(submitBody.includes('scoreAssessment(instrument, state.answers)'));
assert.ok(!/assessmentProfile|eligibility|consents/.test(submitBody));

console.log('Assessment profile capture static contract: PASS');
```

- [ ] **Step 2: Verify RED**

```bash
node tests/profile-capture-static-contract.mjs
```

Expected: FAIL at `missing contract key: assessmentProfile`.

- [ ] **Step 3: Commit RED**

```bash
git add tests/profile-capture-static-contract.mjs
git commit -m "test: define assessment profile capture contract"
```

### Task 2: Implement state and validation (GREEN for state)

**Files:**
- Modify: `index.html` embedded state module
- Modify: `tests/profile-capture-static-contract.mjs`

**Produces:** `validatePreAssessmentState(state)` and actions `SET_ELIGIBILITY`, `SET_PROFILE`, `SET_CONSENT`, `CONFIRM_PROFILE`.

- [ ] **Step 1: Add executable state assertions**

Decode the state module, import it through a `data:text/javascript;base64,...` URL, and assert:

```js
const initial = createInitialState();
assert.equal(initial.view, 'gate');
assert.equal(initial.assessmentProfile.industryCode, 'other');
assert.equal(initial.assessmentProfile.profileVersion, 'BSTI_PROFILE_V0.1');
assert.equal(initial.consents.reportProcessingVersion, 'BSTI_PRIVACY_V0.1');
assert.equal(initial.consents.marketingVersion, 'BSTI_MARKETING_V0.1');
assert.equal(validatePreAssessmentState(initial).valid, false);

const complete = {
  ...initial,
  eligibility: {
    currentlyOperatingBusiness: true,
    participatesInKeyBusinessDecisions: true,
    canReferenceRecent6Months: true,
    usesConsistentBusinessReference: true
  },
  assessmentProfile: {
    ...initial.assessmentProfile,
    displayName: '测试用户',
    businessUnit: '测试企业',
    roleCode: 'founder_controller',
    revenueBand: 'prefer_not_to_say',
    headcountBand: 'prefer_not_to_say',
    industryOther: '测试行业'
  },
  consents: { ...initial.consents, reportProcessing: true }
};
assert.equal(validatePreAssessmentState(complete).valid, true);
assert.equal(reduceState(complete, { type: 'CONFIRM_PROFILE' }, []).view, 'intro');
assert.equal(validatePreAssessmentState({
  ...complete,
  assessmentProfile: { ...complete.assessmentProfile, roleCode: 'other', roleOther: '' }
}).firstInvalidField, 'roleOther');
```

- [ ] **Step 2: Verify RED**

```bash
node tests/profile-capture-static-contract.mjs
```

Expected: FAIL because the new exports/state are absent.

- [ ] **Step 3: Implement the state contract**

Add the exact state object from the design spec and:

```js
export function validatePreAssessmentState(state) {
  const trimmed = (value) => typeof value === 'string' ? value.trim() : '';
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
```

Reducer cases:

```js
case 'SET_ELIGIBILITY':
  return { ...state, eligibility: { ...state.eligibility, [action.field]: Boolean(action.value) } };
case 'SET_PROFILE':
  return { ...state, assessmentProfile: { ...state.assessmentProfile, [action.field]: action.value } };
case 'SET_CONSENT':
  return { ...state, consents: { ...state.consents, [action.field]: Boolean(action.value) } };
case 'CONFIRM_PROFILE':
  return validatePreAssessmentState(state).valid ? { ...state, view: 'intro' } : state;
```

Keep all assessment actions unchanged. `RESET` returns `createInitialState()`.

- [ ] **Step 4: Re-encode and run test**

```bash
node tests/profile-capture-static-contract.mjs
```

Expected: state checks PASS; copy/control checks remain RED.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/profile-capture-static-contract.mjs
git commit -m "feat: add assessment profile state contract"
```

### Task 3: Implement the two-block gate UI

**Files:**
- Modify: `index.html` stylesheet and embedded `renderEligibilityGate` module
- Modify: `tests/profile-capture-static-contract.mjs`

**Produces:** the complete form, exact copy, validation feedback, and first-invalid focus.

- [ ] **Step 1: Add failing control-ID assertions**

Assert the decoded gate module includes:

```text
eligibility-operating
eligibility-decisions
eligibility-six-months
eligibility-reference
profile-display-name
profile-business-unit
profile-role-code
profile-role-other
profile-revenue-band
profile-headcount-band
profile-industry-other
consent-report-processing
consent-marketing
profile-continue
```

- [ ] **Step 2: Verify RED**

```bash
node tests/profile-capture-static-contract.mjs
```

Expected: FAIL at the first missing control ID.

- [ ] **Step 3: Add focused CSS**

Add classes for `.demo-notice`, `.profile-form`, `.profile-block`, `.profile-grid`, `.profile-field`, `.select-input`, `.confirmation-list`, `.consent-panel`, `.is-invalid`, and `.validation-message`; collapse `.profile-grid` to one column below 700px.

- [ ] **Step 4: Render and wire the form**

Use exact design copy and stable option values. Dispatch on each input/change. On submit:

```js
const validation = validatePreAssessmentState(state);
if (!validation.valid) {
  showValidationMessage('请完成必填资料与确认。');
  focusControlFor(validation.firstInvalidField);
  return;
}
dispatch({ type: 'CONFIRM_PROFILE' });
```

Role `other` reveals and requires `roleOther`. Marketing is unchecked and non-blocking. Show the demo notice. Do not claim remote save.

- [ ] **Step 5: Re-encode and verify**

```bash
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/profile-capture-static-contract.mjs
git commit -m "feat: add pre-assessment profile and consent form"
```

### Task 4: Guard draft and reset behavior

**Files:**
- Modify: `tests/profile-capture-static-contract.mjs`
- Modify only if RED: embedded draft module in `index.html`

- [ ] **Step 1: Add assertions**

```js
const serialized = serializeDraft({ ...complete, result: { stale: true } }, '0.4.3');
const restored = restoreDraft(serialized, '0.4.3');
assert.equal(restored.assessmentProfile.displayName, '测试用户');
assert.equal(restored.consents.reportProcessing, true);
assert.equal(restored.result, null);
assert.deepEqual(reduceState(complete, { type: 'RESET' }, []), createInitialState());
```

- [ ] **Step 2: Run tests**

```bash
node tests/profile-capture-static-contract.mjs
```

Expected: PASS, or a precise failure showing the draft helper drops the new state.

- [ ] **Step 3: Correct only when RED**

Keep `clearResultForDraft(state)` as `{ ...state, result: null }`; do not duplicate the profile schema.

- [ ] **Step 4: Run all tests and commit**

```bash
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
git add index.html tests/profile-capture-static-contract.mjs
git commit -m "test: cover profile draft and reset boundaries"
```

### Task 5: Manual verification and PR

**Files:**
- Modify only for verified defects: `index.html`

- [ ] **Step 1: Serve locally**

```bash
python3 -m http.server 4173
```

- [ ] **Step 2: Verify with synthetic data**

Confirm required/optional behavior, role `other`, both `不便透露` options, first-invalid focus, transition to intro, unchanged 40-item flow, report rendering, print/PDF, reset, and absence of remote-save claims.

- [ ] **Step 3: Final verification**

```bash
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
git status --short
```

- [ ] **Step 4: Open PR**

Title:

```text
PR #3｜Assessment Profile Capture Baseline
```

Body must state:

- profile/eligibility/consent scope;
- scoring/report compiler unchanged;
- GitHub Pages demo-only;
- no CloudBase, report-context, or downstream handoff implementation;
- exact automated and manual verification run.
