import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SERVICE_ROLE_ERROR =
  'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Project Settings → API → service_role secret). Restart the dev server after saving.';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: SERVICE_ROLE_ERROR }, { status: 500 });
  }

  let body: { matchDayId?: string; actualTotalGoals?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { matchDayId, actualTotalGoals } = body;
  if (!matchDayId || typeof actualTotalGoals !== 'number' || actualTotalGoals < 0) {
    return NextResponse.json({ error: 'matchDayId and non-negative actualTotalGoals required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase
    .from('match_days')
    .update({ actual_total_goals: actualTotalGoals })
    .eq('id', matchDayId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
