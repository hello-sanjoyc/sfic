import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getApiContent } from "../../content/index.js";
import { sendError, sendSuccess } from "../common/api-response.js";
import {
  participantService,
  type DatabasePool,
} from "./participant.service.js";

type FastifyWithDatabase = FastifyInstance & {
  pg: DatabasePool;
};

type LoginBody = {
  email?: string;
  language?: string;
};

type VerifyLoginBody = LoginBody & {
  code?: string;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeLocalizedDigits(value: string) {
  return value.replace(/[۰-۹۰-۹٠-٩০-৯]/g, (digit) => {
    const codePoint = digit.codePointAt(0) ?? 0;

    if (codePoint >= 0x09e6 && codePoint <= 0x09ef) {
      return String(codePoint - 0x09e6);
    }

    if (codePoint >= 0x0966 && codePoint <= 0x096f) {
      return String(codePoint - 0x0966);
    }

    if (codePoint >= 0x06f0 && codePoint <= 0x06f9) {
      return String(codePoint - 0x06f0);
    }

    if (codePoint >= 0x0660 && codePoint <= 0x0669) {
      return String(codePoint - 0x0660);
    }

    return digit;
  });
}

function normalizeVerificationCode(value: unknown) {
  return isNonEmptyString(value)
    ? normalizeLocalizedDigits(value).replace(/\D/g, "").slice(0, 6)
    : "";
}

function getErrorStatusCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return undefined;
}

function validateEmailBody(body: LoginBody = {}) {
  const language = participantService.normalizeLanguage(body.language ?? "en");
  const email = isNonEmptyString(body.email) ? normalizeEmail(body.email) : "";
  const errors: string[] = [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(getApiContent(language).apiValidation.validEmailRequired);
  }

  return {
    errors,
    value: {
      email,
      language,
    },
  };
}

async function requestLoginCode(
  request: FastifyRequest<{ Body?: LoginBody }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const validated = validateEmailBody(request.body);
  if (validated.errors.length) {
    return sendError(request, reply, {
      data: { errors: validated.errors },
      messageKey: "validationError",
      statusCode: 400,
    });
  }

  try {
    const result = await participantService.requestLoginCode(pg, validated.value);

    return sendSuccess(request, reply, {
      data: result,
      messageKey: "participantLoginCodeSent",
      statusCode: 201,
    });
  } catch (error) {
    request.server.log.error(error);

    return sendError(request, reply, {
      message:
        error instanceof Error
          ? error.message
          : getApiContent(validated.value.language).api.participantLoginUnable,
      statusCode: getErrorStatusCode(error) ?? 500,
    });
  }
}

async function resendLoginCode(
  request: FastifyRequest<{ Body?: LoginBody }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const validated = validateEmailBody(request.body);
  if (validated.errors.length) {
    return sendError(request, reply, {
      data: { errors: validated.errors },
      messageKey: "validationError",
      statusCode: 400,
    });
  }

  try {
    const result = await participantService.resendLoginCode(pg, validated.value);

    return sendSuccess(request, reply, {
      data: result,
      messageKey: "participantLoginCodeSent",
    });
  } catch (error) {
    request.server.log.error(error);

    return sendError(request, reply, {
      message:
        error instanceof Error
          ? error.message
          : getApiContent(validated.value.language).api.participantLoginUnable,
      statusCode: getErrorStatusCode(error) ?? 500,
    });
  }
}

async function verifyLoginCode(
  request: FastifyRequest<{ Body?: VerifyLoginBody }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const validated = validateEmailBody(request.body);
  const code = normalizeVerificationCode(request.body?.code);

  if (!code) {
    validated.errors.push(
      getApiContent(validated.value.language).api.verificationCodeRequired,
    );
  }

  if (validated.errors.length) {
    return sendError(request, reply, {
      data: { errors: validated.errors },
      messageKey: "validationError",
      statusCode: 400,
    });
  }

  try {
    const result = await participantService.verifyLoginCode(pg, {
      ...validated.value,
      code,
    });

    return sendSuccess(request, reply, {
      data: result,
      messageKey: "participantLoginVerified",
    });
  } catch (error) {
    request.server.log.error(error);

    return sendError(request, reply, {
      message:
        error instanceof Error
          ? error.message
          : getApiContent(validated.value.language).api.participantLoginUnable,
      statusCode: getErrorStatusCode(error) ?? 400,
    });
  }
}

export const participantController = {
  requestLoginCode,
  resendLoginCode,
  verifyLoginCode,
};
