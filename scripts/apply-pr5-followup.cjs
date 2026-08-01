const fs = require('node:fs');

let html = fs.readFileSync('index.html', 'utf8');

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0) throw new Error(`${label}: source text not found`);
  if (first !== last) throw new Error(`${label}: source text is not unique`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function updateEncodedModule(exportName, transform) {
  const pattern = new RegExp(`import \\{[^}]*\\b${exportName}\\b[^}]*\\} from 'data:text/javascript;base64,([^']+)'`);
  const match = html.match(pattern);
  if (!match) throw new Error(`${exportName}: encoded module import not found`);
  const source = Buffer.from(match[1], 'base64').toString('utf8');
  const updated = transform(source);
  if (updated === source) throw new Error(`${exportName}: module was not changed`);
  const encoded = Buffer.from(updated, 'utf8').toString('base64');
  html = html.slice(0, match.index) + match[0].replace(match[1], encoded) + html.slice(match.index + match[0].length);
}

const continuationModule = String.raw`const REPORT_CONTINUATION_PREFIX = '#bsti-report=';
const REPORT_CONTINUATION_SCHEMA_VERSION = 1;

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function validAnswers(answers, instrument) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return false;
  const itemIds = instrument.items.map((item) => item.id);
  const answerIds = Object.keys(answers);
  if (answerIds.length !== itemIds.length) return false;
  if (answerIds.some((id) => !itemIds.includes(id))) return false;
  return itemIds.every((id) => Number.isInteger(answers[id]) && answers[id] >= 1 && answers[id] <= 5);
}

export function createReportContinuationHash(instrumentVersion, businessUnit, answers) {
  const payload = {
    schemaVersion: REPORT_CONTINUATION_SCHEMA_VERSION,
    instrumentVersion,
    businessUnit: String(businessUnit ?? '').trim(),
    answers: { ...answers }
  };
  return REPORT_CONTINUATION_PREFIX + encodeBase64Url(JSON.stringify(payload));
}

export function parseReportContinuationHash(hash, instrument) {
  const value = String(hash ?? '');
  if (!value.startsWith(REPORT_CONTINUATION_PREFIX)) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(value.slice(REPORT_CONTINUATION_PREFIX.length)));
    if (payload.schemaVersion !== REPORT_CONTINUATION_SCHEMA_VERSION) return null;
    if (payload.instrumentVersion !== instrument.version) return null;
    if (typeof payload.businessUnit !== 'string' || !payload.businessUnit.trim() || payload.businessUnit.length > 200) return null;
    if (!validAnswers(payload.answers, instrument)) return null;
    return { businessUnit: payload.businessUnit.trim(), answers: { ...payload.answers } };
  } catch {
    return null;
  }
}
`;

const continuationImport = `      import { createReportContinuationHash, parseReportContinuationHash } from 'data:text/javascript;base64,${Buffer.from(continuationModule, 'utf8').toString('base64')}';\n`;
const viewportImportPattern = /(      import \{ shouldResetAssessmentViewport, resetAssessmentViewport \} from 'data:text\/javascript;base64,[^']+';\n)/;
if (!viewportImportPattern.test(html)) throw new Error('viewport import anchor not found');
html = html.replace(viewportImportPattern, `$1${continuationImport}`);

updateEncodedModule('renderEligibilityGate', (source) => {
  source = replaceOnce(
    source,
    "['professional_services', '专业服务／咨询']",
    "['professional_services', '专业服务／咨询／法务／财会']",
    'professional-services label'
  );
  if (!source.includes('BSTM 报告')) throw new Error('customer-visible BSTM report copy not found');
  return source.replaceAll('BSTM 报告', '经营系统张力报告');
});

updateEncodedModule('renderResults', (source) => {
  source = replaceOnce(
    source,
    '<p class="eyebrow">BSTM｜经营系统张力图</p>',
    '<p class="eyebrow instrument-name report-map-name"><span>经营系统张力图</span><span class="instrument-name-en">${instrument.visualization_full_name}</span></p>',
    'report map name'
  );
  source = replaceOnce(
    source,
    '<h1>你的经营系统张力轮廓</h1>',
    '<h1>你的经营系统张力报告</h1>',
    'report title'
  );
  source = replaceOnce(
    source,
    '<p class="export-help-note">网页无法替你自动打开 Safari 或 Chrome，需要由你在微信菜单中手动选择。</p>',
    '<p class="export-help-note">网页无法替你自动打开 Safari 或 Chrome，需要由你在微信菜单中手动选择。</p><p class="export-help-note"><strong>隐私提醒：</strong>报告网址包含经营主体与作答数据，请勿转发。</p>',
    'export privacy warning'
  );
  source = replaceOnce(
    source,
    '<p class="eyebrow">BSTM</p><h2>四象限张力雷达图</h2>',
    '<p class="eyebrow">经营系统张力图</p><h2>四象限张力雷达图</h2>',
    'radar heading'
  );
  source = source.replace('aria-label="BSTM四象限雷达图', 'aria-label="经营系统张力图四象限雷达图');
  return source;
});

html = replaceOnce(
  html,
  '.result-hero h1 { font-size:clamp(2.2rem, 5vw, 4.2rem); }',
  '.result-hero h1 { font-size:clamp(1.65rem, 6.8vw, 3.4rem); white-space:nowrap; }',
  'report title CSS'
);
html = replaceOnce(
  html,
  '.export-help-note { padding:12px 14px; border-radius:12px; background:var(--surface-soft); font-size:.84rem; }',
  '.export-help-note { padding:12px 14px; border-radius:12px; background:var(--surface-soft); font-size:.84rem; }\n.export-help-note + .export-help-note { margin-top:10px; }',
  'export note spacing'
);

const initialStateLine = '      let state = createInitialState();';
const restoredState = [
  '      let state = createInitialState();',
  '      const continuation = parseReportContinuationHash(window.location.hash, instrument);',
  '      if (continuation) {',
  '        const restoredResult = scoreAssessment(instrument, continuation.answers);',
  '        const restoredReport = buildReportViewModel(instrument, restoredResult);',
  '        state = {',
  '          ...state,',
  '          assessmentProfile: { ...state.assessmentProfile, businessUnit: continuation.businessUnit },',
  '          answers: continuation.answers,',
  "          result: { result: restoredResult, report: restoredReport },",
  "          view: 'results'",
  '        };',
  '      }'
].join('\n');
html = replaceOnce(html, initialStateLine, restoredState, 'report continuation restore');

const dispatchBefore = [
  '      function dispatch(action) {',
  '        const previousState = state;',
  '        state = reduceState(state, action, pages);',
  '        const resetViewport = shouldResetAssessmentViewport(previousState, state);',
  '        if (!renderlessActions.has(action.type)) render();',
  '        if (resetViewport) requestAnimationFrame(() => resetAssessmentViewport());',
  '        return state;',
  '      }'
].join('\n');
const dispatchAfter = [
  '      function dispatch(action) {',
  '        const previousState = state;',
  '        state = reduceState(state, action, pages);',
  "        if (action.type === 'RESET') history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);",
  '        const resetViewport = shouldResetAssessmentViewport(previousState, state);',
  '        if (!renderlessActions.has(action.type)) render();',
  '        if (resetViewport) requestAnimationFrame(() => resetAssessmentViewport());',
  '        return state;',
  '      }'
].join('\n');
html = replaceOnce(html, dispatchBefore, dispatchAfter, 'reset continuation URL');

const submitBefore = [
  '      function submitAssessment() {',
  '        const result = scoreAssessment(instrument, state.answers);',
  '        const report = buildReportViewModel(instrument, result);',
  "        dispatch({ type: 'SET_RESULT', result: { result, report } });",
  '      }'
].join('\n');
const submitAfter = [
  '      function submitAssessment() {',
  '        const result = scoreAssessment(instrument, state.answers);',
  '        const report = buildReportViewModel(instrument, result);',
  "        dispatch({ type: 'SET_RESULT', result: { result, report } });",
  "        history.replaceState(null, '', createReportContinuationHash(",
  '          instrument.version,',
  '          state.assessmentProfile.businessUnit,',
  '          state.answers',
  '        ));',
  '      }'
].join('\n');
html = replaceOnce(html, submitBefore, submitAfter, 'create continuation URL');

fs.writeFileSync('index.html', html);
