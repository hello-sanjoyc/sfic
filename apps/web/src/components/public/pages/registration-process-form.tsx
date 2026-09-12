"use client";

import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    FileText,
    UploadCloud,
    X,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSiteContent } from "@/content";
import { apiClient, endpoints } from "@/lib/api";
import { themes } from "@/mocks/public";

const steps = [
    "Registration",
    "Email Verification",
    "Profile Completion",
    "Proposal Submission",
    "Application Number Generation",
];

type FormValues = {
    participantCategory: string;
    participationMode: string;
    fullName: string;
    email: string;
    mobile: string;
    address: string;
    city: string;
    district: string;
    districtId: string;
    state: string;
    stateId: string;
    country: string;
    pinCode: string;
    organisationName: string;
    organisationType: string;
    otherOrganisationType: string;
    theme: string;
    problemLocation: string;
    proposedSolution: string;
    technologyMethod: string;
    implementationRoute: string;
    costFunding: string;
    beneficiaries: string;
    projectTimeline: string;
    expectedImpact: string;
    scalability: string;
    prototypePilot: string;
};
type TeamMember = {
    fullName: string;
    email: string;
    mobile: string;
};
type TeamMemberErrors = Partial<Record<keyof TeamMember, string>>;
type LookupName = {
    bn: string;
    en: string;
    hi?: string;
    hn?: string;
};
type LookupOption = {
    id: number;
    name: LookupName;
    sortOrder?: number;
};
type DistrictOption = LookupOption & {
    stateId: number;
};
type InstituteTypesResponse = {
    participantCategory: Array<{
        instituteTypes: LookupOption[];
        participantCode: string;
    }>;
};
type RegistrationApplicationResponse = {
    applicationNumber: string;
    emailVerified: boolean;
    id: number;
    participantId: number;
    status: string;
};
type CreateRegistrationResponse = {
    application: RegistrationApplicationResponse;
    emailDelivery: {
        delivered: boolean;
        reason?: string;
    };
    verificationUrl?: string;
};
type RegistrationDetailsResponse = {
    application: RegistrationApplicationResponse;
    participant: {
        email: string;
        fullName: string;
        id: number;
        mobile: string;
        participantCategoryCode: string;
    };
};
type LookupLocale = "bn" | "en" | "hi";
type ValidationLookups = {
    districts: DistrictOption[];
    instituteTypes: LookupOption[];
    states: LookupOption[];
};

type FieldName = keyof FormValues | "supportingDocuments";
type FormErrors = Partial<Record<FieldName, string>>;
type StoredRegistrationForm = {
    applicationId?: number;
    applicationNumber?: string;
    emailVerified?: boolean;
    isOpen?: boolean;
    participantId?: number;
    step?: number;
    teamMembers?: TeamMember[];
    values?: Partial<FormValues>;
};

const initialValues: FormValues = {
    participantCategory: "",
    participationMode: "",
    fullName: "",
    email: "",
    mobile: "",
    address: "",
    city: "",
    district: "",
    districtId: "",
    state: "West Bengal",
    stateId: "",
    country: "India",
    pinCode: "",
    organisationName: "",
    organisationType: "",
    otherOrganisationType: "",
    theme: "",
    problemLocation: "",
    proposedSolution: "",
    technologyMethod: "",
    implementationRoute: "",
    costFunding: "",
    beneficiaries: "",
    projectTimeline: "",
    expectedImpact: "",
    scalability: "",
    prototypePilot: "",
};
const emptyTeamMember: TeamMember = {
    fullName: "",
    email: "",
    mobile: "",
};

const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none transition placeholder:font-normal focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/20";
const registrationFormStorageKey =
    "sewa-first-innovation-challenge-registration-form";
const maxSupportingDocuments = Number.parseInt(
    process.env.NEXT_PUBLIC_SUPPORTING_DOCUMENT_MAX_FILES ?? "3",
    10,
);
const maxSupportingDocumentSizeMb = Number.parseInt(
    process.env.NEXT_PUBLIC_SUPPORTING_DOCUMENT_MAX_SIZE_MB ?? "2",
    10,
);
const maxSupportingDocumentSizeBytes =
    maxSupportingDocumentSizeMb * 1024 * 1024;
const instituteTypesByCategory: Record<string, string[]> = {
    Junior: ["School", "ITI", "Diploma", "Under-graduate"],
    Open: [
        "School",
        "ITI",
        "Diploma",
        "Under-graduate",
        "Graduate",
        "Professional",
        "Startup",
        "Community Group",
    ],
};
const participantCategories = [
    {
        value: "Junior",
        title: "Junior",
        description: "School, ITI and undergraduate.",
    },
    {
        value: "Open",
        title: "Open",
        description: "Graduates, professionals, startups and community groups.",
    },
];

function getLookupLocale(locale: string): LookupLocale {
    return locale === "bn" || locale === "hi" ? locale : "en";
}

function getLocalizedLookupName(name: LookupName, locale: LookupLocale) {
    if (locale === "hi") return name.hi ?? name.hn ?? name.en;
    return name[locale] ?? name.en;
}

function getParticipantCode(participantCategory: string) {
    return participantCategory.trim().toUpperCase();
}

function getParticipantCategoryFromCode(code: string) {
    return code.toUpperCase() === "JUNIOR" ? "Junior" : "Open";
}

function getOptionById<T extends LookupOption>(options: T[], id: string) {
    const numericId = Number(id);
    return Number.isFinite(numericId)
        ? options.find((option) => option.id === numericId)
        : undefined;
}
const proposalElements = [
    {
        field: "problemLocation",
        label: "Problem and Location",
        guidance:
            "A specific, observed problem in a named place, not a general condition.",
    },
    {
        field: "proposedSolution",
        label: "Proposed Solution",
        guidance: "What is actually being built or done, described plainly.",
    },
    {
        field: "technologyMethod",
        label: "Technology or Method",
        guidance: "The means, and why it suits the setting and the budget.",
    },
    {
        field: "implementationRoute",
        label: "Implementation Route",
        guidance: "Who does what, in what order, and with whose permission.",
    },
    {
        field: "costFunding",
        label: "Cost and Funding",
        guidance: "An honest estimate, including what is not yet funded.",
    },
    {
        field: "beneficiaries",
        label: "Beneficiaries",
        guidance: "Who benefits, how many, and how that number was arrived at.",
    },
    {
        field: "projectTimeline",
        label: "Timeline",
        guidance: "A realistic period to a working pilot.",
    },
    {
        field: "expectedImpact",
        label: "Expected Impact",
        guidance:
            "Social, economic or environmental, stated in measurable terms.",
    },
    {
        field: "scalability",
        label: "Scalability",
        guidance:
            "Whether it can travel to another district, and what would have to change.",
    },
    {
        field: "prototypePilot",
        label: "Prototype or Pilot",
        guidance: "Where one exists, evidence rather than description.",
    },
] as const satisfies ReadonlyArray<{
    field: keyof FormValues;
    label: string;
    guidance: string;
}>;
const proposalElementFields = proposalElements.map(({ field }) => field);
type ProposalElementField = (typeof proposalElements)[number]["field"];

function isProposalElementField(
    field: keyof FormValues,
): field is ProposalElementField {
    return proposalElementFields.some(
        (proposalField) => proposalField === field,
    );
}
const eligibleStateDistricts: Record<string, string[]> = {
    "Arunachal Pradesh": [
        "Anjaw",
        "Changlang",
        "Dibang Valley",
        "East Kameng",
        "East Siang",
        "Kamle",
        "Kra Daadi",
        "Kurung Kumey",
        "Leparada",
        "Lohit",
        "Longding",
        "Lower Dibang Valley",
        "Lower Siang",
        "Lower Subansiri",
        "Namsai",
        "Pakke-Kessang",
        "Papum Pare",
        "Shi Yomi",
        "Siang",
        "Tawang",
        "Tirap",
        "Upper Siang",
        "Upper Subansiri",
        "West Kameng",
        "West Siang",
    ],
    Assam: [
        "Baksa",
        "Barpeta",
        "Biswanath",
        "Bongaigaon",
        "Cachar",
        "Charaideo",
        "Chirang",
        "Darrang",
        "Dhemaji",
        "Dhubri",
        "Dibrugarh",
        "Dima Hasao",
        "Goalpara",
        "Golaghat",
        "Hailakandi",
        "Hojai",
        "Jorhat",
        "Kamrup",
        "Kamrup Metropolitan",
        "Karbi Anglong",
        "Karimganj",
        "Kokrajhar",
        "Lakhimpur",
        "Majuli",
        "Morigaon",
        "Nagaon",
        "Nalbari",
        "Sivasagar",
        "Sonitpur",
        "South Salmara-Mankachar",
        "Tamulpur",
        "Tinsukia",
        "Udalguri",
        "West Karbi Anglong",
    ],
    Bihar: [
        "Araria",
        "Arwal",
        "Aurangabad",
        "Banka",
        "Begusarai",
        "Bhagalpur",
        "Bhojpur",
        "Buxar",
        "Darbhanga",
        "East Champaran",
        "Gaya",
        "Gopalganj",
        "Jamui",
        "Jehanabad",
        "Kaimur",
        "Katihar",
        "Khagaria",
        "Kishanganj",
        "Lakhisarai",
        "Madhepura",
        "Madhubani",
        "Munger",
        "Muzaffarpur",
        "Nalanda",
        "Nawada",
        "Patna",
        "Purnia",
        "Rohtas",
        "Saharsa",
        "Samastipur",
        "Saran",
        "Sheikhpura",
        "Sheohar",
        "Sitamarhi",
        "Siwan",
        "Supaul",
        "Vaishali",
        "West Champaran",
    ],
    Jharkhand: [
        "Bokaro",
        "Chatra",
        "Deoghar",
        "Dhanbad",
        "Dumka",
        "East Singhbhum",
        "Garhwa",
        "Giridih",
        "Godda",
        "Gumla",
        "Hazaribagh",
        "Jamtara",
        "Khunti",
        "Koderma",
        "Latehar",
        "Lohardaga",
        "Pakur",
        "Palamu",
        "Ramgarh",
        "Ranchi",
        "Sahibganj",
        "Saraikela Kharsawan",
        "Simdega",
        "West Singhbhum",
    ],
    Manipur: [
        "Bishnupur",
        "Chandel",
        "Churachandpur",
        "Imphal East",
        "Imphal West",
        "Jiribam",
        "Kakching",
        "Kamjong",
        "Kangpokpi",
        "Noney",
        "Pherzawl",
        "Senapati",
        "Tamenglong",
        "Tengnoupal",
        "Thoubal",
        "Ukhrul",
    ],
    Meghalaya: [
        "East Garo Hills",
        "East Jaintia Hills",
        "East Khasi Hills",
        "Eastern West Khasi Hills",
        "North Garo Hills",
        "Ri Bhoi",
        "South Garo Hills",
        "South West Garo Hills",
        "South West Khasi Hills",
        "West Garo Hills",
        "West Jaintia Hills",
        "West Khasi Hills",
    ],
    Mizoram: [
        "Aizawl",
        "Champhai",
        "Hnahthial",
        "Khawzawl",
        "Kolasib",
        "Lawngtlai",
        "Lunglei",
        "Mamit",
        "Saitual",
        "Serchhip",
        "Siaha",
    ],
    Nagaland: [
        "Chumoukedima",
        "Dimapur",
        "Kiphire",
        "Kohima",
        "Longleng",
        "Mokokchung",
        "Mon",
        "Niuland",
        "Noklak",
        "Peren",
        "Phek",
        "Shamator",
        "Tseminyu",
        "Tuensang",
        "Wokha",
        "Zunheboto",
    ],
    Sikkim: ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"],
    Tripura: [
        "Dhalai",
        "Gomati",
        "Khowai",
        "North Tripura",
        "Sepahijala",
        "South Tripura",
        "Unakoti",
        "West Tripura",
    ],
    "West Bengal": [
        "Alipurduar",
        "Bankura",
        "Birbhum",
        "Cooch Behar",
        "Dakshin Dinajpur",
        "Darjeeling",
        "Hooghly",
        "Howrah",
        "Jalpaiguri",
        "Jhargram",
        "Kalimpong",
        "Kolkata",
        "Malda",
        "Murshidabad",
        "Nadia",
        "North 24 Parganas",
        "Paschim Bardhaman",
        "Paschim Medinipur",
        "Purba Bardhaman",
        "Purba Medinipur",
        "Purulia",
        "South 24 Parganas",
        "Uttar Dinajpur",
    ],
};
const eligibleStates = Object.keys(eligibleStateDistricts);

const stepFields: Record<number, FieldName[]> = {
    0: ["participantCategory", "fullName", "email", "mobile"],
    2: [
        "state",
        "district",
        "city",
        "pinCode",
        "address",
        "organisationName",
        "organisationType",
        "participationMode",
    ],
    3: ["theme", ...proposalElementFields, "supportingDocuments"],
};
const multilingualNamePattern = /^[\p{L}\p{M} ]{2,}$/u;
const nonMultilingualNameCharacters = /[^\p{L}\p{M} ]/gu;
type ValidationMessages = ReturnType<typeof getSiteContent>["register"]["errors"];

function messageTemplate(
    message: string,
    values: Record<string, string | number>,
) {
    return Object.entries(values).reduce(
        (current, [key, value]) =>
            current.replaceAll(`{${key}}`, String(value)),
        message,
    );
}

function makeApplicationNumber() {
    return `RIC-2026-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function validateField(
    field: FieldName,
    values: FormValues,
    hasSupportingDocuments: boolean,
    messages: ValidationMessages,
    lookups: ValidationLookups,
) {
    const value = field === "supportingDocuments" ? "" : values[field].trim();

    switch (field) {
        case "fullName":
            return multilingualNamePattern.test(value)
                ? ""
                : messages.alphabetsOnly;
        case "participantCategory":
            return participantCategories.some(
                (category) => category.value === value,
            )
                ? ""
                : messages.participantCategory;
        case "participationMode":
            return value === "Individual" || value === "Team"
                ? ""
                : messages.participationMode;
        case "email":
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : messages.email;
        case "mobile":
            return /^[0-9]{10}$/.test(value) ? "" : messages.mobile;
        case "address":
            return value ? "" : messages.address;
        case "city":
            return value ? "" : messages.city;
        case "district":
            return getOptionById(lookups.districts, values.districtId)
                ? ""
                : messages.district;
        case "state":
            return getOptionById(lookups.states, values.stateId)
                ? ""
                : messages.state;
        case "country":
            return value === "India" ? "" : messages.country;
        case "pinCode":
            return /^[0-9]{4,10}$/.test(value) ? "" : messages.pinCode;
        case "organisationName":
            return value ? "" : messages.instituteName;
        case "organisationType":
            return lookups.instituteTypes.some((option) => option.name.en === value)
                ? ""
                : messages.instituteType;
        case "otherOrganisationType":
            return values.organisationType !== "Other" || value
                ? ""
                : messages.organisationType;
        case "theme":
            return value ? "" : messages.challengeCategory;
        case "problemLocation":
        case "proposedSolution":
        case "technologyMethod":
        case "implementationRoute":
        case "costFunding":
        case "beneficiaries":
        case "projectTimeline":
        case "expectedImpact":
        case "scalability":
        case "prototypePilot":
            return value.length >= 50 && value.length <= 1000
                ? ""
                : messages.proposalCharacters;
        case "supportingDocuments":
            return hasSupportingDocuments
                ? ""
                : messages.supportingDocumentRequired;
        default:
            return "";
    }
}

function validateStep(
    step: number,
    values: FormValues,
    hasSupportingDocuments: boolean,
    messages: ValidationMessages,
    lookups: ValidationLookups,
) {
    return (stepFields[step] ?? []).reduce<FormErrors>((errors, field) => {
        const error = validateField(
            field,
            values,
            hasSupportingDocuments,
            messages,
            lookups,
        );
        if (error) errors[field] = error;
        return errors;
    }, {});
}

function validateTeamMembers(
    participationMode: string,
    teamLeadEmail: string,
    teamLeadMobile: string,
    teamMembers: TeamMember[],
    messages: ValidationMessages,
) {
    if (participationMode !== "Team") return [];
    const normalizedTeamLeadEmail = teamLeadEmail.trim().toLowerCase();
    const normalizedTeamLeadMobile = teamLeadMobile.trim();

    return teamMembers.map<TeamMemberErrors>((member) => {
        const errors: TeamMemberErrors = {};
        const email = member.email.trim().toLowerCase();
        const mobile = member.mobile.trim();

        if (!multilingualNamePattern.test(member.fullName.trim())) {
            errors.fullName = messages.alphabetsOnly;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = messages.email;
        } else if (email === normalizedTeamLeadEmail) {
            errors.email = messages.teamLeadEmailMatch;
        } else if (
            teamMembers.filter(
                (teamMember) =>
                    teamMember.email.trim().toLowerCase() === email,
            ).length > 1
        ) {
            errors.email = messages.teamEmailUnique;
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
            errors.mobile = messages.mobile;
        } else if (mobile === normalizedTeamLeadMobile) {
            errors.mobile = messages.teamLeadPhoneMatch;
        } else if (
            teamMembers.filter(
                (teamMember) => teamMember.mobile.trim() === mobile,
            ).length > 1
        ) {
            errors.mobile = messages.teamPhoneUnique;
        }

        return errors;
    });
}

function formatFileSize(
    size: number,
    units: ReturnType<typeof getSiteContent>["register"]["fileUnits"],
) {
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} ${units.kb}`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} ${units.mb}`;
}

function getFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

function getSupportingDocumentFileError(
    file: File,
    messages: ValidationMessages,
) {
    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {
        return messages.pdfOnly;
    }

    if (file.size > maxSupportingDocumentSizeBytes) {
        return messageTemplate(messages.supportingDocumentSize, {
            size: maxSupportingDocumentSizeMb,
        });
    }

    return "";
}

function validateSupportingDocuments(
    files: FileList | File[] | null,
    messages: ValidationMessages,
) {
    if (!files?.length) {
        return {
            error: messages.supportingDocumentRequired,
            isValid: false,
        };
    }

    const selectedFiles = Array.from(files);
    if (selectedFiles.length > maxSupportingDocuments) {
        return {
            error: messageTemplate(messages.supportingDocumentMax, {
                count: maxSupportingDocuments,
            }),
            isValid: false,
        };
    }

    const hasInvalidType = selectedFiles.some(
        (file) =>
            file.type !== "application/pdf" &&
            !file.name.toLowerCase().endsWith(".pdf"),
    );
    if (hasInvalidType) {
        return { error: messages.pdfOnly, isValid: false };
    }

    const hasOversizedFile = selectedFiles.some(
        (file) => file.size > maxSupportingDocumentSizeBytes,
    );
    if (hasOversizedFile) {
        return {
            error: messageTemplate(messages.supportingDocumentSize, {
                size: maxSupportingDocumentSizeMb,
            }),
            isValid: false,
        };
    }

    return { error: "", isValid: true };
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;

    return (
        <span className="mt-1 block text-xs font-normal text-red-700">
            {message}
        </span>
    );
}

export function RegistrationProcessForm({
    showStartButton = true,
    startOpen = false,
}: {
    showStartButton?: boolean;
    startOpen?: boolean;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const locale = pathname.split("/")[1] || "en";
    const lookupLocale = getLookupLocale(locale);
    const siteContent = getSiteContent(locale);
    const content = siteContent.register;
    const validationMessages = content.errors;
    const localizedSteps = content.steps;
    const localizedThemes = themes.map((theme, index) => ({
        ...theme,
        title: siteContent.home.themes.items[index]?.[0] ?? theme.title,
    }));
    const localizedProposalElements = proposalElements.map((element, index) => ({
        ...element,
        label: content.proposalElements[index]?.[0] ?? element.label,
        guidance: content.proposalElements[index]?.[1] ?? element.guidance,
    }));
    const [isOpen, setIsOpen] = useState(startOpen);
    const [hasRestoredForm, setHasRestoredForm] = useState(false);
    const [step, setStep] = useState(0);
    const [values, setValues] = useState<FormValues>(initialValues);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [hasSupportingDocuments, setHasSupportingDocuments] = useState(false);
    const [supportingDocumentsError, setSupportingDocumentsError] =
        useState("");
    const [selectedSupportingDocuments, setSelectedSupportingDocuments] =
        useState<File[]>([]);
    const [
        isSupportingDocumentsDragActive,
        setIsSupportingDocumentsDragActive,
    ] = useState(false);
    const [applicationNumber, setApplicationNumber] = useState("");
    const [applicationId, setApplicationId] = useState<number | undefined>();
    const [participantId, setParticipantId] = useState<number | undefined>();
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isSubmittingRegistration, setIsSubmittingRegistration] =
        useState(false);
    const [registrationSubmitError, setRegistrationSubmitError] =
        useState("");
    const [verificationMessage, setVerificationMessage] = useState("");
    const [stateOptions, setStateOptions] = useState<LookupOption[]>([]);
    const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
    const [instituteTypeOptions, setInstituteTypeOptions] = useState<
        LookupOption[]
    >([]);
    const [stateLookupError, setStateLookupError] = useState("");
    const [districtLookupError, setDistrictLookupError] = useState("");
    const [instituteTypeLookupError, setInstituteTypeLookupError] =
        useState("");
    const formRef = useRef<HTMLDivElement>(null);
    const supportingDocumentsInputRef = useRef<HTMLInputElement>(null);
    const validationLookups = useMemo<ValidationLookups>(
        () => ({
            districts: districtOptions,
            instituteTypes: instituteTypeOptions,
            states: stateOptions,
        }),
        [districtOptions, instituteTypeOptions, stateOptions],
    );

    const progress = useMemo(
        () =>
            Math.round(
                ((step === steps.length - 1 ? steps.length : step) /
                    steps.length) *
                    100,
            ),
        [step],
    );
    const currentErrors = useMemo(
        () =>
            validateStep(
                step,
                values,
                hasSupportingDocuments,
                validationMessages,
                validationLookups,
            ),
        [
            hasSupportingDocuments,
            step,
            validationLookups,
            validationMessages,
            values,
        ],
    );
    const teamMemberErrors = useMemo(
        () =>
            validateTeamMembers(
                values.participationMode,
                values.email,
                values.mobile,
                teamMembers,
                validationMessages,
            ),
        [
            teamMembers,
            validationMessages,
            values.email,
            values.mobile,
            values.participationMode,
        ],
    );
    const hasTeamMemberErrors = teamMemberErrors.some(
        (errors) => Object.keys(errors).length > 0,
    );
    const canContinue =
        Object.keys(currentErrors).length === 0 &&
        (step !== 1 || isEmailVerified) &&
        (step !== 2 || !hasTeamMemberErrors) &&
        !isSubmittingRegistration;
    const hasReachedSupportingDocumentLimit =
        selectedSupportingDocuments.length >= maxSupportingDocuments;

    useEffect(() => {
        let isMounted = true;

        apiClient
            .get<LookupOption[]>(endpoints.common.states)
            .then((states) => {
                if (!isMounted) return;
                setStateOptions(states);
                setStateLookupError("");
            })
            .catch(() => {
                if (isMounted) setStateLookupError(validationMessages.state);
            });

        return () => {
            isMounted = false;
        };
    }, [validationMessages.state]);

    useEffect(() => {
        if (!stateOptions.length) return;

        setValues((current) => {
            if (current.stateId) return current;

            const westBengal = stateOptions.find(
                (state) => state.name.en === "West Bengal",
            );
            if (!westBengal) return current;

            return {
                ...current,
                state: westBengal.name.en,
                stateId: String(westBengal.id),
            };
        });
    }, [stateOptions]);

    useEffect(() => {
        if (!values.stateId) {
            setDistrictOptions([]);
            return;
        }

        let isMounted = true;

        apiClient
            .get<DistrictOption[]>(endpoints.common.districts, {
                query: { stateId: values.stateId },
            })
            .then((districts) => {
                if (!isMounted) return;
                setDistrictOptions(districts);
                setDistrictLookupError("");
            })
            .catch(() => {
                if (!isMounted) return;
                setDistrictOptions([]);
                setDistrictLookupError(validationMessages.district);
            });

        return () => {
            isMounted = false;
        };
    }, [validationMessages.district, values.stateId]);

    useEffect(() => {
        if (!values.participantCategory) {
            setInstituteTypeOptions([]);
            return;
        }

        let isMounted = true;

        apiClient
            .get<InstituteTypesResponse>(endpoints.common.instituteTypes, {
                query: {
                    participantCode: getParticipantCode(
                        values.participantCategory,
                    ),
                },
            })
            .then((response) => {
                if (!isMounted) return;

                const instituteTypes =
                    response.participantCategory[0]?.instituteTypes ?? [];
                setInstituteTypeOptions(instituteTypes);
                setInstituteTypeLookupError("");
            })
            .catch(() => {
                if (!isMounted) return;
                setInstituteTypeOptions([]);
                setInstituteTypeLookupError(validationMessages.instituteType);
            });

        return () => {
            isMounted = false;
        };
    }, [validationMessages.instituteType, values.participantCategory]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(registrationFormStorageKey);
            if (!saved) return;

            const parsed = JSON.parse(saved) as StoredRegistrationForm;
            setIsOpen(parsed.isOpen ?? startOpen);
            setStep(
                typeof parsed.step === "number"
                    ? Math.min(Math.max(parsed.step, 0), steps.length - 1)
                    : 0,
            );
            setValues({
                ...initialValues,
                ...parsed.values,
                country: "India",
                districtId: parsed.values?.districtId ?? "",
                stateId: parsed.values?.stateId ?? "",
            });
            setTeamMembers(
                (parsed.teamMembers ?? []).slice(0, 4).map((member) => ({
                    fullName: member.fullName ?? "",
                    email: member.email ?? "",
                    mobile: member.mobile ?? "",
                })),
            );
            setApplicationId(parsed.applicationId);
            setApplicationNumber(parsed.applicationNumber ?? "");
            setIsEmailVerified(Boolean(parsed.emailVerified));
            setParticipantId(parsed.participantId);
        } catch {
            localStorage.removeItem(registrationFormStorageKey);
        } finally {
            setHasRestoredForm(true);
        }
    }, [startOpen]);

    useEffect(() => {
        if (!hasRestoredForm) return;
        if (!isOpen) return;

        localStorage.setItem(
            registrationFormStorageKey,
            JSON.stringify({
                applicationId,
                applicationNumber,
                emailVerified: isEmailVerified,
                isOpen,
                participantId,
                step,
                teamMembers,
                values,
            }),
        );
    }, [
        applicationId,
        applicationNumber,
        hasRestoredForm,
        isEmailVerified,
        isOpen,
        participantId,
        step,
        teamMembers,
        values,
    ]);

    useEffect(() => {
        if (!hasRestoredForm) return;

        const emailVerified = searchParams.get("emailVerified");
        if (!emailVerified) return;

        let isMounted = true;
        setIsOpen(true);

        if (emailVerified === "1") {
            const verifiedApplicationId = Number(
                searchParams.get("applicationId"),
            );
            const verifiedParticipantId = Number(
                searchParams.get("participantId"),
            );
            const verifiedApplicationNumber =
                searchParams.get("applicationNumber") ?? "";

            setIsEmailVerified(true);
            setVerificationMessage("");
            setRegistrationSubmitError("");
            setStep(2);

            if (Number.isFinite(verifiedApplicationId)) {
                setApplicationId(verifiedApplicationId);
            }
            if (Number.isFinite(verifiedParticipantId)) {
                setParticipantId(verifiedParticipantId);
            }
            if (verifiedApplicationNumber) {
                setApplicationNumber(verifiedApplicationNumber);
            }

            if (Number.isFinite(verifiedApplicationId)) {
                apiClient
                    .get<RegistrationDetailsResponse>(
                        endpoints.registrations.byId(
                            String(verifiedApplicationId),
                        ),
                    )
                    .then((registration) => {
                        if (!isMounted) return;

                        setValues((current) => ({
                            ...current,
                            email: registration.participant.email,
                            fullName: registration.participant.fullName,
                            mobile: registration.participant.mobile,
                            participantCategory: getParticipantCategoryFromCode(
                                registration.participant
                                    .participantCategoryCode,
                            ),
                        }));
                    })
                    .catch(() => {
                        if (!isMounted) return;

                        setVerificationMessage(
                            "Your email is verified. Some saved details could not be restored, so please review Step 2 carefully.",
                        );
                    });
            }

            return () => {
                isMounted = false;
            };
        }

        setIsEmailVerified(false);
        setStep(1);
        setVerificationMessage(
            "The verification link is invalid or has expired. Please submit Step 1 again to receive a new link.",
        );

        return () => {
            isMounted = false;
        };
    }, [hasRestoredForm, searchParams]);

    const openForm = () => {
        setIsOpen(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 0);
    };

    const updateValue =
        (field: keyof FormValues) =>
        (
            event:
                | React.ChangeEvent<HTMLInputElement>
                | React.ChangeEvent<HTMLTextAreaElement>
                | React.ChangeEvent<HTMLSelectElement>,
        ) => {
            const rawValue = event.target.value;
            const nextValue =
                field === "fullName"
                    ? rawValue.replace(nonMultilingualNameCharacters, "")
                    : field === "mobile"
                      ? rawValue.replace(/\D/g, "").slice(0, 10)
                      : isProposalElementField(field)
                        ? rawValue.slice(0, 1000)
                        : rawValue;

            setValues((current) => ({
                ...current,
                [field]: nextValue,
                ...(field === "organisationType" && nextValue !== "Other"
                    ? { otherOrganisationType: "" }
                    : {}),
            }));
        };

    const updateState = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const stateId = event.target.value;
        const state = getOptionById(stateOptions, stateId);

        setValues((current) => ({
            ...current,
            district: "",
            districtId: "",
            state: state?.name.en ?? "",
            stateId,
        }));
        setDistrictOptions([]);
    };

    const updateDistrict = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const districtId = event.target.value;
        const district = getOptionById(districtOptions, districtId);

        setValues((current) => ({
            ...current,
            district: district?.name.en ?? "",
            districtId,
        }));
    };

    const selectParticipantCategory = (participantCategory: string) => {
        setValues((current) => ({
            ...current,
            participantCategory,
            organisationType: "",
            otherOrganisationType: "",
        }));
        setInstituteTypeOptions([]);
    };

    const selectParticipationMode = (mode: "Individual" | "Team") => {
        setValues((current) => ({
            ...current,
            participationMode: mode,
        }));
        if (mode === "Individual") {
            setTeamMembers([]);
        }
    };

    const addTeamMember = () => {
        setValues((current) => ({
            ...current,
            participationMode: "Team",
        }));
        setTeamMembers((current) =>
            current.length >= 4 ? current : [...current, { ...emptyTeamMember }],
        );
    };

    const updateTeamMember =
        (index: number, field: keyof TeamMember) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const rawValue = event.target.value;
            const nextValue =
                field === "fullName"
                    ? rawValue.replace(nonMultilingualNameCharacters, "")
                    : field === "mobile"
                      ? rawValue.replace(/\D/g, "").slice(0, 10)
                      : rawValue;

            setTeamMembers((current) =>
                current.map((member, memberIndex) =>
                    memberIndex === index
                        ? { ...member, [field]: nextValue }
                        : member,
                ),
            );
        };

    const removeTeamMember = (indexToRemove: number) => {
        setTeamMembers((current) =>
            current.filter((_, index) => index !== indexToRemove),
        );
    };

    const submitRegistrationStep = async () => {
        setIsSubmittingRegistration(true);
        setRegistrationSubmitError("");
        setVerificationMessage("");

        try {
            const result = await apiClient.post<CreateRegistrationResponse>(
                endpoints.registrations.create,
                {
                    email: values.email,
                    fullName: values.fullName,
                    language: lookupLocale,
                    mobile: values.mobile,
                    participantCategory: getParticipantCode(
                        values.participantCategory,
                    ),
                },
            );

            setApplicationId(result.application.id);
            setApplicationNumber(result.application.applicationNumber);
            setIsEmailVerified(result.application.emailVerified);
            setParticipantId(result.application.participantId);
            setStep(result.application.emailVerified ? 2 : 1);
        } catch (error) {
            setRegistrationSubmitError(
                error instanceof Error
                    ? error.message
                    : "Unable to save registration. Please try again.",
            );
        } finally {
            setIsSubmittingRegistration(false);
        }
    };

    const continueToNextStep = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        if (!canContinue) return;

        if (step === 0) {
            await submitRegistrationStep();
            return;
        }

        if (step === steps.length - 2) {
            setApplicationNumber(
                (current) => current || makeApplicationNumber(),
            );
        }
        setStep((current) => Math.min(current + 1, steps.length - 1));
    };

    const setSupportingDocuments = (files: File[]) => {
        const result = validateSupportingDocuments(files, validationMessages);

        setSelectedSupportingDocuments(files);
        setHasSupportingDocuments(result.isValid);
        setSupportingDocumentsError(result.error);
    };

    const handleSupportingDocuments = (files: FileList | File[] | null) => {
        if (hasReachedSupportingDocumentLimit) return;

        const incomingFiles = files ? Array.from(files) : [];
        if (!incomingFiles.length) return;

        const selectedFileKeys = new Set(
            selectedSupportingDocuments.map(getFileKey),
        );
        const nextFiles = [...selectedSupportingDocuments];
        let nextError = "";

        for (const file of incomingFiles) {
            const fileError = getSupportingDocumentFileError(
                file,
                validationMessages,
            );
            if (fileError) {
                nextError = fileError;
                continue;
            }

            if (nextFiles.length >= maxSupportingDocuments) {
                nextError = messageTemplate(
                    validationMessages.supportingDocumentMax,
                    {
                        count: maxSupportingDocuments,
                    },
                );
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

    const updateSupportingDocuments = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        handleSupportingDocuments(event.target.files);
        event.target.value = "";
    };

    const dropSupportingDocuments = (
        event: React.DragEvent<HTMLDivElement>,
    ) => {
        event.preventDefault();
        setIsSupportingDocumentsDragActive(false);
        if (hasReachedSupportingDocumentLimit) return;

        handleSupportingDocuments(event.dataTransfer.files);
    };

    const removeSupportingDocument = (indexToRemove: number) => {
        const nextFiles = selectedSupportingDocuments.filter(
            (_, index) => index !== indexToRemove,
        );

        if (!nextFiles.length) {
            setSelectedSupportingDocuments([]);
            setHasSupportingDocuments(false);
            setSupportingDocumentsError("");
            return;
        }

        setSupportingDocuments(nextFiles);
    };

    return (
        <div className={showStartButton ? "mt-8" : ""}>
            {showStartButton && (
                <button
                    className="inline-flex items-center rounded-md bg-[#ff9933] px-5 py-3 font-bold text-[#071426] transition hover:bg-[#f08a24]"
                    onClick={openForm}
                    type="button"
                >
                    {content.startRegistration}{" "}
                    <ArrowRight className="ml-2" size={18} />
                </button>
            )}

            {isOpen && (
                <section
                    aria-labelledby="registration-form-title"
                    className={`${showStartButton ? "mt-8 " : ""}rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6`}
                    ref={formRef}
                >
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:flex-wrap md:items-start md:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#138808]">
                                {content.stepOf
                                    .replace("{current}", String(step + 1))
                                    .replace("{total}", String(steps.length))}
                            </p>
                            <h2
                                className="mt-2 text-2xl font-bold text-[#0b1f3a]"
                                id="registration-form-title"
                            >
                                {localizedSteps[step]}
                            </h2>
                        </div>
                        <div className="min-w-48">
                            <div className="h-2 rounded-full bg-slate-100">
                                <div
                                    className="h-2 rounded-full bg-[#138808] transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="mt-2 text-right text-xs font-semibold text-slate-500">
                                {content.complete.replace(
                                    "{progress}",
                                    String(progress),
                                )}
                            </p>
                        </div>
                        <p className="w-full text-sm font-medium leading-6 text-slate-600">
                            {content.eligibility}
                        </p>
                    </div>

                    <ol className="mt-5 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-5">
                        {localizedSteps.map((label, index) => (
                            <li
                                className={`flex min-h-16 items-center rounded border px-3 py-2 ${index === step ? "border-[#ff9933] bg-orange-50 text-[#0b1f3a]" : index < step ? "border-[#138808] bg-green-50 text-[#138808]" : "border-slate-200 bg-slate-50"}`}
                                key={label}
                            >
                                {label}
                            </li>
                        ))}
                    </ol>

                    {step === 0 && (
                        <form
                            className="mt-6 grid gap-4"
                            onSubmit={continueToNextStep}
                        >
                            <div>
                                <p className="text-sm font-bold text-slate-700">
                                    {content.participantCategory}
                                </p>
                                <div className="mt-2 grid gap-4 md:grid-cols-2">
                                    {participantCategories.map((category) => {
                                        const isSelected =
                                            values.participantCategory ===
                                            category.value;

                                        return (
                                            <button
                                                aria-pressed={isSelected}
                                                className={`rounded-md border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#ff9933] hover:shadow-[0_12px_28px_-22px_rgba(255,153,51,.9)] ${
                                                    isSelected
                                                        ? "border-[#ff9933] bg-orange-50 ring-2 ring-[#ff9933]/20"
                                                        : "border-slate-200 bg-slate-50"
                                                }`}
                                                key={category.value}
                                                onClick={() =>
                                                    selectParticipantCategory(
                                                        category.value,
                                                    )
                                                }
                                                type="button"
                                            >
                                                <span className="font-bold text-[#0b1f3a]">
                                                    {category.value === "Junior"
                                                        ? content.junior
                                                        : content.open}
                                                </span>
                                                <span className="mt-2 block text-sm leading-6 text-slate-600">
                                                    {category.value === "Junior"
                                                        ? content.juniorDescription
                                                        : content.openDescription}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <FieldError
                                    message={currentErrors.participantCategory}
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-bold text-slate-700">
                                    {content.fullName}
                                    <input
                                        aria-invalid={Boolean(
                                            currentErrors.fullName,
                                        )}
                                        className={inputClass}
                                        onChange={updateValue("fullName")}
                                        placeholder={content.placeholders.fullName}
                                        type="text"
                                        value={values.fullName}
                                    />
                                    <FieldError
                                        message={currentErrors.fullName}
                                    />
                                </label>
                                <label className="text-sm font-bold text-slate-700">
                                    {content.email}
                                    <input
                                        aria-invalid={Boolean(
                                            currentErrors.email,
                                        )}
                                        className={inputClass}
                                        onChange={updateValue("email")}
                                        placeholder={content.placeholders.email}
                                        type="email"
                                        value={values.email}
                                    />
                                    <FieldError message={currentErrors.email} />
                                </label>
                                <label className="text-sm font-bold text-slate-700">
                                    {content.mobile}
                                    <input
                                        aria-invalid={Boolean(
                                            currentErrors.mobile,
                                        )}
                                        className={inputClass}
                                        inputMode="numeric"
                                        maxLength={10}
                                        onChange={updateValue("mobile")}
                                        pattern="[0-9]{10}"
                                        placeholder={content.placeholders.mobile}
                                        type="text"
                                        value={values.mobile}
                                    />
                                    <FieldError
                                        message={currentErrors.mobile}
                                    />
                                </label>
                            </div>
                            <FieldError message={registrationSubmitError} />
                            <StepActions
                                backLabel={content.back}
                                canContinue={canContinue}
                                isBusy={isSubmittingRegistration}
                                nextLabel={content.continue}
                                step={step}
                                setStep={setStep}
                            />
                        </form>
                    )}

                    {step === 1 && (
                        <form
                            className="mt-6 grid gap-4"
                            onSubmit={continueToNextStep}
                        >
                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                                <p className="font-semibold text-[#0b1f3a]">
                                    {content.verifyTitle}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {content.verifyBody.replace(
                                        "{email}",
                                        values.email || content.email,
                                    )}
                                </p>
                            </div>
                            <FieldError message={verificationMessage} />
                            <StepActions
                                backLabel={content.back}
                                canContinue={canContinue}
                                nextLabel={content.continueAfterVerification}
                                setStep={setStep}
                                step={step}
                            />
                        </form>
                    )}

                    {step === 2 && (
                        <form
                            className="mt-6 grid gap-4"
                            onSubmit={continueToNextStep}
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-bold text-slate-700">
                                    {content.state}
                                    <select
                                        aria-invalid={Boolean(
                                            currentErrors.state,
                                        )}
                                        className={inputClass}
                                        onChange={updateState}
                                        value={values.stateId}
                                    >
                                        <option value="">{content.state}</option>
                                        {stateOptions.map((state) => (
                                            <option
                                                key={state.id}
                                                value={state.id}
                                            >
                                                {getLocalizedLookupName(
                                                    state.name,
                                                    lookupLocale,
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError message={currentErrors.state} />
                                    <FieldError message={stateLookupError} />
                                </label>
                                <label className="text-sm font-bold text-slate-700">
                                    {content.district}
                                    <select
                                        aria-invalid={Boolean(
                                            currentErrors.district,
                                        )}
                                        className={inputClass}
                                        disabled={!values.stateId}
                                        onChange={updateDistrict}
                                        value={values.districtId}
                                    >
                                        <option value="">
                                            {values.stateId
                                                ? content.district
                                                : content.state}
                                        </option>
                                        {districtOptions.map((district) => (
                                            <option
                                                key={district.id}
                                                value={district.id}
                                            >
                                                {getLocalizedLookupName(
                                                    district.name,
                                                    lookupLocale,
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={currentErrors.district}
                                    />
                                    <FieldError message={districtLookupError} />
                                </label>
                                <label className="text-sm font-bold text-slate-700">
                                    {content.city}
                                    <input
                                        aria-invalid={Boolean(
                                            currentErrors.city,
                                        )}
                                        className={inputClass}
                                        onChange={updateValue("city")}
                                        placeholder={content.placeholders.city}
                                        type="text"
                                        value={values.city}
                                    />
                                    <FieldError message={currentErrors.city} />
                                </label>
                                <label className="text-sm font-bold text-slate-700">
                                    {content.pinCode}
                                    <input
                                        aria-invalid={Boolean(
                                            currentErrors.pinCode,
                                        )}
                                        className={inputClass}
                                        inputMode="numeric"
                                        onChange={updateValue("pinCode")}
                                        pattern="[0-9]{4,10}"
                                        placeholder={content.placeholders.pinCode}
                                        type="text"
                                        value={values.pinCode}
                                    />
                                    <FieldError
                                        message={currentErrors.pinCode}
                                    />
                                </label>
                                <label className="text-sm font-bold text-slate-700 md:col-span-2">
                                    {content.address}
                                    <textarea
                                        aria-invalid={Boolean(
                                            currentErrors.address,
                                        )}
                                        className={inputClass}
                                        onChange={updateValue("address")}
                                        placeholder={content.placeholders.address}
                                        rows={3}
                                        value={values.address}
                                    />
                                    <FieldError
                                        message={currentErrors.address}
                                    />
                                </label>
                                <label className="text-sm font-bold text-slate-700">
                                    {content.instituteName}
                                    <input
                                        aria-invalid={Boolean(
                                            currentErrors.organisationName,
                                        )}
                                        className={inputClass}
                                        onChange={updateValue(
                                            "organisationName",
                                        )}
                                        placeholder={content.placeholders.instituteName}
                                        type="text"
                                        value={values.organisationName}
                                    />
                                    <FieldError
                                        message={currentErrors.organisationName}
                                    />
                                </label>
                                <label className="text-sm font-bold text-slate-700">
                                    {content.instituteType}
                                    <select
                                        aria-invalid={Boolean(
                                            currentErrors.organisationType,
                                        )}
                                        className={inputClass}
                                        onChange={updateValue(
                                            "organisationType",
                                        )}
                                        value={values.organisationType}
                                    >
                                        <option value="">
                                            {content.instituteType}
                                        </option>
                                        {instituteTypeOptions.map((type) => (
                                            <option
                                                key={type.id}
                                                value={type.name.en}
                                            >
                                                {getLocalizedLookupName(
                                                    type.name,
                                                    lookupLocale,
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={currentErrors.organisationType}
                                    />
                                    <FieldError
                                        message={instituteTypeLookupError}
                                    />
                                </label>
                                <div className="md:col-span-2">
                                    <p className="text-sm font-bold text-slate-700">
                                        {content.participateAs}
                                    </p>
                                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                        {(["Individual", "Team"] as const).map(
                                            (mode) => {
                                                const isSelected =
                                                    values.participationMode ===
                                                    mode;

                                                return (
                                                    <button
                                                        aria-pressed={
                                                            isSelected
                                                        }
                                                        className={`rounded-md border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#ff9933] ${
                                                            isSelected
                                                                ? "border-[#ff9933] bg-orange-50 ring-2 ring-[#ff9933]/20"
                                                                : "border-slate-200 bg-slate-50"
                                                        }`}
                                                        key={mode}
                                                        onClick={() =>
                                                            selectParticipationMode(
                                                                mode,
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        <span className="block font-bold text-[#0b1f3a]">
                                                            {mode ===
                                                            "Individual"
                                                                ? content.individual
                                                                : content.team}
                                                        </span>
                                                        <span className="mt-1 block text-sm font-normal leading-6 text-slate-600">
                                                            {mode ===
                                                            "Individual"
                                                                ? content.individualDescription
                                                                : content.teamDescription}
                                                        </span>
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                    <FieldError
                                        message={
                                            currentErrors.participationMode
                                        }
                                    />
                                    {values.participationMode === "Team" && (
                                        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-bold text-[#0b1f3a]">
                                                        {content.teamMembers}
                                                    </p>
                                                    <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
                                                        {content.teamLeadNote}
                                                    </p>
                                                </div>
                                                <button
                                                    className="rounded-md bg-[#ff9933] px-4 py-2 text-sm font-bold text-[#071426] transition hover:bg-[#f08a24] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                    disabled={
                                                        teamMembers.length >= 4
                                                    }
                                                    onClick={addTeamMember}
                                                    type="button"
                                                >
                                                    {content.addTeamMember}
                                                </button>
                                            </div>
                                            {teamMembers.length > 0 && (
                                                <div className="mt-4 grid gap-4">
                                                    {teamMembers.map(
                                                        (member, index) => (
                                                            <article
                                                                className="rounded-md border border-slate-200 bg-slate-50 p-4"
                                                                key={index}
                                                            >
                                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                                    <p className="font-bold text-[#0b1f3a]">
                                                                        {content.teamMember}{" "}
                                                                        {index +
                                                                            2}
                                                                    </p>
                                                                    <button
                                                                        aria-label={`Remove team member ${index + 2}`}
                                                                        className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                                                                        onClick={() =>
                                                                            removeTeamMember(
                                                                                index,
                                                                            )
                                                                        }
                                                                        type="button"
                                                                    >
                                                                        <X
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                    </button>
                                                                </div>
                                                                <div className="grid gap-4 md:grid-cols-3">
                                                                    <label className="text-sm font-bold text-slate-700">
                                                                        {content.fullName}
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
                                                                            onChange={updateTeamMember(
                                                                                index,
                                                                                "fullName",
                                                                            )}
                                                                            placeholder={
                                                                                content
                                                                                    .placeholders
                                                                                    .teamMemberName
                                                                            }
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
                                                                        {content.email}
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
                                                                            onChange={updateTeamMember(
                                                                                index,
                                                                                "email",
                                                                            )}
                                                                            placeholder={
                                                                                content
                                                                                    .placeholders
                                                                                    .teamMemberEmail
                                                                            }
                                                                            type="email"
                                                                            value={
                                                                                member.email
                                                                            }
                                                                        />
                                                                        <FieldError
                                                                            message={
                                                                                teamMemberErrors[
                                                                                    index
                                                                                ]
                                                                                    ?.email
                                                                            }
                                                                        />
                                                                    </label>
                                                                    <label className="text-sm font-bold text-slate-700">
                                                                        {content.phoneNumber}
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
                                                                            inputMode="numeric"
                                                                            maxLength={
                                                                                10
                                                                            }
                                                                            onChange={updateTeamMember(
                                                                                index,
                                                                                "mobile",
                                                                            )}
                                                                            pattern="[0-9]{10}"
                                                                            placeholder={
                                                                                content
                                                                                    .placeholders
                                                                                    .mobile
                                                                            }
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
                            </div>
                            <StepActions
                                backLabel={content.back}
                                canContinue={canContinue}
                                nextLabel={content.continue}
                                setStep={setStep}
                                step={step}
                            />
                        </form>
                    )}

                    {step === 3 && (
                        <form
                            className="mt-6 grid gap-4"
                            onSubmit={continueToNextStep}
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-sm font-bold text-slate-700">
                                    {content.challengeCategory}
                                    <select
                                        aria-invalid={Boolean(
                                            currentErrors.theme,
                                        )}
                                        className={inputClass}
                                        onChange={updateValue("theme")}
                                        value={values.theme}
                                    >
                                        <option value="">
                                            {content.challengeCategory}
                                        </option>
                                        {localizedThemes.map((theme) => (
                                            <option key={theme.slug}>
                                                {theme.title}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError message={currentErrors.theme} />
                                </label>
                                <div className="md:col-span-2">
                                    <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
                                        <p className="text-sm font-bold text-[#0b1f3a]">
                                            {content.proposalTitle}
                                        </p>
                                        <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
                                            {content.proposalDescription}
                                        </p>
                                    </div>
                                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                        {localizedProposalElements.map(
                                            (
                                                { field, label, guidance },
                                                index,
                                            ) => (
                                                <label
                                                    className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#ff9933] hover:shadow-[0_14px_30px_-24px_rgba(255,153,51,.9)]"
                                                    key={field}
                                                >
                                                    <span className="flex min-h-24 items-start gap-3">
                                                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-orange-50 font-mono text-sm font-black text-[#b45a05] ring-1 ring-orange-200 group-hover:bg-[#ff9933] group-hover:text-[#071426]">
                                                            {String(
                                                                index + 1,
                                                            ).padStart(2, "0")}
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
                                                            currentErrors[
                                                                field
                                                            ],
                                                        )}
                                                        className={`${inputClass} min-h-28 resize-y`}
                                                        maxLength={1000}
                                                        minLength={50}
                                                        onChange={updateValue(
                                                            field,
                                                        )}
                                                        placeholder={`${content.placeholders.proposalPrefix} ${label}`}
                                                        rows={4}
                                                        value={String(
                                                            values[field],
                                                        )}
                                                    />
                                                    <div className="mt-1 flex items-center gap-3">
                                                        <FieldError
                                                            message={
                                                                currentErrors[
                                                                    field
                                                                ]
                                                            }
                                                        />
                                                        <span className="ml-auto text-xs font-normal text-slate-500">
                                                            {
                                                                String(
                                                                    values[
                                                                        field
                                                                    ],
                                                                ).length
                                                            }
                                                            /1000
                                                        </span>
                                                    </div>
                                                </label>
                                            ),
                                        )}
                                    </div>
                                </div>
                                <label className="text-sm font-bold text-slate-700 md:col-span-2">
                                    {content.supportingDocuments}
                                    <div
                                        className={`mt-1 rounded-lg border-2 border-dashed p-6 text-center transition ${
                                            currentErrors.supportingDocuments
                                                ? "border-red-300 bg-red-50/40"
                                                : hasReachedSupportingDocumentLimit
                                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-75"
                                                  : isSupportingDocumentsDragActive
                                                    ? "border-[#000080] bg-blue-50"
                                                    : "border-slate-300 bg-slate-50"
                                        }`}
                                        aria-disabled={
                                            hasReachedSupportingDocumentLimit
                                        }
                                        onDragEnter={(event) => {
                                            event.preventDefault();
                                            if (
                                                hasReachedSupportingDocumentLimit
                                            ) {
                                                setIsSupportingDocumentsDragActive(
                                                    false,
                                                );
                                                return;
                                            }
                                            setIsSupportingDocumentsDragActive(
                                                true,
                                            );
                                        }}
                                        onDragLeave={(event) => {
                                            event.preventDefault();
                                            setIsSupportingDocumentsDragActive(
                                                false,
                                            );
                                        }}
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            if (
                                                hasReachedSupportingDocumentLimit
                                            ) {
                                                event.dataTransfer.dropEffect =
                                                    "none";
                                            }
                                        }}
                                        onDrop={dropSupportingDocuments}
                                    >
                                        <input
                                            accept="application/pdf,.pdf"
                                            className="sr-only"
                                            disabled={
                                                hasReachedSupportingDocumentLimit
                                            }
                                            multiple
                                            onChange={updateSupportingDocuments}
                                            ref={supportingDocumentsInputRef}
                                            type="file"
                                        />
                                        <UploadCloud
                                            className="mx-auto text-slate-500"
                                            size={34}
                                        />
                                        <p className="mt-3 text-sm font-semibold text-[#0b1f3a]">
                                            {content.dragDrop}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {hasReachedSupportingDocumentLimit
                                                ? messageTemplate(
                                                      content.uploadLimitReached,
                                                      {
                                                          count: maxSupportingDocuments,
                                                      },
                                                  )
                                                : content.chooseFiles}
                                        </p>
                                        <button
                                            className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-[#0b1f3a] transition hover:border-[#000080] hover:text-[#000080] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                            disabled={
                                                hasReachedSupportingDocumentLimit
                                            }
                                            onClick={() =>
                                                supportingDocumentsInputRef.current?.click()
                                            }
                                            type="button"
                                        >
                                            {content.browseFiles}
                                        </button>
                                    </div>
                                    <div className="mt-1 flex items-start justify-between gap-3">
                                        <span className="text-xs font-normal text-red-700">
                                            {supportingDocumentsError ||
                                                currentErrors.supportingDocuments}
                                        </span>
                                        <span className="ml-auto shrink-0 text-right text-xs text-slate-500">
                                            {messageTemplate(content.uploadHint, {
                                                count: maxSupportingDocuments,
                                                size: maxSupportingDocumentSizeMb,
                                            })}
                                        </span>
                                    </div>
                                    {selectedSupportingDocuments.length > 0 && (
                                        <ul className="mt-3 grid gap-2">
                                            {selectedSupportingDocuments.map(
                                                (file, index) => (
                                                    <li
                                                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                                        key={`${file.name}-${file.size}-${index}`}
                                                    >
                                                        <span className="inline-flex min-w-0 items-center gap-2">
                                                            <FileText
                                                                className="shrink-0 text-[#000080]"
                                                                size={16}
                                                            />
                                                            <span className="truncate">
                                                                {file.name}
                                                            </span>
                                                        </span>
                                                        <span className="inline-flex shrink-0 items-center gap-3">
                                                            <span className="font-semibold text-slate-500">
                                                                {formatFileSize(
                                                                    file.size,
                                                                    content.fileUnits,
                                                                )}
                                                            </span>
                                                            <button
                                                                aria-label={`Remove ${file.name}`}
                                                                className="rounded-full p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                                                                onClick={() =>
                                                                    removeSupportingDocument(
                                                                        index,
                                                                    )
                                                                }
                                                                type="button"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}
                                </label>
                            </div>
                            <StepActions
                                backLabel={content.back}
                                canContinue={canContinue}
                                nextLabel={content.submitProposal}
                                setStep={setStep}
                                step={step}
                            />
                        </form>
                    )}

                    {step === 4 && (
                        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
                            <CheckCircle2
                                className="text-[#138808]"
                                size={32}
                            />
                            <h3 className="mt-4 text-xl font-bold text-[#0b1f3a]">
                                {content.applicationSubmitted}
                            </h3>
                            <p className="mt-2 leading-7 text-slate-700">
                                {content.applicationMessage}
                            </p>
                            <p
                                className="mt-4 rounded-md bg-white px-4 py-3 font-mono text-lg font-bold text-[#000080]"
                                data-preserve-digits
                            >
                                {applicationNumber}
                            </p>
                            <button
                                className="mt-5 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-[#0b1f3a] hover:border-[#0b1f3a]"
                                onClick={() => {
                                    setStep(0);
                                    setValues(initialValues);
                                    setHasSupportingDocuments(false);
                                    setSupportingDocumentsError("");
                                    setSelectedSupportingDocuments([]);
                                    setTeamMembers([]);
                                    setApplicationId(undefined);
                                    setApplicationNumber("");
                                    setIsEmailVerified(false);
                                    setParticipantId(undefined);
                                    setRegistrationSubmitError("");
                                    setVerificationMessage("");
                                    localStorage.removeItem(
                                        registrationFormStorageKey,
                                    );
                                }}
                                type="button"
                            >
                                {content.startAnother}
                            </button>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

function StepActions({
    backLabel = "Back",
    canContinue,
    isBusy = false,
    nextLabel = "Continue",
    setStep,
    step,
}: {
    canContinue: boolean;
    backLabel?: string;
    isBusy?: boolean;
    nextLabel?: string;
    setStep: React.Dispatch<React.SetStateAction<number>>;
    step: number;
}) {
    return (
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-[#0b1f3a] transition hover:border-[#0b1f3a] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={step === 0}
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                type="button"
            >
                <ArrowLeft className="mr-2" size={16} /> {backLabel}
            </button>
            <button
                className="inline-flex items-center justify-center rounded-md bg-[#0b1f3a] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#000080] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                disabled={!canContinue || isBusy}
                type="submit"
            >
                {isBusy ? "Sending..." : nextLabel}{" "}
                <ArrowRight className="ml-2" size={16} />
            </button>
        </div>
    );
}
