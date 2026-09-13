import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "../common/api-response.js";
import { getApiContent } from "../../content/index.js";
import {
  DuplicateRegistrationError,
  registrationService,
  type DatabasePool,
} from "./registration.service.js";

type FastifyWithDatabase = FastifyInstance & {
  pg: DatabasePool;
};

type CreateRegistrationBody = {
  email?: string;
  fullName?: string;
  language?: string;
  mobile?: string;
  participantCategory?: string;
};

type VerifyEmailQuery = {
  applicationId?: string;
  code?: string;
  locale?: string;
  token?: string;
};

type VerifyEmailBody = {
  applicationId?: number | string;
  code?: string;
  language?: string;
};

type RegistrationParams = {
  id: string;
};

type SubmitProposalBody = {
  address?: string;
  beneficiaries?: string;
  city?: string;
  costFunding?: string;
  districtId?: number | string;
  expectedImpact?: string;
  implementationRoute?: string;
  instituteName?: string;
  instituteType?: string;
  language?: string;
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
};

type StoredSupportingDocument = {
  checksumSha256: string;
  mimeType: string;
  originalFileName: string;
  size: number;
  storageKey: string;
};

const maxSupportingDocuments = Number(
  process.env.SUPPORTING_DOCUMENT_MAX_FILES ?? 3,
);
const maxSupportingDocumentSizeMb = Number(
  process.env.SUPPORTING_DOCUMENT_MAX_SIZE_MB ?? 2,
);
const maxSupportingDocumentSizeBytes =
  maxSupportingDocumentSizeMb * 1024 * 1024;

function getUploadRoot() {
  return resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads"));
}

function sanitizeFileName(fileName: string) {
  return basename(fileName)
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function isPdfDocument(input: { mimeType?: string; name: string }) {
  return (
    input.mimeType === "application/pdf" ||
    input.name.toLowerCase().endsWith(".pdf")
  );
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

function normalizeVerificationCode(value: unknown) {
  return isNonEmptyString(value) ? normalizeNumericText(value).slice(0, 6) : "";
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
  return value.replace(/[০-৯०-९]/g, (digit) => {
    const codePoint = digit.codePointAt(0) ?? 0;

    if (codePoint >= 0x09e6 && codePoint <= 0x09ef) {
      return String(codePoint - 0x09e6);
    }

    if (codePoint >= 0x0966 && codePoint <= 0x096f) {
      return String(codePoint - 0x0966);
    }

    return digit;
  });
}

function normalizeNumericText(value: string) {
  return normalizeLocalizedDigits(value).replace(/\D/g, "");
}

function validateCreateRegistrationBody(body: CreateRegistrationBody) {
  const errors: string[] = [];
  const email = isNonEmptyString(body.email) ? normalizeEmail(body.email) : "";
  const fullName = isNonEmptyString(body.fullName) ? body.fullName.trim() : "";
  const mobile = isNonEmptyString(body.mobile)
    ? normalizeNumericText(body.mobile)
    : "";
  const participantCategory = isNonEmptyString(body.participantCategory)
    ? body.participantCategory.trim()
    : "";
  const language = registrationService.normalizeLanguage(body.language ?? "en");
  const validationMessages = getApiContent(language).apiValidation;

  if (!participantCategory) {
    errors.push(validationMessages.participantCategoryRequired);
  }
  if (!fullName) errors.push(validationMessages.fullNameRequired);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(validationMessages.validEmailRequired);
  }
  if (!/^\d{10}$/.test(mobile)) {
    errors.push(validationMessages.validMobileRequired);
  }

  return {
    errors,
    value: {
      email,
      fullName,
      language,
      mobile,
      participantCategory,
    },
  };
}

function numericId(value: unknown) {
  const numericValue =
    typeof value === "number" ? value : Number(String(value ?? "").trim());

  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : undefined;
}

function requiredText(
  body: SubmitProposalBody,
  field: keyof SubmitProposalBody,
  errors: string[],
  fieldRequired: (field: string) => string,
) {
  const value = body[field];
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) errors.push(fieldRequired(String(field)));

  return text;
}

function validateSubmitProposalBody(body: SubmitProposalBody) {
  const errors: string[] = [];
  const language = registrationService.normalizeLanguage(body.language ?? "en");
  const validationMessages = getApiContent(language).apiValidation;
  const stateId = numericId(body.stateId);
  const districtId = numericId(body.districtId);
  const participationMode: "Individual" | "Team" =
    body.participationMode === "Team" ? "Team" : "Individual";
  const teamMembers = (body.teamMembers ?? [])
    .map((member) => ({
      email: isNonEmptyString(member.email) ? normalizeEmail(member.email) : "",
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
      originalFileName: String(document.originalFileName ?? document.name ?? ""),
      size: Number(document.size ?? 0),
      storageKey: String(document.storageKey ?? ""),
    }),
  );

  if (!stateId) errors.push(validationMessages.stateIdRequired);
  if (!districtId) errors.push(validationMessages.districtIdRequired);
  if (!supportingDocuments.length) {
    errors.push(validationMessages.supportingDocumentRequired);
  }
  if (supportingDocuments.length > maxSupportingDocuments) {
    errors.push(validationMessages.supportingDocumentMax(maxSupportingDocuments));
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
        validationMessages.supportingDocumentSize(maxSupportingDocumentSizeMb),
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
    address: requiredText(body, "address", errors, validationMessages.fieldRequired),
    beneficiaries: requiredText(
      body,
      "beneficiaries",
      errors,
      validationMessages.fieldRequired,
    ),
    city: requiredText(body, "city", errors, validationMessages.fieldRequired),
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
    implementationRoute: requiredText(
      body,
      "implementationRoute",
      errors,
      validationMessages.fieldRequired,
    ),
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
    otherInstituteType: isNonEmptyString(body.otherInstituteType)
      ? body.otherInstituteType.trim()
      : "",
    participationMode,
    pinCode: normalizeNumericText(
      requiredText(body, "pinCode", errors, validationMessages.fieldRequired),
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
    theme: requiredText(body, "theme", errors, validationMessages.fieldRequired),
  };

  if (!/^[0-9]{4,10}$/.test(value.pinCode)) {
    errors.push(validationMessages.pinCodeInvalid);
  }

  return { errors, value };
}

function wantsJson(request: FastifyRequest) {
  return request.headers.accept?.includes("application/json") ?? false;
}

async function storeSupportingDocument(input: {
  applicationId: number;
  file: MultipartFile;
}) {
  const buffer = await input.file.toBuffer();
  const safeName = sanitizeFileName(input.file.filename || "document.pdf");
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
  const storageKey = join(
    "applications",
    String(input.applicationId),
    `${Date.now()}-${randomUUID()}-${safeName}`,
  );
  const absolutePath = join(getUploadRoot(), storageKey);

  await mkdir(join(getUploadRoot(), "applications", String(input.applicationId)), {
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

async function cleanupStoredDocuments(documents: StoredSupportingDocument[]) {
  await Promise.allSettled(
    documents.map((document) => unlink(join(getUploadRoot(), document.storageKey))),
  );
}

async function getSubmitProposalBody(
  request: FastifyRequest<{ Body: SubmitProposalBody }>,
  applicationId: number,
) {
  if (!request.isMultipart()) {
    return {
      body: request.body ?? {},
      storedDocuments: [] as StoredSupportingDocument[],
    };
  }

  let payload: SubmitProposalBody = {};
  const storedDocuments: StoredSupportingDocument[] = [];

  for await (const part of request.parts()) {
    if (part.type === "field" && part.fieldname === "payload") {
      payload = JSON.parse(String(part.value ?? "{}")) as SubmitProposalBody;
      continue;
    }

    if (part.type === "file" && part.fieldname === "supportingDocuments") {
      storedDocuments.push(
        await storeSupportingDocument({
          applicationId,
          file: part,
        }),
      );
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

async function createRegistration(
  request: FastifyRequest<{ Body: CreateRegistrationBody }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const validated = validateCreateRegistrationBody(request.body ?? {});
  if (validated.errors.length) {
    return sendError(request, reply, {
      data: {
        errors: validated.errors,
      },
      messageKey: "validationError",
      statusCode: 400,
    });
  }

  try {
    const result = await registrationService.createRegistration(
      pg,
      validated.value,
    );

    return sendSuccess(request, reply, {
      data: result,
      messageKey: "registrationCreated",
      statusCode: 201,
    });
  } catch (error) {
    request.server.log.error(error);

    const message =
      error instanceof Error
        ? error.message
        : getApiContent(validated.value.language).api.unableCreateRegistration;

    return sendError(request, reply, {
      message,
      statusCode:
        error instanceof DuplicateRegistrationError
          ? 409
          : (getErrorStatusCode(error) ?? 500),
    });
  }
}

async function verifyEmail(
  request: FastifyRequest<{
    Body?: VerifyEmailBody;
    Querystring: VerifyEmailQuery;
  }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const token =
    normalizeVerificationCode(request.body?.code) ||
    normalizeVerificationCode(request.query.code) ||
    request.query.token?.trim();
  const applicationId =
    numericId(request.body?.applicationId) ?? numericId(request.query.applicationId);
  const language = registrationService.normalizeLanguage(
    request.body?.language ?? request.query.locale ?? "en",
  );

  if (!token) {
    return sendError(request, reply, {
      messageKey: "verificationCodeRequired",
      statusCode: 400,
    });
  }

  try {
    const result = await registrationService.verifyEmail(pg, token, applicationId);

    if (wantsJson(request)) {
      return sendSuccess(request, reply, {
        data: result,
        messageKey: "emailVerified",
      });
    }

    return reply.redirect(
      registrationService.buildRedirectUrl({
        application: result.application,
        language,
        verified: true,
      }),
    );
  } catch (error) {
    request.server.log.error(error);

    if (!wantsJson(request)) {
      const fallback = new URL(
        `${process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${language}/register`,
      );
      fallback.searchParams.set("emailVerified", "0");
      fallback.searchParams.set("verificationError", "invalid");

      return reply.redirect(fallback.toString());
    }

    return sendError(request, reply, {
      message:
        error instanceof Error
          ? error.message
          : getApiContent(language).api.unableVerifyEmail,
      statusCode: getErrorStatusCode(error) ?? 400,
    });
  }
}

async function resendVerificationEmail(
  request: FastifyRequest<{
    Body?: { language?: string };
    Params: RegistrationParams;
  }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const id = request.params.id.trim();
  if (!/^\d+$/.test(id)) {
    return sendError(request, reply, {
      messageKey: "registrationIdNumeric",
      statusCode: 400,
    });
  }

  const language = registrationService.normalizeLanguage(
    request.body?.language ?? "en",
  );

  try {
    const result = await registrationService.resendVerificationEmail(
      pg,
      Number(id),
      language,
    );

    return sendSuccess(request, reply, {
      data: result,
      messageKey: "verificationEmailSent",
    });
  } catch (error) {
    request.server.log.error(error);

    return sendError(request, reply, {
      message:
        error instanceof Error
          ? error.message
          : getApiContent(language).api.unableCreateRegistration,
      statusCode: getErrorStatusCode(error) ?? 400,
    });
  }
}

async function getRegistration(
  request: FastifyRequest<{ Params: RegistrationParams }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;

  const id = request.params.id.trim();
  if (!/^\d+$/.test(id)) {
    return sendError(request, reply, {
      messageKey: "registrationIdNumeric",
      statusCode: 400,
    });
  }

  try {
    const result = await registrationService.getRegistration(pg, Number(id));
    if (!result) {
      return sendError(request, reply, {
        messageKey: "registrationNotFound",
        statusCode: 404,
      });
    }

    return sendSuccess(request, reply, {
      data: result,
      messageKey: "registrationFetched",
    });
  } catch (error) {
    request.server.log.error(error);

    return sendError(request, reply, {
      messageKey: "unableFetchRegistration",
      statusCode: 500,
    });
  }
}

async function submitProposal(
  request: FastifyRequest<{
    Body: SubmitProposalBody;
    Params: RegistrationParams;
  }>,
  reply: FastifyReply,
) {
  const pg = requireDatabase(request, reply);
  if (!pg) return reply;
  let storedDocuments: StoredSupportingDocument[] = [];

  const id = request.params.id.trim();
  if (!/^\d+$/.test(id)) {
    return sendError(request, reply, {
      messageKey: "registrationIdNumeric",
      statusCode: 400,
    });
  }

  try {
    const multipartResult = await getSubmitProposalBody(request, Number(id));
    storedDocuments = multipartResult.storedDocuments;
    const validated = validateSubmitProposalBody(multipartResult.body);
    if (validated.errors.length) {
      await cleanupStoredDocuments(storedDocuments);
      return sendError(request, reply, {
        data: {
          errors: [...new Set(validated.errors)],
        },
        messageKey: "validationError",
        statusCode: 400,
      });
    }

    const result = await registrationService.submitProposal(
      pg,
      Number(id),
      validated.value,
    );

    return sendSuccess(request, reply, {
      data: result,
      messageKey: "proposalSubmitted",
    });
  } catch (error) {
    request.server.log.error(error);
    await cleanupStoredDocuments(storedDocuments);
    const statusCode =
      error instanceof SyntaxError ? 400 : (getErrorStatusCode(error) ?? 500);

    return sendError(request, reply, {
      message:
        statusCode >= 500 && error instanceof Error
          ? error.message
          : getApiContent().api.invalidFileUpload,
      statusCode,
    });
  }
}

export const registrationController = {
  createRegistration,
  getRegistration,
  resendVerificationEmail,
  submitProposal,
  verifyEmail,
};
