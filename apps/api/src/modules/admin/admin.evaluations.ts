import type { DatabasePool } from "./admin.service.js";

export type AdminEvaluationSummary = {
    level: "District" | "State";
    recommendation: string | null;
    status: "evaluated" | "on_evaluation";
    totalScore: number | null;
};

type SummaryRow = {
    application_id: string;
    level: "District" | "State";
    recommendation: string | null;
    status: "auto_submitted" | "in_progress" | "submitted";
    total_score: number;
};

// Adds the jury evaluation state to applications so admins see "On
// Evaluation" or "Evaluated" instead of "Submitted". The most advanced level
// wins (a state level evaluation over a district level one). A score and
// recommendation are only shown once the evaluation has been submitted.
export async function attachEvaluationSummaries<T extends { id?: unknown }>(
    pg: DatabasePool,
    applications: T[],
    log?: (error: unknown) => void,
): Promise<Array<T & { evaluation: AdminEvaluationSummary | null }>> {
    const ids = applications
        .map((application) => Number(application.id))
        .filter((id) => Number.isSafeInteger(id) && id > 0);

    let summaries = new Map<number, AdminEvaluationSummary>();

    if (ids.length > 0) {
        try {
            const result = await pg.query<SummaryRow>(
                `SELECT DISTINCT ON (e.application_id)
                        e.application_id::text, e.level, e.status, e.total_score, e.recommendation
                 FROM public.jury_evaluations e
                 WHERE e.application_id = ANY($1::bigint[])
                 ORDER BY e.application_id, CASE e.level WHEN 'State' THEN 0 ELSE 1 END`,
                [ids],
            );

            summaries = new Map(
                result.rows.map((row) => {
                    const isEvaluated = row.status !== "in_progress";

                    return [
                        Number(row.application_id),
                        {
                            level: row.level,
                            recommendation: isEvaluated ? row.recommendation : null,
                            status: isEvaluated ? "evaluated" : "on_evaluation",
                            totalScore: isEvaluated ? row.total_score : null,
                        },
                    ];
                }),
            );
        } catch (error) {
            // The application list must keep working even if evaluations
            // cannot be read (for example before the migration has run).
            log?.(error);
        }
    }

    return applications.map((application) => ({
        ...application,
        evaluation: summaries.get(Number(application.id)) ?? null,
    }));
}
