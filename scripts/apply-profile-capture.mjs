import fs from 'node:fs';

const INDEX_PATH = new URL('../index.html', import.meta.url);
const STATE_SOURCE_PATH = new URL('./profile-state-source.js', import.meta.url);
const GATE_TEMPLATE_PATH = new URL('./profile-gate-source.template.js', import.meta.url);
const PROFILE_MARKER = '/* Assessment Profile Capture V0.1 */';

function importPattern(exportName) {
  return new RegExp(
    `(import \\{[^}]*\\b${exportName}\\b[^}]*\\} from ')data:text/javascript;base64,[^']+(';)`
  );
}

function replaceImportPayload(html, exportName, payload) {
  const pattern = importPattern(exportName);
  if (!pattern.test(html)) throw new Error(`Import payload not found for ${exportName}`);
  return html.replace(pattern, `$1data:text/javascript;base64,${payload}$2`);
}

function decodeImportPayload(html, exportName) {
  const pattern = new RegExp(
    `import \\{[^}]*\\b${exportName}\\b[^}]*\\} from 'data:text/javascript;base64,([^']+)'`
  );
  const match = html.match(pattern);
  if (!match) throw new Error(`Import payload not found for ${exportName}`);
  return Buffer.from(match[1], 'base64').toString('utf8');
}

function encodeModule(source) {
  return Buffer.from(source, 'utf8').toString('base64');
}

let html = fs.readFileSync(INDEX_PATH, 'utf8');
if (html.includes(PROFILE_MARKER)) {
  console.log('Assessment profile capture already applied.');
  process.exit(0);
}

const stateSource = fs.readFileSync(STATE_SOURCE_PATH, 'utf8');
const statePayload = encodeModule(stateSource);
const stateDataUrl = `data:text/javascript;base64,${statePayload}`;
const gateTemplate = fs.readFileSync(GATE_TEMPLATE_PATH, 'utf8');
if (!gateTemplate.includes('__STATE_DATA_URL__')) throw new Error('State data URL placeholder not found');
const gateSource = gateTemplate.replace('__STATE_DATA_URL__', stateDataUrl);

html = replaceImportPayload(html, 'createInitialState', statePayload);
html = replaceImportPayload(html, 'renderEligibilityGate', encodeModule(gateSource));

const resultSource = decodeImportPayload(html, 'renderResults');
if (!resultSource.includes('state.eligibility.businessUnit')) {
  throw new Error('Expected result business-unit source not found');
}
const updatedResultSource = resultSource.replaceAll(
  'state.eligibility.businessUnit',
  'state.assessmentProfile.businessUnit'
);
html = replaceImportPayload(html, 'renderResults', encodeModule(updatedResultSource));

const dispatchBefore = `      let state = createInitialState();
      function dispatch(action) {
        const previousState = state;
        state = reduceState(state, action, pages);
        const resetViewport = shouldResetAssessmentViewport(previousState, state);
        render();
        if (resetViewport) requestAnimationFrame(() => resetAssessmentViewport());
      }`;
const dispatchAfter = `      let state = createInitialState();
      const renderlessActions = new Set(['SET_ELIGIBILITY', 'SET_PROFILE', 'SET_CONSENT']);
      function dispatch(action) {
        const previousState = state;
        state = reduceState(state, action, pages);
        const resetViewport = shouldResetAssessmentViewport(previousState, state);
        if (!renderlessActions.has(action.type)) render();
        if (resetViewport) requestAnimationFrame(() => resetAssessmentViewport());
        return state;
      }`;
if (!html.includes(dispatchBefore)) throw new Error('Expected dispatch block not found');
html = html.replace(dispatchBefore, dispatchAfter);

const css = `${PROFILE_MARKER}
.demo-notice { margin:18px 0 0; padding:12px 14px; border:1px solid #fde68a; border-radius:12px; background:#fffbeb; color:#92400e; font-size:.86rem; line-height:1.6; }
.profile-form { display:grid; gap:22px; margin-top:28px; }
.profile-block { padding:24px; border:1px solid var(--line); border-radius:18px; background:var(--surface-soft); }
.profile-block h2 { margin:0; font-size:1.08rem; }
.profile-block-intro { margin:8px 0 20px; color:var(--muted); line-height:1.65; }
.profile-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
.profile-field { display:grid; gap:8px; }
.profile-field--full { grid-column:1 / -1; }
.profile-field label, .profile-field > span { font-weight:650; }
.profile-field small { color:var(--muted); line-height:1.55; }
.select-input { width:100%; min-height:52px; padding:0 14px; border:1px solid var(--line); border-radius:14px; background:#fff; font:inherit; outline:none; }
.select-input:focus { border-color:var(--purple); box-shadow:0 0 0 4px var(--purple-soft); }
.confirmation-list { display:grid; gap:12px; }
.confirmation-list .check-row, .consent-panel .check-row { margin:0; padding:12px 0; border-bottom:1px solid var(--line); }
.confirmation-list .check-row:last-child, .consent-panel .check-row:last-of-type { border-bottom:0; }
.consent-panel { padding:20px; border:1px solid #ddd6fe; border-radius:16px; background:#faf8ff; }
.is-invalid { border-color:#dc2626 !important; box-shadow:0 0 0 3px rgba(220,38,38,.08) !important; }
.validation-message { margin:0; color:#b91c1c; font-size:.82rem; }
[hidden] { display:none !important; }
@media (max-width:700px) { .profile-grid { grid-template-columns:1fr; } .profile-block { padding:20px 16px; } }
`;
if (!html.includes('/* Results */')) throw new Error('Results CSS marker not found');
html = html.replace('/* Results */', `${css}\n/* Results */`);

fs.writeFileSync(INDEX_PATH, html);
console.log('Assessment profile capture applied.');
