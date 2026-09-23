import type { FastifyPluginAsync } from "fastify";
import {
    analyticsController,
    type AnalyticsLeaveBody,
    type AnalyticsVisitBody,
} from "./analytics.controller.js";

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
    app.post<{ Body: AnalyticsVisitBody }>(
        "/visit",
        analyticsController.createVisit,
    );

    app.post<{ Body: AnalyticsLeaveBody }>(
        "/leave",
        analyticsController.endVisit,
    );
};
