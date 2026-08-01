import fs from 'node:fs';

const filePath = 'index.html';
let html = fs.readFileSync(filePath, 'utf8');

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first === -1) throw new Error(`${label}: target not found`);
  if (source.indexOf(from, first + from.length) !== -1) throw new Error(`${label}: target is not unique`);
  return source.slice(0, first) + to + source.slice(first + from.length);
}

function patchEmbeddedModule(exportName, transform) {
  const pattern = new RegExp(
    `(import \\{[^\\n]*\\b${exportName}\\b[^\\n]*\\} from 'data:text/javascript;base64,)([^']+)(';\\n)`
  );
  const match = html.match(pattern);
  if (!match) throw new Error(`${exportName}: embedded module import not found`);
  const source = Buffer.from(match[2], 'base64').toString('utf8');
  const updated = transform(source);
  if (updated === source) throw new Error(`${exportName}: transform produced no change`);
  const payload = Buffer.from(updated, 'utf8').toString('base64');
  html = html.replace(pattern, `$1${payload}$3`);
}

patchEmbeddedModule('buildReportViewModel', (source) => {
  const coreSummaryCopy = `
const CORE_SUMMARY_COPY = {
  'WE+ITs': {
    title: 'WE＋ITs｜选择与判断共同靠前',
    body: '组织可能过早收窄能够进入正式讨论的选择，同时又未能把市场、一线、报表与资源状态整合成共同使用的现实版本；团队因此可能沿着较早形成的答案继续执行，直到问题反复出现，才重新修正经营判断。'
  }
};
`;
  source = replaceOnce(
    source,
    '\nconst OBSERVATION_GROUPS = {',
    `${coreSummaryCopy}\nconst OBSERVATION_GROUPS = {`,
    'insert CORE_SUMMARY_COPY'
  );

  const coreSummaryFunction = `function coreSummaryFor(profile, causeCostSummary) {
  const combination = COMBINATIONS[profile.combination_key];
  if (profile.focus_group.length > 1) {
    return CORE_SUMMARY_COPY[profile.combination_key] ?? {
      title: combination.title,
      body: combination.body
    };
  }
  return { title: combination.title, body: causeCostSummary.hook };
}

`;
  source = replaceOnce(
    source,
    'function summaryFor(profile) {',
    `${coreSummaryFunction}function summaryFor(profile) {`,
    'insert coreSummaryFor'
  );
  source = replaceOnce(
    source,
    '    summary: summaryFor(profile),\n    profile,',
    '    summary: summaryFor(profile),\n    coreSummary: coreSummaryFor(profile, causeCostSummary),\n    profile,',
    'expose coreSummary'
  );
  return source;
});

patchEmbeddedModule('renderResults', (source) => {
  source = replaceOnce(
    source,
    '    <main class="result-shell">\n      <header class="result-topbar no-print">',
    '    <main class="result-shell">\n      <div class="print-brand" aria-hidden="true"><span class="brand-dot"></span><span>富老板 BSTI</span></div>\n      <header class="result-topbar no-print">',
    'add print-only brand'
  );
  source = replaceOnce(
    source,
    '          <span class="summary-kicker">核心结果摘要</span>\n          <p class="cause-cost-hook">${report.causeCostSummary.hook}</p>',
    '          <span class="summary-kicker">核心结果摘要</span>\n          <strong class="summary-focus-title">${report.coreSummary.title}</strong>\n          <p class="cause-cost-hook">${report.coreSummary.body}</p>',
    'render explicit core summary'
  );
  return source;
});

html = replaceOnce(
  html,
  '.result-topbar { display:flex; justify-content:space-between; align-items:center; gap:20px; }',
  '.result-topbar { display:flex; justify-content:space-between; align-items:center; gap:20px; }\n.print-brand { display:none; }',
  'add screen-hidden print brand CSS'
);
html = replaceOnce(
  html,
  '.summary-kicker { color:var(--purple); font-size:.78rem; font-weight:760; letter-spacing:.08em; }',
  '.summary-kicker { color:var(--purple); font-size:.78rem; font-weight:760; letter-spacing:.08em; }\n.summary-focus-title { display:block; margin-top:10px; color:var(--purple-dark); font-size:.92rem; line-height:1.5; }',
  'add summary focus title CSS'
);
html = replaceOnce(
  html,
  '  body { background:#fff; }\n  .no-print { display:none !important; }',
  '  body { background:#fff; }\n  .print-brand { display:flex; align-items:center; gap:10px; min-height:36px; margin:0 0 8mm; font-weight:650; letter-spacing:-.01em; print-color-adjust:exact; -webkit-print-color-adjust:exact; }\n  .no-print { display:none !important; }',
  'show print brand in print media'
);

fs.writeFileSync(filePath, html);
console.log('Applied PR #5 dual-focus summary and print-brand correction.');
