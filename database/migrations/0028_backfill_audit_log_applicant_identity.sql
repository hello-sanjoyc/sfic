BEGIN;

-- One-time backfill: application-scoped audit_log rows written before the
-- applicant-identity feature landed have NULL applicant_full_name /
-- applicant_phone, so they are unreachable by those filters even though the
-- application (and its applicant) still exists. Fill them in wherever the
-- linked application is still around. Rows whose application_id is NULL, or
-- whose application was since deleted (application_id was set to NULL by
-- the FK's ON DELETE SET NULL), cannot be backfilled - there is nothing
-- left to join against - and are intentionally left as-is.
UPDATE public.audit_log al
SET
    applicant_full_name = p.full_name,
    applicant_phone = p.mobile
FROM public.participant_applications pa
JOIN public.participants p ON p.id = pa.participant_id
WHERE al.application_id = pa.id
  AND al.applicant_full_name IS NULL
  AND al.applicant_phone IS NULL;

COMMIT;
