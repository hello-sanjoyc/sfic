BEGIN;

ALTER TABLE ONLY public.participant_applications
    DROP CONSTRAINT IF EXISTS uq_applications_participant_challenge;

COMMIT;
