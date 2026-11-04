"use client";

import { useEffect, useState } from "react";
import { PageHero } from "@/components/public/common/page-hero";
import { getSiteContent } from "@/content";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type NameMap = { en: string; bn: string; hi: string };
type State = { id: number; name: NameMap; isRegistrationEnabled: boolean };
type District = { id: number; name: NameMap; stateId: number };
type InstituteStatRow = {
  state_name: string;
  district_name: string;
  institute_name: string;
  count: number;
};

function localeName(name: NameMap, locale: string): string {
  if (locale === "bn") return name.bn || name.en;
  if (locale === "hi") return name.hi || name.en;
  return name.en;
}

export function InstituteStatsPage({ locale }: { locale: string }) {
  const content = getSiteContent(locale).pages.instituteStats;

  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [instituteNames, setInstituteNames] = useState<string[]>([]);
  const [results, setResults] = useState<InstituteStatRow[] | null>(null);

  const [selectedStateId, setSelectedStateId] = useState<number | "">("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | "all">("all");
  const [selectedInstitute, setSelectedInstitute] = useState<string | "all">("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<State[]>(endpoints.common.states)
      .then((data) => {
        const filtered = (data ?? []).filter((s) =>
          ["Bihar", "Jharkhand", "West Bengal"].includes(s.name.en),
        );
        setStates(filtered);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedStateId === "") {
      setDistricts([]);
      setSelectedDistrictId("all");
      setInstituteNames([]);
      setSelectedInstitute("all");
      return;
    }

    apiClient
      .get<District[]>(endpoints.common.districts, {
        query: { stateId: selectedStateId },
      })
      .then((data) => {
        setDistricts(data ?? []);
        setSelectedDistrictId("all");
      })
      .catch(() => {});
  }, [selectedStateId]);

  useEffect(() => {
    if (selectedStateId === "") {
      setInstituteNames([]);
      setSelectedInstitute("all");
      return;
    }

    const query: Record<string, string | number> = { stateId: selectedStateId };
    if (selectedDistrictId !== "all") query.districtId = selectedDistrictId;

    apiClient
      .get<string[]>(endpoints.common.instituteNames, { query })
      .then((data) => {
        setInstituteNames(data ?? []);
        setSelectedInstitute("all");
      })
      .catch(() => {});
  }, [selectedStateId, selectedDistrictId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const query: Record<string, string | number> = {};
    if (selectedStateId !== "") query.stateId = selectedStateId;
    if (selectedDistrictId !== "all") query.districtId = selectedDistrictId;
    if (selectedInstitute !== "all") query.instituteName = selectedInstitute;

    try {
      const data = await apiClient.get<InstituteStatRow[]>(
        endpoints.common.instituteStats,
        { query },
      );
      setResults(data ?? []);
    } catch {
      setError(content.error);
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#000080] focus:outline-none focus:ring-2 focus:ring-[#000080]/20 disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <>
      <PageHero
        title={content.title}
        description={content.description}
        locale={locale}
      />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {content.state} <span className="text-red-500">*</span>
              </label>
              <select
                className={selectClass}
                value={selectedStateId}
                onChange={(e) =>
                  setSelectedStateId(e.target.value ? Number(e.target.value) : "")
                }
                required
              >
                <option value="">{content.selectState}</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {localeName(s.name, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {content.district}
              </label>
              <select
                className={selectClass}
                value={selectedDistrictId}
                onChange={(e) =>
                  setSelectedDistrictId(
                    e.target.value === "all" ? "all" : Number(e.target.value),
                  )
                }
                disabled={selectedStateId === ""}
              >
                <option value="all">{content.all}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {localeName(d.name, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {content.institute}
              </label>
              <select
                className={selectClass}
                value={selectedInstitute}
                onChange={(e) => setSelectedInstitute(e.target.value)}
                disabled={selectedStateId === ""}
              >
                <option value="all">{content.all}</option>
                {instituteNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={selectedStateId === "" || loading}
              className="rounded-full bg-[#ff9933] px-6 py-2.5 text-sm font-extrabold text-[#071426] transition hover:bg-[#f08a24] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? content.loading : content.submit}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {results !== null && (
          <div className="mt-8">
            {results.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                {content.noResults}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-[#0b1f3a] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold tracking-wide">
                        {content.slCol}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold tracking-wide">
                        {content.stateCol}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold tracking-wide">
                        {content.districtCol}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold tracking-wide">
                        {content.instituteCol}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold tracking-wide">
                        {content.countCol}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {results.map((row, idx) => (
                      <tr
                        key={`${row.state_name}-${row.district_name}-${row.institute_name}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {row.state_name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.district_name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.institute_name}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#000080]">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right text-sm font-bold text-slate-700"
                      >
                        {content.total}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-[#000080]">
                        {results.reduce((sum, r) => sum + r.count, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
