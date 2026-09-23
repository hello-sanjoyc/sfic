"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FilePlus2,
  Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { ParticipantShell } from "@/components/participant/common/participant-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type SortKey =
  | "applicationNumber"
  | "challengeCategory"
  | "createdAt"
  | "participationMode"
  | "status";

const pageSize = 5;

type ParticipantApplicationSummary = {
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

type ParticipantApplicationsResponse = {
  applications: ParticipantApplicationSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AppSetting = {
  key: string;
  value: string;
};

type AppSettingsMap = Record<string, string>;
type ParticipantRole = "applicant" | "team_member";

type StatusFilter = {
  badgeStyle: string;
  label: string;
  status?: string;
  style: string;
};

const applicationStatusFilters: readonly StatusFilter[] = [
  {
    label: "Submitted",
    status: "submitted",
    style: "border-emerald-100 bg-emerald-50 text-emerald-700",
    badgeStyle: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Profile Completion",
    status: "profile_completion",
    style: "border-amber-100 bg-amber-50 text-amber-700",
    badgeStyle: "bg-amber-100 text-amber-700",
  },
  {
    label: "Draft",
    status: "draft",
    style: "border-slate-200 bg-slate-50 text-slate-700",
    badgeStyle: "bg-slate-200 text-slate-700",
  },
  {
    label: "All Applications",
    style: "border-blue-400 bg-blue-50 text-blue-700",
    badgeStyle: "bg-blue-100 text-blue-700",
  },
];

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  email_verification: "bg-blue-50 text-blue-700",
  profile_completion: "bg-amber-50 text-amber-700",
  proposal_submission: "bg-violet-50 text-violet-700",
  submitted: "bg-emerald-50 text-emerald-700",
  withdrawn: "bg-red-50 text-red-600",
};

const settingKeys = {
  multipleApplications: "PARTICIPANT_APPLICATION_MULTIPLE",
  registrationEnabled: "PARTICIPANT_REGISTRATION_ENABLED",
  registrationEndDate: "PARTICIPANT_REGISTRATION_END_DATE",
  registrationStartDate: "PARTICIPANT_REGISTRATION_START_DATE",
} as const;

function settingsMap(settings: AppSetting[]) {
  return Object.fromEntries(
    settings.map((setting) => [setting.key, setting.value]),
  );
}

function booleanSetting(settings: AppSettingsMap, key: string) {
  return settings[key]?.trim().toLowerCase() === "true";
}

function dateSetting(settings: AppSettingsMap, key: string) {
  const value = settings[key];
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function newApplicationAvailability(
  settings: AppSettingsMap,
  totalApplications: number,
) {
  if (!booleanSetting(settings, settingKeys.registrationEnabled)) {
    return {
      canCreate: false,
      message: "Participant registration is currently closed.",
    };
  }

  const now = new Date();
  const startDate = dateSetting(settings, settingKeys.registrationStartDate);
  const endDate = dateSetting(settings, settingKeys.registrationEndDate);

  if (startDate && now < startDate) {
    return {
      canCreate: false,
      message: "New applications are not open yet.",
    };
  }

  if (endDate && now > endDate) {
    return {
      canCreate: false,
      message: "The new application window has closed.",
    };
  }

  if (
    !booleanSetting(settings, settingKeys.multipleApplications) &&
    totalApplications > 0
  ) {
    return {
      canCreate: false,
      message: "Multiple applications are not enabled for participants.",
    };
  }

  return {
    canCreate: true,
    message: "Submit a new proposal for any challenge",
  };
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    email_verification: "Email Verification",
    profile_completion: "Profile Completion",
    proposal_submission: "Proposal Submission",
    submitted: "Submitted",
    withdrawn: "Withdrawn",
  };

  return labels[value] ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function localizedName(value?: ParticipantApplicationSummary["challengeCategory"]) {
  return value?.name.en ?? value?.name.bn ?? value?.name.hi ?? "Not available";
}

function getStoredToken() {
  return localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";
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

function SortButton({
  active,
  children,
  direction,
  onClick,
}: Readonly<{
  active: boolean;
  children: React.ReactNode;
  direction: "asc" | "desc";
  onClick: () => void;
}>) {
  return (
    <button
      className="inline-flex items-center gap-2 font-black uppercase tracking-wide"
      onClick={onClick}
      type="button"
    >
      {children}
      {active ? (
        <ChevronDown
          className={direction === "asc" ? "rotate-180" : ""}
          size={15}
        />
      ) : (
        <ChevronsUpDown size={15} />
      )}
    </button>
  );
}

export default function Page() {
  const [applications, setApplications] = useState<ParticipantApplicationSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<AppSettingsMap>({});
  const [settingsError, setSettingsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [participantRole, setParticipantRole] = useState<ParticipantRole | null>(
    null,
  );
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
  });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const rangeStart = pagination.total ? (pagination.page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(pagination.page * pageSize, pagination.total);
  const totalApplications = statusCounts.all ?? pagination.total;
  const availability = newApplicationAvailability(settings, totalApplications);
  const roleBlockMessage =
    participantRole === "team_member"
      ? "Only the applicant can create a new application."
      : "";
  const canCreateApplication =
    participantRole === "applicant" && availability.canCreate;

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      setError("A valid participant session is required.");
      return undefined;
    }
    setParticipantRole(decodeParticipantRole(token));

    let isMounted = true;
    setIsLoading(true);
    setError("");

    void apiClient
      .get<ParticipantApplicationsResponse>(endpoints.participants.applications, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        query: {
          page: currentPage,
          pageSize,
          sortBy: sortKey,
          sortDirection,
          status: statusFilter,
        },
      })
      .then((result) => {
        if (!isMounted) return;
        setApplications(result.applications);
        setPagination(result.pagination);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setApplications([]);
        setPagination({ page: 1, pageSize, total: 0, totalPages: 1 });
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Applications could not be fetched.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentPage, sortDirection, sortKey, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    setIsSettingsLoading(true);
    setSettingsError("");

    void apiClient
      .get<AppSetting[]>(endpoints.common.appSettings)
      .then((result) => {
        if (!isMounted) return;
        setSettings(settingsMap(result));
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setSettings({});
        setSettingsError(
          requestError instanceof Error
            ? requestError.message
            : "Application settings could not be fetched.",
        );
      })
      .finally(() => {
        if (isMounted) setIsSettingsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return undefined;

    let isMounted = true;

    void Promise.all(
      applicationStatusFilters.map((filter) =>
        apiClient
          .get<ParticipantApplicationsResponse>(endpoints.participants.applications, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            query: {
              page: 1,
              pageSize: 1,
              status: filter.status,
            },
          })
          .then((result) => [filter.status ?? "all", result.pagination.total] as const),
      ),
    )
      .then((counts) => {
        if (!isMounted) return;
        setStatusCounts(Object.fromEntries(counts));
      })
      .catch(() => {
        if (isMounted) setStatusCounts({});
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const sortBy = (key: SortKey) => {
    setCurrentPage(1);
    setSortDirection((currentDirection) =>
      sortKey === key && currentDirection === "asc" ? "desc" : "asc",
    );
    setSortKey(key);
  };

  return (
    <ParticipantShell
      eyebrow="Seva First Innovation Challenge - Eastern Region"
      title="My Application(s)"
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <Image
            alt="Multiple applications are allowed"
            className="h-full min-h-44 w-full object-cover"
            height={300}
            priority
            src="/images/partcipant-application-banner.webp"
            width={1200}
          />
        </div>

        <div className="flex items-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {canCreateApplication && !isSettingsLoading && !settingsError ? (
            <Link
              className="flex min-h-16 w-full items-center gap-4 rounded-lg bg-blue-600 px-6 py-4 text-white shadow-sm transition hover:bg-blue-700"
              href="/participants/applications/new"
            >
              <FilePlus2 className="shrink-0" size={28} />
              <span className="min-w-0">
                <span className="block text-lg font-black">
                  Create New Application
                </span>
                <span className="mt-1 block text-sm font-semibold text-blue-100">
                  {availability.message}
                </span>
              </span>
              <ArrowRight className="ml-auto shrink-0" size={24} />
            </Link>
          ) : (
            <div className="flex min-h-16 w-full items-center gap-4 rounded-lg bg-slate-100 px-6 py-4 text-slate-500">
              <FilePlus2 className="shrink-0" size={28} />
              <span className="min-w-0">
                <span className="block text-lg font-black">
                  Create New Application
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {isSettingsLoading
                    ? "Checking application settings..."
                    : settingsError || roleBlockMessage || availability.message}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {applicationStatusFilters.map((filter) => (
          <button
            className={`flex h-12 items-center justify-between rounded-lg border px-5 text-sm font-semibold shadow-sm transition hover:shadow ${
              statusFilter === filter.status ? filter.style : "border-slate-200 bg-white text-slate-600"
            }`}
            key={filter.label}
            onClick={() => {
              setCurrentPage(1);
              setStatusFilter(filter.status);
            }}
            type="button"
          >
            <span>{filter.label}</span>
            <span
              className={`grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-black ${filter.badgeStyle}`}
            >
              {statusCounts[filter.status ?? "all"] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-5 py-4">
                  <SortButton
                    active={sortKey === "applicationNumber"}
                    direction={sortDirection}
                    onClick={() => sortBy("applicationNumber")}
                  >
                    Application Number
                  </SortButton>
                </th>
                <th className="px-5 py-4">
                  <SortButton
                    active={sortKey === "challengeCategory"}
                    direction={sortDirection}
                    onClick={() => sortBy("challengeCategory")}
                  >
                    Challenge Category
                  </SortButton>
                </th>
                <th className="px-5 py-4">
                  <SortButton
                    active={sortKey === "participationMode"}
                    direction={sortDirection}
                    onClick={() => sortBy("participationMode")}
                  >
                    Participation
                  </SortButton>
                </th>
                <th className="px-5 py-4">
                  <SortButton
                    active={sortKey === "status"}
                    direction={sortDirection}
                    onClick={() => sortBy("status")}
                  >
                    Status
                  </SortButton>
                </th>
                <th className="px-5 py-4">
                  <SortButton
                    active={sortKey === "createdAt"}
                    direction={sortDirection}
                    onClick={() => sortBy("createdAt")}
                  >
                    Created On
                  </SortButton>
                </th>
                <th className="px-5 py-4 text-center font-black uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center font-semibold text-slate-500"
                    colSpan={6}
                  >
                    Loading applications...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center font-semibold text-red-600"
                    colSpan={6}
                  >
                    {error}
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center font-semibold text-slate-500"
                    colSpan={6}
                  >
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                <tr
                  className="text-slate-700 transition hover:bg-slate-50"
                  key={application.applicationNumber}
                >
                  <td className="px-5 py-4 font-black text-[#0b1f3a]">
                    {application.applicationNumber}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {localizedName(application.challengeCategory)}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {application.participationMode}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusStyles[application.status] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {formatStatus(application.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {formatDate(application.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        aria-label={`Manage ${application.applicationNumber}`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                        href={`/participants/applications/${application.applicationHash}`}
                        title="Manage application"
                      >
                        <Settings size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center">
          <p>
            Showing {rangeStart}-{rangeEnd} of {pagination.total} applications
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Previous page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage === 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              aria-label="Next page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage === pagination.totalPages || isLoading}
              onClick={() =>
                setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))
              }
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </ParticipantShell>
  );
}
