BEGIN;

CREATE TABLE IF NOT EXISTS public.page_visits (
    id bigserial NOT NULL,
    visitor_id character varying(100) NOT NULL,
    session_id character varying(100) NOT NULL,
    page_path character varying(500) NOT NULL,
    page_title character varying(300),
    browser character varying(100),
    browser_version character varying(50),
    os character varying(100),
    os_version character varying(50),
    device_type character varying(30),
    screen_width integer,
    screen_height integer,
    duration_seconds integer,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT page_visits_pkey PRIMARY KEY (id),
    CONSTRAINT ck_page_visits_duration_seconds CHECK (
        duration_seconds IS NULL
        OR (duration_seconds >= 0 AND duration_seconds <= 86400)
    ),
    CONSTRAINT ck_page_visits_screen_height CHECK (
        screen_height IS NULL
        OR (screen_height >= 0 AND screen_height <= 20000)
    ),
    CONSTRAINT ck_page_visits_screen_width CHECK (
        screen_width IS NULL
        OR (screen_width >= 0 AND screen_width <= 20000)
    )
);

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at
    ON public.page_visits (created_at);

CREATE INDEX IF NOT EXISTS idx_page_visits_visitor_id
    ON public.page_visits (visitor_id);

CREATE INDEX IF NOT EXISTS idx_page_visits_session_id
    ON public.page_visits (session_id);

CREATE INDEX IF NOT EXISTS idx_page_visits_page_path
    ON public.page_visits (page_path);

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at_visitor_id
    ON public.page_visits (created_at, visitor_id);

COMMIT;
