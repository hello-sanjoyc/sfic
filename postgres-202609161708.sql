--
-- PostgreSQL database dump
--

\restrict 1GEddwvVBpfnZgJRouRu1L9HIVXEFRiNxrL9rFhaOdQ45UX8rmIeDF50gJZQClh

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

-- Started on 2026-09-16 17:08:50 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 18 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4126 (class 0 OID 0)
-- Dependencies: 18
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 465 (class 1255 OID 17697)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- TOC entry 468 (class 1255 OID 17897)
-- Name: validate_application_document_member(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.validate_application_document_member() OWNER TO postgres;

--
-- TOC entry 469 (class 1255 OID 17900)
-- Name: validate_application_form_save_member(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.validate_application_form_save_member() OWNER TO postgres;

--
-- TOC entry 467 (class 1255 OID 17893)
-- Name: validate_application_profile_references(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.validate_application_profile_references() OWNER TO postgres;

--
-- TOC entry 466 (class 1255 OID 17827)
-- Name: validate_application_team_lead(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.validate_application_team_lead() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 294 (class 1259 OID 17831)
-- Name: application_documents; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.application_documents OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 17830)
-- Name: application_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_documents_id_seq OWNER TO postgres;

--
-- TOC entry 4129 (class 0 OID 0)
-- Dependencies: 293
-- Name: application_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_documents_id_seq OWNED BY public.application_documents.id;


--
-- TOC entry 296 (class 1259 OID 17860)
-- Name: application_form_saves; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.application_form_saves OWNER TO postgres;

--
-- TOC entry 295 (class 1259 OID 17859)
-- Name: application_form_saves_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_form_saves_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_form_saves_id_seq OWNER TO postgres;

--
-- TOC entry 4131 (class 0 OID 0)
-- Dependencies: 295
-- Name: application_form_saves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_form_saves_id_seq OWNED BY public.application_form_saves.id;


--
-- TOC entry 299 (class 1259 OID 17927)
-- Name: application_number_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_number_sequences (
    state_code character varying(2) NOT NULL,
    next_number integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_application_number_sequences_next_number CHECK (((next_number >= 1) AND (next_number <= 10000))),
    CONSTRAINT ck_application_number_sequences_state_code CHECK (((state_code)::text ~ '^[A-Z]{2}$'::text))
);


ALTER TABLE public.application_number_sequences OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 17793)
-- Name: application_team_members; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.application_team_members OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 17792)
-- Name: application_team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_team_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_team_members_id_seq OWNER TO postgres;

--
-- TOC entry 4134 (class 0 OID 0)
-- Dependencies: 291
-- Name: application_team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_team_members_id_seq OWNED BY public.application_team_members.id;


--
-- TOC entry 284 (class 1259 OID 17578)
-- Name: challenge_categories; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.challenge_categories OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 17577)
-- Name: challenge_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.challenge_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.challenge_categories_id_seq OWNER TO postgres;

--
-- TOC entry 4136 (class 0 OID 0)
-- Dependencies: 283
-- Name: challenge_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.challenge_categories_id_seq OWNED BY public.challenge_categories.id;


--
-- TOC entry 286 (class 1259 OID 17699)
-- Name: challenges; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.challenges OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 17698)
-- Name: challenges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.challenges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.challenges_id_seq OWNER TO postgres;

--
-- TOC entry 4138 (class 0 OID 0)
-- Dependencies: 285
-- Name: challenges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.challenges_id_seq OWNED BY public.challenges.id;


--
-- TOC entry 276 (class 1259 OID 17507)
-- Name: districts; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.districts OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 17506)
-- Name: districts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.districts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.districts_id_seq OWNER TO postgres;

--
-- TOC entry 4140 (class 0 OID 0)
-- Dependencies: 275
-- Name: districts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;


--
-- TOC entry 280 (class 1259 OID 17543)
-- Name: institute_types; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.institute_types OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 17542)
-- Name: institute_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.institute_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.institute_types_id_seq OWNER TO postgres;

--
-- TOC entry 4142 (class 0 OID 0)
-- Dependencies: 279
-- Name: institute_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.institute_types_id_seq OWNED BY public.institute_types.id;


--
-- TOC entry 290 (class 1259 OID 17732)
-- Name: participant_applications; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.participant_applications OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 17731)
-- Name: participant_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_applications_id_seq OWNER TO postgres;

--
-- TOC entry 4144 (class 0 OID 0)
-- Dependencies: 289
-- Name: participant_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_applications_id_seq OWNED BY public.participant_applications.id;


--
-- TOC entry 278 (class 1259 OID 17530)
-- Name: participant_categories; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.participant_categories OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 17529)
-- Name: participant_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_categories_id_seq OWNER TO postgres;

--
-- TOC entry 4146 (class 0 OID 0)
-- Dependencies: 277
-- Name: participant_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_categories_id_seq OWNED BY public.participant_categories.id;


--
-- TOC entry 282 (class 1259 OID 17556)
-- Name: participant_category_institute_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participant_category_institute_types (
    id bigint NOT NULL,
    participant_category_id bigint NOT NULL,
    institute_type_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.participant_category_institute_types OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 17555)
-- Name: participant_category_institute_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_category_institute_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_category_institute_types_id_seq OWNER TO postgres;

--
-- TOC entry 4148 (class 0 OID 0)
-- Dependencies: 281
-- Name: participant_category_institute_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_category_institute_types_id_seq OWNED BY public.participant_category_institute_types.id;


--
-- TOC entry 301 (class 1259 OID 18253)
-- Name: participant_email_verification_attempts; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.participant_email_verification_attempts OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 18252)
-- Name: participant_email_verification_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_email_verification_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_email_verification_attempts_id_seq OWNER TO postgres;

--
-- TOC entry 4150 (class 0 OID 0)
-- Dependencies: 300
-- Name: participant_email_verification_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_email_verification_attempts_id_seq OWNED BY public.participant_email_verification_attempts.id;


--
-- TOC entry 298 (class 1259 OID 17905)
-- Name: participant_email_verification_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.participant_email_verification_tokens (
    id bigint NOT NULL,
    participant_id bigint NOT NULL,
    application_id bigint NOT NULL,
    token_hash character varying(128) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.participant_email_verification_tokens OWNER TO postgres;

--
-- TOC entry 297 (class 1259 OID 17904)
-- Name: participant_email_verification_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_email_verification_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_email_verification_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 4152 (class 0 OID 0)
-- Dependencies: 297
-- Name: participant_email_verification_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_email_verification_tokens_id_seq OWNED BY public.participant_email_verification_tokens.id;


--
-- TOC entry 303 (class 1259 OID 18544)
-- Name: participant_login_verification_attempts; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.participant_login_verification_attempts OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 18543)
-- Name: participant_login_verification_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_login_verification_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_login_verification_attempts_id_seq OWNER TO postgres;

--
-- TOC entry 4154 (class 0 OID 0)
-- Dependencies: 302
-- Name: participant_login_verification_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_login_verification_attempts_id_seq OWNED BY public.participant_login_verification_attempts.id;


--
-- TOC entry 305 (class 1259 OID 18559)
-- Name: participant_login_verification_tokens; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.participant_login_verification_tokens OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 18558)
-- Name: participant_login_verification_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participant_login_verification_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participant_login_verification_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 4156 (class 0 OID 0)
-- Dependencies: 304
-- Name: participant_login_verification_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participant_login_verification_tokens_id_seq OWNED BY public.participant_login_verification_tokens.id;


--
-- TOC entry 288 (class 1259 OID 17716)
-- Name: participants; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.participants OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 17715)
-- Name: participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.participants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.participants_id_seq OWNER TO postgres;

--
-- TOC entry 4158 (class 0 OID 0)
-- Dependencies: 287
-- Name: participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.participants_id_seq OWNED BY public.participants.id;


--
-- TOC entry 274 (class 1259 OID 17496)
-- Name: states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.states (
    id bigint NOT NULL,
    name_en character varying(120) NOT NULL,
    name_bn character varying(160) NOT NULL,
    name_hi character varying(160) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.states OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 17495)
-- Name: states_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.states_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.states_id_seq OWNER TO postgres;

--
-- TOC entry 4160 (class 0 OID 0)
-- Dependencies: 273
-- Name: states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.states_id_seq OWNED BY public.states.id;


--
-- TOC entry 3777 (class 2604 OID 17834)
-- Name: application_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_documents ALTER COLUMN id SET DEFAULT nextval('public.application_documents_id_seq'::regclass);


--
-- TOC entry 3783 (class 2604 OID 17863)
-- Name: application_form_saves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_form_saves ALTER COLUMN id SET DEFAULT nextval('public.application_form_saves_id_seq'::regclass);


--
-- TOC entry 3772 (class 2604 OID 17796)
-- Name: application_team_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_team_members ALTER COLUMN id SET DEFAULT nextval('public.application_team_members_id_seq'::regclass);


--
-- TOC entry 3752 (class 2604 OID 17581)
-- Name: challenge_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_categories ALTER COLUMN id SET DEFAULT nextval('public.challenge_categories_id_seq'::regclass);


--
-- TOC entry 3757 (class 2604 OID 17702)
-- Name: challenges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges ALTER COLUMN id SET DEFAULT nextval('public.challenges_id_seq'::regclass);


--
-- TOC entry 3736 (class 2604 OID 17510)
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- TOC entry 3745 (class 2604 OID 17546)
-- Name: institute_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institute_types ALTER COLUMN id SET DEFAULT nextval('public.institute_types_id_seq'::regclass);


--
-- TOC entry 3766 (class 2604 OID 17735)
-- Name: participant_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications ALTER COLUMN id SET DEFAULT nextval('public.participant_applications_id_seq'::regclass);


--
-- TOC entry 3740 (class 2604 OID 17533)
-- Name: participant_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_categories ALTER COLUMN id SET DEFAULT nextval('public.participant_categories_id_seq'::regclass);


--
-- TOC entry 3750 (class 2604 OID 17559)
-- Name: participant_category_institute_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_category_institute_types ALTER COLUMN id SET DEFAULT nextval('public.participant_category_institute_types_id_seq'::regclass);


--
-- TOC entry 3791 (class 2604 OID 18256)
-- Name: participant_email_verification_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_attempts ALTER COLUMN id SET DEFAULT nextval('public.participant_email_verification_attempts_id_seq'::regclass);


--
-- TOC entry 3787 (class 2604 OID 17908)
-- Name: participant_email_verification_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.participant_email_verification_tokens_id_seq'::regclass);


--
-- TOC entry 3796 (class 2604 OID 18547)
-- Name: participant_login_verification_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_attempts ALTER COLUMN id SET DEFAULT nextval('public.participant_login_verification_attempts_id_seq'::regclass);


--
-- TOC entry 3801 (class 2604 OID 18562)
-- Name: participant_login_verification_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.participant_login_verification_tokens_id_seq'::regclass);


--
-- TOC entry 3762 (class 2604 OID 17719)
-- Name: participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants ALTER COLUMN id SET DEFAULT nextval('public.participants_id_seq'::regclass);


--
-- TOC entry 3732 (class 2604 OID 17499)
-- Name: states id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.states ALTER COLUMN id SET DEFAULT nextval('public.states_id_seq'::regclass);


--
-- TOC entry 4109 (class 0 OID 17831)
-- Dependencies: 294
-- Data for Name: application_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.application_documents VALUES (1, 1, 1, 'supporting_document', 'en', 'architect-interview-questions.pdf', 'applications/1/1789328410924-c7c1c86a-2d78-400a-98a0-ee94c9c86503-architect-interview-questions.pdf', NULL, 'application/pdf', 129489, '35760c45b3125117326c85a24e6a75a129fc86ad6d98c8dd79311ece69f47261', 1, '2026-09-13 19:40:12.135069+00', '2026-09-13 19:40:12.135069+00');
INSERT INTO public.application_documents VALUES (2, 1, 1, 'supporting_document', 'en', 'design-interview-questions.pdf', 'applications/1/1789328410943-c1f79c21-7a84-4a95-82eb-e13a2ca4bc21-design-interview-questions.pdf', NULL, 'application/pdf', 227371, '92d923d8966763c6c445624358d15fb13e99cccd315ad3626e83e5d57ab24e9b', 2, '2026-09-13 19:40:12.135069+00', '2026-09-13 19:40:12.135069+00');
INSERT INTO public.application_documents VALUES (3, 1, 1, 'supporting_document', 'en', 'interview-questions.pdf', 'applications/1/1789328410953-7f0b288b-941c-4a10-ba4a-1d09711e9b29-interview-questions.pdf', NULL, 'application/pdf', 112701, 'ef50d0b63e1b4a201f2e0086edc5109ac4f72f5f1255e6576bb5f8cc2d0be59b', 3, '2026-09-13 19:40:12.135069+00', '2026-09-13 19:40:12.135069+00');
INSERT INTO public.application_documents VALUES (4, 2, 4, 'supporting_document', 'en', '102509000001.pdf', 'applications/2/1789359283299-01379404-46cc-473e-a883-be9dce6bd8ef-102509000001.pdf', NULL, 'application/pdf', 17915, '96dcd4aaebb62b26b64791cda6ea3e1e9892a19719274737cd68bef542609470', 1, '2026-09-14 04:14:44.244897+00', '2026-09-14 04:14:44.244897+00');
INSERT INTO public.application_documents VALUES (5, 4, 7, 'supporting_document', 'en', 'pdf-sample_0.pdf', 'applications/4/1789363267245-9b78f18c-74c3-4038-a291-e9fdf1f803d2-pdf-sample_0.pdf', NULL, 'application/pdf', 13264, '3df79d34abbca99308e79cb94461c1893582604d68329a41fd4bec1885e6adb4', 1, '2026-09-14 05:21:08.325482+00', '2026-09-14 05:21:08.325482+00');
INSERT INTO public.application_documents VALUES (6, 5, 9, 'supporting_document', 'en', 'Dutch delegation 20.6.26.pdf', 'applications/5/1789381395513-539509c8-ae4e-4404-97f1-2f8fb1565474-Dutch-delegation-20.6.26.pdf', NULL, 'application/pdf', 1715034, '4f95c45bffe6b7bcf635d75f9b23ae6dbad2adb0f890546bf5bcbb44d55c8fd7', 1, '2026-09-14 10:23:16.517628+00', '2026-09-14 10:23:16.517628+00');
INSERT INTO public.application_documents VALUES (7, 7, 12, 'supporting_document', 'en', 'design-interview-questions.pdf', 'applications/7/1789473525556-6f74e2e4-d1ec-4711-8761-174eec8b1bc6-design-interview-questions.pdf', NULL, 'application/pdf', 227371, '92d923d8966763c6c445624358d15fb13e99cccd315ad3626e83e5d57ab24e9b', 1, '2026-09-15 11:58:46.656122+00', '2026-09-15 11:58:46.656122+00');


--
-- TOC entry 4111 (class 0 OID 17860)
-- Dependencies: 296
-- Data for Name: application_form_saves; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.application_form_saves VALUES (1, 1, 1, 'en', '{"step": 1, "email": "sany.chowdhury@gmail.com", "mobile": "9830799651", "fullName": "Sanjoy Chowdhury", "language": "en", "participantCategory": "OPEN"}', false, '2026-09-13 19:38:11.060225+00');
INSERT INTO public.application_form_saves VALUES (3, 2, 4, 'en', '{"step": 1, "email": "kousik.kskrna@gmail.com", "mobile": "8240521471", "fullName": "KOUSIK PAN", "language": "en", "participantCategory": "OPEN"}', false, '2026-09-14 04:08:31.942849+00');
INSERT INTO public.application_form_saves VALUES (4, 2, 4, 'en', '{"city": "KOLKATA", "step": 4, "theme": "Employment, Livelihood & MSMEs", "address": "AK MUKHERJEE ROAD", "pinCode": "700090", "stateId": 11, "language": "en", "districtId": 210, "costFunding": "Whether it can travel to another district, and what would have to change.", "scalability": "Whether it can travel to another district, and what would have to change.", "teamMembers": [], "beneficiaries": "Whether it can travel to another district, and what would have to change.", "instituteName": "TP SOLUTIONS", "instituteType": "Startup", "expectedImpact": "Whether it can travel to another district, and what would have to change.", "prototypePilot": "Whether it can travel to another district, and what would have to change.", "problemLocation": "Whether it can travel to another district, and what would have to change.", "projectTimeline": "Whether it can travel to another district, and what would have to change.", "proposedSolution": "Whether it can travel to another district, and what would have to change.", "technologyMethod": "Whether it can travel to another district, and what would have to change.", "applicationNumber": "SFIC-WB-0002", "participationMode": "Individual", "otherInstituteType": "", "implementationRoute": "Whether it can travel to another district, and what would have to change.", "supportingDocuments": [{"size": 17915, "mimeType": "application/pdf", "storageKey": "applications/2/1789359283299-01379404-46cc-473e-a883-be9dce6bd8ef-102509000001.pdf", "checksumSha256": "96dcd4aaebb62b26b64791cda6ea3e1e9892a19719274737cd68bef542609470", "originalFileName": "102509000001.pdf"}]}', true, '2026-09-14 04:14:44.244897+00');
INSERT INTO public.application_form_saves VALUES (5, 3, 6, 'en', '{"step": 1, "email": "apurbodas197@gmail.com", "mobile": "9732954177", "fullName": "Apurbo Das", "language": "en", "participantCategory": "OPEN"}', true, '2026-09-14 04:18:02.893264+00');
INSERT INTO public.application_form_saves VALUES (6, 4, 7, 'en', '{"step": 1, "email": "amitavasau@gmail.com", "mobile": "7074812524", "fullName": "AMITAVA SAU", "language": "en", "participantCategory": "OPEN"}', false, '2026-09-14 04:57:23.890826+00');
INSERT INTO public.application_form_saves VALUES (7, 4, 7, 'en', '{"city": "Kolkata", "step": 4, "theme": "Village & Panchayat Innovation", "address": "All address", "pinCode": "7074812524", "stateId": 11, "language": "en", "districtId": 202, "costFunding": "Estimated cost is INR 5 Lakhs, funded via government schemes and local development grants.", "scalability": "This structural framework can easily be replicated in neighboring panchayats and districts.", "teamMembers": [], "beneficiaries": "Around 5,000 local villagers and daily commuters will directly benefit from this project.", "instituteName": "Ggi", "instituteType": "Graduate", "expectedImpact": "Reduces travel time by 40 percent and prevents local flooding during heavy monsoon rains.", "prototypePilot": "A small 50-meter test stretch has been successfully constructed as a working pilot model", "problemLocation": "Severe road condition and waterlogging issue at Howrah main road causing daily traffic delays.", "projectTimeline": "Project implementation will take approximately 3 months from start to complete execution.", "proposedSolution": "Rebuilding the road with durable concrete and proper underground drainage system.", "technologyMethod": "Pre-cast concrete blocks and smart sensor-based drainage systems for fast implementation.", "applicationNumber": "SFIC-WB-0003", "participationMode": "Individual", "otherInstituteType": "", "implementationRoute": "Local panchayat and PWD department will execute the work step by step with official approval.", "supportingDocuments": [{"size": 13264, "mimeType": "application/pdf", "storageKey": "applications/4/1789363267245-9b78f18c-74c3-4038-a291-e9fdf1f803d2-pdf-sample_0.pdf", "checksumSha256": "3df79d34abbca99308e79cb94461c1893582604d68329a41fd4bec1885e6adb4", "originalFileName": "pdf-sample_0.pdf"}]}', true, '2026-09-14 05:21:08.325482+00');
INSERT INTO public.application_form_saves VALUES (8, 5, 9, 'en', '{"step": 1, "email": "abhisheksjcba@gmail.com", "mobile": "9886346990", "fullName": "Abhishek", "language": "en", "participantCategory": "OPEN"}', false, '2026-09-14 10:14:11.83687+00');
INSERT INTO public.application_form_saves VALUES (9, 5, 9, 'en', '{"city": "Kolkata", "step": 4, "theme": "Village & Panchayat Innovation", "address": "Abc", "pinCode": "700007", "stateId": 11, "language": "en", "districtId": 206, "costFunding": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "scalability": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "teamMembers": [], "beneficiaries": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "instituteName": "Abc", "instituteType": "Professional", "expectedImpact": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "prototypePilot": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "problemLocation": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "projectTimeline": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "proposedSolution": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "technologyMethod": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "applicationNumber": "SFIC-WB-0004", "participationMode": "Individual", "otherInstituteType": "", "implementationRoute": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "supportingDocuments": [{"size": 1715034, "mimeType": "application/pdf", "storageKey": "applications/5/1789381395513-539509c8-ae4e-4404-97f1-2f8fb1565474-Dutch-delegation-20.6.26.pdf", "checksumSha256": "4f95c45bffe6b7bcf635d75f9b23ae6dbad2adb0f890546bf5bcbb44d55c8fd7", "originalFileName": "Dutch delegation 20.6.26.pdf"}]}', true, '2026-09-14 10:23:16.517628+00');
INSERT INTO public.application_form_saves VALUES (10, 6, 11, 'en', '{"step": 1, "email": "sany.chowdhury@gmail.com", "mobile": "9830799651", "fullName": "Sanjoy C", "language": "en", "participantCategory": "OPEN"}', true, '2026-09-15 10:03:57.462082+00');
INSERT INTO public.application_form_saves VALUES (11, 7, 12, 'en', '{"step": 1, "email": "sany.chowdhury@gmail.com", "mobile": "9830799651", "fullName": "Sanjoy Chowdhury", "language": "en", "participantCategory": "OPEN"}', false, '2026-09-15 11:06:00.451685+00');
INSERT INTO public.application_form_saves VALUES (14, 9, 16, 'en', '{"step": 1, "email": "sanjoycupwork@gmail.com", "mobile": "9836595555", "fullName": "Papiya Chowdhury", "language": "en", "participantCategory": "JUNIOR"}', true, '2026-09-15 16:36:43.930471+00');
INSERT INTO public.application_form_saves VALUES (15, 10, 17, 'en', '{"step": 1, "email": "nil9734904050@gmail.com", "mobile": "9433670755", "fullName": "Najmul Islam Molla", "language": "en", "participantCategory": "JUNIOR"}', true, '2026-09-16 02:38:56.569678+00');
INSERT INTO public.application_form_saves VALUES (16, 11, 18, 'en', '{"step": 1, "email": "addlsectetsdwb@gmail.com", "mobile": "9830064280", "fullName": "Nitish", "language": "en", "participantCategory": "JUNIOR"}', true, '2026-09-16 06:15:01.435128+00');
INSERT INTO public.application_form_saves VALUES (17, 12, 19, 'en', '{"step": 1, "email": "pujagarodia@gmail.com", "mobile": "9748697948", "fullName": "Dr Puja Garodia Somani", "language": "en", "participantCategory": "JUNIOR"}', true, '2026-09-16 06:15:56.006118+00');
INSERT INTO public.application_form_saves VALUES (19, 14, 21, 'en', '{"step": 1, "email": "sd_suman@yahoo.co.in", "mobile": "9831636411", "fullName": "Dr Suman Das", "language": "en", "participantCategory": "JUNIOR"}', true, '2026-09-16 07:09:29.418458+00');
INSERT INTO public.application_form_saves VALUES (2, 1, 1, 'en', '{"city": "Kolkata", "step": 4, "theme": "Education & Skill Development", "address": "AH 51 Krishnapur Main Road Ganpati Park", "pinCode": "700102", "stateId": 11, "language": "en", "districtId": 210, "costFunding": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "scalability": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "teamMembers": [{"email": "hellosanjoyc@gmail.com", "mobile": "9836595555", "fullName": "Papiya Chowdhury"}], "beneficiaries": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "instituteName": "Aranax Technologies", "instituteType": "Startup", "expectedImpact": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "prototypePilot": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "problemLocation": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "projectTimeline": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "proposedSolution": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "technologyMethod": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "applicationNumber": "SFIC-WB-0001", "participationMode": "Team", "otherInstituteType": "", "implementationRoute": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "supportingDocuments": [{"size": 129489, "mimeType": "application/pdf", "storageKey": "applications/1/1789328410924-c7c1c86a-2d78-400a-98a0-ee94c9c86503-architect-interview-questions.pdf", "checksumSha256": "35760c45b3125117326c85a24e6a75a129fc86ad6d98c8dd79311ece69f47261", "originalFileName": "architect-interview-questions.pdf"}, {"size": 227371, "mimeType": "application/pdf", "storageKey": "applications/1/1789328410943-c1f79c21-7a84-4a95-82eb-e13a2ca4bc21-design-interview-questions.pdf", "checksumSha256": "92d923d8966763c6c445624358d15fb13e99cccd315ad3626e83e5d57ab24e9b", "originalFileName": "design-interview-questions.pdf"}, {"size": 112701, "mimeType": "application/pdf", "storageKey": "applications/1/1789328410953-7f0b288b-941c-4a10-ba4a-1d09711e9b29-interview-questions.pdf", "checksumSha256": "ef50d0b63e1b4a201f2e0086edc5109ac4f72f5f1255e6576bb5f8cc2d0be59b", "originalFileName": "interview-questions.pdf"}]}', false, '2026-09-13 19:40:12.135069+00');
INSERT INTO public.application_form_saves VALUES (20, 1, 1, 'en', '{"step": 1, "payload": "{\"participantCategory\":\"Junior\"}", "applicationId": 1}', false, '2026-09-16 09:24:05.013407+00');
INSERT INTO public.application_form_saves VALUES (24, 7, 12, 'en', '{"city": "Kolkata", "step": 4, "state": "West Bengal", "theme": "Sewa First Innovation Challenge 2026", "address": "AH 51 Krishnapur Main Road Ganpati Park", "pinCode": "700102", "stateId": 11, "language": "en", "videoUrl": "", "districtId": 210, "costFunding": "", "scalability": "", "teamMembers": [{"email": "rini.asmitac@gmail.com", "mobile": "8777430834", "fullName": "Asmita Chowdhury"}], "applicationId": 7, "beneficiaries": "", "yearOfPassing": "1997", "expectedImpact": "", "prototypePilot": "", "problemLocation": "", "projectTimeline": "", "organisationName": "Aranax Technologies", "organisationType": "Startup", "proposedSolution": "", "technologyMethod": "", "challengeCategory": "Sewa First Innovation Challenge 2026", "participationMode": "Team", "challengeCategoryId": "Sewa First Innovation Challenge 2026", "implementationRoute": "", "mentorAcknowledgeTo": "", "participantCategory": "Open", "otherOrganisationType": "", "replaceSupportingDocuments": false, "highestEducationalQualification": "Post Graduate", "intellectualPropertyPublication": "", "lastAttendedEducationalInstitute": "University of North Bengal"}', false, '2026-09-16 10:01:02.344603+00');
INSERT INTO public.application_form_saves VALUES (31, 7, 12, 'en', '{"city": "Kolkata", "step": 1, "state": "West Bengal", "theme": "", "address": "AH 51 Krishnapur Main Road Ganpati Park", "pinCode": "700102", "stateId": 11, "language": "en", "videoUrl": "", "districtId": 210, "costFunding": "", "scalability": "", "teamMembers": [], "applicationId": 7, "beneficiaries": "", "yearOfPassing": "1997", "expectedImpact": "", "prototypePilot": "", "problemLocation": "", "projectTimeline": "", "organisationName": "Aranax Technologies", "organisationType": "Startup", "proposedSolution": "", "technologyMethod": "", "challengeCategory": "", "participationMode": "", "challengeCategoryId": "", "implementationRoute": "", "mentorAcknowledgeTo": "", "participantCategory": "Open", "otherOrganisationType": "", "replaceSupportingDocuments": false, "highestEducationalQualification": "Post Graduate", "intellectualPropertyPublication": "", "lastAttendedEducationalInstitute": "University of North Bengal"}', true, '2026-09-16 11:20:54.691279+00');
INSERT INTO public.application_form_saves VALUES (12, 7, 12, 'en', '{"city": "Kolkata", "step": 4, "theme": "Education & Skill Development", "address": "AH 51 Krishnapur Main Road Ganpati Park", "pinCode": "700102", "stateId": 11, "language": "en", "videoUrl": "https://www.youtube.com/watch?v=y3uoGUf495I", "districtId": 210, "costFunding": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "scalability": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "teamMembers": [{"email": "hellosanjoyc@gmail.com", "mobile": "9876543211", "fullName": "Papiya Chowdhury"}], "beneficiaries": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "instituteName": "Aranax Technologies", "instituteType": "Startup", "yearOfPassing": "1997", "expectedImpact": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "prototypePilot": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "problemLocation": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "projectTimeline": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "proposedSolution": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "technologyMethod": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "applicationNumber": "SFIC-WB-0005", "participationMode": "Team", "otherInstituteType": "", "implementationRoute": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "mentorAcknowledgeTo": "Arshiya C", "supportingDocuments": [{"size": 227371, "mimeType": "application/pdf", "storageKey": "applications/7/1789473525556-6f74e2e4-d1ec-4711-8761-174eec8b1bc6-design-interview-questions.pdf", "checksumSha256": "92d923d8966763c6c445624358d15fb13e99cccd315ad3626e83e5d57ab24e9b", "originalFileName": "design-interview-questions.pdf"}], "highestEducationalQualification": "Post Graduate", "intellectualPropertyPublication": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo eget magna fermentum tincidunt. Suspendisse potenti. Curabitur dignissim, sapien at consequat tristique, neque lorem malesuada augue, vitae faucibus justo erat sed urna. Donec feugiat, augue non facilisis varius, velit.", "lastAttendedEducationalInstitute": "University of North Bengal"}', false, '2026-09-15 11:58:46.656122+00');
INSERT INTO public.application_form_saves VALUES (21, 7, 12, 'en', '{"city": "Kolkata", "step": 1, "state": "West Bengal", "theme": "", "address": "DRAFT AH 51 Krishnapur Main Road Ganpati Park", "pinCode": "700102", "stateId": 11, "language": "en", "videoUrl": "", "districtId": 210, "costFunding": "", "scalability": "", "teamMembers": [{"email": "hellosanjoyc@gmail.com", "mobile": "9876543211", "fullName": "Papiya Chowdhury"}], "applicationId": 7, "beneficiaries": "", "yearOfPassing": "1997", "expectedImpact": "", "prototypePilot": "", "problemLocation": "", "projectTimeline": "", "organisationName": "Aranax Technologies", "organisationType": "Startup", "proposedSolution": "", "technologyMethod": "", "participationMode": "Team", "implementationRoute": "", "mentorAcknowledgeTo": "", "participantCategory": "Open", "otherOrganisationType": "", "replaceSupportingDocuments": false, "highestEducationalQualification": "Post Graduate", "intellectualPropertyPublication": "", "lastAttendedEducationalInstitute": "University of North Bengal"}', false, '2026-09-16 09:25:30.878216+00');
INSERT INTO public.application_form_saves VALUES (23, 7, 12, 'en', '{"city": "Kolkata", "step": 3, "state": "West Bengal", "theme": "", "address": "AH 51 Krishnapur Main Road Ganpati Park", "pinCode": "700102", "language": "en", "videoUrl": "", "costFunding": "", "scalability": "", "teamMembers": [{"email": "rini.asmitac@gmail.com", "mobile": "8777430834", "fullName": "Asmita Chowdhury"}], "applicationId": 7, "beneficiaries": "", "yearOfPassing": "1997", "expectedImpact": "", "prototypePilot": "", "problemLocation": "", "projectTimeline": "", "organisationName": "Aranax Technologies", "organisationType": "Startup", "proposedSolution": "", "technologyMethod": "", "challengeCategory": "", "participationMode": "Team", "challengeCategoryId": "", "implementationRoute": "", "mentorAcknowledgeTo": "", "participantCategory": "", "otherOrganisationType": "", "replaceSupportingDocuments": false, "highestEducationalQualification": "Post Graduate", "intellectualPropertyPublication": "", "lastAttendedEducationalInstitute": "University of North Bengal"}', false, '2026-09-16 09:58:10.878768+00');
INSERT INTO public.application_form_saves VALUES (22, 1, 1, 'en', '{"step": 1, "payload": {"step": 1, "theme": "Education & Skill Development", "challengeCategory": "Education & Skill Development", "challengeCategoryId": "education-skill-development", "participantCategory": "Junior"}, "applicationId": 1}', false, '2026-09-16 09:48:36.175889+00');
INSERT INTO public.application_form_saves VALUES (25, 1, 1, 'en', '{"step": 1, "payload": {"step": 1, "theme": "Healthcare", "challengeCategory": "Healthcare", "challengeCategoryId": "healthcare", "participantCategory": "Open"}, "applicationId": 1}', false, '2026-09-16 10:51:34.675626+00');
INSERT INTO public.application_form_saves VALUES (26, 1, 1, 'en', '{"step": 1, "payload": {"step": 1, "participantCategory": "Junior"}, "applicationId": 1}', false, '2026-09-16 11:17:03.835912+00');
INSERT INTO public.application_form_saves VALUES (27, 1, 1, 'en', '{"step": 1, "payload": {"step": 2, "applicationId": 1, "participantCategory": "Junior"}, "applicationId": 1}', false, '2026-09-16 11:17:11.248094+00');
INSERT INTO public.application_form_saves VALUES (28, 1, 1, 'en', '{"step": 1, "payload": {"step": 1, "participantCategory": "Junior"}, "applicationId": 1}', false, '2026-09-16 11:17:27.813218+00');
INSERT INTO public.application_form_saves VALUES (29, 1, 1, 'en', '{"step": 1, "payload": {"step": 2, "participantCategory": "Junior"}, "applicationId": 1}', false, '2026-09-16 11:17:29.731197+00');
INSERT INTO public.application_form_saves VALUES (30, 1, 1, 'en', '{"step": 1, "payload": {"step": 3, "participantCategory": "Junior"}, "applicationId": 1}', true, '2026-09-16 11:17:31.653212+00');


--
-- TOC entry 4114 (class 0 OID 17927)
-- Dependencies: 299
-- Data for Name: application_number_sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.application_number_sequences VALUES ('WB', 6, '2026-09-15 11:58:46.656122+00');


--
-- TOC entry 4107 (class 0 OID 17793)
-- Dependencies: 292
-- Data for Name: application_team_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.application_team_members VALUES (4, 2, 2, 'KOUSIK PAN', 'kousik.kskrna@gmail.com', '8240521471', true, 0, '2026-09-14 04:08:31.942849+00', '2026-09-14 04:14:44.244897+00');
INSERT INTO public.application_team_members VALUES (6, 3, 3, 'Apurbo Das', 'apurbodas197@gmail.com', '9732954177', true, 0, '2026-09-14 04:18:02.893264+00', '2026-09-14 04:18:02.893264+00');
INSERT INTO public.application_team_members VALUES (7, 4, 4, 'AMITAVA SAU', 'amitavasau@gmail.com', '7074812524', true, 0, '2026-09-14 04:57:23.890826+00', '2026-09-14 05:21:08.325482+00');
INSERT INTO public.application_team_members VALUES (9, 5, 5, 'Abhishek', 'abhisheksjcba@gmail.com', '9886346990', true, 0, '2026-09-14 10:14:11.83687+00', '2026-09-14 10:23:16.517628+00');
INSERT INTO public.application_team_members VALUES (11, 6, 6, 'Sanjoy C', 'email@gmail.com', '9830799655', true, 0, '2026-09-15 10:03:57.462082+00', '2026-09-15 10:16:30.780112+00');
INSERT INTO public.application_team_members VALUES (16, 9, 9, 'Papiya Chowdhury', 'sanjoycupwork@gmail.com', '9836595555', true, 0, '2026-09-15 16:36:43.930471+00', '2026-09-15 16:36:43.930471+00');
INSERT INTO public.application_team_members VALUES (17, 10, 10, 'Najmul Islam Molla', 'nil9734904050@gmail.com', '9433670755', true, 0, '2026-09-16 02:38:56.569678+00', '2026-09-16 02:38:56.569678+00');
INSERT INTO public.application_team_members VALUES (18, 11, 11, 'Nitish', 'addlsectetsdwb@gmail.com', '9830064280', true, 0, '2026-09-16 06:15:01.435128+00', '2026-09-16 06:15:01.435128+00');
INSERT INTO public.application_team_members VALUES (19, 12, 12, 'Dr Puja Garodia Somani', 'pujagarodia@gmail.com', '9748697948', true, 0, '2026-09-16 06:15:56.006118+00', '2026-09-16 06:15:56.006118+00');
INSERT INTO public.application_team_members VALUES (21, 14, 14, 'Dr Suman Das', 'sd_suman@yahoo.co.in', '9831636411', true, 0, '2026-09-16 07:09:29.418458+00', '2026-09-16 07:09:29.418458+00');
INSERT INTO public.application_team_members VALUES (1, 1, 1, 'Sanjoy Chowdhury', 'sanjoyc@aranaxweb.com', '9876543210', true, 0, '2026-09-13 19:38:11.060225+00', '2026-09-16 11:17:31.653212+00');
INSERT INTO public.application_team_members VALUES (12, 7, 7, 'Sanjoy Chowdhury', 'sany.chowdhury@gmail.com', '9830799651', true, 0, '2026-09-15 11:06:00.451685+00', '2026-09-16 11:20:54.691279+00');


--
-- TOC entry 4099 (class 0 OID 17578)
-- Dependencies: 284
-- Data for Name: challenge_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.challenge_categories VALUES (1, 'Village & Panchayat Innovation', 'গ্রাম ও পঞ্চায়েত উদ্ভাবন', 'ग्राम एवं पंचायत नवाचार', true, 1, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (2, 'Agriculture & Allied Sectors', 'কৃষি ও সংশ্লিষ্ট ক্ষেত্র', 'कृषि एवं संबद्ध क्षेत्र', true, 2, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (3, 'Education & Skill Development', 'শিক্ষা ও দক্ষতা উন্নয়ন', 'शिक्षा एवं कौशल विकास', true, 3, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (4, 'Healthcare', 'স্বাস্থ্যসেবা', 'स्वास्थ्य सेवा', true, 4, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (5, 'Urban & Civic Innovation', 'নগর ও নাগরিক উদ্ভাবন', 'शहरी एवं नागरिक नवाचार', true, 5, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (6, 'Environment & Sustainability', 'পরিবেশ ও টেকসই উন্নয়ন', 'पर्यावरण एवं सतत विकास', true, 6, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (7, 'Employment, Livelihood & MSMEs', 'কর্মসংস্থান, জীবিকা ও এমএসএমই', 'रोजगार, आजीविका एवं एमएसएमई', true, 7, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (8, 'Women & Child Development', 'নারী ও শিশু উন্নয়ন', 'महिला एवं बाल विकास', true, 8, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (9, 'Disaster Management & Community Safety', 'দুর্যোগ ব্যবস্থাপনা ও কমিউনিটি নিরাপত্তা', 'आपदा प्रबंधन एवं सामुदायिक सुरक्षा', true, 9, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (10, 'Transport & Mobility', 'পরিবহন ও চলাচল', 'परिवहन एवं गतिशीलता', true, 10, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (11, 'Energy', 'জ্বালানি', 'ऊर्जा', true, 11, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.challenge_categories VALUES (12, 'Tourism & Cultural Innovation', 'পর্যটন ও সাংস্কৃতিক উদ্ভাবন', 'पर्यटन एवं सांस्कृतिक नवाचार', true, 12, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');


--
-- TOC entry 4101 (class 0 OID 17699)
-- Dependencies: 286
-- Data for Name: challenges; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.challenges VALUES (2, 'SFIC-2026', 'Sewa First Innovation Challenge 2026', 'সেবা ফার্স্ট ইনোভেশন চ্যালেঞ্জ ২০২৬', 'सेवा फर्स्ट इनोवेशन चैलेंज 2026', 'Science, technology and innovation for public impact.', 'জনস্বার্থে বিজ্ঞান, প্রযুক্তি এবং উদ্ভাবন।', 'जनहित के लिए विज्ञान, प्रौद्योगिकी और नवाचार।', NULL, NULL, 'open', true, '2026-09-12 06:47:51.766637+00', '2026-09-12 06:47:51.766637+00');


--
-- TOC entry 4091 (class 0 OID 17507)
-- Dependencies: 276
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.districts VALUES (22, 1, 'Tawang', 'তাওয়াং', 'तवांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (23, 1, 'Tirap', 'তিরাপ', 'तिरप', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (24, 1, 'Upper Siang', 'আপার সিয়াং', 'ऊपरी सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (25, 1, 'Upper Subansiri', 'আপার সুবানসিরি', 'ऊपरी सुबनसिरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (26, 1, 'West Kameng', 'পশ্চিম কামেং', 'पश्चिम कामेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (27, 1, 'West Siang', 'পশ্চিম সিয়াং', 'पश्चिम सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (28, 2, 'Araria', 'আরারিয়া', 'अररिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (29, 2, 'Arwal', 'আরওয়াল', 'अरवल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (30, 2, 'Aurangabad', 'ঔরঙ্গাবাদ', 'औरंगाबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (31, 2, 'Banka', 'বাঁকা', 'बांका', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (32, 2, 'Begusarai', 'বেগুসরাই', 'बेगूसराय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (33, 2, 'Bhagalpur', 'ভাগলপুর', 'भागलपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (34, 2, 'Bhojpur', 'ভোজপুর', 'भोजपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (35, 2, 'Buxar', 'বক্সার', 'बक्सर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (36, 2, 'Darbhanga', 'দারভাঙ্গা', 'दरभंगा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (37, 2, 'Gaya', 'গয়া', 'गया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (38, 2, 'Gopalganj', 'গোপালগঞ্জ', 'गोपालगंज', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (39, 2, 'Jamui', 'জামুই', 'जमुई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (40, 2, 'Jehanabad', 'জেহানাবাদ', 'जहानाबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (41, 2, 'Kaimur (Bhabua)', 'কাইমুর (ভাবুয়া)', 'कैमूर (भभुआ)', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (42, 2, 'Katihar', 'কাটিহার', 'कटिहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (43, 2, 'Khagaria', 'খাগাড়িয়া', 'खगड़िया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (44, 2, 'Kishanganj', 'কিশনগঞ্জ', 'किशनगंज', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (45, 2, 'Lakhisarai', 'লখিসরাই', 'लखीसराय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (46, 2, 'Madhepura', 'মাধেপুরা', 'मधेपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (47, 2, 'Madhubani', 'মধুবনী', 'मधुबनी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (48, 2, 'Munger', 'মুঙ্গের', 'मुंगेर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (49, 2, 'Muzaffarpur', 'মুজাফ্ফরপুর', 'मुजफ्फरपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (50, 2, 'Nalanda', 'নালন্দা', 'नालंदा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (51, 2, 'Nawada', 'নওয়াদা', 'नवादा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (52, 2, 'Pashchim Champaran', 'পশ্চিম চম্পারণ', 'पश्चिम चंपारण', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (53, 2, 'Patna', 'পাটনা', 'पटना', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (54, 2, 'Purbi Champaran', 'পূর্ব চম্পারণ', 'पूर्वी चंपारण', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (55, 2, 'Purnia', 'পূর্ণিয়া', 'पूर्णिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (56, 2, 'Rohtas', 'রোহতাস', 'रोहतास', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (57, 2, 'Saharsa', 'সহরসা', 'सहरसा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (58, 2, 'Samastipur', 'সমস্তিপুর', 'समस्तीपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (59, 2, 'Saran', 'সারণ', 'सारण', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (60, 2, 'Sheikhpura', 'শেখপুরা', 'शेखपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (61, 2, 'Sheohar', 'শেওহর', 'शिवहर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (62, 2, 'Sitamarhi', 'সীতামঢ়ী', 'सीतामढ़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (63, 2, 'Siwan', 'সিওয়ান', 'सीवान', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (64, 2, 'Supaul', 'সুপৌল', 'सुपौल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (65, 2, 'Vaishali', 'বৈশালী', 'वैशाली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (66, 3, 'Bokaro', 'বোকারো', 'बोकारो', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (67, 3, 'Chatra', 'চাতরা', 'चतरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (68, 3, 'Deoghar', 'দেওঘর', 'देवघर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (69, 3, 'Dhanbad', 'ধানবাদ', 'धनबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (70, 3, 'Dumka', 'দুমকা', 'दुमका', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (71, 3, 'East Singhbum', 'পূর্ব সিংভূম', 'पूर्वी सिंहभूम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (72, 3, 'Garhwa', 'গাড়োয়া', 'गढ़वा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (73, 3, 'Giridih', 'গিরিডিহ', 'गिरिडीह', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (74, 3, 'Godda', 'গোড্ডা', 'गोड्डा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (75, 3, 'Gumla', 'গুমলা', 'गुमला', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (76, 3, 'Hazaribagh', 'হাজারিবাগ', 'हजारीबाग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (77, 3, 'Jamtara', 'জামতাড়া', 'जामताड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (78, 3, 'Khunti', 'খুঁটি', 'खूंटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (79, 3, 'Koderma', 'কোডারমা', 'कोडरमा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (80, 3, 'Latehar', 'লাতেহার', 'लातेहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (81, 3, 'Lohardaga', 'লোহারদাগা', 'लोहरदगा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (82, 3, 'Pakur', 'পাকুড়', 'पाकुड़', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (83, 3, 'Palamu', 'পালামু', 'पलामू', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (84, 3, 'Ramgarh', 'রামগড়', 'रामगढ़', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (85, 3, 'Ranchi', 'রাঁচি', 'रांची', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (86, 3, 'Sahebganj', 'সাহেবগঞ্জ', 'साहिबगंज', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (87, 3, 'Saraikela Kharsawan', 'সরাইকেলা খরসাওয়ান', 'सरायकेला खरसावां', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (88, 3, 'Simdega', 'সিমডেগা', 'सिमडेगा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (89, 3, 'West Singhbhum', 'পশ্চিম সিংভূম', 'पश्चिमी सिंहभूम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (90, 4, 'East Garo Hills', 'পূর্ব গারো হিলস', 'पूर्वी गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (91, 4, 'East Jaintia Hills', 'পূর্ব জয়ন্তিয়া হিলস', 'पूर्वी जयंतिया हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (92, 4, 'East Khasi Hills', 'পূর্ব খাসি হিলস', 'पूर्वी खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (93, 4, 'Eastern West Khasi Hills', 'পূর্ব পশ্চিম খাসি হিলস', 'ईस्टर्न वेस्ट खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (94, 4, 'North Garo Hills', 'উত্তর গারো হিলস', 'उत्तरी गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (95, 4, 'Ri Bhoi', 'রি ভোই', 'री भोई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (96, 4, 'South Garo Hills', 'দক্ষিণ গারো হিলস', 'दक्षिण गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (97, 4, 'South West Garo Hills', 'দক্ষিণ-পশ্চিম গারো হিলস', 'दक्षिण पश्चिम गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (98, 4, 'South West Khasi Hills', 'দক্ষিণ-পশ্চিম খাসি হিলস', 'दक्षिण पश्चिम खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (99, 4, 'West Garo Hills', 'পশ্চিম গারো হিলস', 'पश्चिम गारो हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (100, 4, 'West Jaintia Hills', 'পশ্চিম জয়ন্তিয়া হিলস', 'पश्चिम जयंतिया हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (101, 4, 'West Khasi Hills', 'পশ্চিম খাসি হিলস', 'पश्चिम खासी हिल्स', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (102, 5, 'Chumoukedima', 'চুমুকেদিমা', 'चुमौकेदिमा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (103, 5, 'Dimapur', 'ডিমাপুর', 'दीमापुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (104, 5, 'Kiphire', 'কিফিরে', 'किफिरे', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (105, 5, 'Kohima', 'কোহিমা', 'कोहिमा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (106, 5, 'Longleng', 'লংলেং', 'लोंगलेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (107, 5, 'Meluri', 'মেলুরি', 'मेलुरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (108, 5, 'Mokokchung', 'মোকোকচুং', 'मोकोकचुंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (109, 5, 'Mon', 'মন', 'मोन', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (110, 5, 'Niuland', 'নিউল্যান্ড', 'निउलैंड', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (111, 5, 'Noklak', 'নোকলাক', 'नोकलाक', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (112, 5, 'Peren', 'পেরেন', 'पेरेन', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (113, 5, 'Phek', 'ফেক', 'फेक', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (114, 5, 'Shamator', 'শামাতোর', 'शामाटोर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (115, 5, 'Tseminyu', 'তসেমিনিউ', 'त्सेमिन्यु', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (116, 5, 'Tuensang', 'তুয়েনসাং', 'तुएनसांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (117, 5, 'Wokha', 'ওখা', 'वोखा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (118, 5, 'Zunheboto', 'জুনহেবোটো', 'जुन्हेबोटो', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (119, 6, 'Dhalai', 'ধলাই', 'धलाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (120, 6, 'Gomati', 'গোমতী', 'गोमती', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (121, 6, 'Khowai', 'খোয়াই', 'खोवाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (122, 6, 'North Tripura', 'উত্তর ত্রিপুরা', 'उत्तरी त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (123, 6, 'Sepahijala', 'সিপাহিজলা', 'सिपाहीजला', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (124, 6, 'South Tripura', 'দক্ষিণ ত্রিপুরা', 'दक्षिण त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (125, 6, 'Unakoti', 'উনকোটি', 'उनाकोटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (126, 6, 'West Tripura', 'পশ্চিম ত্রিপুরা', 'पश्चिम त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (127, 7, 'Bajali', 'বজালি', 'बजाली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (128, 7, 'Baksa', 'বাকসা', 'बक्सा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (129, 7, 'Barpeta', 'বরপেটা', 'बारपेटा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (130, 7, 'Biswanath', 'বিশ্বনাথ', 'बिश्वनाथ', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (131, 7, 'Bongaigaon', 'বঙাইগাঁও', 'बोंगाईगांव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (132, 7, 'Cachar', 'কাছাড়', 'कछार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (133, 7, 'Charaideo', 'চরাইদেউ', 'चराइदेव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (134, 7, 'Chirang', 'চিরাং', 'चिरांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (135, 7, 'Darrang', 'দরং', 'दरंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (136, 7, 'Dhemaji', 'ধেমাজি', 'धेमाजी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (137, 7, 'Dhubri', 'ধুবড়ি', 'धुबरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (138, 7, 'Dibrugarh', 'ডিব্রুগড়', 'डिब्रूगढ़', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (139, 7, 'Dima Hasao', 'ডিমা হাসাও', 'दीमा हसाओ', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (140, 7, 'Goalpara', 'গোয়ালপাড়া', 'गोलपाड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (141, 7, 'Golaghat', 'গোলাঘাট', 'गोलाघाट', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (142, 7, 'Hailakandi', 'হাইলাকান্দি', 'हैलाकांडी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (143, 7, 'Hojai', 'হোজাই', 'होजाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (144, 7, 'Jorhat', 'যোরহাট', 'जोरहाट', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (145, 7, 'Kamrup', 'কামরূপ', 'कामरूप', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (146, 7, 'Kamrup Metro', 'কামরূপ মহানগর', 'कामरूप महानगर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (147, 7, 'Karbi Anglong', 'কার্বি আংলং', 'कार्बी आंगलोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (148, 7, 'Kokrajhar', 'কোকরাঝাড়', 'कोकराझार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (149, 7, 'Lakhimpur', 'লখিমপুর', 'लखीमपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (150, 7, 'Majuli', 'মাজুলি', 'माजुली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (151, 7, 'Marigaon', 'মরিগাঁও', 'मोरीगांव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (152, 7, 'Nagaon', 'নগাঁও', 'नगांव', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (153, 7, 'Nalbari', 'নলবাড়ি', 'नलबाड़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (154, 7, 'Sivasagar', 'শিবসাগর', 'शिवसागर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (155, 7, 'Sonitpur', 'শোণিতপুর', 'शोणितपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (156, 7, 'South Salmara Mancachar', 'দক্ষিণ শালমারা মানকাচর', 'दक्षिण सलमारा मनकाचर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (157, 7, 'Sribhumi', 'শ্রীভূমি', 'श्रीभूमि', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (158, 7, 'Tamulpur', 'তামুলপুর', 'तामुलपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (159, 7, 'Tinsukia', 'তিনসুকিয়া', 'तिनसुकिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (160, 7, 'Udalguri', 'ওদালগুড়ি', 'उदालगुड़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (161, 7, 'West Karbi Anglong', 'পশ্চিম কার্বি আংলং', 'पश्चिम कार्बी आंगलोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (167, 8, 'Jiribam', 'জিরিবাম', 'जिरीबाम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (168, 8, 'Kakching', 'কাকচিং', 'काकचिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (169, 8, 'Kamjong', 'কামজং', 'कामजोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (170, 8, 'Kangpokpi', 'কাংপোকপি', 'कांगपोकपी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (171, 8, 'Noney', 'নোনে', 'नोनी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (172, 8, 'Pherzawl', 'ফেরজাওল', 'फेरजावल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (173, 8, 'Senapati', 'সেনাপতি', 'सेनापति', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (174, 8, 'Tamenglong', 'তামেংলং', 'तामेंगलॉन्ग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (175, 8, 'Tengnoupal', 'তেংনৌপাল', 'तेंगनौपाल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (176, 8, 'Thoubal', 'থৌবাল', 'थौबल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (177, 8, 'Ukhrul', 'উখরুল', 'उखरुल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (178, 9, 'Aizawl', 'আইজল', 'आइजोल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (179, 9, 'Champhai', 'চাম্ফাই', 'चम्फाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (180, 9, 'Hnahthial', 'হ্নাহথিয়াল', 'हनाहथियाल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (181, 9, 'Khawzawl', 'খাওজাওল', 'खावजोल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (182, 9, 'Kolasib', 'কোলাসিব', 'कोलासिब', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (183, 9, 'Lawngtlai', 'লংতলাই', 'लॉन्गतलाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (184, 9, 'Lunglei', 'লুংলেই', 'लुंगलेई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (185, 9, 'Mamit', 'মামিত', 'ममित', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (186, 9, 'Saitual', 'সাইতুয়াল', 'सैतुअल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (187, 9, 'Serchhip', 'সেরছিপ', 'सेरछिप', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (188, 9, 'Siaha', 'সিয়াহা', 'सियाहा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (189, 10, 'Gangtok', 'গ্যাংটক', 'गंगटोक', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (190, 10, 'Gyalshing', 'গ্যালশিং', 'ग्यालशिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (191, 10, 'Mangan', 'মাঙ্গান', 'मंगन', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (192, 10, 'Namchi', 'নামচি', 'नामची', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (193, 10, 'Pakyong', 'পাকইয়ং', 'पाक्योंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (194, 10, 'Soreng', 'সোরেং', 'सोरेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (195, 11, 'Alipurduar', 'আলিপুরদুয়ার', 'अलीपुरद्वार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (196, 11, 'Bankura', 'বাঁকুড়া', 'बांकुड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (197, 11, 'Birbhum', 'বীরভূম', 'बीरभूम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (198, 11, 'Cooch Behar', 'কোচবিহার', 'कूच बिहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (199, 11, 'Dakshin Dinajpur', 'দক্ষিণ দিনাজপুর', 'दक्षिण दिनाजपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (200, 11, 'Darjeeling', 'দার্জিলিং', 'दार्जिलिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (201, 11, 'Hooghly', 'হুগলি', 'हुगली', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (202, 11, 'Howrah', 'হাওড়া', 'हावड़ा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (203, 11, 'Jalpaiguri', 'জলপাইগুড়ি', 'जलपाईगुड़ी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (204, 11, 'Jhargram', 'ঝাড়গ্রাম', 'झाड़ग्राम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (205, 11, 'Kalimpong', 'কালিম্পং', 'कलिम्पोंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (206, 11, 'Kolkata', 'কলকাতা', 'कोलकाता', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (207, 11, 'Malda', 'মালদা', 'मालदा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (208, 11, 'Murshidabad', 'মুর্শিদাবাদ', 'मुर्शिदाबाद', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (209, 11, 'Nadia', 'নদিয়া', 'नदिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (210, 11, 'North 24 Parganas', 'উত্তর ২৪ পরগনা', 'उत्तर 24 परगना', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (211, 11, 'Paschim Bardhaman', 'পশ্চিম বর্ধমান', 'पश्चिम बर्धमान', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (1, 1, 'Anjaw', 'আনজাও', 'अंजॉ', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (2, 1, 'Bichom', 'বিচোম', 'बिचोम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (3, 1, 'Changlang', 'চাংলাং', 'चांगलांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (4, 1, 'Dibang Valley', 'দিবাং ভ্যালি', 'दिबांग घाटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (5, 1, 'East Kameng', 'পূর্ব কামেং', 'पूर्व कामेंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (6, 1, 'East Siang', 'পূর্ব সিয়াং', 'पूर्व सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (7, 1, 'Kamle', 'কামলে', 'कामले', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (8, 1, 'Keyi Panyor', 'কেই পানিয়র', 'केई पन्योर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (9, 1, 'Kra Daadi', 'ক্রা দাদি', 'क्रा दादी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (10, 1, 'Kurung Kumey', 'কুরুং কুমে', 'कुरुंग कुमेय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (11, 1, 'Leparada', 'লেপারাদা', 'लेपरादा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (12, 1, 'Lohit', 'লোহিত', 'लोहित', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (13, 1, 'Longding', 'লংডিং', 'लोंगडिंग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (14, 1, 'Lower Dibang Valley', 'লোয়ার দিবাং ভ্যালি', 'निचली दिबांग घाटी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (15, 1, 'Lower Siang', 'লোয়ার সিয়াং', 'निचला सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (16, 1, 'Lower Subansiri', 'লোয়ার সুবানসিরি', 'निचला सुबनसिरी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (17, 1, 'Namsai', 'নামসাই', 'नामसाई', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (18, 1, 'Pakke Kessang', 'পাক্কে কেসাং', 'पक्के केसांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (19, 1, 'Papum Pare', 'পাপুম পারে', 'पापुम पारे', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (20, 1, 'Shi Yomi', 'শি ইয়োমি', 'शी योमी', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (21, 1, 'Siang', 'সিয়াং', 'सियांग', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (162, 8, 'Bishnupur', 'বিষ্ণুপুর', 'बिष्णुपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (163, 8, 'Chandel', 'চান্দেল', 'चंदेल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (164, 8, 'Churachandpur', 'চূড়াচাঁদপুর', 'चुराचांदपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (165, 8, 'Imphal East', 'ইম্ফল পূর্ব', 'इम्फाल पूर्व', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (166, 8, 'Imphal West', 'ইম্ফল পশ্চিম', 'इम्फाल पश्चिम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.districts VALUES (212, 11, 'Paschim Medinipur', 'পশ্চিম মেদিনীপুর', 'पश्चिम मेदिनीपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (213, 11, 'Purba Bardhaman', 'পূর্ব বর্ধমান', 'पूर्व बर्धमान', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (214, 11, 'Purba Medinipur', 'পূর্ব মেদিনীপুর', 'पूर्व मेदिनीपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (215, 11, 'Purulia', 'পুরুলিয়া', 'पुरुलिया', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (216, 11, 'South 24 Parganas', 'দক্ষিণ ২৪ পরগনা', 'दक्षिण 24 परगना', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.districts VALUES (217, 11, 'Uttar Dinajpur', 'উত্তর দিনাজপুর', 'उत्तर दिनाजपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);


--
-- TOC entry 4095 (class 0 OID 17543)
-- Dependencies: 280
-- Data for Name: institute_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.institute_types VALUES (1, 'School', 'স্কুল', 'स्कूल', true, 1, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.institute_types VALUES (2, 'ITI', 'আইটিআই', 'आईटीआई', true, 2, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.institute_types VALUES (3, 'Diploma', 'ডিপ্লোমা', 'डिप्लोमा', true, 3, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.institute_types VALUES (4, 'Undergraduate', 'স্নাতক স্তর', 'स्नातक स्तर', true, 4, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.institute_types VALUES (5, 'Graduate', 'স্নাতক', 'स्नातक', true, 5, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.institute_types VALUES (6, 'Professional', 'পেশাজীবী', 'पेशेवर', true, 6, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.institute_types VALUES (7, 'Startup', 'স্টার্টআপ', 'स्टार्टअप', true, 7, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.institute_types VALUES (8, 'Community Group', 'কমিউনিটি গ্রুপ', 'सामुदायिक समूह', true, 8, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');


--
-- TOC entry 4105 (class 0 OID 17732)
-- Dependencies: 290
-- Data for Name: participant_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participant_applications VALUES (4, 'SFIC-WB-0003', 2, 4, 2, 11, 202, 5, NULL, 7, 'en', 'Individual', 'submitted', 'Kolkata', '7074812524', 'All address', 'Ggi', NULL, 'Severe road condition and waterlogging issue at Howrah main road causing daily traffic delays.', 'Rebuilding the road with durable concrete and proper underground drainage system.', 'Pre-cast concrete blocks and smart sensor-based drainage systems for fast implementation.', 'Local panchayat and PWD department will execute the work step by step with official approval.', 'Estimated cost is INR 5 Lakhs, funded via government schemes and local development grants.', 'Around 5,000 local villagers and daily commuters will directly benefit from this project.', 'Project implementation will take approximately 3 months from start to complete execution.', 'Reduces travel time by 40 percent and prevents local flooding during heavy monsoon rains.', 'This structural framework can easily be replicated in neighboring panchayats and districts.', 'A small 50-meter test stretch has been successfully constructed as a working pilot model', '2026-09-14 05:21:08.325482+00', '2026-09-14 04:57:23.890826+00', '2026-09-14 05:21:08.325482+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (2, 'SFIC-WB-0002', 2, 2, 2, 11, 210, 7, NULL, 4, 'en', 'Individual', 'submitted', 'KOLKATA', '700090', 'AK MUKHERJEE ROAD', 'TP SOLUTIONS', NULL, 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', 'Whether it can travel to another district, and what would have to change.', '2026-09-14 04:14:44.244897+00', '2026-09-14 04:08:31.942849+00', '2026-09-14 04:14:44.244897+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (3, 'SFIC-2026-20260914041803-5C56CB', 2, 3, 2, NULL, NULL, NULL, NULL, 6, 'en', 'Individual', 'profile_completion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-14 04:18:02.893264+00', '2026-09-14 04:19:05.495457+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (5, 'SFIC-WB-0004', 2, 5, 2, 11, 206, 6, NULL, 9, 'en', 'Individual', 'submitted', 'Kolkata', '700007', 'Abc', 'Abc', NULL, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '2026-09-14 10:23:16.517628+00', '2026-09-14 10:14:11.83687+00', '2026-09-14 10:23:16.517628+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (6, 'SFIC-2026-20260915100358-60C84D', 2, 6, 2, NULL, NULL, NULL, NULL, 11, 'en', 'Individual', 'profile_completion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 10:03:57.462082+00', '2026-09-15 10:04:23.651296+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (1, 'SFIC-WB-0001', 2, 1, 2, NULL, NULL, NULL, NULL, 1, 'en', 'Individual', 'draft', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-13 19:40:12.135069+00', '2026-09-13 19:38:11.060225+00', '2026-09-16 11:17:31.653212+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (7, 'SFIC-WB-0005', 2, 7, 2, 11, 210, 7, NULL, 12, 'en', 'Individual', 'draft', 'Kolkata', '700102', 'AH 51 Krishnapur Main Road Ganpati Park', 'Aranax Technologies', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 11:58:46.656122+00', '2026-09-15 11:06:00.451685+00', '2026-09-16 11:20:54.691279+00', 'Post Graduate', 'University of North Bengal', '1997', NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (9, 'SFIC-2026-20260915163644-AEF2E5', 2, 9, 1, NULL, NULL, NULL, NULL, 16, 'en', 'Individual', 'profile_completion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-15 16:36:43.930471+00', '2026-09-15 16:38:19.785782+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (10, 'SFIC-2026-20260916023857-5794D2', 2, 10, 1, NULL, NULL, NULL, NULL, 17, 'en', 'Individual', 'profile_completion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-16 02:38:56.569678+00', '2026-09-16 02:40:28.593152+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (11, 'SFIC-2026-20260916061502-809E58', 2, 11, 1, NULL, NULL, NULL, NULL, 18, 'en', 'Individual', 'profile_completion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-16 06:15:01.435128+00', '2026-09-16 06:16:33.009006+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (12, 'SFIC-2026-20260916061556-48456F', 2, 12, 1, NULL, NULL, NULL, NULL, 19, 'en', 'Individual', 'profile_completion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-16 06:15:56.006118+00', '2026-09-16 06:16:37.890618+00', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.participant_applications VALUES (14, 'SFIC-2026-20260916070930-A0B972', 2, 14, 1, NULL, NULL, NULL, NULL, 21, 'en', 'Individual', 'profile_completion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-16 07:09:29.418458+00', '2026-09-16 07:10:51.800214+00', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 4093 (class 0 OID 17530)
-- Dependencies: 278
-- Data for Name: participant_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participant_categories VALUES (1, 'JUNIOR', 'Junior', 'জুনিয়র', 'जूनियर', true, 1, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_categories VALUES (2, 'OPEN', 'Open', 'ওপেন', 'ओपन', true, 2, '2026-09-12 05:47:34.94294+00', '2026-09-12 05:47:34.94294+00');


--
-- TOC entry 4097 (class 0 OID 17556)
-- Dependencies: 282
-- Data for Name: participant_category_institute_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participant_category_institute_types VALUES (1, 1, 1, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (2, 1, 2, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (3, 1, 3, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (4, 1, 4, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (5, 2, 1, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (6, 2, 2, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (7, 2, 3, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (8, 2, 4, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (9, 2, 5, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (10, 2, 6, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (11, 2, 7, '2026-09-12 05:47:34.94294+00');
INSERT INTO public.participant_category_institute_types VALUES (12, 2, 8, '2026-09-12 05:47:34.94294+00');


--
-- TOC entry 4116 (class 0 OID 18253)
-- Dependencies: 301
-- Data for Name: participant_email_verification_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participant_email_verification_attempts VALUES (10, 'kousik.kskrna@gmail.com', '8240521471', '2026-09-14 04:08:31.942849+00', '2026-09-14 04:08:31.942849+00', 1, NULL, '2026-09-14 04:08:31.942849+00', '2026-09-14 04:08:31.942849+00');
INSERT INTO public.participant_email_verification_attempts VALUES (11, 'apurbodas197@gmail.com', '9732954177', '2026-09-14 04:18:02.893264+00', '2026-09-14 04:18:02.893264+00', 1, NULL, '2026-09-14 04:18:02.893264+00', '2026-09-14 04:18:02.893264+00');
INSERT INTO public.participant_email_verification_attempts VALUES (12, 'amitavasau@gmail.com', '7074812524', '2026-09-14 04:57:23.890826+00', '2026-09-14 04:57:23.890826+00', 1, NULL, '2026-09-14 04:57:23.890826+00', '2026-09-14 04:57:23.890826+00');
INSERT INTO public.participant_email_verification_attempts VALUES (13, 'abhisheksjcba@gmail.com', '9886346990', '2026-09-14 10:14:11.83687+00', '2026-09-14 10:14:11.83687+00', 1, NULL, '2026-09-14 10:14:11.83687+00', '2026-09-14 10:14:11.83687+00');
INSERT INTO public.participant_email_verification_attempts VALUES (1, 'sany.chowdhury@gmail.com', '9830799651', '2026-09-15 11:06:00.451685+00', '2026-09-15 11:06:00.451685+00', 1, NULL, '2026-09-13 16:33:38.739112+00', '2026-09-15 11:06:00.451685+00');
INSERT INTO public.participant_email_verification_attempts VALUES (19, 'sajnoycupwork@gmail.com', '1212121212', '2026-09-15 16:32:52.101902+00', '2026-09-15 16:32:52.101902+00', 1, NULL, '2026-09-15 16:32:52.101902+00', '2026-09-15 16:32:52.101902+00');
INSERT INTO public.participant_email_verification_attempts VALUES (20, 'sanjoycupwork@gmail.com', '9836595555', '2026-09-15 16:36:43.930471+00', '2026-09-15 16:36:43.930471+00', 1, NULL, '2026-09-15 16:36:43.930471+00', '2026-09-15 16:36:43.930471+00');
INSERT INTO public.participant_email_verification_attempts VALUES (21, 'nil9734904050@gmail.com', '9433670755', '2026-09-16 02:38:56.569678+00', '2026-09-16 02:38:56.569678+00', 1, NULL, '2026-09-16 02:38:56.569678+00', '2026-09-16 02:38:56.569678+00');
INSERT INTO public.participant_email_verification_attempts VALUES (22, 'addlsectetsdwb@gmail.com', '9830064280', '2026-09-16 06:15:01.435128+00', '2026-09-16 06:15:01.435128+00', 1, NULL, '2026-09-16 06:15:01.435128+00', '2026-09-16 06:15:01.435128+00');
INSERT INTO public.participant_email_verification_attempts VALUES (23, 'pujagarodia@gmail.com', '9748697948', '2026-09-16 06:15:56.006118+00', '2026-09-16 06:15:56.006118+00', 1, NULL, '2026-09-16 06:15:56.006118+00', '2026-09-16 06:15:56.006118+00');
INSERT INTO public.participant_email_verification_attempts VALUES (24, 'test@test.com', '9831098310', '2026-09-16 06:18:05.891148+00', '2026-09-16 06:18:05.891148+00', 1, NULL, '2026-09-16 06:18:05.891148+00', '2026-09-16 06:18:05.891148+00');
INSERT INTO public.participant_email_verification_attempts VALUES (25, 'sd_suman@yahoo.co.in', '9831636411', '2026-09-16 07:09:29.418458+00', '2026-09-16 07:09:29.418458+00', 1, NULL, '2026-09-16 07:09:29.418458+00', '2026-09-16 07:09:29.418458+00');


--
-- TOC entry 4113 (class 0 OID 17905)
-- Dependencies: 298
-- Data for Name: participant_email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participant_email_verification_tokens VALUES (1, 1, 1, '511df3c30d4ab2a0b648ba171a181b8d32ae33cc16fdbd6a8bf4bf2ce40bcb78', '2026-09-13 19:40:11.060225+00', '2026-09-13 19:38:30.801346+00', '2026-09-13 19:38:11.060225+00');
INSERT INTO public.participant_email_verification_tokens VALUES (2, 2, 2, '6fe9368f2fe764db0abc71ce9fbb2883d1eadc3f36b193dc0672afc655d448f6', '2026-09-14 04:10:31.942849+00', '2026-09-14 04:09:05.586176+00', '2026-09-14 04:08:31.942849+00');
INSERT INTO public.participant_email_verification_tokens VALUES (3, 3, 3, '1ab26fb5485f555353e9048f9bf6d6ed7c32362a4e70d9074bc0fe3a1da051c4', '2026-09-14 04:20:02.893264+00', '2026-09-14 04:19:05.495457+00', '2026-09-14 04:18:02.893264+00');
INSERT INTO public.participant_email_verification_tokens VALUES (4, 4, 4, '09b18896fe808e62326512765c8b5682ed2e04ec4b9631ee53a6e00844f6218d', '2026-09-14 04:59:23.890826+00', '2026-09-14 04:58:07.821544+00', '2026-09-14 04:57:23.890826+00');
INSERT INTO public.participant_email_verification_tokens VALUES (5, 5, 5, '8428c0dd76f1e422578d38e1fef3a3c7c7f551f329ffc0632fb4ce48926ea83e', '2026-09-14 10:16:11.83687+00', '2026-09-14 10:14:37.164567+00', '2026-09-14 10:14:11.83687+00');
INSERT INTO public.participant_email_verification_tokens VALUES (6, 6, 6, 'ec0715414341069f8628f3f4ed46d348b9aef542caf41376f249268c3104c76b', '2026-09-15 10:05:57.462082+00', '2026-09-15 10:04:23.651296+00', '2026-09-15 10:03:57.462082+00');
INSERT INTO public.participant_email_verification_tokens VALUES (7, 7, 7, '69f1219e4350f329d631702f100546cef118abedadfe3563cabbc3ba7ca68916', '2026-09-15 11:08:00.451685+00', '2026-09-15 11:06:21.715163+00', '2026-09-15 11:06:00.451685+00');
INSERT INTO public.participant_email_verification_tokens VALUES (9, 9, 9, '758f385350ffbc7801cb1be8d813c9c65549b92a9f512b9e09b576497b601c96', '2026-09-15 16:38:43.930471+00', '2026-09-15 16:37:37.184461+00', '2026-09-15 16:36:43.930471+00');
INSERT INTO public.participant_email_verification_tokens VALUES (10, 10, 10, 'd8c1cca863a21b784062df153dd83e0176e842dbdd619e885af26278487a0781', '2026-09-16 02:43:56.569678+00', '2026-09-16 02:39:39.669923+00', '2026-09-16 02:38:56.569678+00');
INSERT INTO public.participant_email_verification_tokens VALUES (11, 11, 11, 'b0cb868b3bb90328af369192a960a43bed96bd02d524a20cc3403746d6f16ede', '2026-09-16 06:20:01.435128+00', '2026-09-16 06:15:58.419662+00', '2026-09-16 06:15:01.435128+00');
INSERT INTO public.participant_email_verification_tokens VALUES (12, 12, 12, 'c20b0a219c493de77f393200f3c0fd1421373e40e9ac2eb6f22d242fe1648b9c', '2026-09-16 06:20:56.006118+00', '2026-09-16 06:16:22.815121+00', '2026-09-16 06:15:56.006118+00');
INSERT INTO public.participant_email_verification_tokens VALUES (14, 14, 14, '9d5af08962dc7bf4330345fa81c844988472266c7d06f0a018d5aa4f4dd2d324', '2026-09-16 07:14:29.418458+00', '2026-09-16 07:10:27.637436+00', '2026-09-16 07:09:29.418458+00');


--
-- TOC entry 4118 (class 0 OID 18544)
-- Dependencies: 303
-- Data for Name: participant_login_verification_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participant_login_verification_attempts VALUES (2, 'hellosanjoyc@gmail.com', '2026-09-13 19:41:29.531642+00', '2026-09-13 19:41:29.531642+00', 1, NULL, '2026-09-13 18:18:01.333817+00', '2026-09-13 19:41:29.531642+00');
INSERT INTO public.participant_login_verification_attempts VALUES (6, 'kousik.kskrna@gmail.com', '2026-09-14 04:40:26.888899+00', '2026-09-14 04:40:26.888899+00', 1, NULL, '2026-09-14 04:40:26.888899+00', '2026-09-14 04:40:26.888899+00');
INSERT INTO public.participant_login_verification_attempts VALUES (7, 'amitavasau@gmail.com', '2026-09-14 05:22:21.045616+00', '2026-09-14 05:22:21.045616+00', 1, NULL, '2026-09-14 05:22:21.045616+00', '2026-09-14 05:22:21.045616+00');
INSERT INTO public.participant_login_verification_attempts VALUES (8, 'abhisheksjcba@gmail.com', '2026-09-14 10:33:45.25449+00', '2026-09-14 10:33:45.25449+00', 1, NULL, '2026-09-14 10:33:45.25449+00', '2026-09-14 10:33:45.25449+00');
INSERT INTO public.participant_login_verification_attempts VALUES (1, 'sany.chowdhury@gmail.com', '2026-09-16 11:02:01.772608+00', '2026-09-16 11:08:04.905763+00', 2, NULL, '2026-09-13 18:17:16.849843+00', '2026-09-16 11:08:04.905763+00');


--
-- TOC entry 4120 (class 0 OID 18559)
-- Dependencies: 305
-- Data for Name: participant_login_verification_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participant_login_verification_tokens VALUES (1, 1, 1, 'sany.chowdhury@gmail.com', '586113cb6084e17c553d16bd6e012633ae21e4027c8a502a0c8bd93be064a9d6', '2026-09-13 19:42:59.276898+00', '2026-09-13 19:41:13.402931+00', '2026-09-13 19:40:59.276898+00');
INSERT INTO public.participant_login_verification_tokens VALUES (3, 2, 4, 'kousik.kskrna@gmail.com', 'b7ca7f7d02847acd47ef90fa0400a4a7eac117eeceb5c76c218b0e7ab6171826', '2026-09-14 04:42:26.888899+00', '2026-09-14 04:40:46.426533+00', '2026-09-14 04:40:26.888899+00');
INSERT INTO public.participant_login_verification_tokens VALUES (4, 4, 7, 'amitavasau@gmail.com', '02a015284b7dffe33b93ec9dc04b01650e954de4cdc410201d920faf4ed1a656', '2026-09-14 05:24:21.045616+00', '2026-09-14 05:23:09.731279+00', '2026-09-14 05:22:21.045616+00');
INSERT INTO public.participant_login_verification_tokens VALUES (5, 5, 9, 'abhisheksjcba@gmail.com', 'bdc210fe38f86f87cd79a13aabf38aecbc974400636c117be94dcf6475646839', '2026-09-14 10:35:45.25449+00', '2026-09-14 10:34:04.949141+00', '2026-09-14 10:33:45.25449+00');
INSERT INTO public.participant_login_verification_tokens VALUES (6, 7, 12, 'sany.chowdhury@gmail.com', '2ec613494613add22fb83d7336ec14e46db7caee9c199a9f70a198a09f08bd37', '2026-09-15 12:18:31.417265+00', '2026-09-15 12:14:04.553119+00', '2026-09-15 12:13:31.417265+00');
INSERT INTO public.participant_login_verification_tokens VALUES (7, 7, 12, 'sany.chowdhury@gmail.com', '4750d5f8e1efbc4211fb285f05f07a50798ff3395b5f84a9cecc2fe866f68b24', '2026-09-15 12:45:14.575293+00', '2026-09-15 12:43:30.620883+00', '2026-09-15 12:43:14.575293+00');
INSERT INTO public.participant_login_verification_tokens VALUES (8, 7, 12, 'sany.chowdhury@gmail.com', '4ca8872408b0b6d0e9a15307f07a254c178d4cdfda250041c5efe122c5f42f6b', '2026-09-15 14:55:20.37119+00', '2026-09-15 14:54:01.690223+00', '2026-09-15 14:53:20.37119+00');
INSERT INTO public.participant_login_verification_tokens VALUES (9, 7, 12, 'sany.chowdhury@gmail.com', '8070a989b6d411334d7933f1ee0823f5c33f90c65eb0e5a09eb43bc39d278d31', '2026-09-15 16:50:18.400855+00', '2026-09-15 16:48:38.96815+00', '2026-09-15 16:48:18.400855+00');
INSERT INTO public.participant_login_verification_tokens VALUES (10, 7, 12, 'sany.chowdhury@gmail.com', 'eb7d453bb94ac883710d7a3cba485200239c9d44daf013b4c457715ed79c96f5', '2026-09-16 11:04:01.772608+00', '2026-09-16 11:02:28.815861+00', '2026-09-16 11:02:01.772608+00');
INSERT INTO public.participant_login_verification_tokens VALUES (11, 7, 12, 'sany.chowdhury@gmail.com', 'a38507554220860d996a820274f567f13e2e91277ead5d62ace2c91b538baeb6', '2026-09-16 11:10:04.905763+00', '2026-09-16 11:08:21.245832+00', '2026-09-16 11:08:04.905763+00');


--
-- TOC entry 4103 (class 0 OID 17716)
-- Dependencies: 288
-- Data for Name: participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.participants VALUES (2, 'KOUSIK PAN', 'kousik.kskrna@gmail.com', '8240521471', '2026-09-14 04:08:31.942849+00', '2026-09-14 04:09:05.586176+00', true, '2026-09-14 04:09:05.586176+00', NULL, NULL);
INSERT INTO public.participants VALUES (3, 'Apurbo Das', 'apurbodas197@gmail.com', '9732954177', '2026-09-14 04:18:02.893264+00', '2026-09-14 04:19:05.495457+00', true, '2026-09-14 04:19:05.495457+00', NULL, NULL);
INSERT INTO public.participants VALUES (4, 'AMITAVA SAU', 'amitavasau@gmail.com', '7074812524', '2026-09-14 04:57:23.890826+00', '2026-09-14 04:58:07.821544+00', true, '2026-09-14 04:58:07.821544+00', NULL, NULL);
INSERT INTO public.participants VALUES (1, 'Sanjoy Chowdhury', 'sanjoyc@aranaxweb.com', '9876543210', '2026-09-13 19:38:11.060225+00', '2026-09-14 09:43:18.683843+00', true, '2026-09-13 19:38:30.801346+00', NULL, NULL);
INSERT INTO public.participants VALUES (5, 'Abhishek', 'abhisheksjcba@gmail.com', '9886346990', '2026-09-14 10:14:11.83687+00', '2026-09-14 10:14:37.164567+00', true, '2026-09-14 10:14:37.164567+00', NULL, NULL);
INSERT INTO public.participants VALUES (6, 'Sanjoy C', 'email@gmail.com', '9830799655', '2026-09-15 10:03:57.462082+00', '2026-09-15 10:16:13.985803+00', true, '2026-09-15 10:04:23.651296+00', NULL, NULL);
INSERT INTO public.participants VALUES (7, 'Sanjoy Chowdhury', 'sany.chowdhury@gmail.com', '9830799651', '2026-09-15 11:06:00.451685+00', '2026-09-15 15:15:07.582091+00', true, '2026-09-15 11:06:21.715163+00', '1972-03-19', 'Male');
INSERT INTO public.participants VALUES (9, 'Papiya Chowdhury', 'sanjoycupwork@gmail.com', '9836595555', '2026-09-15 16:36:43.930471+00', '2026-09-15 16:38:19.785782+00', true, '2026-09-15 16:37:37.184461+00', '1972-03-19', 'Male');
INSERT INTO public.participants VALUES (10, 'Najmul Islam Molla', 'nil9734904050@gmail.com', '9433670755', '2026-09-16 02:38:56.569678+00', '2026-09-16 02:40:28.593152+00', true, '2026-09-16 02:39:39.669923+00', '2005-01-30', 'Male');
INSERT INTO public.participants VALUES (11, 'Nitish', 'addlsectetsdwb@gmail.com', '9830064280', '2026-09-16 06:15:01.435128+00', '2026-09-16 06:16:33.009006+00', true, '2026-09-16 06:15:58.419662+00', '2022-05-12', 'Male');
INSERT INTO public.participants VALUES (12, 'Dr Puja Garodia Somani', 'pujagarodia@gmail.com', '9748697948', '2026-09-16 06:15:56.006118+00', '2026-09-16 06:16:37.890618+00', true, '2026-09-16 06:16:22.815121+00', '1990-06-11', 'Female');
INSERT INTO public.participants VALUES (14, 'Dr Suman Das', 'sd_suman@yahoo.co.in', '9831636411', '2026-09-16 07:09:29.418458+00', '2026-09-16 07:10:51.800214+00', true, '2026-09-16 07:10:27.637436+00', '1974-01-15', 'Male');


--
-- TOC entry 4089 (class 0 OID 17496)
-- Dependencies: 274
-- Data for Name: states; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.states VALUES (1, 'Arunachal Pradesh', 'অরুণাচল প্রদেশ', 'अरुणाचल प्रदेश', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (2, 'Bihar', 'বিহার', 'बिहार', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.states VALUES (3, 'Jharkhand', 'ঝাড়খণ্ড', 'झारखंड', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);
INSERT INTO public.states VALUES (4, 'Meghalaya', 'মেঘালয়', 'मेघालय', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (5, 'Nagaland', 'নাগাল্যান্ড', 'नागालैंड', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (6, 'Tripura', 'ত্রিপুরা', 'त्रिपुरा', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (7, 'Assam', 'অসম', 'असम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (8, 'Manipur', 'মণিপুর', 'मणिपुर', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (9, 'Mizoram', 'মিজোরাম', 'मिजोरम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (10, 'Sikkim', 'সিকিম', 'सिक्किम', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', false);
INSERT INTO public.states VALUES (11, 'West Bengal', 'পশ্চিমবঙ্গ', 'पश्चिम बंगाल', '2026-09-12 05:35:38.659432+00', '2026-09-15 10:09:06.649085+00', true);


--
-- TOC entry 4161 (class 0 OID 0)
-- Dependencies: 293
-- Name: application_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.application_documents_id_seq', 7, true);


--
-- TOC entry 4162 (class 0 OID 0)
-- Dependencies: 295
-- Name: application_form_saves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.application_form_saves_id_seq', 31, true);


--
-- TOC entry 4163 (class 0 OID 0)
-- Dependencies: 291
-- Name: application_team_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.application_team_members_id_seq', 36, true);


--
-- TOC entry 4164 (class 0 OID 0)
-- Dependencies: 283
-- Name: challenge_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.challenge_categories_id_seq', 12, true);


--
-- TOC entry 4165 (class 0 OID 0)
-- Dependencies: 285
-- Name: challenges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.challenges_id_seq', 2, true);


--
-- TOC entry 4166 (class 0 OID 0)
-- Dependencies: 275
-- Name: districts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.districts_id_seq', 217, true);


--
-- TOC entry 4167 (class 0 OID 0)
-- Dependencies: 279
-- Name: institute_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institute_types_id_seq', 8, true);


--
-- TOC entry 4168 (class 0 OID 0)
-- Dependencies: 289
-- Name: participant_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participant_applications_id_seq', 25, true);


--
-- TOC entry 4169 (class 0 OID 0)
-- Dependencies: 277
-- Name: participant_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participant_categories_id_seq', 2, true);


--
-- TOC entry 4170 (class 0 OID 0)
-- Dependencies: 281
-- Name: participant_category_institute_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participant_category_institute_types_id_seq', 12, true);


--
-- TOC entry 4171 (class 0 OID 0)
-- Dependencies: 300
-- Name: participant_email_verification_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participant_email_verification_attempts_id_seq', 25, true);


--
-- TOC entry 4172 (class 0 OID 0)
-- Dependencies: 297
-- Name: participant_email_verification_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participant_email_verification_tokens_id_seq', 14, true);


--
-- TOC entry 4173 (class 0 OID 0)
-- Dependencies: 302
-- Name: participant_login_verification_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participant_login_verification_attempts_id_seq', 14, true);


--
-- TOC entry 4174 (class 0 OID 0)
-- Dependencies: 304
-- Name: participant_login_verification_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participant_login_verification_tokens_id_seq', 11, true);


--
-- TOC entry 4175 (class 0 OID 0)
-- Dependencies: 287
-- Name: participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.participants_id_seq', 14, true);


--
-- TOC entry 4176 (class 0 OID 0)
-- Dependencies: 273
-- Name: states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.states_id_seq', 11, true);


--
-- TOC entry 3873 (class 2606 OID 17845)
-- Name: application_documents application_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3877 (class 2606 OID 17871)
-- Name: application_form_saves application_form_saves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_form_saves
    ADD CONSTRAINT application_form_saves_pkey PRIMARY KEY (id);


--
-- TOC entry 3889 (class 2606 OID 17935)
-- Name: application_number_sequences application_number_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_number_sequences
    ADD CONSTRAINT application_number_sequences_pkey PRIMARY KEY (state_code);


--
-- TOC entry 3865 (class 2606 OID 17804)
-- Name: application_team_members application_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT application_team_members_pkey PRIMARY KEY (id);


--
-- TOC entry 3841 (class 2606 OID 17591)
-- Name: challenge_categories challenge_categories_name_en_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_categories
    ADD CONSTRAINT challenge_categories_name_en_key UNIQUE (name_en);


--
-- TOC entry 3843 (class 2606 OID 17589)
-- Name: challenge_categories challenge_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_categories
    ADD CONSTRAINT challenge_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3845 (class 2606 OID 17713)
-- Name: challenges challenges_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_code_key UNIQUE (code);


--
-- TOC entry 3847 (class 2606 OID 17711)
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 3820 (class 2606 OID 17516)
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- TOC entry 3831 (class 2606 OID 17554)
-- Name: institute_types institute_types_name_en_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institute_types
    ADD CONSTRAINT institute_types_name_en_key UNIQUE (name_en);


--
-- TOC entry 3833 (class 2606 OID 17552)
-- Name: institute_types institute_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institute_types
    ADD CONSTRAINT institute_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3859 (class 2606 OID 17749)
-- Name: participant_applications participant_applications_application_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT participant_applications_application_number_key UNIQUE (application_number);


--
-- TOC entry 3861 (class 2606 OID 17747)
-- Name: participant_applications participant_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT participant_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 3827 (class 2606 OID 17541)
-- Name: participant_categories participant_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_categories
    ADD CONSTRAINT participant_categories_code_key UNIQUE (code);


--
-- TOC entry 3829 (class 2606 OID 17539)
-- Name: participant_categories participant_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_categories
    ADD CONSTRAINT participant_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3837 (class 2606 OID 17562)
-- Name: participant_category_institute_types participant_category_institute_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT participant_category_institute_types_pkey PRIMARY KEY (id);


--
-- TOC entry 3893 (class 2606 OID 18266)
-- Name: participant_email_verification_attempts participant_email_verification_attempts_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_attempts
    ADD CONSTRAINT participant_email_verification_attempts_email_key UNIQUE (email);


--
-- TOC entry 3895 (class 2606 OID 18264)
-- Name: participant_email_verification_attempts participant_email_verification_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_attempts
    ADD CONSTRAINT participant_email_verification_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 3885 (class 2606 OID 17911)
-- Name: participant_email_verification_tokens participant_email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT participant_email_verification_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3887 (class 2606 OID 17913)
-- Name: participant_email_verification_tokens participant_email_verification_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT participant_email_verification_tokens_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 3898 (class 2606 OID 18557)
-- Name: participant_login_verification_attempts participant_login_verification_attempts_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_attempts
    ADD CONSTRAINT participant_login_verification_attempts_email_key UNIQUE (email);


--
-- TOC entry 3900 (class 2606 OID 18555)
-- Name: participant_login_verification_attempts participant_login_verification_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_attempts
    ADD CONSTRAINT participant_login_verification_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 3904 (class 2606 OID 18567)
-- Name: participant_login_verification_tokens participant_login_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT participant_login_verification_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3906 (class 2606 OID 18569)
-- Name: participant_login_verification_tokens participant_login_verification_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT participant_login_verification_tokens_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 3849 (class 2606 OID 17725)
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- TOC entry 3816 (class 2606 OID 17503)
-- Name: states states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);


--
-- TOC entry 3863 (class 2606 OID 17751)
-- Name: participant_applications uq_applications_participant_challenge; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT uq_applications_participant_challenge UNIQUE (participant_id, challenge_id);


--
-- TOC entry 3825 (class 2606 OID 17518)
-- Name: districts uq_districts_state_name_en; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT uq_districts_state_name_en UNIQUE (state_id, name_en);


--
-- TOC entry 3851 (class 2606 OID 17727)
-- Name: participants uq_participants_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT uq_participants_email UNIQUE (email);


--
-- TOC entry 3853 (class 2606 OID 17729)
-- Name: participants uq_participants_mobile; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT uq_participants_mobile UNIQUE (mobile);


--
-- TOC entry 3839 (class 2606 OID 17564)
-- Name: participant_category_institute_types uq_pc_institute_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT uq_pc_institute_type UNIQUE (participant_category_id, institute_type_id);


--
-- TOC entry 3818 (class 2606 OID 17505)
-- Name: states uq_states_name_en; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT uq_states_name_en UNIQUE (name_en);


--
-- TOC entry 3869 (class 2606 OID 17806)
-- Name: application_team_members uq_team_members_application_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT uq_team_members_application_email UNIQUE (application_id, email);


--
-- TOC entry 3871 (class 2606 OID 17808)
-- Name: application_team_members uq_team_members_application_mobile; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT uq_team_members_application_mobile UNIQUE (application_id, mobile);


--
-- TOC entry 3854 (class 1259 OID 17787)
-- Name: idx_applications_challenge_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_challenge_id ON public.participant_applications USING btree (challenge_id);


--
-- TOC entry 3855 (class 1259 OID 17788)
-- Name: idx_applications_participant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_participant_id ON public.participant_applications USING btree (participant_id);


--
-- TOC entry 3856 (class 1259 OID 17789)
-- Name: idx_applications_state_district; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_state_district ON public.participant_applications USING btree (state_id, district_id);


--
-- TOC entry 3857 (class 1259 OID 17790)
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_status ON public.participant_applications USING btree (status);


--
-- TOC entry 3821 (class 1259 OID 17527)
-- Name: idx_districts_name_bn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_districts_name_bn ON public.districts USING btree (name_bn);


--
-- TOC entry 3822 (class 1259 OID 17528)
-- Name: idx_districts_name_hi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_districts_name_hi ON public.districts USING btree (name_hi);


--
-- TOC entry 3823 (class 1259 OID 17524)
-- Name: idx_districts_state_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_districts_state_id ON public.districts USING btree (state_id);


--
-- TOC entry 3874 (class 1259 OID 17856)
-- Name: idx_documents_application_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_application_id ON public.application_documents USING btree (application_id);


--
-- TOC entry 3875 (class 1259 OID 17857)
-- Name: idx_documents_uploaded_by_member_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_uploaded_by_member_id ON public.application_documents USING btree (uploaded_by_member_id);


--
-- TOC entry 3890 (class 1259 OID 18268)
-- Name: idx_email_verification_attempts_locked_until; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_attempts_locked_until ON public.participant_email_verification_attempts USING btree (locked_until);


--
-- TOC entry 3891 (class 1259 OID 18267)
-- Name: idx_email_verification_attempts_mobile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_attempts_mobile ON public.participant_email_verification_attempts USING btree (mobile);


--
-- TOC entry 3881 (class 1259 OID 17926)
-- Name: idx_email_verification_tokens_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_tokens_active ON public.participant_email_verification_tokens USING btree (token_hash, expires_at) WHERE (consumed_at IS NULL);


--
-- TOC entry 3882 (class 1259 OID 17925)
-- Name: idx_email_verification_tokens_application_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_tokens_application_id ON public.participant_email_verification_tokens USING btree (application_id);


--
-- TOC entry 3883 (class 1259 OID 17924)
-- Name: idx_email_verification_tokens_participant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_verification_tokens_participant_id ON public.participant_email_verification_tokens USING btree (participant_id);


--
-- TOC entry 3878 (class 1259 OID 17882)
-- Name: idx_form_saves_application_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_saves_application_id ON public.application_form_saves USING btree (application_id);


--
-- TOC entry 3879 (class 1259 OID 17883)
-- Name: idx_form_saves_application_language_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_saves_application_language_current ON public.application_form_saves USING btree (application_id, language_code, is_current);


--
-- TOC entry 3896 (class 1259 OID 18580)
-- Name: idx_participant_login_attempts_locked_until; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_participant_login_attempts_locked_until ON public.participant_login_verification_attempts USING btree (locked_until);


--
-- TOC entry 3901 (class 1259 OID 18582)
-- Name: idx_participant_login_tokens_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_participant_login_tokens_active ON public.participant_login_verification_tokens USING btree (token_hash, expires_at) WHERE (consumed_at IS NULL);


--
-- TOC entry 3902 (class 1259 OID 18581)
-- Name: idx_participant_login_tokens_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_participant_login_tokens_email ON public.participant_login_verification_tokens USING btree (email);


--
-- TOC entry 3834 (class 1259 OID 17575)
-- Name: idx_pc_institute_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pc_institute_category_id ON public.participant_category_institute_types USING btree (participant_category_id);


--
-- TOC entry 3835 (class 1259 OID 17576)
-- Name: idx_pc_institute_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pc_institute_type_id ON public.participant_category_institute_types USING btree (institute_type_id);


--
-- TOC entry 3813 (class 1259 OID 17525)
-- Name: idx_states_name_bn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_states_name_bn ON public.states USING btree (name_bn);


--
-- TOC entry 3814 (class 1259 OID 17526)
-- Name: idx_states_name_hi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_states_name_hi ON public.states USING btree (name_hi);


--
-- TOC entry 3866 (class 1259 OID 17819)
-- Name: idx_team_members_application_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_application_id ON public.application_team_members USING btree (application_id);


--
-- TOC entry 3867 (class 1259 OID 17820)
-- Name: idx_team_members_participant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_members_participant_id ON public.application_team_members USING btree (participant_id);


--
-- TOC entry 3880 (class 1259 OID 17884)
-- Name: uq_form_saves_current_language; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_form_saves_current_language ON public.application_form_saves USING btree (application_id, language_code) WHERE (is_current = true);


--
-- TOC entry 3934 (class 2620 OID 17896)
-- Name: application_documents trg_application_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_application_documents_updated_at BEFORE UPDATE ON public.application_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3933 (class 2620 OID 17890)
-- Name: application_team_members trg_application_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_application_team_members_updated_at BEFORE UPDATE ON public.application_team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3928 (class 2620 OID 17887)
-- Name: challenges trg_challenges_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3937 (class 2620 OID 18853)
-- Name: participant_email_verification_attempts trg_email_verification_attempts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_email_verification_attempts_updated_at BEFORE UPDATE ON public.participant_email_verification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3930 (class 2620 OID 17889)
-- Name: participant_applications trg_participant_applications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_participant_applications_updated_at BEFORE UPDATE ON public.participant_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3938 (class 2620 OID 18854)
-- Name: participant_login_verification_attempts trg_participant_login_attempts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_participant_login_attempts_updated_at BEFORE UPDATE ON public.participant_login_verification_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3929 (class 2620 OID 17888)
-- Name: participants trg_participants_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3935 (class 2620 OID 17898)
-- Name: application_documents trg_validate_application_document_member; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_validate_application_document_member AFTER INSERT OR UPDATE OF application_id, uploaded_by_member_id ON public.application_documents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_document_member();


--
-- TOC entry 3936 (class 2620 OID 17901)
-- Name: application_form_saves trg_validate_application_form_save_member; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_validate_application_form_save_member AFTER INSERT OR UPDATE OF application_id, saved_by_member_id ON public.application_form_saves DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_form_save_member();


--
-- TOC entry 3931 (class 2620 OID 17894)
-- Name: participant_applications trg_validate_application_profile_references; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_validate_application_profile_references AFTER INSERT OR UPDATE OF state_id, district_id, participant_category_id, institute_type_id ON public.participant_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_profile_references();


--
-- TOC entry 3932 (class 2620 OID 17891)
-- Name: participant_applications trg_validate_application_team_lead; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_validate_application_team_lead AFTER INSERT OR UPDATE OF team_lead_team_member_id ON public.participant_applications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.validate_application_team_lead();


--
-- TOC entry 3910 (class 2606 OID 17752)
-- Name: participant_applications fk_applications_challenge; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_challenge FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3911 (class 2606 OID 17782)
-- Name: participant_applications fk_applications_challenge_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_challenge_category FOREIGN KEY (challenge_category_id) REFERENCES public.challenge_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3912 (class 2606 OID 17772)
-- Name: participant_applications fk_applications_district; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_district FOREIGN KEY (district_id) REFERENCES public.districts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3913 (class 2606 OID 17777)
-- Name: participant_applications fk_applications_institute_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_institute_type FOREIGN KEY (institute_type_id) REFERENCES public.institute_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3914 (class 2606 OID 17757)
-- Name: participant_applications fk_applications_participant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3915 (class 2606 OID 17762)
-- Name: participant_applications fk_applications_participant_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_participant_category FOREIGN KEY (participant_category_id) REFERENCES public.participant_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3916 (class 2606 OID 17767)
-- Name: participant_applications fk_applications_state; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_state FOREIGN KEY (state_id) REFERENCES public.states(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3917 (class 2606 OID 17822)
-- Name: participant_applications fk_applications_team_lead_member; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_applications
    ADD CONSTRAINT fk_applications_team_lead_member FOREIGN KEY (team_lead_team_member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 3907 (class 2606 OID 17519)
-- Name: districts fk_districts_state; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT fk_districts_state FOREIGN KEY (state_id) REFERENCES public.states(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3920 (class 2606 OID 17846)
-- Name: application_documents fk_documents_application; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3921 (class 2606 OID 17851)
-- Name: application_documents fk_documents_uploaded_by_member; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT fk_documents_uploaded_by_member FOREIGN KEY (uploaded_by_member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3924 (class 2606 OID 17919)
-- Name: participant_email_verification_tokens fk_email_verification_tokens_application; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT fk_email_verification_tokens_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3925 (class 2606 OID 17914)
-- Name: participant_email_verification_tokens fk_email_verification_tokens_participant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_email_verification_tokens
    ADD CONSTRAINT fk_email_verification_tokens_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3922 (class 2606 OID 17872)
-- Name: application_form_saves fk_form_saves_application; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_form_saves
    ADD CONSTRAINT fk_form_saves_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3923 (class 2606 OID 17877)
-- Name: application_form_saves fk_form_saves_saved_by_member; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_form_saves
    ADD CONSTRAINT fk_form_saves_saved_by_member FOREIGN KEY (saved_by_member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3926 (class 2606 OID 18570)
-- Name: participant_login_verification_tokens fk_participant_login_tokens_application; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT fk_participant_login_tokens_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3927 (class 2606 OID 18575)
-- Name: participant_login_verification_tokens fk_participant_login_tokens_member; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_login_verification_tokens
    ADD CONSTRAINT fk_participant_login_tokens_member FOREIGN KEY (member_id) REFERENCES public.application_team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3908 (class 2606 OID 17565)
-- Name: participant_category_institute_types fk_pc_institute_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT fk_pc_institute_category FOREIGN KEY (participant_category_id) REFERENCES public.participant_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3909 (class 2606 OID 17570)
-- Name: participant_category_institute_types fk_pc_institute_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.participant_category_institute_types
    ADD CONSTRAINT fk_pc_institute_type FOREIGN KEY (institute_type_id) REFERENCES public.institute_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3918 (class 2606 OID 17809)
-- Name: application_team_members fk_team_members_application; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT fk_team_members_application FOREIGN KEY (application_id) REFERENCES public.participant_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3919 (class 2606 OID 17814)
-- Name: application_team_members fk_team_members_participant; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_team_members
    ADD CONSTRAINT fk_team_members_participant FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4127 (class 0 OID 0)
-- Dependencies: 18
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 4128 (class 0 OID 0)
-- Dependencies: 294
-- Name: TABLE application_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_documents TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_documents TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_documents TO service_role;


--
-- TOC entry 4130 (class 0 OID 0)
-- Dependencies: 296
-- Name: TABLE application_form_saves; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_form_saves TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_form_saves TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_form_saves TO service_role;


--
-- TOC entry 4132 (class 0 OID 0)
-- Dependencies: 299
-- Name: TABLE application_number_sequences; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_number_sequences TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_number_sequences TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_number_sequences TO service_role;


--
-- TOC entry 4133 (class 0 OID 0)
-- Dependencies: 292
-- Name: TABLE application_team_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_team_members TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_team_members TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.application_team_members TO service_role;


--
-- TOC entry 4135 (class 0 OID 0)
-- Dependencies: 284
-- Name: TABLE challenge_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.challenge_categories TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.challenge_categories TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.challenge_categories TO service_role;


--
-- TOC entry 4137 (class 0 OID 0)
-- Dependencies: 286
-- Name: TABLE challenges; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.challenges TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.challenges TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.challenges TO service_role;


--
-- TOC entry 4139 (class 0 OID 0)
-- Dependencies: 276
-- Name: TABLE districts; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.districts TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.districts TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.districts TO service_role;


--
-- TOC entry 4141 (class 0 OID 0)
-- Dependencies: 280
-- Name: TABLE institute_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.institute_types TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.institute_types TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.institute_types TO service_role;


--
-- TOC entry 4143 (class 0 OID 0)
-- Dependencies: 290
-- Name: TABLE participant_applications; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_applications TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_applications TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_applications TO service_role;


--
-- TOC entry 4145 (class 0 OID 0)
-- Dependencies: 278
-- Name: TABLE participant_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_categories TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_categories TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_categories TO service_role;


--
-- TOC entry 4147 (class 0 OID 0)
-- Dependencies: 282
-- Name: TABLE participant_category_institute_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_category_institute_types TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_category_institute_types TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_category_institute_types TO service_role;


--
-- TOC entry 4149 (class 0 OID 0)
-- Dependencies: 301
-- Name: TABLE participant_email_verification_attempts; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_email_verification_attempts TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_email_verification_attempts TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_email_verification_attempts TO service_role;


--
-- TOC entry 4151 (class 0 OID 0)
-- Dependencies: 298
-- Name: TABLE participant_email_verification_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_email_verification_tokens TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_email_verification_tokens TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_email_verification_tokens TO service_role;


--
-- TOC entry 4153 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE participant_login_verification_attempts; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_login_verification_attempts TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_login_verification_attempts TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_login_verification_attempts TO service_role;


--
-- TOC entry 4155 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE participant_login_verification_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_login_verification_tokens TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_login_verification_tokens TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participant_login_verification_tokens TO service_role;


--
-- TOC entry 4157 (class 0 OID 0)
-- Dependencies: 288
-- Name: TABLE participants; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participants TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participants TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.participants TO service_role;


--
-- TOC entry 4159 (class 0 OID 0)
-- Dependencies: 274
-- Name: TABLE states; Type: ACL; Schema: public; Owner: postgres
--

GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.states TO anon;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.states TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.states TO service_role;


--
-- TOC entry 2501 (class 826 OID 16494)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;


--
-- TOC entry 2482 (class 826 OID 16495)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2502 (class 826 OID 16493)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;


--
-- TOC entry 2484 (class 826 OID 16497)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2500 (class 826 OID 16492)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO service_role;


--
-- TOC entry 2483 (class 826 OID 16496)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- Completed on 2026-09-16 17:09:14 IST

--
-- PostgreSQL database dump complete
--

\unrestrict 1GEddwvVBpfnZgJRouRu1L9HIVXEFRiNxrL9rFhaOdQ45UX8rmIeDF50gJZQClh

