# BSTI Database Migration Contract

This directory contains repository-controlled MySQL 8 migration files for BSTI.

## Current scope

PR #7 defines and verifies the schema contract only. It does not connect a real database, enable assessment submission, enable persistence, change browser-side scoring, or move report compilation to the backend.

## Migration rules

- Migration files use zero-padded, monotonically increasing numeric prefixes.
- Merged migration files are immutable.
- Corrections require a new numbered migration; do not rewrite an applied migration.
- Migration order is lexical and deterministic.
- The migration checksum is the lowercase SHA-256 digest of the exact file bytes.
- Migration tooling must reject a reused version with a different filename, a checksum mismatch, or an out-of-order application.
- Application and database timestamps are written and interpreted as UTC.
- The initial schema targets MySQL 8, InnoDB, `utf8mb4`, and `DATETIME(3)`.
- Application-generated UUID values are stored as `CHAR(36)`.

## Verification

Static repository verification:

```bash
node tests/mysql-schema-migration-contract.mjs
```

GitHub Actions additionally applies the up migration to a disposable MySQL 8 service, verifies legal and illegal records, applies the down migration, and reapplies the up migration.

The down migration is a development and pre-deployment verification mechanism. It is not authorization to destroy production data.

## Production boundary

A future authorized production migration must occur only after:

1. the target environment and credentials are supplied outside the repository;
2. a current backup is created;
3. restore capability is verified;
4. the exact migration checksum is reviewed;
5. the operator confirms the complete environment-variable set;
6. rollback and incident procedures are available.

Never commit database passwords, connection strings, environment identifiers, private network addresses, or real assessment records.
