# Migrations

This folder is for incremental schema changes made *after* the initial
production rollout (`../schema/schema.sql`). There is no migration history
yet - the current schema was applied as a single baseline script.

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
