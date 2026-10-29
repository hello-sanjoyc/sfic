import { createHash, randomBytes, randomInt } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { renderEmailTemplate } from "../email/email-template.js";
import { emailService } from "../email/email.service.js";
import { sendError, sendSuccess } from "../common/api-response.js";
import { contentDispositionFileName, resolveStoredFilePath } from "../admin/admin.controller.js";
import type { AuthenticatedAdminRequest } from "../admin/admin-auth.js";
import { createJuryJwt, type AuthenticatedJuryRequest } from "./jury-auth.js";
import { auditService } from "../audit/audit.service.js";

type Pool = { query: <T = Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[] }> };
type WithDatabase = FastifyInstance & { pg: Pool };
type JuryRow = { id: string; full_name: string; email: string; mobile: string; scope: "State" | "District"; state_id: string; district_id: string | null; state_name: string; district_name: string | null; invitation_accepted: boolean; is_active: boolean; profile_completed_at: Date | null };
type JuryActivity = { evaluated: number; onEvaluation: number; recommended: number; rejected: number; reviewed: number; total: number; viewed: number };
type CategoryActivity = { categoryId: number; evaluatedCount: number; name: string; onEvaluationCount: number; recommendedCount: number; rejectedCount: number; reviewedCount: number; totalCount: number; viewedCount: number };
const noActivity: JuryActivity = { evaluated: 0, onEvaluation: 0, recommended: 0, rejected: 0, reviewed: 0, total: 0, viewed: 0 };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function db(request: FastifyRequest, reply: FastifyReply) {
    if (request.server.hasDecorator("pg")) return (request.server as WithDatabase).pg;
    sendError(request, reply, { messageKey: "databaseNotConfigured", statusCode: 503 }); return null;
}
function number(value: unknown) { const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null; }
function language(value: unknown) { return value === "bn" || value === "hi" ? value : "en"; }
function appUrl() { return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""); }
function scopeAllowed(access: AuthenticatedAdminRequest["adminAccess"], stateId: number, districtId: number | null) {
    const role = access.role.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (role === "SUPERADMIN" || role === "ADMIN_REGION") return true;
    if (role === "ADMIN_STATE") return access.stateId === stateId;
    return role === "ADMIN_DISTRICT" && access.stateId === stateId && access.districtId === districtId;
}
async function juryById(pool: Pool, id: number) {
    const result = await pool.query<JuryRow>(`SELECT jp.id::text, jp.full_name, jp.email, jp.mobile, jp.scope, jp.state_id::text, jp.district_id::text, jp.invitation_accepted, jp.is_active, jp.profile_completed_at, s.name_en AS state_name, d.name_en AS district_name FROM jury_profiles jp JOIN states s ON s.id=jp.state_id LEFT JOIN districts d ON d.id=jp.district_id WHERE jp.id=$1`, [id]);
    return result.rows[0] ?? null;
}
function juryStatus(row: { invitation_accepted: boolean; is_active: boolean }) { return !row.invitation_accepted ? "Invitation pending" : row.is_active ? "Active" : "Inactive"; }

// Maps the admin-update body's camelCase field names to the snake_case
// columns `fullProfileById` returns, so a before/after diff reads against
// exactly the fields the caller actually submitted (plus categories and
// isActive, which are handled outside the column-set loop below).
const juryProfileFieldMap: Record<string, string> = {
    fullName: "full_name",
    email: "email",
    mobile: "mobile",
    pinCode: "pin_code",
    professionalExperienceYears: "professional_experience_years",
    address: "address",
    city: "city",
    organisationName: "organisation_name",
    designation: "designation",
};

function juryProfileChanges(
    before: { is_active: boolean } & Record<string, unknown> | null,
    after: { is_active: boolean } & Record<string, unknown> | null,
    body: Record<string, unknown>,
    categoryIds: number[] | null,
) {
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const [bodyKey, column] of Object.entries(juryProfileFieldMap)) {
        if (body[bodyKey] === undefined) continue;

        const fromValue = before?.[column] ?? null;
        const toValue = after?.[column] ?? null;
        if (fromValue === toValue) continue;

        changes[bodyKey] = { from: fromValue, to: toValue };
    }

    if (body.isActive !== undefined && before && after && before.is_active !== after.is_active) {
        changes.isActive = { from: before.is_active, to: after.is_active };
    }

    if (categoryIds) {
        const beforeCategories = (before as { categories?: string[] | null } | null)?.categories ?? [];
        const afterCategories = (after as { categories?: string[] | null } | null)?.categories ?? [];
        changes.categories = { from: beforeCategories, to: afterCategories };
    }

    return changes;
}
async function appSettingInt(pool: Pool, settingKey: "JURY_MAX_CV_SIZE" | "JURY_MAX_AVATAR_SIZE" | "JURY_MAX_CHALLENGE_CATEGORY", fallback: number) {
    const result = await pool.query<{ setting_value: string }>(`SELECT setting_value FROM app_settings WHERE setting_key=$1 AND is_active=TRUE LIMIT 1`, [settingKey]);
    const value = Number(result.rows[0]?.setting_value);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}
async function maxChallengeCategories(pool: Pool) { return appSettingInt(pool, "JURY_MAX_CHALLENGE_CATEGORY", 2); }
async function sendInvitation(input: { email: string; name: string; token: string; language: string }) {
    const url = `${appUrl()}/${input.language}/jury/verify?token=${encodeURIComponent(input.token)}`;
    return emailService.sendEmail({ to: input.email, subject: "Complete your SFIC jury profile", text: `Hello ${input.name},\n\nPlease verify your email and complete your jury profile: ${url}`, html: renderEmailTemplate({ title: "Complete your SFIC jury profile", preheader: "Verify your jury invitation", bodyHtml: `<p>Hello ${input.name},</p><p>You have been invited to join the SFIC jury panel. Verify your email to activate your profile.</p>`, cta: { label: "Verify and complete profile", url } }) });
}

// Best-effort: a mail failure must never block the jury from completing verification.
async function notifyInvitationAccepted(pool: Pool, request: FastifyRequest, jury: JuryRow) {
    try {
        await emailService.sendJuryInvitationAcceptedEmail({ juryEmail: jury.email, juryName: jury.full_name, loginUrl: `${appUrl()}/en/jury/login` });
        const inviter = await pool.query<{ email: string; fullname: string }>(`SELECT u.email, u.fullname FROM jury_profiles jp JOIN users u ON u.id=jp.invited_by_user_id WHERE jp.id=$1`, [jury.id]);
        if (inviter.rows[0]) await emailService.sendJuryInvitationAcceptedAdminEmail({ adminEmail: inviter.rows[0].email, adminName: inviter.rows[0].fullname, juryEmail: jury.email, juryName: jury.full_name });
    } catch (error) { request.server.log.error(error); }
}

async function createProfile(request: FastifyRequest<{ Body: { categoryIds?: unknown[]; districtId?: unknown; email?: unknown; fullName?: unknown; language?: unknown; mobile?: unknown; scope?: unknown; stateId?: unknown } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply;
    const admin = (request as AuthenticatedAdminRequest).adminAccess;
    const body = request.body ?? {}; const fullName = String(body.fullName ?? "").trim(); const email = String(body.email ?? "").trim().toLowerCase(); const mobile = String(body.mobile ?? "").replace(/\D/g, ""); const stateId = number(body.stateId); const districtId = body.districtId === null || body.districtId === undefined || body.districtId === "" ? null : number(body.districtId); const scope = body.scope === "District" ? "District" : body.scope === "State" ? "State" : ""; const categoryIds = Array.isArray(body.categoryIds) ? [...new Set(body.categoryIds.map(number).filter((id): id is number => Boolean(id)))] : [];
    const maxCategories = await maxChallengeCategories(pool);
    if (!fullName || !emailPattern.test(email) || mobile.length !== 10 || !stateId || !scope || categoryIds.length < 1 || categoryIds.length > maxCategories || (scope === "District" && !districtId) || (scope === "State" && districtId)) return sendError(request, reply, { message: `Provide a valid name, email, mobile, scope, location and one to ${maxCategories} categories.`, statusCode: 400 });
    if (!scopeAllowed(admin, stateId, districtId)) return sendError(request, reply, { message: "You cannot create a jury outside your assigned jurisdiction.", statusCode: 403 });
    const location = await pool.query<{ valid: boolean }>(`SELECT EXISTS(SELECT 1 FROM states s LEFT JOIN districts d ON d.id=$2 WHERE s.id=$1 AND ($2::bigint IS NULL OR d.state_id=s.id)) AS valid`, [stateId, districtId]);
    if (!location.rows[0]?.valid) return sendError(request, reply, { message: "The selected district does not belong to the selected state.", statusCode: 400 });
    try {
      const result = await pool.query<{ id: string }>(`INSERT INTO jury_profiles (full_name,email,mobile,scope,state_id,district_id,invited_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id::text`, [fullName, email, mobile, scope, stateId, districtId, admin.userId]);
      const juryId = Number(result.rows[0].id); for (const categoryId of categoryIds) await pool.query(`INSERT INTO jury_profile_categories (jury_profile_id,challenge_category_id) VALUES ($1,$2)`, [juryId, categoryId]);
      const token = randomBytes(32).toString("hex"); await pool.query(`INSERT INTO jury_verification_tokens (jury_profile_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '7 days')`, [juryId, hash(token)]);
      const delivery = await sendInvitation({ email, name: fullName, token, language: language(body.language) });
      await auditService.recordRichAuditEntry(request, pool, { actorType: "admin", actorId: admin.userId, category: "jury_profile", action: "jury_profile.created", statusCode: 200, details: { email, fullName, scope } });
      return sendSuccess(request, reply, { data: { jury: await juryById(pool, juryId), emailDelivery: delivery }, message: "Jury invitation created." });
    } catch (error: unknown) { return sendError(request, reply, { message: String((error as { code?: string }).code) === "23505" ? "A jury profile already exists for this email address." : "Unable to create jury profile.", statusCode: 400 }); }
}

async function listProfiles(request: FastifyRequest<{ Querystring: { districtId?: string; page?: string; pageSize?: string; search?: string; sortBy?: string; sortDirection?: string; stateId?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply;
    const access = (request as AuthenticatedAdminRequest).adminAccess;
    const page = Math.max(1, Number(request.query.page) || 1); const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize) || 10));
    const sortColumns: Record<string, string> = { category: "COALESCE(MIN(cc.name_en),'')", createdAt: "jp.created_at", email: "jp.email", jurisdiction: "s.name_en", name: "jp.full_name", scope: "jp.scope", state: "s.name_en", status: "CASE WHEN NOT jp.invitation_accepted THEN 0 WHEN jp.is_active THEN 1 ELSE 2 END" };
    const sortBy = sortColumns[request.query.sortBy ?? ""] ?? sortColumns.createdAt; const direction = request.query.sortDirection === "asc" ? "ASC" : "DESC";
    const values: unknown[] = []; const conditions: string[] = [];
    const role = access.role.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (role === "ADMIN_DISTRICT") { values.push(access.stateId, access.districtId); conditions.push(`jp.state_id=$${values.length - 1} AND jp.district_id=$${values.length}`); }
    else if (role === "ADMIN_STATE") { values.push(access.stateId); conditions.push(`jp.state_id=$${values.length}`); }
    else if (role === "ADMIN_REGION") conditions.push(`jp.state_id IN (SELECT id FROM states WHERE LOWER(TRIM(name_en)) IN ('west bengal','bihar','jharkhand'))`);
    // State / District filters only narrow the list; the role scope above still applies.
    const filterStateId = number(request.query.stateId); if (filterStateId) { values.push(filterStateId); conditions.push(`jp.state_id=$${values.length}`); }
    const filterDistrictId = number(request.query.districtId); if (filterDistrictId) { values.push(filterDistrictId); conditions.push(`jp.district_id=$${values.length}`); }
    const search = request.query.search?.trim(); if (search) { values.push(`%${search}%`); conditions.push(`(jp.full_name ILIKE $${values.length} OR jp.email ILIKE $${values.length} OR jp.mobile ILIKE $${values.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM jury_profiles jp ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await pool.query<{ categories: string[] | null; created_at: Date; district_name: string | null; email: string; full_name: string; id: string; invitation_accepted: boolean; is_active: boolean; mobile: string; scope: string; state_name: string }>(`SELECT jp.id::text,jp.full_name,jp.email,jp.mobile,jp.scope,jp.invitation_accepted,jp.is_active,jp.created_at,s.name_en AS state_name,d.name_en AS district_name,ARRAY_REMOVE(ARRAY_AGG(cc.name_en),NULL) AS categories FROM jury_profiles jp JOIN states s ON s.id=jp.state_id LEFT JOIN districts d ON d.id=jp.district_id LEFT JOIN jury_profile_categories jpc ON jpc.jury_profile_id=jp.id LEFT JOIN challenge_categories cc ON cc.id=jpc.challenge_category_id ${where} GROUP BY jp.id,s.name_en,d.name_en ORDER BY ${sortBy} ${direction}, jp.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const count = Number(total.rows[0]?.count ?? 0);
    // How many applications each jury member has opened and evaluated. This must not break the panel if the tables are not available yet.
    const activity = new Map<number, JuryActivity>();
    const categoryActivity = new Map<number, CategoryActivity[]>();
    if (result.rows.length > 0) {
        try {
            const ids = result.rows.map((row) => Number(row.id));
            // Same definitions as the jury dashboard, per jury member: total is every submitted application in their scope
            // (their state, and only their own district if district-scoped, their categories); the rest are their own views and evaluations.
            const counts = await pool.query<{ evaluated: string; id: string; on_evaluation: string; recommended: string; rejected: string; reviewed: string; total: string; viewed: string }>(`SELECT jp.id::text,
                (SELECT COUNT(*) FROM participant_applications pa WHERE pa.status='submitted' AND pa.state_id=jp.state_id AND (jp.district_id IS NULL OR pa.district_id = jp.district_id) AND pa.challenge_category_id IN (SELECT jpc.challenge_category_id FROM jury_profile_categories jpc WHERE jpc.jury_profile_id=jp.id))::text AS total,
                (SELECT COUNT(*) FROM jury_application_views v WHERE v.jury_profile_id = jp.id)::text AS viewed,
                (SELECT COUNT(*) FROM jury_evaluations e WHERE e.jury_profile_id = jp.id AND e.status = 'in_progress')::text AS on_evaluation,
                (SELECT COUNT(*) FROM jury_evaluations e WHERE e.jury_profile_id = jp.id AND e.status IN ('submitted', 'auto_submitted'))::text AS evaluated,
                (SELECT COUNT(*) FROM jury_evaluations e WHERE e.jury_profile_id = jp.id AND e.status IN ('submitted', 'auto_submitted') AND e.recommendation = 'Recommend')::text AS recommended,
                (SELECT COUNT(*) FROM jury_evaluations e WHERE e.jury_profile_id = jp.id AND e.status IN ('submitted', 'auto_submitted') AND e.recommendation = 'Review')::text AS reviewed,
                (SELECT COUNT(*) FROM jury_evaluations e WHERE e.jury_profile_id = jp.id AND e.status IN ('submitted', 'auto_submitted') AND e.recommendation = 'Reject')::text AS rejected
                FROM jury_profiles jp WHERE jp.id = ANY($1::bigint[])`, [ids]);
            for (const row of counts.rows) activity.set(Number(row.id), { evaluated: Number(row.evaluated), onEvaluation: Number(row.on_evaluation), recommended: Number(row.recommended), rejected: Number(row.rejected), reviewed: Number(row.reviewed), total: Number(row.total), viewed: Number(row.viewed) });
            // The same counts broken down by each challenge category the jury member is assigned to.
            const byCategory = await pool.query<{ category_id: string; evaluated: string; jury_id: string; name: string; on_evaluation: string; recommended: string; rejected: string; reviewed: string; total: string; viewed: string }>(`SELECT jp.id::text AS jury_id, cc.id::text AS category_id, cc.name_en AS name,
                t.count::text AS total, vw.count::text AS viewed,
                ev.on_evaluation::text AS on_evaluation, ev.evaluated::text AS evaluated, ev.recommended::text AS recommended, ev.reviewed::text AS reviewed, ev.rejected::text AS rejected
                FROM jury_profiles jp
                JOIN jury_profile_categories jpc ON jpc.jury_profile_id = jp.id
                JOIN challenge_categories cc ON cc.id = jpc.challenge_category_id
                CROSS JOIN LATERAL (SELECT COUNT(*) AS count FROM participant_applications pa WHERE pa.status='submitted' AND pa.state_id=jp.state_id AND (jp.district_id IS NULL OR pa.district_id = jp.district_id) AND pa.challenge_category_id=cc.id) t
                CROSS JOIN LATERAL (SELECT COUNT(*) AS count FROM jury_application_views v JOIN participant_applications pa ON pa.id=v.application_id WHERE v.jury_profile_id=jp.id AND pa.challenge_category_id=cc.id) vw
                CROSS JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE e.status='in_progress') AS on_evaluation,
                    COUNT(*) FILTER (WHERE e.status IN ('submitted','auto_submitted')) AS evaluated,
                    COUNT(*) FILTER (WHERE e.status IN ('submitted','auto_submitted') AND e.recommendation='Recommend') AS recommended,
                    COUNT(*) FILTER (WHERE e.status IN ('submitted','auto_submitted') AND e.recommendation='Review') AS reviewed,
                    COUNT(*) FILTER (WHERE e.status IN ('submitted','auto_submitted') AND e.recommendation='Reject') AS rejected
                    FROM jury_evaluations e JOIN participant_applications pa ON pa.id=e.application_id WHERE e.jury_profile_id=jp.id AND pa.challenge_category_id=cc.id) ev
                WHERE jp.id = ANY($1::bigint[])
                ORDER BY cc.sort_order, cc.name_en`, [ids]);
            for (const row of byCategory.rows) { const list = categoryActivity.get(Number(row.jury_id)) ?? []; list.push({ categoryId: Number(row.category_id), evaluatedCount: Number(row.evaluated), name: row.name, onEvaluationCount: Number(row.on_evaluation), recommendedCount: Number(row.recommended), rejectedCount: Number(row.rejected), reviewedCount: Number(row.reviewed), totalCount: Number(row.total), viewedCount: Number(row.viewed) }); categoryActivity.set(Number(row.jury_id), list); }
        } catch (error) { request.server.log.error(error); }
    }
    return sendSuccess(request, reply, { data: { juries: result.rows.map((row) => ({ id: Number(row.id), evaluatedCount: (activity.get(Number(row.id)) ?? noActivity).evaluated, onEvaluationCount: (activity.get(Number(row.id)) ?? noActivity).onEvaluation, recommendedCount: (activity.get(Number(row.id)) ?? noActivity).recommended, rejectedCount: (activity.get(Number(row.id)) ?? noActivity).rejected, reviewedCount: (activity.get(Number(row.id)) ?? noActivity).reviewed, totalCount: (activity.get(Number(row.id)) ?? noActivity).total, viewedCount: (activity.get(Number(row.id)) ?? noActivity).viewed, name: row.full_name, email: row.email, mobile: row.mobile, scope: row.scope, state: row.state_name, district: row.district_name, categories: row.categories ?? [], categoryCounts: categoryActivity.get(Number(row.id)) ?? [], status: juryStatus(row), createdAt: row.created_at.toISOString() })), pagination: { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) } }, message: "Jury profiles fetched." });
}

async function getAdminProfile(request: FastifyRequest<{ Params: { id?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply; const id = number(request.params.id); if (!id) return sendError(request, reply, { message: "A valid jury profile id is required.", statusCode: 400 });
    const jury = await juryById(pool, id); if (!jury) return sendError(request, reply, { message: "Jury profile was not found.", statusCode: 404 });
    if (!scopeAllowed((request as AuthenticatedAdminRequest).adminAccess, Number(jury.state_id), jury.district_id ? Number(jury.district_id) : null)) return sendError(request, reply, { message: "Access is not available for this jury profile.", statusCode: 403 });
    const details = await pool.query<{ address: string | null; avatar_original_file_name: string | null; city: string | null; cv_original_file_name: string | null; designation: string | null; organisation_name: string | null; pin_code: string | null; professional_experience_years: number | null; categories: string[] | null }>(`SELECT jp.address,jp.city,jp.pin_code,jp.organisation_name,jp.designation,jp.professional_experience_years,jp.cv_original_file_name,jp.avatar_original_file_name,ARRAY_REMOVE(ARRAY_AGG(cc.name_en),NULL) AS categories FROM jury_profiles jp LEFT JOIN jury_profile_categories jpc ON jpc.jury_profile_id=jp.id LEFT JOIN challenge_categories cc ON cc.id=jpc.challenge_category_id WHERE jp.id=$1 GROUP BY jp.id`, [id]);
    return sendSuccess(request, reply, { data: { jury: { ...jury, ...(details.rows[0] ?? {}), status: juryStatus(jury) } }, message: "Jury profile fetched." });
}

const superAdminOnlyFields = ["address", "city", "designation", "email", "fullName", "mobile", "organisationName", "pinCode", "professionalExperienceYears"] as const;

// SuperAdmin may change every field; Region / State / District admins (within their jurisdiction) only the categories and Active / Inactive status.
async function updateAdminProfile(request: FastifyRequest<{ Params: { id?: string }; Body: Record<string, unknown> }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply; const id = number(request.params.id); if (!id) return sendError(request, reply, { message: "A valid jury profile id is required.", statusCode: 400 });
    const access = (request as AuthenticatedAdminRequest).adminAccess; const body = request.body ?? {};
    const jury = await juryById(pool, id); if (!jury) return sendError(request, reply, { message: "Jury profile was not found.", statusCode: 404 });
    if (!scopeAllowed(access, Number(jury.state_id), jury.district_id ? Number(jury.district_id) : null)) return sendError(request, reply, { message: "Access is not available for this jury profile.", statusCode: 403 });
    const isSuperAdmin = access.role.trim().toUpperCase().replace(/[\s-]+/g, "_") === "SUPERADMIN";
    if (!isSuperAdmin && superAdminOnlyFields.some((field) => body[field] !== undefined)) return sendError(request, reply, { message: "Only a SuperAdmin can change these jury profile fields.", statusCode: 403 });
    const before = await fullProfileById(pool, id);

    const sets: string[] = []; const values: unknown[] = [];
    const set = (column: string, value: unknown) => { values.push(value); sets.push(`${column}=$${values.length}`); };
    const optionalText = (value: unknown) => { const text = String(value ?? "").trim(); return text === "" ? null : text; };

    let categoryIds: number[] | null = null;
    if (body.categoryIds !== undefined) {
        const maxCategories = await maxChallengeCategories(pool);
        categoryIds = Array.isArray(body.categoryIds) ? [...new Set(body.categoryIds.map(number).filter((value): value is number => Boolean(value)))] : [];
        if (categoryIds.length < 1 || categoryIds.length > maxCategories || (Array.isArray(body.categoryIds) && categoryIds.length !== new Set(body.categoryIds.map(Number)).size)) return sendError(request, reply, { message: `Select one to ${maxCategories} valid challenge categories.`, statusCode: 400 });
        const found = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM challenge_categories WHERE id=ANY($1::bigint[])`, [categoryIds]);
        if (Number(found.rows[0]?.count) !== categoryIds.length) return sendError(request, reply, { message: `Select one to ${maxCategories} valid challenge categories.`, statusCode: 400 });
    }
    if (body.isActive !== undefined) {
        if (typeof body.isActive !== "boolean") return sendError(request, reply, { message: "isActive must be true or false.", statusCode: 400 });
        if (!jury.invitation_accepted) return sendError(request, reply, { message: "Status can be changed only after the jury has accepted the invitation.", statusCode: 400 });
        set("is_active", body.isActive);
    }
    if (isSuperAdmin) {
        if (body.fullName !== undefined) { const fullName = String(body.fullName).trim(); if (!fullName) return sendError(request, reply, { message: "Full name is required.", statusCode: 400 }); set("full_name", fullName); }
        if (body.email !== undefined) { const email = String(body.email).trim().toLowerCase(); if (!emailPattern.test(email)) return sendError(request, reply, { message: "Enter a valid email address.", statusCode: 400 }); set("email", email); }
        if (body.mobile !== undefined) { const mobile = String(body.mobile).replace(/\D/g, ""); if (mobile.length !== 10) return sendError(request, reply, { message: "Enter a valid 10-digit mobile number.", statusCode: 400 }); set("mobile", mobile); }
        if (body.pinCode !== undefined) { const pin = String(body.pinCode ?? "").replace(/\D/g, ""); if (pin !== "" && !/^\d{6}$/.test(pin)) return sendError(request, reply, { message: "PIN code must be 6 digits.", statusCode: 400 }); set("pin_code", pin || null); }
        if (body.professionalExperienceYears !== undefined) { const raw = body.professionalExperienceYears; const years = raw === null || raw === "" ? null : Number(raw); if (years !== null && (!Number.isInteger(years) || years < 0 || years > 100)) return sendError(request, reply, { message: "Professional experience must be a whole number from 0 to 100.", statusCode: 400 }); set("professional_experience_years", years); }
        if (body.address !== undefined) set("address", optionalText(body.address));
        if (body.city !== undefined) set("city", optionalText(body.city));
        if (body.organisationName !== undefined) set("organisation_name", optionalText(body.organisationName));
        if (body.designation !== undefined) set("designation", optionalText(body.designation));
    }
    if (sets.length === 0 && !categoryIds) return sendError(request, reply, { message: "There is nothing to update.", statusCode: 400 });

    try {
        if (sets.length > 0) { values.push(id); await pool.query(`UPDATE jury_profiles SET ${sets.join(",")},updated_at=NOW() WHERE id=$${values.length}`, values); }
        if (categoryIds) {
            await pool.query(`DELETE FROM jury_profile_categories WHERE jury_profile_id=$1 AND challenge_category_id<>ALL($2::bigint[])`, [id, categoryIds]);
            await pool.query(`INSERT INTO jury_profile_categories (jury_profile_id,challenge_category_id) SELECT $1, UNNEST($2::bigint[]) ON CONFLICT DO NOTHING`, [id, categoryIds]);
        }
    } catch (error: unknown) { return sendError(request, reply, { message: String((error as { code?: string }).code) === "23505" ? "A jury profile already exists for this email address." : "Unable to update jury profile.", statusCode: 400 }); }
    const updated = await juryById(pool, id);
    const after = await fullProfileById(pool, id);
    await auditService.recordRichAuditEntry(request, pool, { actorType: "admin", actorId: access.userId, category: "jury_profile", action: "jury_profile.updated", statusCode: 200, details: { juryId: id, changes: juryProfileChanges(before, after, body, categoryIds) } });
    return sendSuccess(request, reply, { data: { jury: updated ? { ...updated, status: juryStatus(updated) } : null }, message: "Jury profile updated." });
}

async function resendInvitation(request: FastifyRequest<{ Params: { id?: string }; Body: { language?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply; const id = number(request.params.id); if (!id) return sendError(request, reply, { message: "A valid jury profile id is required.", statusCode: 400 });
    const jury = await juryById(pool, id); if (!jury) return sendError(request, reply, { message: "Jury profile was not found.", statusCode: 404 });
    if (!scopeAllowed((request as AuthenticatedAdminRequest).adminAccess, Number(jury.state_id), jury.district_id ? Number(jury.district_id) : null)) return sendError(request, reply, { message: "Access is not available for this jury profile.", statusCode: 403 });
    if (jury.invitation_accepted) return sendError(request, reply, { message: "This jury has already accepted the invitation.", statusCode: 400 });
    const token = randomBytes(32).toString("hex"); await pool.query(`UPDATE jury_verification_tokens SET consumed_at=NOW() WHERE jury_profile_id=$1 AND consumed_at IS NULL`, [id]); await pool.query(`INSERT INTO jury_verification_tokens (jury_profile_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '7 days')`, [id, hash(token)]);
    const delivery = await sendInvitation({ email: jury.email, name: jury.full_name, token, language: language(request.body?.language) });
    return sendSuccess(request, reply, { data: { emailDelivery: delivery, jury: { id, email: jury.email } }, message: "Jury invitation resent." });
}

// Permanently deletes a jury member's evaluation of an application (and its
// per-criterion scores, via ON DELETE CASCADE), so the application becomes
// available again for evaluation from scratch. SuperAdmin only.
async function resetEvaluation(request: FastifyRequest<{ Params: { applicationId?: string }; Querystring: { level?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply;
    const access = (request as AuthenticatedAdminRequest).adminAccess;
    const role = access.role.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (role !== "SUPERADMIN") return sendError(request, reply, { message: "Only a SuperAdmin can reset a jury evaluation.", statusCode: 403 });
    const applicationId = number(request.params.applicationId); if (!applicationId) return sendError(request, reply, { message: "A valid application id is required.", statusCode: 400 });
    const level = request.query.level === "State" ? "State" : request.query.level === "District" ? "District" : request.query.level === "Region" ? "Region" : null;
    if (!level) return sendError(request, reply, { message: "A valid evaluation level (District, State or Region) is required.", statusCode: 400 });
    const deleted = await pool.query<{ id: string }>(`DELETE FROM jury_evaluations WHERE application_id=$1 AND level=$2 RETURNING id::text`, [applicationId, level]);
    if (deleted.rows.length === 0) return sendError(request, reply, { message: "No evaluation was found for this application and level.", statusCode: 404 });
    const appRow = await pool.query<{ application_number: string; full_name: string | null; mobile: string | null }>(`SELECT pa.application_number, p.full_name, p.mobile FROM public.participant_applications pa LEFT JOIN public.participants p ON p.id = pa.participant_id WHERE pa.id=$1`, [applicationId]);
    await auditService.recordRichAuditEntry(request, pool, { actorType: "admin", actorId: access.userId, category: "jury_evaluation", action: "jury_evaluation.deleted", applicationId, applicationNumber: appRow.rows[0]?.application_number ?? null, applicantFullName: appRow.rows[0]?.full_name ?? null, applicantPhone: appRow.rows[0]?.mobile ?? null, statusCode: 200, details: { level, reason: "reset" } });
    return sendSuccess(request, reply, { data: { applicationId, level }, message: "Jury evaluation has been reset." });
}

async function verifyInvitation(request: FastifyRequest<{ Body: { token?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply; const token = String(request.body?.token ?? ""); if (!token) return sendError(request, reply, { message: "A verification token is required.", statusCode: 400 });
    const result = await pool.query<{ jury_profile_id: string }>(`UPDATE jury_verification_tokens SET consumed_at=NOW() WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>NOW() RETURNING jury_profile_id::text`, [hash(token)]); const tokenRow = result.rows[0]; if (!tokenRow) return sendError(request, reply, { message: "This verification link is invalid or has expired.", statusCode: 400 });
    const jury = await juryById(pool, Number(tokenRow.jury_profile_id)); if (!jury) return sendError(request, reply, { message: "Jury profile was not found.", statusCode: 404 });
    // An admin may have deactivated an already-accepted jury; an old link must not reactivate or sign them in.
    if (jury.invitation_accepted && !jury.is_active) return sendError(request, reply, { message: "This jury profile is inactive. Please contact the administrator.", statusCode: 403 });
    const firstAcceptance = !jury.invitation_accepted;
    await pool.query(`UPDATE jury_profiles SET invitation_accepted=TRUE,is_active=CASE WHEN invitation_accepted THEN is_active ELSE TRUE END,email_verified_at=COALESCE(email_verified_at,NOW()),updated_at=NOW() WHERE id=$1`, [jury.id]);
    if (firstAcceptance) await notifyInvitationAccepted(pool, request, jury);
    return sendSuccess(request, reply, { data: { jury: { ...jury, invitation_accepted: true, is_active: true }, session: { token: createJuryJwt({ sub: jury.id, email: jury.email, name: jury.full_name }) } }, message: "Email verified." });
}

async function requestLogin(request: FastifyRequest<{ Body: { email?: string; language?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply; const email = String(request.body?.email ?? "").trim().toLowerCase(); if (!emailPattern.test(email)) return sendError(request, reply, { message: "Enter a valid email address.", statusCode: 400 });
    const found = await pool.query<JuryRow>(`SELECT jp.id::text,jp.full_name,jp.email,jp.mobile,jp.scope,jp.state_id::text,jp.district_id::text,jp.invitation_accepted,jp.is_active,jp.profile_completed_at,s.name_en AS state_name,d.name_en AS district_name FROM jury_profiles jp JOIN states s ON s.id=jp.state_id LEFT JOIN districts d ON d.id=jp.district_id WHERE jp.email=$1 AND jp.is_active=TRUE`, [email]); const jury = found.rows[0];
    if (!jury) return sendError(request, reply, { message: "This email is not registered as an active jury profile, the invitation has not yet been accepted, or the profile has been deactivated.", statusCode: 400 });
    const code = String(randomInt(100000, 1000000)); await pool.query(`UPDATE jury_login_tokens SET consumed_at=NOW() WHERE jury_profile_id=$1 AND consumed_at IS NULL`, [jury.id]); await pool.query(`INSERT INTO jury_login_tokens (jury_profile_id,code_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '10 minutes')`, [jury.id, hash(code)]);
    const delivery = await emailService.sendJuryLoginVerificationEmail({ juryEmail: jury.email, juryName: jury.full_name, code, language: language(request.body?.language) });
    return sendSuccess(request, reply, { data: { loginRequest: { email }, emailDelivery: delivery }, message: "Verification code sent." });
}

async function verifyLogin(request: FastifyRequest<{ Body: { code?: string; email?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply; const email = String(request.body?.email ?? "").trim().toLowerCase(); const code = String(request.body?.code ?? "").replace(/\D/g, ""); if (!emailPattern.test(email) || !/^\d{6}$/.test(code)) return sendError(request, reply, { message: "Enter a valid email address and six-digit code.", statusCode: 400 });
    const result = await pool.query<JuryRow>(`SELECT jp.id::text,jp.full_name,jp.email,jp.mobile,jp.scope,jp.state_id::text,jp.district_id::text,jp.invitation_accepted,jp.is_active,jp.profile_completed_at,s.name_en AS state_name,d.name_en AS district_name FROM jury_login_tokens t JOIN jury_profiles jp ON jp.id=t.jury_profile_id JOIN states s ON s.id=jp.state_id LEFT JOIN districts d ON d.id=jp.district_id WHERE jp.email=$1 AND t.code_hash=$2 AND t.consumed_at IS NULL AND t.expires_at>NOW() AND jp.is_active=TRUE FOR UPDATE OF t`, [email, hash(code)]); const jury = result.rows[0]; if (!jury) return sendError(request, reply, { message: "The verification code is invalid or has expired.", statusCode: 400 });
    await pool.query(`UPDATE jury_login_tokens SET consumed_at=NOW() WHERE jury_profile_id=$1 AND consumed_at IS NULL`, [jury.id]); return sendSuccess(request, reply, { data: { jury, session: { token: createJuryJwt({ sub: jury.id, email: jury.email, name: jury.full_name }) } }, message: "Signed in." });
}

type JuryProfileRow = JuryRow & { address: string | null; avatar_original_file_name: string | null; categories: string[] | null; city: string | null; cv_original_file_name: string | null; designation: string | null; email_verified_at: Date | null; organisation_name: string | null; pin_code: string | null; professional_experience_years: number | null };
async function fullProfileById(pool: Pool, id: number) {
    const result = await pool.query<JuryProfileRow>(`SELECT jp.id::text, jp.full_name, jp.email, jp.mobile, jp.scope, jp.state_id::text, jp.district_id::text, jp.invitation_accepted, jp.is_active, jp.profile_completed_at, jp.email_verified_at, jp.address, jp.city, jp.pin_code, jp.organisation_name, jp.designation, jp.professional_experience_years, jp.cv_original_file_name, jp.avatar_original_file_name, s.name_en AS state_name, d.name_en AS district_name, ARRAY_REMOVE(ARRAY_AGG(cc.name_en ORDER BY cc.sort_order, cc.name_en), NULL) AS categories FROM jury_profiles jp JOIN states s ON s.id=jp.state_id LEFT JOIN districts d ON d.id=jp.district_id LEFT JOIN jury_profile_categories jpc ON jpc.jury_profile_id=jp.id LEFT JOIN challenge_categories cc ON cc.id=jpc.challenge_category_id WHERE jp.id=$1 GROUP BY jp.id, s.name_en, d.name_en`, [id]);
    return result.rows[0] ?? null;
}
async function getProfile(request: FastifyRequest, reply: FastifyReply) { const pool = db(request, reply); if (!pool) return reply; const jury = await fullProfileById(pool, Number((request as AuthenticatedJuryRequest).jury.sub)); if (!jury) return sendError(request, reply, { message: "Jury profile was not found.", statusCode: 404 }); return sendSuccess(request, reply, { data: { jury }, message: "Jury profile fetched." }); }
async function updateProfile(request: FastifyRequest<{ Body: Record<string, unknown> }>, reply: FastifyReply) { const pool = db(request, reply); if (!pool) return reply; const body = request.body ?? {}; const id = Number((request as AuthenticatedJuryRequest).jury.sub); const address = String(body.address ?? "").trim(); const city = String(body.city ?? "").trim(); const pin = String(body.pinCode ?? "").replace(/\D/g, ""); const organisation = String(body.organisationName ?? "").trim(); const designation = String(body.designation ?? "").trim(); const experience = Number(body.professionalExperienceYears); if (!address || !city || !/^\d{6}$/.test(pin) || !organisation || !designation || !Number.isInteger(experience) || experience < 0) return sendError(request, reply, { message: "Complete all required profile fields with a valid PIN code and experience.", statusCode: 400 }); await pool.query(`UPDATE jury_profiles SET address=$1,city=$2,pin_code=$3,organisation_name=$4,designation=$5,professional_experience_years=$6,profile_completed_at=NOW(),updated_at=NOW() WHERE id=$7`, [address, city, pin, organisation, designation, experience, id]); return getProfile(request, reply); }

async function uploadDocument(request: FastifyRequest, reply: FastifyReply) { const pool = db(request, reply); if (!pool) return reply; const file = await request.file(); if (!file) return sendError(request, reply, { message: "Select a file to upload.", statusCode: 400 }); const kind = String((file.fields.kind as { value?: string } | undefined)?.value ?? ""); const isCv = kind === "cv"; const allowed = isCv ? ["application/pdf"] : ["image/jpeg", "image/png"]; if (!allowed.includes(file.mimetype)) return sendError(request, reply, { message: isCv ? "CV must be a PDF." : "Avatar must be a JPG or PNG image.", statusCode: 400 }); const data = await file.toBuffer(); const limit = await appSettingInt(pool, isCv ? "JURY_MAX_CV_SIZE" : "JURY_MAX_AVATAR_SIZE", isCv ? 5 : 200); const max = limit * (isCv ? 1024 * 1024 : 1024); if (data.length > max) return sendError(request, reply, { message: `Uploaded file exceeds the configured ${isCv ? "CV" : "avatar"} size limit.`, statusCode: 400 }); const id = Number((request as AuthenticatedJuryRequest).jury.sub); const extension = basename(file.filename).split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "file"; const storageKey = join("jury", String(id), `${kind}-${Date.now()}.${extension}`); const root = resolve(process.cwd(), process.env.UPLOAD_DIR ?? process.env.LOCAL_STORAGE_DIR ?? "uploads"); await mkdir(join(root, "jury", String(id)), { recursive: true }); await writeFile(join(root, storageKey), data); await pool.query(isCv ? `UPDATE jury_profiles SET cv_storage_key=$1,cv_original_file_name=$2,updated_at=NOW() WHERE id=$3` : `UPDATE jury_profiles SET avatar_storage_key=$1,avatar_original_file_name=$2,updated_at=NOW() WHERE id=$3`, [storageKey, file.filename, id]); return sendSuccess(request, reply, { data: { fileName: file.filename, kind, storageKey }, message: "File uploaded." }); }

async function downloadDocument(request: FastifyRequest<{ Params: { kind?: string } }>, reply: FastifyReply) {
    const pool = db(request, reply); if (!pool) return reply;
    const kind = request.params.kind;
    if (kind !== "cv" && kind !== "avatar") return sendError(request, reply, { message: "Document type must be cv or avatar.", statusCode: 400 });
    const id = Number((request as unknown as AuthenticatedJuryRequest).jury.sub);
    const result = await pool.query<{ file_name: string | null; storage_key: string | null }>(kind === "cv" ? `SELECT cv_original_file_name AS file_name, cv_storage_key AS storage_key FROM jury_profiles WHERE id=$1` : `SELECT avatar_original_file_name AS file_name, avatar_storage_key AS storage_key FROM jury_profiles WHERE id=$1`, [id]);
    const row = result.rows[0];
    const filePath = row?.storage_key ? await resolveStoredFilePath(row.storage_key) : "";
    if (!row?.storage_key || !filePath) return sendError(request, reply, { message: "Document not found.", statusCode: 404 });
    const extension = row.storage_key.split(".").pop()?.toLowerCase();
    const contentType = kind === "cv" ? "application/pdf" : extension === "png" ? "image/png" : "image/jpeg";
    const size = (await stat(filePath)).size;
    return reply.header("Content-Type", contentType).header("Content-Length", String(size)).header("Content-Disposition", contentDispositionFileName(row.file_name ?? `${kind}.${extension ?? "file"}`)).send(createReadStream(filePath));
}

export const juryController = { downloadDocument, createProfile, getAdminProfile, getProfile, listProfiles, requestLogin, resendInvitation, resetEvaluation, updateAdminProfile, updateProfile, uploadDocument, verifyInvitation, verifyLogin };
