type LocalizedText = {
    bn?: string | null;
    en?: string | null;
    hi?: string | null;
};

type ApplicationPdfDetails = {
    applicationNumber?: string | null;
    challengeCategory?: { name?: LocalizedText | null } | null;
    createdAt?: string | null;
    district?: { name?: LocalizedText | null } | null;
    documents?: Array<{
        fileSizeBytes?: number | string | null;
        mimeType?: string | null;
        originalFileName?: string | null;
    }>;
    instituteType?: { name?: LocalizedText | null } | null;
    participant?: {
        dateOfBirth?: string | null;
        email?: string | null;
        fullName?: string | null;
        gender?: string | null;
        mobile?: string | null;
    } | null;
    participantCategory?: { name?: LocalizedText | null } | null;
    participationMode?: string | null;
    profile?: Record<string, unknown>;
    proposal?: Record<string, unknown>;
    state?: { name?: LocalizedText | null } | null;
    status?: string | null;
    submittedAt?: string | null;
    teamMembers?: Array<{
        email?: string | null;
        fullName?: string | null;
        isApplicant?: boolean | null;
        mobile?: string | null;
    }>;
    updatedAt?: string | null;
};

const pageWidth = 595.92;
const pageHeight = 842.88;
const margin = 58;
const contentTop = 696;
const contentWidth = pageWidth - margin * 2;
const labelWidth = 150;
const rowHeight = 27;
const navy = [0.04, 0.12, 0.23] as const;
const muted = [0.29, 0.36, 0.46] as const;
const border = [0.79, 0.84, 0.9] as const;
const panel = [0.97, 0.98, 0.99] as const;
const successBg = [0.86, 0.98, 0.91] as const;
const successText = [0.02, 0.46, 0.24] as const;

function escapePdfText(value: string) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function normalizeText(value: unknown, fallback = "-") {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function normalizeMultilineText(value: unknown, fallback = "-") {
    if (value === null || value === undefined || value === "") return fallback;
    return (
        String(value)
            .split(/\r?\n/)
            .map((line) => line.replace(/[^\S\r\n]+/g, " ").trim())
            .join("\n")
            .trim() || fallback
    );
}

function localizedName(value?: LocalizedText | null) {
    return value?.en ?? value?.bn ?? value?.hi ?? "-";
}

function formatStatus(value?: string | null) {
    const labels: Record<string, string> = {
        draft: "Draft",
        email_verification: "Email Verification",
        profile_completion: "Profile Completion",
        proposal_submission: "Proposal Submission",
        submitted: "Submitted",
        withdrawn: "Withdrawn",
    };

    return labels[value ?? ""] ?? normalizeText(value);
}

function formatDate(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function formatFileSize(value: unknown) {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return "-";
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024).toFixed(1)} KB`;
}

function wrapText(value: string, maxWidth: number, fontSize: number) {
    const averageCharacterWidth = fontSize * 0.52;
    const maxCharacters = Math.max(8, Math.floor(maxWidth / averageCharacterWidth));
    const words = value
        .split(/\s+/)
        .flatMap((word) => {
            if (word.length <= maxCharacters) return [word];

            const parts: string[] = [];
            for (let index = 0; index < word.length; index += maxCharacters) {
                parts.push(word.slice(index, index + maxCharacters));
            }

            return parts;
        });
    const lines: string[] = [];
    let line = "";

    words.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        if (nextLine.length <= maxCharacters) {
            line = nextLine;
            return;
        }

        if (line) lines.push(line);
        line = word;
    });

    if (line) lines.push(line);
    return lines.length ? lines : ["-"];
}

function wrapMultilineText(value: string, maxWidth: number, fontSize: number) {
    return value
        .split(/\r?\n/)
        .flatMap((line) => wrapText(line, maxWidth, fontSize));
}

class PdfBuilder {
    private pages: string[] = [];
    private operations: string[] = [];
    private y = contentTop;

    constructor() {
        this.startPage();
    }

    private startPage() {
        this.operations = [];
        this.y = contentTop;
    }

    private finishPage() {
        this.pages.push(this.operations.join("\n"));
    }

    pageBreak() {
        this.finishPage();
        this.startPage();
    }

    private ensureSpace(height: number) {
        if (this.y - height >= margin) return;
        this.pageBreak();
    }

    private setFill(color: readonly number[]) {
        this.operations.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    }

    private setStroke(color: readonly number[]) {
        this.operations.push(`${color[0]} ${color[1]} ${color[2]} RG`);
    }

    private text(input: {
        font?: "F1" | "F2";
        size?: number;
        text: string;
        x: number;
        y: number;
    }) {
        const font = input.font ?? "F1";
        const size = input.size ?? 10;
        this.operations.push(
            `BT /${font} ${size} Tf ${input.x} ${input.y} Td (${escapePdfText(
                input.text,
            )}) Tj ET`,
        );
    }

    private estimateTextWidth(text: string, size: number) {
        return text.length * size * 0.6;
    }

    private rightAlignedText(input: {
        font?: "F1" | "F2";
        rightX: number;
        size: number;
        text: string;
        y: number;
    }) {
        this.text({
            font: input.font,
            size: input.size,
            text: input.text,
            x: input.rightX - this.estimateTextWidth(input.text, input.size),
            y: input.y,
        });
    }

    private centeredText(input: {
        font?: "F1" | "F2";
        size: number;
        text: string;
        y: number;
    }) {
        this.text({
            font: input.font,
            size: input.size,
            text: input.text,
            x: (pageWidth - this.estimateTextWidth(input.text, input.size)) / 2,
            y: input.y,
        });
    }

    private buildPageChrome(pageNumber: number, totalPages: number) {
        const previousOperations = this.operations;
        this.operations = [];

        this.setFill(navy);
        this.centeredText({
            font: "F2",
            size: 15,
            text: "Sewa First Innovation Challenge",
            y: pageHeight - 46,
        });
        this.centeredText({
            font: "F1",
            size: 10,
            text: "Under Sewa Sankalp Abhiyan",
            y: pageHeight - 62,
        });
        this.setStroke(border);
        this.operations.push(`${margin} ${pageHeight - 78} m ${pageWidth - margin} ${pageHeight - 78} l S`);

        this.setFill(muted);
        this.rightAlignedText({
            font: "F1",
            rightX: pageWidth - margin,
            size: 8,
            text: `Page ${pageNumber} of ${totalPages}`,
            y: 30,
        });

        const pageChrome = this.operations.join("\n");
        this.operations = previousOperations;
        return pageChrome;
    }

    private rect(input: {
        fill?: readonly number[];
        height: number;
        stroke?: readonly number[];
        width: number;
        x: number;
        y: number;
    }) {
        if (input.fill) this.setFill(input.fill);
        if (input.stroke) this.setStroke(input.stroke);
        this.operations.push(
            `${input.x} ${input.y} ${input.width} ${input.height} re ${
                input.fill && input.stroke ? "B" : input.fill ? "f" : "S"
            }`,
        );
    }

    private roundedRect(input: {
        fill?: readonly number[];
        height: number;
        radius: number;
        stroke?: readonly number[];
        width: number;
        x: number;
        y: number;
    }) {
        const k = 0.5522847498;
        const r = input.radius;
        const x = input.x;
        const y = input.y;
        const w = input.width;
        const h = input.height;
        const c = r * k;

        if (input.fill) this.setFill(input.fill);
        if (input.stroke) this.setStroke(input.stroke);
        this.operations.push(
            [
                `${x + r} ${y} m`,
                `${x + w - r} ${y} l`,
                `${x + w - r + c} ${y} ${x + w} ${y + r - c} ${x + w} ${y + r} c`,
                `${x + w} ${y + h - r} l`,
                `${x + w} ${y + h - r + c} ${x + w - r + c} ${y + h} ${x + w - r} ${y + h} c`,
                `${x + r} ${y + h} l`,
                `${x + r - c} ${y + h} ${x} ${y + h - r + c} ${x} ${y + h - r} c`,
                `${x} ${y + r} l`,
                `${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y} c`,
                input.fill && input.stroke ? "B" : input.fill ? "f" : "S",
            ].join(" "),
        );
    }

    private line(y: number, x = margin, width = contentWidth) {
        this.setStroke(border);
        this.operations.push(`${x} ${y} m ${x + width} ${y} l S`);
    }

    private wrappedText(input: {
        font?: "F1" | "F2";
        maxWidth: number;
        size: number;
        text: string;
        x: number;
        y: number;
    }) {
        wrapText(input.text, input.maxWidth, input.size).forEach((line, index) => {
            this.text({
                font: input.font,
                size: input.size,
                text: line,
                x: input.x,
                y: input.y - index * (input.size + 3),
            });
        });
    }

    summaryCard(input: {
        applicationNumber: string;
        challengeCategory: string;
        participationMode: string;
        status: string;
        submittedAt: string;
        updatedAt: string;
    }) {
        const cardHeight = 82;
        this.roundedRect({
            fill: [1, 1, 1],
            height: cardHeight,
            radius: 6,
            stroke: border,
            width: contentWidth,
            x: margin,
            y: this.y - cardHeight,
        });

        this.setFill(muted);
        this.text({
            font: "F2",
            size: 8.5,
            text: "APPLICATION #",
            x: margin + 12,
            y: this.y - 21,
        });
        this.setFill(navy);
        this.text({
            font: "F2",
            size: 18,
            text: input.applicationNumber,
            x: margin + 12,
            y: this.y - 42,
        });
        const pillX = margin + 144;
        const pillY = this.y - 51;
        this.roundedRect({
            fill: successBg,
            height: 20,
            radius: 10,
            width: 56,
            x: pillX,
            y: pillY,
        });
        this.setFill(successText);
        this.text({
            font: "F2",
            size: 8.5,
            text: input.status,
            x: pillX + 9,
            y: pillY + 7,
        });
        this.setFill(muted);
        this.text({
            font: "F1",
            size: 10.5,
            text: input.challengeCategory,
            x: margin + 12,
            y: this.y - 66,
        });

        const rightLabelX = pageWidth - margin - 170;
        const rightValueX = rightLabelX + 104;
        this.setFill(navy);
        this.text({ font: "F2", size: 9, text: "Participant Type:", x: rightLabelX, y: this.y - 22 });
        this.text({ font: "F2", size: 9, text: "Submitted:", x: rightLabelX, y: this.y - 42 });
        this.text({ font: "F2", size: 9, text: "Updated:", x: rightLabelX, y: this.y - 62 });
        this.text({ font: "F1", size: 9, text: input.participationMode, x: rightValueX, y: this.y - 22 });
        this.text({ font: "F1", size: 9, text: input.submittedAt, x: rightValueX, y: this.y - 42 });
        this.text({ font: "F1", size: 9, text: input.updatedAt, x: rightValueX, y: this.y - 62 });

        this.y -= cardHeight + 16;
    }

    private beginTableSegment(title: string, continued = false) {
        this.ensureSpace(48);
        const top = this.y;
        this.roundedRect({
            fill: [1, 1, 1],
            height: 34,
            radius: 6,
            stroke: border,
            width: contentWidth,
            x: margin,
            y: top - 34,
        });
        this.rect({
            fill: panel,
            height: 34,
            width: contentWidth,
            x: margin,
            y: top - 34,
        });
        this.setFill(navy);
        this.text({
            font: "F2",
            size: 12,
            text: continued ? `${title} (continued)` : title,
            x: margin + 10,
            y: top - 21,
        });
        this.line(top - 34);
        this.y -= 34;
    }

    private drawRow(labelLines: string[], valueLines: string[]) {
        const height = Math.max(rowHeight, Math.max(labelLines.length, valueLines.length) * 12 + 14);
        const top = this.y;
        const bottom = top - height;

        this.rect({
            height,
            stroke: border,
            width: contentWidth,
            x: margin,
            y: bottom,
        });
        this.rect({
            fill: panel,
            height,
            width: labelWidth,
            x: margin,
            y: bottom,
        });
        this.line(bottom);

        this.setFill(muted);
        labelLines.forEach((line, index) => {
            this.text({
                font: "F2",
                size: 8.5,
                text: line,
                x: margin + 10,
                y: top - 17 - index * 12,
            });
        });
        this.setFill(navy);
        valueLines.forEach((line, index) => {
            this.text({
                font: "F1",
                size: 9.5,
                text: line,
                x: margin + labelWidth + 14,
                y: top - 17 - index * 12,
            });
        });

        this.y = bottom;
    }

    table(title: string, rows: Array<[string, unknown]>) {
        this.beginTableSegment(title);

        rows.forEach(([label, value]) => {
            let labelLines = wrapText(label.toUpperCase(), labelWidth - 20, 8.5);
            let valueLines = wrapMultilineText(
                normalizeMultilineText(value),
                contentWidth - labelWidth - 24,
                9.5,
            );
            let isContinuation = false;

            while (labelLines.length || valueLines.length) {
                if (this.y - rowHeight < margin) {
                    this.pageBreak();
                    this.beginTableSegment(title, true);
                }

                const availableLines = Math.max(
                    1,
                    Math.floor((this.y - margin - 14) / 12),
                );
                const requestedLines = Math.max(
                    isContinuation ? 1 : labelLines.length,
                    valueLines.length,
                    1,
                );
                const lineCount = Math.max(1, Math.min(availableLines, requestedLines));
                const projectedHeight = Math.max(rowHeight, lineCount * 12 + 14);

                if (this.y - projectedHeight < margin) {
                    this.pageBreak();
                    this.beginTableSegment(title, true);
                    continue;
                }

                const labelChunk = labelLines.length
                    ? labelLines.splice(0, lineCount)
                    : ["CONTINUED"];
                const valueChunk = valueLines.splice(0, lineCount);

                this.drawRow(labelChunk, valueChunk.length ? valueChunk : [""]);
                isContinuation = true;
            }
        });

        this.y -= 14;
    }

    finish() {
        this.finishPage();
        const objects: string[] = [
            "<< /Type /Catalog /Pages 2 0 R >>",
            `<< /Type /Pages /Kids [${this.pages
                .map((_, index) => `${3 + index * 2} 0 R`)
                .join(" ")}] /Count ${this.pages.length} >>`,
        ];

        this.pages.forEach((content, index) => {
            const pageObjectId = 3 + index * 2;
            const contentObjectId = pageObjectId + 1;
            const decoratedContent = [
                this.buildPageChrome(index + 1, this.pages.length),
                content,
            ]
                .filter(Boolean)
                .join("\n");
            objects.push(
                `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectId} 0 R >>`,
            );
            objects.push(`<< /Length ${Buffer.byteLength(decoratedContent)} >>\nstream\n${decoratedContent}\nendstream`);
        });

        let pdf = "%PDF-1.4\n";
        const offsets = [0];
        objects.forEach((object, index) => {
            offsets.push(Buffer.byteLength(pdf));
            pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
        });
        const xrefOffset = Buffer.byteLength(pdf);
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach((offset) => {
            pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
        });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

        return Buffer.from(pdf, "binary");
    }
}

export function generateApplicationPdf(application: ApplicationPdfDetails) {
    const pdf = new PdfBuilder();
    const applicationNumber = normalizeText(application.applicationNumber);
    const challengeCategory = localizedName(application.challengeCategory?.name);
    const participationMode = normalizeText(application.participationMode);
    const status = formatStatus(application.status);
    const submittedAt = formatDate(application.submittedAt);
    const updatedAt = formatDate(application.updatedAt ?? application.createdAt);

    pdf.summaryCard({
        applicationNumber,
        challengeCategory,
        participationMode,
        status,
        submittedAt,
        updatedAt,
    });

    pdf.table("Application Summary", [
        ["Application #", applicationNumber],
        ["Challenge Category", challengeCategory],
        ["Participant Type", participationMode],
        ["Status", status],
        ["Submitted", submittedAt],
        ["Updated", updatedAt],
    ]);

    pdf.table("Participant Details", [
        ["Full Name", application.participant?.fullName],
        ["Email", application.participant?.email],
        ["Mobile", application.participant?.mobile],
        ["Participant Category", localizedName(application.participantCategory?.name)],
        ["Date of Birth", formatDate(application.participant?.dateOfBirth)],
        ["Gender", application.participant?.gender],
    ]);

    pdf.pageBreak();
    pdf.table("Location Details", [
        ["State", localizedName(application.state?.name)],
        ["District", localizedName(application.district?.name)],
        ["City", application.profile?.city],
        ["Pin Code", application.profile?.pinCode],
        ["Address", application.profile?.address],
    ]);

    pdf.table("Organisation and Education", [
        ["Present Organisation Name", application.profile?.instituteName],
        ["Organisation Type", localizedName(application.instituteType?.name)],
        [
            "Highest Educational Qualification",
            application.profile?.highestEducationalQualification,
        ],
        [
            "Last Attended Educational Institute",
            application.profile?.lastAttendedEducationalInstitute,
        ],
        ["Year of Passing", application.profile?.yearOfPassing],
    ]);

    pdf.pageBreak();
    pdf.table("Proposal Details", [
        ["Problem Location", application.proposal?.problemLocation],
        ["Proposed Solution", application.proposal?.proposedSolution],
        ["Technology / Method", application.proposal?.technologyMethod],
        ["Implementation Route", application.proposal?.implementationRoute],
        ["Cost / Funding", application.proposal?.costFunding],
        ["Beneficiaries", application.proposal?.beneficiaries],
        ["Project Timeline", application.proposal?.projectTimeline],
        ["Expected Impact", application.proposal?.expectedImpact],
        ["Scalability", application.proposal?.scalability],
        ["Prototype / Pilot", application.proposal?.prototypePilot],
        ["Mentor / Acknowledge To", application.proposal?.mentorAcknowledgeTo],
        [
            "Intellectual Property / Publication",
            application.proposal?.intellectualPropertyPublication,
        ],
    ]);

    const teamRows = (application.teamMembers ?? []).map((member) => [
        member.isApplicant ? "Team Lead" : "Team Member",
        `${normalizeText(member.fullName)} | ${normalizeText(member.email)} | ${normalizeText(member.mobile)}`,
    ]) satisfies Array<[string, unknown]>;
    pdf.table("Team Members", teamRows.length ? teamRows : [["Team Members", "-"]]);

    const documentLines = (application.documents ?? []).map(
        (document) =>
            `${normalizeText(document.originalFileName)} | ${formatFileSize(document.fileSizeBytes)}`,
    );
    pdf.table("Supporting Documents", [
        ["Video URL", application.proposal?.videoUrl],
        ["Supporting Documents", documentLines.length ? documentLines.join("\n") : "-"],
    ]);

    return pdf.finish();
}
