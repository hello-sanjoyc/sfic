-- Add per-state registration control
ALTER TABLE public.states
    ADD COLUMN is_registration_enabled boolean DEFAULT true NOT NULL;

-- Close registration for Bihar and Jharkhand; West Bengal stays open (default true)
UPDATE public.states
    SET is_registration_enabled = FALSE
    WHERE LOWER(name_en) IN ('bihar', 'jharkhand');
