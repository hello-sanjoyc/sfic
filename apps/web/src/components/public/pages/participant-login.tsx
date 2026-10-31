"use client";

import { ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { getSiteContent } from "@/content";
import type { Locale } from "@/i18n/locales";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type LoginResponse = {
  redirectTo: string;
  session: {
    token: string;
  };
};

export function ParticipantLoginPage({ locale = "en" }: { locale?: Locale }) {
  const router = useRouter();
  const content = getSiteContent(locale).participantLogin;
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = identifier.trim().length > 0 && password.trim().length > 0;

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!canSubmit) {
      setError(content.errors.identifierPasswordRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.post<LoginResponse>(
        endpoints.participants.login,
        {
          identifier: identifier.trim(),
          language: locale,
          password,
        },
      );

      localStorage.setItem(PARTICIPANT_TOKEN_KEY, result.session.token);
      router.push(result.redirectTo || "/participants/applications");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : content.errors.loginFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="pt-2">
          <div className="h-1.5 w-20 bg-[#ff9933]" />
          <h1 className="mt-8 text-4xl font-black tracking-normal text-[#0b1f3a] sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            {content.description}
          </p>
          <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Mail className="text-[#138808]" size={18} />
              {content.features[0]}
            </span>
            <span className="inline-flex items-center gap-2">
              <KeyRound className="text-[#ff9933]" size={18} />
              {content.features[1]}
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="text-[#000080]" size={18} />
              {content.features[2]}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:mt-32">
          <form className="grid gap-5" onSubmit={login}>
            <label className="text-sm font-bold text-slate-700">
              {content.identifier}
              <input
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  setError("");
                }}
                type="text"
                value={identifier}
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              {content.password}
              <input
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                type="password"
                value={password}
              />
            </label>
            <div className="flex justify-end">
              <Link
                className="text-sm font-bold text-[#000080] transition hover:text-[#ff9933]"
                href={`/${locale}/participants/forgot-password`}
              >
                {content.forgotPassword}
              </Link>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              disabled={isSubmitting || !canSubmit}
              type="submit"
            >
              {isSubmitting ? content.signingIn : content.continue}
              <ArrowRight className="ml-2" size={16} />
            </button>
          </form>

          {error && (
            <p className="mt-5 text-sm font-semibold text-red-700">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
