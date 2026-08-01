import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const privacy = fs.readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
const reportUsage = fs.readFileSync(new URL('../report-usage.html', import.meta.url), 'utf8');

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

function extractInstrument(source) {
  const match = source.match(/const instrument = (\{.*?\});\n\s*const pages =/s);
  assert.ok(match, 'instrument object not found');
  return JSON.parse(match[1]);
}

const decoded = decodedModules(html);
const instrument = extractInstrument(html);

for (const [name, source] of [
  ['index.html', html],
  ['privacy.html', privacy],
  ['report-usage.html', reportUsage]
]) {
  assert.ok(!source.includes('商业系统张力'), `${name} still contains 商业系统张力`);
}
assert.ok(!decoded.includes('商业系统张力'), 'embedded modules still contain 商业系统张力');
assert.equal(instrument.product_name, '富老板经营系统张力测试');
assert.equal(instrument.construct, '经营系统张力');
assert.equal(instrument.technical_name_zh, '经营系统张力测量工具');
assert.equal(instrument.method_full_name, 'Business System Tension Instrument');
assert.equal(instrument.visualization_full_name, 'Business System Tension Map');

assert.ok(decoded.includes('class="gate-title"'), 'startup title lacks scoped gate-title class');
const mobileCss = html.match(/@media \(max-width: 700px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
assert.match(mobileCss, /\.gate-title\s*\{[^}]*font-size:\s*2rem;[^}]*line-height:\s*1\.12;/);

const resultsPayload = importPayload(html, 'renderResults');
const resultsSource = Buffer.from(resultsPayload, 'base64').toString('utf8');
const resultsModule = await import(`data:text/javascript;base64,${resultsPayload}`);

assert.equal(typeof resultsModule.detectClientEnvironment, 'function');
assert.equal(typeof resultsModule.performReportExport, 'function');
assert.deepEqual(resultsModule.detectClientEnvironment('MicroMessenger'), {
  isWeCom: false,
  isWeChat: true,
  isWeChatFamily: true
});
assert.deepEqual(resultsModule.detectClientEnvironment('wxwork'), {
  isWeCom: true,
  isWeChat: false,
  isWeChatFamily: true
});
assert.equal(resultsModule.detectClientEnvironment('Mozilla/5.0 Safari').isWeChatFamily, false);

let printCalls = 0;
let helpCalls = 0;
const actions = {
  print: () => { printCalls += 1; },
  openHelp: () => { helpCalls += 1; }
};
resultsModule.performReportExport({ isWeChatFamily: true }, actions);
assert.equal(helpCalls, 1, 'WeChat export must open guidance');
assert.equal(printCalls, 0, 'WeChat export must not call print');
resultsModule.performReportExport({ isWeChatFamily: false }, actions);
assert.equal(printCalls, 1, 'standard-browser export must call print');
assert.equal(helpCalls, 1);

for (const text of [
  '保存／导出报告',
  '打印／存为 PDF',
  '无法保存？查看操作说明',
  '如何保存报告',
  '点击右上角「…」',
  '选择「在浏览器打开」',
  '网页无法替你自动打开 Safari 或 Chrome'
]) {
  assert.ok(resultsSource.includes(text), `missing export guidance: ${text}`);
}
assert.ok(resultsSource.includes('window.print()'), 'standard-browser native print path missing');
assert.ok(resultsSource.includes('showModal'), 'semantic dialog path missing');
assert.ok(resultsSource.includes("setAttribute('open', '')"), 'dialog fallback path missing');
assert.ok(html.includes('.export-help-dialog'), 'export dialog CSS missing');
assert.ok(html.includes('.export-help-link'), 'fallback help-link CSS missing');

console.log('WeChat mobile and terminology contract: PASS');
