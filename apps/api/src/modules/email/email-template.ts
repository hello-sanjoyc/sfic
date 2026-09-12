export type EmailTemplateCta = {
  label: string;
  url: string;
};

export type EmailTemplateInput = {
  bodyHtml: string;
  cta?: EmailTemplateCta;
  preheader: string;
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
<html lang="en">
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
                    ? `<p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">If the button does not work, copy and paste this link into your browser:<br><a href="${escapeHtml(cta.url)}" style="color:#000080;word-break:break-all;">${escapeHtml(cta.url)}</a></p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5edf6;padding:20px 30px;color:#64748b;font-size:12px;line-height:1.6;">
                This email was sent by ${escapedAppName}. If you did not request this, you can safely ignore it.
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
  participantName: string;
  verificationUrl: string;
}) {
  const participantName = escapeHtml(input.participantName);

  return renderEmailTemplate({
    bodyHtml: `
      <p style="margin:0 0 16px;">Dear ${participantName},</p>
      <p style="margin:0 0 16px;">Thank you for starting your registration for the Sewa First Innovation Challenge.</p>
      <p style="margin:0;">Please verify your email address to continue to Step 2 and complete your participant profile.</p>
    `,
    cta: {
      label: "Verify email address",
      url: input.verificationUrl,
    },
    preheader:
      "Verify your email address to continue your Sewa First Innovation Challenge registration.",
    title: "Verify your email address",
  });
}
