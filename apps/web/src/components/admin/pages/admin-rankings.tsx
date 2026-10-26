"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Search,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type RankPair = { category: number; combined: number };

type RankingItem = {
  applicationNumber: string;
  category: string | null;
  challengeCategory: string | null;
  district: string | null;
  districtRank: RankPair;
  evaluatedBy: "District" | "State";
  id: number;
  recommendation: string | null;
  regionRank: RankPair;
  state: string | null;
  stateRank: RankPair;
  totalScore: number;
};

type RankingsResponse = {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  rankings: RankingItem[];
};

type LookupItem = { id: number; name: { en: string } };
type StoredAdmin = { actor?: string; admin?: { districtId?: number | null; role?: string; stateId?: number | null } };
type RankingCategory = "ALL" | "JUNIOR" | "OPEN";

const categoryOptions: Array<{ label: string; value: RankingCategory }> = [
  { label: "All", value: "ALL" },
  { label: "Junior", value: "JUNIOR" },
  { label: "Open", value: "OPEN" },
];

function normaliseRole(role?: string) {
  return role?.trim().toUpperCase().replace(/[\s-]+/g, "_") ?? "SUPERADMIN";
}

type SortKey = "district" | "number" | "score" | "state";
type SortDirection = "asc" | "desc";

const sortableColumns: Array<{ key: SortKey; label: string }> = [
  { key: "number", label: "Application" },
  { key: "state", label: "State" },
  { key: "district", label: "District" },
  { key: "score", label: "Score" },
];

function SortIcon({ active, direction }: Readonly<{ active: boolean; direction: SortDirection }>) {
  if (!active) return <ChevronsUpDown size={15} />;
  return direction === "asc" ? <ChevronUp size={15} /> : <ChevronDown size={15} />;
}

// One rank per column: the combined rank for "All", or the rank within Junior / Open when a category is selected.
function RankCell({ category, rank }: Readonly<{ category: RankingCategory; rank: RankPair }>) {
  return (
    <td className="px-4 py-3 text-center font-black text-[#0b1f3a]">
      {category === "ALL" ? rank.combined : rank.category}
    </td>
  );
}

function FilterSelect({ children, disabled, label, onChange, placeholder, value }: Readonly<{ children: React.ReactNode; disabled?: boolean; label: string; onChange: (value: string) => void; placeholder?: string; value: string }>) {
  return (
    <label className="grid gap-1.5 text-xs font-bold uppercase text-slate-500">
      {label}
      <select
        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700 outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
    </label>
  );
}

export function AdminRankingsPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [role, setRole] = useState("SUPERADMIN");
  const [assignedStateId, setAssignedStateId] = useState<number | null>(null);
  const [assignedDistrictId, setAssignedDistrictId] = useState<number | null>(null);
  const [category, setCategory] = useState<RankingCategory>("ALL");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [stateOptions, setStateOptions] = useState<LookupItem[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LookupItem[]>([]);
  const isStateLocked = role === "ADMIN_STATE" || role === "ADMIN_DISTRICT";
  const isDistrictLocked = role === "ADMIN_DISTRICT";
  const effectiveSearch = query.trim();
  const resultStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultEnd = Math.min(page * pageSize, total);

  // State and District admins are limited to their assigned area; Super Admin and Region Admin get every filter.
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? "{}") as StoredAdmin;
      const nextRole = session.actor === "admin" ? normaliseRole(session.admin?.role) : "SUPERADMIN";
      setRole(nextRole);
      setAssignedStateId(session.admin?.stateId ?? null);
      setAssignedDistrictId(session.admin?.districtId ?? null);
      if (nextRole === "ADMIN_STATE" || nextRole === "ADMIN_DISTRICT") setStateId(String(session.admin?.stateId ?? ""));
      if (nextRole === "ADMIN_DISTRICT") setDistrictId(String(session.admin?.districtId ?? ""));
    } catch { /* no session: the shell redirects to login */ }
  }, []);

  useEffect(() => {
    apiClient
      .get<LookupItem[]>(endpoints.common.states)
      .then((items) => setStateOptions(isStateLocked ? items.filter((item) => item.id === assignedStateId) : items))
      .catch(() => setErrorMessage("States could not be loaded."));
  }, [assignedStateId, isStateLocked]);

  useEffect(() => {
    if (!stateId) {
      setDistrictOptions([]);
      return;
    }

    apiClient
      .get<LookupItem[]>(endpoints.common.districts, { query: { stateId } })
      .then((items) => setDistrictOptions(isDistrictLocked ? items.filter((item) => item.id === assignedDistrictId) : items))
      .catch(() => setErrorMessage("Districts could not be loaded."));
  }, [assignedDistrictId, isDistrictLocked, stateId]);

  useEffect(() => {
    if (effectiveSearch.length > 0 && effectiveSearch.length < 3) return;

    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    void apiClient
      .get<RankingsResponse>(endpoints.admin.applicationRankings, {
        query: {
          category: category === "ALL" ? undefined : category,
          districtId: districtId || undefined,
          page,
          pageSize,
          search: effectiveSearch || undefined,
          stateId: stateId || undefined,
          sortBy: sortKey,
          sortDirection,
        },
      })
      .then((result) => {
        if (!isMounted) return;
        setRankings(result.rankings);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((error) => {
        if (!isMounted) return;
        setRankings([]);
        setTotal(0);
        setTotalPages(1);
        setErrorMessage(error instanceof Error ? error.message : "Rankings could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [category, districtId, effectiveSearch, page, pageSize, sortDirection, sortKey, stateId]);

  const sortBy = (key: SortKey) => {
    setPage(1);

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "score" ? "desc" : "asc");
  };

  return (
    <AdminShell eyebrow="Ranks from finally submitted jury evaluations" title="Rankings">
      <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-3 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Trophy className="text-blue-600" size={22} />
            <div className="min-w-0">
              <h2 className="text-lg font-black">Application Rankings</h2>
              <p className="text-sm text-slate-500">
                Ranks are within the selected category, or across Junior and Open combined for All. Only applications scoring 50 or above are listed.
              </p>
            </div>
          </div>
          <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-80 lg:w-96">
            <Search size={18} />
            <input
              aria-label="Search rankings"
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
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 sm:p-5">
          <FilterSelect label="Category" onChange={(value) => { setPage(1); setCategory(value as RankingCategory); }} value={category}>
            {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </FilterSelect>
          <FilterSelect disabled={isStateLocked} label="State" onChange={(value) => { setPage(1); setStateId(value); setDistrictId(""); }} placeholder="All states" value={stateId}>
            {stateOptions.map((item) => <option key={item.id} value={item.id}>{item.name.en}</option>)}
          </FilterSelect>
          <FilterSelect disabled={isDistrictLocked || !stateId} label="District" onChange={(value) => { setPage(1); setDistrictId(value); }} placeholder="All districts" value={districtId}>
            {districtOptions.map((item) => <option key={item.id} value={item.id}>{item.name.en}</option>)}
          </FilterSelect>
        </div>
        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[68rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                {sortableColumns.slice(0, 3).map((column) => (
                  <th className="px-4 py-3" key={column.key}>
                    <button
                      className="inline-flex items-center gap-1 font-bold uppercase text-slate-500"
                      onClick={() => sortBy(column.key)}
                      type="button"
                    >
                      {column.label}
                      <SortIcon active={sortKey === column.key} direction={sortDirection} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 uppercase">Category</th>
                <th className="px-4 py-3">
                  <button
                    className="inline-flex items-center gap-1 font-bold uppercase text-slate-500"
                    onClick={() => sortBy("score")}
                    type="button"
                  >
                    Score
                    <SortIcon active={sortKey === "score"} direction={sortDirection} />
                  </button>
                </th>
                <th className="px-4 py-3 uppercase">Recommendation</th>
                <th className="px-4 py-3 text-center uppercase">District Rank</th>
                <th className="px-4 py-3 text-center uppercase">State Rank</th>
                <th className="px-4 py-3 text-center uppercase">Region Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={9}>
                    Loading rankings...
                  </td>
                </tr>
              )}
              {!isLoading && errorMessage && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-rose-600" colSpan={9}>
                    {errorMessage}
                  </td>
                </tr>
              )}
              {!isLoading && !errorMessage && rankings.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={9}>
                    No applications scoring 50 or above match these filters.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !errorMessage &&
                rankings.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-black text-[#0b1f3a]">{item.applicationNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{item.state ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.district ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category ?? "-"}</td>
                    <td className="px-4 py-3 font-black text-[#0b1f3a]">{item.totalScore} / 100</td>
                    <td className="px-4 py-3 text-slate-600">{item.recommendation ?? "-"}</td>
                    <RankCell category={category} rank={item.districtRank} />
                    <RankCell category={category} rank={item.stateRank} />
                    <RankCell category={category} rank={item.regionRank} />
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:p-4">
          <div className="font-semibold">
            Showing {resultStart}-{resultEnd} of {total}
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
    </AdminShell>
  );
}
