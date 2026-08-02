# BSTI Database Migration Contract

This directory contains repository-controlled MySQL 8 migration files for BSTI.

## Current scope

The migration chain supports the disabled-by-default assessment submission capability:

1. `0001_initial_bsti_schema`
2. `0002_add_submission_fingerprint`

`0001` creates the independent assessment aggregate. `0002` adds the lowercase SHA-256 fingerprint used to distinguish an identical network retry from a conflicting request that reuses the same assessment UUID.

PR #8 does not connect a real database, activate production submission, change browser-side scoring, or move report compilation to the backend. The GitHub Pages demo remains disconnected from the write API.

`0002` adds a non-null column and therefore assumes the PR #7 schema has not been deployed with persisted assessment rows. A production environment must never apply this migration to a populated schema without a separately reviewed backfill migration.

## Migration rules

- Migration files use zero-padded, monotonically increasing numeric prefixes.
- Merged migration files are immutable.
- Corrections require a new numbered migration; do not rewrite an applied migration.
- Migration order is lexical and deterministic.
- The migration checksum is the lowercase SHA-256 digest of the exact file bytes.
- Migration tooling must reject a reused version with a different filename, a checksum mismatch, or an out-of-order application.
- Application and database timestamps are written and interpreted as UTC.
- The schema targets MySQL 8, InnoDB, `utf8mb4`, and `DATETIME(3)`.
- Application-generated UUID values are stored as `CHAR(36)`.
- `submission_fingerprint` is operational retry metadata, is not a unique content key, and must not enter research exports.

## Verification

Static repository verification:

```bash
node tests/mysql-schema-migration-contract.mjs
```

GitHub Actions additionally:

- applies `0001` then `0002` to a disposable MySQL 8 service;
- starts the enabled API with disposable credentials;
- proves first submission, identical replay, conflicting retry rejection, invalid-request rollback, and exact aggregate row counts;
- reverses `0002` then `0001`;
- recreates `0001` then `0002`.

Down migrations are development and pre-deployment verification mechanisms. They are not authorization to destroy production data.

## Production boundary

A future authorized production migration must occur only after:

1. the target environment and credentials are supplied outside the repository;
2. the database is confirmed empty or the migration has an approved backfill path;
3. a current backup is created;
4. restore capability is verified;
5. the exact migration checksums are reviewed;
6. the operator confirms the complete environment-variable set;
7. rollback and incident procedures are available.

Never commit database passwords, connection strings, environment identifiers, private network addresses, or real assessment records.
