--
-- Sewa First Innovation Challenge (SFIC) - Production Database Setup
--
-- This file creates the complete schema (extensions, tables, sequences,
-- constraints, indexes, functions, triggers) and seeds reference/lookup
-- data for a plain PostgreSQL production environment (NOT Supabase).
--
-- It is derived from a Supabase pg_dump export (postgres-202609161708.sql)
-- with the following changes:
--   - Supabase-specific roles/grants (anon, authenticated, service_role,
--     supabase_admin, pg_database_owner) removed - they do not exist on a
--     standard Postgres server and would cause the script to fail.
--   - "ALTER ... OWNER TO postgres" statements removed. Objects are owned
--     by whichever role runs this script (typically your app DB user).
--     Run this script connected as that user, or adjust ownership after.
--   - CREATE EXTENSION citext added explicitly (Supabase pre-installs it;
--     a fresh Postgres instance does not).
--   - Only reference/lookup data is seeded (states, districts,
--     institute_types, participant_categories,
--     participant_category_institute_types, challenge_categories,
--     challenges). Transactional/test data from the source dump
--     (participants, applications, team members, uploaded documents,
--     verification tokens, form saves) is intentionally EXCLUDED - it was
--     dev/staging test data containing real-looking PII and must not be
--     loaded into production.
--
-- Usage:
--   psql "postgresql://<user>:<password>@<host>:<port>/<database>" -f production_schema.sql
--
-- Prerequisites:
--   - An empty target database (schema "public") on PostgreSQL 13+.
--   - The connecting role must have CREATEDB/owner-level rights on the
--     target database, or at minimum the ability to create extensions,
--     tables, functions and triggers in the "public" schema. Creating the
--     citext extension may require superuser privileges on some managed
--     Postgres providers (e.g. RDS allows it for the master user via
--     rds_superuser; most managed providers support it out of the box).
--

BEGIN;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- ============================================================================
-- FUNCTIONS (trigger bodies)
-- ============================================================================

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

CREATE FUNCTION public.validate_application_document_member() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    member_application_id BIGINT;
BEGIN
    IF NEW.uploaded_by_member_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT application_id
    INTO member_application_id
    FROM application_team_members
    WHERE id = NEW.uploaded_by_member_id;

    IF member_application_id IS NULL OR member_application_id <> NEW.application_id THEN
        RAISE EXCEPTION
            'uploaded_by_member_id must belong to the same application';
    END IF;

    RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_application_form_save_member() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    member_application_id BIGINT;
BEGIN
    IF NEW.saved_by_member_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT application_id
    INTO member_application_id
    FROM application_team_members
    WHERE id = NEW.saved_by_member_id;

    IF member_application_id IS NULL OR member_application_id <> NEW.application_id THEN
        RAISE EXCEPTION
            'saved_by_member_id must belong to the same application';
    END IF;

    RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_application_profile_references() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.state_id IS NOT NULL
       AND NEW.district_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM districts d
           WHERE d.id = NEW.district_id
             AND d.state_id = NEW.state_id
       ) THEN
        RAISE EXCEPTION 'district_id must belong to state_id';
    END IF;

    IF NEW.institute_type_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM participant_category_institute_types pcit
           WHERE pcit.participant_category_id = NEW.participant_category_id
             AND pcit.institute_type_id = NEW.institute_type_id
       ) THEN
        RAISE EXCEPTION
            'institute_type_id is not allowed for participant_category_id';
    END IF;

    RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_application_team_lead() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    lead_application_id BIGINT;
BEGIN
    IF NEW.team_lead_team_member_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT application_id
    INTO lead_application_id
    FROM application_team_members
    WHERE id = NEW.team_lead_team_member_id;

    IF lead_application_id IS NULL OR lead_application_id <> NEW.id THEN
        RAISE EXCEPTION
            'team_lead_team_member_id must belong to the same application';
    END IF;

    RETURN NEW;
END;
$$;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- ============================================================================
-- TABLES
-- ============================================================================

-- states -----------------------------------------------------------------

CREATE TABLE public.states (
    id bigint NOT NULL,
    name_en character varying(120) NOT NULL,
    name_bn character varying(160) NOT NULL,
    name_hi character varying(160) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE public.states_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.states_id_seq OWNED BY public.states.id;

-- districts ----------------------------------------------------------------

CREATE TABLE public.districts (
    id bigint NOT NULL,
    state_id bigint NOT NULL,
    name_en character varying(160) NOT NULL,
    name_bn character varying(200) NOT NULL,
    name_hi character varying(200) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE public.districts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;

-- participant_categories -----------------------------------------------------

CREATE TABLE public.participant_categories (
    id bigint NOT NULL,
    code character varying(30) NOT NULL,
    name_en character varying(100) NOT NULL,
    name_bn character varying(150) NOT NULL,
    name_hi character varying(150) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.participant_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participant_categories_id_seq OWNED BY public.participant_categories.id;

-- institute_types ---------------------------------------------------------

CREATE TABLE public.institute_types (
    id bigint NOT NULL,
    name_en character varying(120) NOT NULL,
    name_bn character varying(180) NOT NULL,
    name_hi character varying(180) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.institute_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.institute_types_id_seq OWNED BY public.institute_types.id;

-- participant_category_institute_types --------------------------------------

CREATE TABLE public.participant_category_institute_types (
    id bigint NOT NULL,
    participant_category_id bigint NOT NULL,
    institute_type_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.participant_category_institute_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participant_category_institute_types_id_seq OWNED BY public.participant_category_institute_types.id;

-- challenge_categories -------------------------------------------------------

CREATE TABLE public.challenge_categories (
    id bigint NOT NULL,
    name_en character varying(220) NOT NULL,
    name_bn character varying(300) NOT NULL,
    name_hi character varying(300) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.challenge_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.challenge_categories_id_seq OWNED BY public.challenge_categories.id;

-- challenges -----------------------------------------------------------------

CREATE TABLE public.challenges (
    id bigint NOT NULL,
    code character varying(60) NOT NULL,
    title_en character varying(220) NOT NULL,
    title_bn character varying(300) NOT NULL,
    title_hi character varying(300) NOT NULL,
    description_en text,
    description_bn text,
    description_hi text,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_challenges_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'open'::character varying, 'closed'::character varying, 'archived'::character varying])::text[])))
);

CREATE SEQUENCE public.challenges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.challenges_id_seq OWNED BY public.challenges.id;

-- participants -----------------------------------------------------------

CREATE TABLE public.participants (
    id bigint NOT NULL,
    full_name character varying(200) NOT NULL,
    email public.citext NOT NULL,
    mobile character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verified_at timestamp with time zone,
    date_of_birth date,
    gender character varying(20),
    CONSTRAINT ck_participants_gender CHECK (((gender IS NULL) OR ((gender)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying, 'Others'::character varying])::text[]))))
);

CREATE SEQUENCE public.participants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participants_id_seq OWNED BY public.participants.id;

-- participant_applications -----------------------------------------------

CREATE TABLE public.participant_applications (
    id bigint NOT NULL,
    application_number character varying(40) NOT NULL,
    challenge_id bigint NOT NULL,
    participant_id bigint NOT NULL,
    participant_category_id bigint NOT NULL,
    state_id bigint,
    district_id bigint,
    institute_type_id bigint,
    challenge_category_id bigint,
    team_lead_team_member_id bigint,
    form_language character varying(2) DEFAULT 'en'::character varying NOT NULL,
    participation_mode character varying(20) DEFAULT 'Individual'::character varying NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    city character varying(120),
    pin_code character varying(12),
    address text,
    institute_name character varying(240),
    other_institute_type character varying(160),
    problem_location text,
    proposed_solution text,
    technology_method text,
    implementation_route text,
    cost_funding text,
    beneficiaries text,
    project_timeline text,
    expected_impact text,
    scalability text,
    prototype_pilot text,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    highest_educational_qualification character varying(160),
    last_attended_educational_institute character varying(240),
    year_of_passing character varying(4),
    mentor_acknowledge_to text,
    intellectual_property_publication text,
    video_url text,
    CONSTRAINT ck_applications_form_language CHECK (((form_language)::text = ANY ((ARRAY['en'::character varying, 'bn'::character varying, 'hi'::character varying])::text[]))),
    CONSTRAINT ck_applications_participation_mode CHECK (((participation_mode)::text = ANY ((ARRAY['Individual'::character varying, 'Team'::character varying])::text[]))),
    CONSTRAINT ck_applications_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'email_verification'::character varying, 'profile_completion'::character varying, 'proposal_submission'::character varying, 'submitted'::character varying, 'withdrawn'::character varying])::text[])))
);

CREATE SEQUENCE public.participant_applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participant_applications_id_seq OWNED BY public.participant_applications.id;

-- application_number_sequences --------------------------------------------

CREATE TABLE public.application_number_sequences (
    state_code character varying(2) NOT NULL,
    next_number integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_application_number_sequences_next_number CHECK (((next_number >= 1) AND (next_number <= 10000))),
    CONSTRAINT ck_application_number_sequences_state_code CHECK (((state_code)::text ~ '^[A-Z]{2}$'::text))
);

-- application_team_members -------------------------------------------------

CREATE TABLE public.application_team_members (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    participant_id bigint,
    full_name character varying(200) NOT NULL,
    email public.citext NOT NULL,
    mobile character varying(20) NOT NULL,
    is_applicant boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.application_team_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.application_team_members_id_seq OWNED BY public.application_team_members.id;

-- application_documents ------------------------------------------------------

CREATE TABLE public.application_documents (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    uploaded_by_member_id bigint,
    document_type character varying(60) DEFAULT 'supporting_document'::character varying NOT NULL,
    language_code character varying(2),
    original_file_name character varying(255) NOT NULL,
    storage_key text NOT NULL,
    public_url text,
    mime_type character varying(120) DEFAULT 'application/pdf'::character varying NOT NULL,
    file_size_bytes bigint NOT NULL,
    checksum_sha256 character varying(64),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_documents_file_size_positive CHECK ((file_size_bytes > 0)),
    CONSTRAINT ck_documents_language CHECK (((language_code IS NULL) OR ((language_code)::text = ANY ((ARRAY['en'::character varying, 'bn'::character varying, 'hi'::character varying])::text[]))))
);

CREATE SEQUENCE public.application_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.application_documents_id_seq OWNED BY public.application_documents.id;

-- application_form_saves ----------------------------------------------------

CREATE TABLE public.application_form_saves (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    saved_by_member_id bigint,
    language_code character varying(2) NOT NULL,
    form_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_form_saves_language CHECK (((language_code)::text = ANY ((ARRAY['en'::character varying, 'bn'::character varying, 'hi'::character varying])::text[])))
);

CREATE SEQUENCE public.application_form_saves_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.application_form_saves_id_seq OWNED BY public.application_form_saves.id;

-- participant_email_verification_attempts ------------------------------------

CREATE TABLE public.participant_email_verification_attempts (
    id bigint NOT NULL,
    email public.citext NOT NULL,
    mobile character varying(20) NOT NULL,
    first_requested_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sent_at timestamp with time zone,
    send_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.participant_email_verification_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participant_email_verification_attempts_id_seq OWNED BY public.participant_email_verification_attempts.id;

-- participant_email_verification_tokens --------------------------------------

CREATE TABLE public.participant_email_verification_tokens (
    id bigint NOT NULL,
    participant_id bigint NOT NULL,
    application_id bigint NOT NULL,
    token_hash character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.participant_email_verification_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participant_email_verification_tokens_id_seq OWNED BY public.participant_email_verification_tokens.id;

-- participant_login_verification_attempts ------------------------------------

CREATE TABLE public.participant_login_verification_attempts (
    id bigint NOT NULL,
    email public.citext NOT NULL,
    first_requested_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sent_at timestamp with time zone,
    send_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.participant_login_verification_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participant_login_verification_attempts_id_seq OWNED BY public.participant_login_verification_attempts.id;

-- participant_login_verification_tokens --------------------------------------

CREATE TABLE public.participant_login_verification_tokens (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    member_id bigint NOT NULL,
    email public.citext NOT NULL,
    token_hash character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.participant_login_verification_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.participant_login_verification_tokens_id_seq OWNED BY public.participant_login_verification_tokens.id;

-- ============================================================================
-- DEFAULT COLUMN VALUES (id SERIAL wiring)
-- ============================================================================

ALTER TABLE ONLY public.states ALTER COLUMN id SET DEFAULT nextval('public.states_id_seq'::regclass);
ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);
ALTER TABLE ONLY public.participant_categories ALTER COLUMN id SET DEFAULT nextval('public.participant_categories_id_seq'::regclass);
ALTER TABLE ONLY public.institute_types ALTER COLUMN id SET DEFAULT nextval('public.institute_types_id_seq'::regclass);
ALTER TABLE ONLY public.participant_category_institute_types ALTER COLUMN id SET DEFAULT nextval('public.participant_category_institute_types_id_seq'::regclass);
ALTER TABLE ONLY public.challenge_categories ALTER COLUMN id SET DEFAULT nextval('public.challenge_categories_id_seq'::regclass);
ALTER TABLE ONLY public.challenges ALTER COLUMN id SET DEFAULT nextval('public.challenges_id_seq'::regclass);
ALTER TABLE ONLY public.participants ALTER COLUMN id SET DEFAULT nextval('public.participants_id_seq'::regclass);
ALTER TABLE ONLY public.participant_applications ALTER COLUMN id SET DEFAULT nextval('public.participant_applications_id_seq'::regclass);
ALTER TABLE ONLY public.application_team_members ALTER COLUMN id SET DEFAULT nextval('public.application_team_members_id_seq'::regclass);
ALTER TABLE ONLY public.application_documents ALTER COLUMN id SET DEFAULT nextval('public.application_documents_id_seq'::regclass);
ALTER TABLE ONLY public.application_form_saves ALTER COLUMN id SET DEFAULT nextval('public.application_form_saves_id_seq'::regclass);
ALTER TABLE ONLY public.participant_email_verification_attempts ALTER COLUMN id SET DEFAULT nextval('public.participant_email_verification_attempts_id_seq'::regclass);
ALTER TABLE ONLY public.participant_email_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.participant_email_verification_tokens_id_seq'::regclass);
ALTER TABLE ONLY public.participant_login_verification_attempts ALTER COLUMN id SET DEFAULT nextval('public.participant_login_verification_attempts_id_seq'::regclass);
ALTER TABLE ONLY public.participant_login_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.participant_login_verification_tokens_id_seq'::regclass);

-- ============================================================================
-- PRIMARY KEY / UNIQUE CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.states
    ADD CONSTRAINT uq_states_name_en UNIQUE (name_en);

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT uq_districts_state_name_en UNIQUE (state_id, name_en);

ALTER TABLE ONLY public.participant_categories
    ADD CONSTRAINT participant_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_categories
    ADD CONSTRAINT participant_categories_code_key UNIQUE (code);

ALTER TABLE ONLY public.institute_types
    ADD CONSTRAINT institute_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.institute_types
    ADD CONSTRAINT institute_types_name_en_key UNIQUE (name_en);

ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT participant_category_institute_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT uq_pc_institute_type UNIQUE (participant_category_id, institute_type_id);

ALTER TABLE ONLY public.challenge_categories
    ADD CONSTRAINT challenge_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.challenge_categories
    ADD CONSTRAINT challenge_categories_name_en_key UNIQUE (name_en);

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_code_key UNIQUE (code);

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participants
    ADD CONSTRAINT uq_participants_email UNIQUE (email);
ALTER TABLE ONLY public.participants
    ADD CONSTRAINT uq_participants_mobile UNIQUE (mobile);

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT participant_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT participant_applications_application_number_key UNIQUE (application_number);
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT uq_applications_participant_challenge UNIQUE (participant_id, challenge_id);

ALTER TABLE ONLY public.application_number_sequences
    ADD CONSTRAINT application_number_sequences_pkey PRIMARY KEY (state_code);

ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT application_team_members_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT uq_team_members_application_email UNIQUE (application_id, email);
ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT uq_team_members_application_mobile UNIQUE (application_id, mobile);

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.application_form_saves
    ADD CONSTRAINT application_form_saves_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.participant_email_verification_attempts
    ADD CONSTRAINT participant_email_verification_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_email_verification_attempts
    ADD CONSTRAINT participant_email_verification_attempts_email_key UNIQUE (email);

ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT participant_email_verification_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT participant_email_verification_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.participant_login_verification_attempts
    ADD CONSTRAINT participant_login_verification_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_login_verification_attempts
    ADD CONSTRAINT participant_login_verification_attempts_email_key UNIQUE (email);

ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT participant_login_verification_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT participant_login_verification_tokens_token_hash_key UNIQUE (token_hash);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT fk_districts_state FOREIGN KEY (state_id) REFERENCES public.states(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT fk_pc_institute_category FOREIGN KEY (participant_category_id) REFERENCES public.participant_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT fk_pc_institute_type FOREIGN KEY (institute_type_id) REFERENCES public.institute_types(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_challenge FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_challenge_category FOREIGN KEY (challenge_category_id) REFERENCES public.challenge_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_district FOREIGN KEY (district_id) REFERENCES public.districts(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_institute_type FOREIGN KEY (institute_type_id) REFERENCES public.institute_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_participant_category FOREIGN KEY (participant_category_id) REFERENCES public.participant_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_state FOREIGN KEY (state_id) REFERENCES public.states(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_team_lead_member FOREIGN KEY (team_lead_team_member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT fk_team_members_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT fk_team_members_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT fk_documents_uploaded_by_member FOREIGN KEY (uploaded_by_member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.application_form_saves
    ADD CONSTRAINT fk_form_saves_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.application_form_saves
    ADD CONSTRAINT fk_form_saves_saved_by_member FOREIGN KEY (saved_by_member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT fk_email_verification_tokens_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT fk_email_verification_tokens_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT fk_participant_login_tokens_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT fk_participant_login_tokens_member FOREIGN KEY (member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_states_name_bn ON public.states USING btree (name_bn);
CREATE INDEX idx_states_name_hi ON public.states USING btree (name_hi);

CREATE INDEX idx_districts_name_bn ON public.districts USING btree (name_bn);
CREATE INDEX idx_districts_name_hi ON public.districts USING btree (name_hi);
CREATE INDEX idx_districts_state_id ON public.districts USING btree (state_id);

CREATE INDEX idx_pc_institute_category_id ON public.participant_category_institute_types USING btree (participant_category_id);
CREATE INDEX idx_pc_institute_type_id ON public.participant_category_institute_types USING btree (institute_type_id);

CREATE INDEX idx_applications_challenge_id ON public.participant_applications USING btree (challenge_id);
CREATE INDEX idx_applications_participant_id ON public.participant_applications USING btree (participant_id);
CREATE INDEX idx_applications_state_district ON public.participant_applications USING btree (state_id, district_id);
CREATE INDEX idx_applications_status ON public.participant_applications USING btree (status);

CREATE INDEX idx_team_members_application_id ON public.application_team_members USING btree (application_id);
CREATE INDEX idx_team_members_participant_id ON public.application_team_members USING btree (participant_id);

CREATE INDEX idx_documents_application_id ON public.application_documents USING btree (application_id);
CREATE INDEX idx_documents_uploaded_by_member_id ON public.application_documents USING btree (uploaded_by_member_id);

CREATE INDEX idx_form_saves_application_id ON public.application_form_saves USING btree (application_id);
CREATE INDEX idx_form_saves_application_language_current ON public.application_form_saves USING btree (application_id, language_code, is_current);
CREATE UNIQUE INDEX uq_form_saves_current_language ON public.application_form_saves USING btree (application_id, language_code) WHERE (is_current = true);

CREATE INDEX idx_email_verification_attempts_locked_until ON public.participant_email_verification_attempts USING btree (locked_until);
CREATE INDEX idx_email_verification_attempts_mobile ON public.participant_email_verification_attempts USING btree (mobile);

CREATE INDEX idx_email_verification_tokens_active ON public.participant_email_verification_tokens USING btree (token_hash, expires_at) WHERE (consumed_at IS NULL);
CREATE INDEX idx_email_verification_tokens_application_id ON public.participant_email_verification_tokens USING btree (application_id);
CREATE INDEX idx_email_verification_tokens_participant_id ON public.participant_email_verification_tokens USING btree (participant_id);

CREATE INDEX idx_participant_login_attempts_locked_until ON public.participant_login_verification_attempts USING btree (locked_until);

CREATE INDEX idx_participant_login_tokens_active ON public.participant_login_verification_tokens USING btree (token_hash, expires_at) WHERE (consumed_at IS NULL);
CREATE INDEX idx_participant_login_tokens_email ON public.participant_login_verification_tokens USING btree (email);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participant_applications_updated_at BEFORE UPDATE ON public.participant_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_application_team_members_updated_at BEFORE UPDATE ON public.application_team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_application_documents_updated_at BEFORE UPDATE ON public.application_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_email_verification_attempts_updated_at BEFORE UPDATE ON public.participant_email_verification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participant_login_attempts_updated_at BEFORE UPDATE ON public.participant_login_verification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE CONSTRAINT TRIGGER trg_validate_application_team_lead AFTER INSERT OR UPDATE OF team_lead_team_member_id ON public.participant_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_team_lead();
CREATE CONSTRAINT TRIGGER trg_validate_application_profile_references AFTER INSERT OR UPDATE OF state_id, district_id, participant_category_id, institute_type_id ON public.participant_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_profile_references();
CREATE CONSTRAINT TRIGGER trg_validate_application_document_member AFTER INSERT OR UPDATE OF application_id, uploaded_by_member_id ON public.application_documents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_document_member();
CREATE CONSTRAINT TRIGGER trg_validate_application_form_save_member AFTER INSERT OR UPDATE OF application_id, saved_by_member_id ON public.application_form_saves DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_form_save_member();

-- ============================================================================
-- SEED DATA - reference / lookup tables only
-- (No participant, application, team member, document, verification-token,
--  or form-save rows are seeded - that data is user-submitted at runtime.
--  Values below are copied verbatim from the source Supabase dump.)
-- ============================================================================

-- states ---------------------------------------------------------------

INSERT INTO public.states VALUES (1, 'Arunachal Pradesh', 'অরুণাচল প্রদেশ', 'अरुणाचल प्रदेश', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (2, 'Bihar', 'বিহার', 'बिहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (3, 'Jharkhand', 'ঝাড়খণ্ড', 'झारखंड', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (4, 'Meghalaya', 'মেঘালয়', 'मेघालय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (5, 'Nagaland', 'নাগাল্যান্ড', 'नागालैंड', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (6, 'Tripura', 'ত্রিপুরা', 'त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (7, 'Assam', 'অসম', 'असम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (8, 'Manipur', 'মণিপুর', 'मणिपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (9, 'Mizoram', 'মিজোরাম', 'मिजोरम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (10, 'Sikkim', 'সিকিম', 'सिक्किम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.states VALUES (11, 'West Bengal', 'পশ্চিমবঙ্গ', 'पश्चिम बंगाल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;

SELECT setval('public.states_id_seq', GREATEST((SELECT MAX(id) FROM public.states), 1));

-- districts --------------------------------------------------------------

INSERT INTO public.districts VALUES (22, 1, 'Tawang', 'তাওয়াং', 'तवांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (23, 1, 'Tirap', 'তিরাপ', 'तिरप', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (24, 1, 'Upper Siang', 'আপার সিয়াং', 'ऊपरी सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (25, 1, 'Upper Subansiri', 'আপার সুবানসিরি', 'ऊपरी सुबनसिरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (26, 1, 'West Kameng', 'পশ্চিম কামেং', 'पश्चिम कामेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (27, 1, 'West Siang', 'পশ্চিম সিয়াং', 'पश्चिम सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (28, 2, 'Araria', 'আরারিয়া', 'अररिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (29, 2, 'Arwal', 'আরওয়াল', 'अरवल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (30, 2, 'Aurangabad', 'ঔরঙ্গাবাদ', 'औरंगाबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (31, 2, 'Banka', 'বাঁকা', 'बांका', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (32, 2, 'Begusarai', 'বেগুসরাই', 'बेगूसराय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (33, 2, 'Bhagalpur', 'ভাগলপুর', 'भागलपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (34, 2, 'Bhojpur', 'ভোজপুর', 'भोजपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (35, 2, 'Buxar', 'বক্সার', 'बक्सर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (36, 2, 'Darbhanga', 'দারভাঙ্গা', 'दरभंगा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (37, 2, 'Gaya', 'গয়া', 'गया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (38, 2, 'Gopalganj', 'গোপালগঞ্জ', 'गोपालगंज', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (39, 2, 'Jamui', 'জামুই', 'जमुई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (40, 2, 'Jehanabad', 'জেহানাবাদ', 'जहानाबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (41, 2, 'Kaimur (Bhabua)', 'কাইমুর (ভাবুয়া)', 'कैमूर (भभुआ)', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (42, 2, 'Katihar', 'কাটিহার', 'कटिहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (43, 2, 'Khagaria', 'খাগাড়িয়া', 'खगड़िया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (44, 2, 'Kishanganj', 'কিশনগঞ্জ', 'किशनगंज', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (45, 2, 'Lakhisarai', 'লখিসরাই', 'लखीसराय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (46, 2, 'Madhepura', 'মাধেপুরা', 'मधेपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (47, 2, 'Madhubani', 'মধুবনী', 'मधुबनी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (48, 2, 'Munger', 'মুঙ্গের', 'मुंगेर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (49, 2, 'Muzaffarpur', 'মুজাফ্ফরপুর', 'मुजफ्फरपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (50, 2, 'Nalanda', 'নালন্দা', 'नालंदा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (51, 2, 'Nawada', 'নওয়াদা', 'नवादा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (52, 2, 'Pashchim Champaran', 'পশ্চিম চম্পারণ', 'पश्चिम चंपारण', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (53, 2, 'Patna', 'পাটনা', 'पटना', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (54, 2, 'Purbi Champaran', 'পূর্ব চম্পারণ', 'पूर्वी चंपारण', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (55, 2, 'Purnia', 'পূর্ণিয়া', 'पूर्णिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (56, 2, 'Rohtas', 'রোহতাস', 'रोहतास', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (57, 2, 'Saharsa', 'সহরসা', 'सहरसा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (58, 2, 'Samastipur', 'সমস্তিপুর', 'समस्तीपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (59, 2, 'Saran', 'সারণ', 'सारण', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (60, 2, 'Sheikhpura', 'শেখপুরা', 'शेखपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (61, 2, 'Sheohar', 'শেওহর', 'शिवहर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (62, 2, 'Sitamarhi', 'সীতামঢ়ী', 'सीतामढ़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (63, 2, 'Siwan', 'সিওয়ান', 'सीवान', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (64, 2, 'Supaul', 'সুপৌল', 'सुपौल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (65, 2, 'Vaishali', 'বৈশালী', 'वैशाली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (66, 3, 'Bokaro', 'বোকারো', 'बोकारो', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (67, 3, 'Chatra', 'চাতরা', 'चतरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (68, 3, 'Deoghar', 'দেওঘর', 'देवघर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (69, 3, 'Dhanbad', 'ধানবাদ', 'धनबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (70, 3, 'Dumka', 'দুমকা', 'दुमका', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (71, 3, 'East Singhbum', 'পূর্ব সিংভূম', 'पूर्वी सिंहभूम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (72, 3, 'Garhwa', 'গাড়োয়া', 'गढ़वा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (73, 3, 'Giridih', 'গিরিডিহ', 'गिरिडीह', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (74, 3, 'Godda', 'গোড্ডা', 'गोड्डा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (75, 3, 'Gumla', 'গুমলা', 'गुमला', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (76, 3, 'Hazaribagh', 'হাজারিবাগ', 'हजारीबाग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (77, 3, 'Jamtara', 'জামতাড়া', 'जामताड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (78, 3, 'Khunti', 'খুঁটি', 'खूंटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (79, 3, 'Koderma', 'কোডারমা', 'कोडरमा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (80, 3, 'Latehar', 'লাতেহার', 'लातेहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (81, 3, 'Lohardaga', 'লোহারদাগা', 'लोहरदगा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (82, 3, 'Pakur', 'পাকুড়', 'पाकुड़', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (83, 3, 'Palamu', 'পালামু', 'पलामू', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (84, 3, 'Ramgarh', 'রামগড়', 'रामगढ़', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (85, 3, 'Ranchi', 'রাঁচি', 'रांची', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (86, 3, 'Sahebganj', 'সাহেবগঞ্জ', 'साहिबगंज', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (87, 3, 'Saraikela Kharsawan', 'সরাইকেলা খরসাওয়ান', 'सरायकेला खरसावां', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (88, 3, 'Simdega', 'সিমডেগা', 'सिमडेगा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (89, 3, 'West Singhbhum', 'পশ্চিম সিংভূম', 'पश्चिमी सिंहभूम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (90, 4, 'East Garo Hills', 'পূর্ব গারো হিলস', 'पूर्वी गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (91, 4, 'East Jaintia Hills', 'পূর্ব জয়ন্তিয়া হিলস', 'पूर्वी जयंतिया हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (92, 4, 'East Khasi Hills', 'পূর্ব খাসি হিলস', 'पूर्वी खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (93, 4, 'Eastern West Khasi Hills', 'পূর্ব পশ্চিম খাসি হিলস', 'ईस्टर्न वेस्ट खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (94, 4, 'North Garo Hills', 'উত্তর গারো হিলস', 'उत्तरी गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (95, 4, 'Ri Bhoi', 'রি ভোই', 'री भोई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (96, 4, 'South Garo Hills', 'দক্ষিণ গারো হিলস', 'दक्षिण गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (97, 4, 'South West Garo Hills', 'দক্ষিণ-পশ্চিম গারো হিলস', 'दक्षिण पश्चिम गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (98, 4, 'South West Khasi Hills', 'দক্ষিণ-পশ্চিম খাসি হিলস', 'दक्षिण पश्चिम खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (99, 4, 'West Garo Hills', 'পশ্চিম গারো হিলস', 'पश्चिम गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (100, 4, 'West Jaintia Hills', 'পশ্চিম জয়ন্তিয়া হিলস', 'पश्चिम जयंतिया हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (101, 4, 'West Khasi Hills', 'পশ্চিম খাসি হিলস', 'पश्चिम खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (102, 5, 'Chumoukedima', 'চুমুকেদিমা', 'चुमौकेदिमा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (103, 5, 'Dimapur', 'ডিমাপুর', 'दीमापुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (104, 5, 'Kiphire', 'কিফিরে', 'किफिरे', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (105, 5, 'Kohima', 'কোহিমা', 'कोहिमा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (106, 5, 'Longleng', 'লংলেং', 'लोंगलेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (107, 5, 'Meluri', 'মেলুরি', 'मेलुरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (108, 5, 'Mokokchung', 'মোকোকচুং', 'मोकोकचुंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (109, 5, 'Mon', 'মন', 'मोन', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (110, 5, 'Niuland', 'নিউল্যান্ড', 'निउलैंड', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (111, 5, 'Noklak', 'নোকলাক', 'नोकलाक', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (112, 5, 'Peren', 'পেরেন', 'पेरेन', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (113, 5, 'Phek', 'ফেক', 'फेक', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (114, 5, 'Shamator', 'শামাতোর', 'शामाटोर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (115, 5, 'Tseminyu', 'তসেমিনিউ', 'त्सेमिन्यु', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (116, 5, 'Tuensang', 'তুয়েনসাং', 'तुएनसांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (117, 5, 'Wokha', 'ওখা', 'वोखा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (118, 5, 'Zunheboto', 'জুনহেবোটো', 'जुन्हेबोटो', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (119, 6, 'Dhalai', 'ধলাই', 'धलाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (120, 6, 'Gomati', 'গোমতী', 'गोमती', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (121, 6, 'Khowai', 'খোয়াই', 'खोवाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (122, 6, 'North Tripura', 'উত্তর ত্রিপুরা', 'उत्तरी त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (123, 6, 'Sepahijala', 'সিপাহিজলা', 'सिपाहीजला', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (124, 6, 'South Tripura', 'দক্ষিণ ত্রিপুরা', 'दक्षिण त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (125, 6, 'Unakoti', 'উনকোটি', 'उनाकोटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (126, 6, 'West Tripura', 'পশ্চিম ত্রিপুরা', 'पश्चिम त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (127, 7, 'Bajali', 'বজালি', 'बजाली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (128, 7, 'Baksa', 'বাকসা', 'बक्सा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (129, 7, 'Barpeta', 'বরপেটা', 'बारपेटा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (130, 7, 'Biswanath', 'বিশ্বনাথ', 'बिश्वनाथ', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (131, 7, 'Bongaigaon', 'বঙাইগাঁও', 'बोंगाईगांव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (132, 7, 'Cachar', 'কাছাড়', 'कछार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (133, 7, 'Charaideo', 'চরাইদেউ', 'चराइदेव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (134, 7, 'Chirang', 'চিরাং', 'चिरांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (135, 7, 'Darrang', 'দরং', 'दरंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (136, 7, 'Dhemaji', 'ধেমাজি', 'धेमाजी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (137, 7, 'Dhubri', 'ধুবড়ি', 'धुबरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (138, 7, 'Dibrugarh', 'ডিব্রুগড়', 'डिब्रूगढ़', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (139, 7, 'Dima Hasao', 'ডিমা হাসাও', 'दीमा हसाओ', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (140, 7, 'Goalpara', 'গোয়ালপাড়া', 'गोलपाड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (141, 7, 'Golaghat', 'গোলাঘাট', 'गोलाघाट', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (142, 7, 'Hailakandi', 'হাইলাকান্দি', 'हैलाकांडी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (143, 7, 'Hojai', 'হোজাই', 'होजाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (144, 7, 'Jorhat', 'যোরহাট', 'जोरहाट', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (145, 7, 'Kamrup', 'কামরূপ', 'कामरूप', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (146, 7, 'Kamrup Metro', 'কামরূপ মহানগর', 'कामरूप महानगर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (147, 7, 'Karbi Anglong', 'কার্বি আংলং', 'कार्बी आंगलोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (148, 7, 'Kokrajhar', 'কোকরাঝাড়', 'कोकराझार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (149, 7, 'Lakhimpur', 'লখিমপুর', 'लखीमपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (150, 7, 'Majuli', 'মাজুলি', 'माजुली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (151, 7, 'Marigaon', 'মরিগাঁও', 'मोरीगांव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (152, 7, 'Nagaon', 'নগাঁও', 'नगांव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (153, 7, 'Nalbari', 'নলবাড়ি', 'नलबाड़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (154, 7, 'Sivasagar', 'শিবসাগর', 'शिवसागर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (155, 7, 'Sonitpur', 'শোণিতপুর', 'शोणितपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (156, 7, 'South Salmara Mancachar', 'দক্ষিণ শালমারা মানকাচর', 'दक्षिण सलमारा मनकाचर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (157, 7, 'Sribhumi', 'শ্রীভূমি', 'श्रीभूमि', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (158, 7, 'Tamulpur', 'তামুলপুর', 'तामुलपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (159, 7, 'Tinsukia', 'তিনসুকিয়া', 'तिनसुकिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (160, 7, 'Udalguri', 'ওদালগুড়ি', 'उदालगुड़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (161, 7, 'West Karbi Anglong', 'পশ্চিম কার্বি আংলং', 'पश्चिम कार्बी आंगलोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (167, 8, 'Jiribam', 'জিরিবাম', 'जिरीबाम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (168, 8, 'Kakching', 'কাকচিং', 'काकचिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (169, 8, 'Kamjong', 'কামজং', 'कामजोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (170, 8, 'Kangpokpi', 'কাংপোকপি', 'कांगपोकपी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (171, 8, 'Noney', 'নোনে', 'नोनी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (172, 8, 'Pherzawl', 'ফেরজাওল', 'फेरजावल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (173, 8, 'Senapati', 'সেনাপতি', 'सेनापति', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (174, 8, 'Tamenglong', 'তামেংলং', 'तामेंगलॉन्ग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (175, 8, 'Tengnoupal', 'তেংনৌপাল', 'तेंगनौपाल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (176, 8, 'Thoubal', 'থৌবাল', 'थौबल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (177, 8, 'Ukhrul', 'উখরুল', 'उखरुल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (178, 9, 'Aizawl', 'আইজল', 'आइजोल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (179, 9, 'Champhai', 'চাম্ফাই', 'चम्फाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (180, 9, 'Hnahthial', 'হ্নাহথিয়াল', 'हनाहथियाल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (181, 9, 'Khawzawl', 'খাওজাওল', 'खावजोल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (182, 9, 'Kolasib', 'কোলাসিব', 'कोलासिब', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (183, 9, 'Lawngtlai', 'লংতলাই', 'लॉन्गतलाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (184, 9, 'Lunglei', 'লুংলেই', 'लुंगलेई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (185, 9, 'Mamit', 'মামিত', 'ममित', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (186, 9, 'Saitual', 'সাইতুয়াল', 'सैतुअल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (187, 9, 'Serchhip', 'সেরছিপ', 'सेरछिप', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (188, 9, 'Siaha', 'সিয়াহা', 'सियाहा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (189, 10, 'Gangtok', 'গ্যাংটক', 'गंगटोक', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (190, 10, 'Gyalshing', 'গ্যালশিং', 'ग्यालशिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (191, 10, 'Mangan', 'মাঙ্গান', 'मंगन', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (192, 10, 'Namchi', 'নামচি', 'नामची', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (193, 10, 'Pakyong', 'পাকইয়ং', 'पाक्योंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (194, 10, 'Soreng', 'সোরেং', 'सोरेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (195, 11, 'Alipurduar', 'আলিপুরদুয়ার', 'अलीपुरद्वार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (196, 11, 'Bankura', 'বাঁকুড়া', 'बांकुड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (197, 11, 'Birbhum', 'বীরভূম', 'बीरभूम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (198, 11, 'Cooch Behar', 'কোচবিহার', 'कूच बिहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (199, 11, 'Dakshin Dinajpur', 'দক্ষিণ দিনাজপুর', 'दक्षिण दिनाजपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (200, 11, 'Darjeeling', 'দার্জিলিং', 'दार्जिलिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (201, 11, 'Hooghly', 'হুগলি', 'हुगली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (202, 11, 'Howrah', 'হাওড়া', 'हावड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (203, 11, 'Jalpaiguri', 'জলপাইগুড়ি', 'जलपाईगुड़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (204, 11, 'Jhargram', 'ঝাড়গ্রাম', 'झाड़ग्राम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (205, 11, 'Kalimpong', 'কালিম্পং', 'कलिम्पोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (206, 11, 'Kolkata', 'কলকাতা', 'कोलकाता', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (207, 11, 'Malda', 'মালদা', 'मालदा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (208, 11, 'Murshidabad', 'মুর্শিদাবাদ', 'मुर्शिदाबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (209, 11, 'Nadia', 'নদিয়া', 'नदिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (210, 11, 'North 24 Parganas', 'উত্তর ২৪ পরগনা', 'उत्तर 24 परगना', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (211, 11, 'Paschim Bardhaman', 'পশ্চিম বর্ধমান', 'पश्चिम बर्धमान', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (1, 1, 'Anjaw', 'আনজাও', 'अंजॉ', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (2, 1, 'Bichom', 'বিচোম', 'बिचोम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (3, 1, 'Changlang', 'চাংলাং', 'चांगलांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (4, 1, 'Dibang Valley', 'দিবাং ভ্যালি', 'दिबांग घाटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (5, 1, 'East Kameng', 'পূর্ব কামেং', 'पूर्व कामेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (6, 1, 'East Siang', 'পূর্ব সিয়াং', 'पूर्व सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (7, 1, 'Kamle', 'কামলে', 'कामले', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (8, 1, 'Keyi Panyor', 'কেই পানিয়র', 'केई पन्योर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (9, 1, 'Kra Daadi', 'ক্রা দাদি', 'क्रा दादी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (10, 1, 'Kurung Kumey', 'কুরুং কুমে', 'कुरुंग कुमेय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (11, 1, 'Leparada', 'লেপারাদা', 'लेपरादा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (12, 1, 'Lohit', 'লোহিত', 'लोहित', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (13, 1, 'Longding', 'লংডিং', 'लोंगडिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (14, 1, 'Lower Dibang Valley', 'লোয়ার দিবাং ভ্যালি', 'निचली दिबांग घाटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (15, 1, 'Lower Siang', 'লোয়ার সিয়াং', 'निचला सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (16, 1, 'Lower Subansiri', 'লোয়ার সুবানসিরি', 'निचला सुबनसिरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (17, 1, 'Namsai', 'নামসাই', 'नामसाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (18, 1, 'Pakke Kessang', 'পাক্কে কেসাং', 'पक्के केसांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (19, 1, 'Papum Pare', 'পাপুম পারে', 'पापुम पारे', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (20, 1, 'Shi Yomi', 'শি ইয়োমি', 'शी योमी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (21, 1, 'Siang', 'সিয়াং', 'सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (162, 8, 'Bishnupur', 'বিষ্ণুপুর', 'बिष्णुपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (163, 8, 'Chandel', 'চান্দেল', 'चंदेल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (164, 8, 'Churachandpur', 'চূড়াচাঁদপুর', 'चुराचांदपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (165, 8, 'Imphal East', 'ইম্ফল পূর্ব', 'इम्फाल पूर्व', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (166, 8, 'Imphal West', 'ইম্ফল পশ্চিম', 'इम्फाल पश्चिम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (212, 11, 'Paschim Medinipur', 'পশ্চিম মেদিনীপুর', 'पश्चिम मेदिनीपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (213, 11, 'Purba Bardhaman', 'পূর্ব বর্ধমান', 'पूर्व बर्धमान', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (214, 11, 'Purba Medinipur', 'পূর্ব মেদিনীপুর', 'पूर्व मेदिनीपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (215, 11, 'Purulia', 'পুরুলিয়া', 'पुरुलिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (216, 11, 'South 24 Parganas', 'দক্ষিণ ২৪ পরগনা', 'दक्षिण 24 परगना', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.districts VALUES (217, 11, 'Uttar Dinajpur', 'উত্তর দিনাজপুর', 'उत्तर दिनाजपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true) ON CONFLICT (id) DO NOTHING;

SELECT setval('public.districts_id_seq', GREATEST((SELECT MAX(id) FROM public.districts), 1));

-- participant_categories ---------------------------------------------------

INSERT INTO public.participant_categories VALUES (1, 'JUNIOR', 'Junior', 'জুনিয়র', 'जूनियर', true, 1, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_categories VALUES (2, 'OPEN', 'Open', 'ওপেন', 'ओपन', true, 2, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('public.participant_categories_id_seq', GREATEST((SELECT MAX(id) FROM public.participant_categories), 1));

-- institute_types ----------------------------------------------------------

INSERT INTO public.institute_types VALUES (1, 'School', 'স্কুল', 'स्कूल', true, 1, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.institute_types VALUES (2, 'ITI', 'আইটিআই', 'आईटीआई', true, 2, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.institute_types VALUES (3, 'Diploma', 'ডিপ্লোমা', 'डिप्लोमा', true, 3, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.institute_types VALUES (4, 'Undergraduate', 'স্নাতক স্তর', 'स्नातक स्तर', true, 4, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.institute_types VALUES (5, 'Graduate', 'স্নাতক', 'स्नातक', true, 5, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.institute_types VALUES (6, 'Professional', 'পেশাজীবী', 'पेशेवर', true, 6, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.institute_types VALUES (7, 'Startup', 'স্টার্টআপ', 'स्टार्टअप', true, 7, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.institute_types VALUES (8, 'Community Group', 'কমিউনিটি গ্রুপ', 'सामुदायिक समूह', true, 8, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('public.institute_types_id_seq', GREATEST((SELECT MAX(id) FROM public.institute_types), 1));

-- participant_category_institute_types --------------------------------------

INSERT INTO public.participant_category_institute_types VALUES (1, 1, 1, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (2, 1, 2, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (3, 1, 3, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (4, 1, 4, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (5, 2, 1, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (6, 2, 2, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (7, 2, 3, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (8, 2, 4, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (9, 2, 5, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (10, 2, 6, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (11, 2, 7, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.participant_category_institute_types VALUES (12, 2, 8, '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('public.participant_category_institute_types_id_seq', GREATEST((SELECT MAX(id) FROM public.participant_category_institute_types), 1));

-- challenge_categories -------------------------------------------------------

INSERT INTO public.challenge_categories VALUES (1, 'Village & Panchayat Innovation', 'গ্রাম ও পঞ্চায়েত উদ্ভাবন', 'ग्राम एवं पंचायत नवाचार', true, 1, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (2, 'Agriculture & Allied Sectors', 'কৃষি ও সংশ্লিষ্ট ক্ষেত্র', 'कृषि एवं संबद्ध क्षेत्र', true, 2, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (3, 'Education & Skill Development', 'শিক্ষা ও দক্ষতা উন্নয়ন', 'शिक्षा एवं कौशल विकास', true, 3, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (4, 'Healthcare', 'স্বাস্থ্যসেবা', 'स्वास्थ्य सेवा', true, 4, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (5, 'Urban & Civic Innovation', 'নগর ও নাগরিক উদ্ভাবন', 'शहरी एवं नागरिक नवाचार', true, 5, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (6, 'Environment & Sustainability', 'পরিবেশ ও টেকসই উন্নয়ন', 'पर्यावरण एवं सतत विकास', true, 6, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (7, 'Employment, Livelihood & MSMEs', 'কর্মসংস্থান, জীবিকা ও এমএসএমই', 'रोजगार, आजीविका एवं एमएसएमई', true, 7, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (8, 'Women & Child Development', 'নারী ও শিশু উন্নয়ন', 'महिला एवं बाल विकास', true, 8, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (9, 'Disaster Management & Community Safety', 'দুর্যোগ ব্যবস্থাপনা ও কমিউনিটি নিরাপত্তা', 'आपदा प्रबंधन एवं सामुदायिक सुरक्षा', true, 9, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (10, 'Transport & Mobility', 'পরিবহন ও চলাচল', 'परिवहन एवं गतिशीलता', true, 10, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (11, 'Energy', 'জ্বালানি', 'ऊर्जा', true, 11, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.challenge_categories VALUES (12, 'Tourism & Cultural Innovation', 'পর্যটন ও সাংস্কৃতিক উদ্ভাবন', 'पर्यटन एवं सांस्कृतिक नवाचार', true, 12, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('public.challenge_categories_id_seq', GREATEST((SELECT MAX(id) FROM public.challenge_categories), 1));

-- challenges -------------------------------------------------------------

INSERT INTO public.challenges VALUES (2, 'SFIC-2026', 'Sewa First Innovation Challenge 2026', 'সেবা ফার্স্ট ইনোভেশন চ্যালেঞ্জ ২০২৬', 'सेवा फर्स्ट इनोवेशन चैलेंज 2026', 'Science, technology and innovation for public impact.', 'জনস্বার্থে বিজ্ঞান, প্রযুক্তি এবং উদ্ভাবন।', 'जनहित के लिए विज्ञान, प्रौद्योगिकी और नवाचार।', NULL, NULL, 'open', true, '2026-09-12 06:47:51.766637+00', '2026-09-12 06:47:51.766637+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('public.challenges_id_seq', GREATEST((SELECT MAX(id) FROM public.challenges), 1));

COMMIT;
