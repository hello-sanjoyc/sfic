import type { FastifyPluginAsync } from "fastify";
import { authenticateParticipant } from "./participant-auth.js";
import { participantController } from "./participant.controller.js";

export const participantRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/profile",
        {
            preHandler: authenticateParticipant,
        },
        participantController.getProfile,
    );
    app.post<{
        Body?: {
            address?: string;
            beneficiaries?: string;
            challengeCategoryId?: number | string;
            city?: string;
            costFunding?: string;
            districtId?: number | string;
            expectedImpact?: string;
            highestEducationalQualification?: string;
            implementationRoute?: string;
            intellectualPropertyPublication?: string;
            instituteName?: string;
            instituteType?: string;
            language?: string;
            lastAttendedEducationalInstitute?: string;
            mentorAcknowledgeTo?: string;
            otherInstituteType?: string;
            participationMode?: string;
            pinCode?: string;
            problemLocation?: string;
            projectTimeline?: string;
            proposedSolution?: string;
            prototypePilot?: string;
            scalability?: string;
            stateId?: number | string;
            supportingDocuments?: Array<{
                checksumSha256?: string;
                mimeType?: string;
                name?: string;
                originalFileName?: string;
                size?: number;
                storageKey?: string;
                type?: string;
            }>;
            teamMembers?: Array<{
                email?: string;
                fullName?: string;
                mobile?: string;
            }>;
            technologyMethod?: string;
            theme?: string;
            videoUrl?: string;
            yearOfPassing?: string;
        };
    }>(
        "/applications",
        {
            preHandler: authenticateParticipant,
        },
        participantController.submitApplication,
    );
    app.get<{
        Querystring: {
            page?: string;
            pageSize?: string;
            sortBy?: string;
            sortDirection?: string;
            status?: string;
        };
    }>(
        "/applications",
        {
            preHandler: authenticateParticipant,
        },
        participantController.getApplications,
    );
    app.get<{
        Params: {
            applicationHash?: string;
            documentId?: string;
        };
    }>(
        "/applications/:applicationHash/documents/:documentId/download",
        {
            preHandler: authenticateParticipant,
        },
        participantController.downloadApplicationDocument,
    );
    app.get<{
        Params: {
            applicationHash?: string;
        };
    }>(
        "/applications/:applicationHash/download",
        {
            preHandler: authenticateParticipant,
        },
        participantController.downloadApplicationPdf,
    );
    app.get<{
        Params: {
            applicationHash?: string;
        };
    }>(
        "/applications/:applicationHash",
        {
            preHandler: authenticateParticipant,
        },
        participantController.getApplication,
    );
    app.post("/login", participantController.requestLoginCode);
    app.post("/resend-login-code", participantController.resendLoginCode);
    app.post("/verify-login", participantController.verifyLoginCode);
};
