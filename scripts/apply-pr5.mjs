import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceRequired(source, from, to, label) {
  assert.ok(source.includes(from), `missing transformation anchor: ${label}`);
  return source.replace(from, to);
}

function transformResultsModule(source) {
  if (!source.includes('export function detectClientEnvironment')) {
    source = replaceRequired(
      source,
      "const SCALE_LEVELS = [10, 20, 30, 40, 50];\n\n",
      `const SCALE_LEVELS = [10, 20, 30, 40, 50];

export function detectClientEnvironment(userAgent = navigator.userAgent || '') {
  const isWeCom = /wxwork/i.test(userAgent);
  const isWeChat = /MicroMessenger/i.test(userAgent);
  return { isWeCom, isWeChat, isWeChatFamily: isWeCom || isWeChat };
}

export function performReportExport(environment, { print, openHelp }) {
  if (environment.isWeChatFamily) {
    openHelp();
    return 'help';
  }
  print();
  return 'print';
}

`,
      'results helpers'
    );
  }

  if (!source.includes('const environment = detectClientEnvironment();')) {
    source = source.replace(
      /(const leaderScore = [^;]+;\n)/,
      '$1  const environment = detectClientEnvironment();\n'
    );
    assert.ok(source.includes('const environment = detectClientEnvironment();'), 'environment initialization missing');
  }

  const oldActions = /<div class="topbar-actions">\s*<button class="button button--secondary" id="print-report">打印／存为 PDF<\/button>\s*<button class="button button--ghost" id="reset-assessment">重新测试<\/button>\s*<\/div>/;
  if (!source.includes('id="export-help-link"')) {
    assert.match(source, oldActions, 'results action markup anchor missing');
    source = source.replace(oldActions, `<div class="topbar-actions">
          <div class="export-actions">
            <button class="button button--secondary" id="print-report">\${environment.isWeChatFamily ? '保存／导出报告' : '打印／存为 PDF'}</button>
            <button class="export-help-link no-print" id="export-help-link" type="button">无法保存？查看操作说明</button>
          </div>
          <button class="button button--ghost" id="reset-assessment">重新测试</button>
        </div>`);
  }

  if (!source.includes('id="export-help-dialog"')) {
    source = replaceRequired(
      source,
      `      </header>

      <section class="result-hero report-section">`,
      `      </header>

      <dialog class="export-help-dialog no-print" id="export-help-dialog" aria-labelledby="export-help-title">
        <div class="export-help-card">
          <p class="eyebrow">报告导出</p>
          <h2 id="export-help-title">如何保存报告</h2>
          <p>当前微信环境暂不支持直接导出 PDF，请按以下步骤操作：</p>
          <ol>
            <li>点击右上角「…」</li>
            <li>选择「在浏览器打开」</li>
            <li>再使用「打印／存为 PDF」</li>
          </ol>
          <p class="export-help-note">网页无法替你自动打开 Safari 或 Chrome，需要由你在微信菜单中手动选择。</p>
          <button class="button button--primary button--full" id="close-export-help" type="button">我知道了</button>
        </div>
      </dialog>

      <section class="result-hero report-section">`,
      'export dialog markup'
    );
  }

  if (!source.includes("const exportDialog = container.querySelector('#export-help-dialog');")) {
    source = replaceRequired(
      source,
      "  container.querySelector('#print-report').addEventListener('click', () => window.print());\n",
      `  const exportDialog = container.querySelector('#export-help-dialog');
  const openExportHelp = () => {
    if (typeof exportDialog.showModal === 'function') {
      if (!exportDialog.open) exportDialog.showModal();
    } else {
      exportDialog.setAttribute('open', '');
    }
  };
  const closeExportHelp = () => {
    if (typeof exportDialog.close === 'function' && exportDialog.open) exportDialog.close();
    else exportDialog.removeAttribute('open');
  };
  container.querySelector('#print-report').addEventListener('click', () => {
    performReportExport(environment, { print: () => window.print(), openHelp: openExportHelp });
  });
  container.querySelector('#export-help-link').addEventListener('click', openExportHelp);
  container.querySelector('#close-export-help').addEventListener('click', closeExportHelp);
  exportDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeExportHelp();
  });
`,
      'export interaction binding'
    );
  }

  return source;
}

function transformEmbeddedModules(html) {
  let gateFound = false;
  let resultsFound = false;
  return html.replace(/data:text\/javascript;base64,([^']+)'/g, (full, payload) => {
    let source = Buffer.from(payload, 'base64').toString('utf8');
    const original = source;
    source = source.replaceAll('商业系统张力', '经营系统张力');

    if (source.includes('export function renderEligibilityGate')) {
      gateFound = true;
      if (!source.includes('class="gate-title"')) {
        source = replaceRequired(
          source,
          '<h1>看见你的经营系统张力，先从真实经营状态开始。</h1>',
          '<h1 class="gate-title">看见你的经营系统张力，先从真实经营状态开始。</h1>',
          'gate title class'
        );
      }
    }

    if (source.includes('export function renderResults')) {
      resultsFound = true;
      source = transformResultsModule(source);
    }

    if (source === original) return full;
    return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}'`;
  }).replace(/$/s, (tail) => {
    assert.ok(gateFound, 'gate module not found');
    assert.ok(resultsFound, 'results module not found');
    return tail;
  });
}

let html = read('index.html');
html = transformEmbeddedModules(html);
html = html.replaceAll('商业系统张力', '经营系统张力');

if (!html.includes('.gate-title { font-size:2rem; line-height:1.12; }')) {
  html = replaceRequired(
    html,
    '  h1 { font-size:2.25rem; }\n',
    '  h1 { font-size:2.25rem; }\n  .gate-title { font-size:2rem; line-height:1.12; }\n',
    'mobile gate-title CSS'
  );
}

if (!html.includes('.export-help-dialog {')) {
  html = replaceRequired(
    html,
    '@media (max-width: 860px) {\n',
    `.export-actions { display:grid; gap:3px; justify-items:stretch; }
.export-help-link { padding:4px 2px; border:0; background:transparent; color:var(--muted); font-size:.74rem; text-decoration:underline; text-underline-offset:3px; }
.export-help-dialog { width:min(calc(100% - 32px), 480px); max-height:calc(100% - 40px); padding:0; border:0; border-radius:22px; color:var(--ink); background:#fff; box-shadow:0 24px 80px rgba(17,24,39,.28); }
.export-help-dialog::backdrop { background:rgba(17,24,39,.55); }
.export-help-dialog[open] { position:fixed; inset:0; margin:auto; z-index:100; }
.export-help-card { padding:28px; }
.export-help-card h2 { margin:0; font-size:1.5rem; }
.export-help-card > p:not(.eyebrow) { color:#4b5563; line-height:1.7; }
.export-help-card ol { display:grid; gap:10px; margin:20px 0; padding-left:24px; color:#202123; line-height:1.6; }
.export-help-note { padding:12px 14px; border-radius:12px; background:var(--surface-soft); font-size:.84rem; }
@media (max-width: 620px) {
  .export-actions { width:100%; }
  .export-help-card { padding:24px 20px; }
}
@media print {
  .export-help-dialog, .export-help-link { display:none !important; }
}

@media (max-width: 860px) {
`,
    'export dialog CSS'
  );
}
write('index.html', html);

for (const path of ['privacy.html', 'report-usage.html']) {
  write(path, read(path).replaceAll('商业系统张力', '经营系统张力'));
}

let profileTest = read('tests/profile-capture-static-contract.mjs');
profileTest = replaceRequired(
  profileTest,
  "const current=instrument(html), frozen=instrument(baseline);const {technical_name_zh:_,...a}=current,{technical_name_zh:__,...b}=frozen;assert.deepEqual(a,b);assert.equal(current.technical_name_zh,'经营系统张力测量工具');assert.equal(payload(html,'scoreAssessment'),payload(baseline,'scoreAssessment'));",
  "const current=instrument(html), frozen=instrument(baseline);const {technical_name_zh:_,product_name:___,construct:____,...a}=current,{technical_name_zh:__,product_name:_____,construct:______,...b}=frozen;assert.deepEqual(a,b);assert.equal(current.technical_name_zh,'经营系统张力测量工具');assert.equal(current.product_name,'富老板经营系统张力测试');assert.equal(current.construct,'经营系统张力');assert.equal(payload(html,'scoreAssessment'),payload(baseline,'scoreAssessment'));",
  'profile frozen naming allowance'
);
write('tests/profile-capture-static-contract.mjs', profileTest);

let reportTest = read('tests/report-v0441-static-contract.mjs');
reportTest = replaceRequired(
  reportTest,
  "const { technical_name_zh: _currentTechnicalName, ...currentFrozenInstrument } = currentInstrument;\nconst { technical_name_zh: _baselineTechnicalName, ...baselineFrozenInstrument } = baselineInstrument;",
  "const { technical_name_zh: _currentTechnicalName, product_name: _currentProductName, construct: _currentConstruct, ...currentFrozenInstrument } = currentInstrument;\nconst { technical_name_zh: _baselineTechnicalName, product_name: _baselineProductName, construct: _baselineConstruct, ...baselineFrozenInstrument } = baselineInstrument;",
  'report frozen naming destructure'
);
reportTest = replaceRequired(
  reportTest,
  "assert.equal(currentInstrument.technical_name_zh, '经营系统张力测量工具');\n",
  "assert.equal(currentInstrument.technical_name_zh, '经营系统张力测量工具');\nassert.equal(currentInstrument.product_name, '富老板经营系统张力测试');\nassert.equal(currentInstrument.construct, '经营系统张力');\n",
  'report frozen naming assertions'
);
write('tests/report-v0441-static-contract.mjs', reportTest);

const oldDesignPath = 'docs/superpowers/specs/2026-07-31-bsti-assessment-profile-capture-design.md';
let oldDesign = read(oldDesignPath);
oldDesign = oldDesign.replace(
  /## Naming Revision[\s\S]*?## Compliance Documents/,
  `## Naming Revision

PR #3 originally changed only \`technical_name_zh\`. That partial naming decision was superseded by the founder-approved PR #5 terminology correction.

The active Chinese naming contract is now:

- \`technical_name_zh\`: \`经营系统张力测量工具\`;
- construct name: \`经营系统张力\`;
- product name: \`富老板经营系统张力测试\`.

This revision does **not** change:

- \`Business System Tension Instrument\`;
- \`Business System Tension Map\`;
- the \`BSTI\` or \`BSTM\` abbreviations;
- question text, scoring, breakpoints, evidence rules, or report compiler.

## Compliance Documents`
);
assert.ok(oldDesign.includes('founder-approved PR #5 terminology correction'), 'older design naming section not revised');
write(oldDesignPath, oldDesign);

const oldPlanPath = 'docs/superpowers/plans/2026-07-31-bsti-assessment-profile-capture-plan.md';
write(oldPlanPath, read(oldPlanPath).replaceAll('商业系统张力', '经营系统张力'));

assert.ok(!read('index.html').includes('商业系统张力'));
assert.ok(!read('privacy.html').includes('商业系统张力'));
assert.ok(!read('report-usage.html').includes('商业系统张力'));
console.log('PR #5 source transformation complete');
