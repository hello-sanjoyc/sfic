"use client";

import {
  ClipboardList,
  LogOut,
  Menu,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type ParticipantTokenPayload = {
  email?: string;
  exp?: number;
  name?: string;
  phone?: string;
  role?: "applicant" | "team_member";
};

const defaultParticipant = {
  email: "",
  emailVerified: null as boolean | null,
  memberName: "Participant",
  phone: "",
  role: "Participant",
};

type ParticipantProfileResponse = {
  profile: {
    emailVerified?: boolean | null;
    fullName?: string | null;
    role?: "applicant" | "team_member";
  };
};

const navItems = [
  ["My Application(s)", ClipboardList, "/participants/applications"],
  ["My Profile", User, "/participants/profile"],
] as const;

function decodeParticipantToken(token: string | null) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const parsed = JSON.parse(atob(padded)) as ParticipantTokenPayload;

    if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!parsed.email || !parsed.name || !parsed.phone || !parsed.role) return null;

    return parsed;
  } catch {
    return null;
  }
}

function formatRole(role: ParticipantTokenPayload["role"]) {
  return role === "team_member" ? "Team Member" : "Applicant";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ParticipantShell({
  children,
  eyebrow,
  naturalScroll = false,
  title,
}: Readonly<{
  children?: React.ReactNode;
  eyebrow?: string;
  naturalScroll?: boolean;
  title: string;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [participant, setParticipant] = useState(defaultParticipant);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isVerificationLinkSending, setIsVerificationLinkSending] =
    useState(false);
  const [verificationLinkMessage, setVerificationLinkMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY);
    const participantToken = decodeParticipantToken(token);

    if (!participantToken) {
      localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
      router.replace("/en/participants/login");
      return;
    }

    setParticipant({
      email: participantToken.email ?? defaultParticipant.email,
      emailVerified: null,
      memberName: participantToken.name ?? defaultParticipant.memberName,
      phone: participantToken.phone ?? defaultParticipant.phone,
      role: formatRole(participantToken.role),
    });
    setIsSessionChecked(true);

    void apiClient
      .get<ParticipantProfileResponse>(endpoints.participants.profile, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((result) => {
        setParticipant((current) => ({
          ...current,
          emailVerified: result.profile.emailVerified ?? false,
          memberName: result.profile.fullName ?? current.memberName,
          role: result.profile.role ? formatRole(result.profile.role) : current.role,
        }));
      })
      .catch(() => {
        setParticipant((current) => ({
          ...current,
          emailVerified: false,
        }));
      });
  }, [router]);

  const logout = () => {
    localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
    sessionStorage.removeItem(PARTICIPANT_TOKEN_KEY);
    setIsNavOpen(false);
    router.replace("/en/participants/login");
    router.refresh();
  };

  const requestVerificationLink = async () => {
    const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY);
    if (!token || isVerificationLinkSending) return;

    setIsVerificationLinkSending(true);
    setVerificationLinkMessage("");

    try {
      await apiClient.post(endpoints.participants.profileVerificationLink, {
        language: "en",
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setVerificationLinkMessage(
        "Verification link sent to your registered email.",
      );
    } catch (error) {
      setVerificationLinkMessage(
        error instanceof Error
          ? error.message
          : "Verification link could not be sent.",
      );
    } finally {
      setIsVerificationLinkSending(false);
    }
  };

  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  if (!isSessionChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8fc] text-sm font-semibold text-slate-500">
        Loading participant workspace...
      </div>
    );
  }

  return (
    <div
      className={`${naturalScroll ? "min-h-dvh" : "h-dvh overflow-hidden"} bg-[#f5f8fc] text-[#0b1f3a]`}
    >
      <div className={`${naturalScroll ? "min-h-dvh" : "h-dvh"} lg:pl-[17rem]`}>
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] overflow-hidden bg-[#08213c] text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 p-7">
            <Image
              alt="Seva First Innovation Challenge"
              className="size-12 rounded-md bg-white object-contain p-1"
              height={56}
              src="/images/logo.webp"
              width={56}
            />
            <div>
              <p className="text-2xl font-black leading-none">SFIC</p>
              <p className="mt-1 text-xs font-semibold text-blue-100">
                Participant Workspace
              </p>
            </div>
          </div>

          <nav className="grid gap-2 px-3">
            {navItems.map(([label, Icon, href]) => {
              const active =
                pathname === href || pathname.startsWith(href);

              return (
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
              );
            })}
            <button
              className="flex h-12 items-center gap-4 rounded-lg px-5 text-left text-sm font-semibold text-blue-100 transition hover:bg-white/10"
              onClick={logout}
              type="button"
            >
              <LogOut size={21} />
              <span>Logout</span>
            </button>
          </nav>

          <div className="mt-auto p-4">
            <div className="overflow-hidden rounded-lg bg-[#061a30] shadow-lg shadow-slate-950/20">
              <Image
                alt="Eastern Region landscape illustration"
                className="h-28 w-full object-cover"
                height={128}
                src="/images/eastern-region.webp"
                width={240}
              />
              <div className="p-5">
                <p className="text-2xl font-black leading-tight text-white">
                  Innovate
                  <br />
                  Serve
                  <br />
                  Build a Better India
                </p>
                <div className="mt-5 h-1.5 w-24 bg-gradient-to-r from-[#ff9933] via-[#ffb33f] to-[#138808]" />
                <p className="mt-5 text-base font-bold leading-snug text-blue-50">
                  &quot;Small ideas. Big impact.&quot;
                </p>
              </div>
            </div>
          </div>
        </aside>

        {isNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setIsNavOpen(false)}
              type="button"
            />
            <aside className="relative flex h-full w-[min(20rem,86vw)] flex-col overflow-y-auto bg-[#08213c] text-white shadow-2xl">
              <div className="flex items-center justify-between gap-3 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    alt="Seva First Innovation Challenge"
                    className="size-11 rounded-md bg-white object-contain p-1"
                    height={48}
                    src="/images/logo.webp"
                    width={48}
                  />
                  <div className="min-w-0">
                    <p className="text-xl font-black leading-none">SFIC</p>
                    <p className="mt-1 text-xs font-semibold text-blue-100">
                      Participant Workspace
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Close navigation"
                  className="grid size-10 place-items-center rounded-lg text-blue-100 hover:bg-white/10"
                  onClick={() => setIsNavOpen(false)}
                  type="button"
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="grid gap-2 px-3">
                {navItems.map(([label, Icon, href]) => {
                  const active = pathname === href || pathname.startsWith(href);

                  return (
                    <Link
                      className={`flex min-h-12 items-center gap-4 rounded-lg px-5 py-3 text-left text-sm font-semibold transition ${
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
                <button
                  className="flex min-h-12 items-center gap-4 rounded-lg px-5 py-3 text-left text-sm font-semibold text-blue-100 transition hover:bg-white/10"
                  onClick={logout}
                  type="button"
                >
                  <LogOut size={21} />
                  <span>Logout</span>
                </button>
              </nav>
            </aside>
          </div>
        )}

        <main
          className={`flex min-w-0 flex-col ${
            naturalScroll ? "min-h-dvh" : "h-dvh overflow-hidden"
          }`}
        >
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2 md:px-6">
            <div className="flex min-h-14 items-center gap-3">
              <button
                aria-label="Open navigation"
                className="grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-[#0b1f3a] hover:bg-slate-50 lg:hidden"
                onClick={() => setIsNavOpen(true)}
                type="button"
              >
                <Menu size={23} />
              </button>

              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f7eee6] to-[#edf2f7] text-base font-black text-[#0b1f3a] ring-1 ring-slate-100 sm:size-14">
                {initials(participant.memberName)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-black leading-tight tracking-normal text-[#0b1f3a] sm:text-lg">
                  {participant.memberName}
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-500 sm:text-sm">
                  {participant.role}
                </p>
                {participant.emailVerified ? (
                  <p className="mt-0.5 text-xs font-black leading-tight text-[#138808] sm:text-sm">
                    Verified
                  </p>
                ) : (
                  <button
                    className="mt-0.5 block text-left text-xs font-black leading-tight text-red-600 underline-offset-4 hover:underline disabled:cursor-wait disabled:text-red-400 sm:text-sm"
                    disabled={isVerificationLinkSending}
                    onClick={requestVerificationLink}
                    type="button"
                  >
                    {isVerificationLinkSending
                      ? "Sending verification link..."
                      : "Click to verify your profile"}
                  </button>
                )}
                {verificationLinkMessage && !participant.emailVerified ? (
                  <p className="mt-1 text-xs font-semibold leading-tight text-slate-500">
                    {verificationLinkMessage}
                  </p>
                ) : null}
                <span className="sr-only">
                  {title}. {eyebrow ?? "Seva First Innovation Challenge - Eastern Region"}
                </span>
              </div>

              <div className="ml-auto flex items-center">
                <button
                  aria-label="Logout"
                  className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 sm:size-10"
                  onClick={logout}
                  type="button"
                >
                  <LogOut size={22} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </header>

          <div className={naturalScroll ? "" : "min-h-0 flex-1 overflow-y-auto"}>
            <div className="grid gap-4 p-4 md:p-7">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
