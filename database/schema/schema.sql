--
-- Seva First Innovation Challenge (SFIC) - Database Schema
--
-- Creates the complete schema (extensions, functions, tables, sequences,
-- constraints, indexes, triggers) for a plain PostgreSQL production
-- environment (NOT Supabase). Contains no data - run seeds/reference_data.sql
-- afterwards to populate lookup tables.
--
-- Derived from a Supabase pg_dump export with the following changes:
--   - Supabase-specific roles/grants (anon, authenticated, service_role,
--     supabase_admin, pg_database_owner) removed - they do not exist on a
--     standard Postgres server and would cause the script to fail.
--   - "ALTER ... OWNER TO postgres" statements removed. Objects are owned
--     by whichever role runs this script (typically your app DB user).
--   - CREATE EXTENSION citext added explicitly (Supabase pre-installs it;
--     a fresh Postgres instance does not).
--
-- Usage:
--   psql "postgresql://<user>:<password>@<host>:<port>/<database>" -f schema/schema.sql
--
-- Prerequisites:
--   - An empty target database (schema "public") on PostgreSQL 13+.
--   - The connecting role must be able to create extensions, tables,
--     functions and triggers in the "public" schema. Creating the citext
--     extension may require elevated privileges on some managed Postgres
--     providers (most support it out of the box for the master user).
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

-- user_roles ------------------------------------------------------------

CREATE TABLE public.user_roles (
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

-- app_settings --------------------------------------------------

CREATE TABLE public.app_settings (
    setting_key character varying(120) NOT NULL,
    setting_value text NOT NULL,
    setting_type character varying(30) DEFAULT 'string'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_app_settings_key CHECK (((setting_key)::text ~ '^[A-Z0-9_]+$'::text)),
    CONSTRAINT ck_app_settings_type CHECK (((setting_type)::text = ANY ((ARRAY['boolean'::character varying, 'integer'::character varying, 'string'::character varying, 'timestamp'::character varying])::text[])))
);

-- participants -----------------------------------------------------------

CREATE TABLE public.participants (
    id bigint NOT NULL,
    full_name character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
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

-- users -----------------------------------------------------------------

CREATE TABLE public.users (
    id bigint NOT NULL,
    fullname character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
    mobile character varying(20) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

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
    email character varying(200) NOT NULL,
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
    email character varying(200) NOT NULL,
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
    email character varying(200) NOT NULL,
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
    email character varying(200) NOT NULL,
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

-- user_login_verification_attempts ------------------------------------------

CREATE TABLE public.user_login_verification_attempts (
    id bigint NOT NULL,
    email character varying(200) NOT NULL,
    first_requested_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sent_at timestamp with time zone,
    send_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.user_login_verification_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_login_verification_attempts_id_seq OWNED BY public.user_login_verification_attempts.id;

-- user_login_verification_tokens --------------------------------------------

CREATE TABLE public.user_login_verification_tokens (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    email character varying(200) NOT NULL,
    token_hash character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.user_login_verification_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_login_verification_tokens_id_seq OWNED BY public.user_login_verification_tokens.id;

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
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.participant_applications ALTER COLUMN id SET DEFAULT nextval('public.participant_applications_id_seq'::regclass);
ALTER TABLE ONLY public.application_team_members ALTER COLUMN id SET DEFAULT nextval('public.application_team_members_id_seq'::regclass);
ALTER TABLE ONLY public.application_documents ALTER COLUMN id SET DEFAULT nextval('public.application_documents_id_seq'::regclass);
ALTER TABLE ONLY public.application_form_saves ALTER COLUMN id SET DEFAULT nextval('public.application_form_saves_id_seq'::regclass);
ALTER TABLE ONLY public.participant_email_verification_attempts ALTER COLUMN id SET DEFAULT nextval('public.participant_email_verification_attempts_id_seq'::regclass);
ALTER TABLE ONLY public.participant_email_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.participant_email_verification_tokens_id_seq'::regclass);
ALTER TABLE ONLY public.participant_login_verification_attempts ALTER COLUMN id SET DEFAULT nextval('public.participant_login_verification_attempts_id_seq'::regclass);
ALTER TABLE ONLY public.participant_login_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.participant_login_verification_tokens_id_seq'::regclass);
ALTER TABLE ONLY public.user_login_verification_attempts ALTER COLUMN id SET DEFAULT nextval('public.user_login_verification_attempts_id_seq'::regclass);
ALTER TABLE ONLY public.user_login_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_login_verification_tokens_id_seq'::regclass);

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

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (role);

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (setting_key);

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participants
    ADD CONSTRAINT uq_participants_email UNIQUE (email);
ALTER TABLE ONLY public.participants
    ADD CONSTRAINT uq_participants_mobile UNIQUE (mobile);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_mobile UNIQUE (mobile);

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT participant_applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT participant_applications_application_number_key UNIQUE (application_number);

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

ALTER TABLE ONLY public.user_login_verification_attempts
    ADD CONSTRAINT user_login_verification_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_login_verification_attempts
    ADD CONSTRAINT user_login_verification_attempts_email_key UNIQUE (email);

ALTER TABLE ONLY public.user_login_verification_tokens
    ADD CONSTRAINT user_login_verification_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_login_verification_tokens
    ADD CONSTRAINT user_login_verification_tokens_token_hash_key UNIQUE (token_hash);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT fk_districts_state FOREIGN KEY (state_id) REFERENCES public.states(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT fk_pc_institute_category FOREIGN KEY (participant_category_id) REFERENCES public.participant_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT fk_pc_institute_type FOREIGN KEY (institute_type_id) REFERENCES public.institute_types(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_role FOREIGN KEY (role) REFERENCES public.user_roles(role) ON UPDATE CASCADE ON DELETE RESTRICT;

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

ALTER TABLE ONLY public.user_login_verification_tokens
    ADD CONSTRAINT fk_user_login_tokens_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

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

CREATE INDEX idx_users_role ON public.users USING btree (role);

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

CREATE INDEX idx_user_login_attempts_locked_until ON public.user_login_verification_attempts USING btree (locked_until);

CREATE INDEX idx_user_login_tokens_active ON public.user_login_verification_tokens USING btree (token_hash, expires_at) WHERE (consumed_at IS NULL);
CREATE INDEX idx_user_login_tokens_email ON public.user_login_verification_tokens USING btree (email);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participant_applications_updated_at BEFORE UPDATE ON public.participant_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_application_team_members_updated_at BEFORE UPDATE ON public.application_team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_application_documents_updated_at BEFORE UPDATE ON public.application_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_email_verification_attempts_updated_at BEFORE UPDATE ON public.participant_email_verification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participant_login_attempts_updated_at BEFORE UPDATE ON public.participant_login_verification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_login_attempts_updated_at BEFORE UPDATE ON public.user_login_verification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE CONSTRAINT TRIGGER trg_validate_application_team_lead AFTER INSERT OR UPDATE OF team_lead_team_member_id ON public.participant_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_team_lead();
CREATE CONSTRAINT TRIGGER trg_validate_application_profile_references AFTER INSERT OR UPDATE OF state_id, district_id, participant_category_id, institute_type_id ON public.participant_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_profile_references();
CREATE CONSTRAINT TRIGGER trg_validate_application_document_member AFTER INSERT OR UPDATE OF application_id, uploaded_by_member_id ON public.application_documents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_document_member();
CREATE CONSTRAINT TRIGGER trg_validate_application_form_save_member AFTER INSERT OR UPDATE OF application_id, saved_by_member_id ON public.application_form_saves DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_form_save_member();

COMMIT;
