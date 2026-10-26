BEGIN;

-- axios drops request body keys named "prototype", so the Prototype / Pilot
-- Model criterion is stored as "pilotModel" instead.
ALTER TABLE public.jury_evaluation_scores
    DROP CONSTRAINT IF EXISTS ck_jury_evaluation_scores_key;

UPDATE public.jury_evaluation_scores
SET criterion_key = 'pilotModel'
WHERE criterion_key = 'prototype';

ALTER TABLE public.jury_evaluation_scores
    ADD CONSTRAINT ck_jury_evaluation_scores_key CHECK (criterion_key IN (
        'problemClarity',
        'innovation',
        'method',
        'feasibility',
        'costEffectiveness',
        'impact',
        'scalability',
        'pilotModel',
        'readiness',
        'presentation'
    ));

COMMIT;
