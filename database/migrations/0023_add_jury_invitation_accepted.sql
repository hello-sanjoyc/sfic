BEGIN;

-- invitation_accepted: TRUE once the jury has clicked the email verification link.
-- It is independent of is_active, which admins can now toggle (Active / Inactive).
ALTER TABLE public.jury_profiles
    ADD COLUMN IF NOT EXISTS invitation_accepted boolean DEFAULT false NOT NULL;

-- Every jury who has already verified their email has accepted the invitation.
UPDATE public.jury_profiles
SET invitation_accepted = TRUE
WHERE email_verified_at IS NOT NULL
  AND invitation_accepted = FALSE;

COMMIT;
