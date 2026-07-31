import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractImport(exportName) {
  const pattern = new RegExp(
    `import \\{[^}]*\\b${exportName}\\b[^}]*\\} from 'data:text/javascript;base64,([^']+)'`
  );
  const match = html.match(pattern);
  assert.ok(match, `embedded module for ${exportName} not found`);
  return `data:text/javascript;base64,${match[1]}`;
}

function extractInstrument() {
  const match = html.match(/const instrument = (\{.*?\});\n\s*const pages =/s);
  assert.ok(match, 'instrument object not found');
  return JSON.parse(match[1]);
}

const { scoreAssessment } = await import(extractImport('scoreAssessment'));
const { buildReportViewModel } = await import(extractImport('buildReportViewModel'));
const instrument = extractInstrument();

function answersFor(scores) {
  const answers = {};
  for (const item of instrument.items) {
    const value = scores[item.quadrant_id] / 10;
    assert.ok(Number.isInteger(value) && value >= 1 && value <= 5);
    answers[item.id] = value;
  }
  return answers;
}

function build(scores) {
  return buildReportViewModel(
    instrument,
    scoreAssessment(instrument, answersFor(scores))
  );
}

{
  const report = build({ I: 30, WE: 50, IT: 30, ITs: 40 });
  const byId = Object.fromEntries(report.quadrants.map((q) => [q.id, q]));

  assert.deepEqual(report.profile.focus_group, ['WE']);
  assert.equal(byId.WE.priority_level, 'primary');
  assert.equal(byId.ITs.priority_level, 'parallel');
  assert.equal(byId.I.priority_level, 'observe');
  assert.equal(byId.IT.priority_level, 'observe');

  assert.match(report.causeCostSummary.hook, /共识.*太快/);
  assert.match(report.causeCostSummary.hook, /数据.*同一个现实/);
  assert.match(report.causeCostSummary.cause, /权威|惯例|讨论范围/);
  assert.match(report.causeCostSummary.directCost, /修正.*(?:越来越晚|更晚)|返工|资源错配|老板/);
  assert.match(report.causeCostSummary.boundary, /不是经营结果结论|数据核验/);

  assert.ok(report.costChain.steps.length >= 7);
  assert.match(
    report.costChain.steps.join(' → '),
    /讨论范围.*现实.*决定.*新信息.*偏差.*返工.*老板/
  );
  assert.match(report.costChain.resultBoundary, /客户|交付|增长|利润|现金流/);
}

{
  const report = build({ I: 50, WE: 50, IT: 50, ITs: 50 });

  assert.deepEqual(report.profile.focus_group, ['I', 'WE', 'IT', 'ITs']);
  assert.match(report.causeCostSummary.hook, /没有单一位置|四个位置|多个位置/);
  assert.doesNotMatch(
    `${report.causeCostSummary.cause} ${report.causeCostSummary.directCost}`,
    /唯一原因|直接导致/
  );
  assert.deepEqual(report.costChain.steps, [
    '熟悉解释较快成为判断基础',
    '讨论范围提前收缩',
    '不同现实没有被充分整合',
    '决定或行动沿着较早形成的答案继续推进',
    '新信息与偏差较晚进入修正',
    '复杂事项持续回到老板或少数关键人员',
    '返工、资源错配或问题回流',
    '老板或少数关键人员承担修正代价'
  ]);
}

{
  const report = build({ I: 30, WE: 30, IT: 30, ITs: 30 });

  assert.equal(report.profile.distribution_shape, 'flat_equal');
  assert.match(report.causeCostSummary.boundary, /核验|不能据此/);
  assert.doesNotMatch(
    `${report.causeCostSummary.hook} ${report.causeCostSummary.directCost}`,
    /已经造成|必然导致|确定导致/
  );
}

console.log('V0.4.4.1 cause-cost narrative: PASS');
