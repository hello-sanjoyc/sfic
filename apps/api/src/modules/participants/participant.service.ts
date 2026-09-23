import { createHash } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getApiContent } from "../../content/index.js";
import { emailService } from "../email/email.service.js";
import { createParticipantJwt } from "./participant-auth.js";
import type {
    GetParticipantApplicationInput,
    GetParticipantApplicationsInput,
    ParticipantApplicationDocumentDownload,
    ParticipantApplicationDetailsResult,
    ParticipantApplicationsResult,
    ParticipantLanguage,
    ParticipantLoginApplication,
    ParticipantProfileResult,
    RequestParticipantLoginCodeInput,
    RequestParticipantLoginCodeResult,
    SubmitParticipantApplicationInput,
    SubmitParticipantApplicationResult,
    VerifyParticipantLoginInput,
    VerifyParticipantLoginResult,
} from "./participant.model.js";

export type DatabaseClient = {
    query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: readonly unknown[],
    ): Promise<{ rows: T[] }>;
};

export type DatabasePool = DatabaseClient & {
    connect(): Promise<PoolClient>;
};

export class ParticipantRuleError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "ParticipantRuleError";
        this.statusCode = statusCode;
    }
}

type ParticipantLoginRow = {
    application_id: string;
    application_number: string;
    email: string;
    full_name: string;
    is_team_lead: boolean;
    member_id: string;
    mobile: string;
    status: string;
};

type ParticipantApplicationSummaryRow = {
    application: {
        applicationHash: string;
        applicationNumber: string;
        challengeCategory: {
            id: number | null;
            name: {
                bn: string | null;
                en: string | null;
                hi: string | null;
            };
        } | null;
        createdAt: string;
        participationMode: string;
        status: string;
        submittedAt: string | null;
        title: string;
        updatedAt: string;
    };
    total_count: string;
};

type ParticipantApplicationDetailsRow = {
    application: ParticipantApplicationDetailsResult["application"];
};

type ParticipantProfileResultRow = {
    profile: ParticipantProfileResult["profile"];
};

type ApplicationDocumentDownloadRow = {
    file_size_bytes: string;
    mime_type: string;
    original_file_name: string;
    storage_key: string;
};

type AppSettingsMap = Record<string, string>;

type ChallengeRow = {
    code: string;
    id: string;
};

type ChallengeCategoryRow = {
    id: string;
    name_en: string;
};

type StateRow = {
    code: string;
    name_en: string;
};

type DistrictRow = {
    name_en: string;
};

type InstituteTypeRow = {
    id: string;
    name_en: string;
};

type ParticipantProfileRow = {
    date_of_birth: Date | string | null;
    email: string;
    email_verified: boolean;
    full_name: string;
    gender: string | null;
    id: string;
    mobile: string;
    participant_category_code: string;
    participant_category_id: string;
};

type NewParticipantApplicationRow = {
    application_hash: string;
    application_number: string;
    id: string;
    participant_id: string;
    status: string;
};

type TeamMemberRow = {
    id: string;
};

const languageCodes = new Set(["bn", "en", "hi"]);

const appSettingKeys = {
    multipleApplications: "PARTICIPANT_APPLICATION_MULTIPLE",
    registrationEnabled: "PARTICIPANT_REGISTRATION_ENABLED",
    registrationEndDate: "PARTICIPANT_REGISTRATION_END_DATE",
    registrationStartDate: "PARTICIPANT_REGISTRATION_START_DATE",
    sameCategoryMultiple: "PARTICIPANT_APPLICATION_SAME_CATEGORY_MULTIPLE",
    sameCategoryMultipleLimit:
        "PARTICIPANT_APPLICATION_SAME_CATEGORY_MULTIPLE_LIMIT",
} as const;

const stateCodesByName = new Map(
    [
        ["Assam", "AS"],
        ["Arunachal Pradesh", "AP"],
        ["Manipur", "MA"],
        ["Mizoram", "MI"],
        ["Nagaland", "NA"],
        ["Tripura", "TR"],
        ["Meghalaya", "ME"],
        ["Sikkim", "SI"],
        ["Bihar", "BI"],
        ["Jharkhand", "JH"],
        ["West Bengal", "WB"],
    ].map(([name, code]) => [name.toLowerCase(), code]),
);

function normalizeLanguage(language: string): ParticipantLanguage {
    if (language === "hn") return "hi";
    return languageCodes.has(language)
        ? (language as ParticipantLanguage)
        : "en";
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function formatDateOfBirth(value: Date | string | null) {
    if (!value) return "";

    const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return "";

    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();

    return `${day}-${month}-${year}`;
}

function getYearFromDate(value: Date | string | null | undefined) {
    if (!value) return null;

    const date =
        value instanceof Date
            ? value
            : new Date(
                  value.includes("T") ? value : `${value.trim()}T00:00:00Z`,
              );
    return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

function isYearOfPassingAtLeast12YearsAfterDateOfBirth(input: {
    dateOfBirth: Date | string | null | undefined;
    yearOfPassing: string;
}) {
    const birthYear = getYearFromDate(input.dateOfBirth);
    if (birthYear === null) return true;

    return Number(input.yearOfPassing) >= birthYear + 12;
}

function getStateCode(stateName: string) {
    return (
        stateCodesByName.get(stateName.toLowerCase()) ??
        stateName
            .replace(/[^A-Za-z]/g, "")
            .slice(0, 2)
            .toUpperCase()
    );
}

function booleanSetting(settings: AppSettingsMap, key: string) {
    return settings[key]?.trim().toLowerCase() === "true";
}

function integerSetting(settings: AppSettingsMap, key: string) {
    const value = Number(settings[key]);
    return Number.isInteger(value) ? value : 0;
}

function dateSetting(settings: AppSettingsMap, key: string) {
    const value = settings[key];
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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

/*
async function ensureParticipantLoginTables(pg: DatabaseClient) {
  await pg.query("CREATE EXTENSION IF NOT EXISTS citext");
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
    CREATE TABLE IF NOT EXISTS participant_login_verification_attempts (
      id                 BIGSERIAL PRIMARY KEY,
      email              CITEXT NOT NULL UNIQUE,
      first_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_sent_at       TIMESTAMPTZ,
      send_count         INTEGER NOT NULL DEFAULT 0,
      locked_until       TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pg.query(`
    CREATE TABLE IF NOT EXISTS participant_login_verification_tokens (
      id             BIGSERIAL PRIMARY KEY,
      application_id BIGINT NOT NULL,
      member_id      BIGINT NOT NULL,
      email          CITEXT NOT NULL,
      token_hash     VARCHAR(128) NOT NULL UNIQUE,
      expires_at     TIMESTAMPTZ NOT NULL,
      consumed_at    TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_participant_login_tokens_application
        FOREIGN KEY (application_id) REFERENCES participant_applications(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT fk_participant_login_tokens_member
        FOREIGN KEY (member_id) REFERENCES application_team_members(id)
        ON UPDATE CASCADE ON DELETE CASCADE
    )
  `);
  await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_participant_login_attempts_locked_until
      ON participant_login_verification_attempts(locked_until)
  `);
  await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_participant_login_tokens_email
      ON participant_login_verification_tokens(email)
  `);
  await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_participant_login_tokens_active
      ON participant_login_verification_tokens(token_hash, expires_at)
      WHERE consumed_at IS NULL
  `);
  await pg.query(`
    DROP TRIGGER IF EXISTS trg_participant_login_attempts_updated_at
      ON participant_login_verification_attempts
  `);
  await pg.query(`
    CREATE TRIGGER trg_participant_login_attempts_updated_at
    BEFORE UPDATE ON participant_login_verification_attempts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}
*/
async function ensureParticipantLoginTables(pg: DatabaseClient) {
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
    CREATE TABLE IF NOT EXISTS participant_login_verification_attempts (
      id                 BIGSERIAL PRIMARY KEY,
      email              VARCHAR(255) NOT NULL UNIQUE,
      first_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_sent_at       TIMESTAMPTZ,
      send_count         INTEGER NOT NULL DEFAULT 0,
      locked_until       TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

    await pg.query(`
    CREATE TABLE IF NOT EXISTS participant_login_verification_tokens (
      id             BIGSERIAL PRIMARY KEY,
      application_id BIGINT NOT NULL,
      member_id      BIGINT NOT NULL,
      email          VARCHAR(255) NOT NULL,
      token_hash     VARCHAR(128) NOT NULL UNIQUE,
      expires_at     TIMESTAMPTZ NOT NULL,
      consumed_at    TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_participant_login_tokens_application
        FOREIGN KEY (application_id) REFERENCES participant_applications(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT fk_participant_login_tokens_member
        FOREIGN KEY (member_id) REFERENCES application_team_members(id)
        ON UPDATE CASCADE ON DELETE CASCADE
    )
  `);

    await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_participant_login_attempts_locked_until
      ON participant_login_verification_attempts(locked_until)
  `);

    await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_participant_login_tokens_email
      ON participant_login_verification_tokens(email)
  `);

    await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_participant_login_tokens_active
      ON participant_login_verification_tokens(token_hash, expires_at)
      WHERE consumed_at IS NULL
  `);

    await pg.query(`
    DROP TRIGGER IF EXISTS trg_participant_login_attempts_updated_at
      ON participant_login_verification_attempts
  `);

    await pg.query(`
    CREATE TRIGGER trg_participant_login_attempts_updated_at
    BEFORE UPDATE ON participant_login_verification_attempts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}
function toLoginApplication(
    row: ParticipantLoginRow,
): ParticipantLoginApplication {
    return {
        applicationId: Number(row.application_id),
        applicationNumber: row.application_number,
        memberId: Number(row.member_id),
        memberName: row.full_name,
        phone: row.mobile,
        role: row.is_team_lead ? "applicant" : "team_member",
        status: row.status,
    };
}

function getResendAvailableAt(lastSentAt = new Date()) {
    return new Date(
        lastSentAt.getTime() + verificationResendIntervalMinutes() * 60 * 1000,
    );
}

async function findParticipantByEmail(client: PoolClient, email: string) {
    const result = await client.query<ParticipantLoginRow>(
        `
      SELECT
        pa.id AS application_id,
        pa.application_number,
        pa.status,
        atm.id AS member_id,
        atm.email::text AS email,
        atm.full_name,
        atm.mobile,
        (
          atm.id = pa.team_lead_team_member_id
          OR atm.is_applicant = TRUE
        ) AS is_team_lead
      FROM application_team_members atm
      JOIN participant_applications pa ON pa.id = atm.application_id
      WHERE LOWER(atm.email::text) = LOWER($1)
        AND pa.status <> 'email_verification'
      ORDER BY
        CASE WHEN pa.status = 'submitted' THEN 0 ELSE 1 END,
        pa.submitted_at DESC NULLS LAST,
        pa.updated_at DESC,
        pa.id DESC
      LIMIT 1
    `,
        [email],
    );

    return result.rows[0] ?? null;
}

async function reserveLoginAttempt(input: {
    client: PoolClient;
    email: string;
    language: ParticipantLanguage;
}) {
    const result = await input.client.query<{
        locked_until: Date | null;
        last_sent_at: Date | null;
    }>(
        `
      INSERT INTO participant_login_verification_attempts (
        email,
        first_requested_at,
        last_sent_at,
        send_count
      )
      VALUES ($1, NOW(), NOW(), 1)
      ON CONFLICT (email) DO UPDATE
      SET first_requested_at = CASE
            WHEN participant_login_verification_attempts.first_requested_at <= NOW() - ($2 || ' minutes')::interval
              THEN NOW()
            ELSE participant_login_verification_attempts.first_requested_at
          END,
          send_count = CASE
            WHEN participant_login_verification_attempts.first_requested_at <= NOW() - ($2 || ' minutes')::interval
              THEN 1
            ELSE participant_login_verification_attempts.send_count + 1
          END,
          last_sent_at = NOW(),
          locked_until = CASE
            WHEN participant_login_verification_attempts.locked_until IS NOT NULL
             AND participant_login_verification_attempts.locked_until > NOW()
              THEN participant_login_verification_attempts.locked_until
            WHEN participant_login_verification_attempts.first_requested_at > NOW() - ($2 || ' minutes')::interval
             AND participant_login_verification_attempts.send_count + 1 > $3
              THEN participant_login_verification_attempts.first_requested_at + ($2 || ' minutes')::interval
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
        throw new ParticipantRuleError(
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
    language: ParticipantLanguage;
}) {
    const latestToken = await input.client.query<{ created_at: Date }>(
        `
      SELECT created_at
      FROM participant_login_verification_tokens
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
        throw new ParticipantRuleError(
            getApiContent(input.language).api.verificationResendTooSoon.replace(
                "{minutes}",
                String(verificationResendIntervalMinutes()),
            ),
            429,
        );
    }
}

async function createLoginToken(input: {
    applicationId: number;
    client: PoolClient;
    email: string;
    memberId: number;
}) {
    const token = createVerificationCode();

    await input.client.query(
        `
      UPDATE participant_login_verification_tokens
      SET consumed_at = COALESCE(consumed_at, NOW())
      WHERE LOWER(email::text) = LOWER($1)
        AND consumed_at IS NULL
    `,
        [input.email],
    );

    await input.client.query(
        `
      INSERT INTO participant_login_verification_tokens (
        application_id,
        member_id,
        email,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval)
    `,
        [
            input.applicationId,
            input.memberId,
            input.email,
            hashToken(token),
            verificationTokenTtlMinutes(),
        ],
    );

    return token;
}

async function sendLoginCode(
    pg: DatabasePool,
    input: RequestParticipantLoginCodeInput,
    options: { isResend?: boolean } = {},
): Promise<RequestParticipantLoginCodeResult> {
    const language = normalizeLanguage(input.language);
    const client = await pg.connect();
    let participant: ParticipantLoginApplication & { email: string };
    let code = "";
    let resendAvailableAt = new Date();

    try {
        await client.query("BEGIN");
        const row = await findParticipantByEmail(client, input.email);

        if (!row) {
            throw new ParticipantRuleError(
                getApiContent(language).api.participantNotFound,
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
        participant = {
            ...toLoginApplication(row),
            email: row.email,
        };
        code = await createLoginToken({
            applicationId: participant.applicationId,
            client,
            email: participant.email,
            memberId: participant.memberId,
        });
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const emailDelivery =
        await emailService.sendParticipantLoginVerificationEmail({
            code,
            language,
            participantEmail: participant.email,
            participantName: participant.memberName,
        });

    if (!emailDelivery.delivered) {
        console.info(
            `Participant login verification code for ${participant.email}: ${code}`,
        );
    }

    return {
        emailDelivery,
        loginRequest: {
            email: participant.email,
            resendAvailableAt: resendAvailableAt.toISOString(),
        },
    };
}

async function requestLoginCode(
    pg: DatabasePool,
    input: RequestParticipantLoginCodeInput,
) {
    return sendLoginCode(pg, input);
}

async function resendLoginCode(
    pg: DatabasePool,
    input: RequestParticipantLoginCodeInput,
) {
    return sendLoginCode(pg, input, { isResend: true });
}

async function verifyLoginCode(
    pg: DatabasePool,
    input: VerifyParticipantLoginInput,
): Promise<VerifyParticipantLoginResult> {
    const language = normalizeLanguage(input.language);
    const client = await pg.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query<ParticipantLoginRow>(
            `
        SELECT
          pa.id AS application_id,
          pa.application_number,
          pa.status,
          atm.id AS member_id,
          atm.email::text AS email,
          atm.full_name,
          atm.mobile,
          (
            atm.id = pa.team_lead_team_member_id
            OR atm.is_applicant = TRUE
          ) AS is_team_lead
        FROM participant_login_verification_tokens plvt
        JOIN application_team_members atm ON atm.id = plvt.member_id
        JOIN participant_applications pa ON pa.id = plvt.application_id
        WHERE plvt.token_hash = $1
          AND LOWER(plvt.email::text) = LOWER($2)
          AND plvt.consumed_at IS NULL
          AND plvt.expires_at > NOW()
        FOR UPDATE OF plvt
      `,
            [hashToken(input.code), input.email],
        );
        const row = result.rows[0];

        if (!row) {
            throw new ParticipantRuleError(
                getApiContent(language).api.invalidToken,
                400,
            );
        }

        await client.query(
            `
        UPDATE participant_login_verification_tokens
        SET consumed_at = NOW()
        WHERE token_hash = $1
      `,
            [hashToken(input.code)],
        );

        const participant = toLoginApplication(row);
        const sessionToken = createParticipantJwt({
            email: row.email,
            name: row.full_name,
            phone: row.mobile,
            role: participant.role,
            sub: row.member_id,
        });

        await client.query("COMMIT");

        return {
            participant: {
                ...participant,
                email: row.email,
            },
            session: {
                token: sessionToken,
            },
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getApplicationSettings(client: PoolClient) {
    const result = await client.query<{
        setting_key: string;
        setting_value: string;
    }>(
        `
      SELECT setting_key, setting_value
      FROM public.app_settings
      WHERE is_active = TRUE
    `,
    );

    return Object.fromEntries(
        result.rows.map((row) => [row.setting_key, row.setting_value]),
    );
}

function assertApplicationSettingsAllowSubmit(input: {
    existingApplicationCount: number;
    sameCategoryCount: number;
    settings: AppSettingsMap;
}) {
    const { existingApplicationCount, sameCategoryCount, settings } = input;

    if (!booleanSetting(settings, appSettingKeys.registrationEnabled)) {
        throw new ParticipantRuleError(
            "Participant registration is currently closed.",
            403,
        );
    }

    const now = new Date();
    const startDate = dateSetting(
        settings,
        appSettingKeys.registrationStartDate,
    );
    const endDate = dateSetting(settings, appSettingKeys.registrationEndDate);

    if (startDate && now < startDate) {
        throw new ParticipantRuleError(
            "New applications are not open yet.",
            403,
        );
    }

    if (endDate && now > endDate) {
        throw new ParticipantRuleError(
            "The new application window has closed.",
            403,
        );
    }

    if (
        !booleanSetting(settings, appSettingKeys.multipleApplications) &&
        existingApplicationCount > 0
    ) {
        throw new ParticipantRuleError(
            "Multiple applications are not enabled for participants.",
            403,
        );
    }

    if (!booleanSetting(settings, appSettingKeys.sameCategoryMultiple)) {
        if (sameCategoryCount > 0) {
            throw new ParticipantRuleError(
                "You have already applied in this challenge category.",
                409,
            );
        }
        return;
    }

    const sameCategoryLimit = integerSetting(
        settings,
        appSettingKeys.sameCategoryMultipleLimit,
    );
    if (sameCategoryLimit > 0 && sameCategoryCount >= sameCategoryLimit) {
        throw new ParticipantRuleError(
            `You can apply a maximum of ${sameCategoryLimit} applications in the same challenge category.`,
            409,
        );
    }
}

async function getActiveChallenge(client: PoolClient) {
    const result = await client.query<ChallengeRow>(`
    SELECT id, code
    FROM public.challenges
    WHERE is_active = TRUE
      AND status = 'open'
    ORDER BY starts_at DESC NULLS LAST, id DESC
    LIMIT 1
  `);

    return result.rows[0] ?? null;
}

async function getParticipantProfile(client: PoolClient, email: string) {
    const result = await client.query<ParticipantProfileRow>(
        `
      SELECT
        p.id,
        p.full_name,
        p.email::text AS email,
        p.mobile,
        p.email_verified,
        p.date_of_birth,
        p.gender,
        pc.id AS participant_category_id,
        pc.code AS participant_category_code
      FROM public.participants p
      JOIN public.participant_applications pa
        ON pa.participant_id = p.id
      JOIN public.participant_categories pc
        ON pc.id = pa.participant_category_id
      WHERE LOWER(p.email::text) = LOWER($1)
      ORDER BY pa.submitted_at DESC NULLS LAST, pa.updated_at DESC, pa.id DESC
      LIMIT 1
      FOR UPDATE OF p
    `,
        [email],
    );

    return result.rows[0] ?? null;
}

async function getState(client: PoolClient, stateId: number) {
    const result = await client.query<StateRow>(
        `
      SELECT id, name_en
      FROM public.states
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
        [stateId],
    );
    const state = result.rows[0];

    if (!state) return null;

    return {
        ...state,
        code: getStateCode(state.name_en),
    };
}

async function getDistrict(input: {
    client: PoolClient;
    districtId: number;
    stateId: number;
}) {
    const result = await input.client.query<DistrictRow>(
        `
      SELECT name_en
      FROM public.districts
      WHERE id = $1
        AND state_id = $2
        AND is_active = TRUE
      LIMIT 1
    `,
        [input.districtId, input.stateId],
    );

    return result.rows[0] ?? null;
}

async function getInstituteType(input: {
    client: PoolClient;
    instituteType: string;
    participantCategoryId: string;
}) {
    const result = await input.client.query<InstituteTypeRow>(
        `
      SELECT it.id, it.name_en
      FROM public.institute_types it
      JOIN public.participant_category_institute_types pcit
        ON pcit.institute_type_id = it.id
      WHERE pcit.participant_category_id = $1
        AND it.is_active = TRUE
        AND LOWER(it.name_en) = LOWER($2)
      LIMIT 1
    `,
        [input.participantCategoryId, input.instituteType],
    );

    return result.rows[0] ?? null;
}

async function getChallengeCategory(input: {
    challengeCategoryId: number;
    client: PoolClient;
}) {
    const result = await input.client.query<ChallengeCategoryRow>(
        `
      SELECT id, name_en
      FROM public.challenge_categories
      WHERE is_active = TRUE
        AND id = $1
      LIMIT 1
    `,
        [input.challengeCategoryId],
    );

    return result.rows[0] ?? null;
}

async function getParticipantApplicationCounts(input: {
    challengeCategoryId: number;
    client: PoolClient;
    participantId: string;
}) {
    const result = await input.client.query<{
        same_category_count: string;
        total_count: string;
    }>(
        `
      SELECT
        COUNT(*)::text AS total_count,
        COUNT(*) FILTER (WHERE challenge_category_id = $2)::text AS same_category_count
      FROM public.participant_applications
      WHERE participant_id = $1
    `,
        [input.participantId, input.challengeCategoryId],
    );
    const row = result.rows[0];

    return {
        sameCategoryCount: Number(row?.same_category_count ?? 0),
        totalCount: Number(row?.total_count ?? 0),
    };
}

async function nextApplicationNumber(
    client: PoolClient,
    language: ParticipantLanguage,
    stateCode: string,
) {
    await client.query(
        `
      INSERT INTO public.application_number_sequences (state_code, next_number)
      VALUES ($1, 1)
      ON CONFLICT (state_code) DO NOTHING
    `,
        [stateCode],
    );

    const result = await client.query<{ running_number: number }>(
        `
      UPDATE public.application_number_sequences
      SET next_number = next_number + 1,
          updated_at = NOW()
      WHERE state_code = $1
        AND next_number <= 9999
      RETURNING next_number - 1 AS running_number
    `,
        [stateCode],
    );
    const runningNumber = result.rows[0]?.running_number;

    if (!runningNumber) {
        throw new ParticipantRuleError(
            getApiContent(language).api.applicationNumberLimitReached.replace(
                "{stateCode}",
                stateCode,
            ),
        );
    }

    return `SFIC-${stateCode}-${String(runningNumber).padStart(4, "0")}`;
}

async function insertApplicantTeamMember(input: {
    applicant: ParticipantProfileRow;
    applicationId: string;
    client: PoolClient;
}) {
    const result = await input.client.query<TeamMemberRow>(
        `
      INSERT INTO public.application_team_members (
        application_id,
        participant_id,
        full_name,
        email,
        mobile,
        is_applicant,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, 0)
      RETURNING id
    `,
        [
            input.applicationId,
            input.applicant.id,
            input.applicant.full_name,
            input.applicant.email,
            input.applicant.mobile,
        ],
    );

    await input.client.query(
        `
      UPDATE public.participant_applications
      SET team_lead_team_member_id = $1
      WHERE id = $2
    `,
        [result.rows[0].id, input.applicationId],
    );

    return result.rows[0];
}

async function insertTeamMembers(input: {
    applicationId: string;
    client: PoolClient;
    teamMembers: SubmitParticipantApplicationInput["teamMembers"];
}) {
    for (const [index, member] of input.teamMembers.entries()) {
        await input.client.query(
            `
        INSERT INTO public.application_team_members (
          application_id,
          full_name,
          email,
          mobile,
          is_applicant,
          sort_order
        )
        VALUES ($1, $2, $3, $4, FALSE, $5)
      `,
            [
                input.applicationId,
                member.fullName,
                member.email,
                member.mobile,
                index + 1,
            ],
        );
    }
}

async function insertApplicationDocuments(input: {
    applicationId: string;
    client: PoolClient;
    documents: SubmitParticipantApplicationInput["supportingDocuments"];
    language: ParticipantLanguage;
    uploadedByMemberId: string;
}) {
    for (const [index, document] of (input.documents ?? []).entries()) {
        await input.client.query(
            `
        INSERT INTO public.application_documents (
          application_id,
          uploaded_by_member_id,
          document_type,
          language_code,
          original_file_name,
          storage_key,
          mime_type,
          file_size_bytes,
          checksum_sha256,
          sort_order
        )
        VALUES ($1, $2, 'supporting_document', $3, $4, $5, $6, $7, $8, $9)
      `,
            [
                input.applicationId,
                input.uploadedByMemberId,
                input.language,
                document.originalFileName,
                document.storageKey,
                document.mimeType,
                document.size,
                document.checksumSha256 ?? null,
                index + 1,
            ],
        );
    }
}

function submittedDetails(input: {
    applicant: ParticipantProfileRow;
    applicationNumber: string;
    districtName: string;
    form: SubmitParticipantApplicationInput;
    stateName: string;
}) {
    const teamMembers = input.form.teamMembers
        .map(
            (member, index) =>
                `${index + 2}. ${member.fullName} (${member.email})`,
        )
        .join("; ");
    const documents = input.form.supportingDocuments
        ?.map((document) => document.originalFileName)
        .join(", ");

    return [
        { label: "Application Number", value: input.applicationNumber },
        { label: "Participant Name", value: input.applicant.full_name },
        {
            label: "Date of Birth",
            value: formatDateOfBirth(input.applicant.date_of_birth),
        },
        { label: "Gender", value: input.applicant.gender ?? undefined },
        { label: "Email", value: input.applicant.email },
        { label: "Mobile", value: input.applicant.mobile },
        {
            label: "Participant Category",
            value: input.applicant.participant_category_code,
        },
        { label: "State", value: input.stateName },
        { label: "District", value: input.districtName },
        { label: "City", value: input.form.city },
        { label: "PIN Code", value: input.form.pinCode },
        { label: "Address", value: input.form.address },
        {
            label: "Highest Educational Qualification",
            value: input.form.highestEducationalQualification,
        },
        {
            label: "Last Attended Educational Institute",
            value: input.form.lastAttendedEducationalInstitute,
        },
        { label: "Year of Passing", value: input.form.yearOfPassing },
        { label: "Present Organisation Name", value: input.form.instituteName },
        { label: "Organisation Type", value: input.form.instituteType },
        { label: "Participation Mode", value: input.form.participationMode },
        { label: "Team Members", value: teamMembers },
        { label: "Challenge Category", value: input.form.theme },
        { label: "Problem and Location", value: input.form.problemLocation },
        { label: "Proposed Solution", value: input.form.proposedSolution },
        { label: "Technology or Method", value: input.form.technologyMethod },
        {
            label: "Implementation Route",
            value: input.form.implementationRoute,
        },
        { label: "Cost and Funding", value: input.form.costFunding },
        { label: "Beneficiaries", value: input.form.beneficiaries },
        { label: "Project Timeline", value: input.form.projectTimeline },
        { label: "Expected Impact", value: input.form.expectedImpact },
        { label: "Scalability", value: input.form.scalability },
        { label: "Prototype or Pilot", value: input.form.prototypePilot },
        {
            label: "Mentor / Acknowledge to",
            value: input.form.mentorAcknowledgeTo,
        },
        {
            label: "Intellectual Property / Publication",
            value: input.form.intellectualPropertyPublication,
        },
        { label: "Supporting Documents", value: documents },
        { label: "Video URL", value: input.form.videoUrl },
    ];
}

async function submitApplication(
    pg: DatabasePool,
    input: SubmitParticipantApplicationInput,
): Promise<SubmitParticipantApplicationResult> {
    const language = normalizeLanguage(input.language);
    const client = await pg.connect();
    let application: SubmitParticipantApplicationResult["application"];
    let applicant: ParticipantProfileRow;
    let details: Array<{ label: string; value?: string }>;

    try {
        await client.query("BEGIN");

        applicant = await getParticipantProfile(client, input.email).then(
            (row) => {
                if (!row) {
                    throw new ParticipantRuleError(
                        getApiContent(language).api.participantNotFound,
                        404,
                    );
                }
                return row;
            },
        );

        if (!applicant.email_verified) {
            throw new ParticipantRuleError(
                getApiContent(language).api.emailMustBeVerified,
                403,
            );
        }

        if (
            !isYearOfPassingAtLeast12YearsAfterDateOfBirth({
                dateOfBirth: applicant.date_of_birth,
                yearOfPassing: input.yearOfPassing,
            })
        ) {
            throw new ParticipantRuleError(
                getApiContent(language).apiValidation.yearOfPassingAgeGap,
            );
        }

        const challenge = await getActiveChallenge(client);
        if (!challenge) {
            throw new ParticipantRuleError(
                getApiContent(language).api.noActiveChallenge,
                503,
            );
        }

        const state = await getState(client, input.stateId);
        if (!state) {
            throw new ParticipantRuleError(
                getApiContent(language).api.invalidState,
            );
        }

        const district = await getDistrict({
            client,
            districtId: input.districtId,
            stateId: input.stateId,
        });
        if (!district) {
            throw new ParticipantRuleError(
                getApiContent(language).api.invalidDistrictForState,
            );
        }

        const instituteType = await getInstituteType({
            client,
            instituteType: input.instituteType,
            participantCategoryId: applicant.participant_category_id,
        });
        if (!instituteType) {
            throw new ParticipantRuleError(
                getApiContent(language).api
                    .invalidInstituteTypeForParticipantCategory,
            );
        }

        const challengeCategory = await getChallengeCategory({
            challengeCategoryId: input.challengeCategoryId,
            client,
        });
        if (!challengeCategory) {
            throw new ParticipantRuleError(
                getApiContent(language).api.invalidChallengeCategory,
            );
        }

        const settings = await getApplicationSettings(client);
        const counts = await getParticipantApplicationCounts({
            challengeCategoryId: Number(challengeCategory.id),
            client,
            participantId: applicant.id,
        });
        assertApplicationSettingsAllowSubmit({
            existingApplicationCount: counts.totalCount,
            sameCategoryCount: counts.sameCategoryCount,
            settings,
        });

        const applicationNumber = await nextApplicationNumber(
            client,
            language,
            state.code,
        );

        const applicationResult =
            await client.query<NewParticipantApplicationRow>(
                `
        INSERT INTO public.participant_applications (
            application_number,
            challenge_id,
            participant_id,
            participant_category_id,
            state_id,
            district_id,
            institute_type_id,
            challenge_category_id,
            form_language,
            participation_mode,
            status,
            city,
            pin_code,
            address,
            institute_name,
            other_institute_type,
            highest_educational_qualification,
            last_attended_educational_institute,
            year_of_passing,
            problem_location,
            proposed_solution,
            technology_method,
            implementation_route,
            cost_funding,
            beneficiaries,
            project_timeline,
            expected_impact,
            scalability,
            prototype_pilot,
            mentor_acknowledge_to,
            intellectual_property_publication,
            video_url,
            submitted_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            'submitted',
            $11, $12, $13, $14, NULLIF($15, ''), $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
            NULLIF($30, ''), NULLIF($31, ''), NOW()
        )
        RETURNING
            id,
            md5(id::text) AS application_hash,
            application_number,
            participant_id,
            status
      `,
                [
                    applicationNumber,
                    challenge.id,
                    applicant.id,
                    applicant.participant_category_id,
                    input.stateId,
                    input.districtId,
                    instituteType.id,
                    challengeCategory.id,
                    language,
                    input.participationMode,
                    input.city,
                    input.pinCode,
                    input.address,
                    input.instituteName,
                    input.otherInstituteType ?? "",
                    input.highestEducationalQualification,
                    input.lastAttendedEducationalInstitute,
                    input.yearOfPassing,
                    input.problemLocation,
                    input.proposedSolution,
                    input.technologyMethod,
                    input.implementationRoute,
                    input.costFunding,
                    input.beneficiaries,
                    input.projectTimeline,
                    input.expectedImpact,
                    input.scalability,
                    input.prototypePilot,
                    input.mentorAcknowledgeTo ?? "",
                    input.intellectualPropertyPublication ?? "",
                    input.videoUrl ?? "",
                ],
            );
        const applicationRow = applicationResult.rows[0];

        const applicantMember = await insertApplicantTeamMember({
            applicant,
            applicationId: applicationRow.id,
            client,
        });

        await insertTeamMembers({
            applicationId: applicationRow.id,
            client,
            teamMembers:
                input.participationMode === "Team" ? input.teamMembers : [],
        });

        await insertApplicationDocuments({
            applicationId: applicationRow.id,
            client,
            documents: input.supportingDocuments,
            language,
            uploadedByMemberId: applicantMember.id,
        });

        await client.query(
            `
        INSERT INTO public.application_form_saves (
          application_id,
          saved_by_member_id,
          language_code,
          form_data,
          is_current
        )
        VALUES ($1, $2, $3, $4::jsonb, TRUE)
      `,
            [
                applicationRow.id,
                applicantMember.id,
                language,
                JSON.stringify({
                    step: 4,
                    ...input,
                    applicationNumber,
                    challengeCategoryName: challengeCategory.name_en,
                }),
            ],
        );

        application = {
            applicationHash: applicationRow.application_hash,
            applicationNumber: applicationRow.application_number,
            id: Number(applicationRow.id),
            participantId: Number(applicationRow.participant_id),
            status: applicationRow.status,
        };
        details = submittedDetails({
            applicant,
            applicationNumber,
            districtName: district.name_en,
            form: {
                ...input,
                theme: input.theme ?? challengeCategory.name_en,
            },
            stateName: state.name_en,
        });

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const emailDelivery = await emailService.sendApplicationSubmittedEmail({
        applicationNumber: application.applicationNumber,
        details,
        language,
        participantEmail: applicant.email,
        participantName: applicant.full_name,
    });

    const submittedTeamMembers =
        input.participationMode === "Team" ? input.teamMembers : [];
    const teamMemberEmailDeliveries = await Promise.all(
        submittedTeamMembers.map((member) =>
            emailService.sendTeamMemberAddedEmail({
                applicationNumber: application.applicationNumber,
                language,
                participantEmail: member.email,
                participantName: member.fullName,
                teamLeadName: applicant.full_name,
            }),
        ),
    );

    if (!emailDelivery.delivered) {
        console.info(
            `Application submitted email for ${applicant.email}: ${application.applicationNumber}`,
        );
    }
    teamMemberEmailDeliveries.forEach((delivery, index) => {
        if (!delivery.delivered) {
            console.info(
                `Team member added email for ${submittedTeamMembers[index].email}: ${application.applicationNumber}`,
            );
        }
    });

    return {
        application,
        emailDelivery,
    };
}

const applicationSortExpressions = {
    applicationNumber: "pa.application_number",
    challengeCategory: "cc.name_en",
    createdAt: "pa.created_at",
    participationMode: "pa.participation_mode",
    status: "pa.status",
} as const;

async function getApplications(
    pg: DatabasePool,
    input: GetParticipantApplicationsInput,
): Promise<ParticipantApplicationsResult> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const offset = (page - 1) * pageSize;
    const sortExpression = applicationSortExpressions[input.sortBy];
    const values: unknown[] = [input.email];
    const where = [
        `
        EXISTS (
          SELECT 1
          FROM public.application_team_members auth_member
          WHERE auth_member.application_id = pa.id
            AND LOWER(auth_member.email::text) = LOWER($1)
        )
      `,
    ];

    if (input.status) {
        values.push(input.status);
        where.push(`pa.status = $${values.length}`);
    }

    values.push(pageSize);
    const limitParameter = `$${values.length}`;
    values.push(offset);
    const offsetParameter = `$${values.length}`;

    const result = await pg.query<ParticipantApplicationSummaryRow>(
        `
      SELECT
        COUNT(*) OVER()::text AS total_count,
        jsonb_build_object(
          'applicationHash', md5(pa.id::text),
          'applicationNumber', pa.application_number,
          'title', COALESCE(NULLIF(pa.proposed_solution, ''), c.title_en, pa.application_number),
          'status', pa.status,
          'participationMode', pa.participation_mode,
          'createdAt', pa.created_at,
          'updatedAt', pa.updated_at,
          'submittedAt', pa.submitted_at,
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
          END
        ) AS application
      FROM public.participant_applications pa
      LEFT JOIN public.challenges c
        ON c.id = pa.challenge_id
      LEFT JOIN public.challenge_categories cc
        ON cc.id = pa.challenge_category_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpression} ${input.sortDirection} NULLS LAST, pa.id DESC
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

async function getProfile(
    pg: DatabasePool,
    input: { email: string },
): Promise<ParticipantProfileResult | null> {
    const result = await pg.query<ParticipantProfileResultRow>(
        `
      SELECT
        jsonb_build_object(
          'fullName', atm.full_name,
          'email', atm.email::text,
          'mobile', atm.mobile,
          'role', CASE
            WHEN atm.id = pa.team_lead_team_member_id OR atm.is_applicant = TRUE
              THEN 'applicant'
            ELSE 'team_member'
          END,
          'dateOfBirth', CASE
            WHEN atm.id = pa.team_lead_team_member_id OR atm.is_applicant = TRUE
              THEN p.date_of_birth
            ELSE NULL
          END,
          'gender', CASE
            WHEN atm.id = pa.team_lead_team_member_id OR atm.is_applicant = TRUE
              THEN p.gender
            ELSE NULL
          END,
          'state', CASE
            WHEN s.id IS NULL THEN NULL
            ELSE jsonb_build_object(
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
              'name', jsonb_build_object(
                'en', d.name_en,
                'bn', d.name_bn,
                'hi', d.name_hi
              )
            )
          END,
          'city', pa.city,
          'pinCode', pa.pin_code,
          'address', pa.address,
          'highestEducationalQualification', pa.highest_educational_qualification,
          'lastAttendedEducationalInstitute', pa.last_attended_educational_institute,
          'yearOfPassing', pa.year_of_passing,
          'instituteName', pa.institute_name,
          'otherInstituteType', pa.other_institute_type,
          'instituteType', CASE
            WHEN it.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'name', jsonb_build_object(
                'en', it.name_en,
                'bn', it.name_bn,
                'hi', it.name_hi
              )
            )
          END
        ) AS profile
      FROM public.application_team_members atm
      JOIN public.participant_applications pa
        ON pa.id = atm.application_id
      LEFT JOIN public.participants p
        ON p.id = pa.participant_id
      LEFT JOIN public.states s
        ON s.id = pa.state_id
      LEFT JOIN public.districts d
        ON d.id = pa.district_id
      LEFT JOIN public.institute_types it
        ON it.id = pa.institute_type_id
      WHERE LOWER(atm.email::text) = LOWER($1)
      ORDER BY
        CASE WHEN pa.status = 'submitted' THEN 0 ELSE 1 END,
        pa.submitted_at DESC NULLS LAST,
        pa.updated_at DESC,
        pa.id DESC
      LIMIT 1
    `,
        [input.email],
    );
    const profile = result.rows[0]?.profile;

    return profile ? { profile } : null;
}

async function getApplication(
    pg: DatabasePool,
    input: GetParticipantApplicationInput,
): Promise<ParticipantApplicationDetailsResult | null> {
    const result = await pg.query<ParticipantApplicationDetailsRow>(
        `
      SELECT
        jsonb_build_object(
          'applicationHash', md5(pa.id::text),
          'applicationNumber', pa.application_number,
          'status', pa.status,
          'formLanguage', pa.form_language,
          'participationMode', pa.participation_mode,
          'submittedAt', pa.submitted_at,
          'createdAt', pa.created_at,
          'updatedAt', pa.updated_at,
          'title', COALESCE(NULLIF(pa.proposed_solution, ''), c.title_en, pa.application_number),
          'profile', jsonb_build_object(
            'city', pa.city,
            'pinCode', pa.pin_code,
            'address', pa.address,
            'instituteName', pa.institute_name,
            'instituteTypeId', pa.institute_type_id,
            'otherInstituteType', pa.other_institute_type,
            'highestEducationalQualification', pa.highest_educational_qualification,
            'lastAttendedEducationalInstitute', pa.last_attended_educational_institute,
            'yearOfPassing', pa.year_of_passing
          ),
          'proposal', jsonb_build_object(
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
            'fullName', p.full_name,
            'email', p.email,
            'mobile', p.mobile,
            'dateOfBirth', p.date_of_birth,
            'gender', p.gender,
            'emailVerified', p.email_verified
          ),
          'challenge', CASE
            WHEN c.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'code', c.code,
              'title', jsonb_build_object(
                'en', c.title_en,
                'bn', c.title_bn,
                'hi', c.title_hi
              )
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
                'fullName', atm.full_name,
                'email', atm.email,
                'mobile', atm.mobile,
                'isApplicant', atm.is_applicant
              )
              ORDER BY atm.sort_order, atm.id
            )
            FROM public.application_team_members atm
            WHERE atm.application_id = pa.id
          ), '[]'::jsonb),
          'documents', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ad.id,
                'documentType', ad.document_type,
                'originalFileName', ad.original_file_name,
                'storageKey', ad.storage_key,
                'publicUrl', ad.public_url,
                'fileSizeBytes', ad.file_size_bytes
              )
              ORDER BY ad.sort_order, ad.id
            )
            FROM public.application_documents ad
            WHERE ad.application_id = pa.id
          ), '[]'::jsonb)
        ) AS application
      FROM public.participant_applications pa
      JOIN public.participants p
        ON p.id = pa.participant_id
      LEFT JOIN public.challenges c
        ON c.id = pa.challenge_id
      LEFT JOIN public.challenge_categories cc
        ON cc.id = pa.challenge_category_id
      LEFT JOIN public.participant_categories pc
        ON pc.id = pa.participant_category_id
      LEFT JOIN public.institute_types it
        ON it.id = pa.institute_type_id
      LEFT JOIN public.states s
        ON s.id = pa.state_id
      LEFT JOIN public.districts d
        ON d.id = pa.district_id
      WHERE md5(pa.id::text) = LOWER($2)
        AND EXISTS (
          SELECT 1
          FROM public.application_team_members auth_member
          WHERE auth_member.application_id = pa.id
            AND LOWER(auth_member.email::text) = LOWER($1)
        )
      LIMIT 1
    `,
        [input.email, input.applicationHash],
    );

    const application = result.rows[0]?.application;
    return application ? { application } : null;
}

async function getApplicationDocumentDownload(
    pg: DatabasePool,
    input: {
        applicationHash: string;
        documentId: number;
        email: string;
    },
): Promise<ParticipantApplicationDocumentDownload | null> {
    const result = await pg.query<ApplicationDocumentDownloadRow>(
        `
      SELECT
        ad.file_size_bytes::text,
        ad.mime_type,
        ad.original_file_name,
        ad.storage_key
      FROM public.application_documents ad
      JOIN public.participant_applications pa
        ON pa.id = ad.application_id
      WHERE ad.id = $1
        AND md5(pa.id::text) = LOWER($2)
        AND EXISTS (
          SELECT 1
          FROM public.application_team_members auth_member
          WHERE auth_member.application_id = pa.id
            AND LOWER(auth_member.email::text) = LOWER($3)
        )
      LIMIT 1
    `,
        [input.documentId, input.applicationHash, input.email],
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

async function updateApplicationDocumentStorageKeys(
    pg: DatabasePool,
    input: {
        applicationId: number;
        mappings: Array<{
            nextStorageKey: string;
            previousStorageKey: string;
        }>;
    },
) {
    if (input.mappings.length === 0) return;

    const client = await pg.connect();

    try {
        await client.query("BEGIN");

        for (const mapping of input.mappings) {
            await client.query(
                `
        UPDATE public.application_documents
        SET storage_key = $1
        WHERE application_id = $2
          AND storage_key = $3
      `,
                [
                    mapping.nextStorageKey,
                    input.applicationId,
                    mapping.previousStorageKey,
                ],
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export const participantService = {
    ensureParticipantLoginTables,
    getApplication,
    getApplicationDocumentDownload,
    getApplications,
    getProfile,
    normalizeLanguage,
    requestLoginCode,
    resendLoginCode,
    submitApplication,
    updateApplicationDocumentStorageKeys,
    verifyLoginCode,
};
