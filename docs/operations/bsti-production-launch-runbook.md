# BSTI Production Launch Runbook

## Current status

- Canonical future URL: `https://richboss.com/bsti/`.
- Submission API: `https://richboss.com/api/v1/assessments`.
- Chinese-friendly entry: `fulaoban.cn`; future behavior is a path-preserving permanent redirect to `richboss.com`.
- `richboss.com` ICP 备案尚未完成。
- Frontend and backend submission remain disabled.

PR #9 只生成关闭提交能力的可部署包，不授权任何生产部署、数据库迁移、域名绑定、DNS 修改或真实资料收集。

## Build the disabled package

```bash
node scripts/build-production-package.mjs \
  --output dist \
  --source-commit "$(git rev-parse HEAD)"
```

Expected manifest value:

```json
{
  "submissionEnabled": false
}
```

The package may be reviewed or deployed only to an access-controlled non-production environment that does not accept real identifiable data.

## Launch evidence

Before any enabled build, collect evidence for every gate in:

```text
platform/contracts/production-launch-gates.v0.1.json
```

Copy the example outside version control:

```bash
cp deployment/release-approval.example.json deployment/release-approval.json
```

`deployment/release-approval.json` is ignored by Git. Every gate must be supported by current evidence, all placeholders must be replaced, and the approval must name an authorized approver with valid timestamps.

## Enabled package gate

Only after every gate is complete may an authorized operator run:

```bash
node scripts/build-production-package.mjs \
  --output dist \
  --source-commit "$(git rev-parse HEAD)" \
  --enable-submission \
  --release-approval deployment/release-approval.json
```

The builder refuses enabled mode when approval evidence is missing, incomplete, invalid, or expired.

## Required HTTP routing

The public `/api/v1/assessments` path at `https://richboss.com/api/v1/assessments` must reach the backend upstream `/v1/assessments` route.

For the CloudBase `/api/*` route:

- route the request to the `bsti-api` function;
- configure `PathRewrite.Prefix` as `/` so the public `/api` prefix is removed;
- keep 路径透传关闭 so the backend does not receive `/api/v1/assessments`;
- verify the function receives `/v1/assessments` before enabling submission.

Without this rewrite, the current backend correctly returns `404 NOT_FOUND` because `/api/v1/assessments` is not an internal application route.

## Future production sequence

After authorization, the operator must use the then-current Tencent Cloud documentation and console or CLI to:

1. create or verify the Shanghai CloudBase production environment;
2. verify the target MySQL database is empty before the first migration;
3. create a backup and prove restore capability;
4. apply migrations `0001` and `0002` with reviewed checksums;
5. deploy the backend with secrets supplied outside the repository;
6. deploy the `dist/bsti/` static package;
7. bind the filed `richboss.com` domain with HTTPS;
8. route `/bsti/*` to static hosting and `/api/*` to the API using the required prefix rewrite above;
9. configure the future `fulaoban.cn/*` path-preserving redirect;
10. run health, capabilities, submission, replay, report-display, and rollback smoke checks.

PR #9 does not execute or authorize this sequence.

## Stop and rollback

When any launch check fails:

1. set frontend submission to disabled;
2. set backend `BSTI_SUBMISSION_ENABLED=false`;
3. confirm `/v1/capabilities` reports submission and persistence false;
4. retain logs without copying personal data into issue trackers;
5. restore the last verified static package or backend release;
6. do not run down migrations against production data without a separately approved recovery procedure.
