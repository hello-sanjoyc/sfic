BEGIN;

INSERT INTO public.users (
    fullname,
    email,
    mobile,
    role,
    is_active
)
VALUES (
    'Sanjoy Chowdhury',
    'sany.chowdhury@gmail.com',
    '9830799651',
    'SUPERADMIN',
    TRUE
)
ON CONFLICT (email)
DO UPDATE
SET
    fullname = EXCLUDED.fullname,
    mobile = EXCLUDED.mobile,
    role = EXCLUDED.role,
    is_active = TRUE,
    updated_at = NOW();

COMMIT;
