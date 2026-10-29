import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "../common/api-response.js";
import type { AuthenticatedJuryRequest } from "./jury-auth.js";

export type Pool = {
    query: <T = Record<string, unknown>>(
        text: string,
        values?: unknown[],
    ) => Promise<{ rows: T[] }>;
};

type JuryScopeRow = {
    district_id: string | null;
    district_name: string | null;
    id: string;
    is_active: boolean;
    scope: "State" | "District";
    state_id: string;
    state_name: string;
};

type CountRow = { count: string; key: string; label: string };

// A jury member reviews submitted applications in the challenge categories
// they were assigned, from their own state. A district-level jury member only
// reviews applications from their own home district; a state-level jury
// member sees the whole state.
// Bind the parameters returned by `loadJuryScope` as $1, $2 and $3.
export const JURY_SCOPE_SQL = `
    pa.status = 'submitted'
    AND pa.state_id = $1
    AND ($2::bigint IS NULL OR pa.district_id = $2)
    AND pa.challenge_category_id = ANY($3::bigint[])
`;

export async function loadJuryScope(pg: Pool, juryId: number) {
    const juryResult = await pg.query<JuryScopeRow>(
        `SELECT jp.id::text, jp.scope, jp.is_active, jp.state_id::text, jp.district_id::text,
                s.name_en AS state_name, d.name_en AS district_name
         FROM public.jury_profiles jp
         JOIN public.states s ON s.id = jp.state_id
         LEFT JOIN public.districts d ON d.id = jp.district_id
         WHERE jp.id = $1`,
        [juryId],
    );
    const jury = juryResult.rows[0];
    if (!jury || !jury.is_active) return null;

    const categoryResult = await pg.query<{ id: string; name: string }>(
        `SELECT cc.id::text, cc.name_en AS name
         FROM public.jury_profile_categories jpc
         JOIN public.challenge_categories cc ON cc.id = jpc.challenge_category_id
         WHERE jpc.jury_profile_id = $1
         ORDER BY cc.sort_order, cc.name_en`,
        [juryId],
    );

    return {
        categories: categoryResult.rows.map((row) => row.name),
        jury,
        values: [
            Number(jury.state_id),
            jury.district_id ? Number(jury.district_id) : null,
            categoryResult.rows.map((row) => Number(row.id)),
        ] as unknown[],
    };
}

async function getJuryDashboard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.server.hasDecorator("pg")) {
        return sendError(request, reply, {
            messageKey: "databaseNotConfigured",
            statusCode: 503,
        });
    }

    const pg = (request.server as unknown as { pg: Pool }).pg;
    const juryId = Number((request as AuthenticatedJuryRequest).jury.sub);

    const loaded = await loadJuryScope(pg, juryId);

    if (!loaded) {
        return sendError(request, reply, {
            message: "Jury profile was not found.",
            statusCode: 404,
        });
    }

    const { categories, jury, values: scopeValues } = loaded;

    const [summary, breakdown, organisationTypes, challengeCategories, districts] =
        await Promise.all([
            pg.query<{ this_week: string; total: string }>(
                `SELECT COUNT(*)::text AS total,
                        COUNT(*) FILTER (
                            WHERE pa.submitted_at >= date_trunc('week', NOW())
                        )::text AS this_week
                 FROM public.participant_applications pa
                 WHERE ${JURY_SCOPE_SQL}`,
                scopeValues,
            ),
            pg.query<{
                junior: string;
                open: string;
                single: string;
                team: string;
            }>(
                `SELECT
                    COUNT(*) FILTER (WHERE UPPER(TRIM(pc.code)) = 'JUNIOR')::text AS junior,
                    COUNT(*) FILTER (WHERE UPPER(TRIM(pc.code)) = 'OPEN')::text AS open,
                    COUNT(*) FILTER (WHERE pa.participation_mode = 'Individual')::text AS single,
                    COUNT(*) FILTER (WHERE pa.participation_mode = 'Team')::text AS team
                 FROM public.participant_applications pa
                 LEFT JOIN public.participant_categories pc
                    ON pc.id = pa.participant_category_id
                 WHERE ${JURY_SCOPE_SQL}`,
                scopeValues,
            ),
            pg.query<CountRow>(
                `WITH target_organisation_types(key, participant_category_code, institute_type_name, label, sort_order) AS (
                    VALUES
                        ('juniorSchool', 'JUNIOR', 'School', 'School', 1),
                        ('juniorIti', 'JUNIOR', 'ITI', 'ITI', 2),
                        ('juniorDiploma', 'JUNIOR', 'Diploma', 'Diploma', 3),
                        ('juniorUndergraduate', 'JUNIOR', 'Undergraduate', 'Undergraduate', 4),
                        ('openGraduate', 'OPEN', 'Graduate', 'Graduate', 5),
                        ('openProfessional', 'OPEN', 'Professional', 'Professional', 6),
                        ('openStartup', 'OPEN', 'Startup', 'Startup', 7),
                        ('openCommunityGroup', 'OPEN', 'Community Group', 'Community Group', 8),
                        ('openGovernmentFunded', 'OPEN', 'Government / Government Funded', 'Government / Government Funded', 9)
                 )
                 SELECT t.key, t.label, COUNT(pa.id)::text AS count
                 FROM target_organisation_types t
                 LEFT JOIN public.participant_categories pc
                    ON UPPER(TRIM(pc.code)) = t.participant_category_code
                 LEFT JOIN public.institute_types it
                    ON LOWER(TRIM(it.name_en)) = LOWER(TRIM(t.institute_type_name))
                 LEFT JOIN public.participant_applications pa
                    ON pa.participant_category_id = pc.id
                    AND pa.institute_type_id = it.id
                    AND ${JURY_SCOPE_SQL}
                 GROUP BY t.key, t.label, t.sort_order
                 ORDER BY t.sort_order`,
                scopeValues,
            ),
            // Per category: everything in the jury member's scope, and how much
            // of it this jury member has viewed, started, finished and
            // recommended. Evaluations by other jury members are not counted.
            pg.query<
                CountRow & {
                    evaluated: string;
                    on_evaluation: string;
                    recommended: string;
                    rejected: string;
                    reviewed: string;
                    viewed: string;
                }
            >(
                `SELECT cc.id::text AS key, cc.name_en AS label,
                        COUNT(pa.id)::text AS count,
                        COUNT(pa.id) FILTER (WHERE v.application_id IS NOT NULL)::text AS viewed,
                        COUNT(pa.id) FILTER (WHERE ev.status = 'in_progress')::text AS on_evaluation,
                        COUNT(pa.id) FILTER (WHERE ev.status IN ('submitted', 'auto_submitted'))::text AS evaluated,
                        COUNT(pa.id) FILTER (WHERE ev.status IN ('submitted', 'auto_submitted') AND ev.recommendation = 'Recommend')::text AS recommended,
                        COUNT(pa.id) FILTER (WHERE ev.status IN ('submitted', 'auto_submitted') AND ev.recommendation = 'Review')::text AS reviewed,
                        COUNT(pa.id) FILTER (WHERE ev.status IN ('submitted', 'auto_submitted') AND ev.recommendation = 'Reject')::text AS rejected
                 FROM public.challenge_categories cc
                 LEFT JOIN public.participant_applications pa
                    ON pa.challenge_category_id = cc.id
                    AND ${JURY_SCOPE_SQL}
                 LEFT JOIN public.jury_evaluations ev
                    ON ev.application_id = pa.id AND ev.jury_profile_id = $4
                 LEFT JOIN public.jury_application_views v
                    ON v.application_id = pa.id AND v.jury_profile_id = $4
                 WHERE cc.id = ANY($3::bigint[])
                 GROUP BY cc.id, cc.name_en, cc.sort_order
                 ORDER BY cc.sort_order, cc.name_en`,
                [...scopeValues, juryId],
            ),
            // A district-scoped jury only sees their own district, so a
            // per-district breakdown is only useful for state-scoped juries.
            jury.scope === "State"
                ? pg.query<CountRow>(
                      `SELECT d.id::text AS key, d.name_en AS label, COUNT(pa.id)::text AS count
                       FROM public.districts d
                       LEFT JOIN public.participant_applications pa
                          ON pa.district_id = d.id
                          AND ${JURY_SCOPE_SQL}
                       WHERE d.state_id = $1
                       GROUP BY d.id, d.name_en
                       ORDER BY COUNT(pa.id) DESC, d.name_en`,
                      scopeValues,
                  )
                : Promise.resolve({ rows: [] as CountRow[] }),
        ]);

    const total = Number(summary.rows[0]?.total ?? 0);
    const thisWeek = Number(summary.rows[0]?.this_week ?? 0);
    const modes = breakdown.rows[0];

    return sendSuccess(request, reply, {
        data: {
            cards: [
                {
                    count: total,
                    detail: `+${thisWeek} this week`,
                    key: "totalApplications",
                    label: "Total Applications",
                },
                {
                    count: Number(modes?.junior ?? 0),
                    detail: "Participant Category",
                    key: "junior",
                    label: "Junior",
                },
                {
                    count: Number(modes?.open ?? 0),
                    detail: "Participant Category",
                    key: "open",
                    label: "Open",
                },
                {
                    count: Number(modes?.single ?? 0),
                    detail: "Participation Mode",
                    key: "single",
                    label: "Individual",
                },
                {
                    count: Number(modes?.team ?? 0),
                    detail: "Participation Mode",
                    key: "team",
                    label: "Team",
                },
            ],
            challengeCategories: challengeCategories.rows.map((row) => ({
                count: Number(row.count),
                evaluated: Number(row.evaluated),
                key: row.key,
                label: row.label,
                onEvaluation: Number(row.on_evaluation),
                recommended: Number(row.recommended),
                rejected: Number(row.rejected),
                reviewed: Number(row.reviewed),
                viewed: Number(row.viewed),
            })),
            districts: districts.rows.map((row) => ({
                count: Number(row.count),
                key: row.key,
                label: row.label,
            })),
            organisationTypes: organisationTypes.rows.map((row) => ({
                count: Number(row.count),
                key: row.key,
                label: row.label,
            })),
            scope: {
                categories,
                district: jury.district_name,
                scope: jury.scope,
                state: jury.state_name,
            },
        },
        message: "Jury dashboard fetched.",
    });
}

export const juryDashboardController = { getJuryDashboard };
