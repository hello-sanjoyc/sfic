"use client";

import {
    Building2,
    ChevronDown,
    ChevronUp,
    Cpu,
    FileText,
    Folder,
    HardDrive,
    MapPinned,
    MemoryStick,
    Server,
    Tags,
    User,
    Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/common/admin-shell";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type DashboardCountKey =
    | "bihar"
    | "districtApplications"
    | "jharkhand"
    | "junior"
    | "open"
    | "stateApplications"
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
    | "openGovernmentFunded"
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
    districtCount?: number;
    jharkhandCount: number;
    key: string;
    label: string;
    regionCount?: number;
    stateCount?: number;
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

type DashboardDistrictCountRow = {
    count: number;
    districtId: number;
    districtName: string;
    evaluated: number;
    onEvaluation: number;
    recommended: number;
    rejected: number;
    reviewed: number;
    stateId: number;
    stateName: string;
    viewed: number;
};

type DashboardDistrictCountsResponse = {
    rows: DashboardDistrictCountRow[];
};

type RegionState = {
    id: number;
    name: string;
};

type JuryCategoryEvaluationCounts = {
    evaluated: number;
    onEvaluation: number;
    recommended: number;
    rejected: number;
    reviewed: number;
    total: number;
    viewed: number;
};

type JuryCategoryEvaluationResponse = {
    categoryLabel: string;
    counts: JuryCategoryEvaluationCounts;
    stateLabel: string;
};

type AdminSession = {
    actor?: string;
    admin?: {
        role?: string;
    };
};

type AdminServerHealthResponse = {
    success: true;
    timestamp: string;
    server: {
        hostname: string;
        osName?: string;
        osVersion?: string;
        platform: string;
        architecture: string;
        release: string;
        uptimeSeconds: number;
    };
    cpu: {
        cores: number;
        usagePercent: number;
        loadAverage: number[];
    };
    memory: {
        totalGB: number;
        usedGB: number;
        freeGB: number;
        usagePercent: number;
    };
    disk: {
        path: string;
        totalGB: number;
        usedGB: number;
        freeGB: number;
        availableGB: number;
        usagePercent: number;
    };
    uploads: {
        path: string;
        sizeBytes?: number;
        sizeGB: number;
        fileCount: number;
    };
};

const dashboardRefreshMs = 60_000;

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
    districtApplications: {
        accent: "bg-emerald-50 text-emerald-600",
        icon: MapPinned,
    },
    stateApplications: {
        accent: "bg-orange-50 text-orange-600",
        icon: MapPinned,
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

const districtTopCountKeys: DashboardCountKey[] = [
    "totalApplications",
    "stateApplications",
    "districtApplications",
];

const defaultOrganisationTypeCards: OrganisationTypeCountCard[] = [
    {
        count: 0,
        detail: "Organisation Type",
        key: "juniorSchool",
        label: "School",
    },
    { count: 0, detail: "Organisation Type", key: "juniorIti", label: "ITI" },
    {
        count: 0,
        detail: "Organisation Type",
        key: "juniorDiploma",
        label: "Diploma",
    },
    {
        count: 0,
        detail: "Organisation Type",
        key: "juniorUndergraduate",
        label: "Undergraduate",
    },
    {
        count: 0,
        detail: "Organisation Type",
        key: "openGraduate",
        label: "Graduate",
    },
    {
        count: 0,
        detail: "Organisation Type",
        key: "openGovernmentFunded",
        label: "Government / Government Funded",
    },
    {
        count: 0,
        detail: "Organisation Type",
        key: "openProfessional",
        label: "Professional",
    },
    {
        count: 0,
        detail: "Organisation Type",
        key: "openStartup",
        label: "Startup",
    },
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
        <div className="flex min-h-24 w-full min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:min-h-28 sm:gap-5 sm:p-5">
            <div
                className={`grid size-11 shrink-0 place-items-center rounded-full sm:size-14 ${accent}`}
            >
                <Icon className="size-5 sm:size-7" />
            </div>
            <div className="min-w-0">
                <p className="break-words text-xl font-black leading-tight sm:text-2xl">
                    {value}
                </p>
                <p className="break-words text-sm font-medium leading-snug text-slate-600">
                    {label}
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                    {detail}
                </p>
            </div>
        </div>
    );
}

function parseAdminRole() {
    if (typeof window === "undefined") return "";

    try {
        const session = JSON.parse(
            localStorage.getItem(AUTH_STORAGE_KEY) ?? "null",
        ) as AdminSession | null;
        return session?.actor === "admin" ? (session.admin?.role ?? "") : "";
    } catch {
        return "";
    }
}

function normalizeAdminRole(role: string) {
    return role
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
}

function formatPercent(value?: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "--";
    return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatGB(value?: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "--";
    return value.toFixed(2).replace(/\.00$/, "");
}

function formatDiskSizeFromGB(value?: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "--";

    if (value >= 1024) {
        return `${(value / 1024).toFixed(2).replace(/\.00$/, "")} TB`;
    }

    return `${formatGB(value)} GB`;
}

function formatStorageSize(bytes?: number, fallbackGB?: number) {
    if (typeof bytes !== "number" || !Number.isFinite(bytes)) {
        if (typeof fallbackGB !== "number" || !Number.isFinite(fallbackGB))
            return "--";
        bytes = fallbackGB * 1024 * 1024 * 1024;
    }

    if (bytes >= 1024 * 1024 * 1024) {
        return formatDiskSizeFromGB(bytes / 1024 / 1024 / 1024);
    }

    if (bytes >= 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(2).replace(/\.00$/, "")} MB`;
    }

    return `${(bytes / 1024).toFixed(2).replace(/\.00$/, "")} KB`;
}

function formatUptime(seconds?: number) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "--";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
    if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

function formatHealthTimestamp(value?: string) {
    if (!value) return "--";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        second: "2-digit",
        year: "numeric",
    });
}

function DashboardRefreshBar({ progress }: { progress: number }) {
    return (
        <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <span>Dashboard auto refresh</span>
                <span>{Math.round(Math.min(Math.max(progress, 0), 100))}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-1000 ease-linear"
                    style={{
                        width: `${Math.min(Math.max(progress, 0), 100)}%`,
                    }}
                />
            </div>
        </div>
    );
}

function usageTone(usage: number) {
    if (usage > 80) {
        return {
            bar: "bg-red-500",
            text: "text-red-600",
        };
    }

    if (usage >= 60) {
        return {
            bar: "bg-amber-500",
            text: "text-amber-600",
        };
    }

    return {
        bar: "bg-emerald-500",
        text: "text-emerald-600",
    };
}

function usageStatus(usage: number) {
    if (usage > 80) return "High usage";
    if (usage >= 60) return "Moderate usage";
    return "Low usage";
}

function ServerHealthCard({
    health,
}: {
    health: AdminServerHealthResponse | null;
}) {
    const systemCards = [
        {
            accent: "bg-emerald-100 text-emerald-600",
            detail: health ? `${health.cpu.cores} cores` : "-- cores",
            icon: Cpu,
            label: "CPU Usage",
            progress: health?.cpu.usagePercent ?? 0,
            subdetail: usageStatus(health?.cpu.usagePercent ?? 0),
            value: formatPercent(health?.cpu.usagePercent),
        },
        {
            accent: "bg-sky-100 text-sky-600",
            detail: health
                ? `${formatDiskSizeFromGB(health.memory.totalGB)} total`
                : "-- total",
            icon: MemoryStick,
            label: "RAM Usage",
            progress: health?.memory.usagePercent ?? 0,
            subdetail: health
                ? `${formatDiskSizeFromGB(health.memory.usedGB)} of ${formatDiskSizeFromGB(health.memory.totalGB)} used`
                : "-- of -- used",
            value: formatPercent(health?.memory.usagePercent),
        },
        {
            accent: "bg-violet-100 text-violet-600",
            detail: health
                ? `${formatDiskSizeFromGB(health.disk.totalGB)} total`
                : "-- total",
            icon: HardDrive,
            label: "Disk Usage",
            progress: health?.disk.usagePercent ?? 0,
            subdetail: health
                ? `${formatDiskSizeFromGB(health.disk.usedGB)} of ${formatDiskSizeFromGB(health.disk.totalGB)} used`
                : "-- of -- used",
            value: formatPercent(health?.disk.usagePercent),
        },
    ];
    const serverLabel = health
        ? `${health.server.osName || health.server.platform} ${health.server.osVersion || health.server.release}`
        : "Server health";

    return (
        <section className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                        <Server size={25} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="break-words text-lg font-black tracking-normal text-[#0b1f3a] sm:text-xl">
                            System Usage
                        </h2>
                        <p className="mt-1 text-sm font-semibold leading-snug text-slate-500">
                            CPU, memory, storage and uploads overview
                        </p>
                    </div>
                </div>
                <div className="min-w-0 break-words text-left text-xs font-semibold text-slate-500 md:max-w-[40%] md:text-right">
                    <p>{serverLabel}</p>
                    <p>{formatHealthTimestamp(health?.timestamp)}</p>
                </div>
            </div>

            <div className="mt-6 grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3 sm:gap-4">
                {systemCards.map((card) => {
                    const Icon = card.icon;
                    const tone = usageTone(card.progress);

                    return (
                        <div
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
                            key={card.label}
                        >
                            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                                <div
                                    className={`grid size-11 shrink-0 place-items-center rounded-full ${card.accent}`}
                                >
                                    <Icon size={23} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="break-words text-sm font-black text-[#0b1f3a]">
                                        {card.label}
                                    </p>
                                    <p className="mt-1 break-words text-xs font-semibold text-slate-500">
                                        {card.detail}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-6 break-words text-2xl font-black leading-none text-[#071a33] sm:mt-7 sm:text-3xl">
                                {card.value}
                            </p>
                            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full rounded-full ${tone.bar}`}
                                    style={{
                                        width: `${Math.min(Math.max(card.progress, 0), 100)}%`,
                                    }}
                                />
                            </div>
                            <p
                                className={`mt-5 break-words text-sm font-semibold ${card.label === "CPU Usage" ? tone.text : "text-slate-500"}`}
                            >
                                {card.subdetail}
                            </p>
                        </div>
                    );
                })}

                <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
                            <Folder size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-[#0b1f3a]">
                                Uploads
                            </p>
                            <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                                {health?.uploads.path ?? "uploads"}
                            </p>
                        </div>
                    </div>

                    <p className="mt-6 break-words text-2xl font-black leading-none text-[#071a33] sm:mt-7 sm:text-3xl">
                        {formatStorageSize(
                            health?.uploads.sizeBytes,
                            health?.uploads.sizeGB,
                        )}
                    </p>
                    <div className="mt-6 border-t border-slate-200 pt-5">
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-500">
                                <FileText size={18} />
                            </div>
                            <p className="min-w-0 break-words text-sm font-black text-[#0b1f3a]">
                                {(
                                    health?.uploads.fileCount ?? 0
                                ).toLocaleString("en-IN")}{" "}
                                files
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <p className="mt-4 break-words text-sm font-semibold text-slate-500">
                Uptime: {formatUptime(health?.server.uptimeSeconds)}
            </p>
        </section>
    );
}

export function AdminDashboardPage() {
    const [adminRole, setAdminRole] = useState("");
    const [countCards, setCountCards] =
        useState<DashboardCountCard[]>(defaultCountCards);
    const [organisationTypeCards, setOrganisationTypeCards] = useState<
        OrganisationTypeCountCard[]
    >(defaultOrganisationTypeCards);
    const [challengeCategoryCards, setChallengeCategoryCards] = useState<
        ChallengeCategoryCountCard[]
    >(defaultChallengeCategoryCards);
    const [districtCountRows, setDistrictCountRows] = useState<
        DashboardDistrictCountRow[]
    >([]);
    const [regionStates, setRegionStates] = useState<RegionState[]>([]);
    const [selectedRegionStateId, setSelectedRegionStateId] = useState<
        number | null
    >(null);
    const [juryModal, setJuryModal] = useState<{
        categoryKey: string;
        stateId: number;
        stateLabel: string;
        categoryLabel: string;
        data: JuryCategoryEvaluationCounts | null;
        loading: boolean;
    } | null>(null);
    const [districtSort, setDistrictSort] = useState<{
        col: "districtName" | "count" | "viewed" | "onEvaluation" | "evaluated" | "recommended" | "reviewed" | "rejected";
        dir: "asc" | "desc";
    }>({ col: "districtName", dir: "asc" });
    const [ccSort, setCcSort] = useState<{
        col: "label" | "regionCount" | "stateCount";
        dir: "asc" | "desc";
    }>({ col: "label", dir: "asc" });
    const [serverHealth, setServerHealth] =
        useState<AdminServerHealthResponse | null>(null);
    const [dashboardRefreshProgress, setDashboardRefreshProgress] = useState(0);
    const dashboardRefreshStartedAtRef = useRef<number | null>(null);
    const countCardMap = new Map(countCards.map((card) => [card.key, card]));
    const visibleTopCountKeys =
        adminRole === "ADMIN_DISTRICT" ? districtTopCountKeys : topCountKeys;
    const isSuperAdmin = normalizeAdminRole(adminRole) === "SUPERADMIN";
    const topCountCards = visibleTopCountKeys.map(
        (key) =>
            countCardMap.get(key) ??
            defaultCountCards.find((card) => card.key === key),
    );
    const participantCountCards = participantCountKeys.map(
        (key) =>
            countCardMap.get(key) ??
            defaultCountCards.find((card) => card.key === key),
    );

    const isRegionAdmin = normalizeAdminRole(adminRole) === "ADMIN_REGION";
    const isStateAdmin = normalizeAdminRole(adminRole) === "ADMIN_STATE";

    const stateAdminStateId = districtCountRows[0]?.stateId ?? null;
    const stateAdminStateName = districtCountRows[0]?.stateName ?? "";
    const districtAdminDistrictId = normalizeAdminRole(adminRole) === "ADMIN_DISTRICT" ? (districtCountRows[0]?.districtId ?? null) : null;
    const districtAdminDistrictName = districtCountRows[0]?.districtName ?? "";

    const needsStateFilter = isRegionAdmin || isSuperAdmin;

    const filteredDistrictRows =
        needsStateFilter && selectedRegionStateId
            ? districtCountRows.filter(
                  (r) => r.stateId === selectedRegionStateId,
              )
            : districtCountRows;

    const sortedDistrictRows = [...filteredDistrictRows].sort((a, b) => {
        const mul = districtSort.dir === "asc" ? 1 : -1;
        const col = districtSort.col;
        if (col === "districtName") return mul * a.districtName.localeCompare(b.districtName);
        if (col === "count") return mul * (a.count - b.count);
        if (col === "viewed") return mul * (a.viewed - b.viewed);
        if (col === "onEvaluation") return mul * (a.onEvaluation - b.onEvaluation);
        if (col === "evaluated") return mul * (a.evaluated - b.evaluated);
        if (col === "recommended") return mul * (a.recommended - b.recommended);
        if (col === "reviewed") return mul * (a.reviewed - b.reviewed);
        if (col === "rejected") return mul * (a.rejected - b.rejected);
        return 0;
    });

    const sortedCcCards = [...challengeCategoryCards].sort((a, b) => {
        const mul = ccSort.dir === "asc" ? 1 : -1;
        if (ccSort.col === "regionCount")
            return (
                mul *
                ((a.regionCount ?? a.count ?? 0) -
                    (b.regionCount ?? b.count ?? 0))
            );
        if (ccSort.col === "stateCount")
            return mul * ((a.stateCount ?? 0) - (b.stateCount ?? 0));
        return mul * a.label.localeCompare(b.label);
    });

    const toggleDistrictSort = (col: typeof districtSort.col) => {
        setDistrictSort((prev) =>
            prev.col === col
                ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { col, dir: "asc" },
        );
    };

    const toggleCcSort = (col: typeof ccSort.col) => {
        setCcSort((prev) =>
            prev.col === col
                ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { col, dir: "asc" },
        );
    };

    const openJuryModal = (
        stateId: number,
        stateLabel: string,
        categoryKey: string,
        categoryLabel: string,
        districtId?: number,
    ) => {
        setJuryModal({
            categoryKey,
            stateId,
            stateLabel,
            categoryLabel,
            data: null,
            loading: true,
        });
        const url = `${endpoints.admin.dashboardJuryCategoryEvaluation}?stateId=${stateId}&categoryKey=${categoryKey}${districtId ? `&districtId=${districtId}` : ""}`;
        void apiClient
            .get<JuryCategoryEvaluationResponse>(url)
            .then((res) => {
                setJuryModal((prev) =>
                    prev &&
                    prev.stateId === stateId &&
                    prev.categoryKey === categoryKey
                        ? { ...prev, data: res.counts, loading: false }
                        : prev,
                );
            })
            .catch(() => {
                setJuryModal((prev) =>
                    prev ? { ...prev, data: null, loading: false } : prev,
                );
            });
    };

    useEffect(() => {
        let isMounted = true;
        const role = parseAdminRole();
        const isSuperAdminSession = normalizeAdminRole(role) === "SUPERADMIN";
        const isRegionAdminSession =
            normalizeAdminRole(role) === "ADMIN_REGION";
        setAdminRole(role);

        if (isRegionAdminSession || isSuperAdminSession) {
            void apiClient
                .get<{ id: number; name: { en: string } }[]>(
                    endpoints.common.states,
                )
                .then((res) => {
                    const regionNames = new Set([
                        "bihar",
                        "jharkhand",
                        "west bengal",
                    ]);
                    const all = Array.isArray(res) ? res : [];
                    const filtered = all
                        .filter((s) =>
                            regionNames.has(
                                (s.name?.en ?? "").toLowerCase().trim(),
                            ),
                        )
                        .map((s) => ({ id: s.id, name: s.name.en }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    setRegionStates(filtered);
                    if (isRegionAdminSession && filtered.length > 0)
                        setSelectedRegionStateId(filtered[0].id);
                })
                .catch(() => {});
        }

        const fetchDashboardData = async () => {
            dashboardRefreshStartedAtRef.current = Date.now();
            setDashboardRefreshProgress(0);

            const [
                dashboardCounts,
                districtCounts,
                organisationTypeCounts,
                challengeCategoryCounts,
                health,
            ] = await Promise.allSettled([
                apiClient.get<DashboardCountsResponse>(
                    endpoints.admin.dashboardCounts,
                ),
                apiClient.get<DashboardDistrictCountsResponse>(
                    endpoints.admin.dashboardDistrictCounts,
                ),
                apiClient.get<OrganisationTypeCountsResponse>(
                    endpoints.admin.dashboardOrganisationTypeCounts,
                ),
                apiClient.get<ChallengeCategoryCountsResponse>(
                    endpoints.admin.dashboardChallengeCategoryCounts,
                ),
                isSuperAdminSession
                    ? apiClient.get<AdminServerHealthResponse>(
                          endpoints.admin.serverHealth,
                      )
                    : Promise.resolve(null),
            ]);

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
                districtCounts.status === "fulfilled" &&
                districtCounts.value.rows.length
            ) {
                setDistrictCountRows(districtCounts.value.rows);
            } else {
                setDistrictCountRows([]);
            }

            const returnedOrganisationTypes =
                organisationTypeCounts.status === "fulfilled"
                    ? new Map(
                          organisationTypeCounts.value.cards.map((card) => [
                              card.key,
                              card,
                          ]),
                      )
                    : new Map<
                          OrganisationTypeCountKey,
                          OrganisationTypeCountCard
                      >();
            setOrganisationTypeCards(
                defaultOrganisationTypeCards.map(
                    (card) => returnedOrganisationTypes.get(card.key) ?? card,
                ),
            );

            if (
                challengeCategoryCounts.status === "fulfilled" &&
                challengeCategoryCounts.value.cards.length
            ) {
                setChallengeCategoryCards(challengeCategoryCounts.value.cards);
            } else {
                setChallengeCategoryCards(defaultChallengeCategoryCards);
            }

            if (health.status === "fulfilled" && health.value) {
                setServerHealth(health.value);
            } else {
                setServerHealth(null);
            }
        };

        void fetchDashboardData();

        const dashboardRefreshInterval = window.setInterval(() => {
            void fetchDashboardData();
        }, dashboardRefreshMs);
        const dashboardProgressInterval = window.setInterval(() => {
            const startedAt = dashboardRefreshStartedAtRef.current;
            if (!startedAt) return;

            const elapsed = Date.now() - startedAt;
            const next = (elapsed / dashboardRefreshMs) * 100;
            setDashboardRefreshProgress(next >= 100 ? 100 : next);
        }, 1000);

        return () => {
            isMounted = false;
            window.clearInterval(dashboardRefreshInterval);
            window.clearInterval(dashboardProgressInterval);
        };
    }, []);

    return (
        <AdminShell
            eyebrow="Programme overview, review queues and operational status"
            title="Dashboards"
        >
            <DashboardRefreshBar progress={dashboardRefreshProgress} />

            <section className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3 sm:gap-4">
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

            <section className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3 sm:gap-4">
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

            <section className="w-full min-w-0">
                <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">
                    Organisation Type wise
                </h2>
                <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 sm:gap-4">
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

            {(adminRole === "ADMIN_STATE" ||
                adminRole === "ADMIN_DISTRICT" ||
                isRegionAdmin ||
                isSuperAdmin) &&
                (needsStateFilter
                    ? true
                    : districtCountRows.length > 0) && (
                    <section className="w-full min-w-0">
                        <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">
                            District wise count
                        </h2>
                        {needsStateFilter && regionStates.length > 0 && (
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <span className="text-sm font-black text-[#0b1f3a]">
                                    Select State:
                                </span>
                                {regionStates.map((s) => (
                                    <button
                                        key={s.id}
                                        className={`inline-flex h-9 items-center rounded-lg border px-4 text-sm font-bold transition-colors ${
                                            selectedRegionStateId === s.id
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-slate-200 bg-white text-[#0b1f3a] hover:border-blue-300"
                                        }`}
                                        onClick={() => setSelectedRegionStateId(s.id)}
                                        type="button"
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {needsStateFilter && selectedRegionStateId === null && (
                            <p className="text-sm font-semibold text-slate-400">
                                Select a state to view district counts.
                            </p>
                        )}
                        {(!needsStateFilter || (selectedRegionStateId !== null && sortedDistrictRows.length > 0)) && <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-black tracking-wide text-slate-600">
                                        <tr>
                                            <th className="px-5 py-4">State</th>
                                            {(
                                                [
                                                    { col: "districtName", label: "District", center: false },
                                                    { col: "count", label: "Count", center: true },
                                                    { col: "viewed", label: "Viewed", center: true },
                                                    { col: "onEvaluation", label: "On Evaluation", center: true },
                                                    { col: "evaluated", label: "Evaluated", center: true },
                                                    { col: "recommended", label: "Recommended", center: true },
                                                    { col: "reviewed", label: "Reviewed", center: true },
                                                    { col: "rejected", label: "Rejected", center: true },
                                                ] as const
                                            ).map(({ col, label, center }) => (
                                                <th key={col} className={`px-5 py-4${center ? " text-center" : ""}`}>
                                                    <button
                                                        className={`inline-flex items-center gap-1 hover:text-[#0b1f3a]${center ? " justify-center w-full" : ""}`}
                                                        onClick={() => toggleDistrictSort(col)}
                                                        type="button"
                                                    >
                                                        {label}
                                                        {districtSort.col === col ? (
                                                            districtSort.dir === "asc" ? (
                                                                <ChevronUp size={13} />
                                                            ) : (
                                                                <ChevronDown size={13} />
                                                            )
                                                        ) : (
                                                            <ChevronUp size={13} className="opacity-30" />
                                                        )}
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {sortedDistrictRows.map((row) => (
                                            <tr
                                                key={row.districtId}
                                                className="text-slate-700"
                                            >
                                                <td className="px-5 py-4 font-semibold text-[#0b1f3a]">
                                                    {row.stateName}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {row.districtName}
                                                </td>
                                                <td className="px-5 py-4 text-center font-black text-[#0b1f3a]">
                                                    {row.count}
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold">
                                                    {row.viewed}
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold">
                                                    {row.onEvaluation}
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold">
                                                    {row.evaluated}
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold">
                                                    {row.recommended}
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold">
                                                    {row.reviewed}
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold">
                                                    {row.rejected}
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedDistrictRows.length > 0 && (() => {
                                            const totals = sortedDistrictRows.reduce(
                                                (acc, row) => ({
                                                    count: acc.count + row.count,
                                                    viewed: acc.viewed + row.viewed,
                                                    onEvaluation: acc.onEvaluation + row.onEvaluation,
                                                    evaluated: acc.evaluated + row.evaluated,
                                                    recommended: acc.recommended + row.recommended,
                                                    reviewed: acc.reviewed + row.reviewed,
                                                    rejected: acc.rejected + row.rejected,
                                                }),
                                                { count: 0, viewed: 0, onEvaluation: 0, evaluated: 0, recommended: 0, reviewed: 0, rejected: 0 },
                                            );
                                            return (
                                                <tr className="border-t-2 border-slate-400 bg-slate-50 font-black text-[#0b1f3a]">
                                                    <td className="px-5 py-4" colSpan={2}>
                                                        Total
                                                    </td>
                                                    <td className="px-5 py-4 text-center">{totals.count}</td>
                                                    <td className="px-5 py-4 text-center">{totals.viewed}</td>
                                                    <td className="px-5 py-4 text-center">{totals.onEvaluation}</td>
                                                    <td className="px-5 py-4 text-center">{totals.evaluated}</td>
                                                    <td className="px-5 py-4 text-center">{totals.recommended}</td>
                                                    <td className="px-5 py-4 text-center">{totals.reviewed}</td>
                                                    <td className="px-5 py-4 text-center">{totals.rejected}</td>
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>}
                    </section>
                )}

            <section className="w-full min-w-0">
                <h2 className="mb-4 text-lg font-black text-[#0b1f3a]">
                    Challenge Category wise count
                </h2>
                <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-600">
                                <tr>
                                    <th className="px-5 py-4">Category Name</th>
                                    {adminRole === "ADMIN_STATE" ||
                                    adminRole === "ADMIN_DISTRICT" ? (
                                        <>
                                            <th className="px-5 py-4 text-center">
                                                {adminRole === "ADMIN_STATE" ? (
                                                    <button
                                                        className="inline-flex items-center gap-1 hover:text-[#0b1f3a]"
                                                        onClick={() =>
                                                            toggleCcSort(
                                                                "regionCount",
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        Region Count
                                                        {ccSort.col ===
                                                        "regionCount" ? (
                                                            ccSort.dir ===
                                                            "asc" ? (
                                                                <ChevronUp
                                                                    size={13}
                                                                />
                                                            ) : (
                                                                <ChevronDown
                                                                    size={13}
                                                                />
                                                            )
                                                        ) : (
                                                            <ChevronUp
                                                                size={13}
                                                                className="opacity-30"
                                                            />
                                                        )}
                                                    </button>
                                                ) : (
                                                    "Region Count"
                                                )}
                                            </th>
                                            <th className="px-5 py-4 text-center">
                                                {adminRole === "ADMIN_STATE" ? (
                                                    <button
                                                        className="inline-flex items-center gap-1 hover:text-[#0b1f3a]"
                                                        onClick={() =>
                                                            toggleCcSort(
                                                                "stateCount",
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        State Count
                                                        {ccSort.col ===
                                                        "stateCount" ? (
                                                            ccSort.dir ===
                                                            "asc" ? (
                                                                <ChevronUp
                                                                    size={13}
                                                                />
                                                            ) : (
                                                                <ChevronDown
                                                                    size={13}
                                                                />
                                                            )
                                                        ) : (
                                                            <ChevronUp
                                                                size={13}
                                                                className="opacity-30"
                                                            />
                                                        )}
                                                    </button>
                                                ) : (
                                                    "State Count"
                                                )}
                                            </th>
                                            {adminRole === "ADMIN_DISTRICT" && (
                                                <th className="px-5 py-4 text-center">
                                                    District Count
                                                </th>
                                            )}
                                        </>
                                    ) : isRegionAdmin ? (
                                        <>
                                            {regionStates.map((s) => (
                                                <th
                                                    key={s.id}
                                                    className="px-5 py-4 text-center"
                                                >
                                                    Count of {s.name}
                                                </th>
                                            ))}
                                            <th className="px-5 py-4 text-center">
                                                Total Count
                                            </th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-5 py-4 text-center">
                                                Count of Bihar
                                            </th>
                                            <th className="px-5 py-4 text-center">
                                                Count of Jharkhand
                                            </th>
                                            <th className="px-5 py-4 text-center">
                                                Count of West Bengal
                                            </th>
                                            <th className="px-5 py-4 text-center">
                                                Total Count
                                            </th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {(adminRole === "ADMIN_STATE"
                                    ? sortedCcCards
                                    : challengeCategoryCards
                                ).map((card) => (
                                    <tr
                                        key={card.key}
                                        className="text-slate-700"
                                    >
                                        <td className="px-5 py-4 font-semibold text-[#0b1f3a]">
                                            {card.label}
                                        </td>
                                        {adminRole === "ADMIN_STATE" ||
                                        adminRole === "ADMIN_DISTRICT" ? (
                                            <>
                                                <td className="px-5 py-4 text-center font-bold">
                                                    {card.regionCount ??
                                                        card.count}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {isStateAdmin && stateAdminStateId ? (
                                                        <button
                                                            className="font-bold text-blue-600 underline-offset-2 hover:underline"
                                                            onClick={() =>
                                                                openJuryModal(
                                                                    stateAdminStateId,
                                                                    stateAdminStateName,
                                                                    card.key,
                                                                    card.label,
                                                                )
                                                            }
                                                            type="button"
                                                        >
                                                            {card.stateCount ?? 0}
                                                        </button>
                                                    ) : (
                                                        <span className="font-bold">{card.stateCount ?? 0}</span>
                                                    )}
                                                </td>
                                                {adminRole ===
                                                    "ADMIN_DISTRICT" && (
                                                    <td className="px-5 py-4 text-center">
                                                        {stateAdminStateId && districtAdminDistrictId ? (
                                                            <button
                                                                className="font-black text-blue-600 underline-offset-2 hover:underline"
                                                                onClick={() =>
                                                                    openJuryModal(
                                                                        stateAdminStateId,
                                                                        districtAdminDistrictName,
                                                                        card.key,
                                                                        card.label,
                                                                        districtAdminDistrictId,
                                                                    )
                                                                }
                                                                type="button"
                                                            >
                                                                {card.districtCount ?? 0}
                                                            </button>
                                                        ) : (
                                                            <span className="font-black text-[#0b1f3a]">{card.districtCount ?? 0}</span>
                                                        )}
                                                    </td>
                                                )}
                                            </>
                                        ) : isRegionAdmin ? (
                                            <>
                                                {regionStates.map((s) => {
                                                    const stateKey = s.name
                                                        .toLowerCase()
                                                        .replace(" ", "");
                                                    const count =
                                                        stateKey === "bihar"
                                                            ? (card.stateCounts
                                                                  ?.bihar ??
                                                              card.biharCount)
                                                            : stateKey ===
                                                                "jharkhand"
                                                              ? (card
                                                                    .stateCounts
                                                                    ?.jharkhand ??
                                                                card.jharkhandCount)
                                                              : (card
                                                                    .stateCounts
                                                                    ?.westBengal ??
                                                                card.westBengalCount);
                                                    return (
                                                        <td
                                                            key={s.id}
                                                            className="px-5 py-4 text-center"
                                                        >
                                                            <button
                                                                className="font-bold text-blue-600 underline-offset-2 hover:underline"
                                                                onClick={() =>
                                                                    openJuryModal(
                                                                        s.id,
                                                                        s.name,
                                                                        card.key,
                                                                        card.label,
                                                                    )
                                                                }
                                                                type="button"
                                                            >
                                                                {count}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-5 py-4 text-center font-black text-[#0b1f3a]">
                                                    {card.count}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                {regionStates.map((s) => {
                                                    const stateKey = s.name
                                                        .toLowerCase()
                                                        .replace(" ", "");
                                                    const count =
                                                        stateKey === "bihar"
                                                            ? (card.stateCounts?.bihar ?? card.biharCount)
                                                            : stateKey === "jharkhand"
                                                              ? (card.stateCounts?.jharkhand ?? card.jharkhandCount)
                                                              : (card.stateCounts?.westBengal ?? card.westBengalCount);
                                                    return (
                                                        <td
                                                            key={s.id}
                                                            className="px-5 py-4 text-center"
                                                        >
                                                            <button
                                                                className="font-bold text-blue-600 underline-offset-2 hover:underline"
                                                                onClick={() =>
                                                                    openJuryModal(
                                                                        s.id,
                                                                        s.name,
                                                                        card.key,
                                                                        card.label,
                                                                    )
                                                                }
                                                                type="button"
                                                            >
                                                                {count}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-5 py-4 text-center font-black text-[#0b1f3a]">
                                                    {card.count}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {isSuperAdmin && <ServerHealthCard health={serverHealth} />}

            {juryModal && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
                    <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl">
                        <div className="flex items-start justify-between border-b border-slate-200 p-5">
                            <div>
                                <h2 className="text-lg font-black text-[#0b1f3a]">
                                    Jury Evaluation Breakup
                                </h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    {juryModal.categoryLabel} —{" "}
                                    {juryModal.stateLabel}
                                </p>
                            </div>
                            <button
                                className="ml-4 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                onClick={() => setJuryModal(null)}
                                type="button"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6">
                            {juryModal.loading ? (
                                <p className="text-sm font-semibold text-slate-500">
                                    Loading…
                                </p>
                            ) : !juryModal.data ? (
                                <p className="text-sm font-semibold text-slate-500">
                                    No data found.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    {[
                                        { label: "Total", value: juryModal.data.total },
                                        { label: "Viewed", value: juryModal.data.viewed },
                                        { label: "On Evaluation", value: juryModal.data.onEvaluation },
                                        { label: "Evaluated", value: juryModal.data.evaluated },
                                        { label: "Recommended", value: juryModal.data.recommended },
                                        { label: "Reviewed", value: juryModal.data.reviewed },
                                        { label: "Rejected", value: juryModal.data.rejected },
                                    ].map(({ label, value }) => (
                                        <div
                                            key={label}
                                            className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-5"
                                        >
                                            <span className="text-3xl font-black text-[#0b1f3a]">
                                                {value}
                                            </span>
                                            <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminShell>
    );
}
