import type { FastifyReply, FastifyRequest } from "fastify";
import { getApiContent } from "../../content/index.js";

export type MessageKey = keyof ReturnType<typeof getApiContent>["api"];

type ResponseOptions<T> = {
  data?: T;
  message?: string;
  messageKey?: MessageKey;
  statusCode?: number;
};

function normalizeLanguage(language?: string) {
  if (language === "bn") return "bn";
  if (language === "hi" || language === "hn") return "hn";
  return "en";
}

export function getRequestLanguage(request: FastifyRequest) {
  const body = request.body as { language?: string } | undefined;
  const query = request.query as
    | { lang?: string; language?: string; locale?: string }
    | undefined;

  return normalizeLanguage(
    body?.language ?? query?.language ?? query?.locale ?? query?.lang,
  );
}

export function getApiMessage(request: FastifyRequest, key: MessageKey) {
  return getApiContent(getRequestLanguage(request)).api[key];
}

export function sendSuccess<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  options: ResponseOptions<T> = {},
) {
  const statusCode = options.statusCode ?? 200;
  const message =
    options.message ??
    getApiMessage(request, options.messageKey ?? "registrationFetched");

  return reply.code(statusCode).send({
    statusCode,
    error: false,
    message,
    data: options.data ?? {},
  });
}

export function sendError<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  options: ResponseOptions<T> = {},
) {
  const statusCode = options.statusCode ?? 500;
  const message =
    options.message ??
    getApiMessage(request, options.messageKey ?? "internalServerError");

  return reply.code(statusCode).send({
    statusCode,
    error: true,
    message,
    data: options.data ?? {},
  });
}
