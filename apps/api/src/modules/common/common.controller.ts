import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess, type MessageKey } from "./api-response.js";
import { commonService, type DatabaseClient } from "./common.service.js";

type FastifyWithDatabase = FastifyInstance & {
    pg: DatabaseClient;
};

export type DistrictsQuery = {
    stateId?: string;
};

export type InstituteStatsQuery = {
    stateId?: string;
    districtId?: string;
    instituteName?: string;
};

export type InstituteNamesQuery = {
    stateId?: string;
    districtId?: string;
};

export type InstituteTypesQuery = {
    category?: string;
    participantCode?: string;
    participantCategory?: string;
    participantCategoryCode?: string;
};

function requireDatabase(request: FastifyRequest, reply: FastifyReply) {
    const app = request.server;
    if (app.hasDecorator("pg")) return (app as FastifyWithDatabase).pg;

    sendError(request, reply, {
        messageKey: "databaseNotConfigured",
        statusCode: 503,
    });

    return null;
}

function handleFetchError(
    request: FastifyRequest,
    reply: FastifyReply,
    messageKey: MessageKey,
    error: unknown,
) {
    request.server.log.error(error);

    return sendError(request, reply, {
        messageKey,
        statusCode: 500,
    });
}

async function getStates(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getStates(pg),
            messageKey: "statesFetched",
        });
    } catch (error) {
        return handleFetchError(request, reply, "unableFetchStates", error);
    }
}

async function getAppSettings(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getAppSettings(pg),
            messageKey: "appSettingsFetched",
        });
    } catch (error) {
        return handleFetchError(request, reply, "unableFetchAppSettings", error);
    }
}

async function getDistricts(
    request: FastifyRequest<{ Querystring: DistrictsQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const deprecatedQuery = request.query as DistrictsQuery & {
        state?: string;
        stateName?: string;
    };
    if (deprecatedQuery.state || deprecatedQuery.stateName) {
        return sendError(request, reply, {
            messageKey: "useStateIdForDistricts",
            statusCode: 400,
        });
    }

    const stateId = request.query.stateId?.trim();

    if (stateId && !/^\d+$/.test(stateId)) {
        return sendError(request, reply, {
            messageKey: "stateIdNumeric",
            statusCode: 400,
        });
    }

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getDistricts(pg, {
                stateId: stateId ? Number(stateId) : undefined,
            }),
            messageKey: "districtsFetched",
        });
    } catch (error) {
        return handleFetchError(request, reply, "unableFetchDistricts", error);
    }
}

async function getParticipantCategories(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getParticipantCategories(pg),
            messageKey: "participantCategoriesFetched",
        });
    } catch (error) {
        return handleFetchError(
            request,
            reply,
            "unableFetchParticipantCategories",
            error,
        );
    }
}

async function getInstituteTypes(
    request: FastifyRequest<{ Querystring: InstituteTypesQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const participantCategory = (
        request.query.participantCode ??
        request.query.participantCategoryCode ??
        request.query.participantCategory ??
        request.query.category ??
        ""
    ).trim();

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getInstituteTypesByParticipantCategory(
                pg,
                participantCategory,
            ),
            messageKey: "instituteTypesFetched",
        });
    } catch (error) {
        return handleFetchError(
            request,
            reply,
            "unableFetchInstituteTypes",
            error,
        );
    }
}

async function getParticipantCategoryInstituteTypes(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getParticipantCategoryInstituteTypes(pg),
            messageKey: "participantCategoryInstituteTypesFetched",
        });
    } catch (error) {
        return handleFetchError(
            request,
            reply,
            "unableFetchParticipantCategoryInstituteTypes",
            error,
        );
    }
}

async function getChallengeCategories(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getChallengeCategories(pg),
            messageKey: "challengeCategoriesFetched",
        });
    } catch (error) {
        return handleFetchError(
            request,
            reply,
            "unableFetchChallengeCategories",
            error,
        );
    }
}

async function getLookups(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getLookups(pg),
            messageKey: "lookupsFetched",
        });
    } catch (error) {
        return handleFetchError(
            request,
            reply,
            "unableFetchCommonLookups",
            error,
        );
    }
}

async function getInstituteNames(
    request: FastifyRequest<{ Querystring: InstituteNamesQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const stateId = request.query.stateId?.trim();
    const districtId = request.query.districtId?.trim();

    if (stateId && !/^\d+$/.test(stateId)) {
        return sendError(request, reply, {
            messageKey: "stateIdNumeric",
            statusCode: 400,
        });
    }

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getInstituteNames(pg, {
                stateId: stateId ? Number(stateId) : undefined,
                districtId: districtId ? Number(districtId) : undefined,
            }),
            messageKey: "instituteStatsFetched",
        });
    } catch (error) {
        return handleFetchError(request, reply, "unableFetchInstituteStats", error);
    }
}

async function getInstituteStats(
    request: FastifyRequest<{ Querystring: InstituteStatsQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const stateId = request.query.stateId?.trim();
    const districtId = request.query.districtId?.trim();
    const instituteName = request.query.instituteName?.trim();

    if (stateId && !/^\d+$/.test(stateId)) {
        return sendError(request, reply, {
            messageKey: "stateIdNumeric",
            statusCode: 400,
        });
    }

    try {
        return sendSuccess(request, reply, {
            data: await commonService.getInstituteStats(pg, {
                stateId: stateId ? Number(stateId) : undefined,
                districtId: districtId ? Number(districtId) : undefined,
                instituteName: instituteName || undefined,
            }),
            messageKey: "instituteStatsFetched",
        });
    } catch (error) {
        return handleFetchError(request, reply, "unableFetchInstituteStats", error);
    }
}

export const commonController = {
    getAppSettings,
    getChallengeCategories,
    getDistricts,
    getInstituteNames,
    getInstituteStats,
    getInstituteTypes,
    getLookups,
    getParticipantCategories,
    getParticipantCategoryInstituteTypes,
    getStates,
};
