# BSTI Assessment Profile Capture Implementation Plan

**Status:** Implemented and revised after founder review; Draft PR #3 remains open.  
**Date:** 2026-07-31  
**Baseline:** `7cebc0ed2e7dfa06ed5ec3d36be183c2e37749f8` / `v0.4.4.1`

## Goal

Add the minimum profile and consent gate required for a named BSTI report without changing scoring or BSTM report compilation.

## Architecture

Keep the existing static `index.html` application and embedded Base64 ES modules. Modify only the gate/state presentation contract, add two reviewable compliance pages, and enforce the boundary through Node static-contract tests.

## Completed Tasks

### 1. Define profile/scoring isolation contract

- [x] Add `tests/profile-capture-static-contract.mjs`.
- [x] Prove profile fields never enter `scoreAssessment`.
- [x] Preserve the `scoreAssessment` payload byte-for-byte against `v0.4.4.1`.
- [x] Permit only the reviewed `technical_name_zh` revision in the instrument object.

### 2. Implement revised state contract

- [x] Add `assessmentProfile` and `consents`.
- [x] Remove obsolete `eligibility` state and `SET_ELIGIBILITY`.
- [x] Require profile fields, conditional `roleOther` / `industryOther`, and processing consent.
- [x] Keep marketing consent optional.
- [x] Preserve reset and gate-to-intro transition behavior.

### 3. Apply founder UI review

- [x] Replace four eligibility checkboxes with descriptive eligibility/reference guidance.
- [x] Stack all profile fields vertically.
- [x] Use labels `姓名`, `公司／主要经营主体`, and `经营身份`.
- [x] Add a required industry dropdown and conditional `其他` input.
- [x] Normalize both consent checkbox dimensions to `18px × 18px`.
- [x] Add clickable `privacy.html` and `report-usage.html` links.
- [x] Revise visible technical label to `经营系统张力测量工具`.

### 4. Add compliance review pages

- [x] Create `privacy.html`.
- [x] Create `report-usage.html`.
- [x] Mark both as development-review versions.
- [x] State that production launch requires registered entity, rights-request email, service-provider list, and effective information.

### 5. Verification

- [x] `node tests/profile-capture-static-contract.mjs`
- [x] `node tests/report-v0441-static-contract.mjs`
- [x] `node tests/report-v0441-cause-cost.mjs`
- [x] `git diff --check`
- [x] GitHub Actions `BSTI contract tests`
- [x] Founder confirmed that `确认资料，开始测试` transitions normally into the 40-question flow.

## Frozen Boundaries

- `BSTI-40 V0.4.3` questions remain unchanged.
- `scoreAssessment` remains unchanged.
- `BSTM V0.4.4.1` compiler and cause-cost rules remain unchanged.
- Profile/context fields do not affect scores, breakpoints, focus combinations, or evidence rules.
- No CloudBase, API, database, report-context module, WeChat, WeCom, Eliy, whitepaper, CRM, booking, payment, or production PII persistence.

## Remaining Manual Review

- [ ] Founder rechecks the revised gate visually on desktop and mobile widths.
- [ ] Founder opens both compliance links and confirms readability/navigation.
- [ ] Production owner later replaces all visible launch placeholders before any real-data deployment.
- [ ] Draft PR is marked ready only after founder approval.
