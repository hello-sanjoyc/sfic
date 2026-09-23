"use client";

import {
  ArrowLeft,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  Lightbulb,
  MapPin,
  Pencil,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { ParticipantShell } from "@/components/participant/common/participant-shell";
import { apiClient } from "@/lib/api-client";
import { appConfig } from "@/lib/app-config";
import { endpoints } from "@/lib/endpoints";

type LocalizedText = {
  bn?: string | null;
  en?: string | null;
  hi?: string | null;
};

type ParticipantApplicationDetails = {
  applicationHash: string;
  applicationNumber?: string | null;
  challenge?: {
    code?: string | null;
    title?: LocalizedText | null;
  } | null;
  challengeCategory?: {
    name?: LocalizedText | null;
  } | null;
  createdAt?: string | null;
  district?: {
    name?: LocalizedText | null;
  } | null;
  documents?: Array<{
    id?: number | string | null;
    documentType?: string | null;
    fileSizeBytes?: number | string | null;
    originalFileName?: string | null;
    publicUrl?: string | null;
    storageKey?: string | null;
  }>;
  formLanguage?: string | null;
  instituteType?: {
    name?: LocalizedText | null;
  } | null;
  participant?: {
    dateOfBirth?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    fullName?: string | null;
    gender?: string | null;
    mobile?: string | null;
  } | null;
  participantCategory?: {
    code?: string | null;
    name?: LocalizedText | null;
  } | null;
  participationMode?: string | null;
  profile?: Record<string, string | number | null | undefined>;
  proposal?: Record<string, string | number | null | undefined>;
  state?: {
    name?: LocalizedText | null;
  } | null;
  status?: string | null;
  submittedAt?: string | null;
  teamMembers?: Array<{
    email?: string | null;
    fullName?: string | null;
    isApplicant?: boolean | null;
    mobile?: string | null;
  }>;
};

type ApplicationDetailsResponse = {
  application: ParticipantApplicationDetails;
};

type ParticipantRole = "applicant" | "team_member";

const editableStatuses = new Set([
  "draft",
  "email_verification",
  "profile_completion",
  "proposal_submission",
]);

function localizedName(value?: LocalizedText | null) {
  return value?.en ?? value?.bn ?? value?.hi ?? "Not available";
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

function formatStatus(value?: string | null) {
  const labels: Record<string, string> = {
    draft: "Draft",
    email_verification: "Email Verification",
    profile_completion: "Profile Completion",
    proposal_submission: "Proposal Submission",
    submitted: "Submitted",
    withdrawn: "Withdrawn",
  };

  return labels[value ?? ""] ?? "Not available";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatFileSize(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";

  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "Not available";

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDashValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function decodeParticipantRole(token: string): ParticipantRole | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const parsed = JSON.parse(atob(padded)) as {
      exp?: number;
      role?: ParticipantRole;
    };

    if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed.role === "applicant" || parsed.role === "team_member"
      ? parsed.role
      : null;
  } catch {
    return null;
  }
}

function Field({
  label,
  value,
}: Readonly<{
  label: string;
  value: unknown;
}>) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase text-[#0b1f3a]">{label}</p>
      <p className="mt-1 break-words text-sm font-normal text-[#0b1f3a]">
        {formatValue(value)}
      </p>
    </div>
  );
}

function Section({
  children,
  icon: Icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  icon: typeof ClipboardList;
  title: string;
}>) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 p-5">
        <Icon className="text-blue-600" size={21} />
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function Page() {
  const params = useParams<{ applicationHash: string }>();
  const applicationHash = params.applicationHash;
  const [application, setApplication] =
    useState<ParticipantApplicationDetails | null>(null);
  const [documentDownloadingId, setDocumentDownloadingId] = useState<
    number | string | null
  >(null);
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [participantRole, setParticipantRole] = useState<ParticipantRole | null>(
    null,
  );

  useEffect(() => {
    const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";

    if (!token) {
      setApplication(null);
      setErrorMessage("A valid participant session is required.");
      setIsLoading(false);
      return undefined;
    }
    setParticipantRole(decodeParticipantRole(token));

    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<ApplicationDetailsResponse>(
        endpoints.participants.application(applicationHash),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      .then((result) => {
        if (!isMounted) return;
        setApplication(result.application);
      })
      .catch((error) => {
        if (!isMounted) return;
        setApplication(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Application details could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [applicationHash]);

  const title =
    application?.applicationNumber ??
    (isLoading ? "Application Details" : "Application Not Found");
  const canEdit =
    participantRole === "applicant" &&
    editableStatuses.has(application?.status ?? "");
  const canDownload = Boolean(application) && !canEdit;

  const downloadApplication = async () => {
    if (!application || isDownloading) return;

    const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";

    if (!token) {
      setDownloadError("A valid participant session is required.");
      return;
    }

    setDownloadError("");
    setIsDownloading(true);

    try {
      const response = await fetch(
        `${appConfig.apiUrl}${endpoints.participants.applicationDownload(
          application.applicationHash,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let message = "Application PDF could not be downloaded.";

        try {
          const body = (await response.json()) as {
            error?: { message?: string };
            message?: string;
          };
          message = body.error?.message ?? body.message ?? message;
        } catch {
          // Keep the default message when the error body is not JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${application.applicationNumber ?? "application"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Application PDF could not be downloaded.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadDocument = async (
    fileDocument: NonNullable<ParticipantApplicationDetails["documents"]>[number],
  ) => {
    if (!application || documentDownloadingId || !fileDocument.id) return;

    const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";

    if (!token) {
      setDownloadError("A valid participant session is required.");
      return;
    }

    setDownloadError("");
    setDocumentDownloadingId(fileDocument.id);

    try {
      const response = await fetch(
        `${appConfig.apiUrl}${endpoints.participants.applicationDocumentDownload(
          application.applicationHash,
          fileDocument.id,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        let message = "Document could not be downloaded.";

        try {
          const body = (await response.json()) as {
            error?: { message?: string };
            message?: string;
          };
          message = body.error?.message ?? body.message ?? message;
        } catch {
          // Keep the default message when the error body is not JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = String(fileDocument.originalFileName ?? "document");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Document could not be downloaded.",
      );
    } finally {
      setDocumentDownloadingId(null);
    }
  };

  return (
    <ParticipantShell
      eyebrow="Review complete application submission data"
      title={title}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          href="/participants/applications"
        >
          <ArrowLeft size={17} />
          Back to My Application(s)
        </Link>
        {canDownload && (
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDownloading}
            onClick={downloadApplication}
            type="button"
          >
            <Download size={17} />
            {isDownloading ? "Downloading..." : "Download Application"}
          </button>
        )}
      </div>

      {downloadError && (
        <section className="rounded-lg border border-rose-200 bg-white p-4 text-sm font-semibold text-rose-600 shadow-sm">
          {downloadError}
        </section>
      )}

      {isLoading && (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Loading application details...
        </section>
      )}

      {!isLoading && errorMessage && (
        <section className="rounded-lg border border-rose-200 bg-white p-8 text-center text-sm font-semibold text-rose-600 shadow-sm">
          {errorMessage}
        </section>
      )}

      {!isLoading && application && (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Application Number" value={application.applicationNumber} />
              <Field label="Status" value={formatStatus(application.status)} />
              <Field label="Submitted At" value={formatDate(application.submittedAt)} />
              <Field label="Created At" value={formatDate(application.createdAt)} />
            </div>
          </section>

          <Section icon={User} title="Applicant">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Name" value={application.participant?.fullName} />
              <Field label="Email" value={application.participant?.email} />
              <Field label="Mobile" value={application.participant?.mobile} />
              <Field
                label="Date of Birth"
                value={formatDateOnly(application.participant?.dateOfBirth)}
              />
              <Field label="Gender" value={application.participant?.gender} />
              <Field
                label="Email Verified"
                value={application.participant?.emailVerified}
              />
            </div>
          </Section>

          <Section icon={MapPin} title="Location Details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="State" value={localizedName(application.state?.name)} />
              <Field label="District" value={localizedName(application.district?.name)} />
              <Field label="City" value={application.profile?.city} />
              <Field label="PIN Code" value={application.profile?.pinCode} />
              <Field label="Address" value={application.profile?.address} />
            </div>
          </Section>

          <Section icon={ClipboardList} title="Participation Details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Participant Category"
                value={localizedName(application.participantCategory?.name)}
              />
              <Field
                label="Institute Type"
                value={localizedName(application.instituteType?.name)}
              />
              <Field label="Institute" value={application.profile?.instituteName} />
              <Field label="Participation Mode" value={application.participationMode} />
            </div>
          </Section>

          <Section icon={GraduationCap} title="Education Details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Highest Educational Qualification"
                value={application.profile?.highestEducationalQualification}
              />
              <Field
                label="Last Attended Educational Institute"
                value={application.profile?.lastAttendedEducationalInstitute}
              />
              <Field
                label="Year of Passing"
                value={application.profile?.yearOfPassing}
              />
            </div>
          </Section>

          <Section icon={Lightbulb} title="Proposal">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Challenge" value={localizedName(application.challenge?.title)} />
              <Field
                label="Challenge Category"
                value={localizedName(application.challengeCategory?.name)}
              />
              <Field
                label="Problem Location"
                value={formatDashValue(application.proposal?.problemLocation)}
              />
              <Field
                label="Proposed Solution"
                value={formatDashValue(application.proposal?.proposedSolution)}
              />
              <Field
                label="Technology / Method"
                value={formatDashValue(application.proposal?.technologyMethod)}
              />
              <Field
                label="Implementation Route"
                value={formatDashValue(application.proposal?.implementationRoute)}
              />
              <Field
                label="Cost / Funding"
                value={formatDashValue(application.proposal?.costFunding)}
              />
              <Field
                label="Beneficiaries"
                value={formatDashValue(application.proposal?.beneficiaries)}
              />
              <Field
                label="Project Timeline"
                value={formatDashValue(application.proposal?.projectTimeline)}
              />
              <Field
                label="Expected Impact"
                value={formatDashValue(application.proposal?.expectedImpact)}
              />
              <Field
                label="Scalability"
                value={formatDashValue(application.proposal?.scalability)}
              />
              <Field
                label="Prototype / Pilot"
                value={formatDashValue(application.proposal?.prototypePilot)}
              />
              <Field
                label="Mentor / Acknowledge To"
                value={formatDashValue(application.proposal?.mentorAcknowledgeTo)}
              />
              <Field
                label="Intellectual Property / Publication"
                value={formatDashValue(application.proposal?.intellectualPropertyPublication)}
              />
            </div>
          </Section>

          <Section icon={Users} title="Team Members">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Applicant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(application.teamMembers ?? []).map((member) => (
                    <tr key={String(member.email ?? member.mobile ?? member.fullName)}>
                      <td className="px-4 py-3 font-normal">
                        {formatValue(member.fullName)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatValue(member.email)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatValue(member.mobile)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatValue(member.isApplicant)}
                      </td>
                    </tr>
                  ))}
                  {(!application.teamMembers || application.teamMembers.length === 0) && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                        No team members available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section icon={FileText} title="Documents">
            <div className="grid gap-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-[#0b1f3a]">
                  Video URL
                </p>
                {application.proposal?.videoUrl ? (
                  <a
                    className="mt-1 block break-words text-sm font-normal text-blue-600 hover:underline"
                    href={String(application.proposal.videoUrl)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {String(application.proposal.videoUrl)}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-normal text-[#0b1f3a]">
                    Not available
                  </p>
                )}
              </div>
              {(application.documents ?? []).map((document) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
                  key={String(
                    document.id ?? document.storageKey ?? document.originalFileName,
                  )}
                >
                  <div className="min-w-0">
                    {document.publicUrl ? (
                      <a
                        className="break-words text-sm font-normal text-blue-600 hover:underline"
                        href={document.publicUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {formatValue(document.originalFileName)}
                      </a>
                    ) : (
                      <p className="break-words text-sm font-normal">
                        {formatValue(document.originalFileName)}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatValue(document.documentType)} · {formatFileSize(document.fileSizeBytes)}
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!document.id || documentDownloadingId === document.id}
                    onClick={() => downloadDocument(document)}
                    type="button"
                  >
                    <Download size={16} />
                    {documentDownloadingId === document.id
                      ? "Downloading..."
                      : "Download"}
                  </button>
                </div>
              ))}
              {(!application.documents || application.documents.length === 0) && (
                <p className="text-sm font-semibold text-slate-500">
                  No documents available.
                </p>
              )}
            </div>
          </Section>

          {canEdit && (
            <section className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#0b1f3a]"
                href={`/participants/applications/${application.applicationHash}/edit`}
              >
                <Pencil size={17} />
                Edit
              </Link>
            </section>
          )}
        </>
      )}
    </ParticipantShell>
  );
}
