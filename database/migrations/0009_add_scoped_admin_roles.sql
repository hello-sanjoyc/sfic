BEGIN;

INSERT INTO public.user_roles (role, is_active)
VALUES
    ('ADMIN_REGION', TRUE),
    ('ADMIN_STATE', TRUE),
    ('ADMIN_DISTRICT', TRUE),
    ('ADMIN', FALSE),
    ('JURY_STATE', FALSE),
    ('JURY_DISTRICT', FALSE),
    ('HELPDESK', FALSE)
ON CONFLICT (role) DO UPDATE
SET is_active = EXCLUDED.is_active;

COMMIT;
