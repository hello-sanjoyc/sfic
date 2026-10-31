BEGIN;

-- Which applications a jury member has opened. Used for the "Viewed" column
-- of the jury dashboard's challenge category table.
CREATE TABLE IF NOT EXISTS public.jury_application_views (
    jury_profile_id bigint NOT NULL REFERENCES public.jury_profiles(id) ON DELETE CASCADE,
    application_id bigint NOT NULL REFERENCES public.participant_applications(id) ON DELETE CASCADE,
    first_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    last_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (jury_profile_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_jury_application_views_application
    ON public.jury_application_views (application_id);

COMMIT;
