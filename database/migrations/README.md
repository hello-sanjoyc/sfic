# Migrations

This folder contains incremental schema and seed changes made after the
baseline schema (`../schema/schema.sql`). Apply these migrations in numeric
order when upgrading an existing database.

## Conventions

- Name files `NNNN_short_description.sql`, zero-padded, sequential
  (e.g. `0001_add_participant_phone_verified.sql`).
- Each migration should be idempotent where practical (`IF NOT EXISTS`,
  `ON CONFLICT DO NOTHING`) and wrapped in `BEGIN; ... COMMIT;`.
- Apply migrations in order, once, against production. Keep a record of
  which migrations have been applied (e.g. a `schema_migrations` table, or
  your deployment tooling's own tracking) once this folder is in active use.
- Never edit a migration that has already been applied to production -
  write a new one instead.
