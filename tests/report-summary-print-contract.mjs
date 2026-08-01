import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function importPayload(source, exportName) {
  const pattern = new RegExp(
    `import \\{[^}]*\\b${exportName}\\b[^}]*\\} from 'data:text/javascript;base64,([^']+)'`
  );
  const match = source.match(pattern);
  assert.ok(match, `${exportName} import not found`);
  return match[1];
}

function extractInstrument(source) {
  const match = source.match(/const instrument = (\{.*?\});\n\s*const pages =/s);
  assert.ok(match, 'instrument object not found');
  return JSON.parse(match[1]);
}

const instrument = extractInstrument(html);
const scorePayload = importPayload(html, 'scoreAssessment');
const reportPayload = importPayload(html, 'buildReportViewModel');
const renderPayload = importPayload(html, 'renderResults');
const { scoreAssessment } = await import(`data:text/javascript;base64,${scorePayload}`);
const { buildReportViewModel } = await import(`data:text/javascript;base64,${reportPayload}`);
const renderSource = Buffer.from(renderPayload, 'base64').toString('utf8');

const quadrantAnswer = { I: 3, WE: 5, IT: 4, ITs: 5 };
const answers = Object.fromEntries(
  instrument.items.map((item) => [item.id, quadrantAnswer[item.quadrant_id]])
);
const result = scoreAssessment(instrument, answers);
const report = buildReportViewModel(instrument, result);

assert.deepEqual(report.profile.focus_group, ['WE', 'ITs']);
assert.deepEqual(report.scores, { I: 30, WE: 50, IT: 40, ITs: 50 });
assert.equal(report.coreSummary.title, 'WE＋ITs｜选择与判断共同靠前');
assert.equal(
  report.coreSummary.body,
  '组织可能过早收窄能够进入正式讨论的选择，同时又未能把市场、一线、报表与资源状态整合成共同使用的现实版本；团队因此可能沿着较早形成的答案继续执行，直到问题反复出现，才重新修正经营判断。'
);
assert.notEqual(
  report.coreSummary.body,
  '没有在选择阶段充分进入讨论的问题，可能在执行阶段反复出现，而系统仍来不及形成新的共同判断。',
  'parallel IT must not displace tied WE＋ITs leaders in the core summary'
);

assert.ok(renderSource.includes('${report.coreSummary.title}'), 'core summary title is not rendered');
assert.ok(renderSource.includes('${report.coreSummary.body}'), 'core summary body is not rendered');
assert.ok(renderSource.includes('class="print-brand"'), 'print-only brand is missing from report flow');
assert.ok(renderSource.includes('富老板 BSTI'), 'print-only brand copy is missing');
assert.ok(html.includes('.print-brand { display:none; }'), 'print brand must stay hidden on screen');
assert.match(
  html,
  /@media print \{[\s\S]*?\.print-brand\s*\{[^}]*display:flex;[^}]*\}/,
  'print brand must be visible in print media'
);
assert.ok(renderSource.includes('class="result-topbar no-print"'), 'web controls must remain excluded from print');

console.log('Report dual-focus summary and print brand contract: PASS');
