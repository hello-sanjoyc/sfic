import { createHash, randomBytes } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { emailService } from "../email/email.service.js";
import type {
  CreateRegistrationInput,
  CreateRegistrationResult,
  RegistrationApplication,
  RegistrationDetailsResult,
  RegistrationLanguage,
  VerifyRegistrationResult,
} from "./registration.model.js";

export type DatabasePool = {
  connect(): Promise<PoolClient>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }>;
};

type ChallengeRow = {
  code: string;
  id: string;
};

type ParticipantCategoryRow = {
  id: string;
};

type ParticipantRow = {
  email_verified: boolean;
  id: string;
};

type ApplicationRow = {
  application_number: string;
  email_verified: boolean;
  id: string;
  participant_id: string;
  status: string;
};

type RegistrationDetailsRow = ApplicationRow & {
  email: string;
  full_name: string;
  mobile: string;
  participant_category_code: string;
};

type TeamMemberRow = {
  id: string;
};

const languageCodes = new Set(["bn", "en", "hi"]);

function normalizeLanguage(language: string): RegistrationLanguage {
  if (language === "hn") return "hi";
  return languageCodes.has(language) ? (language as RegistrationLanguage) : "en";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeApplicationNumber(challengeCode: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
  const suffix = randomBytes(3).toString("hex").toUpperCase();

  return `${challengeCode}-${timestamp}-${suffix}`;
}

function getApiBaseUrl() {
  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    `http://localhost:${process.env.PORT ?? 4000}`
  ).replace(/\/+$/, "");
}

function getAppBaseUrl() {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function verificationTokenTtlMinutes() {
  return Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? 1440);
}

function shouldExposeVerificationUrl() {
  return process.env.NODE_ENV !== "production";
}

function toRegistrationApplication(row: ApplicationRow): RegistrationApplication {
  return {
    applicationNumber: row.application_number,
    emailVerified: row.email_verified,
    id: Number(row.id),
    participantId: Number(row.participant_id),
    status: row.status,
  };
}

async function getActiveChallenge(client: PoolClient) {
  const result = await client.query<ChallengeRow>(`
    SELECT id, code
    FROM challenges
    WHERE is_active = TRUE
      AND status = 'open'
    ORDER BY starts_at DESC NULLS LAST, id DESC
    LIMIT 1
  `);

  return result.rows[0];
}

async function getParticipantCategory(
  client: PoolClient,
  participantCategory: string,
) {
  const result = await client.query<ParticipantCategoryRow>(
    `
      SELECT id
      FROM participant_categories
      WHERE is_active = TRUE
        AND (
          UPPER(code) = UPPER($1)
          OR LOWER(name_en) = LOWER($1)
        )
      LIMIT 1
    `,
    [participantCategory],
  );

  return result.rows[0];
}

async function createOrUpdateParticipant(
  client: PoolClient,
  input: CreateRegistrationInput,
) {
  const result = await client.query<ParticipantRow>(
    `
      INSERT INTO participants (full_name, email, mobile)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          mobile = EXCLUDED.mobile,
          updated_at = NOW()
      RETURNING id, email_verified
    `,
    [input.fullName, input.email, input.mobile],
  );

  return result.rows[0];
}

async function createOrUpdateApplication(input: {
  challenge: ChallengeRow;
  client: PoolClient;
  language: RegistrationLanguage;
  participantCategoryId: string;
  participantId: string;
}) {
  const status = "email_verification";
  const result = await input.client.query<ApplicationRow>(
    `
      INSERT INTO participant_applications (
        application_number,
        challenge_id,
        participant_id,
        participant_category_id,
        form_language,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (participant_id, challenge_id) DO UPDATE
      SET participant_category_id = EXCLUDED.participant_category_id,
          form_language = EXCLUDED.form_language,
          status = CASE
            WHEN participant_applications.status IN ('draft', 'email_verification')
              THEN EXCLUDED.status
            ELSE participant_applications.status
          END,
          updated_at = NOW()
      RETURNING
        id,
        application_number,
        participant_id,
        status,
        (
          SELECT email_verified
          FROM participants
          WHERE participants.id = participant_applications.participant_id
        ) AS email_verified
    `,
    [
      makeApplicationNumber(input.challenge.code),
      input.challenge.id,
      input.participantId,
      input.participantCategoryId,
      input.language,
      status,
    ],
  );

  return result.rows[0];
}

async function upsertApplicantTeamMember(input: {
  applicationId: string;
  client: PoolClient;
  participantId: string;
  registration: CreateRegistrationInput;
}) {
  const result = await input.client.query<TeamMemberRow>(
    `
      INSERT INTO application_team_members (
        application_id,
        participant_id,
        full_name,
        email,
        mobile,
        is_applicant,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, 0)
      ON CONFLICT (application_id, email) DO UPDATE
      SET participant_id = EXCLUDED.participant_id,
          full_name = EXCLUDED.full_name,
          mobile = EXCLUDED.mobile,
          is_applicant = TRUE,
          sort_order = 0,
          updated_at = NOW()
      RETURNING id
    `,
    [
      input.applicationId,
      input.participantId,
      input.registration.fullName,
      input.registration.email,
      input.registration.mobile,
    ],
  );

  await input.client.query(
    `
      UPDATE participant_applications
      SET team_lead_team_member_id = COALESCE(team_lead_team_member_id, $1)
      WHERE id = $2
    `,
    [result.rows[0].id, input.applicationId],
  );

  return result.rows[0];
}

async function saveCurrentFormSnapshot(input: {
  applicationId: string;
  client: PoolClient;
  formData: CreateRegistrationInput;
  language: RegistrationLanguage;
  memberId: string;
}) {
  await input.client.query(
    `
      UPDATE application_form_saves
      SET is_current = FALSE
      WHERE application_id = $1
        AND language_code = $2
        AND is_current = TRUE
    `,
    [input.applicationId, input.language],
  );

  await input.client.query(
    `
      INSERT INTO application_form_saves (
        application_id,
        saved_by_member_id,
        language_code,
        form_data,
        is_current
      )
      VALUES ($1, $2, $3, $4::jsonb, TRUE)
    `,
    [
      input.applicationId,
      input.memberId,
      input.language,
      JSON.stringify({
        step: 1,
        ...input.formData,
      }),
    ],
  );
}

async function createVerificationToken(input: {
  applicationId: string;
  client: PoolClient;
  participantId: string;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await input.client.query(
    `
      INSERT INTO participant_email_verification_tokens (
        participant_id,
        application_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)
    `,
    [
      input.participantId,
      input.applicationId,
      tokenHash,
      verificationTokenTtlMinutes(),
    ],
  );

  return token;
}

function buildVerificationUrl(input: {
  applicationId: number;
  language: RegistrationLanguage;
  token: string;
}) {
  const url = new URL(`${getApiBaseUrl()}/api/v1/registrations/verify-email`);
  url.searchParams.set("token", input.token);
  url.searchParams.set("locale", input.language);
  url.searchParams.set("applicationId", String(input.applicationId));

  return url.toString();
}

function buildRedirectUrl(input: {
  application: RegistrationApplication;
  language: RegistrationLanguage;
  verified: boolean;
}) {
  const url = new URL(`${getAppBaseUrl()}/${input.language}/register`);
  url.searchParams.set("emailVerified", input.verified ? "1" : "0");
  url.searchParams.set("applicationId", String(input.application.id));
  url.searchParams.set("participantId", String(input.application.participantId));
  url.searchParams.set("applicationNumber", input.application.applicationNumber);

  return url.toString();
}

async function createRegistration(
  pg: DatabasePool,
  input: CreateRegistrationInput,
): Promise<CreateRegistrationResult> {
  const language = normalizeLanguage(input.language);
  const client = await pg.connect();
  let application: RegistrationApplication;
  let token = "";

  try {
    await client.query("BEGIN");

    const challenge = await getActiveChallenge(client);
    const participantCategory = await getParticipantCategory(
      client,
      input.participantCategory,
    );

    if (!challenge) {
      throw new Error("No active challenge is configured.");
    }

    if (!participantCategory) {
      throw new Error("Invalid participant category.");
    }

    const participant = await createOrUpdateParticipant(client, {
      ...input,
      language,
    });
    const applicationRow = await createOrUpdateApplication({
      challenge,
      client,
      language,
      participantCategoryId: participantCategory.id,
      participantId: participant.id,
    });
    const applicantMember = await upsertApplicantTeamMember({
      applicationId: applicationRow.id,
      client,
      participantId: participant.id,
      registration: {
        ...input,
        language,
      },
    });

    await saveCurrentFormSnapshot({
      applicationId: applicationRow.id,
      client,
      formData: {
        ...input,
        language,
      },
      language,
      memberId: applicantMember.id,
    });

    token = await createVerificationToken({
      applicationId: applicationRow.id,
      client,
      participantId: participant.id,
    });

    await client.query("COMMIT");
    application = toRegistrationApplication({
      ...applicationRow,
      email_verified: participant.email_verified,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const verificationUrl = buildVerificationUrl({
    applicationId: application.id,
    language,
    token,
  });
  const emailDelivery = await emailService.sendParticipantVerificationEmail({
    participantEmail: input.email,
    participantName: input.fullName,
    verificationUrl,
  });

  if (!emailDelivery.delivered) {
    // The API still returns the draft registration so local development can
    // continue without SMTP credentials.
    console.info(`Email verification link for ${input.email}: ${verificationUrl}`);
  }

  return {
    application,
    emailDelivery,
    verificationUrl: shouldExposeVerificationUrl() ? verificationUrl : undefined,
  };
}

async function verifyEmail(
  pg: DatabasePool,
  token: string,
): Promise<VerifyRegistrationResult> {
  const client = await pg.connect();

  try {
    await client.query("BEGIN");

    const tokenHash = hashToken(token);
    const tokenResult = await client.query<{
      application_id: string;
      participant_id: string;
    }>(
      `
        SELECT participant_id, application_id
        FROM participant_email_verification_tokens
        WHERE token_hash = $1
          AND consumed_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
      `,
      [tokenHash],
    );
    const tokenRow = tokenResult.rows[0];

    if (!tokenRow) {
      throw new Error("Verification link is invalid or has expired.");
    }

    await client.query(
      `
        UPDATE participants
        SET email_verified = TRUE,
            email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = $1
      `,
      [tokenRow.participant_id],
    );

    await client.query(
      `
        UPDATE participant_email_verification_tokens
        SET consumed_at = NOW()
        WHERE token_hash = $1
      `,
      [tokenHash],
    );

    const applicationResult = await client.query<ApplicationRow>(
      `
        UPDATE participant_applications
        SET status = CASE
              WHEN status IN ('draft', 'email_verification')
                THEN 'profile_completion'
              ELSE status
            END,
            updated_at = NOW()
        WHERE id = $1
          AND participant_id = $2
        RETURNING
          id,
          application_number,
          participant_id,
          status,
          TRUE AS email_verified
    `,
      [tokenRow.application_id, tokenRow.participant_id],
    );
    const application = applicationResult.rows[0];

    if (!application) {
      throw new Error("Registration application was not found.");
    }

    await client.query("COMMIT");

    return {
      application: toRegistrationApplication(application),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getRegistration(
  pg: DatabasePool,
  applicationId: number,
): Promise<RegistrationDetailsResult | null> {
  const result = await pg.query<RegistrationDetailsRow>(
    `
      SELECT
        pa.id,
        pa.application_number,
        pa.participant_id,
        pa.status,
        p.email_verified,
        p.full_name,
        p.email::text AS email,
        p.mobile,
        pc.code AS participant_category_code
      FROM participant_applications pa
      JOIN participants p ON p.id = pa.participant_id
      JOIN participant_categories pc ON pc.id = pa.participant_category_id
      WHERE pa.id = $1
      LIMIT 1
    `,
    [applicationId],
  );
  const application = result.rows[0];

  if (!application) return null;

  return {
    application: toRegistrationApplication(application),
    participant: {
      email: application.email,
      fullName: application.full_name,
      id: Number(application.participant_id),
      mobile: application.mobile,
      participantCategoryCode: application.participant_category_code,
    },
  };
}

export const registrationService = {
  buildRedirectUrl,
  createRegistration,
  getRegistration,
  normalizeLanguage,
  verifyEmail,
};
