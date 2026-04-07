import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAdminNotification, buildAdminSignupSummaryEmail } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SERVICE_ROLE_ERROR =
  'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Project Settings → API → service_role secret). Restart the dev server after saving.';

export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const headerSecret = request.headers.get('x-admin-secret');
    if (headerSecret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient: createAuthClient } = await import('@supabase/supabase-js');
    const authClient = createAuthClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: SERVICE_ROLE_ERROR }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: { sinceDays?: number } = {};
  try {
    body = await request.json();
  } catch {
    // no body required
  }

  const sinceDays = typeof body.sinceDays === 'number' && body.sinceDays > 0 ? body.sinceDays : 7;
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: signups, error } = await supabase
    .from('profiles')
    .select('display_name, email, created_at')
    .eq('account_type', 'free')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { subject, html, text } = buildAdminSignupSummaryEmail(signups || [], sinceDays);
  try {
    await sendAdminNotification(subject, text, html);
  } catch (err) {
    console.warn('⚠️ Free signup summary email failed:', err);
  }

  return NextResponse.json({ ok: true, signups: signups?.length ?? 0 });
}
