# BSTI WeChat Mobile and Terminology Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the mobile startup-title scale, unify all active Chinese naming to `经营系统张力`, and replace the dead WeChat print action with explicit export guidance while preserving native printing in standard browsers.

**Architecture:** Preserve the current static single-file application and embedded Base64 ES modules. Add one permanent static contract test, modify only the gate presentation and results presentation modules, update compliance copy and active frozen-boundary tests, and keep all scoring/report-compiler payloads unchanged.

**Tech Stack:** Static HTML/CSS, embedded ES modules encoded as Base64 data URLs, Node.js 22 contract tests, GitHub Actions.

## Global Constraints

- `BSTI-40 V0.4.3` questions remain byte-for-byte unchanged.
- `scoreAssessment` remains byte-for-byte unchanged.
- `BSTM V0.4.4.1` narrative and cause-cost compiler remain unchanged.
- English names remain `Business System Tension Instrument` and `Business System Tension Map`.
- Chinese product and construct terminology is `经营系统张力`; active `商业系统张力` wording is forbidden.
- User-agent detection is presentation-only and may not affect identity, consent, answers, scores, report content, or persistence.
- PR #5 adds no backend PDF generation, CloudBase, database, OAuth, JS-SDK, Mini Program, WeCom callback, or distribution infrastructure.
- PR #5 remains Draft and unmerged until founder mobile review.

---

### Task 1: Add the failing PR #5 contract

**Files:**
- Create: `tests/wechat-mobile-terminology-contract.mjs`
- Modify: `.github/workflows/profile-capture.yml`

**Interfaces:**
- Consumes: `index.html`, `privacy.html`, `report-usage.html`, the embedded instrument object, the embedded gate module, and the embedded results module.
- Produces: one executable Node contract that locks terminology, mobile title scoping, environment detection, WeChat guidance, and standard-browser printing.

- [ ] **Step 1: Write the failing test**

Create a test that decodes all embedded ES modules and asserts:

```js
for (const file of [html, privacy, reportUsage]) {
  assert.ok(!file.includes('商业系统张力'));
}
assert.equal(instrument.product_name, '富老板经营系统张力测试');
assert.equal(instrument.construct, '经营系统张力');
assert.ok(decoded.includes('class="gate-title"'));
assert.match(html, /@media \(max-width: 700px\)[\s\S]*?\.gate-title\s*\{[^}]*font-size:\s*2rem[^}]*line-height:\s*1\.12/);
assert.ok(decoded.includes('function detectClientEnvironment'));
assert.ok(decoded.includes('/MicroMessenger/i'));
assert.ok(decoded.includes('/wxwork/i'));
assert.ok(decoded.includes('保存／导出报告'));
assert.ok(decoded.includes('无法保存？查看操作说明'));
assert.ok(decoded.includes('如何保存报告'));
assert.ok(decoded.includes('点击右上角「…」'));
assert.ok(decoded.includes('在浏览器打开'));
assert.ok(decoded.includes('window.print()'));
```

Import the detected helper module or extract it from the results module and verify:

```js
assert.equal(detectClientEnvironment('MicroMessenger').isWeChatFamily, true);
assert.equal(detectClientEnvironment('wxwork').isWeChatFamily, true);
assert.equal(detectClientEnvironment('Mozilla/5.0 Safari').isWeChatFamily, false);
```

Also assert that the WeChat-family branch opens guidance rather than invoking the print callback.

- [ ] **Step 2: Wire the test into CI**

Add before the existing suites:

```bash
node tests/wechat-mobile-terminology-contract.mjs
```

- [ ] **Step 3: Run CI and verify RED**

Expected: failure on the first forbidden `商业系统张力` occurrence or missing `gate-title`/environment-detection contract.

- [ ] **Step 4: Commit**

```bash
git add tests/wechat-mobile-terminology-contract.mjs .github/workflows/profile-capture.yml
git commit -m "test: define WeChat mobile and terminology contract"
```

### Task 2: Unify active Chinese terminology without changing logic

**Files:**
- Modify: `index.html`
- Modify: `privacy.html`
- Modify: `report-usage.html`
- Modify: `tests/profile-capture-static-contract.mjs`
- Modify: `tests/report-v0441-static-contract.mjs`
- Modify: `docs/superpowers/specs/2026-07-31-bsti-assessment-profile-capture-design.md`
- Modify: `docs/superpowers/plans/2026-07-31-bsti-assessment-profile-capture-plan.md`

**Interfaces:**
- Consumes: the frozen terminology table in the approved PR #5 design.
- Produces: active product metadata and user-facing copy containing only `经营系统张力`.

- [ ] **Step 1: Replace active terminology**

Apply exact Chinese replacements in the instrument metadata and presentation modules:

```text
富老板商业系统张力测试 → 富老板经营系统张力测试
商业系统张力图 → 经营系统张力图
商业系统张力 → 经营系统张力
```

Do not alter `Business System Tension Instrument`, `Business System Tension Map`, `BSTI`, or `BSTM`.

- [ ] **Step 2: Revise frozen-instrument comparison allowances**

In both baseline-comparison tests, omit only these three reviewed naming fields before deep comparison:

```js
const {
  technical_name_zh: _technical,
  product_name: _product,
  construct: _construct,
  ...currentFrozenInstrument
} = currentInstrument;
```

Assert the three current values explicitly and keep every other instrument field equal to the frozen baseline.

- [ ] **Step 3: Verify terminology and frozen logic**

Run:

```bash
node tests/wechat-mobile-terminology-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
```

Expected: PR #5 contract still fails only on the not-yet-implemented mobile/export behavior; all legacy suites pass.

- [ ] **Step 4: Commit**

```bash
git add index.html privacy.html report-usage.html tests docs/superpowers
 git commit -m "fix: unify经营系统张力 terminology"
```

### Task 3: Scope the startup title correction

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: the gate template in the embedded `renderEligibilityGate` module.
- Produces: `<h1 class="gate-title">…</h1>` plus a mobile-only `.gate-title` rule.

- [ ] **Step 1: Add a scoped title class**

Change only the startup gate title:

```html
<h1 class="gate-title">看见你的经营系统张力，先从真实经营状态开始。</h1>
```

- [ ] **Step 2: Add mobile CSS**

Inside the existing `@media (max-width: 700px)` block add:

```css
.gate-title { font-size:2rem; line-height:1.12; }
```

Keep the existing global mobile `h1` rule for other screens.

- [ ] **Step 3: Run the PR #5 contract**

Expected: mobile-title assertions pass; export assertions remain red.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: reduce startup title on mobile"
```

### Task 4: Add WeChat-aware export guidance

**Files:**
- Modify: `index.html`

**Interfaces:**
- Produces:
  - `detectClientEnvironment(userAgent: string): { isWeCom: boolean, isWeChat: boolean, isWeChatFamily: boolean }`
  - `openExportHelp(): void`
  - `closeExportHelp(): void`
  - standard-browser print path and WeChat guidance path.

- [ ] **Step 1: Add environment detection**

Use exactly:

```js
function detectClientEnvironment(userAgent = navigator.userAgent || '') {
  const isWeCom = /wxwork/i.test(userAgent);
  const isWeChat = /MicroMessenger/i.test(userAgent);
  return { isWeCom, isWeChat, isWeChatFamily: isWeCom || isWeChat };
}
```

- [ ] **Step 2: Render export controls and semantic dialog**

The results top bar must render:

```html
<button id="print-report">${environment.isWeChatFamily ? '保存／导出报告' : '打印／存为 PDF'}</button>
<button class="export-help-link" id="export-help-link">无法保存？查看操作说明</button>
<dialog class="export-help-dialog" id="export-help-dialog" aria-labelledby="export-help-title">
  <h2 id="export-help-title">如何保存报告</h2>
  <ol>
    <li>点击右上角「…」</li>
    <li>选择「在浏览器打开」</li>
    <li>再使用「打印／存为 PDF」</li>
  </ol>
  <p>网页无法替你自动打开 Safari 或 Chrome，需要由你在微信菜单中手动选择。</p>
  <button id="close-export-help">我知道了</button>
</dialog>
```

Include a non-`dialog.showModal` fallback using the `open` attribute so older embedded browsers still display the panel.

- [ ] **Step 3: Bind environment-specific behavior**

```js
printButton.addEventListener('click', () => {
  if (environment.isWeChatFamily) openExportHelp();
  else window.print();
});
helpButton.addEventListener('click', openExportHelp);
closeButton.addEventListener('click', closeExportHelp);
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeExportHelp();
});
```

- [ ] **Step 4: Add local responsive dialog styles**

Add dependency-free styles for backdrop, content spacing, ordered steps, close button, and mobile width. Hide the fallback help link and dialog in print output.

- [ ] **Step 5: Run all contract tests**

```bash
node tests/wechat-mobile-terminology-contract.mjs
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "fix: guide WeChat users through report export"
```

### Task 5: Draft PR verification and founder review handoff

**Files:**
- Verify: all PR #5 files

**Interfaces:**
- Produces: Draft PR #5 with fresh CI evidence and a mobile review URL.

- [ ] **Step 1: Run complete verification**

```bash
node tests/wechat-mobile-terminology-contract.mjs
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
git status --short
test -z "$(git status --porcelain)"
```

- [ ] **Step 2: Open Draft PR**

Title:

```text
PR #5｜WeChat Mobile and Terminology Correction
```

- [ ] **Step 3: Record review evidence**

The PR body must state:

- terminology unified to `经营系统张力`;
- gate-only mobile title reduction;
- WeChat/WeCom guidance instead of dead printing;
- standard-browser native printing preserved;
- no question, scoring, report compiler, backend, or persistence changes;
- Draft/unmerged pending founder review.
