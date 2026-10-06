BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS state_id BIGINT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS district_id BIGINT DEFAULT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_state'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE ONLY public.users
            ADD CONSTRAINT fk_users_state
            FOREIGN KEY (state_id)
            REFERENCES public.states(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_district'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE ONLY public.users
            ADD CONSTRAINT fk_users_district
            FOREIGN KEY (district_id)
            REFERENCES public.districts(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_users_state_district
    ON public.users (state_id, district_id);

COMMIT;
