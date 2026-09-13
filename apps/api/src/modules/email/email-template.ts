export type EmailTemplateCta = {
    label: string;
    url: string;
};

export type EmailTemplateInput = {
    bodyHtml: string;
    cta?: EmailTemplateCta;
    footerText?: string;
    htmlLang?: string;
    linkHelpText?: string;
    preheader: string;
    title: string;
};

export type VerificationEmailText = {
    footer: string;
    greeting: (participantName: string) => string;
    intro: string;
    preheader: string;
    title: string;
    verificationCodeLabel: string;
    verifyInstruction: string;
    verifyTextInstruction: string;
};

export type ApplicationSubmittedEmailText = {
    applicationNumberLabel: string;
    detailsTitle: string;
    footer: string;
    greeting: (participantName: string) => string;
    intro: string;
    preheader: (applicationNumber: string) => string;
    title: string;
};

export type TeamMemberAddedEmailText = {
    applicationNumberLabel: string;
    footer: string;
    greeting: (participantName: string) => string;
    intro: (teamLeadName: string, applicationNumber: string) => string;
    portalUrlLabel: string;
    preheader: (applicationNumber: string) => string;
    title: string;
};

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function renderEmailTemplate({
    bodyHtml,
    cta,
    footerText,
    htmlLang = "en",
    linkHelpText,
    preheader,
    title,
}: EmailTemplateInput) {
    const appName =
        process.env.NEXT_PUBLIC_APP_NAME ??
        process.env.APP_NAME ??
        "Sewa First Innovation Challenge";
    const escapedAppName = escapeHtml(appName);
    const escapedTitle = escapeHtml(title);
    const escapedPreheader = escapeHtml(preheader);

    return `<!doctype html>
<html lang="${escapeHtml(htmlLang)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapedTitle}</title>
  </head>
  <body style="margin:0;background:#f4f7fb;color:#102033;font-family:Arial,Helvetica,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapedPreheader}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dde6f1;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0b1f3a;padding:26px 30px;">
                <p style="margin:0;color:#ffb15f;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${escapedAppName}</p>
                <h1 style="margin:10px 0 0;color:#ffffff;font-size:26px;line-height:1.25;font-weight:800;">${escapedTitle}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <div style="color:#31445a;font-size:16px;line-height:1.7;">
                  ${bodyHtml}
                </div>
                ${
                    cta
                        ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:8px;background:#138808;">
                      <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(cta.label)}</a>
                    </td>
                  </tr>
                </table>`
                        : ""
                }
                ${
                    cta
                        ? `<p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(linkHelpText ?? "If the button does not work, copy and paste this link into your browser:")}<br><a href="${escapeHtml(cta.url)}" style="color:#000080;word-break:break-all;">${escapeHtml(cta.url)}</a></p>`
                        : ""
                }
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5edf6;padding:20px 30px;color:#64748b;font-size:12px;line-height:1.6;">
                ${footerText ? escapeHtml(footerText) : `This email was sent by ${escapedAppName}. If you did not request this, you can safely ignore it.`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderVerificationEmail(input: {
    code: string;
    language: string;
    participantName: string;
    text: VerificationEmailText;
}) {
    const greeting = escapeHtml(input.text.greeting(input.participantName));
    const code = escapeHtml(input.code);

    return renderEmailTemplate({
        bodyHtml: `
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">${escapeHtml(input.text.intro)}</p>
      <p style="margin:0 0 12px;">${escapeHtml(input.text.verifyInstruction)}</p>
      <p style="margin:0 0 12px;color:#102033;font-size:15px;font-weight:700;">${escapeHtml(input.text.verificationCodeLabel)}</p>
      <p style="margin:0;padding:14px 16px;border-radius:8px;background:#f0f7f1;color:#0b5d12;font-family:Consolas,Monaco,monospace;font-size:28px;font-weight:800;letter-spacing:.14em;">${code}</p>
    `,
        footerText: input.text.footer,
        htmlLang: input.language,
        preheader: input.text.preheader,
        title: input.text.title,
    });
}

function renderDetailRows(details: Array<{ label: string; value?: string }>) {
    const rows = details
        .filter((detail) => detail.value?.trim())
        .map(
            (detail) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5edf6;color:#64748b;font-size:13px;font-weight:700;width:38%;">${escapeHtml(detail.label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5edf6;color:#102033;font-size:13px;">${escapeHtml(detail.value ?? "")}</td>
        </tr>
      `,
        )
        .join("");

    if (!rows) return "";

    return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #e5edf6;border-bottom:0;border-radius:8px;overflow:hidden;">
      ${rows}
    </table>
  `;
}

export function renderApplicationSubmittedEmail(input: {
    applicationNumber: string;
    details: Array<{ label: string; value?: string }>;
    participantName: string;
    text: ApplicationSubmittedEmailText;
}) {
    const greeting = escapeHtml(input.text.greeting(input.participantName));
    const applicationNumber = escapeHtml(input.applicationNumber);

    return renderEmailTemplate({
        bodyHtml: `
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">${escapeHtml(input.text.intro)}</p>
      <p style="margin:0 0 12px;color:#102033;font-size:15px;font-weight:700;">${escapeHtml(input.text.applicationNumberLabel)}</p>
      <p style="margin:0;padding:14px 16px;border-radius:8px;background:#f0f7f1;color:#0b5d12;font-family:Consolas,Monaco,monospace;font-size:22px;font-weight:800;letter-spacing:.04em;">${applicationNumber}</p>
      <p style="margin:22px 0 0;color:#102033;font-size:15px;font-weight:700;">${escapeHtml(input.text.detailsTitle)}</p>
      ${renderDetailRows(input.details)}
    `,
        footerText: input.text.footer,
        preheader: input.text.preheader(input.applicationNumber),
        title: input.text.title,
    });
}

export function renderTeamMemberAddedEmail(input: {
    applicationNumber: string;
    participantName: string;
    portalUrl: string;
    teamLeadName: string;
    text: TeamMemberAddedEmailText;
}) {
    const greeting = escapeHtml(input.text.greeting(input.participantName));
    const intro = escapeHtml(
        input.text.intro(input.teamLeadName, input.applicationNumber),
    );
    const applicationNumber = escapeHtml(input.applicationNumber);
    const portalUrl = escapeHtml(input.portalUrl);

    return renderEmailTemplate({
        bodyHtml: `
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">${intro}</p>
      <p style="margin:22px 0 12px;color:#102033;font-size:20px;line-height:1.35;font-weight:800;">${escapeHtml(input.text.applicationNumberLabel)}</p>
      <p style="margin:0;padding:18px 24px;border-radius:8px;background:#eef8f0;color:#0b5d12;font-family:Consolas,Monaco,monospace;font-size:30px;line-height:1.35;font-weight:800;letter-spacing:.04em;">${applicationNumber}</p>
      <p style="margin:22px 0 6px;color:#102033;font-size:15px;font-weight:700;">${escapeHtml(input.text.portalUrlLabel)}</p>
      <p style="margin:0;"><a href="${portalUrl}" style="color:#000080;word-break:break-all;">${portalUrl}</a></p>
    `,
        footerText: input.text.footer,
        preheader: input.text.preheader(input.applicationNumber),
        title: input.text.title,
    });
}
