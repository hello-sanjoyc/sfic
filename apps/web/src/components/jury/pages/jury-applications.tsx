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
  SquarePen,
  View,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { JURY_SESSION_KEY, JuryShell } from "@/components/jury/common/jury-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type EvaluationStatus = "available" | "evaluated" | "locked" | "on_evaluation";

type Application = {
  district: string;
  evaluationStatus: EvaluationStatus;
  id: number;
  number: string;
  recommendation: string;
  totalScore: number | null;
  state: string;
  title: string;
};

type SortKey = "district" | "number" | "state" | "status" | "submittedAt" | "title";
type SortDirection = "asc" | "desc";

type JuryApplicationApiItem = {
  applicationNumber?: string | null;
  challengeCategory?: string | null;
  district?: string | null;
  evaluationStatus?: EvaluationStatus;
  id?: number | string | null;
  recommendation?: string | null;
  totalScore?: number | null;
  state?: string | null;
};

type JuryApplicationsResponse = {
  applications: JuryApplicationApiItem[];
  currentEvaluation: { applicationId: number; applicationNumber: string } | null;
  submission: { deadline: string | null; isClosed: boolean };
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
  { key: "district", label: "District" },
  { key: "status", label: "Status" },
] satisfies { key: SortKey; label: string }[];

const evaluationStatusLabels: Record<EvaluationStatus, string> = {
  available: "Available",
  evaluated: "Evaluated",
  locked: "Locked",
  on_evaluation: "On Evaluation",
};

function statusClasses(status: EvaluationStatus) {
  if (status === "available") return "bg-slate-100 text-slate-600";
  if (status === "on_evaluation") return "bg-blue-50 text-blue-700";
  if (status === "evaluated") return "bg-emerald-50 text-emerald-700";
  return "bg-rose-50 text-rose-700";
}

function recommendationClasses(recommendation: string) {
  if (recommendation === "Recommend") return "bg-emerald-50 text-emerald-700";
  if (recommendation === "Reject") return "bg-red-100 text-red-700";
  if (recommendation === "Review") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

const lockedMessage =
  "Another jury member is evaluating this application, so it is locked.";

// "Continue" (in progress) and "Edit" (already evaluated, still open) both
// take the jury to the evaluation form; everything else (available once
// closed, or already evaluated and closed) is read-only, so it goes to the
// application detail page instead.
function applicationActionHref(
  applicationId: number | string,
  evaluationStatus: EvaluationStatus,
  isClosed: boolean | undefined,
) {
  const goToEvaluation =
    evaluationStatus === "on_evaluation" ||
    (evaluationStatus === "evaluated" && !isClosed);

  return goToEvaluation
    ? `/jury/applications/${applicationId}/evaluate`
    : `/jury/applications/${applicationId}`;
}

// "Continue" (evaluation in progress) stays text + arrow; "Edit" (already
// evaluated, still open) and "View" (read-only) render as a single icon.
function ApplicationActionContent({
  evaluationStatus,
  isClosed,
  iconSize,
  continueLabel = "Continue",
}: Readonly<{
  evaluationStatus: EvaluationStatus;
  isClosed: boolean | undefined;
  iconSize: number;
  continueLabel?: string;
}>) {
  if (evaluationStatus === "on_evaluation") {
    return (
      <>
        {continueLabel} <ArrowRight size={15} />
      </>
    );
  }

  if (evaluationStatus === "evaluated" && !isClosed) {
    return <SquarePen aria-label="Edit evaluation" size={iconSize} />;
  }

  return <View aria-label="View application" size={iconSize} />;
}

function formatDeadline(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toTableApplication(application: JuryApplicationApiItem): Application {
  return {
    id: Number(application.id ?? 0),
    number: application.applicationNumber ?? "Not assigned",
    district: application.district || "Not selected",
    state: application.state || "Not selected",
    evaluationStatus: application.evaluationStatus ?? "available",
    recommendation: application.recommendation ?? "",
    totalScore: application.totalScore ?? null,
    title: application.challengeCategory || "Not selected",
  };
}

function getToken() {
  try {
    const session = JSON.parse(localStorage.getItem(JURY_SESSION_KEY) ?? "{}") as { token?: string };
    return session.token ?? "";
  } catch {
    return "";
  }
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

export function JuryApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentEvaluation, setCurrentEvaluation] =
    useState<JuryApplicationsResponse["currentEvaluation"]>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [submission, setSubmission] =
    useState<JuryApplicationsResponse["submission"] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  // No chosen sort means the default order: on evaluation, not evaluated yet, evaluated.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
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
      .get<JuryApplicationsResponse>(endpoints.jury.applications, {
        headers: { Authorization: `Bearer ${getToken()}` },
        query: {
          page,
          pageSize,
          search: effectiveSearch || undefined,
          sortBy: sortKey ?? undefined,
          sortDirection: sortKey ? sortDirection : undefined,
        },
      })
      .then((result) => {
        if (!isMounted) return;

        setApplications(result.applications.map(toTableApplication));
        setCurrentEvaluation(result.currentEvaluation);
        setSubmission(result.submission);
        setTotalApplications(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;

        setApplications([]);
        setCurrentEvaluation(null);
        setSubmission(null);
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
    <JuryShell eyebrow="Applications assigned for your review" title="Applications">
      {currentEvaluation && (
        <section className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
          <p>
            You have an evaluation in progress ({currentEvaluation.applicationNumber}). Submit it
            before starting another application.
          </p>
          <Link
            className="inline-flex items-center gap-1 font-bold text-blue-700"
            href={`/jury/applications/${currentEvaluation.applicationId}/evaluate`}
          >
            Continue evaluation <ArrowRight size={15} />
          </Link>
        </section>
      )}
      {submission?.deadline && (
        <section
          className={`rounded-lg border p-4 text-sm font-semibold ${submission.isClosed ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-red-600"}`}
        >
          {submission.isClosed
            ? `The final submission date (${formatDeadline(submission.deadline)}) has passed. Evaluations can no longer be edited or started.`
            : `Final submission deadline: ${formatDeadline(submission.deadline)}. Evaluations not submitted by then are submitted automatically.`}
        </section>
      )}
      <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-3 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <ClipboardList className="text-blue-600" size={22} />
            <div className="min-w-0">
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
        <div className="hidden w-full min-w-0 overflow-x-auto overscroll-x-contain md:block">
          <table className="w-full min-w-[68rem] border-collapse text-left text-sm">
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
                <th className="px-4 py-3 uppercase text-slate-500">Score</th>
                <th className="px-4 py-3 uppercase text-slate-500">Recommendation</th>
                <th className="px-4 py-3 text-center uppercase text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={8}>
                    Loading applications...
                  </td>
                </tr>
              )}
              {!isLoading && errorMessage && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-rose-600" colSpan={8}>
                    {errorMessage}
                  </td>
                </tr>
              )}
              {!isLoading && !errorMessage && applications.map((application) => (
                <tr
                  className={application.evaluationStatus === "on_evaluation" ? "bg-blue-50 shadow-[inset_4px_0_0_0_#2563eb]" : undefined}
                  key={application.id || application.number}
                >
                  <td className="px-4 py-3 font-black text-[#0b1f3a]">{application.number}</td>
                  <td className="px-4 py-3 text-slate-700">{application.title}</td>
                  <td className="px-4 py-3 text-slate-600">{application.state}</td>
                  <td className="px-4 py-3 text-slate-600">{application.district}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(application.evaluationStatus)}`}>
                      {evaluationStatusLabels[application.evaluationStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-black text-[#0b1f3a]">
                    {application.totalScore === null ? <span className="font-normal text-slate-400">-</span> : `${application.totalScore.toFixed(2)} / 100`}
                  </td>
                  <td className="px-4 py-3">
                    {application.recommendation ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${recommendationClasses(application.recommendation)}`}>
                        {application.recommendation}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {application.evaluationStatus === "locked" ? (
                      <span className="inline-flex items-center justify-center gap-1 text-sm font-bold text-slate-400" title={lockedMessage}>
                        Locked
                      </span>
                    ) : (
                      <Link className="inline-flex items-center justify-center gap-1 text-sm font-bold text-blue-600" href={applicationActionHref(application.id, application.evaluationStatus, submission?.isClosed)}>
                        <ApplicationActionContent
                          evaluationStatus={application.evaluationStatus}
                          iconSize={18}
                          isClosed={submission?.isClosed}
                        />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && !errorMessage && applications.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={8}>
                    No applications match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-slate-100 md:hidden">
          {isLoading ? (
            <p className="p-4 text-center text-sm font-semibold text-slate-500">Loading applications...</p>
          ) : errorMessage ? (
            <p className="p-4 text-center text-sm font-semibold text-rose-600">{errorMessage}</p>
          ) : applications.length === 0 ? (
            <p className="p-4 text-center text-sm font-semibold text-slate-500">No applications match your search.</p>
          ) : applications.map((application) => (
            <article className={`grid min-w-0 gap-3 p-4 ${application.evaluationStatus === "on_evaluation" ? "bg-blue-50 shadow-[inset_4px_0_0_0_#2563eb]" : ""}`} key={application.id || application.number}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-[#0b1f3a]">{application.number}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-700">{application.title}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses(application.evaluationStatus)}`}>
                  {evaluationStatusLabels[application.evaluationStatus]}
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-2">
                <div className="min-w-0"><dt className="text-xs font-bold text-slate-500">State</dt><dd className="break-words text-slate-700">{application.state}</dd></div>
                <div className="min-w-0"><dt className="text-xs font-bold text-slate-500">District</dt><dd className="break-words text-slate-700">{application.district}</dd></div>
                {application.totalScore !== null && (
                  <div className="min-w-0"><dt className="text-xs font-bold text-slate-500">Score</dt><dd className="break-words font-black text-[#0b1f3a]">{application.totalScore.toFixed(2)} / 100</dd></div>
                )}
                {application.recommendation && (
                  <div className="min-w-0"><dt className="text-xs font-bold text-slate-500">Recommendation</dt><dd className="break-words text-slate-700">{application.recommendation}</dd></div>
                )}
              </dl>
              {application.evaluationStatus === "locked" ? (
                <p className="text-sm font-semibold text-slate-500">{lockedMessage}</p>
              ) : (
                <Link className="inline-flex min-h-10 items-center gap-1 self-start text-sm font-bold text-blue-600" href={applicationActionHref(application.id, application.evaluationStatus, submission?.isClosed)}>
                  <ApplicationActionContent
                    continueLabel="Continue evaluation"
                    evaluationStatus={application.evaluationStatus}
                    iconSize={20}
                    isClosed={submission?.isClosed}
                  />
                </Link>
              )}
            </article>
          ))}
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:p-4">
          <div className="font-semibold">
            Showing {resultStart}-{resultEnd} of {totalApplications}
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
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
    </JuryShell>
  );
}
