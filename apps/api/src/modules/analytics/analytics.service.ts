import type { QueryResultRow } from "pg";
import {
    pageVisitCreateResultFromRow,
    type PageVisitCreateInput,
    type PageVisitLeaveInput,
    type PageVisitRow,
} from "./analytics.model.js";

export type DatabaseClient = {
    query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: readonly unknown[],
    ): Promise<{ rows: T[] }>;
};

async function createVisit(
    pg: DatabaseClient,
    input: PageVisitCreateInput,
) {
    const result = await pg.query<PageVisitRow>(
        `
        INSERT INTO public.page_visits (
            visitor_id,
            session_id,
            page_path,
            page_title,
            browser,
            browser_version,
            os,
            os_version,
            device_type,
            screen_width,
            screen_height
        )
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11
        )
        RETURNING id
        `,
        [
            input.visitorId,
            input.sessionId,
            input.pagePath,
            input.pageTitle ?? null,
            input.browser ?? null,
            input.browserVersion ?? null,
            input.os ?? null,
            input.osVersion ?? null,
            input.deviceType ?? null,
            input.screenWidth ?? null,
            input.screenHeight ?? null,
        ],
    );

    const row = result.rows[0];

    if (!row) {
        throw new Error(
            "Page visit insert did not return an id",
        );
    }

    return pageVisitCreateResultFromRow(row);
}

async function endVisit(
    pg: DatabaseClient,
    input: PageVisitLeaveInput,
) {
    await pg.query(
        `
        UPDATE public.page_visits
        SET
            duration_seconds = $1,
            ended_at = NOW()
        WHERE id = $2
        `,
        [
            input.durationSeconds,
            input.visitId,
        ],
    );

    return {
        success: true as const,
    };
}

export const analyticsService = {
    createVisit,
    endVisit,
};
