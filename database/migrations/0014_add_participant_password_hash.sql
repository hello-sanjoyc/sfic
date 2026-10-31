ALTER TABLE public.participants
    ADD COLUMN IF NOT EXISTS password_hash character varying(255);
