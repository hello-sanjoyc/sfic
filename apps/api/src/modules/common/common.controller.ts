import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { commonService, type DatabaseClient } from "./common.service.js";

type FastifyWithDatabase = FastifyInstance & {
  pg: DatabaseClient;
};

export type DistrictsQuery = {
  stateId?: string;
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

  reply.code(503).send({
    error: {
      message: "Database is not configured.",
    },
    status: "error",
  });

  return null;
}

function handleFetchError(
  request: FastifyRequest,
  reply: FastifyReply,
  message: string,
  error: unknown,
) {
  request.server.log.error(error);

  return reply.code(500).send({
    error: {
      message,
    },
    status: "error",
  });
}

async function getStates(request: FastifyRequest, reply: FastifyReply) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  try {
    return { data: await commonService.getStates(pg) };
  } catch (error) {
    return handleFetchError(request, reply, "Unable to fetch states.", error);
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
    return reply.code(400).send({
      error: {
        message: "Use stateId to filter districts.",
      },
      status: "error",
    });
  }

  const stateId = request.query.stateId?.trim();

  if (stateId && !/^\d+$/.test(stateId)) {
    return reply.code(400).send({
      error: {
        message: "stateId must be a numeric value.",
      },
      status: "error",
    });
  }

  try {
    return {
      data: await commonService.getDistricts(pg, {
        stateId: stateId ? Number(stateId) : undefined,
      }),
    };
  } catch (error) {
    return handleFetchError(
      request,
      reply,
      "Unable to fetch districts.",
      error,
    );
  }
}

async function getParticipantCategories(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  try {
    return { data: await commonService.getParticipantCategories(pg) };
  } catch (error) {
    return handleFetchError(
      request,
      reply,
      "Unable to fetch participant categories.",
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
    return await commonService.getInstituteTypesByParticipantCategory(
      pg,
      participantCategory,
    );
  } catch (error) {
    return handleFetchError(
      request,
      reply,
      "Unable to fetch institute types.",
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
    return {
      data: await commonService.getParticipantCategoryInstituteTypes(pg),
    };
  } catch (error) {
    return handleFetchError(
      request,
      reply,
      "Unable to fetch participant category institute type mappings.",
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
    return { data: await commonService.getChallengeCategories(pg) };
  } catch (error) {
    return handleFetchError(
      request,
      reply,
      "Unable to fetch challenge categories.",
      error,
    );
  }
}

async function getLookups(request: FastifyRequest, reply: FastifyReply) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  try {
    return { data: await commonService.getLookups(pg) };
  } catch (error) {
    return handleFetchError(
      request,
      reply,
      "Unable to fetch common lookups.",
      error,
    );
  }
}

export const commonController = {
  getChallengeCategories,
  getDistricts,
  getInstituteTypes,
  getLookups,
  getParticipantCategories,
  getParticipantCategoryInstituteTypes,
  getStates,
};
