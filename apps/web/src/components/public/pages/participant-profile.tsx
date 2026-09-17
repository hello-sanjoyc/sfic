"use client";

import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Files,
  Globe2,
  HelpCircle,
  Home,
  Landmark,
  LogOut,
  Search,
  Shield,
  Star,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { localeLabels, locales, type Locale } from "@/i18n/locales";

type ParticipantSession = {
  language?: Locale;
  participant?: {
    email?: string;
    memberName?: string;
    role?: string;
  };
};

const defaultParticipant = {
  email: "sanjay.das@email.com",
  memberName: "Sanjay Das",
  role: "Participant",
};

const sidebarItems = [
  ["Dashboard", Home, "/participants/dashboard"],
  ["My Profile", User, "/participants/profile"],
  ["My Applications", ClipboardList, "/participants/applications"],
  ["Teams", Users, "/participants/teams"],
  ["Documents", Files, "#"],
] as const;

const tabs = [
  ["Personal Information", User],
  ["Institution / Organisation", Landmark],
  ["Participation Preferences", Star],
  ["Team Roles", Users],
  ["Security", Shield],
  ["Preferences", Star],
] as const;

const completionItems = [
  "Personal information",
  "Institution / Organisation",
  "Participation preferences",
  "Team roles information",
  "Security settings",
  "Preferences",
] as const;

const interestTags = [
  "Clean Energy",
  "Rural Development",
  "Waste Management",
  "Accessible Education",
  "Healthcare Solutions",
] as const;

const participationSummary: Array<{
  action: string;
  bg: string;
  color: string;
  icon: LucideIcon;
  label: string;
  value: string;
}> = [
  {
    action: "View Applications",
    bg: "from-blue-50 to-white",
    color: "text-blue-600",
    icon: User,
    label: "Individual Applications",
    value: "3",
  },
  {
    action: "View Applications",
    bg: "from-emerald-50 to-white",
    color: "text-emerald-600",
    icon: Users,
    label: "Team Applications",
    value: "2",
  },
  {
    action: "Manage Teams",
    bg: "from-violet-50 to-white",
    color: "text-violet-600",
    icon: Users,
    label: "Active Teams",
    value: "2",
  },
  {
    action: "Explore Challenges",
    bg: "from-orange-50 to-white",
    color: "text-orange-600",
    icon: Trophy,
    label: "Eligible Challenges",
    value: "4",
  },
];

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

function Field({
  label,
  required,
  value,
  wide,
}: {
  label: string;
  required?: boolean;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-3" : ""}>
      <span className="text-sm font-black text-[#0b1f3a]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <div className="mt-1 flex min-h-11 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-[#0b1f3a]">
        {value}
      </div>
    </label>
  );
}

export function ParticipantProfilePage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");
  const [participant, setParticipant] = useState(defaultParticipant);

  useEffect(() => {
    const session = parseSession(localStorage.getItem(AUTH_STORAGE_KEY));
    setParticipant({
      email: session?.participant?.email ?? defaultParticipant.email,
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
              Seva First Innovation Challenge
            </p>
          </div>

          <nav className="grid gap-2 px-3">
            {sidebarItems.map(([label, Icon, href]) => {
              const active = label === "My Profile";
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
                  My Profile
                </h1>
                <p className="text-sm text-slate-500">
                  Manage your personal and participation details in the Seva First Innovation Challenge 2026
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

          <div className="grid gap-4 p-4 md:p-7 xl:grid-cols-[minmax(0,1fr)_29rem]">
            <div className="grid gap-4">
              <section
                className="overflow-hidden rounded-lg border border-slate-200 bg-white bg-cover bg-center p-6 shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.93) 55%, rgba(255,255,255,.45) 100%), url('/images/inner-banner.webp')",
                }}
              >
                <div className="flex flex-wrap items-center gap-7">
                  <div className="relative">
                    <div className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-blue-100 text-4xl font-black">
                      {initials(participant.memberName)}
                    </div>
                    <button className="absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-full bg-[#0b1f3a] text-white" type="button">
                      <Camera size={19} />
                    </button>
                  </div>
                  <div className="min-w-64 flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black tracking-normal">{participant.memberName}</h2>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white">
                        <Check size={15} />
                      </span>
                    </div>
                    <p className="mt-2 text-lg text-slate-600">
                      {participant.email} <span className="mx-3">|</span> +91 98765 43210
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                        <User size={17} /> Individual Participant
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                        <Users size={17} /> Team Lead
                      </span>
                    </div>
                    <p className="mt-5 text-2xl italic">Ideas for a kinder, stronger India</p>
                  </div>
                </div>
              </section>

              <nav className="flex gap-5 overflow-x-auto border-b border-slate-200 bg-[#f5f8fc]">
                {tabs.map(([label, Icon], index) => (
                  <button
                    className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold ${
                      index === 0
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-slate-600"
                    }`}
                    key={label}
                    type="button"
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </nav>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <User className="text-blue-600" size={26} />
                  <div>
                    <h2 className="text-xl font-black">Personal Information</h2>
                    <p className="text-sm text-slate-500">
                      Keep your profile information up to date. This information will be used for your applications and communication.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Full Name" required value={participant.memberName} />
                  <label>
                    <span className="text-sm font-black">Email Address <span className="text-red-500">*</span></span>
                    <div className="mt-1 flex min-h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
                      {participant.email}
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        Verified
                      </span>
                    </div>
                  </label>
                  <Field label="Phone Number" required value="+91     98765 43210" />
                  <Field label="Date of Birth" required value="15 Mar 2001" />
                  <Field label="Gender" required value="Male" />
                  <Field label="Country" required value="India" />
                  <Field label="Address" required value="H.No. 221, Green Park, Near IIT Campus                                      42/200" wide />
                  <Field label="City" required value="New Delhi" />
                  <Field label="State" required value="Delhi" />
                  <Field label="Pincode" required value="110016" />
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="flex items-center gap-2 text-lg font-black">
                    <Landmark className="text-blue-600" size={23} />
                    Institution / Organisation
                  </h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <Field label="Institute / Organisation Name" required value="Indian Institute of Technology Delhi" />
                    <Field label="Designation" required value="Undergraduate Student" />
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-lg font-black">Areas of Interest</h3>
                  <p className="text-sm text-slate-500">Select your key areas of interest (choose up to 5) *</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {interestTags.map((tag, index) => (
                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                          index < 4
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                        key={tag}
                      >
                        {tag} {index < 4 ? "x" : "+"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-lg font-black">Communication Preferences</h3>
                  <p className="text-sm text-slate-500">Choose what updates you would like to receive from SFIC 2026.</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    {[
                      ["Challenge announcements and updates", true],
                      ["Application status updates", true],
                      ["Events, webinars and learning opportunities", true],
                      ["Marketing and partnership communications", false],
                    ].map(([label, checked]) => (
                      <label className="flex items-start gap-2 text-xs font-semibold text-slate-600" key={label as string}>
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                          {checked && <Check size={14} />}
                        </span>
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button className="h-11 rounded-md border border-slate-200 px-6 text-sm font-black" type="button">
                    Cancel
                  </button>
                  <button className="h-11 rounded-md bg-blue-600 px-7 text-sm font-black text-white" type="button">
                    Save Changes
                  </button>
                </div>
              </section>
            </div>

            <aside className="grid content-start gap-4">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-3 text-xl font-black">
                  <ClipboardList className="text-blue-600" size={25} />
                  Profile Completion
                </h2>
                <div className="mt-5 flex items-center gap-5">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#16a34a_100%,#e5e7eb_0)]">
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black">
                      100%
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-black">Profile Complete!</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Your profile is ready for applications. Keep your information updated for the best experience.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {completionItems.map((item) => (
                    <div className="flex items-center gap-3 text-sm" key={item}>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white">
                        <Check size={15} />
                      </span>
                      <span className="flex-1 font-semibold">{item}</span>
                      <span className="font-semibold text-emerald-600">Completed</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-3 text-xl font-black">
                  <FileText className="text-blue-600" size={25} />
                  Participation Summary
                </h2>
                <p className="ml-9 text-sm text-slate-500">Your activity in SFIC 2026</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {participationSummary.map(({ action, bg, color, icon: Icon, label, value }) => (
                    <div className={`rounded-lg bg-gradient-to-br ${bg} p-4`} key={label}>
                      <Icon className={color} size={27} />
                      <p className="mt-2 text-2xl font-black">{value}</p>
                      <p className="text-sm text-slate-600">{label}</p>
                      <p className="mt-2 text-xs font-black text-blue-600">{action} -&gt;</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-3 text-lg font-black">
                  <HelpCircle className="text-blue-600" size={24} />
                  Need to make changes?
                </h2>
                <p className="ml-9 mt-2 text-sm leading-6 text-slate-500">
                  If you need to update your email address or other critical information, please contact our support team.
                </p>
                <button className="ml-9 mt-4 h-11 rounded-md border border-blue-200 bg-blue-50 px-6 text-sm font-black text-blue-700" type="button">
                  Contact Support
                </button>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
