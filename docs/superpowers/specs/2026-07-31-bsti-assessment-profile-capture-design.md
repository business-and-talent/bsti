# BSTI Assessment Profile Capture Design

**Status:** Revised after founder review; implemented in Draft PR #3  
**Date:** 2026-07-31  
**Repository:** `business-and-talent/bsti`  
**Branch:** `feat/user-profile-capture-v01`  
**Baseline:** `7cebc0ed2e7dfa06ed5ec3d36be183c2e37749f8` / `v0.4.4.1`

## Goal

Add the minimum pre-assessment profile and consent contract while preserving the formal assessment and report flow:

```text
gate → assessment → review → results
```

Profile/context fields must never enter BSTI scoring or change BSTM V0.4.4.1 report compilation.

## Founder Review Revision

The first implementation used four eligibility checkboxes and a two-column profile grid. Founder review replaced that design with:

- one concise eligibility/reference explanation, with no confirmation checkboxes;
- vertically stacked fields;
- visible labels `姓名`, `公司／主要经营主体`, and `当前角色`;
- a required industry dropdown with a conditional free-text field for `其他`;
- equal-size consent checkboxes;
- clickable privacy and report-use documents;
- visible technical label `经营系统张力测量工具`;
- direct entry from `确认资料，开始测试` to assessment page index 0.

## Gate UI Contract

### Eligibility and reference guidance

Display as information, not controls:

> BSTI 面向正在承担真实经营责任的老板、主要经营者及核心经营团队。请依据最近六个月的真实经营情况，并始终以同一个经营主体作为 40 道题的作答参照。

### Profile fields

Render in this order, one field per row:

1. `displayName` — 姓名
2. `businessUnit` — 公司／主要经营主体
3. `roleCode` — 当前角色; `roleOther` required only when `other`
4. `revenueBand` — 年营收规模, including `prefer_not_to_say`
5. `headcountBand` — 组织人数, including `prefer_not_to_say`
6. `industryCode` — 所属行业; `industryOther` required only when `other`

### Industry values

```text
manufacturing              制造业
retail_consumer            批发零售／消费品
food_hospitality           餐饮／住宿／生活服务
technology_internet        互联网／软件／信息服务
professional_services      专业服务／咨询
education_training         教育／培训
healthcare                 医疗／健康
finance_insurance          金融／保险
construction_real_estate   建筑／房地产
transport_logistics        交通运输／物流／供应链
culture_media              文化／传媒／内容
agriculture_food           农业／食品
energy_environment         能源／环保
other                      其他
```

### Consent contract

Required, default unchecked:

> 我已阅读并同意《BSTI 个人信息处理规则》，同意万商万才处理上述资料及本次作答，用于完成测试、生成和保存 BSTM 报告。

Optional, default unchecked:

> 我愿意接收与本次报告相关的解读、活动和服务信息，并知悉可以随时取消。

Document links:

```text
./privacy.html
./report-usage.html
```

Both consent rows use the same `consent-choice` structure and an explicit `18px × 18px` checkbox contract.

## State Contract

```js
{
  view: 'gate',
  assessmentProfile: {
    displayName: '',
    businessUnit: '',
    roleCode: '',
    roleOther: '',
    revenueBand: '',
    headcountBand: '',
    industryCode: '',
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

There is no `eligibility` state and no `SET_ELIGIBILITY` action.

## Validation and Data Flow

Continue only when all required profile fields, conditional `roleOther` / `industryOther`, and report-processing consent are valid. Marketing consent never blocks.

```text
SET_PROFILE / SET_CONSENT
→ CONFIRM_PROFILE
→ validatePreAssessmentState(state)
→ assessment, pageIndex 0
```

The first assessment page contains questions 01–05; the complete instrument contains 40 questions in 8 pages. Forward and backward navigation continue to use the existing state actions.

`submitAssessment()` remains isolated:

```js
scoreAssessment(instrument, state.answers)
→ buildReportViewModel(instrument, result)
```

## Naming Revision

`technical_name_zh` and the visible gate eyebrow change from `商业系统张力测量工具` to `经营系统张力测量工具`.

This revision does **not** change:

- `Business System Tension Instrument`;
- the `BSTI` abbreviation;
- construct name `商业系统张力`;
- product name `富老板商业系统张力测试`;
- question text, scoring, breakpoints, evidence rules, or report compiler.

## Compliance Documents

`privacy.html` and `report-usage.html` are clickable development-review pages derived from the P0 compliance text pack. They must provide a return link to `index.html` and visibly state that production launch is blocked until the registered entity, rights-request email, service-provider list, and effective information are completed.

## Scope Boundaries

Excluded:

- CloudBase/API/database persistence;
- real production PII collection on GitHub Pages;
- report complexity-context rendering;
- WeChat, WeCom, Eliy, whitepaper, CRM, booking, payment;
- any scoring or report-rule change.

## Acceptance Tests

- obsolete eligibility controls and actions are absent;
- profile fields render in the frozen vertical order;
- industry dropdown and conditional `其他` validation work;
- consent controls use equal dimensions;
- both compliance links resolve and provide return navigation;
- `CONFIRM_PROFILE` enters `assessment` at page index 0;
- the instrument contains 40 questions and first item order is 1;
- forward navigation reaches question 06 and backward navigation returns to question 01;
- profile data never enters `scoreAssessment`;
- the instrument differs from `v0.4.4.1` only at `technical_name_zh`;
- reset returns the revised initial state;
- existing V0.4.4.1 tests remain green.
