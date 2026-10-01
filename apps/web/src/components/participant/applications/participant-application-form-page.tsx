"use client";

import {
    ArrowLeft,
    CheckCircle2,
    FileText,
    Lightbulb,
    LinkIcon,
    Plus,
    Send,
    Trash2,
    UploadCloud,
    X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    type ChangeEvent,
    type DragEvent,
    type FormEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { PARTICIPANT_TOKEN_KEY } from "@/components/auth";
import { ParticipantShell } from "@/components/participant/common/participant-shell";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type ProposalField = {
    field: keyof ProposalValues;
    guidance: string;
    label: string;
};

type TeamMember = {
    email: string;
    fullName: string;
    mobile: string;
};

type TeamMemberErrors = Partial<Record<keyof TeamMember, string>>;

type LocalizedText = {
    bn?: string | null;
    en?: string | null;
    hi?: string | null;
};

type ParticipantApplicationSummary = {
    applicationHash: string;
    challengeCategory: {
        id: number | null;
        name: LocalizedText;
    } | null;
};

type ParticipantApplicationsResponse = {
    applications: ParticipantApplicationSummary[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
};

type ChallengeCategoryOption = {
    id: number;
    name: LocalizedText;
};

type LookupOption = {
    id: number;
    name: LocalizedText;
    participantCategoryCodes?: string[];
    stateId?: number;
};

type CommonLookupsResponse = {
    districts: LookupOption[];
    instituteTypes: LookupOption[];
    states: LookupOption[];
};

type AppSetting = {
    key: string;
    value: string;
};

type AppSettingsMap = Record<string, string>;
type ParticipantRole = "applicant" | "team_member";

type ParticipantApplicationDetails = {
    applicationHash?: string | null;
    challengeCategory?: {
        id?: number | null;
        name?: LocalizedText | null;
    } | null;
    documents?: Array<{
        id?: number | string | null;
        documentType?: string | null;
        fileSizeBytes?: number | string | null;
        originalFileName?: string | null;
    }>;
    district?: {
        id?: number | null;
        name?: LocalizedText | null;
    } | null;
    instituteType?: {
        id?: number | null;
        name?: LocalizedText | null;
    } | null;
    participant?: {
        dateOfBirth?: string | null;
        email?: string | null;
        emailVerified?: boolean | null;
        fullName?: string | null;
        gender?: string | null;
        mobile?: string | null;
    } | null;
    participantCategory?: {
        code?: string | null;
        name?: LocalizedText | null;
    } | null;
    participationMode?: string | null;
    profile?: Record<string, string | number | null | undefined>;
    proposal?: Record<string, string | number | null | undefined>;
    state?: {
        id?: number | null;
        name?: LocalizedText | null;
    } | null;
    status?: string | null;
    teamMembers?: Array<{
        email?: string | null;
        fullName?: string | null;
        isApplicant?: boolean | null;
        mobile?: string | null;
    }>;
};

type ApplicationDetailsResponse = {
    application: ParticipantApplicationDetails;
};

type SubmitApplicationResponse = {
    application: {
        applicationHash: string;
        applicationNumber: string;
        id: number;
        participantId: number;
        status: string;
    };
    emailDelivery: {
        delivered: boolean;
        reason?: string;
    };
};

type ProposalValues = {
    beneficiaries: string;
    challengeCategory: string;
    costFunding: string;
    expectedImpact: string;
    implementationRoute: string;
    intellectualPropertyPublication: string;
    mentorAcknowledgeTo: string;
    participationMode: string;
    problemLocation: string;
    projectTimeline: string;
    proposedSolution: string;
    prototypePilot: string;
    scalability: string;
    technologyMethod: string;
    videoUrl: string;
};

type FormErrors = Partial<
    Record<keyof ProposalValues | "supportingDocuments", string>
>;
type ApplicantProfileValues = {
    address: string;
    city: string;
    districtId: string;
    highestEducationalQualification: string;
    instituteName: string;
    instituteTypeId: string;
    lastAttendedEducationalInstitute: string;
    pinCode: string;
    stateId: string;
    yearOfPassing: string;
};
type ApplicantProfileErrors = Partial<Record<keyof ApplicantProfileValues, string>>;
type ParticipantApplicationFormMode = "create" | "edit";

type ParticipantApplicationFormPageProps = {
    applicationHash?: string;
    mode?: ParticipantApplicationFormMode;
};

const emptyTeamMember: TeamMember = {
    email: "",
    fullName: "",
    mobile: "",
};

const initialValues: ProposalValues = {
    beneficiaries: "",
    challengeCategory: "",
    costFunding: "",
    expectedImpact: "",
    implementationRoute: "",
    intellectualPropertyPublication: "",
    mentorAcknowledgeTo: "",
    participationMode: "Individual",
    problemLocation: "",
    projectTimeline: "",
    proposedSolution: "",
    prototypePilot: "",
    scalability: "",
    technologyMethod: "",
    videoUrl: "",
};

const initialApplicantProfileValues: ApplicantProfileValues = {
    address: "",
    city: "",
    districtId: "",
    highestEducationalQualification: "",
    instituteName: "",
    instituteTypeId: "",
    lastAttendedEducationalInstitute: "",
    pinCode: "",
    stateId: "",
    yearOfPassing: "",
};

const proposalFields: readonly ProposalField[] = [
    {
        field: "problemLocation",
        label: "Problem and Location",
        guidance: "A specific, observed problem in a named place.",
    },
    {
        field: "proposedSolution",
        label: "Proposed Solution",
        guidance: "What is being built or done, described plainly.",
    },
    {
        field: "technologyMethod",
        label: "Technology or Method",
        guidance: "The method, tools, or process behind the solution.",
    },
    {
        field: "implementationRoute",
        label: "Implementation Route",
        guidance: "The sequence of work, permissions, and local partners.",
    },
    {
        field: "costFunding",
        label: "Cost and Funding",
        guidance: "Estimated costs and confirmed or expected funding sources.",
    },
    {
        field: "beneficiaries",
        label: "Beneficiaries",
        guidance: "Who benefits, how many, and how that estimate was made.",
    },
    {
        field: "projectTimeline",
        label: "Timeline",
        guidance: "A realistic period to a pilot or working deployment.",
    },
    {
        field: "expectedImpact",
        label: "Expected Impact",
        guidance:
            "Social, economic, or environmental results in measurable terms.",
    },
    {
        field: "scalability",
        label: "Scalability",
        guidance: "How the idea can move to another district or user group.",
    },
    {
        field: "prototypePilot",
        label: "Prototype or Pilot",
        guidance:
            "Evidence from an existing model, pilot, demo, or field trial.",
    },
] as const;

const settingKeys = {
    multipleApplications: "PARTICIPANT_APPLICATION_MULTIPLE",
    registrationEnabled: "PARTICIPANT_REGISTRATION_ENABLED",
    registrationEndDate: "PARTICIPANT_REGISTRATION_END_DATE",
    registrationStartDate: "PARTICIPANT_REGISTRATION_START_DATE",
    sameCategoryMultiple: "PARTICIPANT_APPLICATION_SAME_CATEGORY_MULTIPLE",
    sameCategoryMultipleLimit:
        "PARTICIPANT_APPLICATION_SAME_CATEGORY_MULTIPLE_LIMIT",
} as const;

const maxSupportingDocuments = Number.parseInt(
    process.env.NEXT_PUBLIC_SUPPORTING_DOCUMENT_MAX_FILES ?? "3",
    10,
);
const maxSupportingDocumentSizeMb = Number.parseInt(
    process.env.NEXT_PUBLIC_SUPPORTING_DOCUMENT_MAX_SIZE_MB ?? "5",
    10,
);
const maxSupportingDocumentSizeBytes =
    maxSupportingDocumentSizeMb * 1024 * 1024;
const multilingualNamePattern = /^[\p{L}\p{M} ]{2,}$/u;

const validationMessages = {
    alphabetsOnly: "Enter alphabets only.",
    challengeCategory: "Select a challenge category.",
    multipleApplicationsDisabled:
        "Multiple applications are not enabled for participants.",
    registrationClosed: "Participant registration is currently closed.",
    registrationEnded: "The new application window has closed.",
    registrationNotStarted: "New applications are not open yet.",
    sameCategoryLimit: (limit: number) =>
        `You can apply a maximum of ${limit} applications in the same challenge category.`,
    sameCategoryMultipleDisabled:
        "You have already applied in this challenge category.",
    email: "Enter a valid email address.",
    mobile: "Enter a valid 10-digit mobile number.",
    pdfOnly: "Upload PDF files only.",
    proposalCharacters: "Enter 50 to 1000 characters.",
    supportingDocumentMax: `Upload a maximum of ${maxSupportingDocuments} PDF files.`,
    supportingDocumentRequired: "Upload at least one supporting document.",
    supportingDocumentSize: `Each supporting document must be ${maxSupportingDocumentSizeMb} MB or smaller.`,
    teamMemberRequired: "Add at least one team member.",
    teamEmailUnique: "Team member email IDs must be unique.",
    teamLeadEmailMatch: "Team member email cannot match the Team Lead email.",
    teamLeadPhoneMatch: "Team member phone cannot match the Team Lead phone.",
    teamPhoneUnique: "Team member phone numbers must be unique.",
    videoUrl: "Enter a valid URL beginning with http:// or https://.",
};

const inputClass =
    "mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-[#0b1f3a] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

const textareaClass = `${inputClass} min-h-32 resize-y leading-6`;

function FieldCounter({ value }: Readonly<{ value: string }>) {
    return (
        <span className="ml-auto shrink-0 text-xs font-normal text-slate-500">
            {value.length}/1000
        </span>
    );
}

function FieldError({ message }: Readonly<{ message?: string }>) {
    if (!message) return null;

    return (
        <span className="mt-1 block text-xs font-normal text-red-700">
            {message}
        </span>
    );
}

function formatFileSize(size: number) {
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

function getSupportingDocumentFileError(file: File) {
    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        return validationMessages.pdfOnly;
    }

    if (file.size > maxSupportingDocumentSizeBytes) {
        return validationMessages.supportingDocumentSize;
    }

    return "";
}

function settingsMap(settings: AppSetting[]) {
    return Object.fromEntries(
        settings.map((setting) => [setting.key, setting.value]),
    );
}

function booleanSetting(settings: AppSettingsMap, key: string) {
    return settings[key]?.trim().toLowerCase() === "true";
}

function integerSetting(settings: AppSettingsMap, key: string) {
    const value = Number(settings[key]);
    return Number.isInteger(value) ? value : 0;
}

function dateSetting(settings: AppSettingsMap, key: string) {
    const value = settings[key];
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getNewApplicationBlockReason(
    settings: AppSettingsMap,
    existingApplicationCount: number,
) {
    if (!booleanSetting(settings, settingKeys.registrationEnabled)) {
        return validationMessages.registrationClosed;
    }

    const now = new Date();
    const startDate = dateSetting(settings, settingKeys.registrationStartDate);
    const endDate = dateSetting(settings, settingKeys.registrationEndDate);

    if (startDate && now < startDate)
        return validationMessages.registrationNotStarted;
    if (endDate && now > endDate) return validationMessages.registrationEnded;

    if (
        !booleanSetting(settings, settingKeys.multipleApplications) &&
        existingApplicationCount > 0
    ) {
        return validationMessages.multipleApplicationsDisabled;
    }

    return "";
}

function getSameCategoryError(
    settings: AppSettingsMap,
    selectedCategoryId: string,
    existingApplications: ParticipantApplicationSummary[],
    currentApplicationHash?: string,
) {
    if (!selectedCategoryId) return validationMessages.challengeCategory;

    const numericCategoryId = Number(selectedCategoryId);
    if (!Number.isFinite(numericCategoryId)) {
        return validationMessages.challengeCategory;
    }

    const existingSameCategoryCount = existingApplications.filter(
        (application) =>
            application.applicationHash !== currentApplicationHash &&
            application.challengeCategory?.id === numericCategoryId,
    ).length;

    if (!booleanSetting(settings, settingKeys.sameCategoryMultiple)) {
        return existingSameCategoryCount > 0
            ? validationMessages.sameCategoryMultipleDisabled
            : "";
    }

    const limit = integerSetting(
        settings,
        settingKeys.sameCategoryMultipleLimit,
    );
    if (limit > 0 && existingSameCategoryCount >= limit) {
        return validationMessages.sameCategoryLimit(limit);
    }

    return "";
}

function validateProposal(
    values: ProposalValues,
    files: File[],
    challengeCategories: ChallengeCategoryOption[],
    settings: AppSettingsMap,
    existingApplications: ParticipantApplicationSummary[],
    applicationBlockReason: string,
    existingSupportingDocumentCount = 0,
    currentApplicationHash?: string,
) {
    const errors: FormErrors = {};

    if (applicationBlockReason) {
        errors.challengeCategory = applicationBlockReason;
    } else if (
        !challengeCategories.some(
            (category) => String(category.id) === values.challengeCategory,
        )
    ) {
        errors.challengeCategory = validationMessages.challengeCategory;
    } else {
        const sameCategoryError = getSameCategoryError(
            settings,
            values.challengeCategory,
            existingApplications,
            currentApplicationHash,
        );
        if (sameCategoryError) errors.challengeCategory = sameCategoryError;
    }

    proposalFields.forEach(({ field }) => {
        const value = values[field].trim();
        if (value.length < 50 || value.length > 1000) {
            errors[field] = validationMessages.proposalCharacters;
        }
    });

    if (
        values.videoUrl.trim() &&
        !/^https?:\/\/\S+$/i.test(values.videoUrl.trim())
    ) {
        errors.videoUrl = validationMessages.videoUrl;
    }

    if (!files.length && existingSupportingDocumentCount === 0) {
        errors.supportingDocuments =
            validationMessages.supportingDocumentRequired;
    }

    return errors;
}

function validateTeamMembers(
    participationMode: string,
    teamLeadEmail: string,
    teamLeadMobile: string,
    teamMembers: TeamMember[],
) {
    if (participationMode !== "Team") return [];

    const normalizedTeamLeadEmail = teamLeadEmail.trim().toLowerCase();
    const normalizedTeamLeadMobile = teamLeadMobile.trim();

    return teamMembers.map<TeamMemberErrors>((member) => {
        const errors: TeamMemberErrors = {};
        const email = member.email.trim().toLowerCase();
        const mobile = member.mobile.trim();

        if (!multilingualNamePattern.test(member.fullName.trim())) {
            errors.fullName = validationMessages.alphabetsOnly;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = validationMessages.email;
        } else if (email === normalizedTeamLeadEmail) {
            errors.email = validationMessages.teamLeadEmailMatch;
        } else if (
            teamMembers.filter(
                (teamMember) => teamMember.email.trim().toLowerCase() === email,
            ).length > 1
        ) {
            errors.email = validationMessages.teamEmailUnique;
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            errors.mobile = validationMessages.mobile;
        } else if (mobile === normalizedTeamLeadMobile) {
            errors.mobile = validationMessages.teamLeadPhoneMatch;
        } else if (
            teamMembers.filter(
                (teamMember) => teamMember.mobile.trim() === mobile,
            ).length > 1
        ) {
            errors.mobile = validationMessages.teamPhoneUnique;
        }

        return errors;
    });
}

function localizedName(value?: LocalizedText | null) {
    return value?.en ?? value?.bn ?? value?.hi ?? "";
}

function formatDateOnly(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
    }).format(date);
}

function formatValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
}

function profileString(
    profile: ParticipantApplicationDetails["profile"],
    field: string,
) {
    const value = profile?.[field];
    return value === null || value === undefined ? "" : String(value);
}

function optionId(value?: number | string | null) {
    return value === null || value === undefined || value === ""
        ? ""
        : String(value);
}

function applicantProfileValuesFromApplication(
    application: ParticipantApplicationDetails,
): ApplicantProfileValues {
    return {
        address: profileString(application.profile, "address"),
        city: profileString(application.profile, "city"),
        districtId: optionId(application.district?.id),
        highestEducationalQualification: profileString(
            application.profile,
            "highestEducationalQualification",
        ),
        instituteName: profileString(application.profile, "instituteName"),
        instituteTypeId: optionId(
            application.instituteType?.id ??
                application.profile?.instituteTypeId,
        ),
        lastAttendedEducationalInstitute: profileString(
            application.profile,
            "lastAttendedEducationalInstitute",
        ),
        pinCode: profileString(application.profile, "pinCode"),
        stateId: optionId(application.state?.id),
        yearOfPassing: profileString(application.profile, "yearOfPassing"),
    };
}

function isApplicantProfileIncomplete(values: ApplicantProfileValues) {
    return Object.values(values).some((value) => !value.trim());
}

function getYearFromDate(value?: string | null) {
    if (!value) return null;

    const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

function validateApplicantProfile(
    values: ApplicantProfileValues,
    dateOfBirth?: string | null,
) {
    const errors: ApplicantProfileErrors = {};
    const requiredMessage = "This field is required.";

    (Object.keys(values) as Array<keyof ApplicantProfileValues>).forEach(
        (field) => {
            if (!values[field].trim()) errors[field] = requiredMessage;
        },
    );

    if (values.pinCode && !/^[0-9]{6}$/.test(values.pinCode)) {
        errors.pinCode = "Enter a valid 6-digit PIN code.";
    }

    if (values.yearOfPassing) {
        if (!/^(19|20)\d{2}$/.test(values.yearOfPassing)) {
            errors.yearOfPassing = "Enter a valid year.";
        } else {
            const birthYear = getYearFromDate(dateOfBirth);
            if (
                birthYear !== null &&
                Number(values.yearOfPassing) < birthYear + 12
            ) {
                errors.yearOfPassing =
                    "Year of Passing must be at least 12 years after Date of Birth.";
            }
        }
    }

    return errors;
}

function proposalString(
    proposal: ParticipantApplicationDetails["proposal"],
    field: keyof ProposalValues,
) {
    const value = proposal?.[field];
    return value === null || value === undefined ? "" : String(value);
}

function getStoredLanguage() {
    try {
        const session = JSON.parse(
            localStorage.getItem("seva-first-innovation-challenge-session") ??
                "{}",
        ) as { language?: string };

        return session.language === "bn" || session.language === "hi"
            ? session.language
            : "en";
    } catch {
        return "en";
    }
}

function decodeParticipantRole(token: string): ParticipantRole | null {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;

        const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
        const padded = normalized.padEnd(
            normalized.length + ((4 - (normalized.length % 4)) % 4),
            "=",
        );
        const parsed = JSON.parse(atob(padded)) as {
            exp?: number;
            role?: ParticipantRole;
        };

        if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
            return null;
        }

        return parsed.role === "applicant" || parsed.role === "team_member"
            ? parsed.role
            : null;
    } catch {
        return null;
    }
}

function ApplicantField({
    label,
    value,
}: Readonly<{
    label: string;
    value: unknown;
}>) {
    return (
        <div className="min-w-0 border-b border-slate-100 py-3 last:border-b-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-bold text-[#0b1f3a]">
                {formatValue(value)}
            </p>
        </div>
    );
}

export function ParticipantApplicationFormPage({
    applicationHash,
    mode = "create",
}: Readonly<ParticipantApplicationFormPageProps>) {
    const router = useRouter();
    const isEditMode = mode === "edit";
    const [applicantData, setApplicantData] =
        useState<ParticipantApplicationDetails | null>(null);
    const [applicantDataError, setApplicantDataError] = useState("");
    const [isApplicantDataLoading, setIsApplicantDataLoading] = useState(true);
    const [files, setFiles] = useState<File[]>([]);
    const [
        isSupportingDocumentsDragActive,
        setIsSupportingDocumentsDragActive,
    ] = useState(false);
    const [challengeCategories, setChallengeCategories] = useState<
        ChallengeCategoryOption[]
    >([]);
    const [challengeCategoryError, setChallengeCategoryError] = useState("");
    const [commonLookups, setCommonLookups] = useState<CommonLookupsResponse>({
        districts: [],
        instituteTypes: [],
        states: [],
    });
    const [lookupsError, setLookupsError] = useState("");
    const [existingApplications, setExistingApplications] = useState<
        ParticipantApplicationSummary[]
    >([]);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingDocumentId, setDeletingDocumentId] = useState<
        number | string | null
    >(null);
    const [settings, setSettings] = useState<AppSettingsMap>({});
    const [settingsError, setSettingsError] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [supportingDocumentsError, setSupportingDocumentsError] =
        useState("");
    const [participantRole, setParticipantRole] =
        useState<ParticipantRole | null>(null);
    const [applicantProfileValues, setApplicantProfileValues] =
        useState<ApplicantProfileValues>(initialApplicantProfileValues);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [values, setValues] = useState<ProposalValues>(initialValues);
    const supportingDocumentsInputRef = useRef<HTMLInputElement>(null);
    const existingSupportingDocuments = applicantData?.documents ?? [];
    const existingSupportingDocumentCount = isEditMode
        ? existingSupportingDocuments.length
        : 0;
    const totalSupportingDocumentCount =
        existingSupportingDocumentCount + files.length;
    const hasReachedSupportingDocumentLimit =
        totalSupportingDocumentCount >= maxSupportingDocuments;
    const applicationBlockReason =
        isEditMode || isSettingsLoading || settingsError
            ? ""
            : getNewApplicationBlockReason(
                  settings,
                  existingApplications.length,
              );
    const needsApplicantProfileCompletion = applicantData
        ? isApplicantProfileIncomplete(
              applicantProfileValuesFromApplication(applicantData),
          )
        : false;
    const applicantProfileErrors = useMemo(
        () =>
            needsApplicantProfileCompletion
                ? validateApplicantProfile(
                      applicantProfileValues,
                      applicantData?.participant?.dateOfBirth,
                  )
                : {},
        [
            applicantData?.participant?.dateOfBirth,
            applicantProfileValues,
            needsApplicantProfileCompletion,
        ],
    );
    const hasApplicantProfileErrors =
        Object.keys(applicantProfileErrors).length > 0;
    const districtOptions = useMemo(
        () =>
            commonLookups.districts.filter(
                (district) =>
                    !applicantProfileValues.stateId ||
                    String(district.stateId) === applicantProfileValues.stateId,
            ),
        [applicantProfileValues.stateId, commonLookups.districts],
    );
    const instituteTypeOptions = useMemo(
        () =>
            commonLookups.instituteTypes.filter(
                (type) =>
                    !applicantData?.participantCategory?.code ||
                    !type.participantCategoryCodes?.length ||
                    type.participantCategoryCodes.includes(
                        applicantData.participantCategory.code,
                    ),
            ),
        [
            applicantData?.participantCategory?.code,
            commonLookups.instituteTypes,
        ],
    );
    const currentErrors = useMemo(
        () =>
            validateProposal(
                values,
                files,
                challengeCategories,
                settings,
                existingApplications,
                applicationBlockReason,
                existingSupportingDocumentCount,
                isEditMode ? applicationHash : undefined,
            ),
        [
            applicationBlockReason,
            applicationHash,
            challengeCategories,
            existingApplications,
            existingSupportingDocumentCount,
            files,
            isEditMode,
            settings,
            values,
        ],
    );
    const teamMemberErrors = useMemo(
        () =>
            validateTeamMembers(
                values.participationMode,
                applicantData?.participant?.email ?? "",
                applicantData?.participant?.mobile ?? "",
                teamMembers,
            ),
        [
            applicantData?.participant?.email,
            applicantData?.participant?.mobile,
            teamMembers,
            values.participationMode,
        ],
    );
    const hasTeamMemberErrors = teamMemberErrors.some(
        (memberErrors) => Object.keys(memberErrors).length > 0,
    );
    const teamMembersError =
        values.participationMode === "Team" && teamMembers.length === 0
            ? validationMessages.teamMemberRequired
            : "";
    const roleBlockReason =
        participantRole === "team_member"
            ? isEditMode
                ? "Only the applicant can edit this application."
                : "Only the applicant can create a new application."
            : "";
    const isFormLocked = Boolean(
        (!isEditMode && (isSettingsLoading || settingsError)) ||
        lookupsError ||
        challengeCategoryError ||
        roleBlockReason ||
        applicationBlockReason,
    );
    const canSubmit =
        !isFormLocked &&
        !isApplicantDataLoading &&
        !isSubmitting &&
        Boolean(applicantData) &&
        Object.keys(currentErrors).length === 0 &&
        !hasApplicantProfileErrors &&
        !teamMembersError &&
        !hasTeamMemberErrors;

    useEffect(() => {
        let isMounted = true;

        setIsSettingsLoading(true);
        setSettingsError("");

        void apiClient
            .get<AppSetting[]>(endpoints.common.appSettings)
            .then((result) => {
                if (!isMounted) return;
                setSettings(settingsMap(result));
            })
            .catch((error) => {
                if (!isMounted) return;
                setSettings({});
                setSettingsError(
                    error instanceof Error
                        ? error.message
                        : "Application settings could not be loaded.",
                );
            })
            .finally(() => {
                if (isMounted) setIsSettingsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        void apiClient
            .get<CommonLookupsResponse>(endpoints.common.lookups)
            .then((result) => {
                if (!isMounted) return;
                setCommonLookups(result);
                setLookupsError("");
            })
            .catch(() => {
                if (!isMounted) return;
                setCommonLookups({
                    districts: [],
                    instituteTypes: [],
                    states: [],
                });
                setLookupsError("Applicant detail options could not be loaded.");
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        void apiClient
            .get<ChallengeCategoryOption[]>(
                endpoints.common.challengeCategories,
            )
            .then((result) => {
                if (!isMounted) return;
                setChallengeCategories(result);
                setChallengeCategoryError("");
            })
            .catch(() => {
                if (!isMounted) return;
                setChallengeCategories([]);
                setChallengeCategoryError(
                    "Challenge categories could not be loaded.",
                );
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";

        if (!token) {
            setIsApplicantDataLoading(false);
            setApplicantDataError("A valid participant session is required.");
            return undefined;
        }

        const tokenRole = decodeParticipantRole(token);
        setParticipantRole(tokenRole);

        if (tokenRole !== "applicant") {
            setIsApplicantDataLoading(false);
            setApplicantData(null);
            setApplicantDataError(
                isEditMode
                    ? "Only the applicant can edit this application."
                    : "Only the applicant can create a new application.",
            );
            return undefined;
        }

        if (isEditMode && applicationHash) {
            let isMounted = true;
            setIsApplicantDataLoading(true);
            setApplicantDataError("");

            void apiClient
                .get<ApplicationDetailsResponse>(
                    endpoints.participants.application(applicationHash),
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                )
                .then((result) => {
                    if (!isMounted) return;
                    const application = result.application;
                    setApplicantData(application);
                    setApplicantProfileValues(
                        applicantProfileValuesFromApplication(application),
                    );
                    setValues({
                        beneficiaries: proposalString(
                            application.proposal,
                            "beneficiaries",
                        ),
                        challengeCategory:
                            application.challengeCategory?.id === null ||
                            application.challengeCategory?.id === undefined
                                ? ""
                                : String(application.challengeCategory.id),
                        costFunding: proposalString(
                            application.proposal,
                            "costFunding",
                        ),
                        expectedImpact: proposalString(
                            application.proposal,
                            "expectedImpact",
                        ),
                        implementationRoute: proposalString(
                            application.proposal,
                            "implementationRoute",
                        ),
                        intellectualPropertyPublication: proposalString(
                            application.proposal,
                            "intellectualPropertyPublication",
                        ),
                        mentorAcknowledgeTo: proposalString(
                            application.proposal,
                            "mentorAcknowledgeTo",
                        ),
                        participationMode:
                            application.participationMode ?? "Individual",
                        problemLocation: proposalString(
                            application.proposal,
                            "problemLocation",
                        ),
                        projectTimeline: proposalString(
                            application.proposal,
                            "projectTimeline",
                        ),
                        proposedSolution: proposalString(
                            application.proposal,
                            "proposedSolution",
                        ),
                        prototypePilot: proposalString(
                            application.proposal,
                            "prototypePilot",
                        ),
                        scalability: proposalString(
                            application.proposal,
                            "scalability",
                        ),
                        technologyMethod: proposalString(
                            application.proposal,
                            "technologyMethod",
                        ),
                        videoUrl: proposalString(
                            application.proposal,
                            "videoUrl",
                        ),
                    });
                    setTeamMembers(
                        (application.teamMembers ?? [])
                            .filter((member) => !member.isApplicant)
                            .map((member) => ({
                                email: member.email ?? "",
                                fullName: member.fullName ?? "",
                                mobile: member.mobile ?? "",
                            })),
                    );
                })
                .catch((error) => {
                    if (!isMounted) return;
                    setApplicantData(null);
                    setApplicantDataError(
                        error instanceof Error
                            ? error.message
                            : "Application details could not be loaded.",
                    );
                })
                .finally(() => {
                    if (isMounted) setIsApplicantDataLoading(false);
                });

            return () => {
                isMounted = false;
            };
        }

        let isMounted = true;
        setIsApplicantDataLoading(true);
        setApplicantDataError("");

        void apiClient
            .get<ParticipantApplicationsResponse>(
                endpoints.participants.applications,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    query: {
                        page: 1,
                        pageSize: 100,
                        sortBy: "createdAt",
                        sortDirection: "desc",
                    },
                },
            )
            .then(async (result) => {
                const remainingPages =
                    result.pagination.totalPages > 1
                        ? await Promise.all(
                              Array.from(
                                  { length: result.pagination.totalPages - 1 },
                                  (_, index) => index + 2,
                              ).map((page) =>
                                  apiClient.get<ParticipantApplicationsResponse>(
                                      endpoints.participants.applications,
                                      {
                                          headers: {
                                              Authorization: `Bearer ${token}`,
                                          },
                                          query: {
                                              page,
                                              pageSize: 100,
                                              sortBy: "createdAt",
                                              sortDirection: "desc",
                                          },
                                      },
                                  ),
                              ),
                          )
                        : [];
                const applications = [
                    ...result.applications,
                    ...remainingPages.flatMap((page) => page.applications),
                ];

                if (!isMounted) return null;
                setExistingApplications(applications);
                const latestApplication = applications[0];

                if (!latestApplication) {
                    throw new Error(
                        "Applicant profile details are not available.",
                    );
                }

                return apiClient.get<ApplicationDetailsResponse>(
                    endpoints.participants.application(
                        latestApplication.applicationHash,
                    ),
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                );
            })
            .then((result) => {
                if (!result) return;
                if (!isMounted) return;
                setApplicantData(result.application);
                setApplicantProfileValues(
                    applicantProfileValuesFromApplication(result.application),
                );
            })
            .catch((error) => {
                if (!isMounted) return;
                setApplicantData(null);
                setApplicantDataError(
                    error instanceof Error
                        ? error.message
                        : "Applicant profile details could not be loaded.",
                );
            })
            .finally(() => {
                if (isMounted) setIsApplicantDataLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [applicationHash, isEditMode]);

    const updateValue =
        (field: keyof ProposalValues) =>
        (
            event: ChangeEvent<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >,
        ) => {
            setStatusMessage("");
            setValues((current) => ({
                ...current,
                [field]: event.target.value,
            }));
        };

    const selectParticipationMode = (mode: string) => {
        setStatusMessage("");
        setValues((current) => ({
            ...current,
            participationMode: mode,
        }));
        if (mode !== "Team") setTeamMembers([]);
    };

    const updateApplicantProfileValue =
        (field: keyof ApplicantProfileValues) =>
        (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const rawValue = event.target.value;
            const nextValue =
                field === "pinCode" || field === "yearOfPassing"
                    ? rawValue
                          .replace(/\D/g, "")
                          .slice(0, field === "pinCode" ? 6 : 4)
                    : rawValue;

            setStatusMessage("");
            setApplicantProfileValues((current) => {
                if (field === "stateId") {
                    return {
                        ...current,
                        districtId: "",
                        stateId: nextValue,
                    };
                }

                return {
                    ...current,
                    [field]: nextValue,
                };
            });
        };

    const addTeamMember = () => {
        setStatusMessage("");
        setValues((current) => ({
            ...current,
            participationMode: "Team",
        }));
        setTeamMembers((current) =>
            current.length >= 4
                ? current
                : [...current, { ...emptyTeamMember }],
        );
    };

    const updateTeamMember =
        (indexToUpdate: number, field: keyof TeamMember) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const rawValue = event.target.value;
            const nextValue =
                field === "mobile"
                    ? rawValue.replace(/\D/g, "").slice(0, 10)
                    : rawValue;

            setStatusMessage("");
            setTeamMembers((current) =>
                current.map((member, index) =>
                    index === indexToUpdate
                        ? { ...member, [field]: nextValue }
                        : member,
                ),
            );
        };

    const removeTeamMember = (indexToRemove: number) => {
        setStatusMessage("");
        setTeamMembers((current) =>
            current.filter((_, index) => index !== indexToRemove),
        );
    };

    const setSupportingDocuments = (nextFiles: File[]) => {
        setFiles(nextFiles);
        setSupportingDocumentsError(
            nextFiles.length || existingSupportingDocumentCount > 0
                ? ""
                : validationMessages.supportingDocumentRequired,
        );
    };

    const handleSupportingDocuments = (
        incomingFiles: FileList | File[] | null,
    ) => {
        if (isFormLocked || hasReachedSupportingDocumentLimit) return;

        const selectedFiles = incomingFiles ? Array.from(incomingFiles) : [];
        if (!selectedFiles.length) return;

        const selectedFileKeys = new Set(files.map(getFileKey));
        const nextFiles = [...files];
        let nextError = "";

        for (const file of selectedFiles) {
            const fileError = getSupportingDocumentFileError(file);
            if (fileError) {
                nextError = fileError;
                continue;
            }

            if (
                existingSupportingDocumentCount + nextFiles.length >=
                maxSupportingDocuments
            ) {
                nextError = validationMessages.supportingDocumentMax;
                break;
            }

            const fileKey = getFileKey(file);
            if (!selectedFileKeys.has(fileKey)) {
                nextFiles.push(file);
                selectedFileKeys.add(fileKey);
            }
        }

        setSupportingDocuments(nextFiles);
        setSupportingDocumentsError(nextError);
    };

    const updateFiles = (event: ChangeEvent<HTMLInputElement>) => {
        handleSupportingDocuments(event.target.files);
        event.target.value = "";
    };

    const dropSupportingDocuments = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsSupportingDocumentsDragActive(false);
        handleSupportingDocuments(event.dataTransfer.files);
    };

    const removeFile = (indexToRemove: number) => {
        setSupportingDocuments(
            files.filter((_, index) => index !== indexToRemove),
        );
    };

    const deleteExistingDocument = async (
        document: NonNullable<ParticipantApplicationDetails["documents"]>[number],
    ) => {
        if (!applicationHash || !document.id || deletingDocumentId) return;

        const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";
        if (!token) {
            setStatusMessage("A valid participant session is required.");
            return;
        }

        setDeletingDocumentId(document.id);
        setStatusMessage("");

        try {
            await apiClient.delete(
                endpoints.participants.applicationDocument(
                    applicationHash,
                    document.id,
                ),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setApplicantData((current) =>
                current
                    ? {
                          ...current,
                          documents: (current.documents ?? []).filter(
                              (item) =>
                                  String(item.id) !== String(document.id),
                          ),
                      }
                    : current,
            );
        } catch (error) {
            setStatusMessage(
                error instanceof Error
                    ? error.message
                    : "Document could not be deleted.",
            );
        } finally {
            setDeletingDocumentId(null);
        }
    };

    const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSupportingDocumentsError(currentErrors.supportingDocuments ?? "");

        if (isFormLocked) {
            setStatusMessage(
                settingsError ||
                    lookupsError ||
                    challengeCategoryError ||
                    roleBlockReason ||
                    applicationBlockReason,
            );
            return;
        }

        if (!canSubmit) {
            setStatusMessage(
                hasApplicantProfileErrors
                    ? "Please complete the applicant details first."
                    : teamMembersError || "Please fix the highlighted fields.",
            );
            return;
        }

        const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY) ?? "";
        if (!token) {
            setStatusMessage("A valid participant session is required.");
            return;
        }

        if (!applicantData) {
            setStatusMessage("Applicant profile details could not be loaded.");
            return;
        }

        const selectedInstituteType = instituteTypeOptions.find(
            (type) => String(type.id) === applicantProfileValues.instituteTypeId,
        );
        const selectedInstituteTypeName =
            localizedName(selectedInstituteType?.name) ||
            localizedName(applicantData.instituteType?.name);

        const payload = {
            address: applicantProfileValues.address,
            beneficiaries: values.beneficiaries,
            challengeCategoryId: Number(values.challengeCategory),
            city: applicantProfileValues.city,
            costFunding: values.costFunding,
            districtId: Number(applicantProfileValues.districtId),
            expectedImpact: values.expectedImpact,
            highestEducationalQualification:
                applicantProfileValues.highestEducationalQualification,
            implementationRoute: values.implementationRoute,
            instituteName: applicantProfileValues.instituteName,
            instituteType: selectedInstituteTypeName,
            intellectualPropertyPublication:
                values.intellectualPropertyPublication,
            language: getStoredLanguage(),
            lastAttendedEducationalInstitute:
                applicantProfileValues.lastAttendedEducationalInstitute,
            mentorAcknowledgeTo: values.mentorAcknowledgeTo,
            otherInstituteType: profileString(
                applicantData.profile,
                "otherInstituteType",
            ),
            participationMode: values.participationMode,
            pinCode: applicantProfileValues.pinCode,
            problemLocation: values.problemLocation,
            projectTimeline: values.projectTimeline,
            proposedSolution: values.proposedSolution,
            prototypePilot: values.prototypePilot,
            scalability: values.scalability,
            stateId: Number(applicantProfileValues.stateId),
            teamMembers: values.participationMode === "Team" ? teamMembers : [],
            technologyMethod: values.technologyMethod,
            videoUrl: values.videoUrl,
            yearOfPassing: applicantProfileValues.yearOfPassing,
        };

        const body = new FormData();
        body.append("payload", JSON.stringify(payload));
        files.forEach((file) => {
            body.append("supportingDocuments", file, file.name);
        });

        setIsSubmitting(true);
        setStatusMessage("Submitting application...");

        try {
            const result =
                isEditMode && applicationHash
                    ? await apiClient.patch<SubmitApplicationResponse>(
                          endpoints.participants.application(applicationHash),
                          body,
                          {
                              headers: {
                                  Authorization: `Bearer ${token}`,
                              },
                          },
                      )
                    : await apiClient.post<SubmitApplicationResponse>(
                          endpoints.participants.applications,
                          body,
                          {
                              headers: {
                                  Authorization: `Bearer ${token}`,
                              },
                          },
                      );

            localStorage.removeItem("sfic-participant-new-proposal-draft");
            setStatusMessage(
                `Application ${result.application.applicationNumber} submitted successfully.`,
            );
            router.push(
                `/participants/applications/${result.application.applicationHash}`,
            );
        } catch (error) {
            setStatusMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to submit application. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ParticipantShell
            eyebrow={
                isEditMode
                    ? "Update participant application"
                    : "Create proposal-only application"
            }
            naturalScroll
            title={isEditMode ? "Edit Application" : "New Application"}
        >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
                <form className="grid gap-4" onSubmit={submitApplication}>
                    <section className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                        <div
                            className={`bg-cover bg-center px-5 py-6 md:px-7 ${
                                ((!isEditMode &&
                                    (isSettingsLoading || settingsError)) ||
                                    lookupsError ||
                                    challengeCategoryError ||
                                    roleBlockReason ||
                                    applicationBlockReason)
                                    ? "border-b border-slate-200"
                                    : ""
                            }`}
                            style={{
                                backgroundImage:
                                    "linear-gradient(90deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.94) 56%, rgba(255,255,255,.72) 100%), url('/images/inner-banner.webp')",
                            }}
                        >
                            <Link
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                                href={
                                    isEditMode && applicationHash
                                        ? `/participants/applications/${applicationHash}`
                                        : "/participants/applications"
                                }
                            >
                                <ArrowLeft size={17} />
                                {isEditMode
                                    ? "Back to application"
                                    : "Back to applications"}
                            </Link>
                            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-blue-700">
                                        Seva First Innovation Challenge
                                    </p>
                                    <h2 className="mt-2 text-3xl font-black text-[#0b1f3a]">
                                        {isEditMode
                                            ? "Edit Proposal Details"
                                            : "Proposal Details"}
                                    </h2>
                                    <p className="mt-2 max-w-3xl text-sm font-normal leading-6 text-slate-600">
                                        {isEditMode
                                            ? "Review and update the proposal details for this application."
                                            : "Applicant registration details are already linked to your participant workspace. Complete only the proposal for this new application."}
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                                    <CheckCircle2 size={19} />
                                    Applicant profile linked
                                </div>
                            </div>
                        </div>

                        {((!isEditMode &&
                            (isSettingsLoading || settingsError)) ||
                            lookupsError ||
                            challengeCategoryError ||
                            roleBlockReason ||
                            applicationBlockReason) && (
                            <div className="grid gap-5 p-5 md:p-7">
                                <div
                                    className={`rounded-lg border px-4 py-3 text-sm font-normal md:col-span-2 ${
                                        !isEditMode && isSettingsLoading
                                            ? "border-blue-100 bg-blue-50 text-blue-700"
                                            : "border-red-100 bg-red-50 text-red-700"
                                    }`}
                                >
                                    {!isEditMode && isSettingsLoading
                                        ? "Checking application settings..."
                                        : (!isEditMode && settingsError) ||
                                          lookupsError ||
                                          challengeCategoryError ||
                                          roleBlockReason ||
                                          applicationBlockReason}
                                </div>
                            </div>
                        )}
                    </section>

                    {needsApplicantProfileCompletion && (
                        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                            <div className="flex items-start gap-4">
                                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                    <CheckCircle2 size={25} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#0b1f3a]">
                                        Applicant Details
                                    </h3>
                                    <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
                                        Complete the missing applicant details
                                        before adding proposal details.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-bold text-slate-700">
                                    State
                                    <select
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.stateId,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        onChange={updateApplicantProfileValue(
                                            "stateId",
                                        )}
                                        value={applicantProfileValues.stateId}
                                    >
                                        <option value="">Select state</option>
                                        {commonLookups.states.map((state) => (
                                            <option
                                                key={state.id}
                                                value={String(state.id)}
                                            >
                                                {localizedName(state.name)}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={
                                            applicantProfileErrors.stateId
                                        }
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    District
                                    <select
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.districtId,
                                        )}
                                        className={inputClass}
                                        disabled={
                                            isFormLocked ||
                                            !applicantProfileValues.stateId
                                        }
                                        onChange={updateApplicantProfileValue(
                                            "districtId",
                                        )}
                                        value={applicantProfileValues.districtId}
                                    >
                                        <option value="">
                                            Select district
                                        </option>
                                        {districtOptions.map((district) => (
                                            <option
                                                key={district.id}
                                                value={String(district.id)}
                                            >
                                                {localizedName(district.name)}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={
                                            applicantProfileErrors.districtId
                                        }
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    City
                                    <input
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.city,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        onChange={updateApplicantProfileValue(
                                            "city",
                                        )}
                                        placeholder="Enter city"
                                        type="text"
                                        value={applicantProfileValues.city}
                                    />
                                    <FieldError
                                        message={applicantProfileErrors.city}
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    PIN Code
                                    <input
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.pinCode,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        inputMode="numeric"
                                        maxLength={6}
                                        onChange={updateApplicantProfileValue(
                                            "pinCode",
                                        )}
                                        placeholder="6 digit PIN code"
                                        type="text"
                                        value={applicantProfileValues.pinCode}
                                    />
                                    <FieldError
                                        message={applicantProfileErrors.pinCode}
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700 md:col-span-2">
                                    Address
                                    <input
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.address,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        onChange={updateApplicantProfileValue(
                                            "address",
                                        )}
                                        placeholder="Enter address"
                                        type="text"
                                        value={applicantProfileValues.address}
                                    />
                                    <FieldError
                                        message={applicantProfileErrors.address}
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    Highest Educational Qualification
                                    <input
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.highestEducationalQualification,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        onChange={updateApplicantProfileValue(
                                            "highestEducationalQualification",
                                        )}
                                        placeholder="Enter qualification"
                                        type="text"
                                        value={
                                            applicantProfileValues.highestEducationalQualification
                                        }
                                    />
                                    <FieldError
                                        message={
                                            applicantProfileErrors.highestEducationalQualification
                                        }
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    Last Attended Educational Institute
                                    <input
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.lastAttendedEducationalInstitute,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        onChange={updateApplicantProfileValue(
                                            "lastAttendedEducationalInstitute",
                                        )}
                                        placeholder="Enter institute name"
                                        type="text"
                                        value={
                                            applicantProfileValues.lastAttendedEducationalInstitute
                                        }
                                    />
                                    <FieldError
                                        message={
                                            applicantProfileErrors.lastAttendedEducationalInstitute
                                        }
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    Year of Passing
                                    <input
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.yearOfPassing,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        inputMode="numeric"
                                        maxLength={4}
                                        onChange={updateApplicantProfileValue(
                                            "yearOfPassing",
                                        )}
                                        placeholder="YYYY"
                                        type="text"
                                        value={
                                            applicantProfileValues.yearOfPassing
                                        }
                                    />
                                    <FieldError
                                        message={
                                            applicantProfileErrors.yearOfPassing
                                        }
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    Institute / Organisation
                                    <input
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.instituteName,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        onChange={updateApplicantProfileValue(
                                            "instituteName",
                                        )}
                                        placeholder="Enter organisation"
                                        type="text"
                                        value={
                                            applicantProfileValues.instituteName
                                        }
                                    />
                                    <FieldError
                                        message={
                                            applicantProfileErrors.instituteName
                                        }
                                    />
                                </label>

                                <label className="text-sm font-bold text-slate-700">
                                    Organisation Type
                                    <select
                                        aria-invalid={Boolean(
                                            applicantProfileErrors.instituteTypeId,
                                        )}
                                        className={inputClass}
                                        disabled={isFormLocked}
                                        onChange={updateApplicantProfileValue(
                                            "instituteTypeId",
                                        )}
                                        value={
                                            applicantProfileValues.instituteTypeId
                                        }
                                    >
                                        <option value="">
                                            Select organisation type
                                        </option>
                                        {instituteTypeOptions.map((type) => (
                                            <option
                                                key={type.id}
                                                value={String(type.id)}
                                            >
                                                {localizedName(type.name)}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={
                                            applicantProfileErrors.instituteTypeId
                                        }
                                    />
                                </label>
                            </div>
                        </section>
                    )}

                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                        <div className="flex items-start gap-4">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700 ring-1 ring-orange-100">
                                <Lightbulb size={25} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#0b1f3a]">
                                    Innovation Proposal
                                </h3>
                                <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
                                    Build a complete view of the idea, its
                                    implementation route, and measurable public
                                    value.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-5 md:grid-cols-2">
                            <label className="text-sm font-bold text-slate-700">
                                Challenge Category
                                <select
                                    aria-invalid={Boolean(
                                        currentErrors.challengeCategory,
                                    )}
                                    className={inputClass}
                                    disabled={isFormLocked}
                                    onChange={updateValue("challengeCategory")}
                                    value={values.challengeCategory}
                                >
                                    <option value="">
                                        Select a challenge category
                                    </option>
                                    {challengeCategories.map((category) => (
                                        <option
                                            key={category.id}
                                            value={String(category.id)}
                                        >
                                            {localizedName(category.name)}
                                        </option>
                                    ))}
                                </select>
                                <FieldError
                                    message={currentErrors.challengeCategory}
                                />
                            </label>

                            <label className="text-sm font-bold text-slate-700">
                                Participation Mode
                                <select
                                    className={inputClass}
                                    disabled={isFormLocked}
                                    onChange={(event) =>
                                        selectParticipationMode(
                                            event.target.value,
                                        )
                                    }
                                    value={values.participationMode}
                                >
                                    <option value="Individual">
                                        Individual
                                    </option>
                                    <option value="Team">Team</option>
                                </select>
                            </label>

                            {values.participationMode === "Team" && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-black text-[#0b1f3a]">
                                                Team Members
                                            </p>
                                            <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
                                                The logged-in applicant is the
                                                team lead. Add up to four
                                                additional members for this
                                                proposal.
                                            </p>
                                        </div>
                                        <button
                                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-400 px-4 text-sm font-black text-[#071426] transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                            disabled={
                                                isFormLocked ||
                                                teamMembers.length >= 4
                                            }
                                            onClick={addTeamMember}
                                            type="button"
                                        >
                                            <Plus size={17} />
                                            Add Team Member
                                        </button>
                                    </div>
                                    <FieldError message={teamMembersError} />

                                    {teamMembers.length > 0 && (
                                        <div className="mt-4 grid gap-4">
                                            {teamMembers.map(
                                                (member, index) => (
                                                    <article
                                                        className="rounded-lg border border-slate-200 bg-white p-4"
                                                        key={index}
                                                    >
                                                        <div className="mb-3 flex items-center justify-between gap-3">
                                                            <p className="font-black text-[#0b1f3a]">
                                                                Team Member{" "}
                                                                {index + 2}
                                                            </p>
                                                            <button
                                                                aria-label={`Remove team member ${index + 2}`}
                                                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                                                                disabled={
                                                                    isFormLocked
                                                                }
                                                                onClick={() =>
                                                                    removeTeamMember(
                                                                        index,
                                                                    )
                                                                }
                                                                type="button"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="grid gap-4 md:grid-cols-3">
                                                            <label className="text-sm font-bold text-slate-700">
                                                                Full Name
                                                                <input
                                                                    aria-invalid={Boolean(
                                                                        teamMemberErrors[
                                                                            index
                                                                        ]
                                                                            ?.fullName,
                                                                    )}
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                    disabled={
                                                                        isFormLocked
                                                                    }
                                                                    onChange={updateTeamMember(
                                                                        index,
                                                                        "fullName",
                                                                    )}
                                                                    placeholder="Enter member name"
                                                                    type="text"
                                                                    value={
                                                                        member.fullName
                                                                    }
                                                                />
                                                                <FieldError
                                                                    message={
                                                                        teamMemberErrors[
                                                                            index
                                                                        ]
                                                                            ?.fullName
                                                                    }
                                                                />
                                                            </label>
                                                            <label className="text-sm font-bold text-slate-700">
                                                                Email
                                                                <input
                                                                    aria-invalid={Boolean(
                                                                        teamMemberErrors[
                                                                            index
                                                                        ]
                                                                            ?.email,
                                                                    )}
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                    disabled={
                                                                        isFormLocked
                                                                    }
                                                                    onChange={updateTeamMember(
                                                                        index,
                                                                        "email",
                                                                    )}
                                                                    placeholder="member@example.com"
                                                                    type="email"
                                                                    value={
                                                                        member.email
                                                                    }
                                                                />
                                                                <FieldError
                                                                    message={
                                                                        teamMemberErrors[
                                                                            index
                                                                        ]?.email
                                                                    }
                                                                />
                                                            </label>
                                                            <label className="text-sm font-bold text-slate-700">
                                                                Phone Number
                                                                <input
                                                                    aria-invalid={Boolean(
                                                                        teamMemberErrors[
                                                                            index
                                                                        ]
                                                                            ?.mobile,
                                                                    )}
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                    disabled={
                                                                        isFormLocked
                                                                    }
                                                                    inputMode="numeric"
                                                                    maxLength={
                                                                        10
                                                                    }
                                                                    onChange={updateTeamMember(
                                                                        index,
                                                                        "mobile",
                                                                    )}
                                                                    pattern="[0-9]{10}"
                                                                    placeholder="10 digit mobile number"
                                                                    type="text"
                                                                    value={
                                                                        member.mobile
                                                                    }
                                                                />
                                                                <FieldError
                                                                    message={
                                                                        teamMemberErrors[
                                                                            index
                                                                        ]
                                                                            ?.mobile
                                                                    }
                                                                />
                                                            </label>
                                                        </div>
                                                    </article>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            {proposalFields.map(
                                ({ field, guidance, label }, index) => (
                                    <label
                                        className="flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-sm"
                                        key={field}
                                    >
                                        <span className="flex min-h-20 items-start gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-sm font-black text-blue-700 ring-1 ring-slate-200">
                                                {String(index + 1).padStart(
                                                    2,
                                                    "0",
                                                )}
                                            </span>
                                            <span>
                                                <span className="block text-sm font-bold text-[#0b1f3a]">
                                                    {label}
                                                </span>
                                                <span className="mt-1 block text-sm font-normal leading-6 text-slate-600">
                                                    {guidance}
                                                </span>
                                            </span>
                                        </span>
                                        <textarea
                                            aria-invalid={Boolean(
                                                currentErrors[field],
                                            )}
                                            className={textareaClass}
                                            disabled={isFormLocked}
                                            maxLength={1000}
                                            onChange={updateValue(field)}
                                            placeholder={`Write ${label.toLowerCase()}`}
                                            rows={5}
                                            value={values[field]}
                                        />
                                        <div className="mt-2 flex">
                                            <FieldError
                                                message={currentErrors[field]}
                                            />
                                            <FieldCounter
                                                value={values[field]}
                                            />
                                        </div>
                                    </label>
                                ),
                            )}
                        </div>
                    </section>

                    <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                        <label className="text-sm font-bold text-slate-700">
                            Mentor Acknowledgement (optional)
                            <textarea
                                className={textareaClass}
                                disabled={isFormLocked}
                                maxLength={1000}
                                onChange={updateValue("mentorAcknowledgeTo")}
                                placeholder="Mention mentors, guides, or institutions to acknowledge"
                                rows={4}
                                value={values.mentorAcknowledgeTo}
                            />
                            <div className="mt-2 flex">
                                <FieldCounter
                                    value={values.mentorAcknowledgeTo}
                                />
                            </div>
                        </label>

                        <label className="text-sm font-bold text-slate-700">
                            Intellectual Property and Publication (optional)
                            <textarea
                                className={textareaClass}
                                disabled={isFormLocked}
                                maxLength={1000}
                                onChange={updateValue(
                                    "intellectualPropertyPublication",
                                )}
                                placeholder="Mention patents, publications, ownership, or permissions"
                                rows={4}
                                value={values.intellectualPropertyPublication}
                            />
                            <div className="mt-2 flex">
                                <FieldCounter
                                    value={
                                        values.intellectualPropertyPublication
                                    }
                                />
                            </div>
                        </label>

                        <div>
                            <p className="text-sm font-bold text-slate-700">
                                Supporting Documents
                            </p>
                            <div
                                aria-disabled={
                                    isFormLocked ||
                                    hasReachedSupportingDocumentLimit
                                }
                                className={`mt-2 rounded-lg border-2 border-dashed p-6 text-center transition ${
                                    currentErrors.supportingDocuments ||
                                    supportingDocumentsError
                                        ? "border-red-300 bg-red-50/40"
                                        : isFormLocked ||
                                            hasReachedSupportingDocumentLimit
                                          ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-75"
                                          : isSupportingDocumentsDragActive
                                            ? "border-blue-600 bg-blue-50"
                                            : "border-slate-300 bg-slate-50"
                                }`}
                                onDragEnter={(event) => {
                                    event.preventDefault();
                                    if (
                                        isFormLocked ||
                                        hasReachedSupportingDocumentLimit
                                    ) {
                                        setIsSupportingDocumentsDragActive(
                                            false,
                                        );
                                        return;
                                    }
                                    setIsSupportingDocumentsDragActive(true);
                                }}
                                onDragLeave={(event) => {
                                    event.preventDefault();
                                    setIsSupportingDocumentsDragActive(false);
                                }}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    if (
                                        isFormLocked ||
                                        hasReachedSupportingDocumentLimit
                                    ) {
                                        event.dataTransfer.dropEffect = "none";
                                    }
                                }}
                                onDrop={dropSupportingDocuments}
                            >
                                <input
                                    accept="application/pdf,.pdf"
                                    className="sr-only"
                                    disabled={
                                        isFormLocked ||
                                        hasReachedSupportingDocumentLimit
                                    }
                                    multiple
                                    onChange={updateFiles}
                                    ref={supportingDocumentsInputRef}
                                    type="file"
                                />
                                <UploadCloud
                                    className="mx-auto text-slate-500"
                                    size={34}
                                />
                                <p className="mt-3 text-sm font-semibold text-[#0b1f3a]">
                                    Drag and drop PDF documents here
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {hasReachedSupportingDocumentLimit
                                        ? `Upload limit reached (${maxSupportingDocuments} files).`
                                        : "Choose files from your device or drop them here."}
                                </p>
                                <button
                                    className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-[#0b1f3a] transition hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                    disabled={
                                        isFormLocked ||
                                        hasReachedSupportingDocumentLimit
                                    }
                                    onClick={() =>
                                        supportingDocumentsInputRef.current?.click()
                                    }
                                    type="button"
                                >
                                    Browse Files
                                </button>
                            </div>
                            <div className="mt-1 flex items-start justify-between gap-3">
                                <span className="text-xs font-normal text-red-700">
                                    {supportingDocumentsError ||
                                        currentErrors.supportingDocuments}
                                </span>
                                <span className="ml-auto shrink-0 text-right text-xs font-normal text-slate-500">
                                    Maximum {maxSupportingDocuments} PDF files,{" "}
                                    {maxSupportingDocumentSizeMb} MB each.
                                </span>
                            </div>
                            {files.length > 0 && (
                                <ul className="mt-3 grid gap-2">
                                    {files.map((file, index) => (
                                        <li
                                            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                            key={`${file.name}-${file.size}-${index}`}
                                        >
                                            <span className="inline-flex min-w-0 items-center gap-2">
                                                <FileText
                                                    className="shrink-0 text-blue-700"
                                                    size={16}
                                                />
                                                <span className="truncate">
                                                    {file.name}
                                                </span>
                                            </span>
                                            <span className="inline-flex shrink-0 items-center gap-3">
                                                <span className="font-normal text-slate-500">
                                                    {formatFileSize(file.size)}
                                                </span>
                                                <button
                                                    aria-label={`Remove ${file.name}`}
                                                    className="rounded-full p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                                                    disabled={isFormLocked}
                                                    onClick={() =>
                                                        removeFile(index)
                                                    }
                                                    type="button"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {isEditMode && existingSupportingDocuments.length > 0 && (
                                <ul className="mt-3 grid gap-2">
                                    {existingSupportingDocuments.map((document) => (
                                        <li
                                            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                                            key={String(
                                                document.id ??
                                                    document.originalFileName,
                                            )}
                                        >
                                            <span className="inline-flex min-w-0 items-center gap-2">
                                                <FileText
                                                    className="shrink-0 text-blue-700"
                                                    size={16}
                                                />
                                                <span className="truncate">
                                                    {document.originalFileName ??
                                                        "Uploaded document"}
                                                </span>
                                            </span>
                                            <span className="inline-flex shrink-0 items-center gap-3">
                                                <span className="font-normal text-slate-500">
                                                    {formatFileSize(
                                                        Number(
                                                            document.fileSizeBytes ??
                                                                0,
                                                        ),
                                                    )}
                                                </span>
                                                <button
                                                    aria-label={`Delete ${
                                                        document.originalFileName ??
                                                        "uploaded document"
                                                    }`}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    disabled={
                                                        isFormLocked ||
                                                        deletingDocumentId ===
                                                            document.id
                                                    }
                                                    onClick={() =>
                                                        deleteExistingDocument(
                                                            document,
                                                        )
                                                    }
                                                    type="button"
                                                >
                                                    <Trash2 size={14} />
                                                    {deletingDocumentId ===
                                                    document.id
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <label className="text-sm font-bold text-slate-700">
                            Video URL (optional)
                            <span className="mt-2 flex items-center rounded-lg border border-slate-200 bg-white px-4 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
                                <LinkIcon
                                    className="shrink-0 text-slate-400"
                                    size={18}
                                />
                                <input
                                    aria-invalid={Boolean(
                                        currentErrors.videoUrl,
                                    )}
                                    className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm font-normal text-[#0b1f3a] outline-none placeholder:text-slate-400"
                                    disabled={isFormLocked}
                                    onChange={updateValue("videoUrl")}
                                    placeholder="https://"
                                    type="url"
                                    value={values.videoUrl}
                                />
                            </span>
                            <FieldError message={currentErrors.videoUrl} />
                        </label>
                    </section>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            {statusMessage ? (
                                <p
                                    className={`text-sm font-normal ${
                                        statusMessage.startsWith("Draft") ||
                                        statusMessage.startsWith("Proposal") ||
                                        statusMessage.startsWith("Application")
                                            ? "text-emerald-700"
                                            : "text-red-700"
                                    }`}
                                >
                                    {statusMessage}
                                </p>
                            ) : (
                                <p className="text-sm font-normal text-slate-500">
                                    {isEditMode
                                        ? "Update the details for this application."
                                        : "Submit creates a new application record in your workspace."}
                                </p>
                            )}
                            <div className="flex flex-col gap-3 sm:flex-row md:ml-auto">
                                <button
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
                                    disabled={!canSubmit}
                                    type="submit"
                                >
                                    <Send size={18} />
                                    {isEditMode
                                        ? "Submit the Application"
                                        : isSubmitting
                                          ? "Submitting..."
                                          : "Submit Proposal"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                <aside className="grid h-fit gap-4 xl:sticky xl:top-4">
                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-wide text-[#138808]">
                            Applicant details from registration
                        </p>
                        <h3 className="mt-2 text-xl font-black text-[#0b1f3a]">
                            Applicant Profile
                        </h3>

                        {isApplicantDataLoading ? (
                            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
                                Loading applicant details...
                            </p>
                        ) : applicantDataError ? (
                            <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">
                                {applicantDataError}
                            </p>
                        ) : (
                            <div className="mt-5 rounded-lg border border-slate-200 px-4">
                                <ApplicantField
                                    label="Full Name"
                                    value={applicantData?.participant?.fullName}
                                />
                                <ApplicantField
                                    label="Email"
                                    value={applicantData?.participant?.email}
                                />
                                <ApplicantField
                                    label="Phone"
                                    value={applicantData?.participant?.mobile}
                                />
                                <ApplicantField
                                    label="Date of Birth"
                                    value={formatDateOnly(
                                        applicantData?.participant?.dateOfBirth,
                                    )}
                                />
                                <ApplicantField
                                    label="Gender"
                                    value={applicantData?.participant?.gender}
                                />
                                <ApplicantField
                                    label="Participant Category"
                                    value={localizedName(
                                        applicantData?.participantCategory
                                            ?.name,
                                    )}
                                />
                                <ApplicantField
                                    label="State"
                                    value={localizedName(
                                        applicantData?.state?.name,
                                    )}
                                />
                                <ApplicantField
                                    label="District"
                                    value={localizedName(
                                        applicantData?.district?.name,
                                    )}
                                />
                                <ApplicantField
                                    label="City"
                                    value={applicantData?.profile?.city}
                                />
                                <ApplicantField
                                    label="PIN Code"
                                    value={applicantData?.profile?.pinCode}
                                />
                                <ApplicantField
                                    label="Address"
                                    value={applicantData?.profile?.address}
                                />
                                <ApplicantField
                                    label="Highest Educational Qualification"
                                    value={
                                        applicantData?.profile
                                            ?.highestEducationalQualification
                                    }
                                />
                                <ApplicantField
                                    label="Last Attended Educational Institute"
                                    value={
                                        applicantData?.profile
                                            ?.lastAttendedEducationalInstitute
                                    }
                                />
                                <ApplicantField
                                    label="Year of Passing"
                                    value={
                                        applicantData?.profile?.yearOfPassing
                                    }
                                />
                                <ApplicantField
                                    label="Institute / Organisation"
                                    value={
                                        applicantData?.profile?.instituteName
                                    }
                                />
                                <ApplicantField
                                    label="Organisation Type"
                                    value={
                                        localizedName(
                                            applicantData?.instituteType?.name,
                                        ) ||
                                        applicantData?.profile
                                            ?.otherInstituteType
                                    }
                                />
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </ParticipantShell>
    );
}

export default function Page() {
    return <ParticipantApplicationFormPage />;
}
