"use client";

import {
  Building2,
  FileText,
  MapPinned,
  Tags,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type DashboardCountKey =
  | "bihar"
  | "jharkhand"
  | "junior"
  | "open"
  | "single"
  | "team"
  | "totalApplications"
  | "westBengal";

type DashboardCountCard = {
  count: number;
  detail: string;
  key: DashboardCountKey;
  label: string;
};

type DashboardCountsResponse = {
  cards: DashboardCountCard[];
};

type OrganisationTypeCountKey =
  | "juniorDiploma"
  | "juniorIti"
  | "juniorSchool"
  | "juniorUndergraduate"
  | "openCommunityGroup"
  | "openGraduate"
  | "openProfessional"
  | "openStartup";

type OrganisationTypeCountCard = {
  count: number;
  detail: "Organisation Type";
  key: OrganisationTypeCountKey;
  label: string;
};

type OrganisationTypeCountsResponse = {
  cards: OrganisationTypeCountCard[];
};

type ChallengeCategoryCountCard = {
  biharCount: number;
  count: number;
  detail: "Challenge Category";
  jharkhandCount: number;
  key: string;
  label: string;
  stateCounts?: {
    bihar: number;
    jharkhand: number;
    westBengal: number;
  };
  westBengalCount: number;
};

type ChallengeCategoryCountsResponse = {
  cards: ChallengeCategoryCountCard[];
};

const defaultCountCards: DashboardCountCard[] = [
  {
    count: 0,
    detail: "+0 this week",
    key: "totalApplications",
    label: "Total Applications",
  },
  {
    count: 0,
    detail: "State wise count",
    key: "bihar",
    label: "Bihar",
  },
  {
    count: 0,
    detail: "State wise count",
    key: "jharkhand",
    label: "Jharkhand",
  },
  {
    count: 0,
    detail: "State wise count",
    key: "westBengal",
    label: "West Bengal",
  },
  {
    count: 0,
    detail: "Participant Category",
    key: "junior",
    label: "Junior",
  },
  {
    count: 0,
    detail: "Participant Category",
    key: "open",
    label: "Open",
  },
  {
    count: 0,
    detail: "Participation Mode",
    key: "single",
    label: "Individual",
  },
  {
    count: 0,
    detail: "Participation Mode",
    key: "team",
    label: "Team",
  },
];

const countCardStyles = {
  bihar: {
    accent: "bg-orange-50 text-orange-600",
    icon: MapPinned,
  },
  jharkhand: {
    accent: "bg-emerald-50 text-emerald-600",
    icon: MapPinned,
  },
  junior: {
    accent: "bg-blue-50 text-blue-600",
    icon: Tags,
  },
  open: {
    accent: "bg-emerald-50 text-emerald-600",
    icon: Tags,
  },
  single: {
    accent: "bg-indigo-50 text-indigo-600",
    icon: User,
  },
  team: {
    accent: "bg-orange-50 text-orange-600",
    icon: Users,
  },
  totalApplications: {
    accent: "bg-blue-50 text-blue-600",
    icon: FileText,
  },
  westBengal: {
    accent: "bg-blue-50 text-blue-600",
    icon: MapPinned,
  },
} as const;

const topCountKeys: DashboardCountKey[] = [
  "totalApplications",
  "bihar",
  "jharkhand",
  "westBengal",
];

const participantCountKeys: DashboardCountKey[] = [
  "junior",
  "open",
  "single",
  "team",
];

const defaultOrganisationTypeCards: OrganisationTypeCountCard[] = [
  { count: 0, detail: "Organisation Type", key: "juniorSchool", label: "School" },
  { count: 0, detail: "Organisation Type", key: "juniorIti", label: "ITI" },
  { count: 0, detail: "Organisation Type", key: "juniorDiploma", label: "Diploma" },
  {
    count: 0,
    detail: "Organisation Type",
    key: "juniorUndergraduate",
    label: "Undergraduate",
  },
  { count: 0, detail: "Organisation Type", key: "openGraduate", label: "Graduate" },
  {
    count: 0,
    detail: "Organisation Type",
    key: "openProfessional",
    label: "Professional",
  },
  { count: 0, detail: "Organisation Type", key: "openStartup", label: "Startup" },
  {
    count: 0,
    detail: "Organisation Type",
    key: "openCommunityGroup",
    label: "Community Group",
  },
];

const defaultChallengeCategoryCards: ChallengeCategoryCountCard[] = [
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory1",
    label: "Village & Panchayat Innovation",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory2",
    label: "Agriculture & Allied Sectors",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory3",
    label: "Education & Skill Development",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory4",
    label: "Healthcare",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory5",
    label: "Urban & Civic Innovation",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory6",
    label: "Environment & Sustainability",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory7",
    label: "Employment, Livelihood & MSMEs",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory8",
    label: "Women & Child Development",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory9",
    label: "Disaster Management & Community Safety",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory10",
    label: "Transport & Mobility",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory11",
    label: "Energy",
    westBengalCount: 0,
  },
  {
    biharCount: 0,
    count: 0,
    detail: "Challenge Category",
    jharkhandCount: 0,
    key: "challengeCategory12",
    label: "Tourism & Cultural Innovation",
    westBengalCount: 0,
  },
];

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
    <div className="flex min-h-28 items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${accent}`}>
        <Icon size={27} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black">{value}</p>
        <p className="truncate text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [countCards, setCountCards] =
    useState<DashboardCountCard[]>(defaultCountCards);
  const [organisationTypeCards, setOrganisationTypeCards] = useState<
    OrganisationTypeCountCard[]
  >(defaultOrganisationTypeCards);
  const [challengeCategoryCards, setChallengeCategoryCards] = useState<
    ChallengeCategoryCountCard[]
  >(defaultChallengeCategoryCards);
  const countCardMap = new Map(countCards.map((card) => [card.key, card]));
  const topCountCards = topCountKeys.map(
    (key) => countCardMap.get(key) ?? defaultCountCards.find((card) => card.key === key),
  );
  const participantCountCards = participantCountKeys.map(
    (key) => countCardMap.get(key) ?? defaultCountCards.find((card) => card.key === key),
  );

  useEffect(() => {
    let isMounted = true;

    void Promise.allSettled([
      apiClient.get<DashboardCountsResponse>(endpoints.admin.dashboardCounts),
      apiClient.get<OrganisationTypeCountsResponse>(
        endpoints.admin.dashboardOrganisationTypeCounts,
      ),
      apiClient.get<ChallengeCategoryCountsResponse>(
        endpoints.admin.dashboardChallengeCategoryCounts,
      ),
    ]).then(([dashboardCounts, organisationTypeCounts, challengeCategoryCounts]) => {
      if (!isMounted) return;

      if (
        dashboardCounts.status === "fulfilled" &&
        dashboardCounts.value.cards.length
      ) {
        setCountCards(dashboardCounts.value.cards);
      } else {
        setCountCards(defaultCountCards);
      }

      if (
        organisationTypeCounts.status === "fulfilled" &&
        organisationTypeCounts.value.cards.length
      ) {
        setOrganisationTypeCards(organisationTypeCounts.value.cards);
      } else {
        setOrganisationTypeCards(defaultOrganisationTypeCards);
      }

      if (
        challengeCategoryCounts.status === "fulfilled" &&
        challengeCategoryCounts.value.cards.length
      ) {
        setChallengeCategoryCards(challengeCategoryCounts.value.cards);
      } else {
        setChallengeCategoryCards(defaultChallengeCategoryCards);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminShell
      eyebrow="Programme overview, review queues and operational status"
      title="Dashboards"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {topCountCards.map((card) => {
          if (!card) return null;
          const style = countCardStyles[card.key];

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {participantCountCards.map((card) => {
          if (!card) return null;
          const style = countCardStyles[card.key];

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

      <section>
        <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">
          Organisation Type wise
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {organisationTypeCards.map((card) => (
            <MetricCard
              accent="bg-slate-100 text-slate-700"
              detail={card.detail}
              icon={Building2}
              key={card.key}
              label={card.label}
              value={String(card.count)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">
          Challenge Category wise count
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-4">Category Name</th>
                  <th className="px-5 py-4 text-center">Count of Bihar</th>
                  <th className="px-5 py-4 text-center">Count of Jharkhand</th>
                  <th className="px-5 py-4 text-center">Count of West Bengal</th>
                  <th className="px-5 py-4 text-center">Total Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {challengeCategoryCards.map((card) => (
                  <tr key={card.key} className="text-slate-700">
                    <td className="px-5 py-4 font-semibold text-[#0b1f3a]">
                      {card.label}
                    </td>
                    <td className="px-5 py-4 text-center font-bold">
                      {card.stateCounts?.bihar ?? card.biharCount}
                    </td>
                    <td className="px-5 py-4 text-center font-bold">
                      {card.stateCounts?.jharkhand ?? card.jharkhandCount}
                    </td>
                    <td className="px-5 py-4 text-center font-bold">
                      {card.stateCounts?.westBengal ?? card.westBengalCount}
                    </td>
                    <td className="px-5 py-4 text-center font-black text-[#0b1f3a]">
                      {card.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
