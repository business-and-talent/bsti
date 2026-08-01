import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const decodedModules = [...html.matchAll(/data:text\/javascript;base64,([^']+)'/g)]
  .map((match) => Buffer.from(match[1], 'base64').toString('utf8'))
  .join('\n');

function payload(source, exportName) {
  const match = source.match(new RegExp(`import \\{[^}]*${exportName}[^}]*\\} from 'data:text/javascript;base64,([^']+)'`));
  assert.ok(match, `${exportName} import missing`);
  return match[1];
}

const continuationPayload = payload(html, 'createReportContinuationHash');
const continuation = await import(`data:text/javascript;base64,${continuationPayload}`);

const instrument = {
  version: '0.4.3',
  items: Array.from({ length: 40 }, (_, index) => ({ id: `Q${String(index + 1).padStart(2, '0')}` }))
};
const answers = Object.fromEntries(instrument.items.map((item, index) => [item.id, (index % 5) + 1]));

const hash = continuation.createReportContinuationHash(instrument.version, '测试经营主体', answers);
assert.ok(hash.startsWith('#bsti-report='));
assert.deepEqual(
  continuation.parseReportContinuationHash(hash, instrument),
  { businessUnit: '测试经营主体', answers }
);

const encoded = hash.slice('#bsti-report='.length).replace(/-/g, '+').replace(/_/g, '/');
const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
assert.deepEqual(Object.keys(decoded).sort(), ['answers', 'businessUnit', 'instrumentVersion', 'schemaVersion']);
for (const forbidden of ['displayName', 'roleCode', 'revenueBand', 'headcountBand', 'industryCode', 'consents']) {
  assert.ok(!(forbidden in decoded), `report continuation leaked ${forbidden}`);
}

assert.equal(continuation.parseReportContinuationHash(hash, { ...instrument, version: '9.9.9' }), null);
assert.equal(
  continuation.parseReportContinuationHash(
    continuation.createReportContinuationHash(instrument.version, '测试经营主体', { ...answers, Q01: 6 }),
    instrument
  ),
  null
);
const incompleteAnswers = { ...answers };
delete incompleteAnswers.Q40;
assert.equal(
  continuation.parseReportContinuationHash(
    continuation.createReportContinuationHash(instrument.version, '测试经营主体', incompleteAnswers),
    instrument
  ),
  null
);

assert.ok(html.includes("const continuation = parseReportContinuationHash(window.location.hash, instrument);"));
assert.ok(html.includes("history.replaceState(null, '', createReportContinuationHash("));
assert.ok(html.includes("history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);"));
assert.ok(decodedModules.includes('专业服务／咨询／法务／财会'));
assert.ok(decodedModules.includes('经营系统张力图'));
assert.ok(decodedModules.includes('${instrument.visualization_full_name}'));
assert.ok(!decodedModules.includes('BSTM｜经营系统张力图'));
assert.ok(decodedModules.includes('你的经营系统张力报告'));
assert.ok(!decodedModules.includes('你的经营系统张力轮廓'));
assert.ok(decodedModules.includes('报告网址包含经营主体与作答数据，请勿转发'));
assert.ok(html.includes('.result-hero h1 { font-size:clamp(1.65rem, 6.8vw, 3.4rem); white-space:nowrap; }'));

console.log('Report continuation and naming contract: PASS');
