BEGIN;

ALTER TABLE public.user_roles
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.user_roles
SET is_active = TRUE
WHERE is_active IS NULL;

COMMIT;
