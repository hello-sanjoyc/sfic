"use client";

import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Lightbulb,
    Send,
    Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
    JURY_SESSION_KEY,
    JuryShell,
} from "@/components/jury/common/jury-shell";
import { ApiRequestError, apiClient } from "@/lib/api-client";
import { appConfig } from "@/lib/app-config";
import { endpoints } from "@/lib/endpoints";

type LocalizedText = {
    bn?: string | null;
    en?: string | null;
    hi?: string | null;
};

type ProposalKey =
    | "beneficiaries"
    | "costFunding"
    | "expectedImpact"
    | "implementationRoute"
    | "problemLocation"
    | "projectTimeline"
    | "prototypePilot"
    | "proposedSolution"
    | "scalability"
    | "technologyMethod";

type SavedEvaluation = {
    comments: string;
    deadline: string | null;
    id: number;
    level: "District" | "State";
    readOnly: boolean;
    recommendation: string;
    scores: Record<string, number>;
    status: "auto_submitted" | "in_progress" | "submitted";
    submittedAt: string | null;
    totalScore: number;
};

type SaveState = "error" | "idle" | "pending" | "saved" | "saving";

type ApplicationDocument = {
    documentType?: string | null;
    fileSizeBytes?: number | string | null;
    id?: number | string | null;
    originalFileName?: string | null;
};

type ApplicationDetails = {
    applicationNumber?: string | null;
    challengeCategory?: { name?: LocalizedText | null } | null;
    participant?: { fullName?: string | null } | null;
    participantCategory?: { name?: LocalizedText | null } | null;
    participationMode?: string | null;
    documents?: ApplicationDocument[];
    id?: number | string | null;
    proposal?: Partial<Record<ProposalKey | "videoUrl", string | number | null>>;
};

const MAX_SCORE = 10;

const zoneMessages = {
    green: "Green Zone: Recommended for direct advancement to be presented at the District Conclave.",
    red: "Red Zone: Rejected from further review cycles.",
    yellow: "Yellow Zone: Retained for further decision.",
} as const;

const recommendations = ["Recommend", "Reject", "Review"] as const;
type Recommendation = (typeof recommendations)[number];

const proposalLabels: Record<ProposalKey, string> = {
    beneficiaries: "Beneficiaries",
    costFunding: "Cost / Funding",
    expectedImpact: "Expected Impact",
    implementationRoute: "Implementation Route",
    problemLocation: "Problem Location",
    projectTimeline: "Project Timeline",
    proposedSolution: "Proposed Solution",
    prototypePilot: "Prototype / Pilot",
    scalability: "Scalability",
    technologyMethod: "Technology / Method",
};

// The ten criteria of the jury scoring form. `keys` are the proposal answers
// shown beside each criterion; the last criterion has none because it is
// judged on the submission as a whole.
const sections: Array<{
    id: string;
    info: string;
    keys: ProposalKey[];
    title: string;
}> = [
    {
        id: "problemClarity",
        info: "How clearly the problem has been defined and how relevant it is in the local context?",
        keys: ["problemLocation"],
        title: "Problem Clarity & Local Relevance",
    },
    {
        id: "innovation",
        info: "Whether the proposed approach is original in nature and has enough novelty?",
        keys: ["proposedSolution"],
        title: "Innovation & Originality / Novelty",
    },
    {
        id: "method",
        info: "Whether the chosen methodology is appropriate and the proposed technology has the potential to address the problem.",
        keys: ["technologyMethod"],
        title: "Method / Technology Proposed to Be Adopted",
    },
    {
        id: "feasibility",
        info: "Can the proposed methodology be realistically implemented?",
        keys: ["implementationRoute"],
        title: "Feasibility of Practical Implementation",
    },
    {
        id: "costEffectiveness",
        info: "Are the costs and funding need correctly estimated, and does it justify the output?",
        keys: ["costFunding"],
        title: "Cost Effectiveness",
    },
    {
        id: "impact",
        info: "Who benefits? Are the social, economic or environmental outcomes impactful enough?",
        keys: ["beneficiaries", "expectedImpact"],
        title: "Beneficiary Reach, Outcome and Impact",
    },
    {
        id: "scalability",
        info: "Can the proposed scheme be implemented in a larger scale and in a sustainable manner?",
        keys: ["scalability"],
        title: "Scalability & Sustainability",
    },
    {
        id: "pilotModel",
        info: "Is there a tested model or credible experimental proof of the proposed project/scheme?",
        keys: ["prototypePilot"],
        title: "Prototype / Pilot Model",
    },
    {
        id: "readiness",
        info: "Is the timeline realistic, and whether commercialization and practical adoption feasible?",
        keys: ["projectTimeline"],
        title: "Timeline, Readiness & Adoption",
    },
    {
        id: "presentation",
        info: "Overall clarity of presentation, and technical quality of the proposed project.",
        keys: [],
        title: "Overall Presentation",
    },
];

// Score band of a fully scored evaluation; null while any criterion is blank.
function scoreBand(scores: Record<string, string | number>) {
    const entered = Object.values(scores).filter((value) => value !== "");
    if (entered.length !== sections.length) return null;

    const total = entered.reduce<number>((sum, value) => sum + Number(value), 0);
    return total >= 75 ? "green" : total >= 50 ? "yellow" : "red";
}

function localizedName(value?: LocalizedText | null) {
    return value?.en ?? value?.bn ?? value?.hi ?? "";
}

function getToken() {
    try {
        const session = JSON.parse(
            localStorage.getItem(JURY_SESSION_KEY) ?? "{}",
        ) as { token?: string };
        return session.token ?? "";
    } catch {
        return "";
    }
}

function formatFileSize(value: unknown) {
    const bytes = Number(value);
    if (value === null || value === undefined || value === "" || !Number.isFinite(bytes) || bytes < 0) return "";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Opens a stored supporting document. The download endpoint needs the jury
// session token, so the file is fetched and saved from a temporary blob URL.
async function downloadSupportingDocument(
    applicationId: string,
    document: ApplicationDocument,
) {
    const response = await fetch(
        `${appConfig.apiUrl}${endpoints.jury.applicationDocumentDownload(applicationId, document.id ?? "")}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
    );

    if (!response.ok) {
        let message = "Document could not be downloaded.";
        try {
            message = ((await response.json()) as { message?: string }).message ?? message;
        } catch {
            /* keep the generic message */
        }
        throw new Error(message);
    }

    const url = URL.createObjectURL(await response.blob());
    const link = window.document.createElement("a");
    link.href = url;
    link.download = String(document.originalFileName ?? "document");
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function SummaryField({
    label,
    value,
}: Readonly<{ label: string; value?: string | null }>) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-slate-500">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-bold text-[#0b1f3a]">
                {value || "Not available"}
            </p>
        </div>
    );
}

export function JuryApplicationEvaluatePage({
    applicationId,
}: Readonly<{ applicationId: string }>) {
    const [application, setApplication] = useState<ApplicationDetails | null>(
        null,
    );
    const [errorMessage, setErrorMessage] = useState("");
    // Set when another evaluation of this jury member is still open.
    const [currentApplicationId, setCurrentApplicationId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recommendation, setRecommendation] = useState<Recommendation | "">(
        "",
    );
    const [scores, setScores] = useState<Record<string, string>>({});
    const [downloadError, setDownloadError] = useState("");
    const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
    const [comments, setComments] = useState("");
    const [evaluation, setEvaluation] = useState<SavedEvaluation | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [submitError, setSubmitError] = useState("");
    const hydratedRef = useRef(false);
    const dirtyRef = useRef(false);
    // Read only once the evaluation is submitted or its deadline has passed.
    const isReadOnly = evaluation?.readOnly ?? false;
    const enteredScores = Object.values(scores).filter((value) => value !== "");
    const totalScore = enteredScores.reduce(
        (sum, value) => sum + Number(value),
        0,
    );
    // The score band only applies once every criterion has been scored, so a
    // half-filled form doesn't flash red or pick "Reject" too early.
    const isFullyScored = enteredScores.length === sections.length;
    const band = !isFullyScored
        ? null
        : totalScore >= 75
          ? "green"
          : totalScore >= 50
            ? "yellow"
            : "red";

    // Opening the form starts (or resumes) the evaluation, which also locks the
    // application for every other jury member.
    useEffect(() => {
        let isMounted = true;
        const headers = { Authorization: `Bearer ${getToken()}` };

        setIsLoading(true);
        setErrorMessage("");
        setCurrentApplicationId(null);
        hydratedRef.current = false;

        void (async () => {
            try {
                const started = await apiClient.post<{
                    evaluation: SavedEvaluation;
                }>(endpoints.jury.applicationEvaluation(applicationId), {}, { headers });
                const detail = await apiClient.get<{
                    application: ApplicationDetails;
                }>(endpoints.jury.application(applicationId), { headers });

                if (!isMounted) return;

                setEvaluation(started.evaluation);
                setScores(
                    Object.fromEntries(
                        Object.entries(started.evaluation.scores).map(
                            ([key, value]) => [key, String(value)],
                        ),
                    ),
                );
                setComments(started.evaluation.comments);
                // Reject goes with a total below 50 and nothing else.
                const loadedBand = scoreBand(started.evaluation.scores);
                const loadedRecommendation = (started.evaluation
                    .recommendation || "") as Recommendation | "";
                setRecommendation(
                    loadedBand === "red"
                        ? "Reject"
                        : loadedBand && loadedRecommendation === "Reject"
                          ? ""
                          : loadedRecommendation,
                );
                setApplication(detail.application);
                hydratedRef.current = true;
            } catch (error) {
                if (!isMounted) return;
                setApplication(null);
                const openId =
                    error instanceof ApiRequestError
                        ? Number(error.data?.currentApplicationId)
                        : NaN;
                setCurrentApplicationId(Number.isInteger(openId) && openId > 0 ? openId : null);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Application could not be loaded.",
                );
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [applicationId]);

    const draftPayload = () => ({
        comments,
        recommendation: recommendation || null,
        scores: Object.fromEntries(
            Object.entries(scores)
                .filter(([, value]) => value !== "")
                .map(([key, value]) => [key, Number(value)]),
        ),
    });

    // Changes are saved as a draft shortly after the jury member stops typing.
    useEffect(() => {
        if (!hydratedRef.current || !dirtyRef.current || isReadOnly) return;

        const timer = window.setTimeout(async () => {
            setSaveState("saving");

            try {
                await apiClient.put(
                    endpoints.jury.applicationEvaluation(applicationId),
                    draftPayload(),
                    { headers: { Authorization: `Bearer ${getToken()}` } },
                );
                dirtyRef.current = false;
                setSaveError("");
                setSaveState("saved");
            } catch (error) {
                setSaveState("error");
                setSaveError(
                    error instanceof Error
                        ? error.message
                        : "Draft could not be saved.",
                );
            }
        }, 800);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scores, comments, recommendation, isReadOnly, applicationId]);

    const openDocument = async (document: ApplicationDocument) => {
        if (downloadingId !== null || !document.id) return;

        setDownloadError("");
        setDownloadingId(document.id);

        try {
            await downloadSupportingDocument(applicationId, document);
        } catch (error) {
            setDownloadError(
                error instanceof Error
                    ? error.message
                    : "Document could not be downloaded.",
            );
        } finally {
            setDownloadingId(null);
        }
    };

    const requestSubmit = () => {
        if (!isFullyScored) {
            setSubmitError(
                `Enter a score for all ${sections.length} criteria before submitting.`,
            );
            return;
        }

        if (!recommendation) {
            setSubmitError("Choose a jury recommendation before submitting.");
            return;
        }

        setSubmitError("");
        setIsConfirmOpen(true);
    };

    const confirmSubmit = async () => {
        setIsConfirmOpen(false);
        setIsSubmitting(true);
        setSubmitError("");

        try {
            const result = await apiClient.post<{ evaluation: SavedEvaluation }>(
                endpoints.jury.applicationEvaluationSubmit(applicationId),
                draftPayload(),
                { headers: { Authorization: `Bearer ${getToken()}` } },
            );
            dirtyRef.current = false;
            setSaveState("idle");
            setEvaluation(result.evaluation);
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Evaluation could not be submitted.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Whole numbers from 0 to 10 only: strip anything that is not a digit and
    // ignore any entry that would go above the maximum. A total below 50 sets
    // the recommendation to Reject; from 50 up, Reject is not allowed.
    const changeScore = (key: string, input: string) => {
        const digits = input.replace(/\D/g, "");
        const value = digits === "" ? "" : String(Number(digits));
        if (value !== "" && Number(value) > MAX_SCORE) return;

        const next = { ...scores, [key]: value };
        const nextBand = scoreBand(next);

        if (nextBand === "red") {
            setRecommendation("Reject");
        } else if (recommendation === "Reject") {
            setRecommendation("");
        }

        dirtyRef.current = true;
        setSaveState("pending");
        setScores(next);
    };

    return (
        <JuryShell
            eyebrow="Score each section of the proposal from 0 to 10"
            title="Evaluate Application"
        >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <Link
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-600"
                    href={`/jury/applications/${applicationId}`}
                >
                    <ArrowLeft size={17} />
                    Back to application
                </Link>
            </div>

            {isLoading && (
                <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
                    Loading application...
                </section>
            )}

            {!isLoading && errorMessage && (
                <section className="rounded-lg border border-rose-200 bg-white p-8 text-center text-sm font-semibold text-rose-600 shadow-sm">
                    <p>{errorMessage}</p>
                    {currentApplicationId && currentApplicationId !== Number(applicationId) && (
                        <Link
                            className="mt-4 inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                            href={`/jury/applications/${currentApplicationId}/evaluate`}
                        >
                            Continue Evaluation <ArrowRight size={16} />
                        </Link>
                    )}
                </section>
            )}

            {!isLoading && application && (
                <>
                    <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryField
                                label="Application Number"
                                value={application.applicationNumber}
                            />
                            <SummaryField
                                label="Full Name"
                                value={application.participant?.fullName}
                            />
                            <SummaryField
                                label="Participant Category"
                                value={localizedName(
                                    application.participantCategory?.name,
                                )}
                            />
                            <SummaryField
                                label="Participation Mode"
                                value={application.participationMode}
                            />
                        </div>
                    </section>

                    <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <SummaryField
                            label="Challenge Category"
                            value={localizedName(
                                application.challengeCategory?.name,
                            )}
                        />
                    </section>

                    {(application.documents?.length || application.proposal?.videoUrl) && (
                        <section className="grid w-full min-w-0 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:grid-cols-2">
                            {application.documents && application.documents.length > 0 ? (
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase text-slate-500">
                                        Supporting Documents
                                    </p>
                                    <ul className="mt-2 grid gap-2">
                                        {application.documents.map((document) => (
                                            <li className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" key={String(document.id ?? document.originalFileName)}>
                                                <FileText className="shrink-0 text-blue-600" size={17} />
                                                <button
                                                    className="min-w-0 break-words text-left text-sm font-bold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                                                    disabled={downloadingId !== null}
                                                    onClick={() => void openDocument(document)}
                                                    type="button"
                                                >
                                                    {downloadingId === document.id
                                                        ? "Downloading..."
                                                        : (document.originalFileName ?? "Document")}
                                                </button>
                                                {formatFileSize(document.fileSizeBytes) && (
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        {formatFileSize(document.fileSizeBytes)}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    {downloadError && (
                                        <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">
                                            {downloadError}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase text-slate-500">
                                        Supporting Documents
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-500">
                                        No supporting documents.
                                    </p>
                                </div>
                            )}
                            {application.proposal?.videoUrl ? (
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase text-slate-500">
                                        Video
                                    </p>
                                    <a
                                        className="mt-2 inline-flex min-w-0 items-center gap-3 break-all text-sm font-bold text-blue-600 hover:underline"
                                        href={String(application.proposal.videoUrl)}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        <Video className="shrink-0" size={17} />
                                        {String(application.proposal.videoUrl)}
                                    </a>
                                </div>
                            ) : (
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase text-slate-500">
                                        Video
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-500">
                                        No video provided.
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    <div className="hidden min-w-0 gap-4 px-5 text-xs font-black uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_9rem]">
                        <span>Evaluation Criteria</span>
                        <span>Applicant&apos;s Response</span>
                        <span>Score Obtained</span>
                    </div>

                    {sections.map((section, index) => {
                        const inputId = `score-${section.id}`;
                        const answers = section.keys
                            .map((key) => ({
                                key,
                                value: application.proposal?.[key],
                            }))
                            .filter(
                                (answer) =>
                                    answer.value !== null &&
                                    answer.value !== undefined &&
                                    answer.value !== "",
                            );

                        return (
                            <section
                                className="grid w-full min-w-0 gap-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_9rem]"
                                key={section.id}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-black text-blue-700">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="break-words text-base font-black text-[#0b1f3a]">
                                            {section.title}
                                        </h2>
                                        <p className="mt-1 break-words text-sm font-medium text-slate-500">
                                            {section.info}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid min-w-0 content-start gap-3">
                                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 lg:hidden">
                                        <Lightbulb size={14} />
                                        Applicant&apos;s Response
                                    </p>
                                    {section.keys.length === 0 ? (
                                        <p className="text-sm font-medium italic text-slate-500">
                                            Assessed on the overall submission.
                                        </p>
                                    ) : (
                                        section.keys.map((key) => {
                                            const answer = answers.find(
                                                (item) => item.key === key,
                                            );

                                            return (
                                                <div
                                                    className="min-w-0"
                                                    key={key}
                                                >
                                                    {section.keys.length >
                                                        1 && (
                                                        <p className="mb-1 text-xs font-bold uppercase text-slate-500">
                                                            {
                                                                proposalLabels[
                                                                    key
                                                                ]
                                                            }
                                                        </p>
                                                    )}
                                                    <p className="whitespace-pre-line break-words text-sm font-normal text-[#0b1f3a]">
                                                        {answer
                                                            ? String(
                                                                  answer.value,
                                                              )
                                                            : "Not provided"}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="min-w-0 rounded-lg bg-[#fff1d6] p-3 lg:-my-5 lg:-mr-5 lg:grid lg:place-items-center lg:rounded-none lg:border-l lg:border-[#f3d9a4] lg:p-5">
                                    <label
                                        className="mb-1 block text-xs font-bold uppercase text-[#7a5a14] lg:hidden"
                                        htmlFor={inputId}
                                    >
                                        Score Obtained
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            aria-label={`Score for ${section.title}`}
                                            className="h-11 w-20 rounded-lg border border-slate-300 bg-white px-3 text-center text-base font-black text-[#0b1f3a] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                            disabled={isReadOnly}
                                            id={inputId}
                                            inputMode="numeric"
                                            maxLength={2}
                                            onChange={(event) =>
                                                changeScore(
                                                    section.id,
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0-10"
                                            type="text"
                                            value={scores[section.id] ?? ""}
                                        />
                                        <span className="text-sm font-bold text-slate-500">
                                            / {MAX_SCORE}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        );
                    })}

                    <section className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <label
                            className="text-xs font-bold uppercase text-slate-500"
                            htmlFor="jury-comments"
                        >
                            Jury Comments
                        </label>
                        <textarea
                            className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-[#0b1f3a] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            disabled={isReadOnly}
                            id="jury-comments"
                            maxLength={2000}
                            onChange={(event) => {
                                dirtyRef.current = true;
                                setSaveState("pending");
                                setComments(event.target.value);
                            }}
                            placeholder="Add any comments about this application (optional)"
                            value={comments}
                        />
                    </section>

                    <div className="grid gap-1 text-xs font-semibold text-slate-500">
                        <p className="flex items-center gap-2">
                            <ClipboardCheck size={14} />
                            {isReadOnly
                                ? "This evaluation is locked because the submission date has passed."
                                : saveState === "saving"
                                  ? "Saving draft..."
                                  : saveState === "pending"
                                    ? "Unsaved changes..."
                                    : saveState === "saved"
                                      ? "Changes saved. You can edit the marks any number of times before the submission date."
                                      : evaluation?.status === "submitted"
                                        ? "Submitted. You can still edit the marks any number of times before the submission date."
                                        : "Your marks are saved as you go. You can edit them any number of times before the submission date."}
                        </p>
                        {evaluation?.deadline && !isReadOnly && (
                            <p>
                                Submission date:{" "}
                                {new Intl.DateTimeFormat("en-IN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                }).format(new Date(evaluation.deadline))}
                                . The evaluation is locked automatically after
                                that, and an unsubmitted one is submitted as
                                it stands.
                            </p>
                        )}
                        {saveError && saveState === "error" && (
                            <p className="text-rose-600" role="alert">
                                {saveError}
                            </p>
                        )}
                    </div>

                    <section className="sticky bottom-0 z-10 grid w-full min-w-0 grid-cols-2 overflow-hidden rounded-lg bg-[#1f3a5f] text-white shadow-[0_-6px_16px_rgba(11,31,58,0.25)] lg:grid-cols-3">
                        <div
                            aria-live="polite"
                            className={`order-1 grid content-center justify-items-center p-3 text-center transition-colors sm:p-5 ${band === "green" ? "bg-emerald-400 text-[#0b1f3a]" : band === "yellow" ? "bg-yellow-300 text-[#0b1f3a]" : band === "red" ? "bg-red-500 text-white" : "bg-white text-[#0b1f3a]"}`}
                        >
                            <p className="text-xs font-black uppercase tracking-wide">
                                Total Score
                            </p>
                            <p className="mt-1 text-xl font-black sm:text-2xl">
                                {enteredScores.length > 0 ? (
                                    <span className="inline-block min-w-12 border-b-2 border-current px-2">
                                        {totalScore}
                                    </span>
                                ) : (
                                    <span className="inline-block min-w-12 border-b-2 border-current px-2 opacity-60">
                                        &nbsp;
                                    </span>
                                )}{" "}
                                / {sections.length * MAX_SCORE}
                            </p>
                            {band && (
                                <p className="mt-1 max-w-xs text-xs font-semibold leading-snug">
                                    {zoneMessages[band]}
                                </p>
                            )}
                        </div>
                        <fieldset className="order-3 col-span-2 grid min-w-0 content-center gap-2 p-3 sm:p-5 lg:order-2 lg:col-span-1">
                            <legend className="m-0 mt-3 text-lg font-black">
                                Jury recommendation:
                            </legend>
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                {recommendations.map((option) => (
                                    <label
                                        className="flex cursor-pointer items-center gap-2 text-base font-black"
                                        key={option}
                                    >
                                        <input
                                            checked={recommendation === option}
                                            className="size-4 accent-[#fbc878] disabled:cursor-not-allowed"
                                            disabled={
                                                isReadOnly ||
                                                (option === "Reject"
                                                    ? band === "green" || band === "yellow"
                                                    : band === "red")
                                            }
                                            name="jury-recommendation"
                                            onChange={() => {
                                                dirtyRef.current = true;
                                                setSaveState("pending");
                                                setRecommendation(option);
                                            }}
                                            type="radio"
                                            value={option}
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                            {!isReadOnly && band === "red" && (
                                <p className="text-xs font-semibold text-[#fbc878]">
                                    A total below 50 is recorded as Reject.
                                </p>
                            )}
                            {!isReadOnly && (band === "green" || band === "yellow") && (
                                <p className="text-xs font-semibold text-[#fbc878]">
                                    Reject is not available for a total of 50 or above.
                                </p>
                            )}
                        </fieldset>
                        <div className="order-2 grid content-center justify-items-end gap-2 p-3 sm:p-5 lg:order-3">
                            {isReadOnly ? (
                                <p className="inline-flex items-center gap-2 text-sm font-black">
                                    <CheckCircle2 size={18} />
                                    {evaluation?.status === "auto_submitted"
                                        ? "Auto-submitted and locked"
                                        : "Locked: submission date has passed"}
                                </p>
                            ) : evaluation?.status === "submitted" ? (
                                <p className="inline-flex items-center gap-2 text-sm font-black">
                                    <CheckCircle2 size={18} />
                                    Evaluation submitted
                                </p>
                            ) : (
                                <button
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#fbc878] px-4 text-sm font-black text-[#0b1f3a] transition hover:bg-[#f7b955] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    disabled={isSubmitting || !isFullyScored}
                                    onClick={requestSubmit}
                                    type="button"
                                >
                                    <Send size={17} />
                                    {isSubmitting ? "Submitting..." : "Submit Evaluation"}
                                </button>
                            )}
                            {!isReadOnly && evaluation?.status !== "submitted" && !isFullyScored && (
                                <p className="text-right text-xs font-semibold text-[#fbc878]">
                                    {sections.length - enteredScores.length} of {sections.length}{" "}
                                    criteria still need a score. All criteria must be
                                    scored to submit.
                                </p>
                            )}
                            {submitError && (
                                <p
                                    className="text-right text-xs font-semibold text-[#fbc878]"
                                    role="alert"
                                >
                                    {submitError}
                                </p>
                            )}
                        </div>
                    </section>
                </>
            )}

            {isConfirmOpen && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                        <div className="border-b border-slate-200 p-4 sm:p-5">
                            <h2 className="text-lg font-black text-[#0b1f3a]">
                                Confirm Submission
                            </h2>
                            <dl className="mt-3 grid gap-2 text-sm text-slate-600">
                                <div className="flex justify-between gap-4">
                                    <dt className="font-semibold">
                                        Total score
                                    </dt>
                                    <dd className="font-black text-[#0b1f3a]">
                                        {totalScore} /{" "}
                                        {sections.length * MAX_SCORE}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="font-semibold">
                                        Recommendation
                                    </dt>
                                    <dd className="font-black text-[#0b1f3a]">
                                        {recommendation}
                                    </dd>
                                </div>
                            </dl>
                            <p className="mt-3 text-sm font-normal text-slate-600">
                                Please confirm that you have completed this
                                evaluation. Submitting does not lock it: you can
                                still change the marks until the submission
                                date, and the evaluation is locked
                                automatically after that.
                            </p>
                        </div>
                        <div className="flex flex-col justify-end gap-2 p-4 sm:flex-row sm:p-5">
                            <button
                                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#0b1f3a] sm:w-auto"
                                onClick={() => setIsConfirmOpen(false)}
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white sm:w-auto"
                                onClick={confirmSubmit}
                                type="button"
                            >
                                <Send size={16} />
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </JuryShell>
    );
}
