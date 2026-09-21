import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getApiContent } from "../../content/index.js";
import { emailService } from "../email/email.service.js";
import type {
    AdminApplicationDocumentDownload,
    AdminApplicationDetails,
    AdminApplicationsResult,
    AdminDashboardChallengeCategoryCountsResult,
    AdminDashboardCountsResult,
    AdminDashboardOrganisationTypeCountsResult,
    AdminLanguage,
    AdminManagedUser,
    AdminManagedUsersResult,
    AdminSettingsChallengeCategory,
    AdminSettingsDistrict,
    AdminSettingsInstituteType,
    AdminSettingsNamedItem,
    AdminSettingsParticipantCategory,
    AdminSettingsState,
    AdminSettingsUserRole,
    AdminUser,
    DeleteAdminApplicationDocumentResult,
    DeleteAdminApplicationResult,
    RequestAdminLoginCodeInput,
    RequestAdminLoginCodeResult,
    UpsertAdminSettingsItemInput,
    UpsertAdminManagedUserInput,
    UpdateAdminApplicationInput,
    UpdateAdminApplicationResult,
    VerifyAdminLoginInput,
    VerifyAdminLoginResult,
} from "./admin.model.js";

export type DatabaseClient = {
    query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: readonly unknown[],
    ): Promise<{ rows: T[] }>;
};

export type DatabasePool = DatabaseClient & {
    connect(): Promise<PoolClient>;
};

export class AdminRuleError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "AdminRuleError";
        this.statusCode = statusCode;
    }
}

type AdminUserRow = {
    email: string;
    fullname: string;
    id: string;
    is_active?: boolean;
    mobile: string;
    role: string;
};

type AdminManagedUserRow = {
    created_at: Date | string;
    email: string;
    fullname: string;
    id: string;
    is_active: boolean;
    mobile: string;
    role: string;
    total_count?: string;
    updated_at: Date | string;
};

type ApplicationSummaryCountRow = {
    this_week: string;
    total: string;
};

type StateApplicationCountRow = {
    count: string;
    key: "bihar" | "jharkhand" | "westBengal";
    label: string;
};

type ParticipantCategoryCountRow = {
    count: string;
    key: "junior" | "open";
    label: string;
};

type ParticipationModeCountRow = {
    count: string;
    key: "single" | "team";
    label: string;
};

type OrganisationTypeCountRow = {
    count: string;
    key:
        | "juniorDiploma"
        | "juniorIti"
        | "juniorSchool"
        | "juniorUndergraduate"
        | "openCommunityGroup"
        | "openGraduate"
        | "openProfessional"
        | "openStartup";
    label: string;
};

type ChallengeCategoryCountRow = {
    count: string;
    key: string;
    label: string;
};

type ApplicationDetailsRow = {
    application: AdminApplicationDetails;
    total_count: string;
};

type ApplicationDocumentDownloadRow = {
    file_size_bytes: string;
    mime_type: string;
    original_file_name: string;
    storage_key: string;
};

type DeletedApplicationRow = {
    application_number: string;
    id: string;
};

type DeletedApplicationDocumentRow = {
    file_size_bytes: string;
    mime_type: string;
    original_file_name: string;
    storage_key: string;
};

type AdminApplicationSortKey =
    | "createdAt"
    | "number"
    | "review"
    | "state"
    | "status"
    | "submittedAt"
    | "title";

type AdminApplicationQueryOptions = {
    applicationId?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: AdminApplicationSortKey;
    sortDirection?: "asc" | "desc";
    status?: string;
};

type AdminManagedUserQueryOptions = {
    page?: number;
    pageSize?: number;
    search?: string;
};

const languageCodes = new Set(["bn", "en", "hi"]);
const applicationSortExpressions = {
    createdAt: "pa.created_at",
    number: "pa.application_number",
    review: `(
        SELECT COUNT(*)::integer
        FROM public.application_team_members sort_atm
        WHERE sort_atm.application_id = pa.id
    )`,
    state: "COALESCE(s.name_en, '')",
    status: "pa.status",
    submittedAt: "pa.submitted_at",
    title: "COALESCE(c.title_en, cc.name_en, pa.proposed_solution, p.full_name, '')",
} satisfies Record<AdminApplicationSortKey, string>;

const applicationStatuses = new Set([
    "draft",
    "email_verification",
    "profile_completion",
    "proposal_submission",
    "submitted",
    "withdrawn",
]);
const hiddenAdminUserEmail = "sany.chowdhury@gmail.com";
const hiddenAdminUserMobile = "9830799651";
function hiddenAdminUserCondition(emailParamIndex: number, mobileParamIndex: number) {
    return `
    NOT (
        LOWER(email::text) = LOWER($${emailParamIndex})
        AND mobile = $${mobileParamIndex}
    )
`;
}

function isReservedAdminUserValue(input: { email?: string; mobile?: string }) {
    return (
        input.email?.toLowerCase() === hiddenAdminUserEmail ||
        input.mobile === hiddenAdminUserMobile
    );
}

type ApplicationUpdateField = {
    column: string;
    normalize: (value: unknown) => null | number | string;
    nullable: boolean;
};

const applicationUpdateFields: Record<string, ApplicationUpdateField> = {
    challengeCategoryId: {
        column: "challenge_category_id",
        normalize: normalizeNullablePositiveInteger,
        nullable: true,
    },
    challengeId: {
        column: "challenge_id",
        normalize: normalizePositiveInteger,
        nullable: false,
    },
    districtId: {
        column: "district_id",
        normalize: normalizeNullablePositiveInteger,
        nullable: true,
    },
    formLanguage: {
        column: "form_language",
        normalize: normalizeApplicationLanguage,
        nullable: false,
    },
    participationMode: {
        column: "participation_mode",
        normalize: normalizeParticipationMode,
        nullable: false,
    },
    status: {
        column: "status",
        normalize: normalizeApplicationStatus,
        nullable: false,
    },
    submittedAt: {
        column: "submitted_at",
        normalize: normalizeNullableTimestamp,
        nullable: true,
    },
    teamLeadTeamMemberId: {
        column: "team_lead_team_member_id",
        normalize: normalizeNullablePositiveInteger,
        nullable: true,
    },
};

const applicationProfileUpdateFields: Record<string, ApplicationUpdateField> = {
    address: {
        column: "address",
        normalize: normalizeNullableString,
        nullable: true,
    },
    city: {
        column: "city",
        normalize: normalizeNullableString,
        nullable: true,
    },
    districtId: applicationUpdateFields.districtId,
    highestEducationalQualification: {
        column: "highest_educational_qualification",
        normalize: normalizeNullableString,
        nullable: true,
    },
    instituteName: {
        column: "institute_name",
        normalize: normalizeNullableString,
        nullable: true,
    },
    instituteTypeId: {
        column: "institute_type_id",
        normalize: normalizeNullablePositiveInteger,
        nullable: true,
    },
    lastAttendedEducationalInstitute: {
        column: "last_attended_educational_institute",
        normalize: normalizeNullableString,
        nullable: true,
    },
    otherInstituteType: {
        column: "other_institute_type",
        normalize: normalizeNullableString,
        nullable: true,
    },
    participantCategoryId: {
        column: "participant_category_id",
        normalize: normalizePositiveInteger,
        nullable: false,
    },
    pinCode: {
        column: "pin_code",
        normalize: normalizeNullableString,
        nullable: true,
    },
    stateId: {
        column: "state_id",
        normalize: normalizeNullablePositiveInteger,
        nullable: true,
    },
    yearOfPassing: {
        column: "year_of_passing",
        normalize: normalizeNullableYear,
        nullable: true,
    },
};

const applicationProposalUpdateFields: Record<string, ApplicationUpdateField> = {
    beneficiaries: {
        column: "beneficiaries",
        normalize: normalizeNullableString,
        nullable: true,
    },
    challengeCategoryId: applicationUpdateFields.challengeCategoryId,
    costFunding: {
        column: "cost_funding",
        normalize: normalizeNullableString,
        nullable: true,
    },
    expectedImpact: {
        column: "expected_impact",
        normalize: normalizeNullableString,
        nullable: true,
    },
    implementationRoute: {
        column: "implementation_route",
        normalize: normalizeNullableString,
        nullable: true,
    },
    intellectualPropertyPublication: {
        column: "intellectual_property_publication",
        normalize: normalizeNullableString,
        nullable: true,
    },
    mentorAcknowledgeTo: {
        column: "mentor_acknowledge_to",
        normalize: normalizeNullableString,
        nullable: true,
    },
    problemLocation: {
        column: "problem_location",
        normalize: normalizeNullableString,
        nullable: true,
    },
    projectTimeline: {
        column: "project_timeline",
        normalize: normalizeNullableString,
        nullable: true,
    },
    proposedSolution: {
        column: "proposed_solution",
        normalize: normalizeNullableString,
        nullable: true,
    },
    prototypePilot: {
        column: "prototype_pilot",
        normalize: normalizeNullableString,
        nullable: true,
    },
    scalability: {
        column: "scalability",
        normalize: normalizeNullableString,
        nullable: true,
    },
    technologyMethod: {
        column: "technology_method",
        normalize: normalizeNullableString,
        nullable: true,
    },
    videoUrl: {
        column: "video_url",
        normalize: normalizeNullableString,
        nullable: true,
    },
};

const participantUpdateFields: Record<string, ApplicationUpdateField> = {
    dateOfBirth: {
        column: "date_of_birth",
        normalize: normalizeNullableDate,
        nullable: true,
    },
    email: {
        column: "email",
        normalize: normalizeEmailValue,
        nullable: false,
    },
    fullName: {
        column: "full_name",
        normalize: normalizeRequiredString,
        nullable: false,
    },
    gender: {
        column: "gender",
        normalize: normalizeNullableString,
        nullable: true,
    },
    mobile: {
        column: "mobile",
        normalize: normalizeRequiredString,
        nullable: false,
    },
};

function normalizeLanguage(language: string): AdminLanguage {
    if (language === "hn") return "hi";
    return languageCodes.has(language) ? (language as AdminLanguage) : "en";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNullableString(value: unknown) {
    if (value === null) return null;
    if (typeof value !== "string") {
        throw new AdminRuleError("Expected a string value.");
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function normalizeRequiredString(value: unknown) {
    if (typeof value !== "string") {
        throw new AdminRuleError("Expected a string value.");
    }

    const trimmed = value.trim();
    if (!trimmed) {
        throw new AdminRuleError("Value is required.");
    }

    return trimmed;
}

function normalizeEmailValue(value: unknown) {
    const email = normalizeRequiredString(value).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AdminRuleError("Expected a valid email address.");
    }

    return email;
}

function normalizePositiveInteger(value: unknown) {
    if (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value > 0
    ) {
        return value;
    }

    if (typeof value === "string" && /^\d+$/.test(value)) {
        const parsed = Number(value);
        if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
    }

    throw new AdminRuleError("Expected a positive integer value.");
}

function normalizeNullablePositiveInteger(value: unknown) {
    if (value === null || value === "") return null;
    return normalizePositiveInteger(value);
}

function normalizeApplicationLanguage(value: unknown) {
    if (typeof value === "string" && languageCodes.has(value)) return value;
    throw new AdminRuleError("Application language must be en, bn, or hi.");
}

function normalizeApplicationStatus(value: unknown) {
    if (typeof value === "string" && applicationStatuses.has(value)) {
        return value;
    }

    throw new AdminRuleError("Application status is invalid.");
}

function normalizeParticipationMode(value: unknown) {
    if (value === "Individual" || value === "Team") return value;
    throw new AdminRuleError("Participation mode must be Individual or Team.");
}

function normalizeNullableTimestamp(value: unknown) {
    if (value === null || value === "") return null;
    if (typeof value !== "string") {
        throw new AdminRuleError("Expected an ISO timestamp string.");
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AdminRuleError("Expected a valid ISO timestamp string.");
    }

    return date.toISOString();
}

function normalizeNullableDate(value: unknown) {
    if (value === null || value === "") return null;
    if (typeof value !== "string") {
        throw new AdminRuleError("Expected a date string.");
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AdminRuleError("Expected a valid date string.");
    }

    return value.slice(0, 10);
}

function normalizeNullableYear(value: unknown) {
    if (value === null || value === "") return null;
    if (typeof value !== "string" && typeof value !== "number") {
        throw new AdminRuleError("Expected a year value.");
    }

    const year = String(value).trim();
    if (!/^\d{4}$/.test(year)) {
        throw new AdminRuleError("Year of passing must be a 4 digit year.");
    }

    return year;
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function createVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function verificationTokenTtlMinutes() {
    return Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? 10);
}

function verificationResendIntervalMinutes() {
    return Number(process.env.EMAIL_VERIFICATION_RESEND_INTERVAL_MINUTES ?? 10);
}

function verificationAttemptWindowMinutes() {
    return Number(process.env.EMAIL_VERIFICATION_ATTEMPT_WINDOW_MINUTES ?? 60);
}

function verificationMaxEmailSendsPerWindow() {
    return (
        Number(process.env.EMAIL_VERIFICATION_MAX_RESENDS_PER_WINDOW ?? 3) + 1
    );
}

async function ensureAdminLoginTables(pg: DatabaseClient) {
    await pg.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

    await pg.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      role VARCHAR(20) PRIMARY KEY
    )
  `);

    await pg.query(`
    INSERT INTO user_roles (role)
    VALUES ('SUPERADMIN'), ('ADMIN'), ('JURY'), ('HELPDESK')
    ON CONFLICT (role) DO NOTHING
  `);

    await pg.query(`
    ALTER TABLE user_roles
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

    await pg.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

    await pg.query(
        `
    INSERT INTO users (
      fullname,
      email,
      mobile,
      role,
      is_active
    )
    VALUES ($1, $2, $3, $4, TRUE)
    ON CONFLICT (email)
    DO UPDATE
    SET fullname = EXCLUDED.fullname,
        mobile = EXCLUDED.mobile,
        role = EXCLUDED.role,
        is_active = TRUE,
        updated_at = NOW()
  `,
        [
            process.env.DEFAULT_ADMIN_FULLNAME ?? "Sanjoy Chowdhury",
            process.env.DEFAULT_ADMIN_EMAIL ?? "sany.chowdhury@gmail.com",
            process.env.DEFAULT_ADMIN_MOBILE ?? "9830799651",
            process.env.DEFAULT_ADMIN_ROLE ?? "SUPERADMIN",
        ],
    );

    await pg.query(`
    CREATE TABLE IF NOT EXISTS user_login_verification_attempts (
      id                 BIGSERIAL PRIMARY KEY,
      email              VARCHAR(200) NOT NULL UNIQUE,
      first_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_sent_at       TIMESTAMPTZ,
      send_count         INTEGER NOT NULL DEFAULT 0,
      locked_until       TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

    await pg.query(`
    CREATE TABLE IF NOT EXISTS user_login_verification_tokens (
      id          BIGSERIAL PRIMARY KEY,
      user_id     BIGINT NOT NULL,
      email       VARCHAR(200) NOT NULL,
      token_hash  VARCHAR(128) NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_user_login_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE
    )
  `);

    await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_user_login_attempts_locked_until
      ON user_login_verification_attempts(locked_until)
  `);

    await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_user_login_tokens_email
      ON user_login_verification_tokens(email)
  `);

    await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_user_login_tokens_active
      ON user_login_verification_tokens(token_hash, expires_at)
      WHERE consumed_at IS NULL
  `);

    await pg.query(`
    DROP TRIGGER IF EXISTS trg_user_login_attempts_updated_at
      ON user_login_verification_attempts
  `);

    await pg.query(`
    CREATE TRIGGER trg_user_login_attempts_updated_at
    BEFORE UPDATE ON user_login_verification_attempts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}

function toAdminUser(row: AdminUserRow): AdminUser {
    return {
        email: row.email,
        id: Number(row.id),
        mobile: row.mobile,
        name: row.fullname,
        role: row.role,
    };
}

function toAdminManagedUser(row: AdminManagedUserRow): AdminManagedUser {
    return {
        createdAt: new Date(row.created_at).toISOString(),
        email: row.email,
        fullName: row.fullname,
        id: Number(row.id),
        isActive: row.is_active,
        mobile: row.mobile,
        role: row.role,
        updatedAt: new Date(row.updated_at).toISOString(),
    };
}

function normalizeMobileValue(value: unknown) {
    const mobile = normalizeRequiredString(value).replace(/\D/g, "");

    if (!/^\d{10}$/.test(mobile)) {
        throw new AdminRuleError("Expected a valid 10-digit mobile number.");
    }

    return mobile;
}

function normalizeUserRole(value: unknown) {
    const role = normalizeRequiredString(value).toUpperCase();

    if (!/^[A-Z_]{2,20}$/.test(role)) {
        throw new AdminRuleError("User role is invalid.");
    }

    return role;
}

function normalizeBooleanValue(value: unknown) {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;

    throw new AdminRuleError("Expected a boolean value.");
}

function normalizeAdminManagedUserInput(
    input: UpsertAdminManagedUserInput,
    options: { partial?: boolean } = {},
) {
    const values: {
        email?: string;
        fullName?: string;
        isActive?: boolean;
        mobile?: string;
        role?: string;
    } = {};

    if ("fullName" in input || !options.partial) {
        values.fullName = normalizeRequiredString(input.fullName);
    }

    if ("email" in input || !options.partial) {
        values.email = normalizeEmailValue(input.email);
    }

    if ("mobile" in input || !options.partial) {
        values.mobile = normalizeMobileValue(input.mobile);
    }

    if ("role" in input || !options.partial) {
        values.role = normalizeUserRole(input.role);
    }

    if ("isActive" in input) {
        values.isActive = normalizeBooleanValue(input.isActive);
    }

    if (options.partial && !Object.keys(values).length) {
        throw new AdminRuleError("At least one user field is required.");
    }

    return values;
}

function toUserWriteError(error: unknown) {
    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
    ) {
        return new AdminRuleError("A user with this email or mobile already exists.", 409);
    }

    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23503"
    ) {
        return new AdminRuleError("User role is invalid.", 400);
    }

    return error;
}

function getResendAvailableAt(lastSentAt = new Date()) {
    return new Date(
        lastSentAt.getTime() + verificationResendIntervalMinutes() * 60 * 1000,
    );
}

async function findUserByEmail(client: PoolClient, email: string) {
    const result = await client.query<AdminUserRow>(
        `
      SELECT id, fullname, email, mobile, role
      FROM users
      WHERE LOWER(email::text) = LOWER($1)
        AND is_active = TRUE
      LIMIT 1
    `,
        [email],
    );

    return result.rows[0] ?? null;
}

async function reserveLoginAttempt(input: {
    client: PoolClient;
    email: string;
    language: AdminLanguage;
}) {
    const result = await input.client.query<{
        locked_until: Date | null;
        last_sent_at: Date | null;
    }>(
        `
      INSERT INTO user_login_verification_attempts (
        email,
        first_requested_at,
        last_sent_at,
        send_count
      )
      VALUES ($1, NOW(), NOW(), 1)
      ON CONFLICT (email) DO UPDATE
      SET first_requested_at = CASE
            WHEN user_login_verification_attempts.first_requested_at <= NOW() - ($2 || ' minutes')::interval
              THEN NOW()
            ELSE user_login_verification_attempts.first_requested_at
          END,
          send_count = CASE
            WHEN user_login_verification_attempts.first_requested_at <= NOW() - ($2 || ' minutes')::interval
              THEN 1
            ELSE user_login_verification_attempts.send_count + 1
          END,
          last_sent_at = NOW(),
          locked_until = CASE
            WHEN user_login_verification_attempts.locked_until IS NOT NULL
             AND user_login_verification_attempts.locked_until > NOW()
              THEN user_login_verification_attempts.locked_until
            WHEN user_login_verification_attempts.first_requested_at > NOW() - ($2 || ' minutes')::interval
             AND user_login_verification_attempts.send_count + 1 > $3
              THEN user_login_verification_attempts.first_requested_at + ($2 || ' minutes')::interval
            ELSE NULL
          END,
          updated_at = NOW()
      RETURNING locked_until, last_sent_at
    `,
        [
            input.email,
            verificationAttemptWindowMinutes(),
            verificationMaxEmailSendsPerWindow(),
        ],
    );

    const attempt = result.rows[0];
    if (attempt.locked_until && attempt.locked_until.getTime() > Date.now()) {
        throw new AdminRuleError(
            getApiContent(input.language).api.verificationLimitReached,
            429,
        );
    }

    return {
        resendAvailableAt: getResendAvailableAt(
            attempt.last_sent_at ?? new Date(),
        ),
    };
}

async function assertCanResend(input: {
    client: PoolClient;
    email: string;
    language: AdminLanguage;
}) {
    const latestToken = await input.client.query<{ created_at: Date }>(
        `
      SELECT created_at
      FROM user_login_verification_tokens
      WHERE LOWER(email::text) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
    `,
        [input.email],
    );
    const lastCreatedAt = latestToken.rows[0]?.created_at;

    if (
        lastCreatedAt &&
        Date.now() - lastCreatedAt.getTime() <
            verificationResendIntervalMinutes() * 60 * 1000
    ) {
        throw new AdminRuleError(
            getApiContent(input.language).api.verificationResendTooSoon.replace(
                "{minutes}",
                String(verificationResendIntervalMinutes()),
            ),
            429,
        );
    }
}

async function createLoginToken(input: {
    client: PoolClient;
    email: string;
    userId: number;
}) {
    const token = createVerificationCode();

    await input.client.query(
        `
      UPDATE user_login_verification_tokens
      SET consumed_at = COALESCE(consumed_at, NOW())
      WHERE LOWER(email::text) = LOWER($1)
        AND consumed_at IS NULL
    `,
        [input.email],
    );

    await input.client.query(
        `
      INSERT INTO user_login_verification_tokens (
        user_id,
        email,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)
    `,
        [
            input.userId,
            input.email,
            hashToken(token),
            verificationTokenTtlMinutes(),
        ],
    );

    return token;
}

async function sendLoginCode(
    pg: DatabasePool,
    input: RequestAdminLoginCodeInput,
    options: { isResend?: boolean } = {},
): Promise<RequestAdminLoginCodeResult> {
    const language: AdminLanguage = "en";
    const client = await pg.connect();
    let admin: AdminUser;
    let code = "";
    let resendAvailableAt = new Date();

    try {
        await client.query("BEGIN");
        const row = await findUserByEmail(client, input.email);

        if (!row) {
            throw new AdminRuleError(
                getApiContent(language).api.userNotFound,
                404,
            );
        }

        if (options.isResend) {
            await assertCanResend({ client, email: input.email, language });
        }

        const attempt = await reserveLoginAttempt({
            client,
            email: input.email,
            language,
        });
        resendAvailableAt = attempt.resendAvailableAt;
        admin = toAdminUser(row);
        code = await createLoginToken({
            client,
            email: admin.email,
            userId: admin.id,
        });
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const emailDelivery = await emailService.sendAdminLoginVerificationEmail({
        adminEmail: admin.email,
        adminName: admin.name,
        code,
        language,
    });

    if (!emailDelivery.delivered) {
        console.info(
            `Admin login verification code for ${admin.email}: ${code}`,
        );
    }

    return {
        emailDelivery,
        loginRequest: {
            email: admin.email,
            resendAvailableAt: resendAvailableAt.toISOString(),
        },
    };
}

async function requestLoginCode(
    pg: DatabasePool,
    input: RequestAdminLoginCodeInput,
) {
    return sendLoginCode(pg, input);
}

async function resendLoginCode(
    pg: DatabasePool,
    input: RequestAdminLoginCodeInput,
) {
    return sendLoginCode(pg, input, { isResend: true });
}

async function verifyLoginCode(
    pg: DatabasePool,
    input: VerifyAdminLoginInput,
): Promise<VerifyAdminLoginResult> {
    const language: AdminLanguage = "en";
    const client = await pg.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query<AdminUserRow>(
            `
        SELECT u.id, u.fullname, u.email, u.mobile, u.role
        FROM user_login_verification_tokens ulvt
        JOIN users u ON u.id = ulvt.user_id
        WHERE ulvt.token_hash = $1
          AND LOWER(ulvt.email::text) = LOWER($2)
          AND ulvt.consumed_at IS NULL
          AND ulvt.expires_at > NOW()
        FOR UPDATE OF ulvt
      `,
            [hashToken(input.code), input.email],
        );
        const row = result.rows[0];

        if (!row) {
            throw new AdminRuleError(
                getApiContent(language).api.invalidToken,
                400,
            );
        }

        await client.query(
            `
        UPDATE user_login_verification_tokens
        SET consumed_at = NOW()
        WHERE token_hash = $1
      `,
            [hashToken(input.code)],
        );

        await client.query("COMMIT");

        return {
            admin: toAdminUser(row),
            session: {
                token: randomUUID(),
            },
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getUsers(
    pg: DatabasePool,
    options: AdminManagedUserQueryOptions = {},
): Promise<AdminManagedUsersResult> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize =
        options.pageSize && options.pageSize > 0
            ? Math.min(options.pageSize, 100)
            : 20;
    const offset = (page - 1) * pageSize;
    const params: unknown[] = [hiddenAdminUserEmail, hiddenAdminUserMobile];
    const conditions: string[] = [hiddenAdminUserCondition(1, 2)];

    if (options.search?.trim()) {
        params.push(`%${options.search.trim()}%`);
        conditions.push(`
            (
                fullname ILIKE $${params.length}
                OR email ILIKE $${params.length}
                OR mobile ILIKE $${params.length}
                OR role ILIKE $${params.length}
            )
        `);
    }

    params.push(pageSize, offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;
    const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const result = await pg.query<AdminManagedUserRow>(
        `
        SELECT
            id,
            fullname,
            email,
            mobile,
            role,
            is_active,
            created_at,
            updated_at,
            COUNT(*) OVER()::text AS total_count
        FROM users
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
        `,
        params,
    );
    const total = Number(result.rows[0]?.total_count ?? 0);

    return {
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        users: result.rows.map(toAdminManagedUser),
    };
}

async function getUser(
    pg: DatabasePool,
    userId: number,
): Promise<AdminManagedUser | null> {
    const result = await pg.query<AdminManagedUserRow>(
        `
        SELECT
            id,
            fullname,
            email,
            mobile,
            role,
            is_active,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
          AND ${hiddenAdminUserCondition(2, 3)}
        LIMIT 1
        `,
        [userId, hiddenAdminUserEmail, hiddenAdminUserMobile],
    );

    return result.rows[0] ? toAdminManagedUser(result.rows[0]) : null;
}

async function createUser(
    pg: DatabasePool,
    input: UpsertAdminManagedUserInput,
): Promise<{ user: AdminManagedUser }> {
    const values = normalizeAdminManagedUserInput(input);

    if (isReservedAdminUserValue(values)) {
        throw new AdminRuleError("This user account is reserved.", 403);
    }

    try {
        const result = await pg.query<AdminManagedUserRow>(
            `
            INSERT INTO users (
                fullname,
                email,
                mobile,
                role,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING
                id,
                fullname,
                email,
                mobile,
                role,
                is_active,
                created_at,
                updated_at
            `,
            [
                values.fullName,
                values.email,
                values.mobile,
                values.role,
                values.isActive ?? true,
            ],
        );

        return { user: toAdminManagedUser(result.rows[0]) };
    } catch (error) {
        throw toUserWriteError(error);
    }
}

async function updateUser(
    pg: DatabasePool,
    userId: number,
    input: UpsertAdminManagedUserInput,
): Promise<{ user: AdminManagedUser } | null> {
    const values = normalizeAdminManagedUserInput(input, { partial: true });
    const updates: string[] = [];
    const params: unknown[] = [];

    if (isReservedAdminUserValue(values)) {
        throw new AdminRuleError("This user account is reserved.", 403);
    }

    if (values.fullName !== undefined) {
        params.push(values.fullName);
        updates.push(`fullname = $${params.length}`);
    }

    if (values.email !== undefined) {
        params.push(values.email);
        updates.push(`email = $${params.length}`);
    }

    if (values.mobile !== undefined) {
        params.push(values.mobile);
        updates.push(`mobile = $${params.length}`);
    }

    if (values.role !== undefined) {
        params.push(values.role);
        updates.push(`role = $${params.length}`);
    }

    if (values.isActive !== undefined) {
        params.push(values.isActive);
        updates.push(`is_active = $${params.length}`);
    }

    params.push(userId);

    try {
        const result = await pg.query<AdminManagedUserRow>(
            `
            UPDATE users
            SET ${updates.join(", ")},
                updated_at = NOW()
            WHERE id = $${params.length}
              AND ${hiddenAdminUserCondition(params.length + 1, params.length + 2)}
            RETURNING
                id,
                fullname,
                email,
                mobile,
                role,
                is_active,
                created_at,
                updated_at
            `,
            [...params, hiddenAdminUserEmail, hiddenAdminUserMobile],
        );

        return result.rows[0] ? { user: toAdminManagedUser(result.rows[0]) } : null;
    } catch (error) {
        throw toUserWriteError(error);
    }
}

async function deleteUser(
    pg: DatabasePool,
    userId: number,
): Promise<{ user: AdminManagedUser } | null> {
    return updateUser(pg, userId, { isActive: false });
}

type AdminSettingsNamedRow = {
    code?: string;
    created_at: Date | string;
    id: string;
    is_active: boolean;
    name_bn: string;
    name_en: string;
    name_hi: string;
    sort_order?: number | string;
    state_id?: number | string;
    updated_at: Date | string;
};

type AdminSettingsUserRoleRow = {
    is_active: boolean;
    role: string;
};

function toSettingsNamedItem(row: AdminSettingsNamedRow): AdminSettingsNamedItem {
    const item: AdminSettingsNamedItem = {
        createdAt: new Date(row.created_at).toISOString(),
        id: Number(row.id),
        isActive: row.is_active,
        name: {
            bn: row.name_bn,
            en: row.name_en,
            hi: row.name_hi,
        },
        updatedAt: new Date(row.updated_at).toISOString(),
    };

    if (row.sort_order !== undefined) item.sortOrder = Number(row.sort_order);
    return item;
}

function normalizeSortOrder(value: unknown) {
    if (value === undefined || value === null || value === "") return 0;

    if (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
    ) {
        return value;
    }

    if (typeof value === "string" && /^\d+$/.test(value)) {
        const parsed = Number(value);
        if (Number.isSafeInteger(parsed)) return parsed;
    }

    throw new AdminRuleError("Sort order must be zero or a positive integer.");
}

function normalizeOptionalBoolean(value: unknown, fallback = true) {
    if (value === undefined || value === null || value === "") return fallback;
    return normalizeBooleanValue(value);
}

function normalizeLocalizedNameInput(input: UpsertAdminSettingsItemInput) {
    return {
        nameBn: normalizeRequiredString(input.nameBn),
        nameEn: normalizeRequiredString(input.nameEn),
        nameHi: normalizeRequiredString(input.nameHi),
    };
}

function normalizeSettingsCode(value: unknown) {
    const code = normalizeRequiredString(value).toUpperCase();

    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
        throw new AdminRuleError("Code must be 2-30 letters, numbers, underscores, or hyphens.");
    }

    return code;
}

async function getSettingsStates(pg: DatabasePool): Promise<AdminSettingsState[]> {
    const result = await pg.query<AdminSettingsNamedRow>(`
        SELECT id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        FROM states
        ORDER BY name_en
    `);

    return result.rows.map(toSettingsNamedItem);
}

async function getSettingsState(
    pg: DatabasePool,
    id: number,
): Promise<AdminSettingsState | null> {
    const result = await pg.query<AdminSettingsNamedRow>(
        `
        SELECT id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        FROM states
        WHERE id = $1
        LIMIT 1
        `,
        [id],
    );

    return result.rows[0] ? toSettingsNamedItem(result.rows[0]) : null;
}

async function createSettingsState(
    pg: DatabasePool,
    input: UpsertAdminSettingsItemInput,
): Promise<{ state: AdminSettingsState }> {
    const names = normalizeLocalizedNameInput(input);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        INSERT INTO states (name_en, name_bn, name_hi, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        `,
        [names.nameEn, names.nameBn, names.nameHi, isActive],
    );

    return { state: toSettingsNamedItem(result.rows[0]) };
}

async function updateSettingsState(
    pg: DatabasePool,
    id: number,
    input: UpsertAdminSettingsItemInput,
): Promise<{ state: AdminSettingsState } | null> {
    const names = normalizeLocalizedNameInput(input);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        UPDATE states
        SET name_en = $1,
            name_bn = $2,
            name_hi = $3,
            is_active = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        `,
        [names.nameEn, names.nameBn, names.nameHi, isActive, id],
    );

    return result.rows[0] ? { state: toSettingsNamedItem(result.rows[0]) } : null;
}

async function deleteSettingsState(
    pg: DatabasePool,
    id: number,
): Promise<{ state: AdminSettingsState } | null> {
    const state = await getSettingsState(pg, id);
    if (!state) return null;

    return updateSettingsState(pg, id, {
        isActive: false,
        nameBn: state.name.bn,
        nameEn: state.name.en,
        nameHi: state.name.hi,
    });
}

function toSettingsDistrict(row: AdminSettingsNamedRow): AdminSettingsDistrict {
    return {
        ...toSettingsNamedItem(row),
        stateId: Number(row.state_id),
    };
}

async function getSettingsDistricts(
    pg: DatabasePool,
): Promise<AdminSettingsDistrict[]> {
    const result = await pg.query<AdminSettingsNamedRow>(`
        SELECT id, state_id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        FROM districts
        ORDER BY state_id, name_en
    `);

    return result.rows.map(toSettingsDistrict);
}

async function getSettingsDistrict(
    pg: DatabasePool,
    id: number,
): Promise<AdminSettingsDistrict | null> {
    const result = await pg.query<AdminSettingsNamedRow>(
        `
        SELECT id, state_id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        FROM districts
        WHERE id = $1
        LIMIT 1
        `,
        [id],
    );

    return result.rows[0] ? toSettingsDistrict(result.rows[0]) : null;
}

async function createSettingsDistrict(
    pg: DatabasePool,
    input: UpsertAdminSettingsItemInput,
): Promise<{ district: AdminSettingsDistrict }> {
    const names = normalizeLocalizedNameInput(input);
    const stateId = normalizePositiveInteger(input.stateId);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        INSERT INTO districts (state_id, name_en, name_bn, name_hi, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, state_id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        `,
        [stateId, names.nameEn, names.nameBn, names.nameHi, isActive],
    );

    return { district: toSettingsDistrict(result.rows[0]) };
}

async function updateSettingsDistrict(
    pg: DatabasePool,
    id: number,
    input: UpsertAdminSettingsItemInput,
): Promise<{ district: AdminSettingsDistrict } | null> {
    const names = normalizeLocalizedNameInput(input);
    const stateId = normalizePositiveInteger(input.stateId);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        UPDATE districts
        SET state_id = $1,
            name_en = $2,
            name_bn = $3,
            name_hi = $4,
            is_active = $5,
            updated_at = NOW()
        WHERE id = $6
        RETURNING id, state_id, name_en, name_bn, name_hi, is_active, created_at, updated_at
        `,
        [stateId, names.nameEn, names.nameBn, names.nameHi, isActive, id],
    );

    return result.rows[0] ? { district: toSettingsDistrict(result.rows[0]) } : null;
}

async function deleteSettingsDistrict(
    pg: DatabasePool,
    id: number,
): Promise<{ district: AdminSettingsDistrict } | null> {
    const district = await getSettingsDistrict(pg, id);
    if (!district) return null;

    return updateSettingsDistrict(pg, id, {
        isActive: false,
        nameBn: district.name.bn,
        nameEn: district.name.en,
        nameHi: district.name.hi,
        stateId: district.stateId,
    });
}

type OrderedSettingsConfig<
    Item extends AdminSettingsInstituteType | AdminSettingsChallengeCategory,
> = {
    key: "challengeCategory" | "instituteType";
    table: "challenge_categories" | "institute_types";
    toResult: (item: AdminSettingsNamedItem) => Item;
};

const instituteTypeSettingsConfig = {
    key: "instituteType",
    table: "institute_types",
    toResult: (item: AdminSettingsNamedItem) => item as AdminSettingsInstituteType,
} satisfies OrderedSettingsConfig<AdminSettingsInstituteType>;

const challengeCategorySettingsConfig = {
    key: "challengeCategory",
    table: "challenge_categories",
    toResult: (item: AdminSettingsNamedItem) => item as AdminSettingsChallengeCategory,
} satisfies OrderedSettingsConfig<AdminSettingsChallengeCategory>;

async function getOrderedSettingsItems<
    Item extends AdminSettingsInstituteType | AdminSettingsChallengeCategory,
>(pg: DatabasePool, config: OrderedSettingsConfig<Item>): Promise<Item[]> {
    const result = await pg.query<AdminSettingsNamedRow>(`
        SELECT id, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        FROM ${config.table}
        ORDER BY sort_order, name_en
    `);

    return result.rows.map((row) => config.toResult(toSettingsNamedItem(row)));
}

async function getOrderedSettingsItem<
    Item extends AdminSettingsInstituteType | AdminSettingsChallengeCategory,
>(
    pg: DatabasePool,
    config: OrderedSettingsConfig<Item>,
    id: number,
): Promise<Item | null> {
    const result = await pg.query<AdminSettingsNamedRow>(
        `
        SELECT id, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        FROM ${config.table}
        WHERE id = $1
        LIMIT 1
        `,
        [id],
    );

    return result.rows[0]
        ? config.toResult(toSettingsNamedItem(result.rows[0]))
        : null;
}

async function createOrderedSettingsItem<
    Item extends AdminSettingsInstituteType | AdminSettingsChallengeCategory,
>(
    pg: DatabasePool,
    config: OrderedSettingsConfig<Item>,
    input: UpsertAdminSettingsItemInput,
): Promise<Record<typeof config.key, Item>> {
    const names = normalizeLocalizedNameInput(input);
    const sortOrder = normalizeSortOrder(input.sortOrder);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        INSERT INTO ${config.table} (name_en, name_bn, name_hi, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        `,
        [names.nameEn, names.nameBn, names.nameHi, sortOrder, isActive],
    );

    return {
        [config.key]: config.toResult(toSettingsNamedItem(result.rows[0])),
    } as Record<typeof config.key, Item>;
}

async function updateOrderedSettingsItem<
    Item extends AdminSettingsInstituteType | AdminSettingsChallengeCategory,
>(
    pg: DatabasePool,
    config: OrderedSettingsConfig<Item>,
    id: number,
    input: UpsertAdminSettingsItemInput,
): Promise<Record<typeof config.key, Item> | null> {
    const names = normalizeLocalizedNameInput(input);
    const sortOrder = normalizeSortOrder(input.sortOrder);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        UPDATE ${config.table}
        SET name_en = $1,
            name_bn = $2,
            name_hi = $3,
            sort_order = $4,
            is_active = $5,
            updated_at = NOW()
        WHERE id = $6
        RETURNING id, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        `,
        [names.nameEn, names.nameBn, names.nameHi, sortOrder, isActive, id],
    );

    if (!result.rows[0]) return null;

    return {
        [config.key]: config.toResult(toSettingsNamedItem(result.rows[0])),
    } as Record<typeof config.key, Item>;
}

async function deleteOrderedSettingsItem<
    Item extends AdminSettingsInstituteType | AdminSettingsChallengeCategory,
>(
    pg: DatabasePool,
    config: OrderedSettingsConfig<Item>,
    id: number,
): Promise<Record<typeof config.key, Item> | null> {
    const item = await getOrderedSettingsItem(pg, config, id);
    if (!item) return null;

    return updateOrderedSettingsItem(pg, config, id, {
        isActive: false,
        nameBn: item.name.bn,
        nameEn: item.name.en,
        nameHi: item.name.hi,
        sortOrder: item.sortOrder ?? 0,
    });
}

async function getSettingsInstituteTypes(pg: DatabasePool) {
    return getOrderedSettingsItems(pg, instituteTypeSettingsConfig);
}

async function getSettingsInstituteType(pg: DatabasePool, id: number) {
    return getOrderedSettingsItem(pg, instituteTypeSettingsConfig, id);
}

async function createSettingsInstituteType(
    pg: DatabasePool,
    input: UpsertAdminSettingsItemInput,
) {
    return createOrderedSettingsItem(pg, instituteTypeSettingsConfig, input);
}

async function updateSettingsInstituteType(
    pg: DatabasePool,
    id: number,
    input: UpsertAdminSettingsItemInput,
) {
    return updateOrderedSettingsItem(pg, instituteTypeSettingsConfig, id, input);
}

async function deleteSettingsInstituteType(pg: DatabasePool, id: number) {
    return deleteOrderedSettingsItem(pg, instituteTypeSettingsConfig, id);
}

function toSettingsParticipantCategory(
    row: AdminSettingsNamedRow,
): AdminSettingsParticipantCategory {
    return {
        ...toSettingsNamedItem(row),
        code: row.code ?? "",
        sortOrder: Number(row.sort_order ?? 0),
    };
}

async function getSettingsParticipantCategories(
    pg: DatabasePool,
): Promise<AdminSettingsParticipantCategory[]> {
    const result = await pg.query<AdminSettingsNamedRow>(`
        SELECT id, code, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        FROM participant_categories
        ORDER BY sort_order, name_en
    `);

    return result.rows.map(toSettingsParticipantCategory);
}

async function getSettingsParticipantCategory(
    pg: DatabasePool,
    id: number,
): Promise<AdminSettingsParticipantCategory | null> {
    const result = await pg.query<AdminSettingsNamedRow>(
        `
        SELECT id, code, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        FROM participant_categories
        WHERE id = $1
        LIMIT 1
        `,
        [id],
    );

    return result.rows[0] ? toSettingsParticipantCategory(result.rows[0]) : null;
}

async function createSettingsParticipantCategory(
    pg: DatabasePool,
    input: UpsertAdminSettingsItemInput,
): Promise<{ participantCategory: AdminSettingsParticipantCategory }> {
    const names = normalizeLocalizedNameInput(input);
    const code = normalizeSettingsCode(input.code);
    const sortOrder = normalizeSortOrder(input.sortOrder);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        INSERT INTO participant_categories (code, name_en, name_bn, name_hi, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, code, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        `,
        [code, names.nameEn, names.nameBn, names.nameHi, sortOrder, isActive],
    );

    return { participantCategory: toSettingsParticipantCategory(result.rows[0]) };
}

async function updateSettingsParticipantCategory(
    pg: DatabasePool,
    id: number,
    input: UpsertAdminSettingsItemInput,
): Promise<{ participantCategory: AdminSettingsParticipantCategory } | null> {
    const names = normalizeLocalizedNameInput(input);
    const code = normalizeSettingsCode(input.code);
    const sortOrder = normalizeSortOrder(input.sortOrder);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsNamedRow>(
        `
        UPDATE participant_categories
        SET code = $1,
            name_en = $2,
            name_bn = $3,
            name_hi = $4,
            sort_order = $5,
            is_active = $6,
            updated_at = NOW()
        WHERE id = $7
        RETURNING id, code, name_en, name_bn, name_hi, sort_order, is_active, created_at, updated_at
        `,
        [code, names.nameEn, names.nameBn, names.nameHi, sortOrder, isActive, id],
    );

    return result.rows[0]
        ? { participantCategory: toSettingsParticipantCategory(result.rows[0]) }
        : null;
}

async function deleteSettingsParticipantCategory(
    pg: DatabasePool,
    id: number,
): Promise<{ participantCategory: AdminSettingsParticipantCategory } | null> {
    const category = await getSettingsParticipantCategory(pg, id);
    if (!category) return null;

    return updateSettingsParticipantCategory(pg, id, {
        code: category.code,
        isActive: false,
        nameBn: category.name.bn,
        nameEn: category.name.en,
        nameHi: category.name.hi,
        sortOrder: category.sortOrder,
    });
}

async function getSettingsChallengeCategories(pg: DatabasePool) {
    return getOrderedSettingsItems(pg, challengeCategorySettingsConfig);
}

async function getSettingsChallengeCategory(pg: DatabasePool, id: number) {
    return getOrderedSettingsItem(pg, challengeCategorySettingsConfig, id);
}

async function createSettingsChallengeCategory(
    pg: DatabasePool,
    input: UpsertAdminSettingsItemInput,
) {
    return createOrderedSettingsItem(pg, challengeCategorySettingsConfig, input);
}

async function updateSettingsChallengeCategory(
    pg: DatabasePool,
    id: number,
    input: UpsertAdminSettingsItemInput,
) {
    return updateOrderedSettingsItem(pg, challengeCategorySettingsConfig, id, input);
}

async function deleteSettingsChallengeCategory(pg: DatabasePool, id: number) {
    return deleteOrderedSettingsItem(pg, challengeCategorySettingsConfig, id);
}

function normalizeUserRoleValue(value: unknown) {
    return normalizeUserRole(value);
}

async function getSettingsUserRoles(
    pg: DatabasePool,
): Promise<AdminSettingsUserRole[]> {
    const result = await pg.query<AdminSettingsUserRoleRow>(`
        SELECT role, is_active
        FROM user_roles
        ORDER BY role
    `);

    return result.rows.map((row) => ({
        isActive: row.is_active,
        role: row.role,
    }));
}

async function getSettingsUserRole(
    pg: DatabasePool,
    role: string,
): Promise<AdminSettingsUserRole | null> {
    const normalizedRole = normalizeUserRoleValue(role);
    const result = await pg.query<AdminSettingsUserRoleRow>(
        `
        SELECT role, is_active
        FROM user_roles
        WHERE role = $1
        LIMIT 1
        `,
        [normalizedRole],
    );

    return result.rows[0]
        ? { isActive: result.rows[0].is_active, role: result.rows[0].role }
        : null;
}

async function createSettingsUserRole(
    pg: DatabasePool,
    input: UpsertAdminSettingsItemInput,
): Promise<{ userRole: AdminSettingsUserRole }> {
    const role = normalizeUserRoleValue(input.role);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsUserRoleRow>(
        `
        INSERT INTO user_roles (role, is_active)
        VALUES ($1, $2)
        RETURNING role, is_active
        `,
        [role, isActive],
    );

    return { userRole: { isActive: result.rows[0].is_active, role: result.rows[0].role } };
}

async function updateSettingsUserRole(
    pg: DatabasePool,
    role: string,
    input: UpsertAdminSettingsItemInput,
): Promise<{ userRole: AdminSettingsUserRole } | null> {
    const currentRole = normalizeUserRoleValue(role);
    const nextRole =
        input.role === undefined ? currentRole : normalizeUserRoleValue(input.role);
    const isActive = normalizeOptionalBoolean(input.isActive);

    const result = await pg.query<AdminSettingsUserRoleRow>(
        `
        UPDATE user_roles
        SET role = $1,
            is_active = $2
        WHERE role = $3
        RETURNING role, is_active
        `,
        [nextRole, isActive, currentRole],
    );

    return result.rows[0]
        ? { userRole: { isActive: result.rows[0].is_active, role: result.rows[0].role } }
        : null;
}

async function deleteSettingsUserRole(
    pg: DatabasePool,
    role: string,
): Promise<{ userRole: AdminSettingsUserRole } | null> {
    return updateSettingsUserRole(pg, role, { isActive: false });
}

async function getDashboardCounts(
    pg: DatabasePool,
): Promise<AdminDashboardCountsResult> {
    const [
        summaryResult,
        stateResult,
        participantCategoryResult,
        participationModeResult,
    ] = await Promise.all([
        // =========================================================
        // 1. TOTAL APPLICATIONS + THIS WEEK
        // =========================================================
        pg.query<ApplicationSummaryCountRow>(`
            SELECT
                COUNT(*)::text AS total,

                COUNT(*) FILTER (
                    WHERE submitted_at >= date_trunc('week', NOW())
                )::text AS this_week

            FROM public.participant_applications

            WHERE status = 'submitted'
        `),

        // =========================================================
        // 2. STATE-WISE APPLICATION COUNTS
        // =========================================================
        pg.query<StateApplicationCountRow>(`
            WITH target_states(key, label, sort_order) AS (
                VALUES
                    ('bihar', 'Bihar', 1),
                    ('jharkhand', 'Jharkhand', 2),
                    ('westBengal', 'West Bengal', 3)
            )

            SELECT
                ts.key,
                ts.label,
                COUNT(pa.id)::text AS count

            FROM target_states ts

            LEFT JOIN public.states s
                ON LOWER(TRIM(s.name_en)) = LOWER(TRIM(ts.label))

            LEFT JOIN public.participant_applications pa
                ON pa.state_id = s.id
                AND pa.status = 'submitted'

            GROUP BY
                ts.key,
                ts.label,
                ts.sort_order

            ORDER BY ts.sort_order
        `),

        // =========================================================
        // 3. PARTICIPANT CATEGORY COUNTS
        //    Junior / Open
        // =========================================================
        pg.query<ParticipantCategoryCountRow>(`
            WITH target_categories(key, code, label, sort_order) AS (
                VALUES
                    ('junior', 'JUNIOR', 'Junior', 1),
                    ('open', 'OPEN', 'Open', 2)
            )

            SELECT
                tc.key,
                tc.label,
                COUNT(pa.id)::text AS count

            FROM target_categories tc

            LEFT JOIN public.participant_categories pc
                ON UPPER(TRIM(pc.code)) = tc.code

            LEFT JOIN public.participant_applications pa
                ON pa.participant_category_id = pc.id
                AND pa.status = 'submitted'

            GROUP BY
                tc.key,
                tc.label,
                tc.sort_order

            ORDER BY tc.sort_order
        `),

        // =========================================================
        // 4. PARTICIPATION MODE COUNTS
        //    Participation mode counts
        // =========================================================
        pg.query<ParticipationModeCountRow>(`
            WITH target_modes(key, db_value, label, sort_order) AS (
                VALUES
                    ('single', 'Individual', 'Individual', 1),
                    ('team', 'Team', 'Team', 2)
            )

            SELECT
                tm.key,
                tm.label,
                COUNT(pa.id)::text AS count

            FROM target_modes tm

            LEFT JOIN public.participant_applications pa
                ON pa.participation_mode = tm.db_value
                AND pa.status = 'submitted'

            GROUP BY
                tm.key,
                tm.label,
                tm.sort_order

            ORDER BY tm.sort_order
        `),
    ]);

    // =============================================================
    // DEFAULT SUMMARY
    // =============================================================

    const summary = summaryResult.rows[0] ?? {
        total: "0",
        this_week: "0",
    };

    // =============================================================
    // RESPONSE
    // =============================================================

    return {
        cards: [
            // -----------------------------------------------------
            // Total Applications
            // -----------------------------------------------------
            {
                key: "totalApplications",
                label: "Total Applications",
                count: Number(summary.total),
                detail: `+${Number(summary.this_week)} this week`,
            },

            // -----------------------------------------------------
            // State-wise Counts
            // -----------------------------------------------------
            ...stateResult.rows.map((row) => ({
                key: row.key,
                label: row.label,
                count: Number(row.count),
                detail: "State wise count",
            })),

            // -----------------------------------------------------
            // Participant Categories
            // -----------------------------------------------------
            ...participantCategoryResult.rows.map((row) => ({
                key: row.key,
                label: row.label,
                count: Number(row.count),
                detail: "Participant Category",
            })),

            // -----------------------------------------------------
            // Participation Modes
            // -----------------------------------------------------
            ...participationModeResult.rows.map((row) => ({
                key: row.key,
                label: row.label,
                count: Number(row.count),
                detail: "Participation Mode",
            })),
        ],
    };
}

async function getApplications(
    pg: DatabasePool,
    options: AdminApplicationQueryOptions = {},
): Promise<AdminApplicationsResult> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Math.floor(options.pageSize ?? 10)));
    const offset = (page - 1) * pageSize;
    const sortBy = options.sortBy ?? "status";
    const sortDirection = options.sortDirection === "desc" ? "DESC" : "ASC";
    const status =
        options.status && applicationStatuses.has(options.status)
            ? options.status
            : undefined;
    const search = options.search?.trim();
    const values: unknown[] = [];
    const where: string[] = [];

    if (options.applicationId) {
        values.push(options.applicationId);
        where.push(`pa.id = $${values.length}`);
    } else if (status) {
        values.push(status);
        where.push(`pa.status = $${values.length}`);
    }

    if (search) {
        values.push(`%${search.toLowerCase()}%`);
        where.push(`
            (
                LOWER(CONCAT_WS(
                    ' ',
                    pa.id,
                    pa.application_number,
                    pa.status,
                    pa.form_language,
                    pa.participation_mode,
                    pa.city,
                    pa.pin_code,
                    pa.address,
                    pa.institute_name,
                    pa.other_institute_type,
                    pa.problem_location,
                    pa.proposed_solution,
                    pa.technology_method,
                    pa.implementation_route,
                    pa.cost_funding,
                    pa.beneficiaries,
                    pa.project_timeline,
                    pa.expected_impact,
                    pa.scalability,
                    pa.prototype_pilot,
                    pa.highest_educational_qualification,
                    pa.last_attended_educational_institute,
                    pa.year_of_passing,
                    pa.mentor_acknowledge_to,
                    pa.intellectual_property_publication,
                    pa.video_url,
                    p.full_name,
                    p.email,
                    p.mobile,
                    p.gender,
                    s.name_en,
                    s.name_bn,
                    s.name_hi,
                    d.name_en,
                    d.name_bn,
                    d.name_hi,
                    pc.code,
                    pc.name_en,
                    pc.name_bn,
                    pc.name_hi,
                    it.name_en,
                    it.name_bn,
                    it.name_hi,
                    cc.name_en,
                    cc.name_bn,
                    cc.name_hi,
                    c.code,
                    c.title_en,
                    c.title_bn,
                    c.title_hi,
                    c.description_en,
                    c.description_bn,
                    c.description_hi
                )) LIKE $${values.length}
                OR EXISTS (
                    SELECT 1
                    FROM public.application_team_members search_atm
                    LEFT JOIN public.participants search_member_participant
                        ON search_member_participant.id = search_atm.participant_id
                    WHERE search_atm.application_id = pa.id
                      AND LOWER(CONCAT_WS(
                        ' ',
                        search_atm.id,
                        search_atm.full_name,
                        search_atm.email,
                        search_atm.mobile,
                        search_member_participant.full_name,
                        search_member_participant.email,
                        search_member_participant.mobile
                      )) LIKE $${values.length}
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.application_documents search_ad
                    WHERE search_ad.application_id = pa.id
                      AND LOWER(CONCAT_WS(
                        ' ',
                        search_ad.id,
                        search_ad.document_type,
                        search_ad.language_code,
                        search_ad.original_file_name,
                        search_ad.storage_key,
                        search_ad.public_url,
                        search_ad.mime_type,
                        search_ad.file_size_bytes,
                        search_ad.checksum_sha256
                      )) LIKE $${values.length}
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.application_form_saves search_afs
                    WHERE search_afs.application_id = pa.id
                      AND LOWER(CONCAT_WS(
                        ' ',
                        search_afs.id,
                        search_afs.language_code,
                        search_afs.form_data::text,
                        search_afs.is_current
                      )) LIKE $${values.length}
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.participant_email_verification_attempts search_pea
                    WHERE (
                        LOWER(search_pea.email::text) = LOWER(p.email::text)
                        OR search_pea.mobile = p.mobile
                    )
                      AND LOWER(CONCAT_WS(
                        ' ',
                        search_pea.email,
                        search_pea.mobile,
                        search_pea.send_count,
                        search_pea.locked_until
                      )) LIKE $${values.length}
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.participant_login_verification_attempts search_pla
                    WHERE LOWER(search_pla.email::text) = LOWER(p.email::text)
                      AND LOWER(CONCAT_WS(
                        ' ',
                        search_pla.email,
                        search_pla.send_count,
                        search_pla.locked_until
                      )) LIKE $${values.length}
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.participant_login_verification_tokens search_plt
                    WHERE search_plt.application_id = pa.id
                      AND LOWER(CONCAT_WS(
                        ' ',
                        search_plt.id,
                        search_plt.member_id,
                        search_plt.email,
                        search_plt.expires_at,
                        search_plt.consumed_at
                      )) LIKE $${values.length}
                )
            )
        `);
    }

    values.push(pageSize);
    const limitParameter = `$${values.length}`;
    values.push(offset);
    const offsetParameter = `$${values.length}`;
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderBySql = `${applicationSortExpressions[sortBy]} ${sortDirection} NULLS LAST, pa.id DESC`;

    const result = await pg.query<ApplicationDetailsRow>(
        `
        SELECT
        COUNT(*) OVER()::text AS total_count,
        jsonb_build_object(
            'id', pa.id,
            'applicationNumber', pa.application_number,
            'status', pa.status,
            'formLanguage', pa.form_language,
            'participationMode', pa.participation_mode,
            'teamLeadTeamMemberId', pa.team_lead_team_member_id,
            'submittedAt', pa.submitted_at,
            'createdAt', pa.created_at,
            'updatedAt', pa.updated_at,
            'profile', jsonb_build_object(
                'stateId', pa.state_id,
                'districtId', pa.district_id,
                'city', pa.city,
                'pinCode', pa.pin_code,
                'address', pa.address,
                'participantCategoryId', pa.participant_category_id,
                'instituteTypeId', pa.institute_type_id,
                'instituteName', pa.institute_name,
                'otherInstituteType', pa.other_institute_type,
                'highestEducationalQualification', pa.highest_educational_qualification,
                'lastAttendedEducationalInstitute', pa.last_attended_educational_institute,
                'yearOfPassing', pa.year_of_passing
            ),
            'proposal', jsonb_build_object(
                'challengeCategoryId', pa.challenge_category_id,
                'problemLocation', pa.problem_location,
                'proposedSolution', pa.proposed_solution,
                'technologyMethod', pa.technology_method,
                'implementationRoute', pa.implementation_route,
                'costFunding', pa.cost_funding,
                'beneficiaries', pa.beneficiaries,
                'projectTimeline', pa.project_timeline,
                'expectedImpact', pa.expected_impact,
                'scalability', pa.scalability,
                'prototypePilot', pa.prototype_pilot,
                'mentorAcknowledgeTo', pa.mentor_acknowledge_to,
                'intellectualPropertyPublication', pa.intellectual_property_publication,
                'videoUrl', pa.video_url
            ),
            'participant', jsonb_build_object(
                'id', p.id,
                'fullName', p.full_name,
                'email', p.email,
                'mobile', p.mobile,
                'dateOfBirth', p.date_of_birth,
                'gender', p.gender,
                'emailVerified', p.email_verified,
                'emailVerifiedAt', p.email_verified_at,
                'createdAt', p.created_at,
                'updatedAt', p.updated_at
            ),
            'challenge', CASE
                WHEN c.id IS NULL THEN NULL
                ELSE jsonb_build_object(
                    'id', c.id,
                    'code', c.code,
                    'title', jsonb_build_object(
                        'en', c.title_en,
                        'bn', c.title_bn,
                        'hi', c.title_hi
                    ),
                    'description', jsonb_build_object(
                        'en', c.description_en,
                        'bn', c.description_bn,
                        'hi', c.description_hi
                    ),
                    'startsAt', c.starts_at,
                    'endsAt', c.ends_at,
                    'status', c.status,
                    'isActive', c.is_active
                )
            END,
            'state', CASE
                WHEN s.id IS NULL THEN NULL
                ELSE jsonb_build_object(
                    'id', s.id,
                    'name', jsonb_build_object(
                        'en', s.name_en,
                        'bn', s.name_bn,
                        'hi', s.name_hi
                    )
                )
            END,
            'district', CASE
                WHEN d.id IS NULL THEN NULL
                ELSE jsonb_build_object(
                    'id', d.id,
                    'stateId', d.state_id,
                    'name', jsonb_build_object(
                        'en', d.name_en,
                        'bn', d.name_bn,
                        'hi', d.name_hi
                    )
                )
            END,
            'participantCategory', CASE
                WHEN pc.id IS NULL THEN NULL
                ELSE jsonb_build_object(
                    'id', pc.id,
                    'code', pc.code,
                    'name', jsonb_build_object(
                        'en', pc.name_en,
                        'bn', pc.name_bn,
                        'hi', pc.name_hi
                    )
                )
            END,
            'instituteType', CASE
                WHEN it.id IS NULL THEN NULL
                ELSE jsonb_build_object(
                    'id', it.id,
                    'name', jsonb_build_object(
                        'en', it.name_en,
                        'bn', it.name_bn,
                        'hi', it.name_hi
                    )
                )
            END,
            'challengeCategory', CASE
                WHEN cc.id IS NULL THEN NULL
                ELSE jsonb_build_object(
                    'id', cc.id,
                    'name', jsonb_build_object(
                        'en', cc.name_en,
                        'bn', cc.name_bn,
                        'hi', cc.name_hi
                    )
                )
            END,
            'teamMembers', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', atm.id,
                        'applicationId', atm.application_id,
                        'participantId', atm.participant_id,
                        'fullName', atm.full_name,
                        'email', atm.email,
                        'mobile', atm.mobile,
                        'isApplicant', atm.is_applicant,
                        'sortOrder', atm.sort_order,
                        'createdAt', atm.created_at,
                        'updatedAt', atm.updated_at,
                        'participant', CASE
                            WHEN member_participant.id IS NULL THEN NULL
                            ELSE jsonb_build_object(
                                'id', member_participant.id,
                                'fullName', member_participant.full_name,
                                'email', member_participant.email,
                                'mobile', member_participant.mobile,
                                'emailVerified', member_participant.email_verified,
                                'emailVerifiedAt', member_participant.email_verified_at
                            )
                        END
                    )
                    ORDER BY atm.sort_order, atm.id
                )
                FROM public.application_team_members atm
                LEFT JOIN public.participants member_participant
                    ON member_participant.id = atm.participant_id
                WHERE atm.application_id = pa.id
            ), '[]'::jsonb),
            'documents', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', ad.id,
                        'applicationId', ad.application_id,
                        'uploadedByMemberId', ad.uploaded_by_member_id,
                        'documentType', ad.document_type,
                        'languageCode', ad.language_code,
                        'originalFileName', ad.original_file_name,
                        'storageKey', ad.storage_key,
                        'publicUrl', ad.public_url,
                        'mimeType', ad.mime_type,
                        'fileSizeBytes', ad.file_size_bytes,
                        'checksumSha256', ad.checksum_sha256,
                        'sortOrder', ad.sort_order,
                        'createdAt', ad.created_at,
                        'updatedAt', ad.updated_at
                    )
                    ORDER BY ad.sort_order, ad.id
                )
                FROM public.application_documents ad
                WHERE ad.application_id = pa.id
            ), '[]'::jsonb),
            'formSaves', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', afs.id,
                        'applicationId', afs.application_id,
                        'savedByMemberId', afs.saved_by_member_id,
                        'languageCode', afs.language_code,
                        'formData', afs.form_data,
                        'isCurrent', afs.is_current,
                        'createdAt', afs.created_at
                    )
                    ORDER BY afs.created_at DESC, afs.id DESC
                )
                FROM public.application_form_saves afs
                WHERE afs.application_id = pa.id
            ), '[]'::jsonb),
            'verification', jsonb_build_object(
                'emailTokens', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', pet.id,
                            'participantId', pet.participant_id,
                            'applicationId', pet.application_id,
                            'expiresAt', pet.expires_at,
                            'consumedAt', pet.consumed_at,
                            'createdAt', pet.created_at
                        )
                        ORDER BY pet.created_at DESC, pet.id DESC
                    )
                    FROM public.participant_email_verification_tokens pet
                    WHERE pet.application_id = pa.id
                       OR pet.participant_id = pa.participant_id
                ), '[]'::jsonb),
                'loginTokens', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', plt.id,
                            'applicationId', plt.application_id,
                            'memberId', plt.member_id,
                            'email', plt.email,
                            'expiresAt', plt.expires_at,
                            'consumedAt', plt.consumed_at,
                            'createdAt', plt.created_at
                        )
                        ORDER BY plt.created_at DESC, plt.id DESC
                    )
                    FROM public.participant_login_verification_tokens plt
                    WHERE plt.application_id = pa.id
                ), '[]'::jsonb),
                'emailAttempts', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', pea.id,
                            'email', pea.email,
                            'mobile', pea.mobile,
                            'firstRequestedAt', pea.first_requested_at,
                            'lastSentAt', pea.last_sent_at,
                            'sendCount', pea.send_count,
                            'lockedUntil', pea.locked_until,
                            'createdAt', pea.created_at,
                            'updatedAt', pea.updated_at
                        )
                        ORDER BY pea.updated_at DESC, pea.id DESC
                    )
                    FROM public.participant_email_verification_attempts pea
                    WHERE LOWER(pea.email::text) = LOWER(p.email::text)
                       OR pea.mobile = p.mobile
                ), '[]'::jsonb),
                'loginAttempts', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', pla.id,
                            'email', pla.email,
                            'firstRequestedAt', pla.first_requested_at,
                            'lastSentAt', pla.last_sent_at,
                            'sendCount', pla.send_count,
                            'lockedUntil', pla.locked_until,
                            'createdAt', pla.created_at,
                            'updatedAt', pla.updated_at
                        )
                        ORDER BY pla.updated_at DESC, pla.id DESC
                    )
                    FROM public.participant_login_verification_attempts pla
                    WHERE LOWER(pla.email::text) = LOWER(p.email::text)
                ), '[]'::jsonb)
            )
        ) AS application
        FROM public.participant_applications pa
        JOIN public.participants p
            ON p.id = pa.participant_id
        LEFT JOIN public.challenges c
            ON c.id = pa.challenge_id
        LEFT JOIN public.states s
            ON s.id = pa.state_id
        LEFT JOIN public.districts d
            ON d.id = pa.district_id
        LEFT JOIN public.participant_categories pc
            ON pc.id = pa.participant_category_id
        LEFT JOIN public.institute_types it
            ON it.id = pa.institute_type_id
        LEFT JOIN public.challenge_categories cc
            ON cc.id = pa.challenge_category_id
        ${whereSql}
        ORDER BY ${orderBySql}
        LIMIT ${limitParameter}
        OFFSET ${offsetParameter}
        `,
        values,
    );
    const total = Number(result.rows[0]?.total_count ?? 0);

    return {
        applications: result.rows.map((row) => row.application),
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    };
}

function addApplicationUpdateValue(
    updates: Map<string, unknown>,
    fieldName: string,
    field: ApplicationUpdateField,
    value: unknown,
) {
    let normalized: null | number | string;

    try {
        normalized = field.normalize(value);
    } catch (error) {
        if (error instanceof AdminRuleError) {
            throw new AdminRuleError(`${fieldName}: ${error.message}`);
        }

        throw error;
    }

    if (normalized === null && !field.nullable) {
        throw new AdminRuleError(`${fieldName} cannot be null.`);
    }

    updates.set(field.column, normalized);
}

function collectApplicationUpdateValues(values: Record<string, unknown>) {
    const applicationUpdates = new Map<string, unknown>();
    const participantUpdates = new Map<string, unknown>();
    const allowedTopLevelFields = new Set([
        ...Object.keys(applicationUpdateFields),
        "participant",
        "profile",
        "proposal",
    ]);

    for (const key of Object.keys(values)) {
        if (!allowedTopLevelFields.has(key)) {
            throw new AdminRuleError(`${key} is not an editable field.`);
        }
    }

    for (const [key, field] of Object.entries(applicationUpdateFields)) {
        if (Object.hasOwn(values, key)) {
            addApplicationUpdateValue(applicationUpdates, key, field, values[key]);
        }
    }

    if (Object.hasOwn(values, "participant")) {
        if (!isPlainObject(values.participant)) {
            throw new AdminRuleError("participant must be an object.");
        }

        for (const [key, value] of Object.entries(values.participant)) {
            const field = participantUpdateFields[key];

            if (!field) {
                throw new AdminRuleError(
                    `participant.${key} is not an editable field.`,
                );
            }

            addApplicationUpdateValue(
                participantUpdates,
                `participant.${key}`,
                field,
                value,
            );
        }
    }

    if (Object.hasOwn(values, "profile")) {
        if (!isPlainObject(values.profile)) {
            throw new AdminRuleError("profile must be an object.");
        }

        for (const [key, value] of Object.entries(values.profile)) {
            const field = applicationProfileUpdateFields[key];

            if (!field) {
                throw new AdminRuleError(
                    `profile.${key} is not an editable field.`,
                );
            }

            addApplicationUpdateValue(
                applicationUpdates,
                `profile.${key}`,
                field,
                value,
            );
        }
    }

    if (Object.hasOwn(values, "proposal")) {
        if (!isPlainObject(values.proposal)) {
            throw new AdminRuleError("proposal must be an object.");
        }

        for (const [key, value] of Object.entries(values.proposal)) {
            const field = applicationProposalUpdateFields[key];

            if (!field) {
                throw new AdminRuleError(
                    `proposal.${key} is not an editable field.`,
                );
            }

            addApplicationUpdateValue(
                applicationUpdates,
                `proposal.${key}`,
                field,
                value,
            );
        }
    }

    return {
        applicationUpdates,
        participantUpdates,
    };
}

async function updateApplication(
    pg: DatabasePool,
    input: UpdateAdminApplicationInput,
): Promise<UpdateAdminApplicationResult | null> {
    const { applicationUpdates, participantUpdates } =
        collectApplicationUpdateValues(input.values);

    if (!applicationUpdates.size && !participantUpdates.size) {
        throw new AdminRuleError("At least one editable field is required.");
    }

    const client = await pg.connect();

    try {
        await client.query("BEGIN");

        const exists = await client.query<{ id: string; participant_id: string }>(
            `
            SELECT id, participant_id
            FROM public.participant_applications
            WHERE id = $1
            LIMIT 1
            `,
            [input.applicationId],
        );

        if (!exists.rows[0]) {
            await client.query("ROLLBACK");
            return null;
        }

        if (applicationUpdates.size) {
            const setClauses: string[] = [];
            const values: unknown[] = [];

            for (const [column, value] of applicationUpdates) {
                values.push(value);
                setClauses.push(`${column} = $${values.length}`);
            }

            values.push(input.applicationId);

            await client.query(
                `
                UPDATE public.participant_applications
                SET ${setClauses.join(", ")}
                WHERE id = $${values.length}
                `,
                values,
            );
        }

        if (participantUpdates.size) {
            const setClauses: string[] = [];
            const values: unknown[] = [];

            for (const [column, value] of participantUpdates) {
                values.push(value);
                setClauses.push(`${column} = $${values.length}`);
            }

            values.push(exists.rows[0].participant_id);

            await client.query(
                `
                UPDATE public.participants
                SET ${setClauses.join(", ")}
                WHERE id = $${values.length}
                `,
                values,
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const result = await getApplications(pg, {
        applicationId: input.applicationId,
        pageSize: 1,
    });
    const application = result.applications[0];

    return application ? { application } : null;
}

async function deleteApplication(
    pg: DatabasePool,
    applicationId: number,
): Promise<DeleteAdminApplicationResult | null> {
    const client = await pg.connect();

    try {
        await client.query("BEGIN");

        const applicationResult = await client.query<DeletedApplicationRow>(
            `
            SELECT id::text, application_number
            FROM public.participant_applications
            WHERE id = $1
            LIMIT 1
            `,
            [applicationId],
        );
        const application = applicationResult.rows[0];

        if (!application) {
            await client.query("ROLLBACK");
            return null;
        }

        const documentsResult =
            await client.query<DeletedApplicationDocumentRow>(
                `
                SELECT
                    file_size_bytes::text,
                    mime_type,
                    original_file_name,
                    storage_key
                FROM public.application_documents
                WHERE application_id = $1
                `,
                [applicationId],
            );

        await client.query(
            `
            DELETE FROM public.participant_applications
            WHERE id = $1
            `,
            [applicationId],
        );

        await client.query("COMMIT");

        return {
            application: {
                applicationNumber: application.application_number,
                id: Number(application.id),
            },
            documents: documentsResult.rows.map((row) => ({
                fileSizeBytes: Number(row.file_size_bytes),
                mimeType: row.mime_type,
                originalFileName: row.original_file_name,
                storageKey: row.storage_key,
            })),
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getApplicationDocumentDownload(
    pg: DatabasePool,
    input: {
        applicationId: number;
        documentId: number;
    },
): Promise<AdminApplicationDocumentDownload | null> {
    const result = await pg.query<ApplicationDocumentDownloadRow>(
        `
        SELECT
            file_size_bytes::text,
            mime_type,
            original_file_name,
            storage_key
        FROM public.application_documents
        WHERE id = $1
          AND application_id = $2
        LIMIT 1
        `,
        [input.documentId, input.applicationId],
    );
    const row = result.rows[0];

    if (!row) return null;

    return {
        fileSizeBytes: Number(row.file_size_bytes),
        mimeType: row.mime_type,
        originalFileName: row.original_file_name,
        storageKey: row.storage_key,
    };
}

async function deleteApplicationDocument(
    pg: DatabasePool,
    input: {
        applicationId: number;
        documentId: number;
    },
): Promise<DeleteAdminApplicationDocumentResult | null> {
    const result = await pg.query<
        ApplicationDocumentDownloadRow & {
            id: string;
        }
    >(
        `
        DELETE FROM public.application_documents
        WHERE id = $1
          AND application_id = $2
        RETURNING
            id::text,
            file_size_bytes::text,
            mime_type,
            original_file_name,
            storage_key
        `,
        [input.documentId, input.applicationId],
    );
    const row = result.rows[0];

    if (!row) return null;

    return {
        document: {
            fileSizeBytes: Number(row.file_size_bytes),
            id: Number(row.id),
            mimeType: row.mime_type,
            originalFileName: row.original_file_name,
            storageKey: row.storage_key,
        },
    };
}

async function getDashboardOrganisationTypeCounts(
    pg: DatabasePool,
): Promise<AdminDashboardOrganisationTypeCountsResult> {
    const result = await pg.query<OrganisationTypeCountRow>(`
        WITH target_organisation_types(
            key,
            participant_category_code,
            institute_type_name,
            label,
            sort_order
        ) AS (
            VALUES
                ('juniorSchool', 'JUNIOR', 'School', 'School', 1),
                ('juniorIti', 'JUNIOR', 'ITI', 'ITI', 2),
                ('juniorDiploma', 'JUNIOR', 'Diploma', 'Diploma', 3),
                (
                    'juniorUndergraduate',
                    'JUNIOR',
                    'Undergraduate',
                    'Undergraduate',
                    4
                ),
                ('openGraduate', 'OPEN', 'Graduate', 'Graduate', 5),
                (
                    'openProfessional',
                    'OPEN',
                    'Professional',
                    'Professional',
                    6
                ),
                ('openStartup', 'OPEN', 'Startup', 'Startup', 7),
                (
                    'openCommunityGroup',
                    'OPEN',
                    'Community Group',
                    'Community Group',
                    8
                )
        )

        SELECT
            target_organisation_types.key,
            target_organisation_types.label,
            COUNT(participant_applications.id)::text AS count

        FROM target_organisation_types

        LEFT JOIN public.participant_categories
            ON UPPER(TRIM(participant_categories.code)) =
                target_organisation_types.participant_category_code

        LEFT JOIN public.institute_types
            ON LOWER(TRIM(institute_types.name_en)) =
                LOWER(TRIM(target_organisation_types.institute_type_name))

        LEFT JOIN public.participant_applications
            ON participant_applications.participant_category_id =
                participant_categories.id
            AND participant_applications.institute_type_id = institute_types.id
            AND participant_applications.status = 'submitted'

        GROUP BY
            target_organisation_types.key,
            target_organisation_types.label,
            target_organisation_types.sort_order

        ORDER BY target_organisation_types.sort_order
    `);

    return {
        cards: result.rows.map((row) => ({
            count: Number(row.count),
            detail: "Organisation Type",
            key: row.key,
            label: row.label,
        })),
    };
}

async function getDashboardChallengeCategoryCounts(
    pg: DatabasePool,
): Promise<AdminDashboardChallengeCategoryCountsResult> {
    const result = await pg.query<ChallengeCategoryCountRow>(`
        SELECT
            CONCAT('challengeCategory', challenge_categories.id)::text AS key,
            challenge_categories.name_en AS label,
            COUNT(participant_applications.id)::text AS count

        FROM public.challenge_categories

        LEFT JOIN public.participant_applications
            ON participant_applications.challenge_category_id =
                challenge_categories.id
            AND participant_applications.status = 'submitted'

        WHERE challenge_categories.is_active = TRUE

        GROUP BY
            challenge_categories.id,
            challenge_categories.name_en,
            challenge_categories.sort_order

        ORDER BY
            challenge_categories.sort_order,
            challenge_categories.name_en
    `);

    return {
        cards: result.rows.map((row) => ({
            count: Number(row.count),
            detail: "Challenge Category",
            key: row.key,
            label: row.label,
        })),
    };
}

export const adminService = {
    createSettingsChallengeCategory,
    createSettingsDistrict,
    createSettingsInstituteType,
    createSettingsParticipantCategory,
    createSettingsState,
    createSettingsUserRole,
    createUser,
    deleteApplication,
    deleteApplicationDocument,
    deleteSettingsChallengeCategory,
    deleteSettingsDistrict,
    deleteSettingsInstituteType,
    deleteSettingsParticipantCategory,
    deleteSettingsState,
    deleteSettingsUserRole,
    deleteUser,
    ensureAdminLoginTables,
    getApplicationDocumentDownload,
    getApplications,
    getDashboardChallengeCategoryCounts,
    getDashboardCounts,
    getDashboardOrganisationTypeCounts,
    getSettingsChallengeCategories,
    getSettingsChallengeCategory,
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
    normalizeLanguage,
    requestLoginCode,
    resendLoginCode,
    updateSettingsChallengeCategory,
    updateSettingsDistrict,
    updateSettingsInstituteType,
    updateSettingsParticipantCategory,
    updateSettingsState,
    updateSettingsUserRole,
    updateApplication,
    updateUser,
    verifyLoginCode,
};
