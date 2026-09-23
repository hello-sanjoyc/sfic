import type { QueryResultRow } from "pg";

export type PageVisitRow = QueryResultRow & {
    id: string | number;
};

export type PageVisitCreateInput = {
    visitorId: string;
    sessionId: string;
    pagePath: string;
    pageTitle?: string | null;
    browser?: string | null;
    browserVersion?: string | null;
    os?: string | null;
    osVersion?: string | null;
    deviceType?: string | null;
    screenWidth?: number | null;
    screenHeight?: number | null;
};

export type PageVisitLeaveInput = {
    visitId: number;
    durationSeconds: number;
};

export type PageVisitCreateResult = {
    visitId: number;
};

export type PageVisitLeaveResult = {
    success: true;
};

export function pageVisitCreateResultFromRow(
    row: PageVisitRow,
): PageVisitCreateResult {
    return {
        visitId: Number(row.id),
    };
}
