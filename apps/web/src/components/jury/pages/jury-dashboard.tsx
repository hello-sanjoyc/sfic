"use client";

import { Building2, FileText, Tags, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { JURY_SESSION_KEY, JuryShell } from "@/components/jury/common/jury-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type CountRow = { count: number; key: string; label: string };
type CountCard = CountRow & { detail: string };
type CategoryCountRow = CountRow & {
  evaluated: number;
  onEvaluation: number;
  recommended: number;
  rejected: number;
  reviewed: number;
  viewed: number;
};

type JuryDashboardResponse = {
  cards: CountCard[];
  challengeCategories: CategoryCountRow[];
  districts: CountRow[];
  organisationTypes: CountRow[];
  scope: {
    categories: string[];
    district: string | null;
    scope: "State" | "District";
    state: string;
  };
};

const dashboardRefreshMs = 60_000;

const cardStyles: Record<string, { accent: string; icon: typeof FileText }> = {
  junior: { accent: "bg-blue-50 text-blue-600", icon: Tags },
  open: { accent: "bg-emerald-50 text-emerald-600", icon: Tags },
  single: { accent: "bg-indigo-50 text-indigo-600", icon: User },
  team: { accent: "bg-orange-50 text-orange-600", icon: Users },
  totalApplications: { accent: "bg-blue-50 text-blue-600", icon: FileText },
};

function MetricCard({
  accent,
  detail,
  icon: Icon,
  label,
  value,
}: {
  accent: string;
  detail: string;
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-24 w-full min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:min-h-28 sm:gap-5 sm:p-5">
      <div className={`grid size-11 shrink-0 place-items-center rounded-full sm:size-14 ${accent}`}>
        <Icon className="size-5 sm:size-7" />
      </div>
      <div className="min-w-0">
        <p className="break-words text-xl font-black leading-tight sm:text-2xl">{value}</p>
        <p className="break-words text-sm font-medium leading-snug text-slate-600">{label}</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function CountTable({
  countHeader,
  nameHeader,
  rows,
}: {
  countHeader: string;
  nameHeader: string;
  rows: CountRow[];
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-4">{nameHeader}</th>
              <th className="px-5 py-4 text-center">{countHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-4 text-slate-500" colSpan={2}>
                  Nothing to show yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr className="text-slate-700" key={row.key}>
                <td className="px-5 py-4 font-semibold text-[#0b1f3a]">{row.label}</td>
                <td className="px-5 py-4 text-center font-black text-[#0b1f3a]">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const categoryColumns: Array<{ key: keyof CategoryCountRow; label: string }> = [
  { key: "count", label: "Total" },
  { key: "viewed", label: "Viewed" },
  { key: "onEvaluation", label: "On Evaluation" },
  { key: "evaluated", label: "Evaluated" },
  { key: "recommended", label: "Recommended" },
  { key: "reviewed", label: "Reviewed" },
  { key: "rejected", label: "Rejected" },
];

function CategoryCountTable({ rows }: { rows: CategoryCountRow[] }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-64" />
            {categoryColumns.map((column) => (
              <col key={column.key} />
            ))}
          </colgroup>
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-4">Category Name</th>
              {categoryColumns.map((column) => (
                <th className="whitespace-nowrap px-2 py-4 text-center" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-4 text-slate-500" colSpan={categoryColumns.length + 1}>
                  Nothing to show yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr className="text-slate-700" key={row.key}>
                <td className="px-5 py-4 font-semibold text-[#0b1f3a]">{row.label}</td>
                {categoryColumns.map((column) => (
                  <td className="px-2 py-4 text-center font-black text-[#0b1f3a]" key={column.key}>
                    {row[column.key] as number}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-slate-300 bg-slate-50">
              <tr>
                <td className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-600">Total</td>
                {categoryColumns.map((column) => (
                  <td className="px-2 py-4 text-center font-black text-[#0b1f3a]" key={column.key}>
                    {rows.reduce((sum, row) => sum + (row[column.key] as number), 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function getToken() {
  try {
    const session = JSON.parse(localStorage.getItem(JURY_SESSION_KEY) ?? "{}") as { token?: string };
    return session.token ?? "";
  } catch {
    return "";
  }
}

export function JuryDashboardPage() {
  const [data, setData] = useState<JuryDashboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await apiClient.get<JuryDashboardResponse>(endpoints.jury.dashboard, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!isMounted) return;
        setData(result);
        setError("");
      } catch (caught) {
        if (!isMounted) return;
        setError(caught instanceof Error ? caught.message : "The dashboard could not be loaded.");
      }
    };

    void load();
    const refreshInterval = window.setInterval(() => void load(), dashboardRefreshMs);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const scope = data?.scope;
  const location = scope ? (scope.district ? `${scope.district}, ${scope.state}` : scope.state) : "";

  return (
    <JuryShell eyebrow="Programme overview, review queues and operational status" title="Dashboard">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}

      {scope && (
        <p className="text-sm font-normal text-slate-600">
          {scope.scope === "District" && scope.district ? (
            <>
              Showing submitted applications from districts of{" "}
              <span className="font-bold text-[#0b1f3a]">{scope.state}</span> other than{" "}
              <span className="font-bold text-[#0b1f3a]">{scope.district}</span>
            </>
          ) : (
            <>
              Showing submitted applications from <span className="font-bold text-[#0b1f3a]">{location}</span>
            </>
          )}
          {scope.categories.length > 0 && (
            <>
              {" "}
              in{" "}
              {scope.categories.map((category, index) => (
                <span key={category}>
                  {index > 0 && ", "}
                  <span className="font-bold text-[#0b1f3a]">{category}</span>
                </span>
              ))}
            </>
          )}
          .
        </p>
      )}

      <section className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3 sm:gap-4">
        {(data?.cards ?? []).map((card) => {
          const style = cardStyles[card.key] ?? cardStyles.totalApplications;

          return (
            <MetricCard
              accent={style.accent}
              detail={card.detail}
              icon={style.icon}
              key={card.key}
              label={card.label}
              value={String(card.count)}
            />
          );
        })}
      </section>

      <section className="w-full min-w-0">
        <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">Organisation Type wise</h2>
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 sm:gap-4">
          {(data?.organisationTypes ?? []).map((row) => (
            <MetricCard
              accent="bg-slate-100 text-slate-700"
              detail="Organisation Type"
              icon={Building2}
              key={row.key}
              label={row.label}
              value={String(row.count)}
            />
          ))}
        </div>
      </section>

      {scope?.scope === "State" && (
        <section className="w-full min-w-0">
          <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">District wise count</h2>
          <CountTable countHeader="Count" nameHeader="District" rows={data?.districts ?? []} />
        </section>
      )}

      <section className="w-full min-w-0">
        <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">Challenge Category wise count</h2>
        <CategoryCountTable rows={data?.challengeCategories ?? []} />
      </section>
    </JuryShell>
  );
}
