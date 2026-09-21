import type { FastifyPluginAsync } from "fastify";
import { adminController } from "./admin.controller.js";

export const adminRoutes: FastifyPluginAsync = async (app) => {
    app.get("/applications", adminController.getApplications);
    app.patch("/applications/:applicationId", adminController.updateApplication);
    app.put("/applications/:applicationId", adminController.updateApplication);
    app.delete(
        "/applications/:applicationId",
        adminController.deleteApplication,
    );
    app.get(
        "/applications/:applicationId/download",
        adminController.downloadApplicationPdf,
    );
    app.get(
        "/applications/:applicationId/documents/:documentId/download",
        adminController.downloadApplicationDocument,
    );
    app.delete(
        "/applications/:applicationId/documents/:documentId",
        adminController.deleteApplicationDocument,
    );
    app.get("/applications/:applicationId", adminController.getApplication);
    app.get("/dashboard-counts", adminController.getDashboardCounts);
    app.get(
        "/dashboard-organisation-type-counts",
        adminController.getDashboardOrganisationTypeCounts,
    );
    app.get(
        "/dashboard-challenge-category-counts",
        adminController.getDashboardChallengeCategoryCounts,
    );
    app.get("/users", adminController.getUsers);
    app.post("/users", adminController.createUser);
    app.get("/users/:userId", adminController.getUser);
    app.patch("/users/:userId", adminController.updateUser);
    app.put("/users/:userId", adminController.updateUser);
    app.delete("/users/:userId", adminController.deleteUser);
    app.get("/settings/states", adminController.getSettingsStates);
    app.post("/settings/states", adminController.createSettingsState);
    app.get("/settings/states/:id", adminController.getSettingsState);
    app.patch("/settings/states/:id", adminController.updateSettingsState);
    app.put("/settings/states/:id", adminController.updateSettingsState);
    app.delete("/settings/states/:id", adminController.deleteSettingsState);
    app.get("/settings/districts", adminController.getSettingsDistricts);
    app.post("/settings/districts", adminController.createSettingsDistrict);
    app.get("/settings/districts/:id", adminController.getSettingsDistrict);
    app.patch("/settings/districts/:id", adminController.updateSettingsDistrict);
    app.put("/settings/districts/:id", adminController.updateSettingsDistrict);
    app.delete("/settings/districts/:id", adminController.deleteSettingsDistrict);
    app.get("/settings/institute-types", adminController.getSettingsInstituteTypes);
    app.post("/settings/institute-types", adminController.createSettingsInstituteType);
    app.get("/settings/institute-types/:id", adminController.getSettingsInstituteType);
    app.patch("/settings/institute-types/:id", adminController.updateSettingsInstituteType);
    app.put("/settings/institute-types/:id", adminController.updateSettingsInstituteType);
    app.delete("/settings/institute-types/:id", adminController.deleteSettingsInstituteType);
    app.get("/settings/participant-categories", adminController.getSettingsParticipantCategories);
    app.post("/settings/participant-categories", adminController.createSettingsParticipantCategory);
    app.get("/settings/participant-categories/:id", adminController.getSettingsParticipantCategory);
    app.patch("/settings/participant-categories/:id", adminController.updateSettingsParticipantCategory);
    app.put("/settings/participant-categories/:id", adminController.updateSettingsParticipantCategory);
    app.delete("/settings/participant-categories/:id", adminController.deleteSettingsParticipantCategory);
    app.get("/settings/challenge-categories", adminController.getSettingsChallengeCategories);
    app.post("/settings/challenge-categories", adminController.createSettingsChallengeCategory);
    app.get("/settings/challenge-categories/:id", adminController.getSettingsChallengeCategory);
    app.patch("/settings/challenge-categories/:id", adminController.updateSettingsChallengeCategory);
    app.put("/settings/challenge-categories/:id", adminController.updateSettingsChallengeCategory);
    app.delete("/settings/challenge-categories/:id", adminController.deleteSettingsChallengeCategory);
    app.get("/settings/user-roles", adminController.getSettingsUserRoles);
    app.post("/settings/user-roles", adminController.createSettingsUserRole);
    app.get("/settings/user-roles/:role", adminController.getSettingsUserRole);
    app.patch("/settings/user-roles/:role", adminController.updateSettingsUserRole);
    app.put("/settings/user-roles/:role", adminController.updateSettingsUserRole);
    app.delete("/settings/user-roles/:role", adminController.deleteSettingsUserRole);
    app.post("/login", adminController.requestLoginCode);
    app.post("/resend-login-code", adminController.resendLoginCode);
    app.post("/verify-login", adminController.verifyLoginCode);
};
