import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "../common/api-response.js";
import type { AuthenticatedJuryRequest } from "./jury-auth.js";
import { JURY_SCOPE_SQL, loadJuryScope, type Pool } from "./jury.dashboard.js";
import { auditService } from "../audit/audit.service.js";

// Do not name a criterion "prototype", "constructor" or "__proto__": axios
// silently drops those keys from request bodies.
export const EVALUATION_CRITERIA = [
    "problemClarity",
    "innovation",
    "method",
    "feasibility",
    "costEffectiveness",
    "impact",
    "scalability",
    "pilotModel",
    "readiness",
    "presentation",
] as const;

const RECOMMENDATIONS = ["Recommend", "Reject", "Review"] as const;
const MAX_COMMENT_LENGTH = 2000;

export type LoadedJuryScope = NonNullable<
    Awaited<ReturnType<typeof loadJuryScope>>
>;
type Level = "District" | "State";

const STATE_CODES: Record<string, string> = {
    bihar: "BI",
    jharkhand: "JH",
    "west bengal": "WB",
};

type EvaluationRow = {
    comments: string | null;
    id: string;
    jury_profile_id: string;
    level: Level;
    recommendation: string | null;
    status: "auto_submitted" | "in_progress" | "submitted";
    submitted_at: Date | null;
    total_score: number;
};

function settingKey(level: Level, stateName: string) {
    const code = STATE_CODES[stateName.trim().toLowerCase()];
    if (!code) return null;

    return `JURY_${level === "District" ? "DISTRICT" : "STATE"}_EVALUATION_SUBMIT_DATE_${code}`;
}

// An empty or unparsable setting means "no deadline set".
function parseDeadline(value: string | undefined) {
    if (!value?.trim()) return null;

    const date = new Date(value.trim());
    return Number.isNaN(date.getTime()) ? null : date;
}

async function loadDeadlines(pg: Pool, stateName: string) {
    const keys = (["District", "State"] as const).map((level) =>
        settingKey(level, stateName),
    );
    const result = await pg.query<{ setting_key: string; setting_value: string }>(
        `SELECT setting_key, setting_value
         FROM public.app_settings
         WHERE is_active = TRUE AND setting_key = ANY($1::text[])`,
        [keys.filter(Boolean)],
    );
    const values = new Map(
        result.rows.map((row) => [row.setting_key, row.setting_value]),
    );

    return {
        District: parseDeadline(values.get(keys[0] ?? "")),
        State: parseDeadline(values.get(keys[1] ?? "")),
    };
}

// Applications whose jury never pressed final submit are submitted
// automatically once the deadline for their state and level has passed.
export async function autoSubmitExpiredEvaluations(pg: Pool) {
    const result = await pg.query<{ setting_key: string; setting_value: string }>(
        `SELECT setting_key, setting_value
         FROM public.app_settings
         WHERE is_active = TRUE
           AND setting_key LIKE 'JURY\\_%\\_EVALUATION\\_SUBMIT\\_DATE\\_%'`,
    );
    const now = Date.now();
    const expired: Record<Level, string[]> = { District: [], State: [] };

    for (const row of result.rows) {
        const deadline = parseDeadline(row.setting_value);
        if (!deadline || deadline.getTime() > now) continue;

        const level: Level = row.setting_key.startsWith("JURY_DISTRICT_")
            ? "District"
            : "State";
        const code = row.setting_key.split("_").pop();
        const stateName = Object.entries(STATE_CODES).find(
            ([, stateCode]) => stateCode === code,
        )?.[0];
        if (stateName) expired[level].push(stateName);
    }

    if (expired.District.length === 0 && expired.State.length === 0) return;

    await pg.query(
        `UPDATE public.jury_evaluations e
         SET status = 'auto_submitted',
             submitted_at = NOW(),
             updated_at = NOW(),
             total_score = COALESCE((
                SELECT SUM(s.score)
                FROM public.jury_evaluation_scores s
                WHERE s.evaluation_id = e.id
             ), 0)
         FROM public.jury_profiles jp
         JOIN public.states st ON st.id = jp.state_id
         WHERE jp.id = e.jury_profile_id
           AND e.status = 'in_progress'
           AND (
                (e.level = 'District' AND LOWER(TRIM(st.name_en)) = ANY($1::text[]))
                OR (e.level = 'State' AND LOWER(TRIM(st.name_en)) = ANY($2::text[]))
           )`,
        [expired.District, expired.State],
    );
}

export type JuryAccess = {
    deadline: Date | null;
    isOpen: boolean;
    isSubmissionClosed: boolean;
    level: Level;
    message: string;
};

// District level juries can always work; state level juries only after the
// district level deadline for their state has passed.
export async function getJuryAccess(
    pg: Pool,
    loaded: LoadedJuryScope,
): Promise<JuryAccess> {
    const level = loaded.jury.scope;
    const deadlines = await loadDeadlines(pg, loaded.jury.state_name);
    const deadline = deadlines[level];
    const now = Date.now();
    const isSubmissionClosed = Boolean(deadline && deadline.getTime() <= now);

    if (level === "State") {
        const districtDeadline = deadlines.District;
        const districtDone = Boolean(
            districtDeadline && districtDeadline.getTime() <= now,
        );

        if (!districtDone) {
            return {
                deadline,
                isOpen: false,
                isSubmissionClosed,
                level,
                message:
                    "Applications will open for state level jury members once district level screening is completed.",
            };
        }
    }

    return { deadline, isOpen: true, isSubmissionClosed, level, message: "" };
}

export const LOCKED_MESSAGE =
    "This application is currently locked because another jury member is evaluating it.";

// Evaluation of an application by someone other than this jury member.
export async function findLockedByOther(
    pg: Pool,
    applicationId: number,
    level: Level,
    juryId: number,
) {
    const result = await pg.query<{ jury_profile_id: string }>(
        `SELECT jury_profile_id::text
         FROM public.jury_evaluations
         WHERE application_id = $1 AND level = $2`,
        [applicationId, level],
    );
    const row = result.rows[0];

    return Boolean(row && Number(row.jury_profile_id) !== juryId);
}

function positiveInteger(value: unknown) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

type Params = { applicationId?: string };

async function loadScores(pg: Pool, evaluationId: string) {
    const result = await pg.query<{ criterion_key: string; score: number }>(
        `SELECT criterion_key, score
         FROM public.jury_evaluation_scores
         WHERE evaluation_id = $1`,
        [evaluationId],
    );

    return Object.fromEntries(
        result.rows.map((row) => [row.criterion_key, row.score]),
    );
}

// Per-criterion before/after diff for editing an already-submitted
// evaluation. Must be called before `saveDraft` overwrites the scores.
async function buildScoreChanges(
    pg: Pool,
    evaluation: EvaluationRow,
    draft: Draft,
) {
    const before = await loadScores(pg, evaluation.id);
    const after = Object.fromEntries(draft.scores);
    const changes: Record<string, { from: number | null; to: number | null }> = {};

    for (const key of EVALUATION_CRITERIA) {
        const fromValue = before[key] ?? null;
        const toValue = after[key] ?? null;
        if (fromValue === toValue) continue;

        changes[key] = { from: fromValue, to: toValue };
    }

    return changes;
}

async function toEvaluationDto(
    pg: Pool,
    row: EvaluationRow,
    access: JuryAccess,
) {
    // Submitting only confirms the evaluation. It stays editable until the
    // submission date passes (or it was auto-submitted), then it is locked.
    const isLocked = row.status === "auto_submitted" || access.isSubmissionClosed;

    return {
        comments: row.comments ?? "",
        deadline: access.deadline?.toISOString() ?? null,
        id: Number(row.id),
        level: row.level,
        readOnly: isLocked,
        recommendation: row.recommendation ?? "",
        scores: await loadScores(pg, row.id),
        status: row.status,
        submittedAt: row.submitted_at?.toISOString() ?? null,
        totalScore: row.total_score,
    };
}

type Context = {
    access: JuryAccess;
    applicationId: number;
    juryId: number;
    loaded: LoadedJuryScope;
    pg: Pool;
};

// Shared checks for every evaluation endpoint: database, id, jury profile,
// state level gate and that the application is inside the jury's scope.
async function prepare(
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
): Promise<Context | null> {
    if (!request.server.hasDecorator("pg")) {
        sendError(request, reply, {
            messageKey: "databaseNotConfigured",
            statusCode: 503,
        });
        return null;
    }

    const pg = (request.server as unknown as { pg: Pool }).pg;
    const applicationId = positiveInteger(request.params.applicationId);

    if (!applicationId) {
        sendError(request, reply, {
            message: "A valid application id is required.",
            statusCode: 400,
        });
        return null;
    }

    await autoSubmitExpiredEvaluations(pg);

    const juryId = Number(
        (request as unknown as AuthenticatedJuryRequest).jury.sub,
    );
    const loaded = await loadJuryScope(pg, juryId);

    if (!loaded) {
        sendError(request, reply, {
            message: "Jury profile was not found.",
            statusCode: 404,
        });
        return null;
    }

    const access = await getJuryAccess(pg, loaded);

    if (!access.isOpen) {
        sendError(request, reply, { message: access.message, statusCode: 403 });
        return null;
    }

    const inScope = await pg.query(
        `SELECT 1 FROM public.participant_applications pa
         WHERE ${JURY_SCOPE_SQL} AND pa.id = $4`,
        [...loaded.values, applicationId],
    );

    if (inScope.rows.length === 0) {
        sendError(request, reply, {
            message: "Application not found.",
            statusCode: 404,
        });
        return null;
    }

    return { access, applicationId, juryId, loaded, pg };
}

// Application number + applicant identity for an audit entry, so jury
// evaluation actions can be searched/filtered by applicant name/phone.
async function auditApplicantContext(pg: Pool, applicationId: number) {
    const result = await pg.query<{
        application_number: string;
        full_name: string | null;
        mobile: string | null;
    }>(
        `SELECT pa.application_number, p.full_name, p.mobile
         FROM public.participant_applications pa
         LEFT JOIN public.participants p ON p.id = pa.participant_id
         WHERE pa.id = $1`,
        [applicationId],
    );
    const row = result.rows[0];

    return {
        applicantFullName: row?.full_name ?? null,
        applicantPhone: row?.mobile ?? null,
        applicationNumber: row?.application_number ?? null,
    };
}

async function readEvaluation(
    pg: Pool,
    applicationId: number,
    level: Level,
) {
    const result = await pg.query<EvaluationRow>(
        `SELECT id::text, jury_profile_id::text, level, status, total_score,
                recommendation, comments, submitted_at
         FROM public.jury_evaluations
         WHERE application_id = $1 AND level = $2`,
        [applicationId, level],
    );

    return result.rows[0] ?? null;
}

// Opening the evaluation form starts (or resumes) the evaluation and locks the
// application for every other jury member.
async function startEvaluation(
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
) {
    const context = await prepare(request, reply);
    if (!context) return reply;

    const { access, applicationId, juryId, pg } = context;
    let evaluation = await readEvaluation(pg, applicationId, access.level);

    if (!evaluation) {
        if (access.isSubmissionClosed) {
            return sendError(request, reply, {
                message: "The final submission date has passed for this evaluation round.",
                statusCode: 409,
            });
        }

        const current = await pg.query<{
            application_id: string;
            application_number: string;
        }>(
            `SELECT e.application_id::text, pa.application_number
             FROM public.jury_evaluations e
             JOIN public.participant_applications pa ON pa.id = e.application_id
             WHERE e.jury_profile_id = $1 AND e.status = 'in_progress'`,
            [juryId],
        );

        if (current.rows[0]) {
            return sendError(request, reply, {
                data: {
                    currentApplicationId: Number(current.rows[0].application_id),
                },
                message: `Finish and submit your current evaluation (${current.rows[0].application_number}) before starting another application.`,
                statusCode: 409,
            });
        }

        try {
            await pg.query(
                `INSERT INTO public.jury_evaluations (application_id, jury_profile_id, level)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (application_id, level) DO NOTHING`,
                [applicationId, juryId, access.level],
            );
        } catch (error) {
            // Another application of this jury member was opened at the same time.
            if ((error as { code?: string }).code === "23505") {
                return sendError(request, reply, {
                    message: "Finish and submit your current evaluation before starting another application.",
                    statusCode: 409,
                });
            }

            throw error;
        }

        evaluation = await readEvaluation(pg, applicationId, access.level);

        if (evaluation && Number(evaluation.jury_profile_id) === juryId) {
            await auditService.recordRichAuditEntry(request, pg, {
                actorType: "jury",
                actorId: juryId,
                category: "jury_evaluation",
                action: "jury_evaluation.created",
                applicationId,
                ...(await auditApplicantContext(pg, applicationId)),
                statusCode: 200,
                details: { level: access.level },
            });
        }
    }

    if (!evaluation || Number(evaluation.jury_profile_id) !== juryId) {
        return sendError(request, reply, {
            message: LOCKED_MESSAGE,
            statusCode: 409,
        });
    }

    return sendSuccess(request, reply, {
        data: { evaluation: await toEvaluationDto(pg, evaluation, access) },
        message: "Evaluation fetched.",
    });
}

type SaveBody = {
    comments?: unknown;
    recommendation?: unknown;
    scores?: Record<string, unknown>;
};

// Accepts up to 2 decimal places, e.g. 7.39. Rounding to 2dp (rather than
// rejecting) absorbs floating point noise from round-tripping through JSON.
function parseCriterionScore(raw: unknown) {
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > 10) return null;

    return Math.round(score * 100) / 100;
}

function validateDraft(body: SaveBody | undefined) {
    const scores: Array<[string, number]> = [];

    for (const [key, raw] of Object.entries(body?.scores ?? {})) {
        if (!(EVALUATION_CRITERIA as readonly string[]).includes(key)) {
            return { error: `Unknown evaluation criterion: ${key}.` };
        }

        if (raw === null || raw === undefined || raw === "") continue;

        const score = parseCriterionScore(raw);
        if (score === null) {
            return { error: "Each score must be a number from 0 to 10, with up to 2 decimal places." };
        }

        scores.push([key, score]);
    }

    const comments = typeof body?.comments === "string" ? body.comments.trim() : "";
    if (comments.length > MAX_COMMENT_LENGTH) {
        return { error: `Comments can be at most ${MAX_COMMENT_LENGTH} characters.` };
    }

    const recommendation =
        body?.recommendation === null ||
        body?.recommendation === undefined ||
        body?.recommendation === ""
            ? null
            : String(body.recommendation);
    if (
        recommendation !== null &&
        !(RECOMMENDATIONS as readonly string[]).includes(recommendation)
    ) {
        return { error: "Choose Recommend, Reject or Review." };
    }

    return { comments, recommendation, scores };
}

type Draft = {
    comments: string;
    recommendation: string | null;
    scores: Array<[string, number]>;
};

// A total below 50 is always Reject, and Reject is not allowed from 50 up.
// Only applies once every criterion has a score.
function applyRecommendationRule(draft: Draft): { draft: Draft } | { error: string } {
    if (draft.scores.length !== EVALUATION_CRITERIA.length) return { draft };

    const total = draft.scores.reduce((sum, [, score]) => sum + score, 0);

    if (total < 50) {
        return { draft: { ...draft, recommendation: "Reject" } };
    }

    if (draft.recommendation === "Reject") {
        return {
            error: "Reject is not allowed when the total score is 50 or above.",
        };
    }

    return { draft };
}

async function ownOpenEvaluation(
    context: Context,
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
) {
    const evaluation = await readEvaluation(
        context.pg,
        context.applicationId,
        context.access.level,
    );

    if (!evaluation) {
        sendError(request, reply, {
            message: "Open the application for evaluation first.",
            statusCode: 409,
        });
        return null;
    }

    if (Number(evaluation.jury_profile_id) !== context.juryId) {
        sendError(request, reply, { message: LOCKED_MESSAGE, statusCode: 409 });
        return null;
    }

    if (evaluation.status === "auto_submitted" || context.access.isSubmissionClosed) {
        sendError(request, reply, {
            message: "The submission date has passed, so this evaluation is locked and can no longer be edited.",
            statusCode: 409,
        });
        return null;
    }

    return evaluation;
}

async function saveDraft(
    context: Context,
    evaluationId: string,
    draft: { comments: string; recommendation: string | null; scores: Array<[string, number]> },
    request: FastifyRequest<{ Params: Params }>,
) {
    const client = await (
        request.server as unknown as {
            pg: { connect: () => Promise<Pool & { release: () => void }> };
        }
    ).pg.connect();

    try {
        await client.query("BEGIN");
        await client.query(
            `DELETE FROM public.jury_evaluation_scores WHERE evaluation_id = $1`,
            [evaluationId],
        );

        for (const [key, score] of draft.scores) {
            await client.query(
                `INSERT INTO public.jury_evaluation_scores (evaluation_id, criterion_key, score)
                 VALUES ($1, $2, $3)`,
                [evaluationId, key, score],
            );
        }

        await client.query(
            `UPDATE public.jury_evaluations
             SET comments = $2,
                 recommendation = $3,
                 total_score = COALESCE((
                    SELECT SUM(score) FROM public.jury_evaluation_scores
                    WHERE evaluation_id = $1
                 ), 0),
                 updated_at = NOW()
             WHERE id = $1`,
            [evaluationId, draft.comments || null, draft.recommendation],
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
    } finally {
        client.release();
    }

    return context;
}

async function updateEvaluation(
    request: FastifyRequest<{ Body: SaveBody; Params: Params }>,
    reply: FastifyReply,
) {
    const context = await prepare(request, reply);
    if (!context) return reply;

    const validated = validateDraft(request.body);
    if ("error" in validated) {
        return sendError(request, reply, { message: validated.error, statusCode: 400 });
    }

    const ruled = applyRecommendationRule(validated);
    if ("error" in ruled) {
        return sendError(request, reply, { message: ruled.error, statusCode: 400 });
    }

    const draft = ruled.draft;
    const evaluation = await ownOpenEvaluation(context, request, reply);
    if (!evaluation) return reply;

    // Once submitted, edits must keep the evaluation complete.
    if (evaluation.status === "submitted") {
        if (draft.scores.length !== EVALUATION_CRITERIA.length) {
            return sendError(request, reply, {
                message: `A submitted evaluation needs a score for all ${EVALUATION_CRITERIA.length} criteria.`,
                statusCode: 400,
            });
        }

        if (!draft.recommendation) {
            return sendError(request, reply, {
                message: "A submitted evaluation needs a jury recommendation.",
                statusCode: 400,
            });
        }
    }

    // Editing an already-submitted evaluation is a meaningful post-submission
    // correction worth a dedicated audit entry; routine autosave of an
    // in-progress draft (saved repeatedly while the jury member is still
    // typing) is not, and would otherwise flood the audit trail. The "before"
    // scores/comments/recommendation must be captured now, before saveDraft
    // overwrites them.
    const scoreChanges =
        evaluation.status === "submitted"
            ? await buildScoreChanges(context.pg, evaluation, draft)
            : null;

    await saveDraft(context, evaluation.id, draft, request);

    const saved = await readEvaluation(
        context.pg,
        context.applicationId,
        context.access.level,
    );

    if (evaluation.status === "submitted") {
        await auditService.recordRichAuditEntry(request, context.pg, {
            actorType: "jury",
            actorId: context.juryId,
            category: "jury_evaluation",
            action: "jury_evaluation.updated",
            applicationId: context.applicationId,
            ...(await auditApplicantContext(context.pg, context.applicationId)),
            statusCode: 200,
            details: {
                level: context.access.level,
                totalScore: {
                    from: evaluation.total_score,
                    to: saved?.total_score ?? null,
                },
                recommendation:
                    evaluation.recommendation === draft.recommendation
                        ? undefined
                        : { from: evaluation.recommendation, to: draft.recommendation },
                scores: scoreChanges,
            },
        });
    }

    return sendSuccess(request, reply, {
        data: {
            evaluation: saved
                ? await toEvaluationDto(context.pg, saved, context.access)
                : null,
        },
        message: "Evaluation saved.",
    });
}

async function submitEvaluation(
    request: FastifyRequest<{ Body: SaveBody; Params: Params }>,
    reply: FastifyReply,
) {
    const context = await prepare(request, reply);
    if (!context) return reply;

    const validated = validateDraft(request.body);
    if ("error" in validated) {
        return sendError(request, reply, { message: validated.error, statusCode: 400 });
    }

    if (validated.scores.length !== EVALUATION_CRITERIA.length) {
        const given = new Set(validated.scores.map(([key]) => key));
        const missing = EVALUATION_CRITERIA.filter((key) => !given.has(key));

        return sendError(request, reply, {
            data: { missing },
            message: `Enter a score for all ${EVALUATION_CRITERIA.length} criteria before submitting. Missing: ${missing.join(", ")}.`,
            statusCode: 400,
        });
    }

    const ruled = applyRecommendationRule(validated);
    if ("error" in ruled) {
        return sendError(request, reply, { message: ruled.error, statusCode: 400 });
    }

    const draft = ruled.draft;
    if (!draft.recommendation) {
        return sendError(request, reply, {
            message: "Choose a jury recommendation before submitting.",
            statusCode: 400,
        });
    }

    const evaluation = await ownOpenEvaluation(context, request, reply);
    if (!evaluation) return reply;

    await saveDraft(context, evaluation.id, draft, request);
    await context.pg.query(
        `UPDATE public.jury_evaluations
         SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'in_progress'`,
        [evaluation.id],
    );

    const saved = await readEvaluation(
        context.pg,
        context.applicationId,
        context.access.level,
    );

    await auditService.recordRichAuditEntry(request, context.pg, {
        actorType: "jury",
        actorId: context.juryId,
        category: "jury_evaluation",
        action: "jury_evaluation.updated",
        applicationId: context.applicationId,
        ...(await auditApplicantContext(context.pg, context.applicationId)),
        statusCode: 200,
        details: {
            level: context.access.level,
            recommendation: draft.recommendation,
            totalScore: saved?.total_score ?? null,
            scores: Object.fromEntries(draft.scores),
        },
    });

    return sendSuccess(request, reply, {
        data: {
            evaluation: saved
                ? await toEvaluationDto(context.pg, saved, context.access)
                : null,
        },
        message: "Evaluation submitted.",
    });
}

export const juryEvaluationController = {
    startEvaluation,
    submitEvaluation,
    updateEvaluation,
};
