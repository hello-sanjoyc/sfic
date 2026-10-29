import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthenticatedAdminRequest } from "../admin/admin-auth.js";
import type { DatabasePool } from "../admin/admin.service.js";
import { sendError, sendSuccess } from "../common/api-response.js";
import type { AuditLogQuery } from "./audit.model.js";
import { auditService } from "./audit.service.js";

type FastifyWithDatabase = FastifyInstance & { pg: DatabasePool };

function requireDatabase(request: FastifyRequest, reply: FastifyReply) {
    const app = request.server;
    if (app.hasDecorator("pg")) return (app as FastifyWithDatabase).pg;

    sendError(request, reply, {
        messageKey: "databaseNotConfigured",
        statusCode: 503,
    });

    return null;
}

function isSuperAdmin(request: FastifyRequest) {
    const role = (request as AuthenticatedAdminRequest).adminAccess?.role ?? "";
    return role.trim().toUpperCase().replace(/[\s-]+/g, "_") === "SUPERADMIN";
}

function parsePositiveInteger(value: string | undefined) {
    if (!value || !/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getAuditLog(
    request: FastifyRequest<{ Querystring: AuditLogQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    if (!isSuperAdmin(request)) {
        return sendError(request, reply, {
            message: "Only a SuperAdmin can view the audit trail.",
            statusCode: 403,
        });
    }

    const page = parsePositiveInteger(request.query.page) ?? 1;
    const pageSize = Math.min(
        200,
        Math.max(1, parsePositiveInteger(request.query.pageSize) ?? 25),
    );

    try {
        const result = await auditService.getAuditLog(pg, {
            actorId: parsePositiveInteger(request.query.actorId),
            actorType: request.query.actorType,
            applicantName: request.query.applicantName,
            applicantPhone: request.query.applicantPhone,
            applicationNumber: request.query.applicationNumber,
            category: request.query.category,
            dateFrom: request.query.dateFrom,
            dateTo: request.query.dateTo,
            page,
            pageSize,
            search: request.query.search,
        });

        return sendSuccess(request, reply, {
            data: result,
            message: "Audit log fetched successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: "Unable to fetch audit log.",
            statusCode: 500,
        });
    }
}

export const auditController = { getAuditLog };
