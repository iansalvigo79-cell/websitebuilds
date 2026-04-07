import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUBJECT = "Welcome to Goalactico \u2014 Let's Predict Some Football";

const buildHtml = (displayName: string, baseUrl: string) => {
  const safeName = displayName || 'there';
  const dashboardUrl = `${baseUrl}/dashboard`;
  const upgradeUrl = `${baseUrl}/subscription`;
  return `
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
            <p style="margin: 0 0 12px; line-height: 1.6;">
              You're in. Predict combined totals, earn points, and climb the leaderboard each matchday.
            </p>
            <p style="margin: 0 0 12px; line-height: 1.6;">
              Your free account gives you FT Goals predictions and access to core matchday action.
            </p>
            <div style="margin: 24px 0;">
              <a href="${dashboardUrl}" style="background: #22c55e; color: #0b1220; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 800; display: inline-block;">
                Start Predicting
              </a>
            </div>
            <p style="margin: 0 0 8px; line-height: 1.6;">
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
};

const buildText = (displayName: string, baseUrl: string) => {
  const safeName = displayName || 'there';
  return [
    `Welcome, ${safeName}!`,
    '',
    "You're in. Predict combined totals, earn points, and climb the leaderboard each matchday.",
    'Your free account gives you FT Goals predictions and access to core matchday action.',
    '',
    `Start predicting: ${baseUrl}/dashboard`,
    '',
    'Upgrade for just GBP 5/month to unlock HT Goals, Corners, and all leaderboards:',
    `${baseUrl}/subscription`,
  ].join('\n');
};

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Goalactico <noreply@goalactico.net>';

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  if (!resendKey || !fromEmail) {
    return NextResponse.json({ success: false, skipped: true, reason: 'Email service not configured' });
  }

  let payload: { userId?: string; email?: string; displayName?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userId = payload.userId?.trim();
  const email = "chris.jhon12456@outlook.com";
  const displayName = payload.displayName?.trim() || 'there';
  if (!userId || !email) {
    return NextResponse.json({ error: 'Missing required fields: userId, email' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !userResult?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (userResult.user.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const createdAt = userResult.user.created_at ? new Date(userResult.user.created_at) : null;
  if (createdAt && Date.now() - createdAt.getTime() > 1000 * 60 * 30) {
    return NextResponse.json({ error: 'Welcome email window expired' }, { status: 400 });
  }

  const origin = request.headers.get('origin')
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://www.goalactico.net';

  const html = buildHtml(displayName, origin);
  const text = buildText(displayName, origin);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'chris.jhon12456@outlook.com',
        subject: SUBJECT,
        html: html,
        text: text,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: err?.message || 'Failed to send email',
      });
    }

  } catch (err) {
    return NextResponse.json({
      success: false,
      skipped: true,
      reason: (err as Error)?.message || 'Failed to send email',
    });
  }

  return NextResponse.json({ success: true });
}
