"use client";

import { ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/components/auth";
import { getSiteContent } from "@/content";
import type { Locale } from "@/i18n/locales";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const verificationTokenTtlMinutes = Number(
  process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? 10,
);

type LoginCodeResponse = {
  loginRequest: {
    email: string;
    resendAvailableAt: string;
  };
};

type VerifyLoginResponse = {
  participant: {
    applicationId: number;
    applicationNumber: string;
    email: string;
    memberId: number;
    memberName: string;
    role: string;
    status: string;
  };
  session: {
    token: string;
  };
};

function template(message: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value),
    message,
  );
}

function formatCountdown(
  totalSeconds: number,
  units: { minute: string; second: string },
) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} ${units.minute} ${seconds} ${units.second}`;
}

export function ParticipantLoginPage({ locale = "en" }: { locale?: Locale }) {
  const router = useRouter();
  const content = getSiteContent(locale).participantLogin;
  const registerContent = getSiteContent(locale).register;
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [hasSentCode, setHasSentCode] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const canRequestCode = emailPattern.test(email.trim().toLowerCase());
  const canVerify = /^\d{6}$/.test(verificationCode);
  const resendSecondsRemaining = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
    : 0;
  const canResend = hasSentCode && resendSecondsRemaining === 0 && !isSubmitting;
  const helperText = useMemo(
    () =>
      hasSentCode
        ? template(content.codeHelp, { email: email.trim() })
        : content.emailHelp,
    [content, email, hasSentCode],
  );

  useEffect(() => {
    if (!resendAvailableAt) return undefined;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  const requestVerificationCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canRequestCode) {
      setError(content.errors.email);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.post<LoginCodeResponse>(
        endpoints.participants.login,
        {
          email: email.trim().toLowerCase(),
          language: locale,
        },
      );

      setEmail(result.loginRequest.email);
      setHasSentCode(true);
      setVerificationCode("");
      setResendAvailableAt(new Date(result.loginRequest.resendAvailableAt).getTime());
      setNow(Date.now());
      setMessage(
        template(content.codeSent, {
          minutes: String(verificationTokenTtlMinutes),
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : content.errors.requestFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerificationCode = async () => {
    setError("");
    setMessage("");

    if (!canRequestCode) {
      setError(content.errors.email);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.post<LoginCodeResponse>(
        endpoints.participants.resendLoginCode,
        {
          email: email.trim().toLowerCase(),
          language: locale,
        },
      );

      setResendAvailableAt(new Date(result.loginRequest.resendAvailableAt).getTime());
      setNow(Date.now());
      setVerificationCode("");
      setMessage(content.codeResent);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : content.errors.resendFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canVerify) {
      setError(content.errors.verificationCode);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.post<VerifyLoginResponse>(
        endpoints.participants.verifyLogin,
        {
          code: verificationCode,
          email: email.trim().toLowerCase(),
          language: locale,
        },
      );

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          ...result,
          language: locale,
          loggedInAt: new Date().toISOString(),
        }),
      );
      router.push("/participants/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : content.errors.verifyFailed,
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
          <form
            className="grid gap-5"
            onSubmit={hasSentCode ? verifyCode : requestVerificationCode}
          >
            <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
              <label className="text-sm font-bold text-slate-700">
                {content.email}
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder={content.placeholders.email}
                  type="email"
                  value={email}
                />
              </label>
              {hasSentCode && (
                <label className="text-sm font-bold text-slate-700">
                  {content.verificationCode}
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => {
                      setVerificationCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                      setError("");
                      setMessage("");
                    }}
                    placeholder={content.placeholders.verificationCode}
                    type="text"
                    value={verificationCode}
                  />
                </label>
              )}
            </div>
            <p className="text-sm leading-6 text-slate-600">{helperText}</p>
            <button
              className="inline-flex items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              disabled={isSubmitting || (hasSentCode ? !canVerify : !canRequestCode)}
              type="submit"
            >
              {hasSentCode ? content.continueToDashboard : content.generateCode}
              <ArrowRight className="ml-2" size={16} />
            </button>
          </form>

          {hasSentCode && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center justify-center rounded-md border border-[#ff9933] px-4 py-2 text-sm font-bold text-[#0b1f3a] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
                disabled={!canResend}
                onClick={resendVerificationCode}
                type="button"
              >
                {content.resendVerificationCode}
              </button>
              {resendSecondsRemaining > 0 && (
                <p className="text-sm font-semibold text-slate-600">
                  {template(content.resendAvailableIn, {
                    time: formatCountdown(
                      resendSecondsRemaining,
                      registerContent.countdownUnits,
                    ),
                  })}
                </p>
              )}
            </div>
          )}

          {(message || error) && (
            <p
              className={`mt-5 text-sm font-semibold ${
                error ? "text-red-700" : "text-[#138808]"
              }`}
            >
              {error || message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
