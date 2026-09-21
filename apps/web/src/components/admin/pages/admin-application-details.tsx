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
  Trash2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
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
    publicUrl?: string | null;
    storageKey?: string | null;
  }>;
  formLanguage?: string | null;
  formSaves?: Array<{
    createdAt?: string | null;
    id?: number | string | null;
    isCurrent?: boolean | null;
    languageCode?: string | null;
  }>;
  id?: number | string | null;
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
    id?: number | string | null;
    isApplicant?: boolean | null;
    mobile?: string | null;
  }>;
  verification?: {
    emailAttempts?: unknown[];
    emailTokens?: unknown[];
    loginAttempts?: unknown[];
    loginTokens?: unknown[];
  };
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

function documentDownloadUrl(
  applicationId: string | number | null | undefined,
  documentId: string | number | null | undefined,
) {
  if (!applicationId || !documentId) return "";

  return `${appConfig.apiUrl}${endpoints.admin.applicationDocumentDownload(
    applicationId,
    documentId,
  )}`;
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

export function AdminApplicationDetailsPage({
  applicationId,
}: Readonly<{
  applicationId: string;
}>) {
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<ApplicationDetailsResponse>(endpoints.admin.application(applicationId))
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

  const deleteApplication = () => {
    if (!application || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage("");

    void apiClient
      .delete(endpoints.admin.application(applicationId))
      .then(() => {
        setIsDeleteDialogOpen(false);
        router.push("/admin/applications");
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Application could not be deleted.",
        );
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  return (
    <AdminShell eyebrow="Review complete application submission data" title={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          href="/admin/applications"
        >
          <ArrowLeft size={17} />
          Back to applications
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {application ? (
            <a
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white"
              href={`${appConfig.apiUrl}${endpoints.admin.applicationDownload(applicationId)}`}
            >
              <Download size={17} />
              Download Application
            </a>
          ) : (
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white opacity-50"
              disabled
              type="button"
            >
              <Download size={17} />
              Download Application
            </button>
          )}
        </div>
      </div>

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
                    <tr key={String(member.id ?? member.email)}>
                      <td className="px-4 py-3 font-normal">{formatValue(member.fullName)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatValue(member.email)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatValue(member.mobile)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatValue(member.isApplicant)}</td>
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
                  key={String(document.id ?? document.storageKey)}
                >
                  <div className="min-w-0">
                    {documentDownloadUrl(application.id, document.id) ? (
                      <a
                        className="break-words text-sm font-normal text-blue-600 hover:underline"
                        download
                        href={documentDownloadUrl(application.id, document.id)}
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
                </div>
              ))}
              {(!application.documents || application.documents.length === 0) && (
                <p className="text-sm font-semibold text-slate-500">
                  No documents available.
                </p>
              )}
            </div>
          </Section>

          <section className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#0b1f3a] disabled:cursor-not-allowed disabled:opacity-50"
              href={`/admin/applications/${applicationId}/edit`}
            >
              <Pencil size={17} />
              Edit
            </Link>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDeleting}
              onClick={() => setIsDeleteDialogOpen(true)}
              type="button"
            >
              <Trash2 size={17} />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </section>

        </>
      )}

      {isDeleteDialogOpen && application && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-black text-[#0b1f3a]">
                Delete Application
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Are you sure you want to delete application{" "}
                <strong className="font-black text-[#0b1f3a]">
                  {application.applicationNumber ?? `application ${applicationId}`}
                </strong>
                ?
              </p>
              <p className="mt-3 text-sm font-medium text-slate-600">
                This action will permanently delete the application and all
                associated data from the system, including related records and
                uploaded document files.
              </p>
              <p className="mt-3 text-sm font-black text-[#0b1f3a]">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-5">
              <button
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#0b1f3a]"
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isDeleting}
                onClick={deleteApplication}
                type="button"
              >
                <Trash2 size={16} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
