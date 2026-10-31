"use client";

import { ArrowLeft, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getSiteContent } from "@/content";
import type { Locale } from "@/i18n/locales";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export function ParticipantForgotPasswordPage({
  locale = "en",
}: {
  locale?: Locale;
}) {
  const content = getSiteContent(locale).participantLogin.forgotPasswordScreen;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const requestReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canSubmit) {
      setError(content.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(endpoints.participants.forgotPassword, {
        email: email.trim(),
        language: locale,
      });
      setMessage(content.success);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : content.failed,
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
          <Link
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#000080] transition hover:text-[#ff9933]"
            href={`/${locale}/participants/login`}
          >
            <ArrowLeft size={16} />
            {content.backToLogin}
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:mt-32">
          <form className="grid gap-5" onSubmit={requestReset}>
            <label className="text-sm font-bold text-slate-700">
              {content.email}
              <span className="mt-1 flex rounded-md border border-slate-300 bg-white px-3 py-3 transition focus-within:border-[#000080] focus-within:ring-2 focus-within:ring-[#000080]/20">
                <Mail className="mr-2 mt-0.5 text-slate-400" size={18} />
                <input
                  className="w-full bg-transparent text-sm font-normal outline-none"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  type="email"
                  value={email}
                />
              </span>
            </label>
            <button
              className="inline-flex items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              disabled={isSubmitting || !canSubmit}
              type="submit"
            >
              {isSubmitting ? content.sending : content.sendLink}
              <Send className="ml-2" size={16} />
            </button>
          </form>

          {message && (
            <p className="mt-5 text-sm font-semibold text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-5 text-sm font-semibold text-red-700">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
