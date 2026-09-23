import type { FastifyPluginAsync } from "fastify";
import {
    commonController,
    type DistrictsQuery,
    type InstituteTypesQuery,
} from "./common.controller.js";

export const commonRoutes: FastifyPluginAsync = async (app) => {
    app.get("/app-settings", commonController.getAppSettings);

    app.get("/states", commonController.getStates);

    app.get<{ Querystring: DistrictsQuery }>(
        "/districts",
        commonController.getDistricts,
    );

    app.get(
        "/participant-categories",
        commonController.getParticipantCategories,
    );

    app.get<{ Querystring: InstituteTypesQuery }>(
        "/institute-types",
        commonController.getInstituteTypes,
    );

    app.get(
        "/participant-category-institute-types",
        commonController.getParticipantCategoryInstituteTypes,
    );

    app.get("/challenge-categories", commonController.getChallengeCategories);

    app.get("/lookups", commonController.getLookups);
};
