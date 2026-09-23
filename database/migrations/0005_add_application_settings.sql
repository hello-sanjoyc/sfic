BEGIN;

CREATE TABLE IF NOT EXISTS public.app_settings (
    setting_key character varying(120) NOT NULL,
    setting_value text NOT NULL,
    setting_type character varying(30) DEFAULT 'string'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_settings_pkey PRIMARY KEY (setting_key),
    CONSTRAINT ck_app_settings_key CHECK ((setting_key)::text ~ '^[A-Z0-9_]+$'::text),
    CONSTRAINT ck_app_settings_type CHECK ((setting_type)::text = ANY ((ARRAY['boolean'::character varying, 'integer'::character varying, 'string'::character varying, 'timestamp'::character varying])::text[]))
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_app_settings_updated_at'
          AND tgrelid = 'public.app_settings'::regclass
    ) THEN
        DROP TRIGGER trg_app_settings_updated_at ON public.app_settings;
    END IF;
END $$;

CREATE TRIGGER trg_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (
    setting_key,
    setting_value,
    setting_type,
    description
)
VALUES
    (
        'PARTICIPANT_REGISTRATION_ENABLED',
        'true',
        'boolean',
        'Controls whether participant registration is enabled.'
    ),
    (
        'PARTICIPANT_REGISTRATION_START_DATE',
        '2026-09-19T15:00',
        'timestamp',
        'Participant registration opening date and time.'
    ),
    (
        'PARTICIPANT_REGISTRATION_END_DATE',
        '2026-10-30T23:59',
        'timestamp',
        'Participant registration closing date and time.'
    ),
    (
        'PARTICIPANT_APPLICATION_MULTIPLE',
        'true',
        'boolean',
        'Controls whether a participant can create multiple applications.'
    ),
    (
        'PARTICIPANT_APPLICATION_SAME_CATEGORY_MULTIPLE',
        'true',
        'boolean',
        'Controls whether a participant can submit multiple applications in the same challenge category.'
    ),
    (
        'PARTICIPANT_APPLICATION_SAME_CATEGORY_MULTIPLE_LIMIT',
        '3',
        'integer',
        'Maximum number of applications allowed in the same challenge category.'
    )
ON CONFLICT (setting_key) DO UPDATE
SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = now();

COMMIT;
