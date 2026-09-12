import cors from "@fastify/cors";
import postgres from "@fastify/postgres";
import Fastify from "fastify";
import type { PoolConfig } from "pg";
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

export function buildApp() {
  const app = Fastify({ logger: true });
  const postgresConfig = getPostgresConfig();

  app.register(cors, { origin: true });
  if (postgresConfig) app.register(postgres, postgresConfig);

  app.get("/health", async (_request, reply) => {
    if (!app.hasDecorator("pg")) {
      return reply.code(503).send({
        database: "not_configured",
        status: "error",
      });
    }

    try {
      await app.pg.query("select 1");
      return {
        database: "connected",
        status: "ok",
      };
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({
        database: "unavailable",
        status: "error",
      });
    }
  });

  app.get("/api/v1/challenges", async () => ({ data: [] }));
  app.register(commonRoutes, { prefix: "/api/v1/common" });
  app.register(registrationRoutes, { prefix: "/api/v1/registrations" });

  return app;
}
