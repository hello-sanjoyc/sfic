"use client";

import {
  ArrowLeft,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  Lightbulb,
  MapPin,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { JURY_SESSION_KEY, JuryShell } from "@/components/jury/common/jury-shell";
import { apiClient } from "@/lib/api-client";
import { appConfig } from "@/lib/app-config";
import { endpoints } from "@/lib/endpoints";

type LocalizedText = {
  bn?: string | null;
  en?: string | null;
  hi?: string | null;
};

type ApplicationDetails = {
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
    documentType?: string | null;
    fileSizeBytes?: number | string | null;
    id?: number | string | null;
    originalFileName?: string | null;
  }>;
  id?: number | string | null;
  instituteType?: {
    name?: LocalizedText | null;
  } | null;
  participant?: {
    dateOfBirth?: string | null;
    fullName?: string | null;
    gender?: string | null;
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
    fullName?: string | null;
    id?: number | string | null;
    isApplicant?: boolean | null;
  }>;
};

type ApplicationDetailsResponse = {
  application: ApplicationDetails;
};

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

function getJuryAuthorizationHeader() {
  if (typeof window === "undefined") return "";

  try {
    const session = JSON.parse(localStorage.getItem(JURY_SESSION_KEY) ?? "{}") as {
      token?: string;
    };
    return session.token ? `Bearer ${session.token}` : "";
  } catch {
    return "";
  }
}

async function getDownloadErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };

    return body.error?.message ?? body.message ?? fallback;
  } catch {
    return fallback;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
    <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-w-0 items-center gap-3 border-b border-slate-200 p-3 sm:p-5">
        <Icon className="text-blue-600" size={21} />
        <h2 className="min-w-0 break-words text-lg font-black">{title}</h2>
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function JuryApplicationDetailsPage({
  applicationId,
}: Readonly<{
  applicationId: string;
}>) {
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [documentDownloadingId, setDocumentDownloadingId] = useState<
    number | string | null
  >(null);
  const [downloadError, setDownloadError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<ApplicationDetailsResponse>(endpoints.jury.application(applicationId), {
        headers: { Authorization: getJuryAuthorizationHeader() },
      })
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
  }, [applicationId]);

  const title =
    application?.applicationNumber ??
    (isLoading ? "Application Details" : "Application Not Found");

  const downloadApplication = async () => {
    if (!application || isDownloading) return;

    const authorization = getJuryAuthorizationHeader();

    if (!authorization) {
      setDownloadError("A valid jury session is required.");
      return;
    }

    setDownloadError("");
    setIsDownloading(true);

    try {
      const response = await fetch(
        `${appConfig.apiUrl}${endpoints.jury.applicationDownload(applicationId)}`,
        {
          headers: {
            Authorization: authorization,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          await getDownloadErrorMessage(
            response,
            "Application PDF could not be downloaded.",
          ),
        );
      }

      const blob = await response.blob();
      triggerDownload(
        blob,
        `${application.applicationNumber ?? "application"}.pdf`,
      );
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
    fileDocument: NonNullable<ApplicationDetails["documents"]>[number],
  ) => {
    if (
      !application?.id ||
      !fileDocument.id ||
      documentDownloadingId !== null
    ) {
      return;
    }

    const authorization = getJuryAuthorizationHeader();

    if (!authorization) {
      setDownloadError("A valid jury session is required.");
      return;
    }

    setDownloadError("");
    setDocumentDownloadingId(fileDocument.id);

    try {
      const response = await fetch(
        `${appConfig.apiUrl}${endpoints.jury.applicationDocumentDownload(
          application.id,
          fileDocument.id,
        )}`,
        {
          headers: {
            Authorization: authorization,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          await getDownloadErrorMessage(response, "Document could not be downloaded."),
        );
      }

      const blob = await response.blob();
      triggerDownload(blob, String(fileDocument.originalFileName ?? "document"));
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
    <JuryShell eyebrow="Review complete application submission data" title={title}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          href="/jury/applications"
        >
          <ArrowLeft size={17} />
          Back to applications
        </Link>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {application ? (
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={isDownloading}
              onClick={downloadApplication}
              type="button"
            >
              <Download size={17} />
              {isDownloading ? "Downloading..." : "Download Application"}
            </button>
          ) : (
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white opacity-50 sm:w-auto"
              disabled
              type="button"
            >
              <Download size={17} />
              Download Application
            </button>
          )}
          {application ? (
            <Link
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 sm:w-auto"
              href={`/jury/applications/${applicationId}/evaluate`}
            >
              <ClipboardCheck size={17} />
              Evaluate
            </Link>
          ) : (
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white opacity-50 sm:w-auto"
              disabled
              type="button"
            >
              <ClipboardCheck size={17} />
              Evaluate
            </button>
          )}
        </div>
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
          <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
              <Field
                label="Date of Birth"
                value={formatDateOnly(application.participant?.dateOfBirth)}
              />
              <Field label="Gender" value={application.participant?.gender} />
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
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Applicant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(application.teamMembers ?? []).map((member) => (
                    <tr key={String(member.id ?? member.fullName)}>
                      <td className="px-4 py-3 font-normal">{formatValue(member.fullName)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatValue(member.isApplicant)}</td>
                    </tr>
                  ))}
                  {(!application.teamMembers || application.teamMembers.length === 0) && (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={2}>
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
                  key={String(document.id ?? document.originalFileName)}
                >
                  <div className="min-w-0">
                    {application.id && document.id ? (
                      <button
                        className="break-words text-left text-sm font-normal text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={documentDownloadingId !== null}
                        onClick={() => downloadDocument(document)}
                        type="button"
                      >
                        {documentDownloadingId === document.id
                          ? "Downloading..."
                          : formatValue(document.originalFileName)}
                      </button>
                    ) : (
                      <p className="break-words text-sm font-normal">
                        {formatValue(document.originalFileName)}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatValue(document.documentType)} · {formatFileSize(document.fileSizeBytes)}
                    </p>
                  </div>
                </div>
              ))}
              {(!application.documents || application.documents.length === 0) && (
                <p className="text-sm font-semibold text-slate-500">
                  No documents available.
                </p>
              )}
            </div>
          </Section>

          <section className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <Link
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 sm:w-auto"
              href={`/jury/applications/${applicationId}/evaluate`}
            >
              <ClipboardCheck size={17} />
              Evaluate
            </Link>
          </section>
        </>
      )}
    </JuryShell>
  );
}
