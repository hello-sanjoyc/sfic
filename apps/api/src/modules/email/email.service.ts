import nodemailer from "nodemailer";
import { getApiContent } from "../../content/index.js";
import {
    renderApplicationSubmittedEmail,
    renderEmailTemplate,
    renderTeamMemberAddedEmail,
    renderVerificationEmail,
} from "./email-template.js";

type SendEmailInput = {
    fromName?: string;
    html: string;
    replyTo?: string;
    subject: string;
    text: string;
    to: string;
};

function envFlag(name: string, defaultValue = false) {
    const value = process.env[name];
    if (value === undefined) return defaultValue;

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getMailFrom(fromName?: string) {
    const email =
        process.env.MAIL_FROM_EMAIL ??
        process.env.SMTP_FROM ??
        process.env.SMTP_USER ??
        "";
    const name =
        fromName ??
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

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
        from: getMailFrom(input.fromName),
        html: input.html,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.text,
        to: input.to,
    });

    return { delivered: true };
}

async function sendParticipantVerificationEmail(input: {
    code?: string;
    language: string;
    participantEmail: string;
    participantName: string;
    verificationUrl?: string;
}) {
    const emailText = getApiContent(input.language).emails.verification;
    const ttlMinutes = emailVerificationTokenTtlMinutes();
    const isLinkVerification = Boolean(input.verificationUrl);
    const html = renderVerificationEmail({
        code: input.code,
        ctaLabel: "Verify email address",
        language: input.language,
        linkHelpText:
            "If the button does not work, copy and paste this verification link into your browser:",
        participantName: input.participantName,
        text: {
            ...emailText,
            verifyInstruction: isLinkVerification
                ? "Click the button below to verify your email address. This verification link does not expire."
                : templateMessage(emailText.verifyInstruction, {
                      minutes: ttlMinutes,
                  }),
            verifyTextInstruction: templateMessage(
                emailText.verifyTextInstruction,
                { minutes: ttlMinutes },
            ),
        },
        verificationUrl: input.verificationUrl,
    });

    return sendEmail({
        html,
        subject: emailText.subject,
        text: isLinkVerification
            ? [
                  emailText.greeting(input.participantName),
                  "",
                  emailText.intro,
                  "Click this link to verify your email address. This verification link does not expire:",
                  input.verificationUrl,
              ].join("\n")
            : [
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

async function sendParticipantPasswordResetEmail(input: {
    language: string;
    participantEmail: string;
    participantName: string;
    resetUrl: string;
    ttlMinutes: number;
}) {
    const participantName = escapeHtml(input.participantName);

    const html = renderEmailTemplate({
        bodyHtml: `
      <p style="margin:0 0 16px;">Dear ${participantName},</p>
      <p style="margin:0 0 16px;">A password reset was requested for your Seva First Innovation Challenge participant account.</p>
      <p style="margin:0 0 12px;">Click the button below to set a new password. This link will expire in ${input.ttlMinutes} minutes.</p>
    `,
        cta: {
            label: "Reset password",
            url: input.resetUrl,
        },
        footerText:
            "This email was sent by Seva First Innovation Challenge. If you did not request this password reset, you can safely ignore it.",
        htmlLang: input.language,
        linkHelpText:
            "If the button does not work, copy and paste this password reset link into your browser:",
        preheader: "Reset your participant account password.",
        title: "Reset participant password",
    });

    return sendEmail({
        html,
        subject:
            "Reset your Seva First Innovation Challenge participant password",
        text: [
            `Dear ${input.participantName},`,
            "",
            "A password reset was requested for your Seva First Innovation Challenge participant account.",
            `Set a new password within ${input.ttlMinutes} minutes using this link:`,
            input.resetUrl,
            "",
            "If you did not request this password reset, you can safely ignore this email.",
        ].join("\n"),
        to: input.participantEmail,
    });
}

async function sendAdminLoginVerificationEmail(input: {
    adminEmail: string;
    adminName: string;
    code: string;
    language: string;
}) {
    const emailText = getApiContent("en").emails.adminLoginVerification;
    const ttlMinutes = emailVerificationTokenTtlMinutes();
    const html = renderVerificationEmail({
        code: input.code,
        language: "en",
        participantName: input.adminName,
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
            emailText.greeting(input.adminName),
            "",
            emailText.intro,
            templateMessage(emailText.verifyTextInstruction, {
                minutes: ttlMinutes,
            }),
            input.code,
        ].join("\n"),
        to: input.adminEmail,
    });
}

async function sendJuryLoginVerificationEmail(input: {
    code: string;
    juryEmail: string;
    juryName: string;
    language: string;
}) {
    const ttlMinutes = emailVerificationTokenTtlMinutes();
    const text = {
        footer: "This email was sent by Seva First Innovation Challenge. If you did not request this jury login code, you can safely ignore it.",
        greeting: (name: string) => `Dear ${name},`,
        intro: "A login request was made for your Seva First Innovation Challenge jury workspace.",
        preheader: "Use this code to login to your jury workspace.",
        title: "Jury login verification",
        verificationCodeLabel: "Verification Code",
        verifyInstruction: `Please enter this 6-digit code within ${ttlMinutes} minutes to continue to your workspace.`,
        verifyTextInstruction: `Enter this 6-digit verification code within ${ttlMinutes} minutes:`,
    };
    const html = renderVerificationEmail({
        code: input.code,
        language: input.language === "bn" || input.language === "hi" ? input.language : "en",
        participantName: input.juryName,
        text,
    });

    return sendEmail({
        html,
        subject: "Your Seva First Innovation Challenge jury login code",
        text: [text.greeting(input.juryName), "", text.intro, text.verifyTextInstruction, input.code].join("\n"),
        to: input.juryEmail,
    });
}

async function sendJuryInvitationAcceptedEmail(input: {
    juryEmail: string;
    juryName: string;
    loginUrl: string;
}) {
    const name = escapeHtml(input.juryName);
    const html = renderEmailTemplate({
        bodyHtml: `<p>Dear ${name},</p><p>Thank you for accepting the invitation to join the Seva First Innovation Challenge jury panel. Your email address has been verified.</p><p>Please complete your jury profile and then sign in with your email address and the one-time code we send you.</p>`,
        cta: { label: "Go to jury login", url: input.loginUrl },
        footerText: "This email was sent by Seva First Innovation Challenge.",
        preheader: "Your jury invitation has been accepted.",
        title: "Jury invitation accepted",
    });

    return sendEmail({
        html,
        subject: "Your SFIC jury invitation has been accepted",
        text: [
            `Dear ${input.juryName},`,
            "",
            "Thank you for accepting the invitation to join the Seva First Innovation Challenge jury panel. Your email address has been verified.",
            "Please complete your jury profile and then sign in with your email address and the one-time code we send you.",
            input.loginUrl,
        ].join("\n"),
        to: input.juryEmail,
    });
}

async function sendJuryInvitationAcceptedAdminEmail(input: {
    adminEmail: string;
    adminName: string;
    juryEmail: string;
    juryName: string;
}) {
    const adminName = escapeHtml(input.adminName);
    const juryName = escapeHtml(input.juryName);
    const juryEmail = escapeHtml(input.juryEmail);
    const html = renderEmailTemplate({
        bodyHtml: `<p>Dear ${adminName},</p><p><strong>${juryName}</strong> (${juryEmail}) has accepted your jury invitation and verified their email address.</p>`,
        footerText: "This email was sent by Seva First Innovation Challenge.",
        preheader: `${input.juryName} accepted the jury invitation.`,
        title: "Jury invitation accepted",
    });

    return sendEmail({
        html,
        subject: `${input.juryName} accepted the SFIC jury invitation`,
        text: [
            `Dear ${input.adminName},`,
            "",
            `${input.juryName} (${input.juryEmail}) has accepted your jury invitation and verified their email address.`,
        ].join("\n"),
        to: input.adminEmail,
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

async function sendAdminNotificationEmail(input: {
    body: string;
    recipientEmail: string;
    replyToEmail: string;
    senderName: string;
    subject: string;
}) {
    const html = renderEmailTemplate({
        bodyHtml: input.body,
        footerText:
            "This email was sent by Seva First Innovation Challenge.",
        preheader: input.subject,
        title: input.subject,
    });

    const text = input.body.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").trim();

    return sendEmail({
        fromName: input.senderName,
        html,
        replyTo: input.replyToEmail,
        subject: input.subject,
        text,
        to: input.recipientEmail,
    });
}

export const emailService = {
    sendAdminLoginVerificationEmail,
    sendAdminNotificationEmail,
    sendApplicationSubmittedEmail,
    sendEmail,
    sendJuryInvitationAcceptedAdminEmail,
    sendJuryInvitationAcceptedEmail,
    sendJuryLoginVerificationEmail,
    sendParticipantLoginVerificationEmail,
    sendParticipantPasswordResetEmail,
    sendParticipantVerificationEmail,
    sendTeamMemberAddedEmail,
};
