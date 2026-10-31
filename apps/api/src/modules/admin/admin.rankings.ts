import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "../common/api-response.js";
import type { AuthenticatedAdminRequest } from "./admin-auth.js";
import { appendApplicationScopeCondition, type DatabasePool } from "./admin.service.js";

type RankingsQuery = {
    category?: string;
    districtId?: string;
    page?: string;
    stateId?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
};

type RankingRow = {
    application_number: string;
    category_name: string | null;
    challenge_category: string | null;
    district_category_rank: string;
    district_combined_rank: string;
    district_name: string | null;
    evaluated_by: "District" | "State";
    id: string;
    recommendation: string | null;
    region_category_rank: string;
    region_combined_rank: string;
    state_category_rank: string;
    state_combined_rank: string;
    state_name: string | null;
    total_count: string;
    total_score: number;
};

const MIN_LISTED_SCORE = 50;

const SORT_COLUMNS: Record<string, string> = {
    district: "district_name",
    number: "application_number",
    score: "total_score",
    state: "state_name",
};

// Ranks come from locked jury evaluations only: those auto-submitted, or
// submitted and past their deadline. An application
// evaluated at both levels is ranked on its state level score. Ranks are
// worked out over every scored application, then limited to what the admin's
// role may see, so a district admin still sees the state and region rank.
// Jury members have no access to this endpoint.
async function getRankings(
    request: FastifyRequest<{ Querystring: RankingsQuery }>,
    reply: FastifyReply,
) {
    if (!request.server.hasDecorator("pg")) {
        return sendError(request, reply, {
            messageKey: "databaseNotConfigured",
            statusCode: 503,
        });
    }

    const pg = (request.server as unknown as { pg: DatabasePool }).pg;
    const access = (request as unknown as AuthenticatedAdminRequest).adminAccess;
    const page = Math.max(1, Math.floor(Number(request.query.page) || 1));
    const pageSize = Math.min(
        200,
        Math.max(1, Math.floor(Number(request.query.pageSize) || 10)),
    );
    const direction = request.query.sortDirection === "asc" ? "ASC" : "DESC";
    const sortColumn = SORT_COLUMNS[request.query.sortBy ?? ""] ?? "total_score";
    const values: unknown[] = [];
    const where: string[] = [];

    appendApplicationScopeCondition(where, values, access, "ranked");

    // Only applications scoring 50 or above are listed. Lower scores rank below them, so the ranks shown are unaffected.
    values.push(MIN_LISTED_SCORE);
    where.push(`ranked.total_score >= $${values.length}`);

    // Filters narrow the list only; ranks are still worked out over every scored application.
    const category = request.query.category?.trim().toUpperCase();
    if (category === "JUNIOR" || category === "OPEN") {
        values.push(category);
        where.push(`ranked.category_code = $${values.length}`);
    }

    const stateId = Math.floor(Number(request.query.stateId));
    if (Number.isSafeInteger(stateId) && stateId > 0) {
        values.push(stateId);
        where.push(`ranked.state_id = $${values.length}`);
    }

    const districtId = Math.floor(Number(request.query.districtId));
    if (Number.isSafeInteger(districtId) && districtId > 0) {
        values.push(districtId);
        where.push(`ranked.district_id = $${values.length}`);
    }

    const search = request.query.search?.trim();
    if (search) {
        values.push(`%${search.toLowerCase()}%`);
        where.push(
            `LOWER(CONCAT_WS(' ', ranked.application_number, ranked.state_name, ranked.district_name, ranked.challenge_category)) LIKE $${values.length}`,
        );
    }

    values.push(pageSize, (page - 1) * pageSize);

    try {
        const result = await pg.query<RankingRow>(
            `WITH locked_evaluations AS (
                -- An evaluation counts for ranking once it is locked: auto
                -- submitted, or submitted and past its state/level deadline.
                SELECT e.*
                FROM public.jury_evaluations e
                JOIN public.jury_profiles jp ON jp.id = e.jury_profile_id
                JOIN public.states js ON js.id = jp.state_id
                LEFT JOIN public.app_settings dl
                    ON dl.is_active = TRUE
                   AND dl.setting_key = 'JURY_'
                        || CASE e.level WHEN 'District' THEN 'DISTRICT' ELSE 'STATE' END
                        || '_EVALUATION_SUBMIT_DATE_'
                        || CASE LOWER(TRIM(js.name_en))
                               WHEN 'west bengal' THEN 'WB'
                               WHEN 'bihar' THEN 'BI'
                               WHEN 'jharkhand' THEN 'JH'
                           END
                WHERE e.status = 'auto_submitted'
                   OR (
                        e.status = 'submitted'
                        AND dl.setting_value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                        AND CASE WHEN dl.setting_value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                                 THEN dl.setting_value::timestamptz <= NOW() END
                   )
            ),
            scored AS (
                SELECT pa.id, pa.application_number, pa.state_id, pa.district_id,
                       UPPER(TRIM(pc.code)) AS category_code,
                       pc.name_en AS category_name,
                       cc.name_en AS challenge_category,
                       s.name_en AS state_name,
                       d.name_en AS district_name,
                       COALESCE(st.total_score, di.total_score) AS total_score,
                       COALESCE(st.recommendation, di.recommendation) AS recommendation,
                       CASE WHEN st.id IS NOT NULL THEN 'State' ELSE 'District' END AS evaluated_by
                FROM public.participant_applications pa
                LEFT JOIN public.participant_categories pc ON pc.id = pa.participant_category_id
                LEFT JOIN public.challenge_categories cc ON cc.id = pa.challenge_category_id
                LEFT JOIN public.states s ON s.id = pa.state_id
                LEFT JOIN public.districts d ON d.id = pa.district_id
                LEFT JOIN locked_evaluations di
                    ON di.application_id = pa.id AND di.level = 'District'
                LEFT JOIN locked_evaluations st
                    ON st.application_id = pa.id AND st.level = 'State'
                WHERE pa.status = 'submitted' AND (di.id IS NOT NULL OR st.id IS NOT NULL)
            ),
            ranked AS (
                SELECT scored.*,
                    RANK() OVER (PARTITION BY district_id, category_code ORDER BY total_score DESC) AS district_category_rank,
                    RANK() OVER (PARTITION BY district_id ORDER BY total_score DESC) AS district_combined_rank,
                    RANK() OVER (PARTITION BY state_id, category_code ORDER BY total_score DESC) AS state_category_rank,
                    RANK() OVER (PARTITION BY state_id ORDER BY total_score DESC) AS state_combined_rank,
                    RANK() OVER (PARTITION BY category_code ORDER BY total_score DESC) AS region_category_rank,
                    RANK() OVER (ORDER BY total_score DESC) AS region_combined_rank
                FROM scored
            )
            SELECT ranked.id::text, ranked.application_number, ranked.category_name,
                   ranked.challenge_category, ranked.state_name, ranked.district_name,
                   ranked.total_score, ranked.recommendation, ranked.evaluated_by,
                   ranked.district_category_rank::text, ranked.district_combined_rank::text,
                   ranked.state_category_rank::text, ranked.state_combined_rank::text,
                   ranked.region_category_rank::text, ranked.region_combined_rank::text,
                   (COUNT(*) OVER ())::text AS total_count
            FROM ranked
            ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
            ORDER BY ${sortColumn} ${direction}, ranked.application_number
            LIMIT $${values.length - 1} OFFSET $${values.length}`,
            values,
        );
        const total = Number(result.rows[0]?.total_count ?? 0);

        return sendSuccess(request, reply, {
            data: {
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / pageSize)),
                },
                rankings: result.rows.map((row) => ({
                    applicationNumber: row.application_number,
                    category: row.category_name,
                    challengeCategory: row.challenge_category,
                    district: row.district_name,
                    districtRank: {
                        category: Number(row.district_category_rank),
                        combined: Number(row.district_combined_rank),
                    },
                    evaluatedBy: row.evaluated_by,
                    id: Number(row.id),
                    recommendation: row.recommendation,
                    regionRank: {
                        category: Number(row.region_category_rank),
                        combined: Number(row.region_combined_rank),
                    },
                    state: row.state_name,
                    stateRank: {
                        category: Number(row.state_category_rank),
                        combined: Number(row.state_combined_rank),
                    },
                    totalScore: row.total_score,
                })),
            },
            message: "Application rankings fetched.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: "Rankings could not be loaded.",
            statusCode: 500,
        });
    }
}

export const adminRankingsController = { getRankings };
