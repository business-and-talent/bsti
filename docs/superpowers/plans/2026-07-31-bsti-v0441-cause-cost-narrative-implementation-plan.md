# BSTI V0.4.4.1 Cause–Cost Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the BSTI V0.4.4.1 report from a neutral tension explanation to a deterministic “cause exposed → operating cost made visible → business-result boundary preserved” narrative.

**Architecture:** Keep the BSTI-40 V0.4.3 instrument, scoring module, focus routing, thresholds, and four-quadrant model unchanged. Extend the embedded report compiler in `index.html` with composable cause/cost copy, combination hooks, and dynamic cost-chain output; extend the embedded results renderer to display the new summary, focus-quadrant cause/cost sections, and a combination-specific +1 cost chain. Add dependency-free Node regression tests that decode the embedded data-URL modules directly from `index.html`.

**Tech Stack:** Static HTML/CSS, browser ES modules embedded as base64 data URLs, Node.js built-ins only, Git.

## Global Constraints

- Instrument remains `BSTI-40 V0.4.3`.
- Report Rules and BSTM Narrative Compiler remain `V0.4.4.1`.
- Do not modify the 40 items, Likert scoring, quadrant totals, five-point focus breakpoint, 15 combination keys, evidence thresholds, or quadrant definitions.
- Preserve “+1 is not a fifth quadrant” and the business-result causal boundary.
- Direct operating costs may be stated as hypotheses requiring field verification; customer, delivery, growth, profit, cash flow, and other business outcomes must remain data-verification hypotheses.
- Non-focus / 30-point contextual signals must not be amplified into a concentrated diagnosis.
- No new runtime dependencies, build system, framework, or separate backend.

---

## File Structure

- Modify: `index.html`
  - Embedded `buildReportViewModel` module: narrative rules, cause/cost model, dynamic cost chain.
  - Embedded `renderResults` module: report presentation.
  - CSS: summary hierarchy, cause/cost sections, cost-chain visualization, print rules.
- Create: `tests/report-v0441-cause-cost.mjs`
  - Decodes embedded modules from `index.html`.
  - Runs deterministic regression cases without external packages.
- Create: `tests/report-v0441-static-contract.mjs`
  - Verifies frozen instrument/scoring boundaries and required presentation labels.
- Existing spec: `docs/superpowers/specs/2026-07-31-bsti-v0441-cause-cost-narrative-design.md`

---

### Task 1: Freeze the Current Baseline and Add Failing Narrative Tests

**Files:**
- Create: `tests/report-v0441-cause-cost.mjs`
- Create: `tests/report-v0441-static-contract.mjs`
- Read: `index.html`
- Read: `docs/superpowers/specs/2026-07-31-bsti-v0441-cause-cost-narrative-design.md`

**Interfaces:**
- Consumes: embedded `scoreAssessment`, `buildReportViewModel`, `instrument`.
- Produces: executable regression commands:
  - `node tests/report-v0441-cause-cost.mjs`
  - `node tests/report-v0441-static-contract.mjs`

- [ ] **Step 1: Record the clean branch state and current diff**

Run:

```bash
git status --short
git log -2 --oneline
git diff --stat v0.4.4...HEAD
```

Expected:

- Current branch: `feat/report-v0441-polish`.
- The design-spec commit `90eb016` is present.
- `index.html` contains the uncommitted V0.4.4.1 polish changes.
- No unrelated files are modified.

- [ ] **Step 2: Create a dependency-free embedded-module loader in the narrative test**

Create `tests/report-v0441-cause-cost.mjs` with:

```javascript
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
  return Function(`"use strict"; return (${match[1]});`)();
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

// WE 50 + ITs 40 + I 30 + IT 30
{
  const report = build({ I: 30, WE: 50, IT: 30, ITs: 40 });

  assert.deepEqual(report.profile.focus_group, ['WE']);
  assert.equal(report.quadrants.find((q) => q.id === 'WE').priority_level, 'primary');
  assert.equal(report.quadrants.find((q) => q.id === 'ITs').priority_level, 'parallel');

  assert.match(report.causeCostSummary.hook, /共识.*太快|数据.*同一个现实/);
  assert.match(report.causeCostSummary.cause, /权威|惯例|讨论范围/);
  assert.match(report.causeCostSummary.directCost, /修正.*更晚|返工|资源错配|老板/);
  assert.match(report.causeCostSummary.boundary, /不是经营结果结论|数据核验/);

  assert.ok(report.costChain.steps.length >= 6);
  assert.match(report.costChain.steps.join(' → '), /讨论范围|现实|决定|新信息|返工|老板/);
  assert.match(report.costChain.resultBoundary, /客户|交付|增长|利润|现金流/);
}

// All four high: do not manufacture a single cause
{
  const report = build({ I: 50, WE: 50, IT: 50, ITs: 50 });

  assert.deepEqual(report.profile.focus_group, ['I', 'WE', 'IT', 'ITs']);
  assert.match(report.causeCostSummary.hook, /不是单一位置|多个位置|四个位置/);
  assert.doesNotMatch(report.causeCostSummary.cause, /唯一原因|直接导致/);
  assert.ok(report.costChain.steps.length >= 6);
}

// Flat contextual profile: do not overstate
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
```

- [ ] **Step 3: Run the narrative test and verify RED**

Run:

```bash
node tests/report-v0441-cause-cost.mjs
```

Expected: FAIL because fields such as `causeCostSummary`, `costChain`, and `priority_level` do not yet exist.

- [ ] **Step 4: Create the frozen-boundary static test**

Create `tests/report-v0441-static-contract.mjs` with:

```javascript
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

const currentInstrument = html.match(/const instrument = (\{.*?\});\n\s*const pages =/s)?.[1];
const baselineInstrument = baseline.match(/const instrument = (\{.*?\});\n\s*const pages =/s)?.[1];

assert.equal(currentInstrument, baselineInstrument, 'instrument changed from v0.4.4');
assert.equal(
  importPayload(html, 'scoreAssessment'),
  importPayload(baseline, 'scoreAssessment'),
  'scoring module changed from v0.4.4'
);

for (const requiredText of [
  '为什么会这样',
  '你可能正在付出的代价',
  '经营代价链',
  '经营结果仍需数据核验'
]) {
  assert.ok(html.includes(requiredText), `missing presentation label: ${requiredText}`);
}

console.log('V0.4.4.1 frozen boundaries: PASS');
```

- [ ] **Step 5: Run the static test and verify RED**

Run:

```bash
node tests/report-v0441-static-contract.mjs
```

Expected: FAIL only on missing presentation labels; instrument and scoring assertions must already pass.

---

### Task 2: Implement the Cause–Cost Report Model

**Files:**
- Modify: `index.html` embedded `buildReportViewModel` module.
- Test: `tests/report-v0441-cause-cost.mjs`

**Interfaces:**
- Consumes:
  - Existing `profile.focus_group`.
  - Existing `profile.combination_key`.
  - Existing per-quadrant `evidence_mode`, `score`, `primary_blocks`.
- Produces:
  - `report.causeCostSummary`
  - `report.costChain`
  - `quadrant.priority_level`
  - `quadrant.cause_copy`
  - `quadrant.direct_cost_copy`

- [ ] **Step 1: Add per-quadrant cause and directly verifiable cost copy**

Inside the report compiler, define:

```javascript
const CAUSE_COST_COPY = {
  I: {
    cause: '行动压力、外部比较与既有经验，可能让老板更快进入解释和行动，而缩短重新观察现实的时间。',
    directCost: '新的信息较难真正改变原有理解；决定可能更快形成，但问题定义与观察范围更容易保持不变。'
  },
  WE: {
    cause: '权威、惯例、风险判断与关系压力，可能在讨论真正展开以前先缩小可被认真比较的选项。',
    directCost: '会议更快形成一致，正式共识与私下意见的落差却可能扩大；团队执行答案的速度提高，共同创造答案的能力下降。'
  },
  IT: {
    cause: '复杂事项缺少稳定承接路径时，会持续回到老板或少数关键人员，由个人介入维持推进。',
    directCost: '返工、插单、重复确认与工作回流持续占用注意力；培养人、改善系统和未来工作不断被推迟。'
  },
  ITs: {
    cause: '市场、一线、报表与资源状态没有及时被整合成同一个可共同更新的现实版本。',
    directCost: '计划继续推进，真正修正却越来越晚；资源可能继续投向旧方向，偏差直到执行或经营结果显现后才被重新定义。'
  }
};
```

- [ ] **Step 2: Add 15 deterministic combination hooks**

Add `CAUSE_COST_HOOKS` using the existing canonical combination keys. Every key must exist exactly once:

```javascript
const CAUSE_COST_HOOKS = {
  I: '你最需要警惕的，可能不是缺少行动，而是行动已经快过了重新看清现实。',
  WE: '你最需要警惕的，可能不是团队没有共识，而是共识形成得太快。',
  IT: '你最需要警惕的，可能不是事情没人做，而是越来越多事情只能靠少数人做完。',
  ITs: '你最需要警惕的，可能不是企业没有数据，而是数据始终没有汇成同一个现实。',
  'I+WE': '你和团队可能都在快速形成答案，但真正改变理解与选择范围的信息正在减少。',
  'I+IT': '你可能一边快速判断，一边亲自承接；事情继续推进，重新观察和系统承接的空间却同时缩小。',
  'I+ITs': '个人经验与正式系统可能正在共同依赖一个熟悉、但没有充分更新的现实版本。',
  'WE+IT': '前端没有充分展开的意见，可能在执行阶段以返工、协调和老板重新介入的形式回来。',
  'WE+ITs': '你最需要警惕的，可能不是团队没有共识，而是共识形成得太快；也不是企业没有数据，而是不同数据始终没有汇成同一个现实。',
  'IT+ITs': '复杂现实没有被及时整合，复杂事项便更容易持续集中到少数人手上。',
  'I+WE+IT': '理解、选择与承载同时加速时，未被充分看见和讨论的复杂性可能在执行后重新回来。',
  'I+WE+ITs': '个人理解、团队共识与正式系统可能共同巩固同一个答案，却没有充分吸收正在变化的现实。',
  'I+IT+ITs': '老板既承担解释现实，也承担处理后果；个人观察空间与系统更新时间可能同时被压缩。',
  'WE+IT+ITs': '没有在选择阶段充分进入讨论的问题，可能在执行阶段反复出现，而系统仍来不及形成新的共同判断。',
  'I+WE+IT+ITs': '本次没有单一位置可以独立解释整体轮廓；感知、选择、承载与判断可能同时参与张力形成与转移。'
};
```

- [ ] **Step 3: Add the priority-level classifier without changing focus routing**

Implement:

```javascript
function priorityLevel(id, analysis, profile) {
  if (profile.focus_group.includes(id)) return 'primary';
  if (
    analysis.score >= 40 &&
    analysis.evidence_mode === 'concentrated_agreement'
  ) return 'parallel';
  return 'observe';
}
```

This is a report-reading priority only. It must not modify `focus_group`, `combination_key`, or breakpoint calculations.

- [ ] **Step 4: Build deterministic cause/cost summary fields**

Implement a helper returning:

```javascript
{
  hook: string,
  cause: string,
  directCost: string,
  boundary: string,
  focusLabels: string[]
}
```

Rules:

- `hook` comes from `CAUSE_COST_HOOKS[profile.combination_key]`.
- `cause` composes the selected primary and parallel quadrants without repeating identical sentences.
- `directCost` states directly verifiable operating costs.
- `boundary` states that business outcomes are not concluded and require the latest three major decisions plus real operating data.
- Avoid stacking “可能／未必／核验” in every sentence; one boundary statement is sufficient.

- [ ] **Step 5: Build the dynamic cost chain**

Implement:

```javascript
function buildCostChain(profile, quadrants) {
  // returns { title, steps, resultBoundary }
}
```

Required behavior:

- WE contributes: `讨论范围提前收缩`.
- ITs contributes: `不同现实没有被充分整合`.
- I contributes: `熟悉解释较快成为判断基础`.
- IT contributes: `复杂事项回到老板或少数关键人员`.
- Always include a decision/update step.
- For WE+ITs, the chain must include:
  1. 讨论范围提前收缩
  2. 不同现实没有被充分整合
  3. 熟悉答案较快成为正式决定
  4. 新信息难以真正改写决定
  5. 偏差在执行后才显现
  6. 返工、资源错配与问题回流
  7. 老板重新介入并承担修正代价
- Put customer/delivery/growth/profit/cash-flow wording only in `resultBoundary`.

- [ ] **Step 6: Attach the new model to the existing report view model**

Extend each quadrant:

```javascript
{
  ...existingFields,
  priority_level,
  cause_copy: CAUSE_COST_COPY[id].cause,
  direct_cost_copy: CAUSE_COST_COPY[id].directCost
}
```

Extend the report:

```javascript
{
  ...existingFields,
  causeCostSummary,
  costChain
}
```

Do not remove existing fields used by the current renderer.

- [ ] **Step 7: Run the narrative test and verify GREEN**

Run:

```bash
node tests/report-v0441-cause-cost.mjs
```

Expected:

```text
V0.4.4.1 cause-cost narrative: PASS
```

---

### Task 3: Render the Cause, Operating Cost, and Dynamic Cost Chain

**Files:**
- Modify: `index.html` embedded `renderResults` module.
- Modify: `index.html` CSS.
- Test: `tests/report-v0441-static-contract.mjs`

**Interfaces:**
- Consumes:
  - `report.causeCostSummary`
  - `report.costChain`
  - `quadrant.priority_level`
  - `quadrant.cause_copy`
  - `quadrant.direct_cost_copy`
- Produces:
  - Homepage cause-cost result panel.
  - Focus-quadrant cause/cost blocks.
  - Dynamic +1 cost-chain cards.

- [ ] **Step 1: Replace the homepage summary content hierarchy**

Keep the existing visual slot but render:

```html
<div class="cause-cost-summary">
  <p class="cause-cost-hook">...</p>
  <div class="cause-cost-section">
    <span>为什么会这样</span>
    <p>...</p>
  </div>
  <div class="cause-cost-section cause-cost-section--cost">
    <span>你可能正在付出的代价</span>
    <p>...</p>
  </div>
  <p class="cause-cost-boundary">...</p>
</div>
```

The first visible sentence must be the hook, not the focus-breakpoint explanation.

- [ ] **Step 2: Update focus and parallel quadrant cards**

For `priority_level === 'primary'` or `'parallel'`, render two explicit blocks after the short quadrant mirror:

```html
<div class="detail-block cause-block">
  <h4>为什么会这样</h4>
  <p>...</p>
</div>
<div class="detail-block direct-cost-block">
  <h4>你可能正在付出的代价</h4>
  <p>...</p>
</div>
```

Retain:

- primary paths;
- signal distribution;
- score and evidence badge.

For `priority_level === 'observe'`, keep the compact V0.4.4.1 observation copy and do not add the expanded cost block.

- [ ] **Step 3: Replace generic +1 body emphasis with the dynamic cost chain**

Keep the heading:

```text
＋1｜决策与经营结果显影
```

Add:

```html
<div class="cost-chain">
  <h3>经营代价链</h3>
  ...ordered steps...
</div>
<p class="result-verification-boundary">
  <strong>经营结果仍需数据核验</strong>
  ...
</p>
```

The explanatory paragraph may remain concise, but must not repeat the entire chain in prose.

- [ ] **Step 4: Add minimal CSS**

Add styles for:

- `.cause-cost-hook`
- `.cause-cost-section`
- `.cause-cost-section--cost`
- `.cause-cost-boundary`
- `.cause-block`
- `.direct-cost-block`
- `.cost-chain`
- `.cost-chain-step`
- `.cost-chain-arrow`
- `.result-verification-boundary`

Requirements:

- No new color system.
- Use existing purple, ink, muted, line, and surface variables.
- The cost block may use stronger typography, not alarm-red styling.
- Preserve mobile single-column layout.
- In print, each cost-chain step should avoid splitting; the whole chain may span pages.

- [ ] **Step 5: Run the static contract test and verify GREEN**

Run:

```bash
node tests/report-v0441-static-contract.mjs
```

Expected:

```text
V0.4.4.1 frozen boundaries: PASS
```

---

### Task 4: Regression and Manual Smoke Verification

**Files:**
- Verify: `index.html`
- Verify: `tests/report-v0441-cause-cost.mjs`
- Verify: `tests/report-v0441-static-contract.mjs`

**Interfaces:**
- Consumes: final local report implementation.
- Produces: verified V0.4.4.1 candidate.

- [ ] **Step 1: Run all automated checks**

Run:

```bash
node tests/report-v0441-cause-cost.mjs
node tests/report-v0441-static-contract.mjs
git diff --check
```

Expected: both PASS, no whitespace errors.

- [ ] **Step 2: Verify all 15 combination keys still exist**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import base64, re

html = Path("index.html").read_text()
m = re.search(
    r"import \{ buildReportViewModel \} from 'data:text/javascript;base64,([^']+)'",
    html,
)
assert m
source = base64.b64decode(m.group(1)).decode()
keys = [
    "I","WE","IT","ITs",
    "I+WE","I+IT","I+ITs","WE+IT","WE+ITs","IT+ITs",
    "I+WE+IT","I+WE+ITs","I+IT+ITs","WE+IT+ITs","I+WE+IT+ITs"
]
for key in keys:
    assert f"'{key}'" in source or f"{key}:" in source, key
print("V0.4.4.1 combination coverage: PASS (15 cases)")
PY
```

- [ ] **Step 3: Run the primary manual smoke case**

Open:

```bash
open index.html
```

Use:

```text
I = 30
WE = 50
IT = 30
ITs = 40
```

Verify:

- The homepage begins with the WE+ITs anti-intuitive hook.
- The homepage explains cause before score-routing language.
- The homepage states direct operating costs.
- WE is “首要观察”.
- ITs is “同步优先核验”.
- WE and ITs each show “为什么会这样” and “你可能正在付出的代价”.
- I and IT remain compact observations.
- +1 shows the seven-step WE→ITs operating-cost chain.
- Customer, delivery, growth, profit, and cash flow appear only in the data-verification boundary.
- PDF remains readable and does not introduce broken cards.

- [ ] **Step 4: Run a multi-focus manual smoke case**

Use all four quadrants at 50, or another profile that produces four focus quadrants.

Verify:

- The hook states there is no single explanatory location.
- The report does not use “唯一原因” or direct-causality language.
- The dynamic chain covers multiple positions without becoming an unbounded essay.
- The result boundary remains visible.

- [ ] **Step 5: Review the final diff**

Run:

```bash
git status --short
git diff --stat
git diff -- docs/superpowers/specs/2026-07-31-bsti-v0441-cause-cost-narrative-design.md
git diff -- index.html tests/
```

Expected:

- Spec file is unchanged after commit.
- Only `index.html` and the two test files are part of the implementation.
- No unrelated files.

---

### Task 5: Commit, Push, PR, and Release Candidate Verification

**Files:**
- Commit: `index.html`
- Commit: `tests/report-v0441-cause-cost.mjs`
- Commit: `tests/report-v0441-static-contract.mjs`

- [ ] **Step 1: Commit the green implementation**

Run:

```bash
git add index.html tests/report-v0441-cause-cost.mjs tests/report-v0441-static-contract.mjs
git commit -m "feat: add cause-cost narrative to BSTI report"
```

- [ ] **Step 2: Push the branch**

Run:

```bash
git push -u origin feat/report-v0441-polish
```

- [ ] **Step 3: Create the pull request**

Run:

```bash
gh pr create \
  --base main \
  --head feat/report-v0441-polish \
  --title "BSTI Report Cause-Cost Narrative V0.4.4.1" \
  --body "## Summary

- Preserve BSTI-40 V0.4.3 instrument and scoring
- Preserve V0.4.4.1 focus routing and evidence thresholds
- Add cause-first and operating-cost-first report summary
- Add explicit cause and direct-cost sections for primary and parallel-priority quadrants
- Add dynamic combination-specific operating-cost chain
- Preserve business-result data-verification and causal boundaries
- Add dependency-free regression tests

## Verification

- Cause-cost narrative regression: PASS
- Frozen instrument and scoring boundaries: PASS
- 15 combination keys: PASS
- WE 50 / ITs 40 / I 30 / IT 30 manual smoke: PASS
- Multi-focus manual smoke: PASS
- PDF smoke: PASS"
```

- [ ] **Step 4: Inspect the PR before merge**

Run:

```bash
gh pr view --web
```

Verify:

- Files changed are limited to `index.html`, the two tests, and the already committed spec.
- No instrument, item, scoring, or unrelated product changes.
- PR description matches actual verification.

- [ ] **Step 5: Merge only after final founder review**

Run:

```bash
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
```

Do not create a new tag until the production Pages smoke test passes. Since the public semantic version remains V0.4.4.1, tag naming should be decided at release time rather than during implementation.
