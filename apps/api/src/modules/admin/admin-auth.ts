import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../common/api-response.js";
import type { AdminAccessContext, AdminAccessModule } from "./admin.model.js";
import type { DatabasePool } from "./admin.service.js";

type FastifyWithDatabase = FastifyRequest["server"] & {
    pg: DatabasePool;
};

type AdminSessionRow = {
    analytics_access: string | null;
    applications_access: string | null;
    district_id: string | null;
    role: string;
    scope: string | null;
    settings_access: string | null;
    state_id: string | null;
    user_id: string;
    users_access: string | null;
};

export type AuthenticatedAdminRequest = FastifyRequest & {
    adminAccess: AdminAccessContext;
};

function getBearerToken(request: FastifyRequest) {
    const authorization = request.headers.authorization;
    if (!authorization) return "";

    const [scheme, token] = authorization.split(/\s+/, 2);
    return scheme?.toLowerCase() === "bearer" ? (token?.trim() ?? "") : "";
}

function routeModule(request: FastifyRequest): AdminAccessModule | null {
    const path = new URL(request.url, "http://localhost").pathname;

    if (path.includes("/dashboard") || path.includes("/analytics")) {
        return "analytics";
    }

    if (path.includes("/users")) return "users";
    if (path.includes("/settings/user-roles")) return "users";
    if (path.includes("/applications")) return "applications";
    if (path.includes("/settings")) return "settings";

    return null;
}

function isUserRolesRoute(request: FastifyRequest) {
    return new URL(request.url, "http://localhost").pathname.includes(
        "/settings/user-roles",
    );
}

function isPublicAdminRoute(request: FastifyRequest) {
    const path = new URL(request.url, "http://localhost").pathname;

    return (
        path.endsWith("/login") ||
        path.endsWith("/resend-login-code") ||
        path.endsWith("/verify-login")
    );
}

function accessValueForModule(row: AdminSessionRow, module: AdminAccessModule) {
    if (module === "analytics") return row.analytics_access;
    if (module === "applications") return row.applications_access;
    if (module === "settings") return row.settings_access;
    return row.users_access;
}

function normalizedAccessLevel(value: string | null) {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "no access") return "none";
    if (normalized === "view only") return "view";
    if (normalized === "full access") return "full";
    return value && value.trim() ? "full" : "none";
}

function hasModuleAccess(
    row: AdminSessionRow,
    module: AdminAccessModule | null,
    request: FastifyRequest,
) {
    if (row.role === "SUPERADMIN") return true;
    if (!module) return false;

    if (isUserRolesRoute(request) && request.method.toUpperCase() === "GET") {
        return (
            normalizedAccessLevel(row.users_access) !== "none" ||
            normalizedAccessLevel(row.settings_access) !== "none"
        );
    }

    return normalizedAccessLevel(accessValueForModule(row, module)) !== "none";
}

function hasWriteAccess(row: AdminSessionRow, module: AdminAccessModule | null) {
    if (row.role === "SUPERADMIN") return true;
    if (!module) return false;

    return normalizedAccessLevel(accessValueForModule(row, module)) === "full";
}

function isWriteRequest(request: FastifyRequest) {
    return !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
}

function hasRequiredLocation(row: AdminSessionRow) {
    const scope = row.scope?.trim().toLowerCase();

    if (
        scope === "state" ||
        scope === "assigned state" ||
        row.role === "ADMIN_STATE" ||
        row.role === "JURY_STATE"
    ) {
        return Boolean(row.state_id);
    }

    if (
        scope === "district" ||
        scope === "assigned district" ||
        row.role === "ADMIN_DISTRICT" ||
        row.role === "JURY_DISTRICT"
    ) {
        return Boolean(row.state_id && row.district_id);
    }

    return true;
}

export async function authenticateAdmin(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    if (isPublicAdminRoute(request)) return;

    const token = getBearerToken(request);
    if (!token) {
        return sendError(request, reply, {
            message: "A valid admin session is required.",
            statusCode: 401,
        });
    }

    const app = request.server as FastifyWithDatabase;
    if (!app.hasDecorator("pg")) {
        return sendError(request, reply, {
            messageKey: "databaseNotConfigured",
            statusCode: 503,
        });
    }

    const result = await app.pg.query<AdminSessionRow>(
        `
        SELECT
            u.id::text AS user_id,
            u.role,
            u.state_id::text,
            u.district_id::text,
            rr.scope,
            rr.applications_access,
            rr.users_access,
            rr.settings_access,
            rr.analytics_access
        FROM admin_sessions ads
        JOIN users u
            ON u.id = ads.user_id
        LEFT JOIN rbac_rules rr
            ON rr.role = u.role
           AND rr.is_active = TRUE
        WHERE ads.token = $1
          AND ads.expires_at > NOW()
          AND u.is_active = TRUE
        LIMIT 1
        `,
        [token],
    );
    const row = result.rows[0];

    if (!row) {
        return sendError(request, reply, {
            message: "A valid admin session is required.",
            statusCode: 401,
        });
    }

    const module = routeModule(request);

    if (
        !hasModuleAccess(row, module, request) ||
        (isWriteRequest(request) && !hasWriteAccess(row, module)) ||
        !hasRequiredLocation(row)
    ) {
        return sendError(request, reply, {
            message: "Access is not available for this user role.",
            statusCode: 403,
        });
    }

    (request as AuthenticatedAdminRequest).adminAccess = {
        analyticsAccess: row.analytics_access ?? "No Access",
        applicationsAccess: row.applications_access ?? "No Access",
        districtId: row.district_id === null ? null : Number(row.district_id),
        role: row.role,
        scope: row.scope ?? "Application",
        settingsAccess: row.settings_access ?? "No Access",
        stateId: row.state_id === null ? null : Number(row.state_id),
        userId: Number(row.user_id),
        usersAccess: row.users_access ?? "No Access",
    };
}
