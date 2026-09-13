"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Droplet,
  FilePlus2,
  Files,
  Globe2,
  Heart,
  HelpCircle,
  Home,
  Leaf,
  LogOut,
  MoreHorizontal,
  Search,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { localeLabels, locales, type Locale } from "@/i18n/locales";

type ParticipantSession = {
  language?: Locale;
  participant?: {
    memberName?: string;
    role?: string;
  };
};

const defaultParticipant = {
  memberName: "Sanjoy Das",
  role: "Participant",
};

const sidebarItems = [
  ["Dashboard", Home, "/participants/dashboard"],
  ["My Profile", User, "/participants/profile"],
  ["My Applications", ClipboardList, "/participants/applications"],
  ["Teams", Users, "/participants/teams"],
  ["Documents", Files, "#"],
] as const;

const stats = [
  ["Total Applications", "12", "+3 from last month", FilePlus2, "bg-blue-50 text-blue-600"],
  ["Single-Challenge Applications", "7", "", Target, "bg-violet-50 text-violet-600"],
  ["Multi-Challenge Applications", "5", "", Files, "bg-emerald-50 text-emerald-600"],
  ["Individual Entries", "6", "50% of your applications", User, "bg-blue-50 text-blue-600"],
  ["Team Entries", "6", "50% of your applications", Users, "bg-emerald-50 text-emerald-600"],
] as const;

const tabs = [
  ["All Applications", "12", "border-blue-500 bg-blue-50 text-blue-700"],
  ["Draft", "2", "border-slate-200 bg-slate-50 text-slate-700"],
  ["Submitted", "4", "border-emerald-200 bg-emerald-50 text-emerald-700"],
  ["Under Review", "3", "border-amber-200 bg-amber-50 text-amber-700"],
  ["Shortlisted", "2", "border-violet-200 bg-violet-50 text-violet-700"],
  ["Not Shortlisted", "1", "border-red-200 bg-red-50 text-red-700"],
] as const;

const applications = [
  {
    applicant: "Sanjoy Das\nIndividual Applicant",
    challenge: "Clean Water &\nSanitation for All",
    challengeIcon: Droplet,
    iconClass: "text-blue-600",
    number: "SFIC2026-APP-001",
    scope: "Single Challenge",
    status: "Under Review",
    submitted: "12 Jan 2026",
    title: "JalSetu - Smart Water\nMonitoring System",
    type: "Individual",
  },
  {
    applicant: "Bharat Health Collective\n4 members",
    challenge: "Healthy Communities",
    challengeIcon: Heart,
    iconClass: "text-red-500",
    number: "SFIC2026-APP-002",
    scope: "Multiple Challenges",
    status: "Submitted",
    submitted: "5 Jan 2026",
    title: "SwasthyaMitra - Community\nHealth Volunteer Platform",
    type: "Team",
  },
  {
    applicant: "Sanjoy Das\nIndividual Applicant",
    challenge: "Accessible Education\nSolutions",
    challengeIcon: BookOpen,
    iconClass: "text-blue-600",
    number: "SFIC2026-APP-003",
    scope: "Single Challenge",
    status: "Draft",
    submitted: "-",
    title: "ShikshaSetu - AI for\nInclusive Education",
    type: "Individual",
  },
  {
    applicant: "EcoInnovators\n5 members",
    challenge: "Clean Energy for\nRural India",
    challengeIcon: Leaf,
    iconClass: "text-emerald-600",
    number: "SFIC2026-APP-004",
    scope: "Multiple Challenges",
    status: "Shortlisted",
    submitted: "28 Dec 2025",
    title: "GreenGrid - Decentralized\nRenewable Energy",
    type: "Team",
  },
  {
    applicant: "Sanjoy Das\nIndividual Applicant",
    challenge: "Healthy Communities",
    challengeIcon: Heart,
    iconClass: "text-red-500",
    number: "SFIC2026-APP-005",
    scope: "Single Challenge",
    status: "Not Shortlisted",
    submitted: "18 Dec 2025",
    title: "Swasth Gaon - Telehealth\nfor Rural India",
    type: "Individual",
  },
] as const;

function parseSession(value: string | null): ParticipantSession | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ParticipantSession;
  } catch {
    return null;
  }
}

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function statusClasses(status: string) {
  if (status === "Submitted") return "bg-emerald-50 text-emerald-700";
  if (status === "Draft") return "bg-slate-100 text-slate-600";
  if (status === "Shortlisted") return "bg-violet-50 text-violet-700";
  if (status === "Not Shortlisted") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function scopeClasses(scope: string) {
  return scope === "Multiple Challenges"
    ? "bg-violet-50 text-violet-700"
    : "bg-slate-100 text-slate-700";
}

function typeClasses(type: string) {
  return type === "Team"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-blue-50 text-blue-700";
}

function splitLines(value: string) {
  return value.split("\n");
}

export function ParticipantApplicationsPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");
  const [participant, setParticipant] = useState(defaultParticipant);

  useEffect(() => {
    const session = parseSession(localStorage.getItem(AUTH_STORAGE_KEY));
    setParticipant({
      memberName: session?.participant?.memberName ?? defaultParticipant.memberName,
      role: session?.participant?.role ?? defaultParticipant.role,
    });
    setLocale(isLocale(session?.language) ? session.language : "en");
  }, []);

  const changeLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale);
    const session = parseSession(localStorage.getItem(AUTH_STORAGE_KEY)) ?? {};
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ ...session, language: nextLocale }),
    );
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-[#0b1f3a]">
      <div className="grid min-h-screen lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden bg-[#08213c] text-white lg:flex lg:flex-col">
          <div className="p-7">
            <p className="text-2xl font-black leading-tight text-white">
              Sewa First Innovation Challenge
            </p>
          </div>

          <nav className="grid gap-2 px-3">
            {sidebarItems.map(([label, Icon, href]) => {
              const active = label === "My Applications";
              return (
                <Link
                  className={`flex h-12 items-center gap-4 rounded-lg px-5 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                  href={href}
                  key={label}
                >
                  <Icon size={21} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto p-5">
            <div className="overflow-hidden rounded-lg bg-[#06182c]">
              <div
                className="h-28 bg-cover bg-center"
                style={{ backgroundImage: "url('/images/eastern-region.webp')" }}
              />
              <div className="p-5">
                <p className="text-xl font-bold leading-7">
                  Innovate
                  <br />
                  Serve
                  <br />
                  Build a Better India
                </p>
                <div className="mt-4 h-1 w-16 bg-gradient-to-r from-[#ff9933] to-[#138808]" />
                <p className="mt-5 text-sm text-blue-100">
                  "Small ideas. Big impact."
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-7">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[15rem]">
                <h1 className="text-2xl font-black tracking-normal text-[#0b1f3a]">
                  My Applications
                </h1>
                <p className="text-sm text-slate-500">
                  Track and manage all your proposals across challenges
                </p>
              </div>

              <div className="ml-auto hidden h-10 min-w-80 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm xl:flex">
                <Search size={18} />
                <span className="flex-1">Search challenges, applications, teams...</span>
                <kbd className="rounded border border-slate-200 px-2 py-0.5 text-xs">
                  Ctrl K
                </kbd>
              </div>

              <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold shadow-sm">
                <Globe2 size={18} />
                <select
                  className="bg-transparent outline-none"
                  onChange={(event) => changeLanguage(event.target.value as Locale)}
                  value={locale}
                >
                  {locales.map((item) => (
                    <option key={item} value={item}>
                      {localeLabels[item]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </label>

              <button className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm" type="button">
                <Bell size={19} />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white">
                  3
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-blue-100 text-sm font-black text-[#0b1f3a]">
                  {initials(participant.memberName)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-black">{participant.memberName}</p>
                  <p className="text-xs text-slate-500">{participant.role}</p>
                </div>
                <button
                  aria-label="Logout"
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  onClick={logout}
                  type="button"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 p-4 md:p-7">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_29rem]">
              <div
                className="min-h-52 overflow-hidden rounded-lg border border-slate-200 bg-white bg-cover bg-center p-7 shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.9) 47%, rgba(255,255,255,.35) 100%), url('/images/inner-banner.webp')",
                }}
              >
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Sewa First Innovation Challenge 2026
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-normal text-[#0b1f3a]">
                  Multiple applications are allowed!
                </h2>
                <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
                  You can submit multiple proposals across one or more challenges
                  as an individual or as a team. Explore more opportunities to
                  create greater impact.
                </p>
                <p className="mt-6 text-2xl italic text-[#0b1f3a]">
                  Ideas for a kinder, stronger India
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <button className="flex h-20 w-full items-center gap-5 rounded-lg bg-blue-600 px-6 text-left text-white shadow-sm transition hover:bg-blue-700" type="button">
                  <FilePlus2 size={28} />
                  <span className="flex-1">
                    <span className="block text-xl font-black">Create New Application</span>
                    <span className="mt-1 block text-sm text-blue-50">
                      Submit a new proposal for any challenge
                    </span>
                  </span>
                  <ArrowRight size={24} />
                </button>
                <div className="mt-4 flex items-center gap-4 rounded-lg bg-slate-50 p-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600">
                    <Trophy size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black">Not sure which challenge to apply for?</p>
                    <button className="mt-2 flex h-10 w-full items-center rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700" type="button">
                      <span className="flex-1 text-left">Explore Challenges</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map(([label, value, detail, Icon, accent]) => (
                <div className="flex min-h-28 items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={label}>
                  <div className={`grid h-14 w-14 place-items-center rounded-full ${accent}`}>
                    <Icon size={28} />
                  </div>
                  <div>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-sm font-medium text-slate-600">{label}</p>
                    {detail && (
                      <p className="mt-2 text-xs font-semibold text-emerald-600">
                        {detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-3">
              <div className="flex flex-wrap gap-3">
                {tabs.map(([label, count, classes]) => (
                  <button className={`h-11 rounded-lg border px-5 text-sm font-bold ${classes}`} key={label} type="button">
                    {label}
                    <span className="ml-3 rounded-full bg-white/70 px-2 py-0.5">{count}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1fr)_15rem_16rem_15rem_14rem]">
                <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm">
                  <Search size={18} />
                  <input
                    className="w-full bg-transparent outline-none"
                    placeholder="Search by title, application number, team name or keyword..."
                    type="search"
                  />
                </label>
                {["All Challenges", "All Participation Types", "All Categories", "All Status"].map((label) => (
                  <button className="flex h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-700 shadow-sm" key={label} type="button">
                    <span className="flex-1">{label}</span>
                    <ChevronDown size={18} />
                  </button>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[82rem] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-600">
                    <tr>
                      {["Title & Application No.", "Challenge(s)", "Participation", "Scope", "Status", "Submitted On", "Team / Applicant", "Actions"].map((head) => (
                        <th className="px-5 py-3" key={head}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((application) => {
                      const ChallengeIcon = application.challengeIcon;
                      return (
                        <tr className="align-middle" key={application.number}>
                          <td className="px-5 py-4">
                            <p className="whitespace-pre-line font-black leading-5 text-[#0b1f3a]">
                              {application.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{application.number}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="inline-flex min-w-44 items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                              <ChallengeIcon className={application.iconClass} size={24} />
                              <span className="whitespace-pre-line text-xs font-semibold leading-5 text-slate-700">
                                {application.challenge}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${typeClasses(application.type)}`}>
                              {application.type === "Team" ? <Users size={15} /> : <User size={15} />}
                              {application.type}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-4 py-2 text-xs font-bold ${scopeClasses(application.scope)}`}>
                              {application.scope}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-4 py-2 text-xs font-bold ${statusClasses(application.status)}`}>
                              {application.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-600">
                            {application.submitted}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700">
                                {application.type === "Team" ? <Users size={18} /> : <User size={18} />}
                              </div>
                              <div>
                                <p className="font-black">{splitLines(application.applicant)[0]}</p>
                                <p className="text-xs text-slate-500">{splitLines(application.applicant)[1]}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button className="h-9 rounded-md bg-blue-50 px-4 text-xs font-black text-blue-700" type="button">
                                View
                              </button>
                              <button className="h-9 rounded-md border border-slate-200 px-4 text-xs font-black text-[#0b1f3a]" type="button">
                                {application.status === "Draft" || application.number === "SFIC2026-APP-001" ? "Edit" : "Duplicate"}
                              </button>
                              <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200" type="button">
                                <MoreHorizontal size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-500">
                Showing 1-5 of 12 applications
              </p>
              <div className="flex items-center gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-600" type="button">
                  <ArrowLeft size={17} />
                </button>
                {[1, 2, 3].map((page) => (
                  <button
                    className={`grid h-10 w-10 place-items-center rounded-md border text-sm font-bold ${
                      page === 1
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    key={page}
                    type="button"
                  >
                    {page}
                  </button>
                ))}
                <button className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-600" type="button">
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
