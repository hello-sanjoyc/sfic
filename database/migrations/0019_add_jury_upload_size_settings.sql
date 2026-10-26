BEGIN;

INSERT INTO public.app_settings (setting_key, setting_value, setting_type, description)
VALUES
    ('JURY_MAX_CV_SIZE', '5', 'integer', 'Maximum CV upload size for jury profiles, in MB.'),
    ('JURY_MAX_AVATAR_SIZE', '200', 'integer', 'Maximum avatar upload size for jury profiles, in KB.')
ON CONFLICT (setting_key) DO UPDATE
SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = NOW();

COMMIT;
