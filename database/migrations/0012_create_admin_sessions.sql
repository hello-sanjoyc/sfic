BEGIN;

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

COMMIT;
