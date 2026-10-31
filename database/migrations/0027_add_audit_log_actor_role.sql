BEGIN;

-- The actor's role at the time of the action (e.g. SUPERADMIN, ADMIN_REGION),
-- denormalized alongside actor_name/actor_email for the same reason: so the
-- audit trail still reads correctly even if the user's role later changes.
ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS actor_role character varying(40);

COMMIT;
