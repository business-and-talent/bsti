# BSTI P0 Platform Foundation Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add machine-readable environment and frozen-boundary contracts that prevent GitHub Pages from becoming a real-data submission path and preserve the frozen BSTI/BSTM P0 boundaries.

**Architecture:** Keep the current static site unchanged. Add two JSON contracts under `platform/contracts`, enforce them through one Node static-contract test, and extend the existing GitHub Actions workflow to run the new test with the three existing regression suites.

**Tech Stack:** Static HTML, embedded Base64 ES modules, Node.js 22, JSON, GitHub Actions.

## Global Constraints

- `BSTI-40 V0.4.3` remains unchanged.
- `BSTM V0.4.4.1` remains unchanged.
- The browser compiler remains authoritative for P0.
- GitHub Pages is development/demo only and must not collect real identifiable data.
- Production hosting is Tencent Cloud CloudBase in Shanghai and remains launch-gated.
- Revenue and headcount are context-only and must not affect scores.
- No API, MySQL, persistence, complexity-context rendering, WeChat, WeCom, Eliy, CRM, booking, or payment work enters PR #4.

---

### Task 1: Add the failing platform-foundation contract

**Files:**
- Create: `tests/p0-platform-foundation-contract.mjs`
- Modify: `.github/workflows/profile-capture.yml`

**Interfaces:**
- Consumes: existing `index.html`, the two planned JSON contracts, this design document, and the existing CI workflow.
- Produces: one executable Node contract test named `tests/p0-platform-foundation-contract.mjs`.

- [ ] **Step 1: Write the failing test**

Create a Node test that reads:

```js
const environments = JSON.parse(fs.readFileSync(new URL('../platform/contracts/environments.v0.1.json', import.meta.url), 'utf8'));
const boundaries = JSON.parse(fs.readFileSync(new URL('../platform/contracts/frozen-boundaries.v0.1.json', import.meta.url), 'utf8'));
```

Assert the exact development, production, version, scoring-input, context-only, backend, and excluded-integration contracts specified by the design. Decode the embedded JavaScript modules in `index.html` and assert that the visible warning `当前为开发演示环境，请勿填写真实个人或企业资料。` remains present.

- [ ] **Step 2: Add the test command to CI**

Insert this command before the existing profile test:

```bash
node tests/p0-platform-foundation-contract.mjs
```

- [ ] **Step 3: Run CI and verify RED**

Expected result: the new test fails because `platform/contracts/environments.v0.1.json` and `platform/contracts/frozen-boundaries.v0.1.json` do not yet exist.

- [ ] **Step 4: Commit the red test**

```bash
git add tests/p0-platform-foundation-contract.mjs .github/workflows/profile-capture.yml
git commit -m "test: define P0 platform foundation guardrails"
```

### Task 2: Add the minimum environment contract

**Files:**
- Create: `platform/contracts/environments.v0.1.json`

**Interfaces:**
- Produces: `schemaVersion`, `defaultEnvironment`, and exact `development` and `production` objects consumed by the contract test and future API configuration work.

- [ ] **Step 1: Create the development contract**

Set:

```json
{
  "hostClass": "github_pages",
  "realIdentifiableDataAllowed": false,
  "submissionMode": "disabled",
  "apiMode": "disabled",
  "visibleDemoMarkerRequired": true
}
```

- [ ] **Step 2: Create the production contract**

Set CloudBase/Shanghai, `submissionMode` to `launch_gated`, `submissionEnabledByDefault` to `false`, `frontendSecretsAllowed` to `false`, and include the seven frozen activation requirement keys.

- [ ] **Step 3: Run the new contract test**

Expected result: still fails because the frozen-boundary contract does not yet exist.

- [ ] **Step 4: Commit**

```bash
git add platform/contracts/environments.v0.1.json
git commit -m "feat: add P0 environment contract"
```

### Task 3: Add the frozen-boundary contract

**Files:**
- Create: `platform/contracts/frozen-boundaries.v0.1.json`

**Interfaces:**
- Produces: machine-readable instrument, report, scoring-input, context-only, backend, handoff, and excluded-integration boundaries.

- [ ] **Step 1: Encode frozen versions and compiler authority**

Use `BSTI-40` / `V0.4.3`, `BSTM` / `V0.4.4.1`, and `browser` as the authoritative compiler.

- [ ] **Step 2: Encode input isolation**

Set `scoreInputs` to only `answers`; set `contextOnlyInputs` to `revenueBand` and `headcountBand`.

- [ ] **Step 3: Encode backend and integration boundaries**

Allow only validation, storage, association, and access control for the future P0 backend; set backend scoring/report recompilation to false; set handoff to configurable/provider-neutral; list the explicitly excluded integrations.

- [ ] **Step 4: Run all tests**

```bash
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
```

Expected result: all pass.

- [ ] **Step 5: Commit**

```bash
git add platform/contracts/frozen-boundaries.v0.1.json
git commit -m "feat: add frozen BSTI P0 boundary contract"
```

### Task 4: Document repository use and verify the complete branch

**Files:**
- Modify: `README.md`
- Verify: all files in PR #4

**Interfaces:**
- Produces: a minimal repository entry point for running the contract suites and understanding the demo/production boundary.

- [ ] **Step 1: Add README commands and environment note**

Document the four Node test commands, state that GitHub Pages is demo-only, and state that production submission remains disabled until the CloudBase Shanghai launch gates are completed.

- [ ] **Step 2: Run the complete verification suite**

```bash
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
git status --short
test -z "$(git status --porcelain)"
```

Expected result: four PASS lines, no diff errors, and a clean checkout.

- [ ] **Step 3: Open Draft PR #4**

Title:

```text
PR #4｜P0 Platform Foundation Guardrails
```

The PR remains limited to repository contracts and guardrails. It does not implement the backend API, MySQL, persistence, or complexity-context module.
