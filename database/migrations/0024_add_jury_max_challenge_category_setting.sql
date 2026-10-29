BEGIN;

INSERT INTO public.app_settings (setting_key, setting_value, setting_type, description)
VALUES
    ('JURY_MAX_CHALLENGE_CATEGORY', '4', 'integer', 'Maximum number of challenge categories a jury member can be assigned.')
ON CONFLICT (setting_key) DO UPDATE
SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = NOW();

COMMIT;
