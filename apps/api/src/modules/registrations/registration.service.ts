import { createHash, randomBytes } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getApiContent } from "../../content/index.js";
import { emailService } from "../email/email.service.js";
import type {
  CreateRegistrationInput,
  CreateRegistrationResult,
  RegistrationApplication,
  RegistrationDetailsResult,
  RegistrationLanguage,
  SubmitProposalInput,
  SubmitProposalResult,
  VerifyRegistrationResult,
} from "./registration.model.js";

export type DatabasePool = {
  connect(): Promise<PoolClient>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }>;
};

export class DuplicateRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRegistrationError";
  }
}

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

type ExistingParticipantRow = {
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

type ParticipantDetailsRow = {
  email: string;
  full_name: string;
  mobile: string;
  participant_category_code: string;
};

const languageCodes = new Set(["bn", "en", "hi"]);

function normalizeLanguage(language: string): RegistrationLanguage {
  if (language === "hn") return "hi";
  return languageCodes.has(language) ? (language as RegistrationLanguage) : "en";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeDraftApplicationNumber(challengeCode: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
  const suffix = randomBytes(3).toString("hex").toUpperCase();

  return `${challengeCode}-${timestamp}-${suffix}`;
}

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

function getStateCode(stateName: string) {
  return stateCodesByName.get(stateName.toLowerCase()) ?? stateName
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();
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
  const existingParticipant = await client.query<ExistingParticipantRow>(
    `
      SELECT id
      FROM participants
      WHERE email = $1
         OR mobile = $2
      LIMIT 1
    `,
    [input.email, input.mobile],
  );

  if (existingParticipant.rows[0]) {
    throw new DuplicateRegistrationError(
      getApiContent(input.language).registrations.duplicateRegistration,
    );
  }

  const result = await client.query<ParticipantRow>(
    `
      INSERT INTO participants (full_name, email, mobile)
      VALUES ($1, $2, $3)
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
      makeDraftApplicationNumber(input.challenge.code),
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
      throw new Error(getApiContent(language).api.noActiveChallenge);
    }

    if (!participantCategory) {
      throw new Error(getApiContent(language).api.invalidParticipantCategory);
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
    language,
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
      throw new Error(getApiContent().api.invalidToken);
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
      throw new Error(getApiContent().api.registrationNotFound);
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

async function getState(client: PoolClient, stateId: number) {
  const result = await client.query<StateRow>(
    `
      SELECT id, name_en
      FROM states
      WHERE id = $1
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

async function getInstituteType(input: {
  client: PoolClient;
  instituteType: string;
  participantCategoryId: string;
}) {
  const result = await input.client.query<InstituteTypeRow>(
    `
      SELECT it.id, it.name_en
      FROM institute_types it
      JOIN participant_category_institute_types pcit
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

async function getDistrict(input: {
  client: PoolClient;
  districtId: number;
  stateId: number;
}) {
  const result = await input.client.query<DistrictRow>(
    `
      SELECT name_en
      FROM districts
      WHERE id = $1
        AND state_id = $2
      LIMIT 1
    `,
    [input.districtId, input.stateId],
  );

  return result.rows[0] ?? null;
}

async function getApplicationForSubmit(client: PoolClient, applicationId: number) {
  const result = await client.query<
    ApplicationRow & {
      challenge_id: string;
      participant_category_id: string;
    }
  >(
    `
      SELECT
        pa.id,
        pa.application_number,
        pa.participant_id,
        pa.participant_category_id,
        pa.challenge_id,
        pa.status,
        p.email_verified
      FROM participant_applications pa
      JOIN participants p ON p.id = pa.participant_id
      WHERE pa.id = $1
      FOR UPDATE
    `,
    [applicationId],
  );

  return result.rows[0] ?? null;
}

async function getParticipantDetails(client: PoolClient, participantId: string) {
  const result = await client.query<ParticipantDetailsRow>(
    `
      SELECT
        p.full_name,
        p.email::text AS email,
        p.mobile,
        pc.code AS participant_category_code
      FROM participants p
      JOIN participant_applications pa ON pa.participant_id = p.id
      JOIN participant_categories pc ON pc.id = pa.participant_category_id
      WHERE p.id = $1
      ORDER BY pa.id DESC
      LIMIT 1
    `,
    [participantId],
  );

  return result.rows[0] ?? null;
}

async function nextApplicationNumber(
  client: PoolClient,
  language: RegistrationLanguage,
  stateCode: string,
) {
  await client.query(
    `
      INSERT INTO application_number_sequences (state_code, next_number)
      VALUES ($1, 1)
      ON CONFLICT (state_code) DO NOTHING
    `,
    [stateCode],
  );

  const result = await client.query<{ running_number: number }>(
    `
      UPDATE application_number_sequences
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
    throw new Error(
      getApiContent(language).api.applicationNumberLimitReached.replace(
        "{stateCode}",
        stateCode,
      ),
    );
  }

  return `SFIC-${stateCode}-${String(runningNumber).padStart(4, "0")}`;
}

async function ensureFinalApplicationNumber(input: {
  applicationNumber: string;
  client: PoolClient;
  language: RegistrationLanguage;
  stateCode: string;
}) {
  if (/^SFIC-[A-Z]{2}-\d{4}$/.test(input.applicationNumber)) {
    return input.applicationNumber;
  }

  return nextApplicationNumber(input.client, input.language, input.stateCode);
}

async function replaceTeamMembers(input: {
  applicationId: string;
  applicant: ParticipantDetailsRow;
  client: PoolClient;
  participantId: string;
  teamMembers: SubmitProposalInput["teamMembers"];
}) {
  const applicantResult = await input.client.query<TeamMemberRow>(
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
      input.applicant.full_name,
      input.applicant.email,
      input.applicant.mobile,
    ],
  );

  await input.client.query(
    `
      DELETE FROM application_team_members
      WHERE application_id = $1
        AND is_applicant = FALSE
    `,
    [input.applicationId],
  );

  for (const [index, member] of input.teamMembers.entries()) {
    await input.client.query(
      `
        INSERT INTO application_team_members (
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

  await input.client.query(
    `
      UPDATE participant_applications
      SET team_lead_team_member_id = COALESCE(team_lead_team_member_id, $1),
          participation_mode = $2
      WHERE id = $3
    `,
    [
      applicantResult.rows[0].id,
      input.teamMembers.length ? "Team" : "Individual",
      input.applicationId,
    ],
  );

  return applicantResult.rows[0];
}

function submittedDetails(input: {
  applicant: ParticipantDetailsRow;
  applicationNumber: string;
  districtName: string;
  form: SubmitProposalInput;
  stateName: string;
}) {
  const teamMembers = input.form.teamMembers
    .map((member, index) => `${index + 2}. ${member.fullName} (${member.email})`)
    .join("; ");
  const documents = input.form.supportingDocuments
    ?.map((document) => document.originalFileName)
    .join(", ");

  return [
    { label: "Application Number", value: input.applicationNumber },
    { label: "Participant Name", value: input.applicant.full_name },
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
    { label: "Institute Name", value: input.form.instituteName },
    { label: "Institute Type", value: input.form.instituteType },
    { label: "Participation Mode", value: input.form.participationMode },
    { label: "Team Members", value: teamMembers },
    { label: "Challenge Category", value: input.form.theme },
    { label: "Problem and Location", value: input.form.problemLocation },
    { label: "Proposed Solution", value: input.form.proposedSolution },
    { label: "Technology or Method", value: input.form.technologyMethod },
    { label: "Implementation Route", value: input.form.implementationRoute },
    { label: "Cost and Funding", value: input.form.costFunding },
    { label: "Beneficiaries", value: input.form.beneficiaries },
    { label: "Project Timeline", value: input.form.projectTimeline },
    { label: "Expected Impact", value: input.form.expectedImpact },
    { label: "Scalability", value: input.form.scalability },
    { label: "Prototype or Pilot", value: input.form.prototypePilot },
    { label: "Supporting Documents", value: documents },
  ];
}

async function replaceApplicationDocuments(input: {
  applicationId: string;
  client: PoolClient;
  documents: SubmitProposalInput["supportingDocuments"];
  language: RegistrationLanguage;
  uploadedByMemberId: string;
}) {
  await input.client.query(
    `
      DELETE FROM application_documents
      WHERE application_id = $1
    `,
    [input.applicationId],
  );

  for (const [index, document] of (input.documents ?? []).entries()) {
    await input.client.query(
      `
        INSERT INTO application_documents (
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

async function submitProposal(
  pg: DatabasePool,
  applicationId: number,
  input: SubmitProposalInput,
): Promise<SubmitProposalResult> {
  const language = normalizeLanguage(input.language);
  const client = await pg.connect();
  let application: RegistrationApplication;
  let applicant: ParticipantDetailsRow;
  let details: Array<{ label: string; value?: string }>;

  try {
    await client.query("BEGIN");

    const existingApplication = await getApplicationForSubmit(
      client,
      applicationId,
    );
    if (!existingApplication) {
      throw new Error(getApiContent(language).api.registrationNotFound);
    }
    if (!existingApplication.email_verified) {
      throw new Error(getApiContent(language).api.emailMustBeVerified);
    }

    const state = await getState(client, input.stateId);
    if (!state) throw new Error(getApiContent(language).api.invalidState);

    const district = await getDistrict({
      client,
      districtId: input.districtId,
      stateId: input.stateId,
    });
    if (!district) {
      throw new Error(getApiContent(language).api.invalidDistrictForState);
    }

    const instituteType = await getInstituteType({
      client,
      instituteType: input.instituteType,
      participantCategoryId: existingApplication.participant_category_id,
    });
    if (!instituteType) {
      throw new Error(
        getApiContent(language).api.invalidInstituteTypeForParticipantCategory,
      );
    }

    const finalApplicationNumber = await ensureFinalApplicationNumber({
      applicationNumber: existingApplication.application_number,
      client,
      language,
      stateCode: state.code,
    });

    const result = await client.query<ApplicationRow>(
      `
        UPDATE participant_applications
        SET application_number = $1,
            state_id = $2,
            district_id = $3,
            institute_type_id = $4,
            form_language = $5,
            participation_mode = $6,
            status = 'submitted',
            city = $7,
            pin_code = $8,
            address = $9,
            institute_name = $10,
            other_institute_type = NULLIF($11, ''),
            problem_location = $12,
            proposed_solution = $13,
            technology_method = $14,
            implementation_route = $15,
            cost_funding = $16,
            beneficiaries = $17,
            project_timeline = $18,
            expected_impact = $19,
            scalability = $20,
            prototype_pilot = $21,
            submitted_at = COALESCE(submitted_at, NOW()),
            updated_at = NOW()
        WHERE id = $22
        RETURNING
          id,
          application_number,
          participant_id,
          status,
          TRUE AS email_verified
      `,
      [
        finalApplicationNumber,
        input.stateId,
        input.districtId,
        instituteType.id,
        language,
        input.participationMode,
        input.city,
        input.pinCode,
        input.address,
        input.instituteName,
        input.otherInstituteType ?? "",
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
        applicationId,
      ],
    );
    const applicationRow = result.rows[0];

    applicant = await getParticipantDetails(
      client,
      existingApplication.participant_id,
    ).then((row) => {
      if (!row) throw new Error(getApiContent(language).api.participantNotFound);
      return row;
    });

    const applicantMember = await replaceTeamMembers({
      applicant,
      applicationId: existingApplication.id,
      client,
      participantId: existingApplication.participant_id,
      teamMembers:
        input.participationMode === "Team" ? input.teamMembers : [],
    });

    await replaceApplicationDocuments({
      applicationId: existingApplication.id,
      client,
      documents: input.supportingDocuments,
      language,
      uploadedByMemberId: applicantMember.id,
    });

    await client.query(
      `
        UPDATE application_form_saves
        SET is_current = FALSE
        WHERE application_id = $1
          AND language_code = $2
          AND is_current = TRUE
      `,
      [existingApplication.id, language],
    );
    await client.query(
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
        existingApplication.id,
        applicantMember.id,
        language,
        JSON.stringify({
          step: 4,
          ...input,
          applicationNumber: finalApplicationNumber,
        }),
      ],
    );

    application = toRegistrationApplication(applicationRow);
    details = submittedDetails({
      applicant,
      applicationNumber: finalApplicationNumber,
      districtName: district.name_en,
      form: input,
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

export const registrationService = {
  buildRedirectUrl,
  createRegistration,
  getRegistration,
  normalizeLanguage,
  submitProposal,
  verifyEmail,
};
