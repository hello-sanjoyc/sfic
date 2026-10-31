"use client";

import {
    ArrowRight,
    Briefcase,
    CheckCircle2,
    FileText,
    KeyRound,
    Mail,
    MapPin,
    Pencil,
    ShieldCheck,
    Tags,
    Upload,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/i18n/locales";
import { apiClient } from "@/lib/api-client";
import { appConfig } from "@/lib/app-config";
import { endpoints } from "@/lib/endpoints";
import {
    JURY_LOCALE_KEY,
    JURY_SESSION_KEY,
    JuryShell,
} from "@/components/jury/common/jury-shell";

const categoryTagStyles = [
    "border-blue-200 bg-blue-50 text-blue-700",
    "border-emerald-200 bg-emerald-50 text-emerald-700",
    "border-orange-200 bg-orange-50 text-orange-700",
    "border-violet-200 bg-violet-50 text-violet-700",
    "border-rose-200 bg-rose-50 text-rose-700",
    "border-amber-200 bg-amber-50 text-amber-700",
];

const inputClass =
    "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20";

// Same field styling as the admin login form.
const loginInputClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20";

type JuryProfileForm = {
    address: string;
    avatar: File | null;
    city: string;
    cv: File | null;
    designation: string;
    organisationName: string;
    pinCode: string;
    professionalExperienceYears: string;
};

function validateJuryProfile(
    form: JuryProfileForm,
    limits: { avatarKb: number; cvMb: number },
) {
    const errors: Record<string, string> = {};
    if (form.address.trim().length < 2) errors.address = "Enter your address.";
    if (form.city.trim().length < 2) errors.city = "Enter your city.";
    if (!/^\d{6}$/.test(form.pinCode))
        errors.pinCode = "Enter a valid 6-digit PIN code.";
    if (form.organisationName.trim().length < 2)
        errors.organisationName = "Enter your organisation or institute name.";
    if (form.designation.trim().length < 2)
        errors.designation = "Enter your designation.";
    if (
        !/^\d+$/.test(form.professionalExperienceYears) ||
        Number(form.professionalExperienceYears) > 100
    )
        errors.professionalExperienceYears = "Enter whole years from 0 to 100.";
    if (form.cv) {
        if (
            form.cv.type !== "application/pdf" &&
            !form.cv.name.toLowerCase().endsWith(".pdf")
        )
            errors.cv = "CV must be a PDF file.";
        else if (form.cv.size > limits.cvMb * 1024 * 1024)
            errors.cv = `CV must not exceed ${limits.cvMb} MB.`;
    }
    if (form.avatar) {
        if (!["image/jpeg", "image/png"].includes(form.avatar.type))
            errors.avatar = "Avatar must be a JPG or PNG image.";
        else if (form.avatar.size > limits.avatarKb * 1024)
            errors.avatar = `Avatar must not exceed ${limits.avatarKb} KB.`;
    }
    return errors;
}

const juryLoginContent: Record<
    Locale,
    {
        code: string;
        codeHelp: string;
        codePlaceholder: string;
        description: string;
        email: string;
        emailHelp: string;
        emailPlaceholder: string;
        featureEmail: string;
        featureOtp: string;
        featureWorkspace: string;
        login: string;
        send: string;
        sendFailed: string;
        verify: string;
        verifyFailed: string;
    }
> = {
    en: {
        login: "Jury Login",
        description:
            "Access the jury workspace using your authorised email address and a 6 digit verification code.",
        email: "Email Address",
        emailHelp: "Enter the email address assigned to your jury profile.",
        emailPlaceholder: "e.g. jury@example.com",
        featureEmail: "Email based login",
        featureOtp: "Verification code required",
        featureWorkspace: "Jury workspace access after verification",
        code: "Verification Code",
        codeHelp:
            "Enter the 6 digit verification code sent to your email address.",
        codePlaceholder: "Enter 6-digit code",
        send: "Generate Verification Code",
        verify: "Continue to Jury Workspace",
        sendFailed: "Unable to send the verification code. Please try again.",
        verifyFailed: "Unable to verify the code.",
    },
    bn: {
        login: "জুরি লগইন",
        description:
            "আপনার অনুমোদিত ইমেল ঠিকানা এবং ৬ সংখ্যার যাচাইকরণ কোড ব্যবহার করে জুরি ওয়ার্কস্পেসে প্রবেশ করুন।",
        email: "ইমেল ঠিকানা",
        emailHelp: "আপনার জুরি প্রোফাইলে নির্ধারিত ইমেল ঠিকানাটি লিখুন।",
        emailPlaceholder: "যেমন jury@example.com",
        featureEmail: "ইমেল-ভিত্তিক লগইন",
        featureOtp: "যাচাইকরণ কোড প্রয়োজন",
        featureWorkspace: "যাচাইয়ের পরে জুরি ওয়ার্কস্পেসে প্রবেশ",
        code: "যাচাইকরণ কোড",
        codeHelp: "আপনার ইমেলে পাঠানো ৬ সংখ্যার যাচাইকরণ কোডটি লিখুন।",
        codePlaceholder: "৬ সংখ্যার কোড লিখুন",
        send: "যাচাইকরণ কোড তৈরি করুন",
        verify: "জুরি ওয়ার্কস্পেসে এগিয়ে যান",
        sendFailed: "যাচাইকরণ কোড পাঠানো যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        verifyFailed: "কোডটি যাচাই করা যায়নি।",
    },
    hi: {
        login: "जूरी लॉगिन",
        description:
            "अपने अधिकृत ईमेल पते और 6 अंकों के सत्यापन कोड का उपयोग करके जूरी कार्यक्षेत्र में प्रवेश करें।",
        email: "ईमेल पता",
        emailHelp: "अपनी जूरी प्रोफ़ाइल के लिए निर्दिष्ट ईमेल पता दर्ज करें।",
        emailPlaceholder: "उदाहरण: jury@example.com",
        featureEmail: "ईमेल-आधारित लॉगिन",
        featureOtp: "सत्यापन कोड आवश्यक",
        featureWorkspace: "सत्यापन के बाद जूरी कार्यक्षेत्र तक पहुंच",
        code: "सत्यापन कोड",
        codeHelp: "अपने ईमेल पर भेजा 6 अंकों का सत्यापन कोड दर्ज करें।",
        codePlaceholder: "6 अंकों का कोड दर्ज करें",
        send: "सत्यापन कोड जनरेट करें",
        verify: "जूरी कार्यक्षेत्र में आगे बढ़ें",
        sendFailed: "सत्यापन कोड नहीं भेजा जा सका। कृपया पुनः प्रयास करें।",
        verifyFailed: "कोड सत्यापित नहीं हो सका।",
    },
};

const juryVerificationContent: Record<
    Locale,
    {
        complete: string;
        description: string;
        missingToken: string;
        note: string;
        title: string;
        unableToVerify: string;
        verified: string;
        verifying: string;
        verifyFailed: string;
    }
> = {
    en: {
        verified: "EMAIL VERIFIED",
        title: "Welcome to the jury panel",
        description:
            "Your jury profile is active. Complete your professional profile before reviewing challenge submissions.",
        complete: "Complete profile",
        note: "Verification is visual only until the invitation API is connected.",
        missingToken: "Verification token is missing.",
        unableToVerify: "Unable to verify invitation",
        verifying: "Verifying your jury invitation…",
        verifyFailed: "Unable to verify invitation.",
    },
    bn: {
        verified: "ইমেল যাচাই সম্পন্ন",
        title: "জুরি প্যানেলে স্বাগতম",
        description:
            "আপনার জুরি প্রোফাইল সক্রিয় হয়েছে। চ্যালেঞ্জের আবেদন পর্যালোচনার আগে আপনার পেশাগত প্রোফাইল সম্পূর্ণ করুন।",
        complete: "প্রোফাইল সম্পূর্ণ করুন",
        note: "আমন্ত্রণ API যুক্ত না হওয়া পর্যন্ত এটি শুধুমাত্র ভিজ্যুয়াল যাচাই।",
        missingToken: "যাচাইকরণ টোকেন পাওয়া যায়নি।",
        unableToVerify: "আমন্ত্রণ যাচাই করা যায়নি",
        verifying: "আপনার জুরি আমন্ত্রণ যাচাই করা হচ্ছে…",
        verifyFailed: "আমন্ত্রণ যাচাই করা যায়নি।",
    },
    hi: {
        verified: "ईमेल सत्यापित",
        title: "जूरी पैनल में आपका स्वागत है",
        description:
            "आपकी जूरी प्रोफ़ाइल सक्रिय है। चुनौती प्रस्तावों की समीक्षा से पहले अपनी पेशेवर प्रोफ़ाइल पूरी करें।",
        complete: "प्रोफ़ाइल पूरी करें",
        note: "आमंत्रण API जुड़ने तक यह केवल दृश्य सत्यापन है।",
        missingToken: "सत्यापन टोकन उपलब्ध नहीं है।",
        unableToVerify: "आमंत्रण सत्यापित नहीं हो सका",
        verifying: "आपका जूरी आमंत्रण सत्यापित किया जा रहा है…",
        verifyFailed: "आमंत्रण सत्यापित नहीं हो सका।",
    },
};

export function JuryLoginPage({
    locale = "en",
    portalPath = "/jury",
}: {
    locale?: Locale;
    portalPath?: string;
}) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const content = juryLoginContent[locale];
    useEffect(() => {
        try {
            localStorage.setItem(JURY_LOCALE_KEY, locale);
        } catch {
            /* the language preference is optional */
        }
    }, [locale]);
    const canSend = /^\S+@\S+\.\S+$/.test(email);
    const verify = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(code)) return;
        setError("");
        setIsSubmitting(true);
        try {
            const result = await apiClient.post<{
                jury: {
                    email: string;
                    full_name: string;
                    profile_completed_at?: string | null;
                };
                session: { token: string };
            }>(endpoints.jury.verifyLogin, { code, email });
            const profileCompleted = Boolean(result.jury.profile_completed_at);
            localStorage.setItem(
                JURY_SESSION_KEY,
                JSON.stringify({
                    email: result.jury.email,
                    name: result.jury.full_name,
                    token: result.session.token,
                    verified: true,
                    profileCompleted,
                }),
            );
            router.push(
                `${portalPath}/${profileCompleted ? "dashboard" : "profile"}`,
            );
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : content.verifyFailed,
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    const requestCode = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSend) return;
        setError("");
        setIsSubmitting(true);
        try {
            await apiClient.post(endpoints.jury.login, {
                email,
                language: locale,
            });
            setCodeSent(true);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : content.sendFailed,
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
                        {content.login}
                    </h1>
                    <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                        {content.description}
                    </p>
                    <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-2">
                            <Mail className="text-[#138808]" size={18} />
                            {content.featureEmail}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <KeyRound className="text-[#ff9933]" size={18} />
                            {content.featureOtp}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <ShieldCheck className="text-[#000080]" size={18} />
                            {content.featureWorkspace}
                        </span>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:mt-32">
                    <form
                        className="grid gap-5"
                        onSubmit={codeSent ? verify : requestCode}
                    >
                        <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                            <label className="text-sm font-bold text-slate-700">
                                {content.email}
                                <input
                                    autoComplete="email"
                                    className={loginInputClass}
                                    onChange={(event) => {
                                        setEmail(event.target.value);
                                        setMessage("");
                                        setError("");
                                    }}
                                    placeholder={content.emailPlaceholder}
                                    type="email"
                                    value={email}
                                />
                            </label>
                            {codeSent && (
                                <label className="text-sm font-bold text-slate-700">
                                    {content.code}
                                    <input
                                        autoComplete="one-time-code"
                                        className={loginInputClass}
                                        inputMode="numeric"
                                        maxLength={6}
                                        onChange={(event) =>
                                            setCode(
                                                event.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                ),
                                            )
                                        }
                                        placeholder={content.codePlaceholder}
                                        value={code}
                                    />
                                </label>
                            )}
                        </div>
                        <p className="text-sm leading-6 text-slate-600">
                            {codeSent ? content.codeHelp : content.emailHelp}
                        </p>
                        <button
                            className="inline-flex items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                            disabled={
                                isSubmitting ||
                                (codeSent ? !/^\d{6}$/.test(code) : !canSend)
                            }
                            type="submit"
                        >
                            {codeSent ? content.verify : content.send}
                            <ArrowRight className="ml-2" size={16} />
                        </button>
                    </form>
                    {(message || error) && (
                        <p
                            className={`mt-5 text-sm font-semibold ${error ? "text-red-700" : "text-[#138808]"}`}
                        >
                            {error || message}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

type JuryInvitationVerification = {
    jury: { email: string; full_name: string };
    session: { token: string };
};

const invitationVerifications = new Map<
    string,
    Promise<JuryInvitationVerification>
>();

export function JuryVerificationPage({
    locale = "en",
    portalPath = "/jury",
}: {
    locale?: Locale;
    portalPath?: string;
}) {
    const content = juryVerificationContent[locale];
    const params = useSearchParams();
    const [error, setError] = useState("");
    const [ready, setReady] = useState(false);
    const token = params.get("token");
    useEffect(() => {
        if (!token) {
            setError(content.missingToken);
            return;
        }
        let cancelled = false;
        // The invitation token is single-use, so a re-run of this effect
        // (Strict Mode, search-params identity change) must share the first request.
        let verification = invitationVerifications.get(token);
        if (!verification) {
            verification = apiClient.post<JuryInvitationVerification>(
                endpoints.jury.verifyEmail,
                { token },
            );
            invitationVerifications.set(token, verification);
        }
        verification
            .then((result) => {
                localStorage.setItem(
                    JURY_SESSION_KEY,
                    JSON.stringify({
                        email: result.jury.email,
                        name: result.jury.full_name,
                        token: result.session.token,
                        verified: true,
                        profileCompleted: false,
                    }),
                );
                if (!cancelled) setReady(true);
            })
            .catch((requestError) => {
                if (cancelled) return;
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : content.verifyFailed,
                );
            });
        return () => {
            cancelled = true;
        };
    }, [content, token]);
    return (
        <PortalFrame>
            <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={36} />
                </div>
                <p className="mt-6 text-sm font-bold tracking-[.14em] text-emerald-700">
                    {content.verified}
                </p>
                <h1 className="mt-3 text-3xl font-black text-[#0b1f3a]">
                    {error ? content.unableToVerify : content.title}
                </h1>
                <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">
                    {error ||
                        (ready
                            ? content.description
                            : content.verifying)}
                </p>
                {ready && (
                    <Link
                        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        href={`${portalPath}/profile`}
                    >
                        {content.complete} <ArrowRight size={17} />
                    </Link>
                )}
                <p className="mt-5 text-xs text-slate-500">{content.note}</p>
            </div>
        </PortalFrame>
    );
}

function JuryProfileCompletionForm({
    initialValues,
    isEditing = false,
    onEditSaved,
}: {
    initialValues?: Partial<Omit<JuryProfileForm, "cv" | "avatar">>;
    isEditing?: boolean;
    onEditSaved?: () => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scope, setScope] = useState<"State" | "District">("State");
    const [stateName, setStateName] = useState("");
    const [districtName, setDistrictName] = useState("");
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [uploadLimits, setUploadLimits] = useState({
        avatarKb: 200,
        cvMb: 5,
    });
    const [form, setForm] = useState<JuryProfileForm>({
        address: initialValues?.address ?? "",
        avatar: null,
        city: initialValues?.city ?? "",
        cv: null,
        designation: initialValues?.designation ?? "",
        organisationName: initialValues?.organisationName ?? "",
        pinCode: initialValues?.pinCode ?? "",
        professionalExperienceYears: initialValues?.professionalExperienceYears ?? "",
    });
    useEffect(() => {
        let mounted = true;
        const session = JSON.parse(
            localStorage.getItem(JURY_SESSION_KEY) ?? "{}",
        );
        if (!session.token) {
            setError("Please sign in to complete your jury profile.");
            setIsLoadingProfile(false);
            return;
        }
        apiClient
            .get<{
                jury: {
                    district_name?: string | null;
                    scope?: "State" | "District";
                    state_name?: string;
                };
            }>(endpoints.jury.profile, {
                headers: { Authorization: `Bearer ${session.token}` },
            })
            .then((result) => {
                if (!mounted) return;
                setScope(
                    result.jury.scope === "District" ? "District" : "State",
                );
                setStateName(result.jury.state_name ?? "");
                setDistrictName(result.jury.district_name ?? "");
            })
            .catch((requestError) => {
                if (mounted)
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : "Unable to load your jury profile.",
                    );
            })
            .finally(() => {
                if (mounted) setIsLoadingProfile(false);
            });
        return () => {
            mounted = false;
        };
    }, []);
    useEffect(() => {
        apiClient
            .get<Array<{ key: string; value: string }>>(
                endpoints.common.appSettings,
            )
            .then((settings) => {
                const values = new Map(
                    settings.map((setting) => [
                        setting.key,
                        Number(setting.value),
                    ]),
                );
                const cvMb = values.get("JURY_MAX_CV_SIZE");
                const avatarKb = values.get("JURY_MAX_AVATAR_SIZE");
                setUploadLimits({
                    cvMb:
                        typeof cvMb === "number" &&
                        Number.isFinite(cvMb) &&
                        cvMb > 0
                            ? cvMb
                            : 5,
                    avatarKb:
                        typeof avatarKb === "number" &&
                        Number.isFinite(avatarKb) &&
                        avatarKb > 0
                            ? avatarKb
                            : 200,
                });
            })
            .catch(() => {
                /* Safe defaults remain visible when settings are temporarily unavailable. */
            });
    }, []);
    const fieldErrors = useMemo(
        () => validateJuryProfile(form, uploadLimits),
        [form, uploadLimits],
    );
    const isFormValid = Object.keys(fieldErrors).length === 0;
    const isSubmitDisabled = isSubmitting || isLoadingProfile || !isFormValid;
    const updateForm = (
        field: keyof JuryProfileForm,
        value: string | File | null,
    ) =>
        setForm(
            (current) => ({ ...current, [field]: value }) as JuryProfileForm,
        );
    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const session = JSON.parse(
            localStorage.getItem(JURY_SESSION_KEY) ?? "{}",
        );
        if (!session.token) {
            setError("Please sign in to complete your jury profile.");
            return;
        }
        if (!isFormValid) return;
        setError("");
        setIsSubmitting(true);
        try {
            const headers = { Authorization: `Bearer ${session.token}` };
            await apiClient.put(
                endpoints.jury.profile,
                {
                    address: form.address,
                    city: form.city,
                    pinCode: form.pinCode,
                    organisationName: form.organisationName.trim(),
                    designation: form.designation.trim(),
                    professionalExperienceYears: Number(
                        form.professionalExperienceYears,
                    ),
                },
                { headers },
            );
            for (const [kind, file] of [
                ["cv", form.cv],
                ["avatar", form.avatar],
            ] as const) {
                if (file instanceof File && file.size > 0) {
                    const upload = new FormData();
                    upload.append("kind", kind);
                    upload.append("file", file);
                    await apiClient.post(
                        endpoints.jury.profileDocuments,
                        upload,
                        { headers },
                    );
                }
            }
            localStorage.setItem(
                JURY_SESSION_KEY,
                JSON.stringify({ ...session, profileCompleted: true }),
            );
            window.dispatchEvent(new Event("jury-profile-completed"));
            setSaved(true);
            if (isEditing && onEditSaved) {
                onEditSaved();
            } else {
                router.replace(
                    pathname.replace(/\/jury\/profile$/, "/jury/dashboard"),
                );
            }
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to save profile.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <PortalFrame>
            <div className="mx-auto max-w-4xl">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="font-bold tracking-[.16em] text-[#ff9933]">
                            JURY PROFILE
                        </p>
                        <h1 className="mt-2 text-3xl font-black text-[#0b1f3a]">
                            {isEditing ? "Edit your professional profile" : "Complete your professional profile"}
                        </h1>
                        <p className="mt-2 text-slate-600">
                            Your details help SFIC maintain a trusted and
                            well-matched jury panel.
                        </p>
                    </div>
                    {!isEditing && <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
                        Profile completion required
                    </span>}
                </div>
                <form className="mt-6 grid gap-6" onSubmit={submit}>
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            <MapPin size={20} className="text-blue-600" />{" "}
                            Address and jurisdiction
                        </h2>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <Field error={fieldErrors.address} label="Address">
                                <input
                                    className={inputClass}
                                    name="address"
                                    onChange={(event) =>
                                        updateForm(
                                            "address",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="House / street / locality"
                                    required
                                    value={form.address}
                                />
                            </Field>
                            <Field error={fieldErrors.city} label="City">
                                <input
                                    className={inputClass}
                                    name="city"
                                    onChange={(event) =>
                                        updateForm("city", event.target.value)
                                    }
                                    placeholder="Enter city"
                                    required
                                    value={form.city}
                                />
                            </Field>
                            <Field label="State">
                                <input
                                    className={`${inputClass} bg-slate-100`}
                                    disabled
                                    value={stateName}
                                />
                            </Field>
                            {scope === "District" && (
                                <Field label="District">
                                    <input
                                        className={`${inputClass} bg-slate-100`}
                                        disabled
                                        value={districtName}
                                    />
                                    <p className="mt-1 text-xs font-normal text-slate-500">
                                        Your assigned district is selected
                                        automatically.
                                    </p>
                                </Field>
                            )}
                            <Field error={fieldErrors.pinCode} label="PIN code">
                                <input
                                    className={inputClass}
                                    inputMode="numeric"
                                    maxLength={6}
                                    name="pinCode"
                                    onChange={(event) =>
                                        updateForm(
                                            "pinCode",
                                            event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                    placeholder="6-digit PIN code"
                                    required
                                    value={form.pinCode}
                                />
                            </Field>
                        </div>
                        {isLoadingProfile && (
                            <p className="mt-4 text-sm font-semibold text-slate-500">
                                Loading assigned jurisdiction…
                            </p>
                        )}
                    </section>
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            <UserRound size={20} className="text-blue-600" />{" "}
                            Professional information
                        </h2>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <Field
                                error={fieldErrors.organisationName}
                                label="Organisation / institute name"
                            >
                                <input
                                    className={inputClass}
                                    name="organisationName"
                                    onChange={(event) =>
                                        updateForm(
                                            "organisationName",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Enter organisation name"
                                    required
                                    value={form.organisationName}
                                />
                            </Field>
                            <Field
                                error={fieldErrors.designation}
                                label="Designation"
                            >
                                <input
                                    className={inputClass}
                                    name="designation"
                                    onChange={(event) =>
                                        updateForm(
                                            "designation",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Enter designation"
                                    required
                                    value={form.designation}
                                />
                            </Field>
                            <Field
                                error={fieldErrors.professionalExperienceYears}
                                label="Professional experience"
                            >
                                <div className="relative">
                                    <input
                                        className={inputClass}
                                        inputMode="numeric"
                                        maxLength={3}
                                        name="professionalExperienceYears"
                                        onChange={(event) =>
                                            updateForm(
                                                "professionalExperienceYears",
                                                event.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 3),
                                            )
                                        }
                                        pattern="[0-9]*"
                                        placeholder="Years of experience"
                                        required
                                        type="text"
                                        value={form.professionalExperienceYears}
                                    />
                                    <span className="pointer-events-none absolute right-3 top-5 text-sm text-slate-500">
                                        years
                                    </span>
                                </div>
                            </Field>
                        </div>
                    </section>
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            <FileText size={20} className="text-blue-600" />{" "}
                            Documents and avatar
                        </h2>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <UploadField
                                accept="application/pdf"
                                description={`PDF only, maximum ${uploadLimits.cvMb} MB`}
                                fieldName="cv"
                                label="Curriculum vitae (PDF, optional)"
                                file={form.cv}
                                onChange={(file) => updateForm("cv", file)}
                                error={fieldErrors.cv}
                            />
                            <UploadField
                                accept="image/png,image/jpeg"
                                description={`JPG or PNG, maximum ${uploadLimits.avatarKb} KB`}
                                fieldName="avatar"
                                label="Avatar (optional)"
                                file={form.avatar}
                                onChange={(file) => updateForm("avatar", file)}
                                error={fieldErrors.avatar}
                            />
                        </div>
                    </section>
                    <div className="flex flex-wrap justify-end gap-3">
                        {isEditing && onEditSaved && (
                            <button
                                className="rounded-md border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                                onClick={onEditSaved}
                                type="button"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            aria-disabled={isSubmitDisabled}
                            className={`inline-flex items-center gap-2 rounded-md bg-[#0b1f3a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 ${isSubmitDisabled ? "pointer-events-none" : ""}`}
                            disabled={isSubmitDisabled}
                            onClick={(event) => {
                                if (isSubmitDisabled) event.preventDefault();
                            }}
                            type="submit"
                        >
                            <CheckCircle2 size={18} /> {isEditing ? "Save changes" : "Save profile"}
                        </button>
                    </div>
                    {saved && (
                        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                            Profile saved successfully.
                        </p>
                    )}
                    {error && (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                            {error}
                        </p>
                    )}
                </form>
            </div>
        </PortalFrame>
    );
}

type JuryProfileDetails = {
    address?: string | null;
    avatar_original_file_name?: string | null;
    categories?: string[] | null;
    city?: string | null;
    cv_original_file_name?: string | null;
    designation?: string | null;
    district_name?: string | null;
    email?: string;
    full_name?: string;
    is_active?: boolean;
    mobile?: string;
    organisation_name?: string | null;
    pin_code?: string | null;
    professional_experience_years?: number | null;
    profile_completed_at?: string | null;
    scope?: "State" | "District";
    state_name?: string;
};

function profileValue(value: unknown) {
    return value === null || value === undefined || value === ""
        ? "Not available"
        : String(value);
}

function ProfileDetail({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-slate-500">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-bold text-[#0b1f3a]">
                {value}
            </p>
        </div>
    );
}

function ProfileCard({
    children,
    icon: Icon,
    title,
}: {
    children: React.ReactNode;
    icon: typeof MapPin;
    title: string;
}) {
    return (
        <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 p-4 sm:p-5">
                <Icon className="text-blue-600" size={21} />
                <h2 className="text-lg font-black">{title}</h2>
            </div>
            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
                {children}
            </div>
        </section>
    );
}

function DocumentLink({
    fileName,
    kind,
}: {
    fileName?: string | null;
    kind: "avatar" | "cv";
}) {
    const [downloadError, setDownloadError] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);

    if (!fileName) return <>Not available</>;

    const download = async () => {
        if (isDownloading) return;
        setDownloadError("");
        setIsDownloading(true);

        try {
            let token = "";
            try {
                token =
                    (
                        JSON.parse(
                            localStorage.getItem(JURY_SESSION_KEY) ?? "{}",
                        ) as { token?: string }
                    ).token ?? "";
            } catch {
                token = "";
            }

            const response = await fetch(
                `${appConfig.apiUrl}${endpoints.jury.profileDocument(kind)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            if (!response.ok) {
                let message = "Document could not be downloaded.";
                try {
                    message =
                        ((await response.json()) as { message?: string })
                            .message ?? message;
                } catch {
                    /* keep the generic message */
                }
                throw new Error(message);
            }

            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (requestError) {
            setDownloadError(
                requestError instanceof Error
                    ? requestError.message
                    : "Document could not be downloaded.",
            );
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
            <button
                className="break-words text-left font-bold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDownloading}
                onClick={download}
                type="button"
            >
                {isDownloading ? "Downloading..." : fileName}
            </button>
            {downloadError && (
                <span className="mt-1 block text-xs font-semibold text-rose-600">
                    {downloadError}
                </span>
            )}
        </>
    );
}

function JuryProfileView({
    onEdit,
    profile,
}: {
    onEdit?: () => void;
    profile: JuryProfileDetails;
}) {
    return (
        <div className="grid gap-4">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="min-w-0">
                    <h2 className="break-words text-xl font-black text-[#0b1f3a]">
                        {profileValue(profile.full_name)}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {profile.scope === "District"
                            ? "District level jury"
                            : "State level jury"}
                    </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                    <CheckCircle2 size={16} />
                    {profile.is_active ? "Active" : "Inactive"}
                </span>
            </section>
            <ProfileCard icon={UserRound} title="Personal information">
                <ProfileDetail
                    label="Full name"
                    value={profileValue(profile.full_name)}
                />
                <ProfileDetail
                    label="Email address"
                    value={profileValue(profile.email)}
                />
                <ProfileDetail
                    label="Mobile phone"
                    value={profileValue(profile.mobile)}
                />
            </ProfileCard>
            <ProfileCard icon={MapPin} title="Address and jurisdiction">
                <ProfileDetail
                    label="Address"
                    value={profileValue(profile.address)}
                />
                <ProfileDetail
                    label="City"
                    value={profileValue(profile.city)}
                />
                <ProfileDetail
                    label="State"
                    value={profileValue(profile.state_name)}
                />
                {profile.scope === "District" && (
                    <ProfileDetail
                        label="District"
                        value={profileValue(profile.district_name)}
                    />
                )}
                <ProfileDetail
                    label="PIN code"
                    value={profileValue(profile.pin_code)}
                />
            </ProfileCard>
            <ProfileCard icon={Briefcase} title="Professional information">
                <ProfileDetail
                    label="Organisation / institute name"
                    value={profileValue(profile.organisation_name)}
                />
                <ProfileDetail
                    label="Designation"
                    value={profileValue(profile.designation)}
                />
                <ProfileDetail
                    label="Professional experience"
                    value={
                        profile.professional_experience_years === null ||
                        profile.professional_experience_years === undefined
                            ? "Not available"
                            : `${profile.professional_experience_years} ${profile.professional_experience_years === 1 ? "year" : "years"}`
                    }
                />
            </ProfileCard>
            <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-200 p-4 sm:p-5">
                    <Tags className="text-blue-600" size={21} />
                    <h2 className="text-lg font-black">Assigned categories</h2>
                </div>
                <div className="p-4 sm:p-5">
                    <p className="text-xs font-bold uppercase text-slate-500">Challenge categories</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {profile.categories && profile.categories.length > 0 ? (
                            profile.categories.map((category, index) => (
                                <span
                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${categoryTagStyles[index % categoryTagStyles.length]}`}
                                    key={category}
                                >
                                    {category}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm font-bold text-[#0b1f3a]">Not available</span>
                        )}
                    </div>
                </div>
            </section>
            <ProfileCard icon={FileText} title="Documents">
                <ProfileDetail
                    label="Curriculum vitae (PDF)"
                    value={
                        <DocumentLink
                            fileName={profile.cv_original_file_name}
                            kind="cv"
                        />
                    }
                />
            </ProfileCard>
            {onEdit && (
                <div className="flex justify-end">
                    <button
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                        onClick={onEdit}
                        type="button"
                    >
                        <Pencil size={15} /> Edit profile
                    </button>
                </div>
            )}
        </div>
    );
}

export function JuryProfilePage() {
    const [profile, setProfile] = useState<JuryProfileDetails | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [profileKey, setProfileKey] = useState(0);

    useEffect(() => {
        let mounted = true;
        let token = "";
        try {
            token =
                (
                    JSON.parse(
                        localStorage.getItem(JURY_SESSION_KEY) ?? "{}",
                    ) as { token?: string }
                ).token ?? "";
        } catch {
            token = "";
        }

        setIsLoading(true);
        apiClient
            .get<{ jury: JuryProfileDetails }>(endpoints.jury.profile, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((result) => {
                if (mounted) setProfile(result.jury);
            })
            .catch((requestError) => {
                if (mounted)
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : "Unable to load your jury profile.",
                    );
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [profileKey]);

    // Active jury members with a completed profile see their saved details;
    // the completion form is only shown until the profile has been completed.
    const isCompleted = Boolean(
        profile?.is_active && profile.profile_completed_at,
    );

    const handleEditSaved = () => {
        setIsEditing(false);
        setProfileKey((k) => k + 1);
    };

    return (
        <JuryShell
            eyebrow={
                isEditing
                    ? "Update your professional profile"
                    : isCompleted
                      ? "Your jury profile details"
                      : "Complete your professional profile"
            }
            title="Profile"
        >
            {isLoading && (
                <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
                    Loading profile...
                </section>
            )}
            {!isLoading && error && !profile && (
                <section className="rounded-lg border border-rose-200 bg-white p-8 text-center text-sm font-semibold text-rose-600 shadow-sm">
                    {error}
                </section>
            )}
            {!isLoading && profile && (
                isEditing ? (
                    <JuryProfileCompletionForm
                        initialValues={{
                            address: profile.address ?? "",
                            city: profile.city ?? "",
                            designation: profile.designation ?? "",
                            organisationName: profile.organisation_name ?? "",
                            pinCode: profile.pin_code ?? "",
                            professionalExperienceYears: profile.professional_experience_years?.toString() ?? "",
                        }}
                        isEditing
                        onEditSaved={handleEditSaved}
                    />
                ) : isCompleted ? (
                    <JuryProfileView
                        onEdit={() => setIsEditing(true)}
                        profile={profile}
                    />
                ) : (
                    <JuryProfileCompletionForm />
                )
            )}
        </JuryShell>
    );
}

function PortalFrame({ children }: { children: React.ReactNode }) {
    return (
        <section className="min-h-[calc(100vh-12rem)] bg-slate-50 px-4 py-12 sm:px-6 lg:py-16">
            <div className="mx-auto max-w-6xl">{children}</div>
        </section>
    );
}
function Field({
    children,
    error,
    label,
}: {
    children: React.ReactNode;
    error?: string;
    label: string;
}) {
    return (
        <label className="text-sm font-bold text-slate-700">
            {label}
            {children}
            {error && (
                <p className="mt-2 text-xs font-normal text-red-700">{error}</p>
            )}
        </label>
    );
}
function UploadField({
    accept,
    description,
    error,
    file,
    fieldName,
    label,
    onChange,
    required = false,
}: {
    accept: string;
    description: string;
    error?: string;
    file: File | null;
    fieldName: string;
    label: string;
    onChange: (file: File | null) => void;
    required?: boolean;
}) {
    return (
        <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-5 transition hover:border-blue-400 hover:bg-blue-50/30">
            <input
                accept={accept}
                className="sr-only"
                name={fieldName}
                onChange={(event) => onChange(event.target.files?.[0] ?? null)}
                required={required}
                type="file"
            />
            <Upload className="text-blue-600" size={23} />
            <p className="mt-3 font-bold text-slate-800">{label}</p>
            <p className="mt-1 text-sm text-slate-500">
                {file?.name || description}
            </p>
            {error && (
                <p className="mt-2 text-xs font-normal text-red-700">{error}</p>
            )}
        </label>
    );
}
