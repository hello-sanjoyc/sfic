-- SQL to run

-- Clear the user_roles table and reset its identity sequence

TRUNCATE TABLE user_roles RESTART IDENTITY CASCADE;

-- Insert predefined user roles
INSERT INTO public.user_roles VALUES ('SUPERADMIN', true);
INSERT INTO public.user_roles VALUES ('ADMIN_REGION', true);
INSERT INTO public.user_roles VALUES ('ADMIN_STATE', true);
INSERT INTO public.user_roles VALUES ('ADMIN_DISTRICT', true);
INSERT INTO public.user_roles VALUES ('ADMIN', false);
INSERT INTO public.user_roles VALUES ('JURY_STATE', false);
INSERT INTO public.user_roles VALUES ('JURY_DISTRICT', false);
INSERT INTO public.user_roles VALUES ('HELPDESK', false);

-- Modify the users table to include state and district foreign keys
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

-- Create RBAC rules table

BEGIN;

CREATE TABLE IF NOT EXISTS public.rbac_rules (
    id BIGSERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL UNIQUE,
    scope VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    applications_access VARCHAR(200) NOT NULL,
    users_access VARCHAR(200) NOT NULL,
    settings_access VARCHAR(200) NOT NULL,
    analytics_access VARCHAR(200) NOT NULL,
    scope_notes TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

UPDATE public.rbac_rules
SET
    scope = CASE
        WHEN LOWER(TRIM(scope)) IN ('global', 'application') THEN 'Application'
        WHEN LOWER(TRIM(scope)) IN ('regional', 'region') THEN 'Region'
        WHEN LOWER(TRIM(scope)) IN ('assigned state', 'state', 'state evaluation') THEN 'State'
        WHEN LOWER(TRIM(scope)) IN ('assigned district', 'district', 'district evaluation') THEN 'District'
        ELSE scope
    END,
    applications_access = CASE
        WHEN LOWER(TRIM(applications_access)) = 'no access' THEN 'No Access'
        WHEN LOWER(TRIM(applications_access)) = 'view only' THEN 'View Only'
        ELSE 'Full Access'
    END,
    users_access = CASE
        WHEN LOWER(TRIM(users_access)) = 'no access' THEN 'No Access'
        WHEN LOWER(TRIM(users_access)) = 'view only' THEN 'View Only'
        ELSE 'Full Access'
    END,
    settings_access = CASE
        WHEN LOWER(TRIM(settings_access)) = 'no access' THEN 'No Access'
        WHEN LOWER(TRIM(settings_access)) = 'view only' THEN 'View Only'
        ELSE 'Full Access'
    END,
    analytics_access = CASE
        WHEN LOWER(TRIM(analytics_access)) = 'no access' THEN 'No Access'
        WHEN LOWER(TRIM(analytics_access)) = 'view only' THEN 'View Only'
        ELSE 'Full Access'
    END,
    updated_at = NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rbac_rules_scope'
          AND conrelid = 'public.rbac_rules'::regclass
    ) THEN
        ALTER TABLE public.rbac_rules
            ADD CONSTRAINT ck_rbac_rules_scope
            CHECK (scope IN ('Application', 'Region', 'State', 'District'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rbac_rules_applications_access'
          AND conrelid = 'public.rbac_rules'::regclass
    ) THEN
        ALTER TABLE public.rbac_rules
            ADD CONSTRAINT ck_rbac_rules_applications_access
            CHECK (applications_access IN ('Full Access', 'View Only', 'No Access'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rbac_rules_users_access'
          AND conrelid = 'public.rbac_rules'::regclass
    ) THEN
        ALTER TABLE public.rbac_rules
            ADD CONSTRAINT ck_rbac_rules_users_access
            CHECK (users_access IN ('Full Access', 'View Only', 'No Access'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rbac_rules_settings_access'
          AND conrelid = 'public.rbac_rules'::regclass
    ) THEN
        ALTER TABLE public.rbac_rules
            ADD CONSTRAINT ck_rbac_rules_settings_access
            CHECK (settings_access IN ('Full Access', 'View Only', 'No Access'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_rbac_rules_analytics_access'
          AND conrelid = 'public.rbac_rules'::regclass
    ) THEN
        ALTER TABLE public.rbac_rules
            ADD CONSTRAINT ck_rbac_rules_analytics_access
            CHECK (analytics_access IN ('Full Access', 'View Only', 'No Access'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_rbac_rules_role'
          AND conrelid = 'public.rbac_rules'::regclass
    ) THEN
        ALTER TABLE public.rbac_rules
            ADD CONSTRAINT fk_rbac_rules_role
            FOREIGN KEY (role)
            REFERENCES public.user_roles(role)
            ON UPDATE CASCADE
            ON DELETE CASCADE;
    END IF;
END;
$$;

INSERT INTO public.rbac_rules (
    role,
    scope,
    description,
    applications_access,
    users_access,
    settings_access,
    analytics_access,
    scope_notes
)
VALUES
(
    'SUPERADMIN',
    'Application',
    'Can do everything in the Admin Workspace.',
    'Full Access',
    'Full Access',
    'Full Access',
    'Full Access',
    ARRAY['SUPERADMIN bypasses all scope filters.']
),
(
    'ADMIN_REGION',
    'Region',
    'Can access data of the region which includes states of West Bengal, Bihar and Jharkhand.',
    'Full Access',
    'Full Access',
    'View Only',
    'Full Access',
    ARRAY['ADMIN_REGION is limited to the Eastern Region states: West Bengal, Bihar and Jharkhand.']
),
(
    'ADMIN_STATE',
    'State',
    'Can access data of the assigned state.',
    'Full Access',
    'Full Access',
    'No Access',
    'Full Access',
    ARRAY['ADMIN_STATE requires one assigned state.']
),
(
    'ADMIN_DISTRICT',
    'District',
    'Can access data of the assigned district of the state.',
    'Full Access',
    'View Only',
    'No Access',
    'Full Access',
    ARRAY['ADMIN_DISTRICT requires one assigned state and one assigned district.']
),
(
    'JURY_STATE',
    'State',
    'Can access applications which qualify for the state level evaluation of the assigned state.',
    'Full Access',
    'Full Access',
    'Full Access',
    'Full Access',
    ARRAY['JURY_STATE can only view applications routed to state level evaluation for the assigned state.']
),
(
    'JURY_DISTRICT',
    'District',
    'Can access applications for the district level evaluation of the assigned state and district.',
    'Full Access',
    'Full Access',
    'Full Access',
    'Full Access',
    ARRAY['JURY_DISTRICT can only view applications routed to district level evaluation for the assigned state and district.']
)
ON CONFLICT (role) DO UPDATE
SET
    scope = EXCLUDED.scope,
    description = EXCLUDED.description,
    applications_access = EXCLUDED.applications_access,
    users_access = EXCLUDED.users_access,
    settings_access = EXCLUDED.settings_access,
    analytics_access = EXCLUDED.analytics_access,
    scope_notes = EXCLUDED.scope_notes,
    is_active = TRUE,
    updated_at = NOW();

SELECT setval('public.rbac_rules_id_seq', GREATEST((SELECT MAX(id) FROM public.rbac_rules), 1));

CREATE INDEX IF NOT EXISTS idx_rbac_rules_role
    ON public.rbac_rules (role);

DROP TRIGGER IF EXISTS trg_rbac_rules_updated_at
ON public.rbac_rules;

CREATE TRIGGER trg_rbac_rules_updated_at
BEFORE UPDATE ON public.rbac_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;


-- Admin Sessions Table

CREATE TABLE IF NOT EXISTS public.admin_sessions (
    token VARCHAR(80) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_admin_sessions_user
        FOREIGN KEY (user_id) REFERENCES public.users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id
    ON public.admin_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
    ON public.admin_sessions(expires_at);
