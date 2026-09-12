import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildApp } from "./app.js";

const envPath = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/api/.env"),
].find(existsSync);
config(envPath ? { path: envPath } : undefined);

const app = buildApp();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

app.listen({ port, host }).catch((error) => {
    app.log.error(error);
    process.exit(1);
});
