import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../common/api-response.js";

export type JurySession = { email: string; exp: number; name: string; sub: string };
export type AuthenticatedJuryRequest = FastifyRequest & { jury: JurySession };

const encode = (value: Buffer | string) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
const decode = (value: string) => Buffer.from(value.padEnd(value.length + ((4 - value.length % 4) % 4), "=").replaceAll("-", "+").replaceAll("_", "/"), "base64");
const secret = () => process.env.JURY_JWT_SECRET ?? process.env.JWT_SECRET ?? "sfic-local-jury-secret";
const sign = (value: string) => encode(createHmac("sha256", secret()).update(value).digest());

export function createJuryJwt(claims: Omit<JurySession, "exp">) {
    const header = encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = encode(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + Number(process.env.JURY_JWT_TTL_SECONDS ?? 604800) }));
    return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

function tokenFrom(request: FastifyRequest) {
    const [scheme, token] = (request.headers.authorization ?? "").split(/\s+/, 2);
    return scheme?.toLowerCase() === "bearer" ? token ?? "" : "";
}

export async function authenticateJury(request: FastifyRequest, reply: FastifyReply) {
    try {
        const [header, body, signature] = tokenFrom(request).split(".");
        if (!header || !body || !signature) throw new Error();
        const expected = Buffer.from(sign(`${header}.${body}`));
        const actual = Buffer.from(signature);
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
        const payload = JSON.parse(decode(body).toString("utf8")) as JurySession;
        if (!payload.sub || !payload.email || !payload.name || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error();
        (request as AuthenticatedJuryRequest).jury = payload;
    } catch {
        return sendError(request, reply, { message: "A valid jury session is required.", statusCode: 401 });
    }
}
