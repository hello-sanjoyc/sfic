"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  Files,
  Globe2,
  HelpCircle,
  Home,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Target,
  Trophy,
  User,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { getSiteContent } from "@/content";
import { localeLabels, locales, type Locale } from "@/i18n/locales";

type ParticipantSession = {
  language?: Locale;
  participant?: {
    applicationNumber: string;
    email: string;
    memberName: string;
    role: string;
    status: string;
  };
  session?: {
    token: string;
  };
};

const defaultParticipant = {
  applicationNumber: "SFIC-WB-0001",
  email: "sanjoy@example.com",
  memberName: "Sanjoy Das",
  role: "Participant",
  status: "submitted",
};

const sidebarItems = [
  ["Dashboard", Home, "/participants/dashboard", true],
  ["My Profile", User, "/participants/profile", false],
  ["My Applications", ClipboardList, "/participants/applications", false],
  ["Teams", Users, "/participants/teams", false],
  ["Documents", Files, "#", false],
] as const;

const stats = [
  ["Total Applications", "5", "+2 from last month", FileText, "bg-blue-50 text-blue-600", "text-emerald-600"],
  ["Active Challenges", "8", "Explore opportunities", Trophy, "bg-amber-50 text-amber-600", "text-blue-600"],
  ["Individual Entries", "3", "60% of your applications", User, "bg-blue-50 text-blue-600", "text-slate-500"],
  ["Team Entries", "2", "40% of your applications", Users, "bg-emerald-50 text-emerald-600", "text-slate-500"],
  ["Pending Actions", "3", "Requires your attention", Clock3, "bg-orange-50 text-orange-600", "text-slate-500"],
] as const;

const overview = [
  ["Single Challenge", "3", "applications", Target, "from-blue-50 to-white", "text-blue-600"],
  ["Multiple Challenges", "2", "applications", Files, "from-emerald-50 to-white", "text-emerald-600"],
  ["Average Team Size", "4", "members", Users, "from-orange-50 to-white", "text-orange-600"],
  ["Applications Under Review", "2", "applications", FileText, "from-indigo-50 to-white", "text-indigo-600"],
] as const;

const applications = [
  ["JalSetu - Smart Water Monitoring System", "Clean Water & Sanitation for All", "Individual", "Single Challenge", "Under Review", "12 Jan 2026"],
  ["SwasthyaMitra - Community Health Volunteer Platform", "Healthy Communities Challenge", "Team", "Multiple Challenges", "Submitted", "5 Jan 2026"],
  ["ShikshaSetu - AI for Inclusive Education", "Accessible Education Solutions", "Individual", "Single Challenge", "Draft", "3 Jan 2026"],
  ["GreenGrid - Decentralized Renewable Energy", "Clean Energy for Rural India", "Team", "Multiple Challenges", "Under Review", "28 Dec 2025"],
] as const;

const deadlines = [
  ["Clean Energy for Rural India", "15 Jan 2026", "12 days left", "bg-red-500"],
  ["Accessible Education Solutions", "28 Jan 2026", "25 days left", "bg-orange-500"],
  ["Healthy Communities Challenge", "10 Feb 2026", "38 days left", "bg-emerald-600"],
] as const;

const teams = [
  ["EcoInnovators", "5 members | Team Lead", "Active"],
  ["Bharat Health Collective", "4 members | Member", "Invitation"],
] as const;

const announcements = [
  ["Round 2 Shortlist Announcement", "Shortlisted teams for Round 2 will be announced next week.", "8 Jan 2026", "bg-orange-500"],
  ["New Challenges Launched", "We are excited to announce 2 new challenges under SFIC 2026.", "2 Jan 2026", "bg-emerald-600"],
] as const;

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

function parseSession(value: string | null): ParticipantSession | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as ParticipantSession;
  } catch {
    return null;
  }
}

function statusClasses(status: string) {
  if (status === "Submitted") return "bg-emerald-50 text-emerald-700";
  if (status === "Draft") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function participationClasses(type: string) {
  return type === "Team"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-blue-50 text-blue-700";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ParticipantDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const storedSession = parseSession(localStorage.getItem(AUTH_STORAGE_KEY));
    setSession(storedSession);
    setLocale(isLocale(storedSession?.language) ? storedSession.language : "en");
  }, []);

  const content = useMemo(
    () => getSiteContent(locale).participantLogin.dashboard,
    [locale],
  );
  const participant = session?.participant ?? defaultParticipant;
  const participantName = participant.memberName || defaultParticipant.memberName;

  const changeLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale);

    const nextSession = {
      ...(session ?? { participant, session: { token: "demo-ui-session" } }),
      language: nextLocale,
    };
    setSession(nextSession);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
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
            {sidebarItems.map(([label, Icon, href, active]) => (
              <Link
                className={`flex h-12 items-center gap-4 rounded-lg px-5 text-left text-sm font-semibold transition ${
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
            ))}
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
              <div className="min-w-[14rem]">
                <h1 className="text-2xl font-black tracking-normal text-[#0b1f3a]">
                  Dashboard
                </h1>
                <p className="text-sm text-slate-500">
                  Track your journey in the Sewa First Innovation Challenge 2026
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

              <button
                className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm"
                type="button"
              >
                <Bell size={19} />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white">
                  3
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-blue-100 text-sm font-black text-[#0b1f3a]">
                  {initials(participantName)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-black">{participantName}</p>
                  <p className="text-xs text-slate-500">{participant.role}</p>
                </div>
                <button
                  aria-label={content.logout}
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
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
              <div
                className="min-h-56 overflow-hidden rounded-lg border border-slate-200 bg-white bg-cover bg-center p-7 shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.9) 47%, rgba(255,255,255,.35) 100%), url('/images/inner-banner.webp')",
                }}
              >
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Sewa First Innovation Challenge 2026
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-normal text-[#0b1f3a]">
                  Welcome back, {participantName.split(" ")[0]}!
                </h2>
                <p className="mt-2 max-w-xl text-base leading-7 text-slate-600">
                  Track your innovation applications, manage your teams, and stay
                  updated on important deadlines and announcements.
                </p>
                <p className="mt-6 text-2xl italic text-[#0b1f3a]">
                  Ideas for a kinder, stronger India
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Zap className="text-blue-600" size={24} />
                  <div>
                    <h2 className="text-xl font-black">Quick Actions</h2>
                    <p className="text-sm text-slate-500">
                      Take the next step in your innovation journey
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <button
                    className="flex h-14 items-center gap-4 rounded-lg bg-blue-600 px-5 text-left font-black text-white shadow-sm transition hover:bg-blue-700"
                    type="button"
                  >
                    <Plus size={24} />
                    <span className="flex-1">Create New Application</span>
                    <ArrowRight size={20} />
                  </button>
                  <button
                    className="flex h-14 items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-5 text-left font-black text-blue-700 transition hover:bg-blue-100"
                    type="button"
                  >
                    <Users size={24} />
                    <span className="flex-1">Create Team</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map(([label, value, detail, Icon, accent, detailClass]) => (
                <div
                  className="flex min-h-28 items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  key={label}
                >
                  <div className={`grid h-14 w-14 place-items-center rounded-full ${accent}`}>
                    <Icon size={27} />
                  </div>
                  <div>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-sm font-medium text-slate-600">{label}</p>
                    <p className={`mt-2 text-xs font-semibold ${detailClass}`}>
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-start gap-3">
                  <Target className="text-blue-600" size={22} />
                  <div>
                    <h2 className="text-lg font-black">Participation Overview</h2>
                    <p className="text-sm text-slate-500">
                      Your participation across challenges and team formats
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  {overview.map(([label, value, detail, Icon, gradient, iconClass]) => (
                    <div
                      className={`rounded-lg bg-gradient-to-br ${gradient} p-5`}
                      key={label}
                    >
                      <Icon className={iconClass} size={30} />
                      <p className="mt-3 text-sm text-slate-600">{label}</p>
                      <p className="text-2xl font-black">{value}</p>
                      <p className="text-sm text-slate-500">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="text-blue-600" size={21} />
                    <h2 className="text-lg font-black">Upcoming Deadlines</h2>
                  </div>
                  <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" type="button">
                    View All <ArrowRight size={16} />
                  </button>
                </div>
                <div className="grid gap-4">
                  {deadlines.map(([title, date, days, dot]) => (
                    <div className="grid grid-cols-[auto_1fr_auto] gap-3" key={title}>
                      <span className={`mt-1.5 h-3 w-3 rounded-full ${dot}`} />
                      <div>
                        <p className="text-sm font-black">{title}</p>
                        <p className="text-xs text-slate-500">Application deadline</p>
                      </div>
                      <div className="text-right text-sm font-black text-red-600">
                        <p>{date}</p>
                        <p>{days}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-600" size={22} />
                    <div>
                      <h2 className="text-lg font-black">Recent Applications</h2>
                      <p className="text-sm text-slate-500">
                        Your latest innovation submissions
                      </p>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" type="button">
                    View All <ArrowRight size={16} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[58rem] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                      <tr>
                        {["Title", "Challenge", "Participation Type", "Challenge Scope", "Status", "Submitted On", "Actions"].map((head) => (
                          <th className="px-4 py-3" key={head}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications.map(([title, challenge, type, scope, status, date]) => (
                        <tr className="align-middle" key={title}>
                          <td className="px-4 py-3 font-black text-[#0b1f3a]">{title}</td>
                          <td className="px-4 py-3 text-slate-600">{challenge}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${participationClasses(type)}`}>
                              {type === "Team" ? <Users size={14} /> : <User size={14} />}
                              {type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{scope}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{date}</td>
                          <td className="px-4 py-3">
                            <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100" type="button">
                              <MoreHorizontal size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="text-blue-600" size={22} />
                      <h2 className="text-lg font-black">My Teams</h2>
                    </div>
                    <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" type="button">
                      View All <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {teams.map(([name, detail, state]) => (
                      <div className="flex items-center gap-3" key={name}>
                        <div className="flex -space-x-2">
                          {["A", "B", "C", "D"].map((letter) => (
                            <span
                              className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-blue-100 text-xs font-black text-blue-700"
                              key={letter}
                            >
                              {letter}
                            </span>
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{name}</p>
                          <p className="text-xs text-slate-500">{detail}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${state === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                          {state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Megaphone className="text-blue-600" size={22} />
                      <h2 className="text-lg font-black">Announcements</h2>
                    </div>
                    <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" type="button">
                      View All <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {announcements.map(([title, body, date, dot]) => (
                      <div className="grid grid-cols-[auto_1fr_auto] gap-3" key={title}>
                        <span className={`mt-1.5 h-3 w-3 rounded-full ${dot}`} />
                        <div>
                          <p className="text-sm font-black">{title}</p>
                          <p className="text-xs leading-5 text-slate-500">{body}</p>
                        </div>
                        <p className="text-sm text-slate-500">{date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-lg border border-blue-100 bg-white p-4 text-sm text-slate-600 shadow-sm lg:hidden">
              <Shield className="mr-2 inline text-blue-600" size={18} />
              Your participant workspace is optimized for desktop dashboards and
              remains fully usable on smaller screens.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
