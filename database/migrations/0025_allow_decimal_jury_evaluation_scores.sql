BEGIN;

-- Jury scores now allow up to 2 decimal places (e.g. 7.39), not just whole
-- numbers. total_score grows accordingly (10 criteria x 0-10.00 = 0-100.00).
ALTER TABLE public.jury_evaluation_scores
    DROP CONSTRAINT IF EXISTS ck_jury_evaluation_scores_range;
ALTER TABLE public.jury_evaluation_scores
    ALTER COLUMN score TYPE numeric(4, 2);
ALTER TABLE public.jury_evaluation_scores
    ADD CONSTRAINT ck_jury_evaluation_scores_range CHECK (score BETWEEN 0 AND 10);

ALTER TABLE public.jury_evaluations
    DROP CONSTRAINT IF EXISTS ck_jury_evaluations_total;
ALTER TABLE public.jury_evaluations
    ALTER COLUMN total_score TYPE numeric(5, 2);
ALTER TABLE public.jury_evaluations
    ALTER COLUMN total_score SET DEFAULT 0;
ALTER TABLE public.jury_evaluations
    ADD CONSTRAINT ck_jury_evaluations_total CHECK (total_score BETWEEN 0 AND 100);

COMMIT;
