"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Eye,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type ActorType = "admin" | "jury" | "participant" | "system";
type Category =
  | "application"
  | "jury_evaluation"
  | "jury_profile"
  | "user"
  | "settings"
  | "email_notification"
  | "auth"
  | "other";

type AuditLogApiEntry = {
  action: string;
  actorEmail: string | null;
  actorId: number | null;
  actorName: string | null;
  actorRole: string | null;
  actorType: ActorType;
  applicantFullName: string | null;
  applicantPhone: string | null;
  applicationId: number | null;
  applicationNumber: string | null;
  category: Category;
  createdAt: string;
  details: Record<string, unknown> | null;
  httpMethod: string;
  id: number;
  routePath: string;
  statusCode: number;
};

type AuditLogResponse = {
  entries: AuditLogApiEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type SortKey = "createdAt";

const categoryLabels: Record<Category, string> = {
  application: "Application",
  jury_evaluation: "Jury Evaluation",
  jury_profile: "Jury Profile",
  user: "User",
  settings: "Settings",
  email_notification: "Email Notification",
  auth: "Auth",
  other: "Other",
};

const actorTypeLabels: Record<ActorType, string> = {
  admin: "Admin",
  jury: "Jury",
  participant: "Participant",
  system: "System",
};

function isCurrentAdminSuperAdmin() {
  if (typeof window === "undefined") return false;

  try {
    const session = JSON.parse(
      localStorage.getItem(AUTH_STORAGE_KEY) ?? "{}",
    ) as {
      actor?: string;
      admin?: { role?: string };
    };
    const role = session.actor === "admin" ? (session.admin?.role ?? "") : "";

    return role.trim().toUpperCase().replace(/[\s-]+/g, "_") === "SUPERADMIN";
  } catch {
    return false;
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeAdminRole(role: string) {
  return role.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

// Mirrors admin-shell.tsx's adminRoleLabel mapping, so the audit trail shows
// the same role names admins see everywhere else in the console.
function adminRoleLabel(role: string) {
  const normalizedRole = normalizeAdminRole(role);
  if (normalizedRole === "SUPERADMIN") return "Super Admin";
  if (normalizedRole === "ADMIN_REGION") return "Region Admin";
  if (normalizedRole === "ADMIN_STATE") return "State Admin";
  if (normalizedRole === "ADMIN_DISTRICT") return "District Admin";
  return role;
}

function actorRoleLabel(entry: AuditLogApiEntry) {
  if (!entry.actorRole) return null;
  if (entry.actorType === "admin") return adminRoleLabel(entry.actorRole);
  return entry.actorRole;
}

function actorName(entry: AuditLogApiEntry) {
  return entry.actorName || entry.actorEmail || `#${entry.actorId ?? "-"}`;
}

// "Full Name (Role)" when a role is known, otherwise just the name/email/id.
function actorLabel(entry: AuditLogApiEntry) {
  const role = actorRoleLabel(entry);
  const name = actorName(entry);
  return role ? `${name} (${role})` : name;
}

// Admin -> their user profile page; jury -> their jury profile page.
// Participants have no admin-facing profile page today, so they stay
// unlinked plain text.
function actorHref(entry: AuditLogApiEntry) {
  if (!entry.actorId) return null;
  if (entry.actorType === "admin") return `/admin/users/${entry.actorId}`;
  if (entry.actorType === "jury") return `/admin/juries/${entry.actorId}`;
  return null;
}

type FieldChange = { from: unknown; to: unknown };

function isFieldChange(value: unknown): value is FieldChange {
  return (
    typeof value === "object" &&
    value !== null &&
    "from" in value &&
    "to" in value
  );
}

function formatChangeValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Recursively walks `details` (and any nested `changes` map it carries) and
// flattens it into a list of { field, from, to } rows, so a nested shape
// like { changes: { "participant.fullName": { from, to } } } renders as one
// row per leaf field regardless of how deeply the caller nested it.
function flattenChanges(
  value: Record<string, unknown> | null | undefined,
  prefix = "",
): Array<{ field: string } & FieldChange> {
  if (!value) return [];

  const rows: Array<{ field: string } & FieldChange> = [];
  const source =
    "changes" in value && typeof value.changes === "object" && value.changes
      ? (value.changes as Record<string, unknown>)
      : value;

  for (const [key, entry] of Object.entries(source)) {
    const field = prefix ? `${prefix}.${key}` : key;

    if (isFieldChange(entry)) {
      rows.push({ field, from: entry.from, to: entry.to });
      continue;
    }

    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const nested = entry as Record<string, unknown>;
      const allFieldChanges = Object.values(nested).every(isFieldChange);
      if (allFieldChanges) {
        rows.push(...flattenChanges({ changes: nested }, field));
      }
    }
  }

  return rows;
}

function detailsExtras(
  details: Record<string, unknown> | null,
  changeFields: Set<string>,
) {
  if (!details) return [];

  return Object.entries(details).filter(
    ([key]) => key !== "changes" && !changeFields.has(key),
  );
}

function SortIcon({
  active,
  direction,
}: Readonly<{
  active: boolean;
  direction: "asc" | "desc";
}>) {
  if (!active) return <ChevronsUpDown size={15} />;
  return direction === "asc" ? <ChevronUp size={15} /> : <ChevronDown size={15} />;
}

// Renders the actor's name (linked to their profile page when one exists:
// admin -> /admin/users/:id, jury -> /admin/juries/:id) with their role in
// parentheses on the line below.
function ActorCell({ entry }: Readonly<{ entry: AuditLogApiEntry }>) {
  const name = actorName(entry);
  const role = actorRoleLabel(entry);
  const href = actorHref(entry);

  return (
    <span className="flex flex-col">
      <span className="font-bold text-[#0b1f3a]">
        {href ? (
          <Link className="text-blue-600 hover:underline" href={href}>
            {name}
          </Link>
        ) : (
          name
        )}
      </span>
      {role && (
        <span className="text-xs font-semibold text-slate-500">
          ({role})
        </span>
      )}
    </span>
  );
}

export function AdminActivitiesPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<AuditLogApiEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actorTypeFilter, setActorTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [applicationNumberFilter, setApplicationNumberFilter] = useState("");
  const [applicantNameFilter, setApplicantNameFilter] = useState("");
  const [applicantPhoneFilter, setApplicantPhoneFilter] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortKey] = useState<SortKey>("createdAt");
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [detailsEntry, setDetailsEntry] = useState<AuditLogApiEntry | null>(
    null,
  );
  const resultStart = totalEntries === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, totalEntries);

  useEffect(() => {
    setIsSuperAdmin(isCurrentAdminSuperAdmin());
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;

    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<AuditLogResponse>(endpoints.admin.auditLog, {
        query: {
          actorType: actorTypeFilter || undefined,
          applicantName: applicantNameFilter.trim() || undefined,
          applicantPhone: applicantPhoneFilter.trim() || undefined,
          applicationNumber: applicationNumberFilter.trim() || undefined,
          category: categoryFilter || undefined,
          page,
          pageSize,
          sortBy: sortKey,
          sortDirection,
        },
      })
      .then((result) => {
        if (!isMounted) return;

        setEntries(result.entries);
        setTotalEntries(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;

        setEntries([]);
        setTotalEntries(0);
        setTotalPages(1);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The audit trail could not be loaded.",
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    actorTypeFilter,
    applicantNameFilter,
    applicantPhoneFilter,
    applicationNumberFilter,
    categoryFilter,
    isSuperAdmin,
    page,
    pageSize,
    sortDirection,
    sortKey,
  ]);

  if (isSuperAdmin === false) {
    return (
      <AdminShell eyebrow="Permanent record of every action, for future audit" title="Audit Trail">
        <section className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Lock className="text-slate-400" size={28} />
          <p className="text-sm font-semibold text-slate-600">
            Only a SuperAdmin can view the audit trail.
          </p>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell eyebrow="Permanent record of every action, for future audit" title="Audit Trail">
      <>
      <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-3 border-b border-slate-200 p-3 sm:p-5">
          <ShieldCheck className="text-blue-600" size={22} />
          <div className="min-w-0">
            <h2 className="text-lg font-black">Audit Trail</h2>
            <p className="text-sm text-slate-500">
              Every action by admins, jury and participants
            </p>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 p-3 sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
          <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
            Actor type
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              onChange={(event) => {
                setPage(1);
                setActorTypeFilter(event.target.value);
              }}
              value={actorTypeFilter}
            >
              <option value="">All actors</option>
              {Object.entries(actorTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
            Category
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              onChange={(event) => {
                setPage(1);
                setCategoryFilter(event.target.value);
              }}
              value={categoryFilter}
            >
              <option value="">All categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
            Application number
            <input
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              onChange={(event) => {
                setPage(1);
                setApplicationNumberFilter(event.target.value);
              }}
              placeholder="e.g. SFIC-WB-1028"
              type="text"
              value={applicationNumberFilter}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
            Applicant full name
            <input
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              onChange={(event) => {
                setPage(1);
                setApplicantNameFilter(event.target.value);
              }}
              placeholder="e.g. Aditi Sen"
              type="text"
              value={applicantNameFilter}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase text-slate-500">
            Applicant phone number
            <input
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              onChange={(event) => {
                setPage(1);
                setApplicantPhoneFilter(event.target.value);
              }}
              placeholder="10-digit mobile number"
              type="text"
              value={applicantPhoneFilter}
            />
          </label>
        </div>

        <div className="hidden w-full min-w-0 overflow-x-auto overscroll-x-contain md:block">
          <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <button
                    className="inline-flex items-center gap-1 font-bold uppercase text-slate-500"
                    onClick={() => {
                      setPage(1);
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      );
                    }}
                    type="button"
                  >
                    Timestamp
                    <SortIcon active direction={sortDirection} />
                  </button>
                </th>
                <th className="px-4 py-3 uppercase text-slate-500">Actor</th>
                <th className="px-4 py-3 uppercase text-slate-500">Action</th>
                <th className="px-4 py-3 uppercase text-slate-500">
                  Application Number
                </th>
                <th className="px-4 py-3 uppercase text-slate-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm font-semibold text-slate-500"
                    colSpan={5}
                  >
                    Loading audit trail...
                  </td>
                </tr>
              )}
              {!isLoading && errorMessage && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm font-semibold text-rose-600"
                    colSpan={5}
                  >
                    {errorMessage}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !errorMessage &&
                entries.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-sm font-semibold text-slate-500"
                      colSpan={5}
                    >
                      No audit entries match these filters.
                    </td>
                  </tr>
                )}
              {!isLoading &&
                !errorMessage &&
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ActorCell entry={entry} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 font-black text-[#0b1f3a]">
                      {entry.applicationNumber ? (
                        <Link
                          className="text-blue-600 hover:underline"
                          href={`/admin/applications/${entry.applicationId}`}
                        >
                          {entry.applicationNumber}
                        </Link>
                      ) : (
                        <span className="font-normal text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.details ? (
                        <button
                          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline"
                          onClick={() => setDetailsEntry(entry)}
                          type="button"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-0 divide-y divide-slate-100 md:hidden">
          {isLoading && (
            <p className="p-5 text-center text-sm font-semibold text-slate-500">
              Loading audit trail...
            </p>
          )}
          {!isLoading && errorMessage && (
            <p className="p-5 text-center text-sm font-semibold text-rose-600">
              {errorMessage}
            </p>
          )}
          {!isLoading &&
            !errorMessage &&
            entries.length === 0 && (
              <p className="p-5 text-center text-sm font-semibold text-slate-500">
                No audit entries match these filters.
              </p>
            )}
          {!isLoading &&
            !errorMessage &&
            entries.map((entry) => (
              <article className="grid gap-2 p-4" key={entry.id}>
                <ActorCell entry={entry} />
                <p className="text-sm text-slate-700">{entry.action}</p>
                {entry.applicationNumber && (
                  <Link
                    className="text-sm font-bold text-blue-600"
                    href={`/admin/applications/${entry.applicationId}`}
                  >
                    {entry.applicationNumber}
                  </Link>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {formatTimestamp(entry.createdAt)}
                  </p>
                  {entry.details && (
                    <button
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"
                      onClick={() => setDetailsEntry(entry)}
                      type="button"
                    >
                      <Eye size={13} />
                      Details
                    </button>
                  )}
                </div>
              </article>
            ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:p-4">
          <div className="font-semibold">
            Showing {resultStart}-{resultEnd} of {totalEntries}
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
                {[25, 50, 100, 200].map((size) => (
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
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {detailsEntry && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-black text-[#0b1f3a]">
                  {detailsEntry.action}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {actorLabel(detailsEntry)} &middot;{" "}
                  {formatTimestamp(detailsEntry.createdAt)}
                </p>
              </div>
              <button
                aria-label="Close"
                className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => setDetailsEntry(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">
              {(() => {
                const changes = flattenChanges(detailsEntry.details);
                const changeFields = new Set(changes.map((row) => row.field));
                const extras = detailsExtras(
                  detailsEntry.details,
                  changeFields,
                );

                return (
                  <div className="grid gap-4">
                    {changes.length > 0 && (
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="text-xs font-bold uppercase text-slate-500">
                          <tr>
                            <th className="py-1.5 pr-3">Field</th>
                            <th className="py-1.5 pr-3">From</th>
                            <th className="py-1.5">To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {changes.map((row) => (
                            <tr key={row.field}>
                              <td className="py-2 pr-3 font-bold text-[#0b1f3a]">
                                {row.field}
                              </td>
                              <td className="py-2 pr-3 text-rose-600">
                                {formatChangeValue(row.from)}
                              </td>
                              <td className="py-2 text-emerald-700">
                                {formatChangeValue(row.to)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {extras.length > 0 && (
                      <dl className="grid gap-2 text-sm">
                        {extras.map(([key, value]) => (
                          <div
                            className="flex items-start justify-between gap-4"
                            key={key}
                          >
                            <dt className="font-bold text-slate-500">
                              {key}
                            </dt>
                            <dd className="break-words text-right text-slate-700">
                              {formatChangeValue(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {changes.length === 0 && extras.length === 0 && (
                      <p className="text-sm text-slate-500">
                        No further detail was recorded for this action.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      </>
    </AdminShell>
  );
}
