"use client";

import {
  ArrowRight,
  Bell,
  ChevronDown,
  ClipboardList,
  FileText,
  Files,
  Globe2,
  HeartPulse,
  HelpCircle,
  Home,
  Leaf,
  LogOut,
  Mail,
  MoreVertical,
  Plus,
  Search,
  Trophy,
  User,
  UserPlus,
  Users,
  Zap,
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
  ["Total Teams", "3", "+1 from last month", Users, "bg-blue-50 text-blue-600"],
  ["Invitations Pending", "2", "View invitations", Mail, "bg-orange-50 text-orange-600"],
  ["Active Team Applications", "4", "Across all challenges", FileText, "bg-blue-50 text-blue-600"],
  ["Average Team Size", "4.2", "Based on your teams", Users, "bg-orange-50 text-orange-600"],
] as const;

const members = [
  ["Sanjoy Das", "sanjoy.das@example.com", "Team Leader", "Strategy, Product", "Active", true],
  ["Aditi Sharma", "aditi.sharma@example.com", "Member", "Renewable Energy", "Active", false],
  ["Rohan Mehta", "rohan.mehta@example.com", "Member", "Technology & IoT", "Active", false],
  ["Priya Nair", "priya.nair@example.com", "Member", "Research & Impact", "Active", false],
  ["Arjun Kumar", "arjun.kumar@example.com", "Member", "Design & Communication", "Invited", false],
] as const;

const teamApplications = [
  ["Clean Energy for Rural India", "Application Draft", "Last updated 12 Jan 2026", Leaf, "bg-emerald-50 text-emerald-600"],
  ["Sustainable Communities Challenge", "Submitted", "Submitted on 5 Jan 2026", Users, "bg-violet-50 text-violet-600"],
  ["Accessible Education Solutions", "Under Review", "Submitted on 28 Dec 2025", HeartPulse, "bg-red-50 text-red-500"],
] as const;

const invitations = [
  ["Neha Singh", "Invited to join EcoInnovators", "10 Jan 2026"],
  ["Vikram Patel", "Invited to join EcoInnovators", "8 Jan 2026"],
] as const;

const otherTeams = [
  ["Bharat Health Collective", "Accessible Healthcare for All", "You are a Member", "2 applications", "bg-orange-50 text-orange-600"],
  ["JalSetu Innovators", "Smart Water Monitoring Solutions", "You are a Member", "1 application", "bg-violet-50 text-violet-600"],
  ["GreenEdu Labs", "Inclusive Education for Rural India", "You are the Team Lead", "1 application", "bg-emerald-50 text-emerald-600"],
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

export function ParticipantTeamsPage() {
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
              const active = label === "Teams";
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
                  Team Management
                </h1>
                <p className="text-sm text-slate-500">
                  Collaborate, build and innovate together for a stronger India
                </p>
              </div>
              <div className="ml-auto hidden h-10 min-w-96 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm xl:flex">
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
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-blue-100 text-sm font-black">
                  {initials(participant.memberName)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-black">{participant.memberName}</p>
                  <p className="text-xs text-slate-500">{participant.role}</p>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" onClick={logout} type="button">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 p-4 md:p-7">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
              <div
                className="min-h-52 overflow-hidden rounded-lg border border-slate-200 bg-white bg-cover bg-center p-7 shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.9) 46%, rgba(255,255,255,.28) 100%), url('/images/hero-slider-02.webp')",
                }}
              >
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Sewa First Innovation Challenge 2026
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-normal">
                  Team Management
                </h2>
                <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
                  Create and manage your teams, collaborate across challenges,
                  and innovate for a stronger, kinder India.
                </p>
                <p className="mt-6 text-2xl italic">
                  Together for a brighter India
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Zap className="text-blue-600" size={24} />
                  <div>
                    <h2 className="text-xl font-black">Quick Actions</h2>
                    <p className="text-sm text-slate-500">
                      Build your dream team and start creating impact
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <button className="flex h-14 items-center gap-4 rounded-lg bg-blue-600 px-5 text-left font-black text-white shadow-sm transition hover:bg-blue-700" type="button">
                    <Plus size={24} />
                    <span className="flex-1">Create Team</span>
                    <ArrowRight size={20} />
                  </button>
                  <button className="flex h-14 items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-5 text-left font-black text-blue-700 transition hover:bg-blue-100" type="button">
                    <UserPlus size={24} />
                    <span className="flex-1">Invite Member</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map(([label, value, detail, Icon, accent]) => (
                <div className="flex min-h-24 items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={label}>
                  <div className={`grid h-14 w-14 place-items-center rounded-full ${accent}`}>
                    <Icon size={28} />
                  </div>
                  <div>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-sm font-medium text-slate-600">{label}</p>
                    <p className={`mt-1 text-xs font-semibold ${label === "Total Teams" ? "text-emerald-600" : "text-blue-600"}`}>
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
              <div className="grid gap-4">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StarBadge />
                      <p className="font-black text-blue-700">Your Team</p>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="h-10 rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700" type="button">
                        Manage Team
                      </button>
                      <button className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-50" type="button">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
                    <div className="grid h-20 w-20 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Leaf size={38} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black">EcoInnovators</h2>
                      <p className="mt-1 text-base text-slate-600">
                        Clean Energy for a Sustainable Rural India
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        We are developing affordable, community-driven clean
                        energy solutions for rural India, focusing on solar
                        micro-grids and awareness.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 border-t border-slate-100 pt-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm font-black">Team Leader</p>
                      <div className="mt-3 flex items-center gap-3">
                        <Avatar label="SD" />
                        <div>
                          <p className="font-black">Sanjoy Das <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">You</span></p>
                          <p className="text-sm text-slate-500">sanjoy.das@example.com</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-black">Team Members</p>
                      <div className="mt-4 flex -space-x-2">
                        {["AS", "RM", "PN", "AK"].map((item) => (
                          <Avatar key={item} label={item} small />
                        ))}
                        <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-slate-100 text-sm font-black text-slate-600">
                          +2
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-black">Linked Challenges</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#0b1f3a]">Clean Energy for Rural India</span>
                        <span className="rounded-md bg-violet-50 px-3 py-2 text-xs font-semibold text-[#0b1f3a]">Sustainable Communities Challenge</span>
                        <button className="rounded-md border border-blue-200 px-3 py-2 text-xs font-black text-blue-700" type="button">+ Add Challenge</button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <h2 className="flex items-center gap-2 text-xl font-black">
                        <Users className="text-blue-600" size={24} /> Team Members (5)
                      </h2>
                      <p className="ml-8 text-sm text-slate-500">
                        Manage your team members, roles and permissions
                      </p>
                    </div>
                    <button className="h-10 rounded-md border border-blue-500 px-5 text-sm font-black text-blue-700" type="button">
                      + Invite Member
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-600">
                        <tr>
                          {["Name", "Email", "Role", "Expertise", "Status", "Actions"].map((head) => (
                            <th className="px-5 py-3" key={head}>{head}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map(([name, email, role, expertise, status, you]) => (
                          <tr key={email}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar label={initials(name)} small />
                                <span className="font-black">{name}</span>
                                {you && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700">You</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-600">{email}</td>
                            <td className="px-5 py-3">
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{role}</span>
                            </td>
                            <td className="px-5 py-3 text-slate-600">{expertise}</td>
                            <td className="px-5 py-3">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{status}</span>
                            </td>
                            <td className="px-5 py-3">
                              <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-50" type="button">
                                <MoreVertical size={17} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <aside className="grid content-start gap-4">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-3 text-xl font-black">
                      <FileText className="text-blue-600" size={24} /> Team Applications
                    </h2>
                    <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" type="button">
                      View All <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {teamApplications.map(([title, status, detail, Icon, accent]) => (
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0" key={title}>
                        <div className={`grid h-12 w-12 place-items-center rounded-lg ${accent}`}>
                          <Icon size={25} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{title}</p>
                          <p className="text-xs text-slate-600">{status}</p>
                          <p className="text-xs text-slate-500">{detail}</p>
                        </div>
                        <button className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600" type="button">
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-3 text-xl font-black">
                      <Mail className="text-blue-600" size={24} /> Invitation Status
                    </h2>
                    <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" type="button">
                      View All <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {invitations.map(([name, detail, date]) => (
                      <div className="flex items-center gap-3" key={name}>
                        <Avatar label={initials(name)} small />
                        <div className="min-w-0 flex-1">
                          <p className="font-black">{name}</p>
                          <p className="text-xs text-slate-500">{detail}</p>
                          <p className="text-xs text-slate-500">{date}</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Pending</span>
                        <button className="text-xs font-black text-blue-700" type="button">Resend</button>
                        <MoreVertical size={17} />
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black">
                    <Users className="text-blue-600" size={24} /> My Other Teams
                  </h2>
                  <p className="ml-8 text-sm text-slate-500">
                    Teams you are part of across different challenges
                  </p>
                </div>
                <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600" type="button">
                  View All Teams <ArrowRight size={16} />
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {otherTeams.map(([name, detail, role, applications, accent]) => (
                  <div className="rounded-lg border border-slate-200 p-4" key={name}>
                    <div className="flex items-start gap-4">
                      <div className={`grid h-14 w-14 place-items-center rounded-lg ${accent}`}>
                        <Users size={28} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black">{name}</p>
                        <p className="text-sm text-slate-500">{detail}</p>
                        <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {role}
                        </span>
                      </div>
                      <MoreVertical size={18} />
                    </div>
                    <p className="mt-4 text-right text-sm font-semibold text-slate-500">
                      {applications}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Avatar({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-orange-100 to-blue-100 font-black text-[#0b1f3a] ${
        small ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm"
      }`}
    >
      {label}
    </span>
  );
}

function StarBadge() {
  return (
    <span className="grid h-6 w-6 place-items-center text-amber-500">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="m12 2 2.9 6.2 6.8.8-5 4.7 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.7 6.8-.8L12 2Z" />
      </svg>
    </span>
  );
}
