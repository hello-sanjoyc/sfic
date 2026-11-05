export type ScoringCardData = {
    applicationNumber: string;
    city: string;
    district: string;
    state: string;
    juryName: string;
    juryDesignation: string | null;
    juryInstitute: string | null;
    juryEmail: string | null;
    juryPhone: string | null;
    participantCategory: string;
    participationMode: string;
    recommendation: string | null;
    remarks: string | null;
    scores: Record<string, number>;
    submittedAt: string | null;
    totalScore: number;
};

const pageWidth = 595.92;
const pageHeight = 842.88;
const margin = 40;
const contentWidth = pageWidth - margin * 2;
const navy = [0.04, 0.12, 0.23] as const;
const orange = [0.93, 0.49, 0.13] as const;
const white = [1, 1, 1] as const;
const border = [0.79, 0.84, 0.9] as const;
const muted = [0.55, 0.55, 0.55] as const;
const gold = [0.78, 0.54, 0.16] as const;
const lightGray = [0.95, 0.95, 0.95] as const;

const CRITERIA = [
    {
        key: "problemClarity",
        label: "Problem clarity &\nLocal Relevance",
        evidence:
            "How clearly the problem has been defined and how relevant it is in the local context?",
    },
    {
        key: "innovation",
        label: "Innovation &\nOriginality/ Novelty",
        evidence:
            "Whether the proposed approach is original in nature and has enough novelty?",
    },
    {
        key: "method",
        label: "Method / Technology\nproposed to be adopted",
        evidence:
            "Whether the chosen methodology is appropriate and the proposed technology has the potential to address the problem.",
    },
    {
        key: "feasibility",
        label: "Feasibility of\nPractical Implementation",
        evidence: "Can the proposed methodology be realistically implemented?",
    },
    {
        key: "costEffectiveness",
        label: "Cost Effectiveness",
        evidence:
            "Are the costs and funding needs correctly estimated, and does it justify the output?",
    },
    {
        key: "impact",
        label: "Beneficiary reach,\nOutcome and Impact",
        evidence:
            "Who benefits? Are the social, economic or environmental outcomes impactful enough?",
    },
    {
        key: "scalability",
        label: "Scalability &\nSustainability",
        evidence:
            "Can the proposed scheme be implemented on a larger scale and in a sustainable manner?",
    },
    {
        key: "pilotModel",
        label: "Prototype / Pilot\nmodel",
        evidence:
            "Is there a tested model or credible experimental proof of the proposed project/scheme?",
    },
    {
        key: "readiness",
        label: "Timeline, readiness\n& Adoption",
        evidence:
            "Is the timeline realistic, and whether commercialization and practical adoption feasible?",
    },
    {
        key: "presentation",
        label: "Overall Presentation",
        evidence:
            "Overall clarity of presentation, and technical quality of the proposed project.",
    },
] as const;

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

function formatDate(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function wrapText(value: string, maxWidth: number, fontSize: number): string[] {
    const avgCharWidth = fontSize * 0.52;
    const maxChars = Math.max(8, Math.floor(maxWidth / avgCharWidth));
    const words = value.split(/\s+/).flatMap((word) => {
        if (word.length <= maxChars) return [word];
        const parts: string[] = [];
        for (let i = 0; i < word.length; i += maxChars)
            parts.push(word.slice(i, i + maxChars));
        return parts;
    });
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length <= maxChars) {
            line = next;
        } else {
            if (line) lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ["-"];
}

function wrapMultilineText(
    value: string,
    maxWidth: number,
    fontSize: number,
): string[] {
    return value.split(/\r?\n/).flatMap((l) => wrapText(l, maxWidth, fontSize));
}

class ScoringCardBuilder {
    private pages: string[] = [];
    private ops: string[] = [];

    constructor() {
        this.ops = [];
    }

    private setFill(color: readonly number[]) {
        this.ops.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    }

    private setStroke(color: readonly number[]) {
        this.ops.push(`${color[0]} ${color[1]} ${color[2]} RG`);
    }

    private text(
        font: "F1" | "F2",
        size: number,
        text: string,
        x: number,
        y: number,
        charSpacing = 0,
    ) {
        const cs = charSpacing !== 0 ? `${charSpacing} Tc ` : "";
        const reset = charSpacing !== 0 ? " 0 Tc" : "";
        this.ops.push(
            `BT /${font} ${size} Tf ${cs}${x} ${y} Td (${escapePdfText(text)}) Tj${reset} ET`,
        );
    }

    private estimateWidth(text: string, size: number) {
        // Helvetica character widths in units of 1/1000 em (standard PDF metrics)
        const widths: Record<string, number> = {
            " ": 278,
            "!": 278,
            '"': 355,
            "#": 556,
            $: 556,
            "%": 889,
            "&": 667,
            "'": 191,
            "(": 333,
            ")": 333,
            "*": 389,
            "+": 584,
            ",": 278,
            "-": 333,
            ".": 278,
            "/": 278,
            "0": 556,
            "1": 556,
            "2": 556,
            "3": 556,
            "4": 556,
            "5": 556,
            "6": 556,
            "7": 556,
            "8": 556,
            "9": 556,
            ":": 278,
            ";": 278,
            "<": 584,
            "=": 584,
            ">": 584,
            "?": 556,
            "@": 1015,
            A: 667,
            B: 667,
            C: 722,
            D: 722,
            E: 667,
            F: 611,
            G: 778,
            H: 722,
            I: 278,
            J: 500,
            K: 667,
            L: 556,
            M: 833,
            N: 722,
            O: 778,
            P: 667,
            Q: 778,
            R: 722,
            S: 667,
            T: 611,
            U: 722,
            V: 667,
            W: 944,
            X: 667,
            Y: 667,
            Z: 611,
            "[": 278,
            "\\": 278,
            "]": 278,
            "^": 469,
            _: 556,
            "`": 333,
            a: 556,
            b: 556,
            c: 500,
            d: 556,
            e: 556,
            f: 278,
            g: 556,
            h: 556,
            i: 222,
            j: 222,
            k: 500,
            l: 222,
            m: 833,
            n: 556,
            o: 556,
            p: 556,
            q: 556,
            r: 333,
            s: 500,
            t: 278,
            u: 556,
            v: 500,
            w: 722,
            x: 500,
            y: 500,
            z: 500,
        };
        let w = 0;
        for (const ch of text) w += widths[ch] ?? 556;
        return (w / 1000) * size;
    }

    private centeredText(
        font: "F1" | "F2",
        size: number,
        text: string,
        y: number,
        charSpacing = 0,
    ) {
        const spacingTotal = charSpacing * (text.length - 1);
        const x =
            (pageWidth - this.estimateWidth(text, size) - spacingTotal) / 2;
        this.text(font, size, text, x, y, charSpacing);
    }

    private rect(
        x: number,
        y: number,
        w: number,
        h: number,
        fill?: readonly number[],
        stroke?: readonly number[],
    ) {
        if (fill) this.setFill(fill);
        if (stroke) this.setStroke(stroke);
        this.ops.push(
            `${x} ${y} ${w} ${h} re ${fill && stroke ? "B" : fill ? "f" : "S"}`,
        );
    }

    private hline(y: number, x = margin, w = contentWidth, color = border) {
        this.setStroke(color);
        this.ops.push(`${x} ${y} m ${x + w} ${y} l S`);
    }

    private vline(x: number, y: number, h: number, color = border) {
        this.setStroke(color);
        this.ops.push(`${x} ${y} m ${x} ${y + h} l S`);
    }

    build(data: ScoringCardData): Buffer {
        const ops = this.ops;
        let y = pageHeight - margin;

        // ── Header top text ──────────────────────────────────────────────────
        this.setFill(gold);
        this.centeredText(
            "F2",
            7.5,
            "SEVA SANKALP ABHIYAN | YOUNG INDIA, BUILD WHAT'S NEXT",
            y - 8,
            0.8,
        );

        // ── Title ─────────────────────────────────────────────────────────────
        this.setFill(orange);
        this.centeredText("F2", 22, "SEVA FIRST INNOVATION CHALLENGE", y - 34);

        // ── Thin rule ─────────────────────────────────────────────────────────
        this.hline(y - 44, margin, contentWidth, border);

        // ── Subtitle ──────────────────────────────────────────────────────────
        this.setFill(muted);
        this.centeredText(
            "F2",
            8,
            "INNOVATION - IMPLEMENTATION - IMPACT",
            y - 60,
        );

        // ── Orange banner "JURY SCORING CARD" ────────────────────────────────
        const bannerY = y - 110;
        const bannerH = 28;
        this.rect(margin, bannerY, contentWidth, bannerH, orange);
        this.setFill(white);
        this.centeredText("F2", 13, "JURY SCORING CARD", bannerY + 9);

        // ── Info fields ───────────────────────────────────────────────────────
        let iy = bannerY - 14;
        const labelFs = 9;
        const valueFs = 9;
        const lineSpacing = 22;
        const underlineY = -3;

        // Fixed value column offset for alignment (longest label = "Individual / Team:")
        const labelColW = 130;

        const drawInfoLine = (
            label: string,
            value: string,
            lx: number,
            lw: number,
        ) => {
            this.setFill(navy);
            this.text("F2", labelFs, label, lx, iy);
            const valX = lx + labelColW;
            const valW = lw - labelColW;
            this.setFill(navy);
            this.text("F1", valueFs, normalizeText(value), valX, iy);
            this.hline(iy + underlineY, valX, valW, border);
        };

        // Row: Name of District, State
        drawInfoLine(
            "Name of District:",
            `${data.district}${data.state ? `,  ${data.state}` : ""}`,
            margin,
            contentWidth,
        );
        iy -= lineSpacing;

        // Row: Jury / Expert — name, designation, institute on one line
        const juryParts = [
            data.juryName,
            data.juryDesignation,
            data.juryInstitute,
        ]
            .filter(Boolean)
            .join(",  ");
        drawInfoLine("Jury / Expert:", juryParts, margin, contentWidth);
        iy -= lineSpacing;

        // Row: Application # | Centre / City
        const halfW = contentWidth / 2 - 10;
        drawInfoLine("Application #:", data.applicationNumber, margin, halfW);
        drawInfoLine("Centre / City:", data.city, margin + halfW + 20, halfW);
        iy -= lineSpacing;

        // Row: Junior / Open | Individual / Team
        drawInfoLine("Junior / Open:", data.participantCategory, margin, halfW);
        drawInfoLine(
            "Individual / Team:",
            data.participationMode,
            margin + halfW + 20,
            halfW,
        );
        iy -= lineSpacing;

        // Row: Date of Review
        drawInfoLine(
            "Date of Review:",
            formatDate(data.submittedAt),
            margin,
            contentWidth / 2,
        );
        iy -= lineSpacing;

        // Row: Remarks
        drawInfoLine(
            "Remarks:",
            normalizeText(data.remarks),
            margin,
            contentWidth,
        );
        iy -= lineSpacing + 4;

        // ── Scores table ──────────────────────────────────────────────────────
        // Column widths: Sl | Criterion = 30% | Evidence = 40% | Score + Obtained = 30%
        const col13pct = Math.round(contentWidth * 0.3);
        const col3pct = contentWidth - col13pct * 2; // 40% (remainder)
        const colSl = 28;
        const colCriterion = col13pct - colSl;
        const colEvidence = col3pct;
        const colScore = Math.round(col13pct * 0.35);
        const colObtained = col13pct - colScore;

        // Estimate row heights for all criteria first
        const criteriaRowHeights: number[] = CRITERIA.map((c) => {
            const criterionLines = wrapMultilineText(
                c.label,
                colCriterion - 8,
                8,
            ).length;
            const evidenceLines = wrapText(
                c.evidence,
                colEvidence - 8,
                8,
            ).length;
            return Math.max(criterionLines, evidenceLines) * 11 + 12;
        });

        const tableHeaderH = 26;
        const totalRowH = 36;
        const tableH =
            tableHeaderH +
            criteriaRowHeights.reduce((a, b) => a + b, 0) +
            totalRowH;

        // Table header row
        const tblX = margin;
        const tblTop = iy - 12;

        // Header background
        this.rect(
            tblX,
            tblTop - tableHeaderH,
            contentWidth,
            tableHeaderH,
            orange,
        );
        const scoreColX = tblX + colSl + colCriterion + colEvidence;
        const obtainedColX = scoreColX + colScore;
        const hdrY = tblTop - tableHeaderH / 2 - 4;

        const colCenter = (
            colX: number,
            colW: number,
            text: string,
            fs: number,
        ) => colX + (colW - this.estimateWidth(text, fs)) / 2;

        this.setFill(white);
        this.text("F2", 10, "Sl.", colCenter(tblX, colSl, "Sl.", 10), hdrY);
        this.text(
            "F2",
            10,
            "Criterion",
            colCenter(tblX + colSl, colCriterion, "Criterion", 10),
            hdrY,
        );
        this.text(
            "F2",
            10,
            "Evidence to look for",
            colCenter(
                tblX + colSl + colCriterion,
                colEvidence,
                "Evidence to look for",
                10,
            ),
            hdrY,
        );
        this.text(
            "F2",
            10,
            "Score",
            colCenter(scoreColX, colScore, "Score", 10),
            hdrY,
        );
        this.text(
            "F2",
            10,
            "Score Obtained",
            colCenter(obtainedColX, colObtained, "Score Obtained", 10),
            hdrY,
        );

        let rowY = tblTop - tableHeaderH;

        // Draw each criterion row
        CRITERIA.forEach((criterion, idx) => {
            const rh = criteriaRowHeights[idx];
            const ry = rowY - rh;

            // Row background: alternate white / light grey
            const rowBg = idx % 2 === 0 ? white : lightGray;
            this.rect(tblX, ry, contentWidth, rh, rowBg);

            // Sl column: alternate white / light gray
            const slBg = idx % 2 === 0 ? white : lightGray;
            this.rect(tblX, ry, colSl, rh, slBg);
            this.setFill(navy);
            const slStr = String(idx + 1).padStart(2, "0");
            this.text(
                "F2",
                8,
                slStr,
                colCenter(tblX, colSl, slStr, 8),
                ry + rh / 2 - 4,
            );

            // Criterion text (bold, navy) — vertically centered
            const criterionLines = wrapMultilineText(
                criterion.label,
                colCriterion - 8,
                8,
            );
            const lineH = 11;
            const criterionBlockH = criterionLines.length * lineH;
            const criterionStartY =
                ry + rh / 2 + criterionBlockH / 2 - lineH + 2;
            this.setFill(navy);
            criterionLines.forEach((line, li) => {
                this.text(
                    "F2",
                    8,
                    line,
                    tblX + colSl + 4,
                    criterionStartY - li * lineH,
                );
            });

            // Evidence text (regular, dark) — vertically centered
            const evidenceLines = wrapText(
                criterion.evidence,
                colEvidence - 8,
                8,
            );
            const evidenceBlockH = evidenceLines.length * lineH;
            const evidenceStartY = ry + rh / 2 + evidenceBlockH / 2 - lineH + 2;
            this.setFill([0.2, 0.2, 0.2] as const);
            evidenceLines.forEach((line, li) => {
                this.text(
                    "F1",
                    8,
                    line,
                    tblX + colSl + colCriterion + 4,
                    evidenceStartY - li * lineH,
                );
            });

            // Score (max): center in column
            this.setFill(navy);
            this.text(
                "F2",
                9,
                "10",
                colCenter(scoreColX, colScore, "10", 9),
                ry + rh / 2 - 4,
            );

            // Score obtained: center in column
            const obtained = data.scores[criterion.key];
            if (obtained !== undefined && obtained !== null) {
                const obtainedStr = Number(obtained).toFixed(2);
                this.text(
                    "F2",
                    9,
                    obtainedStr,
                    colCenter(obtainedColX, colObtained, obtainedStr, 9),
                    ry + rh / 2 - 4,
                );
            }

            // Border lines
            this.hline(ry, tblX, contentWidth, border);
            this.vline(tblX + colSl, ry, rh, border);
            this.vline(tblX + colSl + colCriterion, ry, rh, border);
            this.vline(
                tblX + colSl + colCriterion + colEvidence,
                ry,
                rh,
                border,
            );
            this.vline(scoreColX + colScore, ry, rh, border);

            rowY = ry;
        });

        // Bottom border of last data row
        this.hline(rowY, tblX, contentWidth, border);

        // ── Total Score row ───────────────────────────────────────────────────
        const tsY = rowY - totalRowH;

        // Col 1+2: "TOTAL SCORE" (30% = colSl + colCriterion)
        const tsCol1W = colSl + colCriterion;
        this.rect(tblX, tsY, tsCol1W, totalRowH, orange);
        this.setFill(white);
        const tsLabel = "TOTAL SCORE";
        const tsLabelW2 = this.estimateWidth(tsLabel, 11);
        this.text(
            "F2",
            11,
            tsLabel,
            tblX + (tsCol1W - tsLabelW2) / 2,
            tsY + totalRowH / 2 - 5,
        );

        // Col 3: score "60 / 100" with zone color (40% = colEvidence)
        const ts = data.totalScore;
        const scoreBg =
            ts >= 70
                ? ([0.86, 0.98, 0.91] as const)
                : ts >= 40
                  ? ([1.0, 0.95, 0.7] as const)
                  : ([1.0, 0.9, 0.9] as const);
        const scoreTextColor =
            ts >= 70
                ? ([0.02, 0.46, 0.24] as const)
                : ts >= 40
                  ? ([0.5, 0.35, 0.0] as const)
                  : ([0.7, 0.1, 0.1] as const);
        const midX = tblX + tsCol1W;
        const midW = colEvidence;
        this.rect(midX, tsY, midW, totalRowH, scoreBg);
        this.setFill(scoreTextColor);
        const scoreStr = `${Number(ts).toFixed(2)} / 100`;
        const scoreStrW = this.estimateWidth(scoreStr, 13);
        this.text(
            "F2",
            13,
            scoreStr,
            midX + (midW - scoreStrW) / 2,
            tsY + totalRowH / 2 - 5,
        );

        // Col 4+5: recommendation (30% = colScore + colObtained)
        const recX = midX + midW;
        const recW = colScore + colObtained;
        this.rect(recX, tsY, recW, totalRowH, orange);
        this.setFill(white);
        const rec = data.recommendation ?? "-";
        const recSmallLabel = "Jury Recommendation:";
        const recSmallW = this.estimateWidth(recSmallLabel, 7);
        this.text(
            "F2",
            7,
            recSmallLabel,
            recX + (recW - recSmallW) / 2,
            tsY + totalRowH - 9,
        );
        const recLabelW = this.estimateWidth(rec, 11);
        this.text(
            "F2",
            11,
            rec,
            recX + (recW - recLabelW) / 2,
            tsY + totalRowH / 2 - 4,
        );

        // Vertical dividers on total row
        this.vline(midX, tsY, totalRowH, border);
        this.vline(recX, tsY, totalRowH, border);

        // Outer border
        this.hline(tsY, tblX, contentWidth, border);
        this.setStroke(border);
        this.ops.push(`${tblX} ${tsY} ${contentWidth} ${tableH} re S`);

        // ── Download watermark ────────────────────────────────────────────────
        const now = new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
        }).format(new Date());
        const watermark = `Downloaded from https://sficeast.wb.gov.in on ${now}`;
        this.setFill(muted);
        this.centeredText("F1", 7, watermark, margin - 24);

        this.pages.push(ops.join("\n"));

        // Build raw PDF
        const content = this.pages[0];
        const objects: string[] = [
            "<< /Type /Catalog /Pages 2 0 R >>",
            `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents 4 0 R >>`,
            `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
        ];

        let pdf = "%PDF-1.4\n";
        const offsets: number[] = [];
        objects.forEach((obj, idx) => {
            offsets.push(Buffer.byteLength(pdf));
            pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
        });
        const xrefOffset = Buffer.byteLength(pdf);
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.forEach((offset) => {
            pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
        });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

        return Buffer.from(pdf, "binary");
    }
}

export function generateScoringCardPdf(data: ScoringCardData): Buffer {
    const builder = new ScoringCardBuilder();
    return builder.build(data);
}
