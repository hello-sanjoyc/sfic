"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ClipboardList,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type ApplicationStatus =
  | "Draft"
  | "Email Verification"
  | "Profile Completion"
  | "Proposal Submission"
  | "Submitted"
  | "Withdrawn";

type Application = {
  id: number;
  number: string;
  review: string;
  state: string;
  status: ApplicationStatus;
  title: string;
};

type SortKey = "number" | "review" | "state" | "status" | "submittedAt" | "title";
type SortDirection = "asc" | "desc";

type LocalizedText = {
  bn?: string | null;
  en?: string | null;
  hi?: string | null;
};

type AdminApplicationApiItem = {
  applicationNumber?: string | null;
  challenge?: {
    title?: LocalizedText | null;
  } | null;
  challengeCategory?: {
    name?: LocalizedText | null;
  } | null;
  documents?: unknown[];
  id?: number | string | null;
  participant?: {
    fullName?: string | null;
  } | null;
  proposal?: {
    proposedSolution?: string | null;
  } | null;
  state?: {
    name?: LocalizedText | null;
  } | null;
  status?: string | null;
  teamMembers?: unknown[];
};

type AdminApplicationsResponse = {
  applications: AdminApplicationApiItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const columns = [
  { key: "number", label: "Number" },
  { key: "title", label: "Challenge Category" },
  { key: "state", label: "State" },
  { key: "status", label: "Status" },
  { key: "review", label: "Review" },
] satisfies { key: SortKey; label: string }[];

function formatStatus(status = "draft"): ApplicationStatus {
  const labels: Record<string, ApplicationStatus> = {
    draft: "Draft",
    email_verification: "Email Verification",
    profile_completion: "Profile Completion",
    proposal_submission: "Proposal Submission",
    submitted: "Submitted",
    withdrawn: "Withdrawn",
  };

  return labels[status] ?? "Draft";
}

function statusClasses(status: ApplicationStatus) {
  if (status === "Submitted") return "bg-emerald-50 text-emerald-700";
  if (status === "Draft") return "bg-slate-100 text-slate-600";
  if (status === "Withdrawn") return "bg-rose-50 text-rose-700";
  if (status === "Email Verification") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function localizedName(value?: LocalizedText | null) {
  return value?.en ?? value?.bn ?? value?.hi ?? "";
}

function formatCount(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function toTableApplication(application: AdminApplicationApiItem): Application {
  const documentsCount = application.documents?.length ?? 0;
  const membersCount = application.teamMembers?.length ?? 0;
  const title =
    localizedName(application.challengeCategory?.name) ||
    localizedName(application.challenge?.title) ||
    application.proposal?.proposedSolution ||
    application.participant?.fullName ||
    "Not selected";

  return {
    id: Number(application.id ?? 0),
    number: application.applicationNumber ?? "Not assigned",
    review: `${formatCount(membersCount, "member")} / ${formatCount(documentsCount, "document")}`,
    state: localizedName(application.state?.name) || "Not selected",
    status: formatStatus(application.status ?? undefined),
    title,
  };
}

function SortIcon({
  active,
  direction,
}: Readonly<{
  active: boolean;
  direction: SortDirection;
}>) {
  if (!active) return <ChevronsUpDown size={15} />;
  return direction === "asc" ? <ChevronUp size={15} /> : <ChevronDown size={15} />;
}

export function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const effectiveSearch = query.trim();
  const resultStart = totalApplications === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, totalApplications);

  useEffect(() => {
    if (effectiveSearch.length > 0 && effectiveSearch.length < 3) return;

    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<AdminApplicationsResponse>(endpoints.admin.applications, {
        query: {
          page,
          pageSize,
          search: effectiveSearch || undefined,
          sortBy: sortKey,
          sortDirection,
        },
      })
      .then((result) => {
        if (!isMounted) return;

        setApplications(result.applications.map(toTableApplication));
        setTotalApplications(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;

        setApplications([]);
        setTotalApplications(0);
        setTotalPages(1);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Applications could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveSearch, page, pageSize, sortDirection, sortKey]);

  const sortBy = (key: SortKey) => {
    setPage(1);

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  return (
    <AdminShell eyebrow="Screen, assign and track innovation submissions" title="Applications">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={22} />
            <div>
              <h2 className="text-lg font-black">Application Register</h2>
              <p className="text-sm text-slate-500">Current application pipeline</p>
            </div>
          </div>
          <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-80 lg:w-96">
            <Search size={18} />
            <input
              aria-label="Search application register"
              className="min-w-0 flex-1 bg-transparent font-medium text-slate-700 outline-none placeholder:text-slate-500"
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Search applications"
              type="search"
              value={query}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th className="px-4 py-3" key={column.key}>
                    <button
                      className="inline-flex items-center gap-1 font-bold uppercase text-slate-500"
                      onClick={() => sortBy(column.key)}
                      type="button"
                    >
                      {column.label}
                      <SortIcon
                        active={sortKey === column.key}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 uppercase text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                    Loading applications...
                  </td>
                </tr>
              )}
              {!isLoading && errorMessage && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-rose-600" colSpan={6}>
                    {errorMessage}
                  </td>
                </tr>
              )}
              {!isLoading && !errorMessage && applications.map((application) => (
                <tr key={application.id || application.number}>
                  <td className="px-4 py-3 font-black text-[#0b1f3a]">{application.number}</td>
                  <td className="px-4 py-3 text-slate-700">{application.title}</td>
                  <td className="px-4 py-3 text-slate-600">{application.state}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(application.status)}`}>
                      {application.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{application.review}</td>
                  <td className="px-4 py-3">
                    <Link className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" href={`/admin/applications/${application.id}`}>
                      Manage <ArrowRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
              {!isLoading && !errorMessage && applications.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                    No applications match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
          <div className="font-semibold">
            Showing {resultStart}-{resultEnd} of {totalApplications}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 font-semibold">
              Rows
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 font-bold text-slate-700 outline-none"
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
                value={pageSize}
              >
                {[10, 25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="font-semibold">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Next page"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
