import nodemailer from "nodemailer";
import { getApiContent } from "../../content/index.js";
import {
    renderApplicationSubmittedEmail,
    renderTeamMemberAddedEmail,
    renderVerificationEmail,
} from "./email-template.js";

type SendEmailInput = {
    html: string;
    subject: string;
    text: string;
    to: string;
};

function envFlag(name: string, defaultValue = false) {
    const value = process.env[name];
    if (value === undefined) return defaultValue;

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getMailFrom() {
    const email =
        process.env.MAIL_FROM_EMAIL ??
        process.env.SMTP_FROM ??
        process.env.SMTP_USER ??
        "";
    const name =
        process.env.MAIL_FROM_NAME ??
        process.env.NEXT_PUBLIC_APP_NAME ??
        process.env.APP_NAME ??
        "Seva First Innovation Challenge";

    return email ? `"${name}" <${email}>` : "";
}

function getPortalUrl() {
    // Read portal URL from environment - must be configured in .env
    const portalUrl =
        process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL;

    if (!portalUrl) {
        throw new Error(
            "Portal URL must be configured. Set either APP_URL or NEXT_PUBLIC_APP_URL in .env file"
        );
    }

    return portalUrl.replace(/\/$/, "");
}

function emailVerificationTokenTtlMinutes() {
    return String(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? 10);
}

function templateMessage(message: string, values: Record<string, string>) {
    return Object.entries(values).reduce(
        (current, [key, value]) => current.replaceAll(`{${key}}`, value),
        message,
    );
}

function getTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD;
    const from = getMailFrom();

    if (!host || !user || !pass || !from) return null;

    return nodemailer.createTransport({
        auth: {
            pass,
            user,
        },
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: envFlag("SMTP_SECURE", false),
    });
}

async function sendEmail(input: SendEmailInput) {
    const transporter = getTransporter();

    if (!transporter) {
        return {
            delivered: false,
            reason: "SMTP is not configured.",
        };
    }

    await transporter.sendMail({
        from: getMailFrom(),
        html: input.html,
        subject: input.subject,
        text: input.text,
        to: input.to,
    });

    return { delivered: true };
}

async function sendParticipantVerificationEmail(input: {
    code: string;
    language: string;
    participantEmail: string;
    participantName: string;
}) {
    const emailText = getApiContent(input.language).emails.verification;
    const ttlMinutes = emailVerificationTokenTtlMinutes();
    const html = renderVerificationEmail({
        code: input.code,
        language: input.language,
        participantName: input.participantName,
        text: {
            ...emailText,
            verifyInstruction: templateMessage(emailText.verifyInstruction, {
                minutes: ttlMinutes,
            }),
            verifyTextInstruction: templateMessage(
                emailText.verifyTextInstruction,
                { minutes: ttlMinutes },
            ),
        },
    });

    return sendEmail({
        html,
        subject: emailText.subject,
        text: [
            emailText.greeting(input.participantName),
            "",
            emailText.intro,
            templateMessage(emailText.verifyTextInstruction, {
                minutes: ttlMinutes,
            }),
            input.code,
        ].join("\n"),
        to: input.participantEmail,
    });
}

async function sendParticipantLoginVerificationEmail(input: {
    code: string;
    language: string;
    participantEmail: string;
    participantName: string;
}) {
    const emailText = getApiContent(input.language).emails.participantLoginVerification;
    const ttlMinutes = emailVerificationTokenTtlMinutes();
    const html = renderVerificationEmail({
        code: input.code,
        language: input.language,
        participantName: input.participantName,
        text: {
            ...emailText,
            verifyInstruction: templateMessage(emailText.verifyInstruction, {
                minutes: ttlMinutes,
            }),
            verifyTextInstruction: templateMessage(
                emailText.verifyTextInstruction,
                { minutes: ttlMinutes },
            ),
        },
    });

    return sendEmail({
        html,
        subject: emailText.subject,
        text: [
            emailText.greeting(input.participantName),
            "",
            emailText.intro,
            templateMessage(emailText.verifyTextInstruction, {
                minutes: ttlMinutes,
            }),
            input.code,
        ].join("\n"),
        to: input.participantEmail,
    });
}

async function sendApplicationSubmittedEmail(input: {
    applicationNumber: string;
    details: Array<{ label: string; value?: string }>;
    language?: string;
    participantEmail: string;
    participantName: string;
}) {
    const emailText = getApiContent(input.language).emails.applicationSubmitted;
    const html = renderApplicationSubmittedEmail({
        applicationNumber: input.applicationNumber,
        details: input.details,
        participantName: input.participantName,
        text: emailText,
    });
    const detailLines = input.details
        .filter((detail) => detail.value?.trim())
        .map((detail) => `${detail.label}: ${detail.value}`);

    return sendEmail({
        html,
        subject: emailText.subject(input.applicationNumber),
        text: [
            emailText.greeting(input.participantName),
            "",
            emailText.intro,
            `${emailText.applicationNumberLabel}: ${input.applicationNumber}`,
            "",
            `${emailText.detailsTitle}:`,
            ...detailLines,
        ].join("\n"),
        to: input.participantEmail,
    });
}

async function sendTeamMemberAddedEmail(input: {
    applicationNumber: string;
    language?: string;
    participantEmail: string;
    participantName: string;
    teamLeadName: string;
}) {
    const emailText = getApiContent(input.language).emails.teamMemberAdded;
    const portalUrl = getPortalUrl();
    const html = renderTeamMemberAddedEmail({
        applicationNumber: input.applicationNumber,
        participantName: input.participantName,
        portalUrl,
        teamLeadName: input.teamLeadName,
        text: emailText,
    });

    return sendEmail({
        html,
        subject: emailText.subject(input.applicationNumber),
        text: [
            emailText.greeting(input.participantName),
            "",
            emailText.intro(input.teamLeadName, input.applicationNumber),
            `${emailText.applicationNumberLabel}: ${input.applicationNumber}`,
            `${emailText.portalUrlLabel}: ${portalUrl}`,
        ].join("\n"),
        to: input.participantEmail,
    });
}

export const emailService = {
    sendApplicationSubmittedEmail,
    sendEmail,
    sendParticipantLoginVerificationEmail,
    sendParticipantVerificationEmail,
    sendTeamMemberAddedEmail,
};
