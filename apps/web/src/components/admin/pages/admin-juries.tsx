"use client";

import { Award, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Mail, MapPin, Plus, Search, Send, Users, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type JuryScope = "State" | "District";
type CategoryCounts = { categoryId: number; evaluatedCount: number; name: string; onEvaluationCount: number; recommendedCount: number; rejectedCount: number; reviewedCount: number; totalCount: number; viewedCount: number };
type Jury = { categories: string[]; categoryCounts?: CategoryCounts[]; email: string; evaluatedCount?: number; onEvaluationCount?: number; recommendedCount?: number; rejectedCount?: number; reviewedCount?: number; totalCount?: number; viewedCount?: number; id?: number; mobile: string; name: string; scope: JuryScope; location: string; status: "Active" | "Inactive" | "Invitation pending" };
type StoredAdmin = { actor?: string; admin?: { districtId?: number | null; role?: string; stateId?: number | null } };
type LookupItem = { id: number; name: { en: string } };
type JuryLookups = { challengeCategories: LookupItem[]; districts: Array<LookupItem & { stateId: number }>; states: LookupItem[] };
type JurySortKey = "category" | "jurisdiction" | "name" | "status";

// Per-jury counts, defined as on the jury dashboard's category table.
const countColumns: Array<{ key: "evaluatedCount" | "onEvaluationCount" | "recommendedCount" | "rejectedCount" | "reviewedCount" | "totalCount" | "viewedCount"; label: string }> = [
  { key: "totalCount", label: "Total" },
  { key: "viewedCount", label: "Viewed" },
  { key: "onEvaluationCount", label: "On Evaluation" },
  { key: "evaluatedCount", label: "Evaluated" },
  { key: "recommendedCount", label: "Recommended" },
  { key: "reviewedCount", label: "Reviewed" },
  { key: "rejectedCount", label: "Rejected" },
];

const categoryOptions = ["Agriculture & Rural Development", "Clean Energy", "Education", "Healthcare", "Urban Innovation", "Water & Sanitation"];
const initialJuries: Jury[] = [
  { name: "Dr. Aditi Sen", email: "aditi.sen@example.org", mobile: "98765 43210", scope: "State", location: "West Bengal", categories: ["Healthcare", "Education"], status: "Active" },
  { name: "Prof. Rahul Verma", email: "rahul.verma@example.org", mobile: "98765 43211", scope: "District", location: "Patna, Bihar", categories: ["Clean Energy"], status: "Active" },
  { name: "Ananya Roy", email: "ananya.roy@example.org", mobile: "98765 43212", scope: "District", location: "North 24 Parganas, West Bengal", categories: ["Agriculture & Rural Development"], status: "Invitation pending" },
];

function normaliseRole(role?: string) { return role?.trim().toUpperCase().replace(/[\s-]+/g, "_") ?? "SUPERADMIN"; }
function accessFor(role: string) {
  if (role === "ADMIN_DISTRICT") return { district: "North 24 Parganas", state: "West Bengal", scopes: ["District"] as JuryScope[] };
  if (role === "ADMIN_STATE") return { district: "", state: "West Bengal", scopes: ["State", "District"] as JuryScope[] };
  return { district: "", state: "", scopes: ["State", "District"] as JuryScope[] };
}

export function AdminJuriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [juries, setJuries] = useState<Jury[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState("SUPERADMIN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [scope, setScope] = useState<JuryScope>("State");
  const [state, setState] = useState("West Bengal");
  const [district, setDistrict] = useState("North 24 Parganas");
  const [categories, setCategories] = useState<string[]>([]);
  const [lookups, setLookups] = useState<JuryLookups | null>(null);
  const [stateOptions, setStateOptions] = useState<LookupItem[]>([]);
  const [districtOptions, setDistrictOptions] = useState<Array<LookupItem & { stateId: number }>>([]);
  const [assignedStateId, setAssignedStateId] = useState<number | null>(null);
  const [assignedDistrictId, setAssignedDistrictId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingJuries, setIsLoadingJuries] = useState(true);
  const [juryPage, setJuryPage] = useState(1);
  const [juryPageSize, setJuryPageSize] = useState(10);
  const [juryQuery, setJuryQuery] = useState("");
  const [jurySortBy, setJurySortBy] = useState<JurySortKey>("name");
  const [jurySortDirection, setJurySortDirection] = useState<"asc" | "desc">("desc");
  const [juryTotal, setJuryTotal] = useState(0);
  const [juryTotalPages, setJuryTotalPages] = useState(1);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [filterStateId, setFilterStateId] = useState("");
  const [filterDistrictId, setFilterDistrictId] = useState("");
  const [filterDistrictOptions, setFilterDistrictOptions] = useState<Array<LookupItem & { stateId: number }>>([]);
  const [expandedJuries, setExpandedJuries] = useState<Set<string>>(new Set());
  const toggleExpanded = (email: string) => setExpandedJuries((current) => { const next = new Set(current); if (!next.delete(email)) next.add(email); return next; });

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? "{}") as StoredAdmin;
      const nextRole = session.actor === "admin" ? normaliseRole(session.admin?.role) : "SUPERADMIN";
      const access = accessFor(nextRole);
      setRole(nextRole);
      setAssignedStateId(session.admin?.stateId ?? null);
      setAssignedDistrictId(session.admin?.districtId ?? null);
      // State and District admins start (and stay) on their own area; Super Admin and Region Admin start unfiltered.
      if (nextRole === "ADMIN_STATE" || nextRole === "ADMIN_DISTRICT") setFilterStateId(String(session.admin?.stateId ?? ""));
      if (nextRole === "ADMIN_DISTRICT") setFilterDistrictId(String(session.admin?.districtId ?? ""));
      if (access.state) setState(access.state);
      if (access.district) setDistrict(access.district);
      setScope(access.scopes[0]);
    } catch { /* preview remains usable when no session exists */ }
  }, []);

  useEffect(() => { apiClient.get<JuryLookups>(endpoints.common.lookups).then(setLookups).catch(() => setError("Unable to load jury form lookups.")); }, []);

  useEffect(() => { let mounted = true; setIsLoadingJuries(true); apiClient.get<{ juries: Array<{ categories: string[]; categoryCounts?: CategoryCounts[]; district: string | null; email: string; evaluatedCount?: number; onEvaluationCount?: number; recommendedCount?: number; rejectedCount?: number; reviewedCount?: number; totalCount?: number; viewedCount?: number; id: number; mobile: string; name: string; scope: JuryScope; state: string; status: "Active" | "Inactive" | "Invitation pending" }>; pagination: { total: number; totalPages: number } }>(endpoints.jury.adminProfiles, { query: { districtId: filterDistrictId || undefined, page: juryPage, pageSize: juryPageSize, search: juryQuery.trim() || undefined, stateId: filterStateId || undefined, sortBy: jurySortBy, sortDirection: jurySortDirection } }).then((result) => { if (!mounted) return; setJuries(result.juries.map((jury) => ({ ...jury, location: jury.scope === "District" && jury.district ? `${jury.district}, ${jury.state}` : jury.state }))); setJuryTotal(result.pagination.total); setJuryTotalPages(result.pagination.totalPages); }).catch((requestError) => { if (mounted) { setJuries([]); setJuryTotal(0); setJuryTotalPages(1); setError(requestError instanceof Error ? requestError.message : "Unable to load jury profiles."); } }).finally(() => { if (mounted) setIsLoadingJuries(false); }); return () => { mounted = false; }; }, [filterDistrictId, filterStateId, juryPage, juryPageSize, juryQuery, jurySortBy, jurySortDirection]);

  useEffect(() => { apiClient.get<LookupItem[]>(endpoints.common.states).then((items) => { setStateOptions(items); setState((current) => items.find((item) => item.id === assignedStateId)?.name.en ?? items.find((item) => item.name.en === current)?.name.en ?? items[0]?.name.en ?? ""); }).catch(() => setError("Unable to load states.")); }, [assignedStateId]);

  useEffect(() => { const stateId = stateOptions.find((item) => item.name.en === state)?.id; if (!stateId) { setDistrictOptions([]); return; } apiClient.get<Array<LookupItem & { stateId: number }>>(endpoints.common.districts, { query: { stateId } }).then((items) => { setDistrictOptions(items); setDistrict((current) => items.find((item) => item.id === assignedDistrictId)?.name.en ?? items.find((item) => item.name.en === current)?.name.en ?? items[0]?.name.en ?? ""); }).catch(() => setError("Unable to load districts.")); }, [assignedDistrictId, state, stateOptions]);

  useEffect(() => { if (!filterStateId) { setFilterDistrictOptions([]); return; } apiClient.get<Array<LookupItem & { stateId: number }>>(endpoints.common.districts, { query: { stateId: filterStateId } }).then(setFilterDistrictOptions).catch(() => setError("Unable to load districts.")); }, [filterStateId]);

  const isFilterStateLocked = role === "ADMIN_STATE" || role === "ADMIN_DISTRICT";
  const isFilterDistrictLocked = role === "ADMIN_DISTRICT";
  const filterStates = isFilterStateLocked ? stateOptions.filter((item) => item.id === assignedStateId) : stateOptions;
  const filterDistricts = isFilterDistrictLocked ? filterDistrictOptions.filter((item) => item.id === assignedDistrictId) : filterDistrictOptions;
  const access = useMemo(() => accessFor(role), [role]);
  const districts = districtOptions.map((item) => item.name.en);
  const canSubmit = Boolean(name.trim() && /^\S+@\S+\.\S+$/.test(email) && mobile.replace(/\D/g, "").length === 10 && categories.length > 0);
  const pendingCount = juries.filter((jury) => jury.status === "Invitation pending").length;
  const closeForm = () => { setIsFormOpen(false); setSubmitted(false); };
  const toggleCategory = (category: string) => setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : current.length < 2 ? [...current, category] : current);
  const sortJuriesBy = (key: JurySortKey) => { setJuryPage(1); if (jurySortBy === key) { setJurySortDirection((current) => current === "asc" ? "desc" : "asc"); } else { setJurySortBy(key); setJurySortDirection("asc"); } };
  const resendInvitation = async (jury: Jury) => { if (!jury.id) return; setNotice(""); setResendingId(jury.id); try { await apiClient.post(endpoints.jury.resendInvitation(jury.id), { language: "en" }); setNotice(`A new verification invitation has been sent to ${jury.email}.`); } catch (requestError) { setNotice(requestError instanceof Error ? requestError.message : "Unable to resend the invitation."); } finally { setResendingId(null); } };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const stateId = stateOptions.find((item) => item.name.en === state)?.id;
    const districtId = districtOptions.find((item) => item.name.en === district && item.stateId === stateId)?.id;
    const categoryIds = categories.map((category) => lookups?.challengeCategories.find((item) => item.name.en === category)?.id).filter((id): id is number => Boolean(id));
    if (!stateId || categoryIds.length !== categories.length || (scope === "District" && !districtId)) { setError("The selected location or category is not available. Please refresh the form."); return; }
    setError(""); setIsSubmitting(true);
    try { await apiClient.post(endpoints.jury.adminProfiles, { fullName: name.trim(), email: email.trim(), mobile: mobile.trim(), scope, stateId, districtId: scope === "District" ? districtId : null, categoryIds }); setJuries((current) => [{ name: name.trim(), email: email.trim(), mobile: mobile.trim(), scope, location: scope === "District" ? `${district}, ${state}` : state, categories, status: "Invitation pending" }, ...current]); setSubmitted(true); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to create jury invitation."); } finally { setIsSubmitting(false); }
  };

  return <AdminShell eyebrow="Create and manage expert jury profiles" title="Jury Management">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Total Juries", String(juries.length), Users, "text-blue-600 bg-blue-50"], ["Active Profiles", String(juries.filter((jury) => jury.status === "Active").length), CheckCircle2, "text-emerald-600 bg-emerald-50"], ["Pending Verification", String(pendingCount), Mail, "text-amber-600 bg-amber-50"], ["Categories Covered", String(new Set(juries.flatMap((jury) => jury.categories)).size), Award, "text-violet-600 bg-violet-50"]].map(([label, value, Icon, colour]) => <div className="flex min-h-28 items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={label as string}><div className={`grid size-14 place-items-center rounded-full ${colour as string}`}><Icon size={26} /></div><div><p className="text-2xl font-black">{value as string}</p><p className="text-sm font-medium text-slate-600">{label as string}</p></div></div>)}
    </section>

    <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-3 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Users className="text-blue-600" size={22} />
          <div className="min-w-0">
            <h2 className="text-lg font-black">Jury Panel</h2>
            <p className="text-sm text-slate-500">Invite expert reviewers and assign up to two challenge categories.</p>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
          <div className="flex h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-80">
            <Search size={18} />
            <input
              aria-label="Search jury profiles"
              className="min-w-0 flex-1 bg-transparent font-medium text-slate-700 outline-none placeholder:text-slate-500"
              onChange={(event) => {
                setJuryPage(1);
                setJuryQuery(event.target.value);
              }}
              placeholder="Search by name, email or mobile"
              type="search"
              value={juryQuery}
            />
          </div>
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white sm:w-auto"
            onClick={() => setIsFormOpen(true)}
            type="button"
          >
            <Plus size={18} />
            Create Jury Profile
          </button>
        </div>
      </div>
      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 sm:p-5">
        <label className="grid gap-1.5 text-xs font-bold uppercase text-slate-500">State
          <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700 outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100" disabled={isFilterStateLocked} onChange={(event) => { setJuryPage(1); setFilterStateId(event.target.value); setFilterDistrictId(""); }} value={filterStateId}>
            <option value="">All states</option>
            {filterStates.map((item) => <option key={item.id} value={item.id}>{item.name.en}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-slate-500">District
          <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-700 outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100" disabled={isFilterDistrictLocked || !filterStateId} onChange={(event) => { setJuryPage(1); setFilterDistrictId(event.target.value); }} value={filterDistrictId}>
            <option value="">All districts</option>
            {filterDistricts.map((item) => <option key={item.id} value={item.id}>{item.name.en}</option>)}
          </select>
        </label>
      </div>
      {notice && <p className="bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800">{notice}</p>}
      <div className="hidden w-full min-w-0 overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[66rem] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr>
            <th className="w-12 px-3 py-3"><span className="sr-only">Show activity</span></th>
            {([['name', 'Full name'], ['jurisdiction', 'Jurisdiction'], ['category', 'Categories'], ['status', 'Status']] as [JurySortKey, string][]).map(([key, label]) => <th className="px-4 py-3" key={key}><button className="inline-flex items-center gap-1 font-bold uppercase text-slate-500" onClick={() => sortJuriesBy(key)} type="button">{label}{jurySortBy !== key ? <ChevronsUpDown size={15} /> : jurySortDirection === 'asc' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button></th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingJuries && <tr><td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={5}>Loading jury profiles...</td></tr>}
            {!isLoadingJuries && error && <tr><td className="px-4 py-8 text-center text-sm font-semibold text-rose-600" colSpan={5}>{error}</td></tr>}
            {!isLoadingJuries && !error && juries.map((jury) => <Fragment key={jury.email}><tr>
              <td className="px-3 py-3"><button aria-expanded={expandedJuries.has(jury.email)} aria-label={`${expandedJuries.has(jury.email) ? "Hide" : "Show"} activity for ${jury.name}`} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-700" onClick={() => toggleExpanded(jury.email)} type="button">{expandedJuries.has(jury.email) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button></td>
              <td className="px-4 py-3"><div className="flex min-w-[15rem] items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{jury.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="min-w-0">{jury.id ? <Link className="block truncate font-black text-blue-700 hover:text-blue-900 hover:underline" href={`/admin/juries/${jury.id}`}>{jury.name}</Link> : <span className="block truncate font-black text-slate-900">{jury.name}</span>}<p className="truncate text-xs text-slate-500">{jury.email} · {jury.mobile}</p></div></div></td>
              <td className="px-4 py-3 text-slate-700"><span className="inline-flex min-w-[12rem] items-center gap-1.5 font-semibold"><MapPin className="shrink-0 text-slate-400" size={15} />{jury.scope}: {jury.location}</span></td>
              <td className="px-4 py-3"><div className="flex min-w-[16rem] flex-wrap gap-1.5">{jury.categories.map((category) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600" key={category}>{category}</span>)}</div></td>
              <td className="px-4 py-3"><div className="grid justify-items-start gap-1.5"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${jury.status === "Active" ? "bg-emerald-50 text-emerald-700" : jury.status === "Inactive" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{jury.status}</span>{jury.status === "Invitation pending" && jury.id ? <button className="whitespace-nowrap text-left text-sm font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400" disabled={resendingId === jury.id} onClick={() => resendInvitation(jury)} type="button">{resendingId === jury.id ? "Resending…" : "Resend invitation"}</button> : null}</div></td>
            </tr>{expandedJuries.has(jury.email) && <tr className="bg-slate-50/60"><td className="px-4 py-4" colSpan={5}><JuryCounts jury={jury} /></td></tr>}</Fragment>)}
            {!isLoadingJuries && !error && juries.length === 0 && <tr><td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={5}>No jury profiles match your search.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {isLoadingJuries ? <p className="p-4 text-center text-sm font-semibold text-slate-500">Loading jury profiles...</p> : error ? <p className="p-4 text-center text-sm font-semibold text-rose-600">{error}</p> : juries.length === 0 ? <p className="p-4 text-center text-sm font-semibold text-slate-500">No jury profiles match your search.</p> : juries.map((jury) => <article className="grid min-w-0 gap-3 p-4" key={jury.email}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0">{jury.id ? <Link className="block truncate font-black text-blue-700 hover:underline" href={`/admin/juries/${jury.id}`}>{jury.name}</Link> : <p className="truncate font-black text-slate-900">{jury.name}</p>}<p className="truncate text-sm text-slate-500">{jury.email} · {jury.mobile}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${jury.status === "Active" ? "bg-emerald-50 text-emerald-700" : jury.status === "Inactive" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{jury.status}</span></div><dl className="grid gap-2 text-sm"><div><dt className="text-xs font-bold text-slate-500">Jurisdiction</dt><dd className="mt-1 flex items-center gap-1.5 font-semibold text-slate-700"><MapPin className="text-slate-400" size={15} />{jury.scope}: {jury.location}</dd></div><div><dt className="text-xs font-bold text-slate-500">Categories</dt><dd className="mt-1 flex flex-wrap gap-1.5">{jury.categories.map((category) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600" key={category}>{category}</span>)}</dd></div></dl>{jury.status === "Invitation pending" && jury.id && <button className="min-h-10 self-start text-left text-sm font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400" disabled={resendingId === jury.id} onClick={() => resendInvitation(jury)} type="button">{resendingId === jury.id ? "Resending…" : "Resend invitation"}</button>}<button aria-expanded={expandedJuries.has(jury.email)} className="inline-flex min-h-10 w-fit items-center gap-1.5 text-left text-sm font-bold text-blue-600 hover:text-blue-800" onClick={() => toggleExpanded(jury.email)} type="button">{expandedJuries.has(jury.email) ? <ChevronDown size={17} /> : <ChevronRight size={17} />}{expandedJuries.has(jury.email) ? "Hide activity" : "Show activity"}</button>{expandedJuries.has(jury.email) && <JuryCounts jury={jury} />}</article>)}
      </div>
      <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:p-4">
        <div className="font-semibold">
          Showing {juryTotal === 0 ? 0 : (juryPage - 1) * juryPageSize + 1}-{Math.min(juryPage * juryPageSize, juryTotal)} of {juryTotal}
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <label className="inline-flex items-center gap-2 font-semibold">
            Rows
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 font-bold text-slate-700 outline-none"
              onChange={(event) => {
                setJuryPage(1);
                setJuryPageSize(Number(event.target.value));
              }}
              value={juryPageSize}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <div className="font-semibold">Page {juryPage} of {juryTotalPages}</div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={juryPage <= 1}
              onClick={() => setJuryPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next page"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={juryPage >= juryTotalPages}
              onClick={() => setJuryPage((current) => Math.min(juryTotalPages, current + 1))}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>

    {isFormOpen && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 sm:p-8"><div className="mx-auto my-4 max-w-2xl rounded-xl bg-white shadow-2xl sm:my-10"><div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6"><div><h2 className="text-xl font-black">Create jury profile</h2><p className="mt-1 text-sm text-slate-500">A verification invitation will be sent to the jury&apos;s email address.</p></div><button aria-label="Close form" className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={closeForm} type="button"><X size={21} /></button></div>{submitted ? <div className="p-6 sm:p-8"><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><CheckCircle2 className="mb-3 text-emerald-600" size={30} /><h3 className="font-black">Jury invitation created</h3><p className="mt-1 text-sm leading-6">{name} has been added as a pending jury profile and the verification email has been requested.</p></div><button className="mt-6 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white" onClick={closeForm} type="button">Done</button></div> : <form className="grid gap-5 p-5 sm:p-6" onSubmit={submit}><div className="grid gap-5 sm:grid-cols-2"><Field label="Full name"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter full name" /></Field><Field label="Email address"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jury@example.org" /></Field><Field label="Mobile phone"><input required inputMode="numeric" maxLength={10} value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile number" /></Field><Field label="Jury level"><select value={scope} onChange={(event) => setScope(event.target.value as JuryScope)}>{access.scopes.map((item) => <option key={item}>{item}</option>)}</select></Field></div><div className="grid gap-5 sm:grid-cols-2"><Field label="State"><select disabled={Boolean(assignedStateId)} value={state} onChange={(event) => { setState(event.target.value); setDistrict(""); }}>{stateOptions.map((item) => <option key={item.id}>{item.name.en}</option>)}</select></Field><Field label="District"><select disabled={scope === "State" || Boolean(assignedDistrictId)} value={scope === "State" ? "" : district} onChange={(event) => setDistrict(event.target.value)}><option value="">Select district</option>{scope === "District" && districts.map((item) => <option key={item}>{item}</option>)}</select>{scope === "State" && <p className="mt-1 text-xs text-slate-500">Not required for a state-level jury.</p>}</Field></div><fieldset><legend className="text-sm font-bold text-slate-700">Challenge categories <span className="font-normal text-slate-500">(select up to 2)</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{(lookups?.challengeCategories.map((item) => item.name.en) ?? categoryOptions).map((category) => { const selected = categories.includes(category); const unavailable = !selected && categories.length === 2; return <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-semibold transition ${selected ? "border-blue-600 bg-blue-50 text-blue-800" : unavailable ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 text-slate-700 hover:border-blue-300"}`} key={category}><input checked={selected} className="size-4" disabled={unavailable} onChange={() => toggleCategory(category)} type="checkbox" />{category}</label>; })}</div></fieldset>{error && <p className="text-sm font-semibold text-red-700">{error}</p>}<div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button className="rounded-lg px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={closeForm} type="button">Cancel</button><button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300" disabled={!canSubmit || isSubmitting} type="submit"><Send size={16} /> Create & send invitation</button></div></form>}</div></div>}
  </AdminShell>;
}

function JuryCounts({ jury }: { jury: Jury }) {
  // A jury created in this session has no counts yet, so show its categories with zeros.
  const rows: CategoryCounts[] = jury.categoryCounts ?? jury.categories.map((name, index) => ({ categoryId: -index - 1, evaluatedCount: 0, name, onEvaluationCount: 0, recommendedCount: 0, rejectedCount: 0, reviewedCount: 0, totalCount: 0, viewedCount: 0 }));
  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr>
          <th className="px-4 py-3">Category name</th>
          {countColumns.map((column) => <th className="px-3 py-3 text-center" key={column.key}>{column.label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && <tr><td className="px-4 py-4 text-center text-sm font-semibold text-slate-500" colSpan={countColumns.length + 1}>No categories assigned.</td></tr>}
          {rows.map((row) => <tr key={row.categoryId}>
            <td className="px-4 py-3 font-black text-[#0b1f3a]">{row.name}</td>
            {countColumns.map((column) => <td className="px-3 py-3 text-center font-black text-[#0b1f3a]" key={column.key}>{row[column.key]}</td>)}
          </tr>)}
          {rows.length > 1 && <tr className="bg-slate-50">
            <td className="px-4 py-3 font-black text-slate-600">All categories</td>
            {countColumns.map((column) => <td className="px-3 py-3 text-center font-black text-slate-600" key={column.key}>{jury[column.key] ?? 0}</td>)}
          </tr>}
        </tbody>
      </table>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1.5 text-sm font-bold text-slate-700">{label}<span className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:px-3 [&_input]:py-2.5 [&_input]:font-normal [&_input]:outline-none [&_input]:focus:border-blue-600 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:font-normal [&_select]:outline-none [&_select]:focus:border-blue-600 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:bg-slate-100">{children}</span></label>; }
