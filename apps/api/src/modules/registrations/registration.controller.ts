import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  registrationService,
  type DatabasePool,
} from "./registration.service.js";

type FastifyWithDatabase = FastifyInstance & {
  pg: DatabasePool;
};

type CreateRegistrationBody = {
  email?: string;
  fullName?: string;
  language?: string;
  mobile?: string;
  participantCategory?: string;
};

type VerifyEmailQuery = {
  applicationId?: string;
  locale?: string;
  token?: string;
};

type RegistrationParams = {
  id: string;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validateCreateRegistrationBody(body: CreateRegistrationBody) {
  const errors: string[] = [];
  const email = isNonEmptyString(body.email) ? normalizeEmail(body.email) : "";
  const fullName = isNonEmptyString(body.fullName) ? body.fullName.trim() : "";
  const mobile = isNonEmptyString(body.mobile)
    ? body.mobile.replace(/\D/g, "")
    : "";
  const participantCategory = isNonEmptyString(body.participantCategory)
    ? body.participantCategory.trim()
    : "";
  const language = registrationService.normalizeLanguage(body.language ?? "en");

  if (!participantCategory) errors.push("participantCategory is required.");
  if (!fullName) errors.push("fullName is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("A valid email is required.");
  }
  if (!/^\d{10}$/.test(mobile)) {
    errors.push("A valid 10-digit mobile number is required.");
  }

  return {
    errors,
    value: {
      email,
      fullName,
      language,
      mobile,
      participantCategory,
    },
  };
}

function wantsJson(request: FastifyRequest) {
  return request.headers.accept?.includes("application/json") ?? false;
}

async function createRegistration(
  request: FastifyRequest<{ Body: CreateRegistrationBody }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const validated = validateCreateRegistrationBody(request.body ?? {});
  if (validated.errors.length) {
    return reply.code(400).send({
      error: {
        message: validated.errors.join(" "),
      },
      status: "error",
    });
  }

  try {
    const result = await registrationService.createRegistration(
      pg,
      validated.value,
    );

    return reply.code(201).send({
      data: result,
      status: "success",
    });
  } catch (error) {
    request.server.log.error(error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create registration.";

    return reply.code(500).send({
      error: {
        message,
      },
      status: "error",
    });
  }
}

async function verifyEmail(
  request: FastifyRequest<{ Querystring: VerifyEmailQuery }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const token = request.query.token?.trim();
  const language = registrationService.normalizeLanguage(
    request.query.locale ?? "en",
  );

  if (!token) {
    return reply.code(400).send({
      error: {
        message: "Verification token is required.",
      },
      status: "error",
    });
  }

  try {
    const result = await registrationService.verifyEmail(pg, token);

    if (wantsJson(request)) {
      return {
        data: result,
        status: "success",
      };
    }

    return reply.redirect(
      registrationService.buildRedirectUrl({
        application: result.application,
        language,
        verified: true,
      }),
    );
  } catch (error) {
    request.server.log.error(error);

    if (!wantsJson(request)) {
      const fallback = new URL(
        `${process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${language}/register`,
      );
      fallback.searchParams.set("emailVerified", "0");
      fallback.searchParams.set("verificationError", "invalid");

      return reply.redirect(fallback.toString());
    }

    return reply.code(400).send({
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify email address.",
      },
      status: "error",
    });
  }
}

async function getRegistration(
  request: FastifyRequest<{ Params: RegistrationParams }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const id = request.params.id.trim();
  if (!/^\d+$/.test(id)) {
    return reply.code(400).send({
      error: {
        message: "Registration id must be numeric.",
      },
      status: "error",
    });
  }

  try {
    const result = await registrationService.getRegistration(pg, Number(id));
    if (!result) {
      return reply.code(404).send({
        error: {
          message: "Registration was not found.",
        },
        status: "error",
      });
    }

    return {
      data: result,
      status: "success",
    };
  } catch (error) {
    request.server.log.error(error);

    return reply.code(500).send({
      error: {
        message: "Unable to fetch registration.",
      },
      status: "error",
    });
  }
}

export const registrationController = {
  createRegistration,
  getRegistration,
  verifyEmail,
};
