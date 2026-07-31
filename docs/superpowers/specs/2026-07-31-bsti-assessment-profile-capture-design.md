# BSTI Assessment Profile Capture Design

**Status:** Frozen for implementation  
**Date:** 2026-07-31  
**Repository:** `business-and-talent/bsti`  
**Branch:** `feat/user-profile-capture-v01`  
**Baseline:** `7cebc0ed2e7dfa06ed5ec3d36be183c2e37749f8` / `v0.4.4.1`

## Goal

Extend the existing `gate` view into a two-block pre-assessment profile and consent form. Preserve the current flow:

```text
gate → intro → assessment → review → results
```

Preserve `BSTI-40 V0.4.3`, `BSTM V0.4.4.1`, the browser-side compiler, and all scoring/report boundaries.

## Scope

Included:

- four assessment-context confirmations;
- display name, business unit, role, revenue band, headcount band, and industry;
- required report-processing consent and optional marketing consent;
- state, validation, reset, and draft behavior;
- regression proof that profile data never enters scoring.

Excluded:

- CloudBase/API/database writes;
- real PII collection on GitHub Pages;
- complexity-context report rendering;
- WeChat, WeCom, Eliy, whitepaper, CRM, booking, payment;
- any instrument, scoring, breakpoint, evidence, cause-cost, or report-rule change.

## Selected Approach

Extend the existing embedded state and gate modules. Do not introduce a new view and do not restructure the single-file application.

Rejected alternatives:

1. Add a separate `profile` view: clearer separation, but unnecessary navigation/reset risk.
2. Extract embedded modules before the feature: better long-term structure, but combines refactoring with P0 work.

## UI Contract

### Block A — 作答身份与参照确认

All required:

- `currentlyOperatingBusiness`
- `participatesInKeyBusinessDecisions`
- `canReferenceRecent6Months`
- `usesConsistentBusinessReference`
- `businessUnit`

### Block B — 身份与企业资料

All required:

- `displayName`
- `roleCode`; `roleOther` required only for `other`
- `revenueBand`, including `prefer_not_to_say`
- `headcountBand`, including `prefer_not_to_say`
- `industryOther`

P0 does not invent an industry taxonomy. Store `industryCode: "other"` and the respondent’s required self-described industry in `industryOther`.

Context notice:

> 以下资料用于固定本次作答情境、生成并保存报告，并帮助你结合真实经营语境理解测试结果。上述资料不改变 BSTI 计分结果，但会用于 BSTM 报告的情境化解读与后续研究验证。

Field explanations:

- 姓名／称呼：用于生成、保存和识别你的专属报告。
- 当前角色：不同角色接触的信息、承担的责任与拥有的决策权限不同，也会形成不同的经营观察视角。
- 年营收规模：营收规模反映企业正在承载的交易、客户、资金与业务链条复杂度，用于理解系统张力所处的经营语境。
- 组织人数：组织人数会影响协作节点、信息传递、授权关系与管理层级，用于理解系统张力可能如何在组织中显现。
- 所属行业：不同行业具有不同的业务周期、交付结构、人员配置与外部约束，用于辅助理解相同张力在不同经营现场的表现。

## Stable Values

`roleCode`:

```text
founder_controller     创始人／实际控制人
owner_chair            老板／董事长
ceo_president_gm       CEO／总裁／总经理
cofounder_partner      联合创始人／合伙人
business_unit_owner    事业部／业务单元负责人
cxo_core_executive     CXO／核心高管
middle_manager         中层管理者
professional_advisor   专业顾问
other                  其他
```

`revenueBand`:

```text
lt_10m_cny          1,000 万元以下
10m_30m_cny         1,000 万—3,000 万元
30m_100m_cny        3,000 万—1 亿元
100m_300m_cny       1 亿—3 亿元
300m_1b_cny         3 亿—10 亿元
gte_1b_cny          10 亿元及以上
prefer_not_to_say   不便透露
```

`headcountBand`:

```text
lt_10               10 人以下
10_30               10—30 人
30_100              30—100 人
100_300             100—300 人
300_1000            300—1,000 人
gte_1000            1,000 人及以上
prefer_not_to_say   不便透露
```

## Consent Copy

Brief notice:

> 万商万才将使用你填写的身份与企业资料、本次作答及报告结果，完成 BSTI 测试、生成和保存 BSTM 报告，并在你主动选择时提供报告解读。具体处理方式、保存期限和权利行使方法，请查看《BSTI 个人信息处理规则》；测试与报告的适用边界，请查看《BSTI 测试与报告使用说明》。

Required, default unchecked:

> 我已阅读并同意《BSTI 个人信息处理规则》，同意万商万才处理上述资料及本次作答，用于完成测试、生成和保存 BSTM 报告。

Optional, default unchecked:

> 我愿意接收与本次报告相关的解读、活动和服务信息，并知悉可以随时取消。

Button: `确认资料，开始测试`

Button note:

> 请依据最近六个月的真实经营情况作答。BSTI 不用于人格定型、心理诊断或自动作出经营结论。

## State Contract

```js
{
  view: 'gate',
  eligibility: {
    currentlyOperatingBusiness: false,
    participatesInKeyBusinessDecisions: false,
    canReferenceRecent6Months: false,
    usesConsistentBusinessReference: false
  },
  assessmentProfile: {
    displayName: '',
    businessUnit: '',
    roleCode: '',
    roleOther: '',
    revenueBand: '',
    headcountBand: '',
    industryCode: 'other',
    industryOther: '',
    profileVersion: 'BSTI_PROFILE_V0.1'
  },
  consents: {
    reportProcessing: false,
    marketing: false,
    reportProcessingVersion: 'BSTI_PRIVACY_V0.1',
    marketingVersion: 'BSTI_MARKETING_V0.1'
  },
  pageIndex: 0,
  answers: {},
  result: null
}
```

## Validation and Data Flow

Continue only when all four confirmations, all required profile fields, conditional `roleOther`, and required processing consent are valid. Marketing consent never blocks.

```text
controls
→ SET_ELIGIBILITY / SET_PROFILE / SET_CONSENT
→ CONFIRM_PROFILE
→ validatePreAssessmentState(state)
→ intro
```

Invalid submission stays on `gate`, marks invalid controls, and focuses the first invalid control. `RESET` returns the full initial contract. Draft serialization preserves profile/consent selections and clears generated results.

`submitAssessment()` remains exactly:

```js
scoreAssessment(instrument, state.answers)
→ buildReportViewModel(instrument, result)
```

## Demo Safety

Show:

> 当前为开发演示环境，请勿填写真实个人或企业资料。

The page must not claim remote persistence.

## Acceptance Tests

- initial profile/consent contract;
- required and conditional validation;
- optional marketing consent;
- valid transition from `gate` to `intro`;
- reset and draft restoration;
- instrument and `scoreAssessment` payload byte-identical to `v0.4.4.1`;
- profile fields absent from scoring arguments;
- existing V0.4.4.1 tests remain green.
