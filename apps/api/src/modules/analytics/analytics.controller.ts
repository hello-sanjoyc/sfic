import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import {
    analyticsService,
    type DatabaseClient,
} from "./analytics.service.js";

type FastifyWithDatabase = FastifyInstance & {
    pg: DatabaseClient;
};

export type AnalyticsVisitBody = {
    visitorId?: string;
    sessionId?: string;
    pagePath?: string;
    pageTitle?: string | null;
    browser?: string | null;
    browserVersion?: string | null;
    os?: string | null;
    osVersion?: string | null;
    deviceType?: string | null;
    screenWidth?: number | null;
    screenHeight?: number | null;
};

export type AnalyticsLeaveBody = {
    visitId?: number;
    durationSeconds?: number;
};

function requireDatabase(
    request: FastifyRequest,
    reply: FastifyReply,
): DatabaseClient | null {
    const app = request.server;

    if (app.hasDecorator("pg")) {
        return (app as FastifyWithDatabase).pg;
    }

    reply.code(503).send({
        success: false,
        message: "Database is not configured",
    });

    return null;
}

function cleanString(
    value: unknown,
    maxLength: number,
): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const cleaned = value.trim();

    return cleaned
        ? cleaned.slice(0, maxLength)
        : null;
}

async function createVisit(
    request: FastifyRequest<{ Body: AnalyticsVisitBody }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const body = request.body;

    const visitorId = cleanString(body.visitorId, 100);
    const sessionId = cleanString(body.sessionId, 100);
    const pagePath = cleanString(body.pagePath, 500);

    if (!visitorId || !sessionId || !pagePath) {
        return reply.code(400).send({
            success: false,
            message:
                "visitorId, sessionId and pagePath are required",
        });
    }

    // Safety: public-page analytics only.
    if (
        pagePath.startsWith("/admin") ||
        pagePath.startsWith("/dashboard") ||
        pagePath.startsWith("/api")
    ) {
        return reply.send({
            success: true,
            ignored: true,
        });
    }

    const screenWidth =
        Number.isFinite(Number(body.screenWidth))
            ? Math.max(
                  0,
                  Math.min(20000, Number(body.screenWidth)),
              )
            : null;

    const screenHeight =
        Number.isFinite(Number(body.screenHeight))
            ? Math.max(
                  0,
                  Math.min(20000, Number(body.screenHeight)),
              )
            : null;

    try {
        const data = await analyticsService.createVisit(
            pg,
            {
                visitorId,
                sessionId,
                pagePath,
                pageTitle: cleanString(body.pageTitle, 300),
                browser: cleanString(body.browser, 100),
                browserVersion: cleanString(
                    body.browserVersion,
                    50,
                ),
                os: cleanString(body.os, 100),
                osVersion: cleanString(body.osVersion, 50),
                deviceType: cleanString(body.deviceType, 30),
                screenWidth,
                screenHeight,
            },
        );

        return reply.send({
            success: true,
            ...data,
        });
    } catch (error) {
        request.server.log.error(
            { err: error },
            "Unable to create analytics page visit",
        );

        return reply.code(500).send({
            success: false,
            message: "Unable to create page visit",
        });
    }
}

async function endVisit(
    request: FastifyRequest<{ Body: AnalyticsLeaveBody }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const visitId = Number(request.body.visitId);
    const rawDuration = Number(
        request.body.durationSeconds,
    );

    if (!Number.isInteger(visitId) || visitId <= 0) {
        return reply.code(400).send({
            success: false,
            message: "Invalid visitId",
        });
    }

    const durationSeconds =
        Number.isFinite(rawDuration)
            ? Math.max(
                  0,
                  Math.min(
                      Math.round(rawDuration),
                      86400,
                  ),
              )
            : 0;

    try {
        await analyticsService.endVisit(pg, {
            visitId,
            durationSeconds,
        });

        return reply.send({
            success: true,
        });
    } catch (error) {
        request.server.log.error(
            { err: error },
            "Unable to update analytics page visit",
        );

        return reply.code(500).send({
            success: false,
            message: "Unable to update page visit",
        });
    }
}

export const analyticsController = {
    createVisit,
    endVisit,
};
