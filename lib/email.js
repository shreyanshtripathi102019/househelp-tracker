import nodemailer from "nodemailer";

/**
 * Creates a Nodemailer transporter using Google Workspace SMTP.
 *
 * Required environment variables:
 *   SMTP_USER     – your Google Workspace address, e.g. support@arit.co.in
 *   SMTP_PASSWORD – the App Password generated in your Google account
 *                   (Google Account → Security → 2-Step Verification → App passwords)
 */
function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Missing SMTP_USER or SMTP_PASSWORD environment variables."
    );
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: { user, pass },
  });
}

/**
 * Sends a magic-link sign-in email to an owner.
 *
 * @param {string} to         – recipient address
 * @param {string} magicLink  – the full Supabase OTP URL
 */
export async function sendMagicLinkEmail(to, magicLink) {
  const transporter = createTransporter();
  const from = `"Maid Portal" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Your sign-in link for Maid Portal",
    text: `Click the link below to sign in to Maid Portal. This link expires in 1 hour.\n\n${magicLink}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;padding:40px;max-width:480px;">
        <tr>
          <td style="padding-bottom:8px;">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.08em;
                       text-transform:uppercase;color:#6b7280;">Maid Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:12px;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">
              Sign in to your account
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;">
            <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">
              Click the button below to sign in. This link is valid for
              <strong>1 hour</strong> and can only be used once.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;">
            <a href="${magicLink}"
               style="display:inline-block;background:#1a2e1a;color:#fff;
                      text-decoration:none;font-weight:600;font-size:15px;
                      padding:14px 28px;border-radius:8px;">
              Sign in to Maid Portal
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
              If the button doesn&apos;t work, copy and paste this URL into your browser:<br />
              <span style="color:#6b7280;word-break:break-all;">${magicLink}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;border-top:1px solid #f3f4f6;margin-top:24px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              If you didn&apos;t request this email, you can safely ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

/**
 * Sends an email-verification email to a newly registered owner.
 *
 * @param {string} to           – recipient address
 * @param {string} confirmUrl   – the /auth/confirm URL with token_hash
 */
export async function sendVerificationEmail(to, confirmUrl) {
  const transporter = createTransporter();
  const from = `"Maid Portal" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Maid Portal account",
    text: `Click the link below to verify your email and activate your account.\n\n${confirmUrl}\n\nThis link expires in 24 hours. If you did not sign up, you can ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;padding:40px;max-width:480px;">
        <tr>
          <td style="padding-bottom:8px;">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.08em;
                       text-transform:uppercase;color:#6b7280;">Maid Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:12px;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">
              Verify your email
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;">
            <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">
              Click the button below to verify your email address and activate
              your account. This link is valid for <strong>24 hours</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;">
            <a href="${confirmUrl}"
               style="display:inline-block;background:#1a2e1a;color:#fff;
                      text-decoration:none;font-weight:600;font-size:15px;
                      padding:14px 28px;border-radius:8px;">
              Verify my email
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
              If the button doesn&apos;t work, copy and paste this URL into your browser:<br />
              <span style="color:#6b7280;word-break:break-all;">${confirmUrl}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:24px;border-top:1px solid #f3f4f6;margin-top:24px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              If you didn&apos;t create a Maid Portal account, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
