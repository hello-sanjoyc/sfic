import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import postgres from "@fastify/postgres";
import Fastify from "fastify";
import type { PoolConfig } from "pg";
import { sendError, sendSuccess } from "./modules/common/api-response.js";
import { commonRoutes } from "./modules/common/index.js";
import { registrationRoutes } from "./modules/registrations/index.js";

function envFlag(name: string, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isLocalDatabaseHost(host?: string) {
  return !host || ["localhost", "127.0.0.1", "::1"].includes(host);
}

function getCorsOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS;
  if (configuredOrigins) {
    return configuredOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ];
}

function getPostgresConfig(): PoolConfig | null {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: envFlag("DB_SSL", false)
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
    };
  }

  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !database || !user || !password) return null;

  return {
    database,
    host,
    password,
    port: Number(process.env.DB_PORT ?? 5432),
    ssl: envFlag("DB_SSL", !isLocalDatabaseHost(host))
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
    user,
  };
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

  return 500;
}

export function buildApp() {
  const app = Fastify({ logger: true });
  const postgresConfig = getPostgresConfig();
  const corsOrigins = getCorsOrigins();

  app.register(cors, {
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
    methods: ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"],
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
  });
  app.register(multipart, {
    limits: {
      fileSize:
        Number(process.env.SUPPORTING_DOCUMENT_MAX_SIZE_MB ?? 2) *
        1024 *
        1024,
      files: Number(process.env.SUPPORTING_DOCUMENT_MAX_FILES ?? 3),
    },
  });
  if (postgresConfig) app.register(postgres, postgresConfig);

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    const statusCode = getErrorStatusCode(error);
    return sendError(request, reply, {
      messageKey: statusCode >= 500 ? "internalServerError" : "badRequest",
      statusCode,
    });
  });

  app.get("/health", async (request, reply) => {
    if (!app.hasDecorator("pg")) {
      return sendError(request, reply, {
        data: {
          database: "not_configured",
        },
        messageKey: "databaseNotConfigured",
        statusCode: 503,
      });
    }

    try {
      await app.pg.query("select 1");
      return sendSuccess(request, reply, {
        data: {
          database: "connected",
        },
        messageKey: "healthOk",
      });
    } catch (error) {
      app.log.error(error);
      return sendError(request, reply, {
        data: {
          database: "unavailable",
        },
        messageKey: "healthUnavailable",
        statusCode: 503,
      });
    }
  });

  app.get("/api/v1/challenges", async (request, reply) =>
    sendSuccess(request, reply, {
      data: [],
      messageKey: "challengesFetched",
    }),
  );
  app.register(commonRoutes, { prefix: "/api/v1/common" });
  app.register(registrationRoutes, { prefix: "/api/v1/registrations" });

  app.setNotFoundHandler((request, reply) =>
    sendError(request, reply, {
      messageKey: "notFound",
      statusCode: 404,
    }),
  );

  return app;
}
