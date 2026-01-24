import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM_EMAIL = process.env.FROM_EMAIL || "Vello <onboarding@resend.dev>";

interface SendInviteEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteToken: string;
}

export async function sendInviteEmail({
  to,
  inviterName,
  organizationName,
  role,
  inviteToken,
}: SendInviteEmailParams) {
  const inviteUrl = `${APP_URL}/invite/${inviteToken}`;
  const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to join ${organizationName} on Vello`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to Vello</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">Vello</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">You've been invited!</h2>

                      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                        <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${roleDisplay}</strong>.
                      </p>

                      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                        Vello helps teams create and manage payslip templates with an easy-to-use visual builder.
                      </p>

                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="padding: 8px 0 24px;">
                            <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 8px;">
                              Accept Invitation
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0 0 8px; font-size: 13px; color: #71717a;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #71717a; word-break: break-all;">
                        <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-align: center;">
                        This invitation will expire in 7 days.
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                        If you didn't expect this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
You've been invited to join ${organizationName} on Vello!

${inviterName} has invited you to join ${organizationName} as a ${roleDisplay}.

Accept your invitation here: ${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
    `.trim(),
  });

  if (error) {
    console.error("Failed to send invite email:", error);
    throw new Error(`Failed to send invite email: ${error.message}`);
  }

  return data;
}
