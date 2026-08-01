import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const baseline = execFileSync(
  'git',
  ['show', 'v0.4.4:index.html'],
  { encoding: 'utf8' }
);

function importPayload(source, exportName) {
  const pattern = new RegExp(
    `import \\{[^}]*\\b${exportName}\\b[^}]*\\} from 'data:text/javascript;base64,([^']+)'`
  );
  const match = source.match(pattern);
  assert.ok(match, `${exportName} import not found`);
  return match[1];
}

function decodedModules(source) {
  return [...source.matchAll(/data:text\/javascript;base64,([^']+)'/g)]
    .map((match) => Buffer.from(match[1], 'base64').toString('utf8'))
    .join('\n');
}

const currentInstrument = JSON.parse(html.match(/const instrument = (\{.*?\});\n\s*const pages =/s)?.[1]);
const baselineInstrument = JSON.parse(baseline.match(/const instrument = (\{.*?\});\n\s*const pages =/s)?.[1]);
const { technical_name_zh: _currentTechnicalName, product_name: _currentProductName, construct: _currentConstruct, ...currentFrozenInstrument } = currentInstrument;
const { technical_name_zh: _baselineTechnicalName, product_name: _baselineProductName, construct: _baselineConstruct, ...baselineFrozenInstrument } = baselineInstrument;

assert.deepEqual(currentFrozenInstrument, baselineFrozenInstrument, 'instrument changed from v0.4.4 beyond technical_name_zh');
assert.equal(currentInstrument.technical_name_zh, '经营系统张力测量工具');
assert.equal(currentInstrument.product_name, '富老板经营系统张力测试');
assert.equal(currentInstrument.construct, '经营系统张力');
assert.equal(
  importPayload(html, 'scoreAssessment'),
  importPayload(baseline, 'scoreAssessment'),
  'scoring module changed from v0.4.4'
);

const decoded = decodedModules(html);
for (const requiredText of [
  '为什么会这样',
  '你可能正在付出的代价',
  '经营代价链',
  '经营结果仍需数据核验'
]) {
  assert.ok(decoded.includes(requiredText), `missing presentation label: ${requiredText}`);
}

assert.ok(html.includes('.cause-cost-hook'), 'cause-cost summary CSS missing');
assert.ok(html.includes('.cost-chain-step'), 'cost-chain CSS missing');
assert.ok(html.includes('V0.4.4.1 print orphan control'), 'print orphan-control CSS missing');
assert.ok(decoded.includes('cause-cost-priority'), 'priority explanation was not moved after cause and cost');
assert.ok(
  decoded.indexOf('cause-cost-boundary') < decoded.indexOf('cause-cost-priority'),
  'priority explanation must follow the cause-cost boundary'
);

const fragmentationCss = html.split('/* V0.4.4.1 print fragmentation correction */')[1] ?? '';
assert.ok(fragmentationCss, 'print-fragmentation correction CSS missing');
assert.ok(
  fragmentationCss.includes('.cause-cost-summary {') &&
  fragmentationCss.includes('display: block !important;'),
  'cause-cost summary must use block fragmentation in print'
);
assert.ok(
  fragmentationCss.includes('.cause-cost-overview .panel-heading + .cause-cost-summary') &&
  fragmentationCss.includes('break-before: auto !important;'),
  'cause-cost summary must be allowed to begin on the current page'
);
assert.ok(
  fragmentationCss.includes('.report-footer {') &&
  fragmentationCss.includes('page-break-before: auto !important;'),
  'report footer must not pull the boundary note onto an orphan page'
);

console.log('V0.4.4.1 frozen boundaries: PASS');
