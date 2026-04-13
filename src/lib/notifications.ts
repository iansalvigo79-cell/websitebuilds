const RESEND_API_URL = 'https://api.resend.com/emails';
const ADMIN_EMAIL = process.env.NOTIFICATION_ADMIN_EMAIL || 'ian@revnuu.io';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.goalactico.net';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || `Goalactico <noreply@goalactico.net>`;

  if (!apiKey || !fromEmail) {
    throw new Error('Email service not configured: RESEND_API_KEY or RESEND_FROM_EMAIL is missing');
  }

  const recipients = Array.isArray(to) ? to : [to];

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Email send failed: ${response.status} ${response.statusText} ${payload}`);
  }
}

export async function sendAdminNotification(subject: string, text: string, html?: string) {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject,
    text,
    html: html ?? text.replace(/\n/g, '<br />'),
  });
}

export function buildWelcomeEmail(displayName: string) {
  const safeName = displayName || 'there';
  const dashboardUrl = `${APP_URL}/dashboard`;
  const upgradeUrl = `${APP_URL}/subscription`;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1220; padding: 32px; color: #e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid rgba(34,197,94,0.35);">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #0b1220;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Goalactico</h1>
            <p style="margin: 6px 0 0; font-size: 14px; font-weight: 600;">Welcome to the prediction game</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <h2 style="margin: 0 0 12px; font-size: 20px; color: #f8fafc;">Welcome, ${safeName}!</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; color: #f8fafc;">
              You're in. Predict combined totals, earn points, and climb the leaderboard each matchday.
            </p>
            <p style="margin: 0 0 12px; line-height: 1.6; color: #f8fafc;">
              Your free account gives you FT Goals predictions and access to core matchday action.
            </p>
            <div style="margin: 24px 0;">
              <a href="${dashboardUrl}" style="background: #22c55e; color: #0b1220; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 800; display: inline-block;">
                Start Predicting
              </a>
            </div>
            <p style="margin: 0 0 8px; line-height: 1.6; color: #f8fafc;">
              Want full access to HT Goals, Corners, and all leaderboards? Upgrade for just GBP 5/month.
            </p>
            <a href="${upgradeUrl}" style="color: #4ade80; font-weight: 700; text-decoration: none;">
              Upgrade to Pro ->
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 18px 28px; background: #0f172a; color: #94a3b8; font-size: 12px;">
            You're receiving this email because you registered for Goalactico.
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = [
    `Welcome, ${safeName}!`,
    '',
    "You're in. Predict combined totals, earn points, and climb the leaderboard each matchday.",
    'Your free account gives you FT Goals predictions and access to core matchday action.',
    '',
    `Start predicting: ${dashboardUrl}`,
    '',
    'Upgrade for just GBP 5/month to unlock HT Goals, Corners, and all leaderboards:',
    upgradeUrl,
  ].join('\n');
  return { subject: 'Welcome to Goalactico — Let\'s Predict Some Football', html, text };
}

export function buildCancellationEmail(displayName: string) {
  const safeName = displayName || 'Player';
  const dashboardUrl = `${APP_URL}/dashboard`;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1220; padding: 32px; color: #e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid rgba(248,113,113,0.25);">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #ef4444, #f97316); color: #0b1220;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Goalactico</h1>
            <p style="margin: 6px 0 0; font-size: 14px; font-weight: 600;">Subscription Cancelled</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <h2 style="margin: 0 0 12px; font-size: 20px; color: #f8fafc;">Hi ${safeName},</h2>
            <p style="margin: 0 0 12px; line-height: 1.6;">
              We have confirmed your subscription cancellation. Your account has been downgraded to free access, and you can still predict FT Goals for upcoming matchdays.
            </p>
            <p style="margin: 0 0 12px; line-height: 1.6;">
              If you want to return to paid access, visit your dashboard anytime.
            </p>
            <div style="margin: 24px 0;">
              <a href="${dashboardUrl}" style="background: #f97316; color: #0b1220; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 800; display: inline-block;">
                View Dashboard
              </a>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = [
    `Hi ${safeName},`,
    '',
    'We\ `ve confirmed your subscription cancellation. Your account has been downgraded to free access, and you can still predict FT Goals for upcoming matchdays.',
    '',
    `View your dashboard: ${dashboardUrl}`,
  ].join('\n');
  return { subject: 'Goalactico subscription cancelled', html, text };
}

export function buildMatchdayResultsEmail(matchDayTitles: string[]) {
  const title = matchDayTitles.length === 1 ? matchDayTitles[0] : `${matchDayTitles.length} matchdays`;
  const subject = 'Results are in — your Goalactico scores have been calculated';
  const body = matchDayTitles.length === 1
    ? `Your predictions for ${title} have been scored. Check your dashboard to see your performance and leaderboard position.`
    : `Your predictions for ${matchDayTitles.length} matchdays have been scored. Check your dashboard to see your performance and leaderboard position.`;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1220; padding: 32px; color: #e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid rgba(34,197,94,0.35);">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #0b1220;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Goalactico</h1>
            <p style="margin: 6px 0 0; font-size: 14px; font-weight: 600;">Your matchday results are ready</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <h2 style="margin: 0 0 12px; font-size: 20px; color: #f8fafc;">Results are in</h2>
            <p style="margin: 0 0 12px; line-height: 1.6; color: #f8fafc;">
              ${body}
            </p>
            <div style="margin: 24px 0;">
              <a href="${APP_URL}/dashboard" style="background: #22c55e; color: #0b1220; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 800; display: inline-block;">
                View your score
              </a>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = [
    'Results are in.',
    '',
    body,
    '',
    `View your score: ${APP_URL}/dashboard`,
  ].join('\n');
  return { subject, html, text };
}

export function buildAdminPaidSignupEmail(displayName: string | null, userId: string, email: string | null) {
  const name = displayName || 'Unknown player';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1220; padding: 32px; color: #e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid rgba(34,197,94,0.35);">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #0b1220;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Paid signup alert</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <p style="margin: 0 0 12px; line-height: 1.6; color: #f8fafc;">A paid player has completed signup.</p>
            <p style="margin: 0 0 8px;">Name: <strong>${name}</strong></p>
            <p style="margin: 0 0 8px;">User ID: <strong>${userId}</strong></p>
            ${email ? `<p style="margin: 0 0 8px;">Email: <strong>${email}</strong></p>` : ''}
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = [`Paid player signup`, `Name: ${name}`, `User ID: ${userId}`, `Email: ${email || 'unknown'}`].join('\n');
  return { subject: 'Paid player signup', html, text };
}

export function buildAdmin40PointEmail(achievers: Array<{ userId: string; displayName: string | null; matchDayTitle: string }>) {
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1220; padding: 32px; color: #e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid rgba(34,197,94,0.35);">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #0b1220;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Goalactico: 40-point matchday alert</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <p style="margin: 0 0 12px; line-height: 1.6; color: #f8fafc;">A player has scored 40 points in a matchday.</p>
            ${achievers.map((item) => `<p style="margin: 0 0 8px;">${item.displayName || item.userId} — ${item.matchDayTitle}</p>`).join('')}
          </td>
        </tr>
      </table>
    </div>
  `;
  const textLines = ['A player scored 40 points in a matchday.', ...achievers.map((item) => `${item.displayName || item.userId} — ${item.matchDayTitle}`)];
  return { subject: 'Goalactico: player scored 40 points', html, text: textLines.join('\n') };
}

export function buildAdminSignupSummaryEmail(freeProfiles: Array<{ display_name: string | null; email: string | null; created_at: string }>, sinceDays: number) {
  const subject = `Weekly free signup summary (${freeProfiles.length} new free players)`;
  const rows = freeProfiles.map((profile) => {
    const name = profile.display_name || 'Player';
    return `${name} <${profile.email || 'no email'}> — ${profile.created_at}`;
  });
  const text = [
    `Free player signups in the last ${sinceDays} days: ${freeProfiles.length}`,
    '',
    ...rows,
    '',
    `View the admin dashboard: ${APP_URL}/admin`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b1220; padding: 32px; color: #e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid rgba(34,197,94,0.35);">
        <tr>
          <td style="padding: 24px 28px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #0b1220;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Weekly free player signup summary</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px;">
            <p style="margin: 0 0 12px; line-height: 1.6; color: #f8fafc;">${freeProfiles.length} new free players signed up in the last ${sinceDays} days.</p>
            ${rows.map((row) => `<p style="margin: 0 0 8px;">${row}</p>`).join('')}
            <p style="margin: 16px 0 0;">View the admin dashboard: <a href="${APP_URL}/admin" style="color: #4ade80;">${APP_URL}/admin</a></p>
          </td>
        </tr>
      </table>
    </div>
  `;
  return { subject, html, text };
}
