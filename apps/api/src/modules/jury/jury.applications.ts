import { createReadStream } from "node:fs";
import type { FastifyReply, FastifyRequest } from "fastify";
import { generateApplicationPdf } from "../admin/admin-application-pdf.js";
import {
    contentDispositionFileName,
    resolveStoredFilePath,
} from "../admin/admin.controller.js";
import { sendError, sendSuccess } from "../common/api-response.js";
import type { AuthenticatedJuryRequest } from "./jury-auth.js";
import { JURY_SCOPE_SQL, loadJuryScope, type Pool } from "./jury.dashboard.js";
import {
    LOCKED_MESSAGE,
    autoSubmitExpiredEvaluations,
    findLockedByOther,
    getJuryAccess,
} from "./jury.evaluation.js";

type ApplicationsQuery = {
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
};

type ApplicationRow = {
    challenge_category_name: string | null;
    district_name: string | null;
    evaluation_status: "available" | "evaluated" | "locked" | "on_evaluation";
    recommendation: string | null;
    total_score: number | null;
    id: string;
    application_number: string;
    state_name: string | null;
    status: string;
    submitted_at: Date | null;
};

const SORT_COLUMNS: Record<string, string> = {
    district: "d.name_en",
    number: "pa.application_number",
    state: "s.name_en",
    status: "evaluation_status",
    submittedAt: "pa.submitted_at",
    title: "cc.name_en",
};

async function getJuryApplications(
    request: FastifyRequest<{ Querystring: ApplicationsQuery }>,
    reply: FastifyReply,
) {
    if (!request.server.hasDecorator("pg")) {
        return sendError(request, reply, {
            messageKey: "databaseNotConfigured",
            statusCode: 503,
        });
    }

    const pg = (request.server as unknown as { pg: Pool }).pg;
    const loaded = await loadJuryScope(
        pg,
        Number((request as unknown as AuthenticatedJuryRequest).jury.sub),
    );

    if (!loaded) {
        return sendError(request, reply, {
            message: "Jury profile was not found.",
            statusCode: 404,
        });
    }

    await autoSubmitExpiredEvaluations(pg);

    const access = await getJuryAccess(pg, loaded);

    if (!access.isOpen) {
        return sendError(request, reply, {
            message: access.message,
            statusCode: 403,
        });
    }

    const juryId = Number((request as unknown as AuthenticatedJuryRequest).jury.sub);

    const page = Math.max(1, Math.floor(Number(request.query.page) || 1));
    const pageSize = Math.min(
        200,
        Math.max(1, Math.floor(Number(request.query.pageSize) || 10)),
    );
    const direction = request.query.sortDirection === "asc" ? "ASC" : "DESC";
    const requestedSort = SORT_COLUMNS[request.query.sortBy ?? ""];
    // $4 is used by the evaluation join below; search comes after it.
    const values = [...loaded.values, access.level];
    let searchSql = "";
    const search = request.query.search?.trim();

    if (search) {
        values.push(`%${search.toLowerCase()}%`);
        searchSql = `AND LOWER(CONCAT_WS(' ', pa.application_number, cc.name_en, s.name_en, d.name_en)) LIKE $${values.length}`;
    }

    const fromSql = `
        FROM public.participant_applications pa
        LEFT JOIN public.challenge_categories cc ON cc.id = pa.challenge_category_id
        LEFT JOIN public.states s ON s.id = pa.state_id
        LEFT JOIN public.districts d ON d.id = pa.district_id
        LEFT JOIN public.jury_evaluations ev
            ON ev.application_id = pa.id AND ev.level = $4
        WHERE ${JURY_SCOPE_SQL}
        ${searchSql}
    `;

    const total = await pg.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count ${fromSql}`,
        values,
    );
    const totalCount = Number(total.rows[0]?.count ?? 0);

    const statusSql = `CASE
                    WHEN ev.id IS NULL THEN 'available'
                    WHEN ev.jury_profile_id = $${values.length + 1} THEN
                        CASE WHEN ev.status = 'in_progress' THEN 'on_evaluation' ELSE 'evaluated' END
                    ELSE 'locked'
                END`;
    // The evaluation in progress is always first. Without a chosen sort, the
    // rest follow as: not evaluated yet, then evaluated, then applications
    // locked by other jury members, each by application number.
    const orderBy = requestedSort
        ? requestedSort
              .split(", ")
              .map((column) => `${column} ${direction}`)
              .join(", ")
        : `CASE ${statusSql} WHEN 'available' THEN 1 WHEN 'evaluated' THEN 2 ELSE 3 END, pa.application_number ASC`;

    const rows = await pg.query<ApplicationRow>(
        `SELECT pa.id::text, pa.application_number, pa.status, pa.submitted_at,
                cc.name_en AS challenge_category_name, d.name_en AS district_name, s.name_en AS state_name,
                ${statusSql} AS evaluation_status,
                CASE WHEN ${statusSql} = 'evaluated' THEN ev.total_score END AS total_score,
                CASE WHEN ${statusSql} = 'evaluated' THEN ev.recommendation END AS recommendation
         ${fromSql}
         ORDER BY CASE WHEN ${statusSql} = 'on_evaluation' THEN 0 ELSE 1 END, ${orderBy}, pa.id DESC
         LIMIT $${values.length + 2} OFFSET $${values.length + 3}`,
        [...values, juryId, pageSize, (page - 1) * pageSize],
    );

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

    return sendSuccess(request, reply, {
        data: {
            applications: rows.rows.map((row) => ({
                applicationNumber: row.application_number,
                challengeCategory: row.challenge_category_name,
                district: row.district_name,
                evaluationStatus: row.evaluation_status,
                recommendation: row.recommendation,
                totalScore: row.total_score,
                id: Number(row.id),
                state: row.state_name,
                status: row.status,
                submittedAt: row.submitted_at?.toISOString() ?? null,
            })),
            currentEvaluation: current.rows[0]
                ? {
                      applicationId: Number(current.rows[0].application_id),
                      applicationNumber: current.rows[0].application_number,
                  }
                : null,
            submission: {
                deadline: access.deadline?.toISOString() ?? null,
                isClosed: access.isSubmissionClosed,
            },
            pagination: {
                page,
                pageSize,
                total: totalCount,
                totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
            },
        },
        message: "Jury applications fetched.",
    });
}

type ApplicationParams = { applicationId?: string; documentId?: string };

function positiveInteger(value: unknown) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// Keeps three characters, masks the next three, and repeats, e.g.
// "FE-164 Sector 3" -> "FE-*** Se***r 3". A standalone separator such as the
// "-" in "Kolkata - 700106" is kept as-is and does not advance the pattern.
export function maskText(value: unknown) {
    if (typeof value !== "string" || value.trim() === "") return null;

    const characters = Array.from(value);
    let position = 0;

    return characters
        .map((character, index) => {
            const previous = characters[index - 1];
            const next = characters[index + 1];
            const isStandaloneSeparator =
                /[^\p{L}\p{N}\s]/u.test(character) &&
                (previous === undefined || /\s/.test(previous)) &&
                (next === undefined || /\s/.test(next));

            if (isStandaloneSeparator) return character;

            const masked = Math.floor(position / 3) % 2 === 1;
            position += 1;
            return masked ? "*" : character;
        })
        .join("");
}

// Jury members review the proposal itself, so applicant and team contact
// details (email, mobile) are deliberately left out, and the address and
// institute fields are masked before they leave the API.
async function loadJuryApplication(
    pg: Pool,
    scopeValues: unknown[],
    applicationId: number,
) {
    const result = await pg.query<{ application: Record<string, unknown> }>(
        `SELECT jsonb_build_object(
            'id', pa.id,
            'applicationNumber', pa.application_number,
            'status', pa.status,
            'participationMode', pa.participation_mode,
            'submittedAt', pa.submitted_at,
            'createdAt', pa.created_at,
            'updatedAt', pa.updated_at,
            'profile', jsonb_build_object(
                'city', pa.city,
                'pinCode', pa.pin_code,
                'address', pa.address,
                'instituteName', pa.institute_name,
                'highestEducationalQualification', pa.highest_educational_qualification,
                'lastAttendedEducationalInstitute', pa.last_attended_educational_institute,
                'yearOfPassing', pa.year_of_passing
            ),
            'proposal', jsonb_build_object(
                'problemLocation', pa.problem_location,
                'proposedSolution', pa.proposed_solution,
                'technologyMethod', pa.technology_method,
                'implementationRoute', pa.implementation_route,
                'costFunding', pa.cost_funding,
                'beneficiaries', pa.beneficiaries,
                'projectTimeline', pa.project_timeline,
                'expectedImpact', pa.expected_impact,
                'scalability', pa.scalability,
                'prototypePilot', pa.prototype_pilot,
                'mentorAcknowledgeTo', pa.mentor_acknowledge_to,
                'intellectualPropertyPublication', pa.intellectual_property_publication,
                'videoUrl', pa.video_url
            ),
            'participant', jsonb_build_object(
                'fullName', p.full_name,
                'dateOfBirth', p.date_of_birth,
                'gender', p.gender
            ),
            'challenge', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
                'code', c.code,
                'title', jsonb_build_object('en', c.title_en, 'bn', c.title_bn, 'hi', c.title_hi)
            ) END,
            'state', CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
                'name', jsonb_build_object('en', s.name_en, 'bn', s.name_bn, 'hi', s.name_hi)
            ) END,
            'district', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
                'name', jsonb_build_object('en', d.name_en, 'bn', d.name_bn, 'hi', d.name_hi)
            ) END,
            'participantCategory', CASE WHEN pc.id IS NULL THEN NULL ELSE jsonb_build_object(
                'code', pc.code,
                'name', jsonb_build_object('en', pc.name_en, 'bn', pc.name_bn, 'hi', pc.name_hi)
            ) END,
            'instituteType', CASE WHEN it.id IS NULL THEN NULL ELSE jsonb_build_object(
                'name', jsonb_build_object('en', it.name_en, 'bn', it.name_bn, 'hi', it.name_hi)
            ) END,
            'challengeCategory', CASE WHEN cc.id IS NULL THEN NULL ELSE jsonb_build_object(
                'name', jsonb_build_object('en', cc.name_en, 'bn', cc.name_bn, 'hi', cc.name_hi)
            ) END,
            'teamMembers', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', atm.id,
                        'fullName', atm.full_name,
                        'isApplicant', atm.is_applicant
                    ) ORDER BY atm.sort_order, atm.id
                )
                FROM public.application_team_members atm
                WHERE atm.application_id = pa.id
            ), '[]'::jsonb),
            'documents', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', ad.id,
                        'documentType', ad.document_type,
                        'originalFileName', ad.original_file_name,
                        'mimeType', ad.mime_type,
                        'fileSizeBytes', ad.file_size_bytes
                    ) ORDER BY ad.sort_order, ad.id
                )
                FROM public.application_documents ad
                WHERE ad.application_id = pa.id
            ), '[]'::jsonb)
        ) AS application
        FROM public.participant_applications pa
        JOIN public.participants p ON p.id = pa.participant_id
        LEFT JOIN public.challenges c ON c.id = pa.challenge_id
        LEFT JOIN public.states s ON s.id = pa.state_id
        LEFT JOIN public.districts d ON d.id = pa.district_id
        LEFT JOIN public.participant_categories pc ON pc.id = pa.participant_category_id
        LEFT JOIN public.institute_types it ON it.id = pa.institute_type_id
        LEFT JOIN public.challenge_categories cc ON cc.id = pa.challenge_category_id
        WHERE ${JURY_SCOPE_SQL} AND pa.id = $4
        LIMIT 1`,
        [...scopeValues, applicationId],
    );

    const application = result.rows[0]?.application;
    if (!application) return null;

    const profile = (application.profile ?? {}) as Record<string, unknown>;
    const masked: Record<string, unknown> = {
        ...application,
        profile: {
            ...profile,
            address: maskText(profile.address),
            instituteName: maskText(profile.instituteName),
            lastAttendedEducationalInstitute: maskText(
                profile.lastAttendedEducationalInstitute,
            ),
        },
    };
    return masked;
}

async function resolveJuryApplication(
    request: FastifyRequest<{ Params: ApplicationParams }>,
    reply: FastifyReply,
) {
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

    const juryId = Number((request as unknown as AuthenticatedJuryRequest).jury.sub);
    const loaded = await loadJuryScope(pg, juryId);
    const access = loaded ? await getJuryAccess(pg, loaded) : null;

    if (access && !access.isOpen) {
        sendError(request, reply, { message: access.message, statusCode: 403 });
        return null;
    }

    const application = loaded
        ? await loadJuryApplication(pg, loaded.values, applicationId)
        : null;

    if (!loaded || !access || !application) {
        sendError(request, reply, {
            message: "Application not found.",
            statusCode: 404,
        });
        return null;
    }

    // An application another jury member has opened for evaluation is locked.
    if (await findLockedByOther(pg, applicationId, access.level, juryId)) {
        sendError(request, reply, { message: LOCKED_MESSAGE, statusCode: 409 });
        return null;
    }

    return { application, applicationId, isSubmissionClosed: access.level === "District" && access.isSubmissionClosed, juryId, pg, scopeValues: loaded.values };
}

async function getJuryApplication(
    request: FastifyRequest<{ Params: ApplicationParams }>,
    reply: FastifyReply,
) {
    const resolved = await resolveJuryApplication(request, reply);
    if (!resolved) return reply;

    // Remember that this jury member has opened the application (dashboard "Viewed").
    await resolved.pg.query(
        `INSERT INTO public.jury_application_views (jury_profile_id, application_id)
         VALUES ($1, $2)
         ON CONFLICT (jury_profile_id, application_id)
         DO UPDATE SET last_viewed_at = NOW()`,
        [resolved.juryId, resolved.applicationId],
    );

    const evaluation = await resolved.pg.query<{ id: string }>(
        `SELECT id::text FROM public.jury_evaluations
         WHERE application_id = $1 AND jury_profile_id = $2
         LIMIT 1`,
        [resolved.applicationId, resolved.juryId],
    );

    return sendSuccess(request, reply, {
        data: {
            application: resolved.application,
            // Once the district level final submission date has passed, the page offers "View evaluation" (if this jury member evaluated it) instead of Evaluate.
            // State level jury members are not affected for now.
            submission: { hasEvaluation: evaluation.rows.length > 0, isClosed: resolved.isSubmissionClosed },
        },
        message: "Jury application fetched.",
    });
}

async function downloadJuryApplicationPdf(
    request: FastifyRequest<{ Params: ApplicationParams }>,
    reply: FastifyReply,
) {
    const resolved = await resolveJuryApplication(request, reply);
    if (!resolved) return reply;

    try {
        const pdf = generateApplicationPdf(resolved.application);
        const applicationNumber =
            typeof resolved.application.applicationNumber === "string"
                ? resolved.application.applicationNumber
                : `application-${resolved.applicationId}`;

        return reply
            .header("Content-Type", "application/pdf")
            .header("Content-Length", String(pdf.length))
            .header(
                "Content-Disposition",
                contentDispositionFileName(`${applicationNumber}.pdf`),
            )
            .send(pdf);
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: "Application PDF could not be generated.",
            statusCode: 500,
        });
    }
}

async function downloadJuryApplicationDocument(
    request: FastifyRequest<{ Params: ApplicationParams }>,
    reply: FastifyReply,
) {
    const documentId = positiveInteger(request.params.documentId);

    if (!documentId) {
        return sendError(request, reply, {
            message: "A valid document id is required.",
            statusCode: 400,
        });
    }

    // Resolving the application first enforces the jury's jurisdiction and
    // category scope before any file is touched.
    const resolved = await resolveJuryApplication(request, reply);
    if (!resolved) return reply;

    const result = await resolved.pg.query<{
        file_size_bytes: string;
        mime_type: string;
        original_file_name: string;
        storage_key: string;
    }>(
        `SELECT file_size_bytes::text, mime_type, original_file_name, storage_key
         FROM public.application_documents
         WHERE id = $1 AND application_id = $2
         LIMIT 1`,
        [documentId, resolved.applicationId],
    );
    const document = result.rows[0];
    const filePath = document
        ? await resolveStoredFilePath(document.storage_key)
        : "";

    if (!document || !filePath) {
        return sendError(request, reply, {
            message: "Document not found.",
            statusCode: 404,
        });
    }

    return reply
        .header("Content-Type", document.mime_type)
        .header("Content-Length", document.file_size_bytes)
        .header(
            "Content-Disposition",
            contentDispositionFileName(document.original_file_name),
        )
        .send(createReadStream(filePath));
}

export const juryApplicationsController = {
    downloadJuryApplicationDocument,
    downloadJuryApplicationPdf,
    getJuryApplication,
    getJuryApplications,
};
