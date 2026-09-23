import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getApiContent } from "../../content/index.js";
import { sendError, sendSuccess } from "../common/api-response.js";
import { generateApplicationPdf } from "../admin/admin-application-pdf.js";
import type { AuthenticatedParticipantRequest } from "./participant-auth.js";
import {
    participantService,
    type DatabasePool,
} from "./participant.service.js";

type FastifyWithDatabase = FastifyInstance & {
    pg: DatabasePool;
};

type StoredSupportingDocument = {
    checksumSha256: string;
    mimeType: string;
    originalFileName: string;
    size: number;
    storageKey: string;
};

type LoginBody = {
    email?: string;
    language?: string;
};

type VerifyLoginBody = LoginBody & {
    code?: string;
};

type ApplicationsQuery = {
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortDirection?: string;
    status?: string;
};

type ApplicationParams = {
    applicationHash?: string;
};

type ApplicationDocumentParams = ApplicationParams & {
    documentId?: string;
};

type SubmitApplicationBody = {
    address?: string;
    beneficiaries?: string;
    challengeCategoryId?: number | string;
    city?: string;
    costFunding?: string;
    districtId?: number | string;
    expectedImpact?: string;
    highestEducationalQualification?: string;
    implementationRoute?: string;
    intellectualPropertyPublication?: string;
    instituteName?: string;
    instituteType?: string;
    language?: string;
    lastAttendedEducationalInstitute?: string;
    mentorAcknowledgeTo?: string;
    otherInstituteType?: string;
    participationMode?: string;
    pinCode?: string;
    problemLocation?: string;
    projectTimeline?: string;
    proposedSolution?: string;
    prototypePilot?: string;
    scalability?: string;
    stateId?: number | string;
    supportingDocuments?: Array<{
        checksumSha256?: string;
        mimeType?: string;
        name?: string;
        originalFileName?: string;
        size?: number;
        storageKey?: string;
        type?: string;
    }>;
    teamMembers?: Array<{ email?: string; fullName?: string; mobile?: string }>;
    technologyMethod?: string;
    theme?: string;
    videoUrl?: string;
    yearOfPassing?: string;
};

const editableApplicationStatuses = new Set([
    "draft",
    "email_verification",
    "profile_completion",
    "proposal_submission",
]);

const maxSupportingDocuments = Number(
    process.env.SUPPORTING_DOCUMENT_MAX_FILES ?? 3,
);
const maxSupportingDocumentSizeMb = Number(
    process.env.SUPPORTING_DOCUMENT_MAX_SIZE_MB ?? 2,
);
const maxSupportingDocumentSizeBytes =
    maxSupportingDocumentSizeMb * 1024 * 1024;
const apiPackageRoot = resolve(__dirname, "../../..");

function getUploadRoot() {
    const configuredRoot =
        process.env.UPLOAD_DIR ?? process.env.LOCAL_STORAGE_DIR ?? "uploads";

    return resolve(apiPackageRoot, configuredRoot);
}

function getUploadRootCandidates() {
    const configuredRoot =
        process.env.UPLOAD_DIR ?? process.env.LOCAL_STORAGE_DIR ?? "uploads";

    return Array.from(
        new Set([
            resolve(process.cwd(), configuredRoot),
            resolve(apiPackageRoot, configuredRoot),
            resolve(process.cwd(), "apps/api", configuredRoot),
        ]),
    );
}

function sanitizeFileName(fileName: string) {
    return basename(fileName)
        .replace(/[^A-Za-z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 120);
}

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

function normalizeNumericText(value: string) {
    return normalizeLocalizedDigits(value).replace(/\D/g, "");
}

function numericId(value: unknown) {
    const numericValue =
        typeof value === "number" ? value : Number(String(value ?? "").trim());

    return Number.isInteger(numericValue) && numericValue > 0
        ? numericValue
        : undefined;
}

function isPdfDocument(input: { mimeType?: string; name: string }) {
    return (
        input.mimeType === "application/pdf" ||
        input.name.toLowerCase().endsWith(".pdf")
    );
}

function requiredText(
    body: SubmitApplicationBody,
    field: keyof SubmitApplicationBody,
    errors: string[],
    fieldRequired: (field: string) => string,
) {
    const value = body[field];
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) errors.push(fieldRequired(String(field)));

    return text;
}

function validateSubmitApplicationBody(body: SubmitApplicationBody = {}) {
    const errors: string[] = [];
    const language = participantService.normalizeLanguage(
        body.language ?? "en",
    );
    const validationMessages = getApiContent(language).apiValidation;
    const stateId = numericId(body.stateId);
    const districtId = numericId(body.districtId);
    const challengeCategoryId = numericId(body.challengeCategoryId);
    const participationMode: "Individual" | "Team" =
        body.participationMode === "Team" ? "Team" : "Individual";
    const teamMembers = (body.teamMembers ?? [])
        .map((member) => ({
            email: isNonEmptyString(member.email)
                ? normalizeEmail(member.email)
                : "",
            fullName: isNonEmptyString(member.fullName)
                ? member.fullName.trim()
                : "",
            mobile: isNonEmptyString(member.mobile)
                ? normalizeNumericText(member.mobile)
                : "",
        }))
        .filter((member) => member.fullName || member.email || member.mobile);
    const supportingDocuments = (body.supportingDocuments ?? []).map(
        (document) => ({
            checksumSha256: String(document.checksumSha256 ?? ""),
            mimeType: String(document.mimeType ?? document.type ?? ""),
            originalFileName: String(
                document.originalFileName ?? document.name ?? "",
            ),
            size: Number(document.size ?? 0),
            storageKey: String(document.storageKey ?? ""),
        }),
    );

    if (!stateId) errors.push(validationMessages.stateIdRequired);
    if (!districtId) errors.push(validationMessages.districtIdRequired);
    if (!challengeCategoryId) {
        errors.push(validationMessages.fieldRequired("challengeCategoryId"));
    }
    if (!supportingDocuments.length) {
        errors.push(validationMessages.supportingDocumentRequired);
    }
    if (supportingDocuments.length > maxSupportingDocuments) {
        errors.push(
            validationMessages.supportingDocumentMax(maxSupportingDocuments),
        );
    }
    supportingDocuments.forEach((document) => {
        if (
            !document.originalFileName ||
            !document.storageKey ||
            !document.size ||
            !isPdfDocument({
                mimeType: document.mimeType,
                name: document.originalFileName,
            })
        ) {
            errors.push(validationMessages.supportingDocumentInvalid);
            return;
        }

        if (document.size > maxSupportingDocumentSizeBytes) {
            errors.push(
                validationMessages.supportingDocumentSize(
                    maxSupportingDocumentSizeMb,
                ),
            );
        }
    });
    if (participationMode === "Team" && teamMembers.length === 0) {
        errors.push(validationMessages.teamMemberRequired);
    }

    teamMembers.forEach((member, index) => {
        if (!member.fullName) {
            errors.push(validationMessages.teamMemberFullNameRequired(index));
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
            errors.push(validationMessages.teamMemberEmailInvalid(index));
        }
        if (!/^\d{10}$/.test(member.mobile)) {
            errors.push(validationMessages.teamMemberMobileInvalid(index));
        }
    });

    const value = {
        address: requiredText(
            body,
            "address",
            errors,
            validationMessages.fieldRequired,
        ),
        beneficiaries: requiredText(
            body,
            "beneficiaries",
            errors,
            validationMessages.fieldRequired,
        ),
        challengeCategoryId: challengeCategoryId ?? 0,
        city: requiredText(
            body,
            "city",
            errors,
            validationMessages.fieldRequired,
        ),
        costFunding: requiredText(
            body,
            "costFunding",
            errors,
            validationMessages.fieldRequired,
        ),
        districtId: districtId ?? 0,
        expectedImpact: requiredText(
            body,
            "expectedImpact",
            errors,
            validationMessages.fieldRequired,
        ),
        highestEducationalQualification: requiredText(
            body,
            "highestEducationalQualification",
            errors,
            validationMessages.fieldRequired,
        ),
        implementationRoute: requiredText(
            body,
            "implementationRoute",
            errors,
            validationMessages.fieldRequired,
        ),
        intellectualPropertyPublication: isNonEmptyString(
            body.intellectualPropertyPublication,
        )
            ? body.intellectualPropertyPublication.trim()
            : "",
        instituteName: requiredText(
            body,
            "instituteName",
            errors,
            validationMessages.fieldRequired,
        ),
        instituteType: requiredText(
            body,
            "instituteType",
            errors,
            validationMessages.fieldRequired,
        ),
        language,
        lastAttendedEducationalInstitute: requiredText(
            body,
            "lastAttendedEducationalInstitute",
            errors,
            validationMessages.fieldRequired,
        ),
        mentorAcknowledgeTo: isNonEmptyString(body.mentorAcknowledgeTo)
            ? body.mentorAcknowledgeTo.trim()
            : "",
        otherInstituteType: isNonEmptyString(body.otherInstituteType)
            ? body.otherInstituteType.trim()
            : "",
        participationMode,
        pinCode: normalizeNumericText(
            requiredText(
                body,
                "pinCode",
                errors,
                validationMessages.fieldRequired,
            ),
        ),
        problemLocation: requiredText(
            body,
            "problemLocation",
            errors,
            validationMessages.fieldRequired,
        ),
        projectTimeline: requiredText(
            body,
            "projectTimeline",
            errors,
            validationMessages.fieldRequired,
        ),
        proposedSolution: requiredText(
            body,
            "proposedSolution",
            errors,
            validationMessages.fieldRequired,
        ),
        prototypePilot: requiredText(
            body,
            "prototypePilot",
            errors,
            validationMessages.fieldRequired,
        ),
        scalability: requiredText(
            body,
            "scalability",
            errors,
            validationMessages.fieldRequired,
        ),
        stateId: stateId ?? 0,
        supportingDocuments,
        teamMembers,
        technologyMethod: requiredText(
            body,
            "technologyMethod",
            errors,
            validationMessages.fieldRequired,
        ),
        theme: isNonEmptyString(body.theme) ? body.theme.trim() : "",
        videoUrl: isNonEmptyString(body.videoUrl) ? body.videoUrl.trim() : "",
        yearOfPassing: normalizeNumericText(
            requiredText(
                body,
                "yearOfPassing",
                errors,
                validationMessages.fieldRequired,
            ),
        ),
    };

    if (!/^[0-9]{6}$/.test(value.pinCode)) {
        errors.push(validationMessages.pinCodeInvalid);
    }
    if (!/^(19|20)\d{2}$/.test(value.yearOfPassing)) {
        errors.push(validationMessages.fieldRequired("yearOfPassing"));
    }
    if (value.videoUrl) {
        try {
            const url = new URL(value.videoUrl);
            if (!["http:", "https:"].includes(url.protocol)) {
                errors.push(validationMessages.fieldRequired("videoUrl"));
            }
        } catch {
            errors.push(validationMessages.fieldRequired("videoUrl"));
        }
    }

    return { errors, value };
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

function parsePositiveInteger(value: string | undefined) {
    if (!value || !/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function storeSupportingDocument(input: { file: MultipartFile }) {
    const buffer = await input.file.toBuffer();
    const safeName = sanitizeFileName(input.file.filename || "document.pdf");
    const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
    const storageKey = join(
        "applications",
        "pending",
        `${Date.now()}-${randomUUID()}-${safeName}`,
    );
    const absolutePath = join(getUploadRoot(), storageKey);

    await mkdir(join(getUploadRoot(), "applications", "pending"), {
        recursive: true,
    });
    await writeFile(absolutePath, buffer);

    return {
        checksumSha256,
        mimeType: input.file.mimetype || "application/pdf",
        originalFileName: input.file.filename || safeName,
        size: buffer.length,
        storageKey,
    } satisfies StoredSupportingDocument;
}

async function relocateStoredDocuments(input: {
    applicationId: number;
    documents: StoredSupportingDocument[];
}) {
    const uploadRoot = getUploadRoot();
    const applicationDirectory = join(
        uploadRoot,
        "applications",
        String(input.applicationId),
    );

    await mkdir(applicationDirectory, { recursive: true });

    const mappings: Array<{ nextStorageKey: string; previousStorageKey: string }> =
        [];

    for (const document of input.documents) {
        const previousStorageKey = document.storageKey;
        const safeName = sanitizeFileName(
            document.originalFileName || basename(previousStorageKey),
        );
        const nextStorageKey = join(
            "applications",
            String(input.applicationId),
            `${Date.now()}-${randomUUID()}-${safeName}`,
        );

        await rename(
            join(uploadRoot, previousStorageKey),
            join(uploadRoot, nextStorageKey),
        );

        document.storageKey = nextStorageKey;
        mappings.push({ nextStorageKey, previousStorageKey });
    }

    return mappings;
}

async function cleanupStoredDocuments(documents: StoredSupportingDocument[]) {
    await Promise.allSettled(
        documents.map((document) =>
            unlink(join(getUploadRoot(), document.storageKey)),
        ),
    );
}

async function getSubmitApplicationBody(
    request: FastifyRequest<{ Body?: SubmitApplicationBody }>,
) {
    if (!request.isMultipart()) {
        return {
            body: request.body ?? {},
            storedDocuments: [] as StoredSupportingDocument[],
        };
    }

    let payload: SubmitApplicationBody = {};
    const storedDocuments: StoredSupportingDocument[] = [];

    for await (const part of request.parts()) {
        if (part.type === "field" && part.fieldname === "payload") {
            payload = JSON.parse(
                String(part.value ?? "{}"),
            ) as SubmitApplicationBody;
            continue;
        }

        if (part.type === "file" && part.fieldname === "supportingDocuments") {
            storedDocuments.push(await storeSupportingDocument({ file: part }));
        }
    }

    return {
        body: {
            ...payload,
            supportingDocuments: storedDocuments,
        },
        storedDocuments,
    };
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

function normalizeSortBy(value: string | undefined) {
    if (
        value === "applicationNumber" ||
        value === "challengeCategory" ||
        value === "createdAt" ||
        value === "participationMode" ||
        value === "status"
    ) {
        return value;
    }

    return "createdAt";
}

function normalizeSortDirection(value: string | undefined) {
    return value === "asc" ? "asc" : "desc";
}

function validateEmailBody(body: LoginBody = {}) {
    const language = participantService.normalizeLanguage(
        body.language ?? "en",
    );
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
        const result = await participantService.requestLoginCode(
            pg,
            validated.value,
        );

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
                    : getApiContent(validated.value.language).api
                          .participantLoginUnable,
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
        const result = await participantService.resendLoginCode(
            pg,
            validated.value,
        );

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
                    : getApiContent(validated.value.language).api
                          .participantLoginUnable,
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
                    : getApiContent(validated.value.language).api
                          .participantLoginUnable,
            statusCode: getErrorStatusCode(error) ?? 400,
        });
    }
}

async function submitApplication(
    request: FastifyRequest<{ Body?: SubmitApplicationBody }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const participant = (request as AuthenticatedParticipantRequest)
        .participant;
    const { body, storedDocuments } = await getSubmitApplicationBody(request);

    if (participant.role !== "applicant") {
        await cleanupStoredDocuments(storedDocuments);
        return sendError(request, reply, {
            message: "Only the applicant can create a new application.",
            statusCode: 403,
        });
    }

    const validated = validateSubmitApplicationBody(body);

    if (validated.errors.length) {
        await cleanupStoredDocuments(storedDocuments);
        return sendError(request, reply, {
            data: { errors: validated.errors },
            messageKey: "validationError",
            statusCode: 400,
        });
    }

    try {
        const result = await participantService.submitApplication(pg, {
            ...validated.value,
            email: participant.email,
        });
        const documentStorageMappings = await relocateStoredDocuments({
            applicationId: result.application.id,
            documents: storedDocuments,
        });

        await participantService.updateApplicationDocumentStorageKeys(pg, {
            applicationId: result.application.id,
            mappings: documentStorageMappings,
        });

        return sendSuccess(request, reply, {
            data: result,
            messageKey: "proposalSubmitted",
            statusCode: 201,
        });
    } catch (error) {
        await cleanupStoredDocuments(storedDocuments);
        request.server.log.error(error);

        return sendError(request, reply, {
            message:
                error instanceof Error
                    ? error.message
                    : getApiContent(validated.value.language).api
                          .unableSubmitProposal,
            statusCode: getErrorStatusCode(error) ?? 500,
        });
    }
}

async function getApplications(
    request: FastifyRequest<{ Querystring: ApplicationsQuery }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const participant = (request as AuthenticatedParticipantRequest)
        .participant;

    try {
        const result = await participantService.getApplications(pg, {
            email: participant.email,
            page: parsePositiveInteger(request.query.page) ?? 1,
            pageSize: parsePositiveInteger(request.query.pageSize) ?? 20,
            sortBy: normalizeSortBy(request.query.sortBy),
            sortDirection: normalizeSortDirection(request.query.sortDirection),
            status: request.query.status,
        });

        return sendSuccess(request, reply, {
            data: result,
            message: "Participant applications fetched successfully.",
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

async function getProfile(request: FastifyRequest, reply: FastifyReply) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const participant = (request as AuthenticatedParticipantRequest).participant;

    try {
        const result = await participantService.getProfile(pg, {
            email: participant.email,
        });

        if (!result) {
            return sendError(request, reply, {
                message: "Participant profile was not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: result,
            message: "Participant profile fetched successfully.",
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

async function getApplication(
    request: FastifyRequest<{
        Params: ApplicationParams;
    }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const participant = (request as AuthenticatedParticipantRequest)
        .participant;
    const applicationHash = request.params.applicationHash ?? "";

    if (!/^[a-f0-9]{32}$/i.test(applicationHash)) {
        return sendError(request, reply, {
            message: "A valid application id is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await participantService.getApplication(pg, {
            applicationHash,
            email: participant.email,
        });

        if (!result) {
            return sendError(request, reply, {
                message: "Application details were not found.",
                statusCode: 404,
            });
        }

        return sendSuccess(request, reply, {
            data: result,
            message: "Participant application fetched successfully.",
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
    request: FastifyRequest<{
        Params: ApplicationDocumentParams;
    }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const participant = (request as AuthenticatedParticipantRequest)
        .participant;
    const applicationHash = request.params.applicationHash ?? "";
    const documentId = parsePositiveInteger(request.params.documentId);

    if (!/^[a-f0-9]{32}$/i.test(applicationHash) || !documentId) {
        return sendError(request, reply, {
            message: "A valid application id and document id are required.",
            statusCode: 400,
        });
    }

    try {
        const document =
            await participantService.getApplicationDocumentDownload(pg, {
                applicationHash,
                documentId,
                email: participant.email,
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
            statusCode: 500,
        });
    }
}

async function downloadApplicationPdf(
    request: FastifyRequest<{
        Params: ApplicationParams;
    }>,
    reply: FastifyReply,
) {
    const pg = requireDatabase(request, reply);
    if (!pg) return reply;
    const participant = (request as AuthenticatedParticipantRequest)
        .participant;
    const applicationHash = request.params.applicationHash ?? "";

    if (!/^[a-f0-9]{32}$/i.test(applicationHash)) {
        return sendError(request, reply, {
            message: "A valid application id is required.",
            statusCode: 400,
        });
    }

    try {
        const result = await participantService.getApplication(pg, {
            applicationHash,
            email: participant.email,
        });
        const application = result?.application;

        if (!application) {
            return sendError(request, reply, {
                message: "Application details were not found.",
                statusCode: 404,
            });
        }

        if (editableApplicationStatuses.has(application.status ?? "")) {
            return sendError(request, reply, {
                message: "Application download is available after submission.",
                statusCode: 403,
            });
        }

        const pdf = generateApplicationPdf(application);
        const applicationNumber =
            typeof application.applicationNumber === "string"
                ? application.applicationNumber
                : `application-${application.applicationHash}`;

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

export const participantController = {
    downloadApplicationDocument,
    downloadApplicationPdf,
    getApplication,
    getApplications,
    getProfile,
    requestLoginCode,
    resendLoginCode,
    submitApplication,
    verifyLoginCode,
};
