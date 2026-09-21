import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getApiContent } from "../../content/index.js";
import { emailService } from "../email/email.service.js";
import type {
    ParticipantLanguage,
    ParticipantLoginApplication,
    RequestParticipantLoginCodeInput,
    RequestParticipantLoginCodeResult,
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
    status: string;
};

const languageCodes = new Set(["bn", "en", "hi"]);

function normalizeLanguage(language: string): ParticipantLanguage {
    if (language === "hn") return "hi";
    return languageCodes.has(language)
        ? (language as ParticipantLanguage)
        : "en";
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
        role: row.is_team_lead ? "Team Lead" : "Team Member",
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

        await client.query("COMMIT");

        return {
            participant: {
                ...toLoginApplication(row),
                email: row.email,
            },
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

export const participantService = {
    ensureParticipantLoginTables,
    normalizeLanguage,
    requestLoginCode,
    resendLoginCode,
    verifyLoginCode,
};
