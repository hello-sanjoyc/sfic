import type { FastifyPluginAsync } from "fastify";
import { participantController } from "./participant.controller.js";

export const participantRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", participantController.requestLoginCode);
  app.post("/resend-login-code", participantController.resendLoginCode);
  app.post("/verify-login", participantController.verifyLoginCode);
};
