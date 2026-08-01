# BSTI WeChat Mobile and Terminology Correction Design

**Status:** Approved for implementation  
**Date:** 2026-08-01  
**Repository:** `business-and-talent/bsti`  
**Branch:** `feat/wechat-mobile-terminology-v01`  
**Baseline:** `9a0110d2421e0eaa91b424ed81eb98a004f18317` / merged PR #4

## 1. Goal

Correct two founder-reviewed issues without changing the 40 items, scoring, evidence rules, report routing, or cause-cost compiler:

1. optimize the startup-page title for mobile screens;
2. make report export behavior explicit and non-broken inside WeChat;
3. replace every user-facing and machine-readable Chinese occurrence of `商业系统张力` with the frozen term `经营系统张力`.

The English names remain unchanged:

- `Business System Tension Instrument`;
- `Business System Tension Map`;
- abbreviations `BSTI` and `BSTM`.

## 2. Frozen Terminology Contract

The Chinese product and construct terminology is unified. There is no longer a product/construct split.

Required replacements include, at minimum:

| Current | Required |
|---|---|
| 富老板商业系统张力测试 | 富老板经营系统张力测试 |
| 商业系统张力 | 经营系统张力 |
| 商业系统张力图 | 经营系统张力图 |
| 看见你的商业系统张力 | 看见你的经营系统张力 |
| 你的商业系统张力轮廓 | 你的经营系统张力轮廓 |
| 生成本次商业系统张力图 | 生成本次经营系统张力图 |

The replacement scope includes:

- embedded instrument metadata (`product_name`, `construct`);
- startup and assessment/review flows;
- report titles, headings, buttons, captions, accessibility labels, and print output;
- privacy and report-use pages;
- static contract tests and documentation where they describe the active frozen naming contract.

Historical records may retain old terminology only when they are explicitly marked as superseded historical decisions. Active design/plan/test contracts must use the frozen term.

## 3. Mobile Startup Title

The startup-page hero title is visually oversized at mobile widths. The correction must be scoped to the startup gate only.

### Required behavior

- Desktop title sizing remains unchanged.
- At viewport widths up to `700px`, the startup gate title uses approximately `2rem` (`32px`) with a line height around `1.12`.
- Other `h1` elements, including report titles and review screens, must not inherit this reduction unless already governed by their own responsive styles.
- The gate title remains prominent and retains the existing copy, except for the terminology replacement.

### Implementation boundary

Add a specific class to the startup gate title (for example, `gate-title`) rather than changing the global mobile `h1` rule.

## 4. WeChat Environment Detection

The page may inspect `navigator.userAgent` only to choose export guidance and button behavior.

### Detection contract

```js
function detectClientEnvironment(userAgent = navigator.userAgent || '') {
  const isWeCom = /wxwork/i.test(userAgent);
  const isWeChat = /MicroMessenger/i.test(userAgent);
  return {
    isWeCom,
    isWeChat,
    isWeChatFamily: isWeCom || isWeChat
  };
}
```

The detection must not affect:

- identity;
- permissions;
- consent;
- answers;
- scores;
- report content;
- data persistence.

It is presentation-only progressive enhancement.

## 5. Report Export Behavior

### Standard browsers

- Keep the visible action `打印／存为 PDF`.
- Clicking it calls the existing browser print path.

### WeChat and WeCom embedded browsers

- Do not call `window.print()`.
- Change the primary export label to `保存／导出报告`.
- Clicking it opens an in-page instruction panel or modal.
- The instruction must state that the current WeChat environment does not support direct PDF export and direct the user to:

```text
点击右上角「…」
→ 选择「在浏览器打开」
→ 再使用「打印／存为 PDF」
```

- The instruction must be dismissible.
- The button must never appear to do nothing.

### Universal fallback

Display a small secondary text action near the export control:

> 无法保存？查看操作说明

This action opens the same instruction panel in every environment, so future user-agent changes do not recreate a dead end.

## 6. Export Instruction Component

The component must be local, static, and dependency-free.

Required properties:

- semantic dialog or alert-dialog markup;
- visible title such as `如何保存报告`;
- concise three-step instructions;
- explicit statement that WeChat cannot be forced to open Safari/Chrome automatically;
- close button;
- Escape-key close in standard browsers where keyboard input exists;
- no external images or SDK dependency in this PR.

A graphic arrow overlay may be considered later after mobile review, but is not required for the first implementation.

## 7. Testing Contract

Add a permanent static contract test covering:

- no active `商业系统张力` occurrences remain in `index.html`, `privacy.html`, or `report-usage.html`;
- instrument metadata uses `富老板经营系统张力测试` and `经营系统张力`;
- the startup title has a scoped class and a mobile-specific font-size rule;
- `detectClientEnvironment` recognizes `MicroMessenger` and `wxwork` patterns;
- the WeChat path does not call `window.print()`;
- the standard-browser path retains `window.print()`;
- the WeChat export label and instruction copy exist;
- the fallback `无法保存？查看操作说明` exists;
- the current three frozen report/profile suites remain green.

The test must first be added in a failing state before implementation.

## 8. Non-Goals

PR #5 does not add:

- server-side PDF generation;
- CloudBase functions, API, database, report snapshots, or public report tokens;
- WeChat OAuth, JS-SDK signing, Mini Program shell, WeCom callbacks, or account binding;
- questionnaire distribution infrastructure;
- changes to the 40 items, scoring, breakpoints, combinations, evidence rules, report narratives, or cause-cost compiler;
- changes to the English names or abbreviations.

## 9. Acceptance Criteria

PR #5 is acceptable when:

- the mobile startup title is visibly smaller without affecting desktop/report titles;
- all active Chinese terminology is unified to `经营系统张力`;
- WeChat/WeCom users receive a working export-guidance interaction instead of a dead print button;
- standard browsers retain native print/PDF behavior;
- a universal fallback instruction link is present;
- the new test and all existing contract tests pass;
- `git diff --check` and clean-checkout assertions pass;
- the PR remains Draft and unmerged until founder mobile review.
