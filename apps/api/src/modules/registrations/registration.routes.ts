import type { FastifyPluginAsync } from "fastify";
import { registrationController } from "./registration.controller.js";

export const registrationRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", registrationController.createRegistration);
  app.get("/verify-email", registrationController.verifyEmail);
  app.get("/:id", registrationController.getRegistration);
};
