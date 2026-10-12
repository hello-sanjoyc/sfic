"use client";

import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/locales";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export function ParticipantResetPasswordPage({
  locale = "en",
}: {
  locale?: Locale;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit =
    token.length > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Password reset link is invalid or incomplete.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(endpoints.participants.resetPassword, {
        language: locale,
        password,
        token,
      });
      router.push(`/${locale}/participants/login?passwordReset=success`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Password could not be reset.",
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
            Reset Password
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Create a new password for your participant account.
          </p>
          <Link
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#000080] transition hover:text-[#ff9933]"
            href={`/${locale}/participants/login`}
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:mt-32">
          <form className="grid gap-5" onSubmit={resetPassword}>
            <label className="text-sm font-bold text-slate-700">
              New Password
              <span className="mt-1 flex rounded-md border border-slate-300 bg-white px-3 py-3 transition focus-within:border-[#000080] focus-within:ring-2 focus-within:ring-[#000080]/20">
                <KeyRound className="mr-2 mt-0.5 text-slate-400" size={18} />
                <input
                  className="w-full bg-transparent text-sm font-normal outline-none"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  type="password"
                  value={password}
                />
              </span>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Confirm Password
              <input
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                }}
                type="password"
                value={confirmPassword}
              />
            </label>
            <button
              className="inline-flex items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              disabled={isSubmitting || !canSubmit}
              type="submit"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
              <ArrowRight className="ml-2" size={16} />
            </button>
          </form>

          {!token && (
            <p className="mt-5 text-sm font-semibold text-red-700">
              Password reset link is invalid or incomplete.
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
