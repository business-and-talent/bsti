# BSTI P0 Platform Foundation Guardrails Design

**Status:** Frozen for PR #4 implementation  
**Date:** 2026-08-01  
**Repository:** `business-and-talent/bsti`  
**Baseline:** `1db218374a37987d31951f97f75ca8a071eb8d18` / merged PR #3

## 1. Purpose

Establish the minimum repository-level contracts required before adding a production API or database. The contracts must prevent development hosting from becoming an accidental real-data path and must keep the frozen BSTI/BSTM scoring and report boundaries machine-readable.

## 2. Scope

PR #4 adds only:

- an explicit development/production environment contract;
- a machine-readable frozen-boundary contract;
- a permanent static contract test;
- CI execution of that test;
- repository documentation for the guardrails.

## 3. Environment Contract

### Development/demo

- Host class: GitHub Pages.
- Real identifiable data: forbidden.
- Submission: disabled.
- API mode: disabled.
- A visible demo warning is required.
- Synthetic profiles, answers, UI review, report rendering, and contract regression tests remain permitted.

### Production

- Host class: Tencent Cloud CloudBase.
- Region: Shanghai.
- Submission mode: launch-gated, not enabled by default.
- Static frontend assets may not contain production secrets.
- Activation requires completion of the separately tracked legal, domain, contracting, vendor/data-flow, storage/backup, and legal-review blockers.

## 4. Frozen Product Boundaries

- Assessment instrument: `BSTI-40 V0.4.3`.
- Report rules/compiler: `BSTM V0.4.4.1`.
- The existing browser compiler remains authoritative for P0.
- A future backend may validate, store, associate, and control access; it must not reimplement scoring or report compilation in P0.
- Only assessment answers enter scoring.
- Revenue and headcount are context-only inputs and must not change scores, breakpoints, focus combinations, or evidence rules.
- Post-report handoff remains configurable and provider-neutral.

## 5. Explicit Non-Goals

PR #4 does not add:

- CloudBase functions, API endpoints, MySQL, migrations, or persistence;
- report snapshot storage or public report tokens;
- complexity-context rendering;
- WeChat OAuth, WeCom callbacks, Eliy interpretation, CRM, booking, payment, or automated qualification;
- changes to the 40 items, scoring, breakpoints, combinations, evidence rules, or report narratives.

## 6. Repository Interfaces

### `platform/contracts/environments.v0.1.json`

Defines the only recognized P0 environment modes and their activation constraints.

### `platform/contracts/frozen-boundaries.v0.1.json`

Defines machine-readable instrument, report, scoring-input, context-only, backend, and integration boundaries.

### `tests/p0-platform-foundation-contract.mjs`

Fails when:

- GitHub Pages is allowed to collect real data or submit;
- production is enabled by default or lacks launch gates;
- frontend secrets are allowed;
- frozen BSTI/BSTM versions drift;
- revenue/headcount are promoted into scoring inputs;
- the existing visible development warning disappears;
- CI stops running the guardrail test.

## 7. Acceptance Criteria

PR #4 is acceptable when:

- both JSON contracts parse and match this design;
- GitHub Pages is explicitly demo-only and submission-disabled;
- CloudBase Shanghai is represented as a gated future production path;
- production activation blockers are explicit machine-readable keys;
- frozen product boundaries remain unchanged;
- the existing three contract tests and the new platform-foundation test all pass;
- `git diff --check` and clean-checkout assertions pass;
- the static BSTI site remains runnable and unchanged in behavior.
