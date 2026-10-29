"use client";

import { ArrowRight, FileText, RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { getSiteContent } from "@/content";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import {
    type AppSettingsMap,
    getAppSettings,
    registrationAvailability,
    settingsMap,
} from "@/lib/registration-settings";

const guidelinesPdfByLocale: Record<string, string> = {
    bn: "/documents/SFIC-Guidelines-BN.pdf",
    en: "/documents/SFIC-Guidelines-EN.pdf",
    hi: "/documents/SFIC-Guidelines-HI.pdf",
};

const participantCategories = [
    {
        descriptionKey: "juniorDescription",
        labelKey: "junior",
        value: "Junior",
    },
    {
        descriptionKey: "openDescription",
        labelKey: "open",
        value: "Open",
    },
] as const;

type RegistrationResponse = {
    redirectTo: string;
    session: {
        token: string;
    };
};

type FormValues = {
    captchaAnswer: string;
    confirmPassword: string;
    dateOfBirth: string;
    email: string;
    fullName: string;
    gender: string;
    mobile: string;
    participantCategory: string;
    password: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;
type RegisterContent = ReturnType<typeof getSiteContent>["register"];

const applicationClosingDate = new Date(Date.UTC(2026, 9, 30));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createCaptcha() {
    const left = Math.floor(10 + Math.random() * 40);
    const right = Math.floor(10 + Math.random() * 40);

    return {
        answer: String(left + right),
        label: `${left} + ${right}`,
    };
}

function formatDateForApi(value: string) {
    if (!value) return "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;

    const [year, month, day] = value.split("-");

    return year && month && day ? `${day}-${month}-${year}` : "";
}

function formatDateOfBirthInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    return [day, month, year].filter(Boolean).join("-");
}

function parseDateOfBirth(value: string) {
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() !== Number(year) ||
        date.getUTCMonth() + 1 !== Number(month) ||
        date.getUTCDate() !== Number(day) ||
        date > applicationClosingDate
    ) {
        return null;
    }

    return date;
}

function calculateAge(dateOfBirth: string) {
    const date = parseDateOfBirth(dateOfBirth);
    if (!date) return null;

    let age = applicationClosingDate.getUTCFullYear() - date.getUTCFullYear();
    const closingMonth = applicationClosingDate.getUTCMonth();
    const birthMonth = date.getUTCMonth();
    const birthdayPending =
        closingMonth < birthMonth ||
        (closingMonth === birthMonth &&
            applicationClosingDate.getUTCDate() < date.getUTCDate());

    if (birthdayPending) age -= 1;

    return age >= 0 ? age : null;
}

function validateRegistrationForm(
    form: FormValues,
    captchaAnswer: string,
    content: RegisterContent,
) {
    const errors: FieldErrors = {};

    if (!form.participantCategory) {
        errors.participantCategory = content.errors.participantCategory;
    }
    if (!form.fullName.trim()) {
        errors.fullName = content.errors.fullName;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
        errors.mobile = content.errors.mobile;
    }
    if (!emailPattern.test(form.email.trim().toLowerCase())) {
        errors.email = content.errors.email;
    }
    if (!parseDateOfBirth(form.dateOfBirth)) {
        errors.dateOfBirth = content.errors.dateOfBirth;
    }
    if (!form.gender) {
        errors.gender = content.errors.gender;
    }
    if (form.password.length < 8) {
        errors.password = content.errors.password;
    }
    if (form.confirmPassword !== form.password) {
        errors.confirmPassword = content.errors.confirmPassword;
    }
    if (!captchaAnswer || form.captchaAnswer.trim() !== captchaAnswer) {
        errors.captchaAnswer = content.errors.captchaAnswer;
    }

    return errors;
}

export function RegisterPageBody({
    children,
    id,
}: {
    children: ReactNode;
    id?: string;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const locale = pathname.split("/")[1] || "en";
    const content = getSiteContent(locale).register;
    const guidelinesPdfHref =
        guidelinesPdfByLocale[locale] ?? guidelinesPdfByLocale.en;
    const [appSettings, setAppSettings] = useState<AppSettingsMap>({});
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [settingsError, setSettingsError] = useState("");
    const registrationStatus = useMemo(
        () => registrationAvailability(appSettings, locale),
        [appSettings, locale],
    );

    useEffect(() => {
        let mounted = true;
        getAppSettings()
            .then(settingsMap)
            .then((settings) => {
                if (mounted) setAppSettings(settings);
            })
            .catch(() => {
                if (mounted)
                    setSettingsError(content.registrationStatus.settingsError);
            })
            .finally(() => {
                if (mounted) setIsSettingsLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const [captcha, setCaptcha] = useState(createCaptcha);
    const [form, setForm] = useState<FormValues>({
        captchaAnswer: "",
        confirmPassword: "",
        dateOfBirth: "",
        email: "",
        fullName: "",
        gender: "",
        mobile: "",
        participantCategory: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const age = useMemo(
        () => calculateAge(form.dateOfBirth),
        [form.dateOfBirth],
    );
    const fieldErrors = useMemo(
        () => validateRegistrationForm(form, captcha.answer, content),
        [captcha.answer, content, form],
    );
    const isFormValid = Object.keys(fieldErrors).length === 0;

    const updateField =
        (field: keyof typeof form) =>
        (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setForm((current) => ({
                ...current,
                [field]: event.target.value,
            }));
            setError("");
        };

    const regenerateCaptcha = () => {
        setCaptcha(createCaptcha());
        setForm((current) => ({ ...current, captchaAnswer: "" }));
        setError("");
    };

    const submitRegistration = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        setError("");

        if (!registrationStatus.canRegister) {
            setError(registrationStatus.message);
            return;
        }

        const nextFieldErrors = validateRegistrationForm(
            form,
            captcha.answer,
            content,
        );
        if (Object.keys(nextFieldErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await apiClient.post<RegistrationResponse>(
                endpoints.registrations.create,
                {
                    dateOfBirth: formatDateForApi(form.dateOfBirth),
                    email: form.email.trim().toLowerCase(),
                    fullName: form.fullName.trim(),
                    gender: form.gender,
                    language: locale,
                    mobile: form.mobile.replace(/\D/g, ""),
                    participantCategory: form.participantCategory,
                    password: form.password,
                },
            );

            localStorage.setItem(PARTICIPANT_TOKEN_KEY, result.session.token);
            router.push(result.redirectTo);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : content.errors.submitFailed,
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section
            className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
            id={id}
            tabIndex={id ? -1 : undefined}
        >
            <div className="mb-5 flex justify-end">
                <a
                    className="inline-flex items-center gap-2 rounded-full bg-[#000080] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b1f3a]"
                    href={guidelinesPdfHref}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <FileText size={16} aria-hidden="true" />
                    {content.showInfo}
                </a>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="border-b border-slate-200 pb-6">
                    <h1 className="text-2xl font-black tracking-normal text-[#0b1f3a] sm:text-3xl">
                        {content.formTitle}
                    </h1>
                    <p className="mt-6 text-base font-normal leading-7 text-slate-600">
                        {content.eligibility}
                    </p>
                </div>

                {isSettingsLoading ||
                settingsError ||
                !registrationStatus.canRegister ? (
                    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
                        <h2 className="text-xl font-bold text-[#0b1f3a]">
                            {content.registrationStatus.heading}
                        </h2>
                        <p className="mt-2 leading-7 text-slate-700">
                            {isSettingsLoading
                                ? content.registrationStatus.checking
                                : settingsError || registrationStatus.message}
                        </p>
                    </div>
                ) : (
                <form className="mt-6 grid gap-5" onSubmit={submitRegistration}>
                    <div>
                        <p className="text-sm font-black text-slate-700">
                            {content.participantCategory}
                        </p>
                        <div className="mt-4 grid gap-5 md:grid-cols-2">
                            {participantCategories.map((category) => {
                                const isSelected =
                                    form.participantCategory === category.value;

                                return (
                                    <label
                                        className={`flex min-h-24 cursor-pointer items-start gap-4 rounded-md border px-5 py-4 text-left transition hover:border-[#ff9933] ${
                                            isSelected
                                                ? "border-[#ff9933] bg-orange-50 ring-2 ring-[#ff9933]/20"
                                                : "border-slate-200 bg-slate-50"
                                        }`}
                                        key={category.value}
                                    >
                                        <input
                                            checked={isSelected}
                                            className="mt-1 size-5 border-slate-300 text-blue-600 focus:ring-blue-600"
                                            name="participantCategory"
                                            onChange={() => {
                                                setForm((current) => ({
                                                    ...current,
                                                    participantCategory:
                                                        category.value,
                                                }));
                                                setError("");
                                            }}
                                            type="radio"
                                            value={category.value}
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-black text-[#0b1f3a]">
                                                {content[category.labelKey]}
                                            </span>
                                            <span className="mt-4 block text-sm font-normal leading-6 text-slate-600">
                                                {
                                                    content[
                                                        category.descriptionKey
                                                    ]
                                                }
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {fieldErrors.participantCategory && (
                            <p className="mt-2 text-xs font-normal text-red-700">
                                {fieldErrors.participantCategory}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700">
                            {content.fullName}
                            <input
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                                onChange={updateField("fullName")}
                                type="text"
                                value={form.fullName}
                            />
                            {fieldErrors.fullName && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.fullName}
                                </span>
                            )}
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-bold text-slate-700">
                            {content.mobile}
                            <input
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                                inputMode="numeric"
                                maxLength={10}
                                onChange={(event) => {
                                    setForm((current) => ({
                                        ...current,
                                        mobile: event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 10),
                                    }));
                                    setError("");
                                }}
                                type="text"
                                value={form.mobile}
                            />
                            {fieldErrors.mobile && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.mobile}
                                </span>
                            )}
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            {content.email}
                            <input
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                                onChange={updateField("email")}
                                type="email"
                                value={form.email}
                            />
                            {fieldErrors.email && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.email}
                                </span>
                            )}
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-bold text-slate-700">
                            {content.dateOfBirth}
                            <div className="mt-1 flex overflow-hidden rounded-md border border-slate-300 bg-white transition focus-within:border-[#000080] focus-within:ring-2 focus-within:ring-[#000080]/20">
                                <input
                                    className="min-w-0 flex-1 bg-white px-3 py-3 text-sm font-normal outline-none placeholder:text-slate-400"
                                    inputMode="numeric"
                                    maxLength={10}
                                    onChange={(event) => {
                                        setForm((current) => ({
                                            ...current,
                                            dateOfBirth:
                                                formatDateOfBirthInput(
                                                    event.target.value,
                                                ),
                                        }));
                                        setError("");
                                    }}
                                    placeholder={
                                        content.placeholders.dateOfBirth
                                    }
                                    type="text"
                                    value={form.dateOfBirth}
                                />
                                <span className="grid w-28 place-items-center bg-slate-200 px-4 text-sm font-black text-[#0b1f3a]">
                                    {age === null
                                        ? content.ageYears
                                        : `${age} ${content.ageYears}`}
                                </span>
                            </div>
                            {fieldErrors.dateOfBirth && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.dateOfBirth}
                                </span>
                            )}
                            <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                                {content.ageCalculationInfo.replace(
                                    "{lastDateOfSubmission}",
                                    content.lastDateOfSubmission,
                                )}
                            </span>
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            {content.gender}
                            <select
                                className={`mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20 ${
                                    form.gender
                                        ? "text-slate-700"
                                        : "text-slate-500"
                                }`}
                                onChange={updateField("gender")}
                                value={form.gender}
                            >
                                <option value="">{content.gender}</option>
                                <option value="Male">
                                    {content.genderOptions.male}
                                </option>
                                <option value="Female">
                                    {content.genderOptions.female}
                                </option>
                                <option value="Others">
                                    {content.genderOptions.others}
                                </option>
                            </select>
                            {fieldErrors.gender && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.gender}
                                </span>
                            )}
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-bold text-slate-700">
                            {content.password}
                            <input
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                                minLength={8}
                                onChange={updateField("password")}
                                type="password"
                                value={form.password}
                            />
                            {fieldErrors.password && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.password}
                                </span>
                            )}
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            {content.confirmPassword}
                            <input
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                                minLength={8}
                                onChange={updateField("confirmPassword")}
                                type="password"
                                value={form.confirmPassword}
                            />
                            {fieldErrors.confirmPassword && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.confirmPassword}
                                </span>
                            )}
                        </label>
                    </div>

                    <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                        <label className="text-sm font-bold text-slate-700">
                            {content.captcha}:{" "}
                            <bdi
                                className="font-sans tabular-nums"
                                data-preserve-digits
                                dir="ltr"
                                lang="en"
                            >
                                {captcha.label}
                            </bdi>
                            <input
                                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 font-sans text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20"
                                dir="ltr"
                                inputMode="numeric"
                                lang="en"
                                onChange={(event) => {
                                    setForm((current) => ({
                                        ...current,
                                        captchaAnswer:
                                            event.target.value.replace(
                                                /[^0-9]/g,
                                                "",
                                            ),
                                    }));
                                    setError("");
                                }}
                                pattern="[0-9]*"
                                type="text"
                                value={form.captchaAnswer}
                            />
                            {fieldErrors.captchaAnswer && (
                                <span className="mt-2 block text-xs font-normal text-red-700">
                                    {fieldErrors.captchaAnswer}
                                </span>
                            )}
                        </label>
                        <button
                            className="inline-flex h-[50px] items-center justify-center gap-2 rounded-md border border-[#000080] px-4 text-sm font-bold text-[#000080] transition hover:bg-blue-50 md:mt-[27px]"
                            onClick={regenerateCaptcha}
                            type="button"
                        >
                            <RefreshCw size={16} />
                            {content.regenerateCaptcha}
                        </button>
                    </div>

                    {error && (
                        <p className="text-sm font-normal text-red-700">
                            {error}
                        </p>
                    )}

                    <button
                        className="inline-flex items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        disabled={isSubmitting || !isFormValid}
                        type="submit"
                    >
                        {isSubmitting ? content.saving : content.continue}
                        <ArrowRight className="ml-2" size={16} />
                    </button>
                </form>
                )}
            </div>

            <div className="mt-16 sm:mt-20">{children}</div>
        </section>
    );
}
