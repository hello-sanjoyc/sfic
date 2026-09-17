--
-- Sewa First Innovation Challenge (SFIC) - Transactional Data Reset
--
-- Deletes ALL transactional / user-submitted data (participants,
-- applications, team members, uploaded documents, form saves, and
-- verification tokens/attempts) and resets their id sequences back to 1.
--
-- Reference/lookup data is left untouched: states, districts,
-- institute_types, participant_categories,
-- participant_category_institute_types, challenge_categories, challenges.
--
-- Intended use: run this once in production AFTER UAT/testing is done and
-- BEFORE go-live, to wipe out any test submissions created during
-- testing while keeping the seeded reference data intact.
--
-- THIS IS DESTRUCTIVE AND IRREVERSIBLE. It permanently deletes every
-- participant, application, uploaded document, and verification token in
-- the database. Take a database backup/snapshot before running this.
--
-- Usage:
--   psql "postgresql://<user>:<password>@<host>:<port>/<database>" -f reset_transactional_data.sql
--

BEGIN;

TRUNCATE TABLE
    public.application_documents,
    public.application_form_saves,
    public.participant_email_verification_tokens,
    public.participant_login_verification_tokens,
    public.application_team_members,
    public.participant_applications,
    public.participants,
    public.participant_email_verification_attempts,
    public.participant_login_verification_attempts,
    public.application_number_sequences
    RESTART IDENTITY CASCADE;

COMMIT;
