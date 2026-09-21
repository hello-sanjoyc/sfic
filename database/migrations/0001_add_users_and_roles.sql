
BEGIN;

-- ============================================================
-- USER ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    role VARCHAR(20) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_roles_pkey'
    ) THEN
        ALTER TABLE ONLY public.user_roles
            ADD CONSTRAINT user_roles_pkey PRIMARY KEY (role);
    END IF;
END;
$$;

INSERT INTO public.user_roles (role)
VALUES ('SUPERADMIN')
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.user_roles (role)
VALUES ('ADMIN')
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.user_roles (role)
VALUES ('JURY')
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.user_roles (role)
VALUES ('HELPDESK')
ON CONFLICT (role) DO NOTHING;


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT NOT NULL,
    fullname VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- ============================================================
-- USERS ID SEQUENCE
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq
    OWNED BY public.users.id;

ALTER TABLE ONLY public.users
    ALTER COLUMN id
    SET DEFAULT nextval('public.users_id_seq'::regclass);


-- ============================================================
-- USERS CONSTRAINTS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_pkey'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE ONLY public.users
            ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_users_email'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE ONLY public.users
            ADD CONSTRAINT uq_users_email UNIQUE (email);
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_users_mobile'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE ONLY public.users
            ADD CONSTRAINT uq_users_mobile UNIQUE (mobile);
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_role'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE ONLY public.users
            ADD CONSTRAINT fk_users_role
            FOREIGN KEY (role)
            REFERENCES public.user_roles(role)
            ON UPDATE CASCADE
            ON DELETE RESTRICT;
    END IF;

END;
$$;


-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_users_updated_at
ON public.users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- DEFAULT SUPERADMIN USER
-- ============================================================

INSERT INTO public.users (
    fullname,
    email,
    mobile,
    role
)
VALUES (
    'Sanjoy Chowdhury',
    'sany.chowdhury@gmail.com',
    '9830799651',
    'SUPERADMIN'
)
ON CONFLICT (email)
DO UPDATE
SET
    fullname = EXCLUDED.fullname,
    mobile = EXCLUDED.mobile,
    role = EXCLUDED.role;


-- ============================================================
-- USER LOGIN OTP TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_login_verification_attempts (
    id BIGINT NOT NULL,
    email VARCHAR(200) NOT NULL,
    first_requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_sent_at TIMESTAMPTZ,
    send_count INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.user_login_verification_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_login_verification_attempts_id_seq
    OWNED BY public.user_login_verification_attempts.id;

ALTER TABLE ONLY public.user_login_verification_attempts
    ALTER COLUMN id
    SET DEFAULT nextval('public.user_login_verification_attempts_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.user_login_verification_tokens (
    id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    email VARCHAR(200) NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.user_login_verification_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_login_verification_tokens_id_seq
    OWNED BY public.user_login_verification_tokens.id;

ALTER TABLE ONLY public.user_login_verification_tokens
    ALTER COLUMN id
    SET DEFAULT nextval('public.user_login_verification_tokens_id_seq'::regclass);

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_login_verification_attempts_pkey'
          AND conrelid = 'public.user_login_verification_attempts'::regclass
    ) THEN
        ALTER TABLE ONLY public.user_login_verification_attempts
            ADD CONSTRAINT user_login_verification_attempts_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_login_verification_attempts_email_key'
          AND conrelid = 'public.user_login_verification_attempts'::regclass
    ) THEN
        ALTER TABLE ONLY public.user_login_verification_attempts
            ADD CONSTRAINT user_login_verification_attempts_email_key UNIQUE (email);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_login_verification_tokens_pkey'
          AND conrelid = 'public.user_login_verification_tokens'::regclass
    ) THEN
        ALTER TABLE ONLY public.user_login_verification_tokens
            ADD CONSTRAINT user_login_verification_tokens_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_login_verification_tokens_token_hash_key'
          AND conrelid = 'public.user_login_verification_tokens'::regclass
    ) THEN
        ALTER TABLE ONLY public.user_login_verification_tokens
            ADD CONSTRAINT user_login_verification_tokens_token_hash_key UNIQUE (token_hash);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_user_login_tokens_user'
          AND conrelid = 'public.user_login_verification_tokens'::regclass
    ) THEN
        ALTER TABLE ONLY public.user_login_verification_tokens
            ADD CONSTRAINT fk_user_login_tokens_user
            FOREIGN KEY (user_id)
            REFERENCES public.users(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE;
    END IF;

END;
$$;

DROP TRIGGER IF EXISTS trg_user_login_attempts_updated_at
ON public.user_login_verification_attempts;

CREATE TRIGGER trg_user_login_attempts_updated_at
BEFORE UPDATE ON public.user_login_verification_attempts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role
ON public.users (role);

CREATE INDEX IF NOT EXISTS idx_user_login_attempts_locked_until
ON public.user_login_verification_attempts (locked_until);

CREATE INDEX IF NOT EXISTS idx_user_login_tokens_email
ON public.user_login_verification_tokens (email);

CREATE INDEX IF NOT EXISTS idx_user_login_tokens_active
ON public.user_login_verification_tokens (token_hash, expires_at)
WHERE consumed_at IS NULL;


-- ============================================================
-- SYNC SEQUENCE
-- Important when existing records are already present
-- ============================================================

SELECT setval(
    'public.users_id_seq',
    COALESCE(
        (SELECT MAX(id) FROM public.users),
        1
    ),
    true
);


COMMIT;
