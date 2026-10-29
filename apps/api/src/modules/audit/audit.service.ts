import type { FastifyRequest } from "fastify";
import type { AuthenticatedAdminRequest } from "../admin/admin-auth.js";
import type { AuthenticatedJuryRequest } from "../jury/jury-auth.js";
import type { AuthenticatedParticipantRequest } from "../participants/participant-auth.js";
import type { DatabasePool } from "../admin/admin.service.js";
import type {
    AuditActorType,
    AuditLogRow,
    RecordAuditEntryInput,
    RecordRichAuditEntryInput,
} from "./audit.model.js";

// The audit service only ever runs a single parameterized INSERT/SELECT, so
// every call site can pass whatever minimal pg-like client it already has in
// scope (several modules declare their own narrower `Pool` type) rather than
// needing the full `DatabasePool` (which also requires `.connect()`).
export type AuditPool = {
    query<T = Record<string, unknown>>(
        text: string,
        values?: readonly unknown[],
    ): Promise<{ rows: T[] }>;
};

export type AuditLogQueryOptions = {
    actorId?: number | null;
    actorType?: string;
    applicantName?: string;
    applicantPhone?: string;
    applicationNumber?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
    search?: string;
};

export type AuditLogEntry = {
    action: string;
    actorEmail: string | null;
    actorId: number | null;
    actorName: string | null;
    actorRole: string | null;
    actorType: AuditActorType;
    applicantFullName: string | null;
    applicantPhone: string | null;
    applicationId: number | null;
    applicationNumber: string | null;
    category: string;
    createdAt: string;
    details: Record<string, unknown> | null;
    httpMethod: string;
    id: number;
    routePath: string;
    statusCode: number;
};

function toAuditLogEntry(row: AuditLogRow): AuditLogEntry {
    return {
        action: row.action,
        actorEmail: row.actor_email,
        actorId: row.actor_id === null ? null : Number(row.actor_id),
        actorName: row.actor_name,
        actorRole: row.actor_role,
        actorType: row.actor_type,
        applicantFullName: row.applicant_full_name,
        applicantPhone: row.applicant_phone,
        applicationId: row.application_id === null ? null : Number(row.application_id),
        applicationNumber: row.application_number,
        category: row.category,
        createdAt: row.created_at.toISOString(),
        details: row.details,
        httpMethod: row.http_method,
        id: Number(row.id),
        routePath: row.route_path,
        statusCode: row.status_code,
    };
}

const VALID_ACTOR_TYPES = new Set(["admin", "jury", "participant", "system"]);
const VALID_CATEGORIES = new Set([
    "application",
    "jury_evaluation",
    "jury_profile",
    "user",
    "settings",
    "email_notification",
    "auth",
    "other",
]);

async function getAuditLog(pg: DatabasePool, options: AuditLogQueryOptions = {}) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize =
        options.pageSize && options.pageSize > 0
            ? Math.min(options.pageSize, 200)
            : 25;
    const offset = (page - 1) * pageSize;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options.search?.trim()) {
        params.push(`%${options.search.trim().toLowerCase()}%`);
        conditions.push(
            `LOWER(CONCAT_WS(' ', actor_name, actor_email, application_number, applicant_full_name, applicant_phone)) LIKE $${params.length}`,
        );
    }

    if (options.actorId) {
        params.push(options.actorId);
        conditions.push(`actor_id = $${params.length}`);
    }

    if (options.actorType && VALID_ACTOR_TYPES.has(options.actorType)) {
        params.push(options.actorType);
        conditions.push(`actor_type = $${params.length}`);
    }

    if (options.category && VALID_CATEGORIES.has(options.category)) {
        params.push(options.category);
        conditions.push(`category = $${params.length}`);
    }

    if (options.applicationNumber?.trim()) {
        params.push(`%${options.applicationNumber.trim()}%`);
        conditions.push(`application_number ILIKE $${params.length}`);
    }

    if (options.applicantName?.trim()) {
        params.push(`%${options.applicantName.trim()}%`);
        conditions.push(`applicant_full_name ILIKE $${params.length}`);
    }

    if (options.applicantPhone?.trim()) {
        params.push(`%${options.applicantPhone.trim()}%`);
        conditions.push(`applicant_phone ILIKE $${params.length}`);
    }

    if (options.dateFrom?.trim()) {
        params.push(options.dateFrom.trim());
        conditions.push(`created_at >= $${params.length}`);
    }

    if (options.dateTo?.trim()) {
        params.push(options.dateTo.trim());
        conditions.push(`created_at <= $${params.length}`);
    }

    params.push(pageSize, offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pg.query<AuditLogRow>(
        `
        SELECT *, COUNT(*) OVER()::text AS total_count
        FROM public.audit_log
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
        `,
        params,
    );
    const total = Number(result.rows[0]?.total_count ?? 0);

    return {
        entries: result.rows.map(toAuditLogEntry),
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
}

type AuditClaimedRequest = FastifyRequest & { auditClaimed?: boolean };

const AUDITABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Route segments that are never a create/update/delete of a business record,
// even though they use a mutating HTTP method: authentication (login, OTP
// issue/verify/resend, password reset) and one-off notification/link sends.
// The generic fallback hook only logs true CRUD, so these are excluded here;
// any of them worth auditing gets its own explicit recordRichAuditEntry call
// at its own call site instead.
const NON_CRUD_PATH_PATTERNS = [
    /\/login$/,
    /\/login-code$/,
    /\/resend-login-code$/,
    /\/verify-login$/,
    /\/verify-email$/,
    /\/forgot-password$/,
    /\/reset-password$/,
    /\/resend-invitation$/,
    /\/resend-verification$/,
    /\/verification-link$/,
    // Anonymous page-visit tracking (visitor entering/leaving a public page),
    // not a create/update/delete of a business record.
    /\/analytics\/visit$/,
    /\/analytics\/leave$/,
];

function requestPathname(request: FastifyRequest) {
    try {
        return new URL(request.url, "http://localhost").pathname;
    } catch {
        return request.url;
    }
}

function isNonCrudPath(pathname: string) {
    return NON_CRUD_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

// Audit logging must never break the request it is observing: a missed
// audit row is bad, a 500 on a legitimate action because the audit insert
// failed is worse.
async function recordAuditEntry(pg: AuditPool, input: RecordAuditEntryInput) {
    try {
        const actor = await resolveAdminActorDetails(pg, input);
        await pg.query(
            `INSERT INTO public.audit_log (
                actor_type, actor_id, actor_name, actor_email, actor_role,
                category, action, http_method, route_path, status_code,
                application_id, application_number, applicant_full_name, applicant_phone,
                details
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
            [
                actor.actorType,
                actor.actorId ?? null,
                actor.actorName ?? null,
                actor.actorEmail ?? null,
                actor.actorRole ?? null,
                input.category,
                input.action,
                input.httpMethod,
                input.routePath,
                input.statusCode,
                input.applicationId ?? null,
                input.applicationNumber ?? null,
                input.applicantFullName ?? null,
                input.applicantPhone ?? null,
                input.details ? JSON.stringify(input.details) : null,
            ],
        );
    } catch (error) {
        console.error("[audit] failed to record audit entry", error);
    }
}

// Admin actors are identified only by `userId` at every call site (the
// admin-auth session query never fetches fullname/role, since that is a
// hot-path lookup run on every request). Rather than touching that query or
// every one of the ~15 call sites that log an admin action, resolve the
// display name/role once here, lazily, only when it's missing.
async function resolveAdminActorDetails(
    pg: AuditPool,
    input: RecordAuditEntryInput,
) {
    if (input.actorType !== "admin" || !input.actorId || input.actorName) {
        return input;
    }

    try {
        const result = await pg.query<{ fullname: string; role: string }>(
            `SELECT fullname, role FROM public.users WHERE id = $1 LIMIT 1`,
            [input.actorId],
        );
        const row = result.rows[0];
        if (!row) return input;

        return {
            ...input,
            actorName: row.fullname,
            actorRole: input.actorRole ?? row.role,
        };
    } catch {
        return input;
    }
}

function claimAudit(request: FastifyRequest) {
    (request as AuditClaimedRequest).auditClaimed = true;
}

function isAuditClaimed(request: FastifyRequest) {
    return Boolean((request as AuditClaimedRequest).auditClaimed);
}

// The one function instrumented handlers call: claims the request (so the
// generic onResponse hook skips its own fallback entry) and records a
// richer, human-readable entry in a single step.
async function recordRichAuditEntry(
    request: FastifyRequest,
    pg: AuditPool,
    input: RecordRichAuditEntryInput,
) {
    claimAudit(request);

    const actorRole =
        input.actorType === "admin" && !input.actorRole
            ? (request as AuthenticatedAdminRequest).adminAccess?.role ?? null
            : input.actorRole;

    await recordAuditEntry(pg, {
        ...input,
        actorRole,
        httpMethod: request.method,
        routePath: requestPathname(request),
    });
}

function shouldAuditGenerically(request: FastifyRequest) {
    if (!AUDITABLE_METHODS.has(request.method.toUpperCase())) return false;

    return !isNonCrudPath(requestPathname(request));
}

// The generic fallback hook has no business-specific verb to use, so it
// falls back to the CRUD meaning of the HTTP method itself: POST creates,
// PUT/PATCH update, DELETE deletes.
function genericCrudAction(method: string) {
    const upper = method.toUpperCase();
    if (upper === "POST") return "created";
    if (upper === "DELETE") return "deleted";
    return "updated";
}

function resolveGenericActor(request: FastifyRequest): {
    actorEmail: string | null;
    actorId: number | null;
    actorName: string | null;
    actorRole?: string | null;
    actorType: AuditActorType;
} {
    const admin = (request as AuthenticatedAdminRequest).adminAccess;
    if (admin) {
        return {
            actorEmail: null,
            actorId: admin.userId,
            actorName: null,
            actorRole: admin.role,
            actorType: "admin",
        };
    }

    const jury = (request as AuthenticatedJuryRequest).jury;
    if (jury) {
        return {
            actorEmail: jury.email,
            actorId: Number(jury.sub),
            actorName: jury.name,
            actorType: "jury",
        };
    }

    const participant = (request as AuthenticatedParticipantRequest).participant;
    if (participant) {
        return {
            actorEmail: participant.email,
            actorId: Number(participant.sub),
            actorName: participant.name,
            actorType: "participant",
        };
    }

    return { actorEmail: null, actorId: null, actorName: null, actorType: "system" };
}

// Fields that must never be written into an audit row even if present in a
// before/after object (defensive: none of the instrumented endpoints today
// accept these, but a future field of this name must not leak into a
// permanent, unredacted record).
const NEVER_LOG_FIELDS = new Set([
    "password",
    "passwordHash",
    "password_hash",
    "token",
    "otp",
    "code",
]);

// Builds a { field: { from, to } } map of only the fields that actually
// changed between a "before" snapshot and an "after" snapshot, restricted to
// the given field keys (normally the keys the caller actually submitted, so
// an edit that touches 2 of 40 possible fields produces a 2-entry diff, not
// a 40-entry one). Values are compared with a stable JSON serialization so
// object/array fields diff correctly too, not just primitives.
function buildFieldChanges(
    before: Record<string, unknown> | null | undefined,
    after: Record<string, unknown> | null | undefined,
    fields: readonly string[],
) {
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const field of fields) {
        if (NEVER_LOG_FIELDS.has(field)) continue;

        const fromValue = before?.[field] ?? null;
        const toValue = after?.[field] ?? null;
        if (JSON.stringify(fromValue) === JSON.stringify(toValue)) continue;

        changes[field] = { from: fromValue, to: toValue };
    }

    return changes;
}

export const auditService = {
    buildFieldChanges,
    claimAudit,
    genericCrudAction,
    getAuditLog,
    isAuditClaimed,
    recordAuditEntry,
    recordRichAuditEntry,
    resolveGenericActor,
    shouldAuditGenerically,
};
