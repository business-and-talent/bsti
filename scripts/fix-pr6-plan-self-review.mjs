import fs from 'node:fs';

const path = 'docs/superpowers/plans/2026-08-01-bsti-backend-api-skeleton-environment-config-plan.md';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(from, to, label) {
  const first = source.indexOf(from);
  if (first === -1) throw new Error(`${label}: target not found`);
  if (source.indexOf(from, first + from.length) !== -1) throw new Error(`${label}: target is not unique`);
  source = source.slice(0, first) + to + source.slice(first + from.length);
}

replaceOnce(
  "      assert.equal(error.message.includes(String(env.BSTI_SUBMISSION_ENABLED ?? '')), false);",
  "      for (const suppliedValue of Object.values(env)) {\n        assert.equal(error.message.includes(String(suppliedValue)), false);\n      }",
  'error redaction assertion'
);

replaceOnce(
  "In `README.md`, retain the existing title, product description, and environment boundary. Replace the current `## Contract verification` section with:\n\n```markdown",
  "In `README.md`, retain the existing title, product description, and environment boundary. Replace the current `## Contract verification` section with:\n\n````markdown",
  'README outer fence opening'
);

replaceOnce(
  "The P0 platform contracts are stored under `platform/contracts/`. They preserve `BSTI-40 V0.4.3`, `BSTM V0.4.4.1`, browser-side report compilation, and the isolation of revenue/headcount as context-only inputs.\n```\n\nWhen editing Markdown",
  "The P0 platform contracts are stored under `platform/contracts/`. They preserve `BSTI-40 V0.4.3`, `BSTM V0.4.4.1`, browser-side report compilation, and the isolation of revenue/headcount as context-only inputs.\n````\n\nWhen editing Markdown",
  'README outer fence closing'
);

fs.writeFileSync(path, source);
console.log('PR #6 plan self-review corrections applied.');
