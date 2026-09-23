import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { getApiContent } from "../../content/index.js";
import { sendError, sendSuccess } from "../common/api-response.js";
import { generateApplicationPdf } from "./admin-application-pdf.js";
import type { AdminLanguage } from "./admin.model.js";
import {
    AdminRuleError,
    adminService,
    type DatabasePool,
} from "./admin.service.js";

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

const apiPackageRoot = resolve(__dirname, "../../..");

type ApplicationParams = {
    applicationId?: string;
};

type UpdateApplicationBody = Record<string, unknown>;

type ApplicationDocumentParams = ApplicationParams & {
    documentId?: string;
};

type ApplicationsQuery = {
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    status?: string;
};

type UsersQuery = {
    page?: string;
    pageSize?: string;
    search?: string;
};

type UserParams = {
    userId?: string;
};

type UpsertUserBody = Record<string, unknown>;

type SettingItemParams = {
    id?: string;
};

type SettingRoleParams = {
    role?: string;
};

type SettingConfigurationParams = {
    key?: string;
};

type UpsertSettingBody = Record<string, unknown>;

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
    return value.replace(
        /[\u09e6-\u09ef\u0966-\u096f\u06f0-\u06f9\u0660-\u0669]/g,
        (digit) => {
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
        },
    );
}

function normalizeVerificationCode(value: unknown) {
    return isNonEmptyString(value)
        ? normalizeLocalizedDigits(value).replace(/\D/g, "").slice(0, 6)
        : "";
}

function parsePositiveInteger(value: string | undefined) {
    if (!value || !/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeSortBy(value: string | undefined) {
    if (
        value === "createdAt" ||
        value === "number" ||
        value === "review" ||
        value === "state" ||
        value === "status" ||
        value === "submittedAt" ||
        value === "title"
    ) {
        return value;
    }

    return "submittedAt";
}

function normalizeSortDirection(value: string | undefined) {
    return value === "asc" ? "asc" : "desc";
}

function getUploadRoot() {
    return process.env.UPLOAD_DIR ?? process.env.LOCAL_STORAGE_DIR ?? "uploads";
}

function getUploadRootCandidates() {
    const configuredRoot = getUploadRoot();

    return Array.from(
        new Set([
            resolve(process.cwd(), configuredRoot),
            resolve(apiPackageRoot, configuredRoot),
            resolve(process.cwd(), "apps/api", configuredRoot),
        ]),
    );
}

function contentDispositionFileName(fileName: string) {
    const fallbackName = fileName.replace(/[^\w. -]/g, "_");
    return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function resolveStoredFilePath(storageKey: string) {
    for (const uploadRoot of getUploadRootCandidates()) {
        const candidatePath = resolve(uploadRoot, storageKey);

        if (
            !candidatePath.startsWith(`${uploadRoot}/`) &&
            candidatePath !== uploadRoot
        ) {
            continue;
        }

        try {
            await stat(candidatePath);
            return candidatePath;
        } catch {
            continue;
        }
    }

    return "";
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateEmailBody(body: LoginBody = {}) {
    const language: AdminLanguage = "en";
    const email = isNonEmptyString(body.email)
        ? normalizeEmail(body.email)
        : "";
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
        const result = await adminService.requestLoginCode(pg, validated.value);

        return sendSuccess(request, reply, {
            data: result,
            message: getApiContent("en").api.adminLoginCodeSent,
            statusCode: 201,
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent(validated.value.language).api
                          .adminLoginUnable,
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
        const result = await adminService.resendLoginCode(pg, validated.value);

        return sendSuccess(request, reply, {
            data: result,
            message: getApiContent("en").api.adminLoginCodeSent,
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent(validated.value.language).api
                          .adminLoginUnable,
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
            getApiContent(validated.value.language).api
                .verificationCodeRequired,
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
        const result = await adminService.verifyLoginCode(pg, {
            ...validated.value,
            code,
        });

        return sendSuccess(request, reply, {
            data: result,
            message: getApiContent("en").api.adminLoginVerified,
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent(validated.value.language).api
                          .adminLoginUnable,
            statusCode: getErrorStatusCode(error) ?? 400,
        });
    }
}

async function getDashboardCounts(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        const result = await adminService.getDashboardCounts(pg);

        return sendSuccess(request, reply, {
            data: result,
            message: getApiContent("en").api.adminDashboardCountsFetched,
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent("en").api.internalServerError,
            statusCode: getErrorStatusCode(error) ?? 500,
        });
    }
}

async function getUsers(
    request: FastifyRequest<{ Querystring: UsersQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const page = parsePositiveInteger(request.query.page) ?? 1;
    const pageSize = parsePositiveInteger(request.query.pageSize) ?? 20;

    try {
        const result = await adminService.getUsers(pg, {
            page,
            pageSize,
            search: request.query.search,
        });

        return sendSuccess(request, reply, {
            data: result,
            message: "Users fetched successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent("en").api.internalServerError,
            statusCode: getErrorStatusCode(error) ?? 500,
        });
    }
}

async function getUser(
    request: FastifyRequest<{ Params: UserParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const userId = parsePositiveInteger(request.params.userId);

    if (!userId) {
        return sendError(request, reply, {
            message: "A valid user id is required.",
            statusCode: 400,
        });
    }

    try {
        const user = await adminService.getUser(pg, userId);

        if (!user) {
            return sendError(request, reply, {
                message: "User not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: { user },
            message: "User fetched successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: getApiContent("en").api.internalServerError,
            statusCode: 500,
        });
    }
}

async function createUser(
    request: FastifyRequest<{ Body?: UpsertUserBody }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    if (!isPlainObject(request.body)) {
        return sendError(request, reply, {
            message: "A valid user body is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.createUser(pg, request.body);

        return sendSuccess(request, reply, {
            data: result,
            message: "User created successfully.",
            statusCode: 201,
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent("en").api.internalServerError,
            statusCode:
                error instanceof AdminRuleError
                    ? error.statusCode
                    : getErrorStatusCode(error) ?? 500,
        });
    }
}

async function updateUser(
    request: FastifyRequest<{
        Body?: UpsertUserBody;
        Params: UserParams;
    }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const userId = parsePositiveInteger(request.params.userId);

    if (!userId) {
        return sendError(request, reply, {
            message: "A valid user id is required.",
            statusCode: 400,
        });
    }

    if (!isPlainObject(request.body)) {
        return sendError(request, reply, {
            message: "A valid user update body is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.updateUser(pg, userId, request.body);

        if (!result) {
            return sendError(request, reply, {
                message: "User not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: result,
            message: "User updated successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent("en").api.internalServerError,
            statusCode:
                error instanceof AdminRuleError
                    ? error.statusCode
                    : getErrorStatusCode(error) ?? 500,
        });
    }
}

async function deleteUser(
    request: FastifyRequest<{ Params: UserParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const userId = parsePositiveInteger(request.params.userId);

    if (!userId) {
        return sendError(request, reply, {
            message: "A valid user id is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.deleteUser(pg, userId);

        if (!result) {
            return sendError(request, reply, {
                message: "User not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: result,
            message: "User deactivated successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent("en").api.internalServerError,
            statusCode:
                error instanceof AdminRuleError
                    ? error.statusCode
                    : getErrorStatusCode(error) ?? 500,
        });
    }
}

function handleAdminSettingsError(
    request: FastifyRequest,
    reply: FastifyReply,
    error: unknown,
) {
    request.server.log.error(error);

    return sendError(request, reply, {
        message:
            error instanceof Error
                ? error.message
                : getApiContent("en").api.internalServerError,
        statusCode:
            error instanceof AdminRuleError
                ? error.statusCode
                : getErrorStatusCode(error) ?? 500,
    });
}

function requireSettingBody(
    request: FastifyRequest<{ Body?: UpsertSettingBody }>,
    reply: FastifyReply,
) {
    if (isPlainObject(request.body)) return request.body;

    sendError(request, reply, {
        message: "A valid settings body is required.",
        statusCode: 400,
    });

    return null;
}

async function getSettingsStates(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: { states: await adminService.getSettingsStates(pg) },
            message: "States fetched successfully.",
        });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsConfigurations(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        return sendSuccess(request, reply, {
            data: {
                configurations: await adminService.getSettingsConfigurations(pg),
            },
            message: "Configurations fetched successfully.",
        });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsConfiguration(
    request: FastifyRequest<{ Params: SettingConfigurationParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    if (!isNonEmptyString(request.params.key)) {
        return sendError(request, reply, {
            message: "A valid configuration key is required.",
            statusCode: 400,
        });
    }

    try {
        const configuration = await adminService.getSettingsConfiguration(
            pg,
            request.params.key,
        );
        if (!configuration) {
            return sendError(request, reply, {
                message: "Configuration not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: { configuration },
            message: "Configuration fetched successfully.",
        });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function createSettingsConfiguration(
    request: FastifyRequest<{ Body?: UpsertSettingBody }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await adminService.createSettingsConfiguration(pg, body),
            message: "Configuration created successfully.",
            statusCode: 201,
        });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function updateSettingsConfiguration(
    request: FastifyRequest<{
        Body?: UpsertSettingBody;
        Params: SettingConfigurationParams;
    }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;
    if (!isNonEmptyString(request.params.key)) {
        return sendError(request, reply, {
            message: "A valid configuration key is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.updateSettingsConfiguration(
            pg,
            request.params.key,
            body,
        );
        if (!result) {
            return sendError(request, reply, {
                message: "Configuration not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: result,
            message: "Configuration updated successfully.",
        });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function deleteSettingsConfiguration(
    request: FastifyRequest<{ Params: SettingConfigurationParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    if (!isNonEmptyString(request.params.key)) {
        return sendError(request, reply, {
            message: "A valid configuration key is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.deleteSettingsConfiguration(
            pg,
            request.params.key,
        );
        if (!result) {
            return sendError(request, reply, {
                message: "Configuration not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: result,
            message: "Configuration deactivated successfully.",
        });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsState(
    request: FastifyRequest<{ Params: SettingItemParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });

    try {
        const state = await adminService.getSettingsState(pg, id);
        if (!state) return sendError(request, reply, { message: "State not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: { state }, message: "State fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function createSettingsState(
    request: FastifyRequest<{ Body?: UpsertSettingBody }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;

    try {
        return sendSuccess(request, reply, {
            data: await adminService.createSettingsState(pg, body),
            message: "State created successfully.",
            statusCode: 201,
        });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function updateSettingsState(
    request: FastifyRequest<{ Body?: UpsertSettingBody; Params: SettingItemParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    const id = parsePositiveInteger(request.params.id);
    if (!pg || !body) return reply;
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });

    try {
        const result = await adminService.updateSettingsState(pg, id, body);
        if (!result) return sendError(request, reply, { message: "State not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "State updated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function deleteSettingsState(
    request: FastifyRequest<{ Params: SettingItemParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });

    try {
        const result = await adminService.deleteSettingsState(pg, id);
        if (!result) return sendError(request, reply, { message: "State not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "State deactivated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsDistricts(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    try {
        return sendSuccess(request, reply, { data: { districts: await adminService.getSettingsDistricts(pg) }, message: "Districts fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsDistrict(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const district = await adminService.getSettingsDistrict(pg, id);
        if (!district) return sendError(request, reply, { message: "District not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: { district }, message: "District fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function createSettingsDistrict(request: FastifyRequest<{ Body?: UpsertSettingBody }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;
    try {
        return sendSuccess(request, reply, { data: await adminService.createSettingsDistrict(pg, body), message: "District created successfully.", statusCode: 201 });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function updateSettingsDistrict(request: FastifyRequest<{ Body?: UpsertSettingBody; Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    const id = parsePositiveInteger(request.params.id);
    if (!pg || !body) return reply;
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.updateSettingsDistrict(pg, id, body);
        if (!result) return sendError(request, reply, { message: "District not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "District updated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function deleteSettingsDistrict(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.deleteSettingsDistrict(pg, id);
        if (!result) return sendError(request, reply, { message: "District not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "District deactivated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsInstituteTypes(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    try {
        return sendSuccess(request, reply, { data: { instituteTypes: await adminService.getSettingsInstituteTypes(pg) }, message: "Institute types fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsInstituteType(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const instituteType = await adminService.getSettingsInstituteType(pg, id);
        if (!instituteType) return sendError(request, reply, { message: "Institute type not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: { instituteType }, message: "Institute type fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function createSettingsInstituteType(request: FastifyRequest<{ Body?: UpsertSettingBody }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;
    try {
        return sendSuccess(request, reply, { data: await adminService.createSettingsInstituteType(pg, body), message: "Institute type created successfully.", statusCode: 201 });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function updateSettingsInstituteType(request: FastifyRequest<{ Body?: UpsertSettingBody; Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    const id = parsePositiveInteger(request.params.id);
    if (!pg || !body) return reply;
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.updateSettingsInstituteType(pg, id, body);
        if (!result) return sendError(request, reply, { message: "Institute type not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "Institute type updated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function deleteSettingsInstituteType(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.deleteSettingsInstituteType(pg, id);
        if (!result) return sendError(request, reply, { message: "Institute type not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "Institute type deactivated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsParticipantCategories(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    try {
        return sendSuccess(request, reply, { data: { participantCategories: await adminService.getSettingsParticipantCategories(pg) }, message: "Participant categories fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsParticipantCategory(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const participantCategory = await adminService.getSettingsParticipantCategory(pg, id);
        if (!participantCategory) return sendError(request, reply, { message: "Participant category not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: { participantCategory }, message: "Participant category fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function createSettingsParticipantCategory(request: FastifyRequest<{ Body?: UpsertSettingBody }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;
    try {
        return sendSuccess(request, reply, { data: await adminService.createSettingsParticipantCategory(pg, body), message: "Participant category created successfully.", statusCode: 201 });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function updateSettingsParticipantCategory(request: FastifyRequest<{ Body?: UpsertSettingBody; Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    const id = parsePositiveInteger(request.params.id);
    if (!pg || !body) return reply;
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.updateSettingsParticipantCategory(pg, id, body);
        if (!result) return sendError(request, reply, { message: "Participant category not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "Participant category updated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function deleteSettingsParticipantCategory(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.deleteSettingsParticipantCategory(pg, id);
        if (!result) return sendError(request, reply, { message: "Participant category not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "Participant category deactivated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsChallengeCategories(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    try {
        return sendSuccess(request, reply, { data: { challengeCategories: await adminService.getSettingsChallengeCategories(pg) }, message: "Challenge categories fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsChallengeCategory(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const challengeCategory = await adminService.getSettingsChallengeCategory(pg, id);
        if (!challengeCategory) return sendError(request, reply, { message: "Challenge category not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: { challengeCategory }, message: "Challenge category fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function createSettingsChallengeCategory(request: FastifyRequest<{ Body?: UpsertSettingBody }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;
    try {
        return sendSuccess(request, reply, { data: await adminService.createSettingsChallengeCategory(pg, body), message: "Challenge category created successfully.", statusCode: 201 });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function updateSettingsChallengeCategory(request: FastifyRequest<{ Body?: UpsertSettingBody; Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    const id = parsePositiveInteger(request.params.id);
    if (!pg || !body) return reply;
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.updateSettingsChallengeCategory(pg, id, body);
        if (!result) return sendError(request, reply, { message: "Challenge category not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "Challenge category updated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function deleteSettingsChallengeCategory(request: FastifyRequest<{ Params: SettingItemParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const id = parsePositiveInteger(request.params.id);
    if (!id) return sendError(request, reply, { message: "A valid id is required.", statusCode: 400 });
    try {
        const result = await adminService.deleteSettingsChallengeCategory(pg, id);
        if (!result) return sendError(request, reply, { message: "Challenge category not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "Challenge category deactivated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsUserRoles(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    try {
        return sendSuccess(request, reply, { data: { userRoles: await adminService.getSettingsUserRoles(pg) }, message: "User roles fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getSettingsUserRole(request: FastifyRequest<{ Params: SettingRoleParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    if (!isNonEmptyString(request.params.role)) return sendError(request, reply, { message: "A valid role is required.", statusCode: 400 });
    try {
        const userRole = await adminService.getSettingsUserRole(pg, request.params.role);
        if (!userRole) return sendError(request, reply, { message: "User role not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: { userRole }, message: "User role fetched successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function createSettingsUserRole(request: FastifyRequest<{ Body?: UpsertSettingBody }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;
    try {
        return sendSuccess(request, reply, { data: await adminService.createSettingsUserRole(pg, body), message: "User role created successfully.", statusCode: 201 });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function updateSettingsUserRole(request: FastifyRequest<{ Body?: UpsertSettingBody; Params: SettingRoleParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    const body = requireSettingBody(request, reply);
    if (!pg || !body) return reply;
    if (!isNonEmptyString(request.params.role)) return sendError(request, reply, { message: "A valid role is required.", statusCode: 400 });
    try {
        const result = await adminService.updateSettingsUserRole(pg, request.params.role, body);
        if (!result) return sendError(request, reply, { message: "User role not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "User role updated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function deleteSettingsUserRole(request: FastifyRequest<{ Params: SettingRoleParams }>, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    if (!isNonEmptyString(request.params.role)) return sendError(request, reply, { message: "A valid role is required.", statusCode: 400 });
    try {
        const result = await adminService.deleteSettingsUserRole(pg, request.params.role);
        if (!result) return sendError(request, reply, { message: "User role not found.", statusCode: 404 });
        return sendSuccess(request, reply, { data: result, message: "User role deactivated successfully." });
    } catch (error) {
        return handleAdminSettingsError(request, reply, error);
    }
}

async function getApplications(
    request: FastifyRequest<{ Querystring: ApplicationsQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const page = parsePositiveInteger(request.query.page) ?? 1;
    const pageSize = parsePositiveInteger(request.query.pageSize) ?? 10;

    try {
        const result = await adminService.getApplications(pg, {
            page,
            pageSize,
            search: request.query.search,
            sortBy: normalizeSortBy(request.query.sortBy),
            sortDirection: normalizeSortDirection(request.query.sortDirection),
            status: request.query.status,
        });

        return sendSuccess(request, reply, {
            data: result,
            message: "Applications fetched successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: getApiContent("en").api.internalServerError,
            statusCode: 500,
        });
    }
}

async function getApplication(
    request: FastifyRequest<{ Params: ApplicationParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const applicationId = parsePositiveInteger(request.params.applicationId);

    if (!applicationId) {
        return sendError(request, reply, {
            message: "A valid application id is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.getApplications(pg, {
            applicationId,
            pageSize: 1,
        });
        const application = result.applications[0];

        if (!application) {
            return sendError(request, reply, {
                message: "Application not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: { application },
            message: "Application fetched successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: getApiContent("en").api.internalServerError,
            statusCode: 500,
        });
    }
}

async function updateApplication(
    request: FastifyRequest<{
        Body?: UpdateApplicationBody;
        Params: ApplicationParams;
    }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const applicationId = parsePositiveInteger(request.params.applicationId);

    if (!applicationId) {
        return sendError(request, reply, {
            message: "A valid application id is required.",
            statusCode: 400,
        });
    }

    if (!isPlainObject(request.body)) {
        return sendError(request, reply, {
            message: "A valid application update body is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.updateApplication(pg, {
            applicationId,
            values: request.body,
        });

        if (!result) {
            return sendError(request, reply, {
                message: "Application not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: result,
            message: "Application updated successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent("en").api.internalServerError,
            statusCode:
                error instanceof AdminRuleError
                    ? error.statusCode
                    : getErrorStatusCode(error) ?? 500,
        });
    }
}

async function deleteApplication(
    request: FastifyRequest<{ Params: ApplicationParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const applicationId = parsePositiveInteger(request.params.applicationId);

    if (!applicationId) {
        return sendError(request, reply, {
            message: "A valid application id is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.deleteApplication(pg, applicationId);

        if (!result) {
            return sendError(request, reply, {
                message: "Application not found.",
                statusCode: 404,
            });
        }

        const fileDeleteResults = await Promise.allSettled(
            result.documents.map(async (document) => {
                const filePath = await resolveStoredFilePath(document.storageKey);
                if (!filePath) return false;
                await unlink(filePath);
                return true;
            }),
        );
        const filesDeleted = fileDeleteResults.filter(
            (fileResult) => fileResult.status === "fulfilled" && fileResult.value,
        ).length;
        const fileDeleteFailures = fileDeleteResults.filter(
            (fileResult) => fileResult.status === "rejected",
        ).length;

        return sendSuccess(request, reply, {
            data: {
                ...result,
                fileDeleteFailures,
                filesDeleted,
            },
            message: "Application deleted successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent("en").api.internalServerError,
            statusCode: getErrorStatusCode(error) ?? 500,
        });
    }
}

async function downloadApplicationDocument(
    request: FastifyRequest<{ Params: ApplicationDocumentParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const applicationId = parsePositiveInteger(request.params.applicationId);
    const documentId = parsePositiveInteger(request.params.documentId);

    if (!applicationId || !documentId) {
        return sendError(request, reply, {
            message: "A valid application id and document id are required.",
            statusCode: 400,
        });
    }

    try {
        const document = await adminService.getApplicationDocumentDownload(pg, {
            applicationId,
            documentId,
        });

        if (!document) {
            return sendError(request, reply, {
                message: "Document not found.",
                statusCode: 404,
            });
        }

        const filePath = await resolveStoredFilePath(document.storageKey);

        if (!filePath) {
            return sendError(request, reply, {
                message: "Document file not found on server.",
                statusCode: 404,
            });
        }

        return reply
            .header("Content-Type", document.mimeType)
            .header("Content-Length", String(document.fileSizeBytes))
            .header(
                "Content-Disposition",
                contentDispositionFileName(document.originalFileName),
            )
            .send(createReadStream(filePath));
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: "Document could not be downloaded.",
            statusCode: 404,
        });
    }
}

async function deleteApplicationDocument(
    request: FastifyRequest<{ Params: ApplicationDocumentParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const applicationId = parsePositiveInteger(request.params.applicationId);
    const documentId = parsePositiveInteger(request.params.documentId);

    if (!applicationId || !documentId) {
        return sendError(request, reply, {
            message: "A valid application id and document id are required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.deleteApplicationDocument(pg, {
            applicationId,
            documentId,
        });

        if (!result) {
            return sendError(request, reply, {
                message: "Document not found.",
                statusCode: 404,
            });
        }

        const filePath = await resolveStoredFilePath(result.document.storageKey);
        let fileDeleted = false;

        if (filePath) {
            await unlink(filePath);
            fileDeleted = true;
        }

        return sendSuccess(request, reply, {
            data: {
                ...result,
                fileDeleted,
            },
            message: "Document deleted successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: "Document could not be deleted.",
            statusCode: 500,
        });
    }
}

async function downloadApplicationPdf(
    request: FastifyRequest<{ Params: ApplicationParams }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    const applicationId = parsePositiveInteger(request.params.applicationId);

    if (!applicationId) {
        return sendError(request, reply, {
            message: "A valid application id is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await adminService.getApplications(pg, {
            applicationId,
            pageSize: 1,
        });
        const application = result.applications[0];

        if (!application) {
            return sendError(request, reply, {
                message: "Application not found.",
                statusCode: 404,
            });
        }

        const pdf = generateApplicationPdf(application);
        const applicationNumber =
            typeof application.applicationNumber === "string"
                ? application.applicationNumber
                : `application-${applicationId}`;

        return reply
            .header("Content-Type", "application/pdf")
            .header("Content-Length", String(pdf.length))
            .header(
                "Content-Disposition",
                contentDispositionFileName(`${applicationNumber}.pdf`),
            )
            .send(pdf);
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: "Application PDF could not be generated.",
            statusCode: 500,
        });
    }
}

async function getPageViewAnalytics(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        const result = await adminService.getPageViewAnalytics(pg);

        return sendSuccess(request, reply, {
            data: result,
            message: "Page view analytics fetched successfully.",
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: getApiContent("en").api.internalServerError,
            statusCode: 500,
        });
    }
}

async function getDashboardOrganisationTypeCounts(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        const result = await adminService.getDashboardOrganisationTypeCounts(pg);

        return sendSuccess(request, reply, {
            data: result,
            message: getApiContent("en").api.adminDashboardCountsFetched,
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: getApiContent("en").api.internalServerError,
            statusCode: 500,
        });
    }
}

async function getDashboardChallengeCategoryCounts(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;

    try {
        const result = await adminService.getDashboardChallengeCategoryCounts(pg);

        return sendSuccess(request, reply, {
            data: result,
            message: getApiContent("en").api.adminDashboardCountsFetched,
        });
    } catch (error) {
        request.server.log.error(error);

        return sendError(request, reply, {
            message: getApiContent("en").api.internalServerError,
            statusCode: 500,
        });
    }
}

export const adminController = {
    createSettingsChallengeCategory,
    createSettingsConfiguration,
    createSettingsDistrict,
    createSettingsInstituteType,
    createSettingsParticipantCategory,
    createSettingsState,
    createSettingsUserRole,
    createUser,
    deleteApplication,
    deleteApplicationDocument,
    deleteSettingsChallengeCategory,
    deleteSettingsConfiguration,
    deleteSettingsDistrict,
    deleteSettingsInstituteType,
    deleteSettingsParticipantCategory,
    deleteSettingsState,
    deleteSettingsUserRole,
    deleteUser,
    downloadApplicationDocument,
    downloadApplicationPdf,
    getApplication,
    getApplications,
    getDashboardChallengeCategoryCounts,
    getDashboardCounts,
    getDashboardOrganisationTypeCounts,
    getPageViewAnalytics,
    getSettingsChallengeCategories,
    getSettingsChallengeCategory,
    getSettingsConfiguration,
    getSettingsConfigurations,
    getSettingsDistrict,
    getSettingsDistricts,
    getSettingsInstituteType,
    getSettingsInstituteTypes,
    getSettingsParticipantCategories,
    getSettingsParticipantCategory,
    getSettingsState,
    getSettingsStates,
    getSettingsUserRole,
    getSettingsUserRoles,
    getUser,
    getUsers,
    requestLoginCode,
    resendLoginCode,
    updateSettingsChallengeCategory,
    updateSettingsConfiguration,
    updateSettingsDistrict,
    updateSettingsInstituteType,
    updateSettingsParticipantCategory,
    updateSettingsState,
    updateSettingsUserRole,
    updateApplication,
    updateUser,
    verifyLoginCode,
};
