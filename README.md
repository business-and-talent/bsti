# bsti

Business System Tension Instrument (BSTI) for assessing business system tensions.

## Environment boundary

GitHub Pages is a development/demo environment only. It must not collect real identifiable personal or enterprise data, and production submission remains disabled.

The future P0 production path is Tencent Cloud CloudBase in Shanghai. Production activation remains launch-gated until the registered entity, personal-information rights contact, approved first-party domain, Tencent Cloud contracting entity, vendor/data-flow inventory, storage and backup verification, and final legal review are complete.

## Contract verification

Run the complete static contract suite with Node.js 22:

```bash
node tests/p0-platform-foundation-contract.mjs
node tests/profile-capture-static-contract.mjs
node tests/report-v0441-static-contract.mjs
node tests/report-v0441-cause-cost.mjs
git diff --check
```

The P0 platform contracts are stored under `platform/contracts/`. They preserve `BSTI-40 V0.4.3`, `BSTM V0.4.4.1`, browser-side report compilation, and the isolation of revenue/headcount as context-only inputs.
