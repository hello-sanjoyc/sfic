import nodemailer from "nodemailer";
import { renderVerificationEmail } from "./email-template.js";

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
    "Sewa First Innovation Challenge";

  return email ? `"${name}" <${email}>` : "";
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
  participantEmail: string;
  participantName: string;
  verificationUrl: string;
}) {
  const html = renderVerificationEmail({
    participantName: input.participantName,
    verificationUrl: input.verificationUrl,
  });

  return sendEmail({
    html,
    subject: "Verify your Sewa First Innovation Challenge email address",
    text: [
      `Dear ${input.participantName},`,
      "",
      "Thank you for starting your registration for the Sewa First Innovation Challenge.",
      "Verify your email address to continue to Step 2:",
      input.verificationUrl,
    ].join("\n"),
    to: input.participantEmail,
  });
}

export const emailService = {
  sendEmail,
  sendParticipantVerificationEmail,
};
