import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError } from "../common/api-response.js";

export type ParticipantJwtRole = "applicant" | "team_member";

export type ParticipantJwtPayload = {
    email: string;
    exp: number;
    iat: number;
    name: string;
    phone: string;
    role: ParticipantJwtRole;
    sub: string;
};

export type AuthenticatedParticipantRequest = FastifyRequest & {
    participant: ParticipantJwtPayload;
};

function base64UrlEncode(value: Buffer | string) {
    return Buffer.from(value)
        .toString("base64")
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/u, "");
}

function base64UrlDecode(value: string) {
    const padded = value.padEnd(
        value.length + ((4 - (value.length % 4)) % 4),
        "=",
    );
    return Buffer.from(
        padded.replaceAll("-", "+").replaceAll("_", "/"),
        "base64",
    );
}

function jwtSecret() {
    return (
        process.env.PARTICIPANT_JWT_SECRET ??
        process.env.JWT_SECRET ??
        "sfic-local-participant-secret"
    );
}

function participantTokenTtlSeconds() {
    return Number(process.env.PARTICIPANT_JWT_TTL_SECONDS ?? 7 * 24 * 60 * 60);
}

function sign(input: string) {
    return base64UrlEncode(
        createHmac("sha256", jwtSecret()).update(input).digest(),
    );
}

export function createParticipantJwt(
    claims: Omit<ParticipantJwtPayload, "exp" | "iat">,
) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: ParticipantJwtPayload = {
        ...claims,
        exp: issuedAt + participantTokenTtlSeconds(),
        iat: issuedAt,
    };
    const header = base64UrlEncode(
        JSON.stringify({
            alg: "HS256",
            typ: "JWT",
        }),
    );
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = sign(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
}

export function verifyParticipantJwt(token: string): ParticipantJwtPayload {
    const [header, body, signature] = token.split(".");

    if (!header || !body || !signature) {
        throw new Error("Invalid participant token.");
    }

    const expectedSignature = sign(`${header}.${body}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
        signatureBuffer.length !== expectedSignatureBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
        throw new Error("Invalid participant token.");
    }

    const parsedHeader = JSON.parse(
        base64UrlDecode(header).toString("utf8"),
    ) as {
        alg?: string;
    };

    if (parsedHeader.alg !== "HS256") {
        throw new Error("Invalid participant token.");
    }

    const payload = JSON.parse(
        base64UrlDecode(body).toString("utf8"),
    ) as ParticipantJwtPayload;

    if (
        !payload.email ||
        !payload.name ||
        !payload.phone ||
        !payload.role ||
        !payload.sub ||
        !payload.exp ||
        payload.exp <= Math.floor(Date.now() / 1000)
    ) {
        throw new Error("Invalid participant token.");
    }

    return payload;
}

export function getBearerToken(request: FastifyRequest) {
    const authorization = request.headers.authorization;
    if (!authorization) return "";

    const [scheme, token] = authorization.split(/\s+/, 2);
    return scheme?.toLowerCase() === "bearer" ? (token?.trim() ?? "") : "";
}

export async function authenticateParticipant(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const token = getBearerToken(request);

    if (!token) {
        return sendError(request, reply, {
            message: "A valid participant session is required.",
            statusCode: 401,
        });
    }

    try {
        (request as AuthenticatedParticipantRequest).participant =
            verifyParticipantJwt(token);
    } catch {
        return sendError(request, reply, {
            message: "A valid participant session is required.",
            statusCode: 401,
        });
    }
}
