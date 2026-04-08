import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, buildWelcomeEmail } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

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
  const email = payload.email?.trim();

  console.log('Received welcome email request for userId:', userId, 'email:', email);

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

  const { html, text, subject } = buildWelcomeEmail(displayName);

  try {
    await sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      skipped: true,
      reason: (err as Error)?.message || 'Failed to send email',
    });
  }

  return NextResponse.json({ success: true });
}
