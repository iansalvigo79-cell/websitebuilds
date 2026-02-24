import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePoints } from '@/lib/pointsCalculator';

/**
 * POST /api/admin/calculate-points
 * Body: { matchDayId?: string } — optional; if omitted, runs for all match days that have actual_total_goals set.
 * Header: x-admin-secret — optional; set to ADMIN_SECRET env to protect the endpoint.
 *
 * For each match day with actual_total_goals set:
 * 1. Load all predictions for that match day.
 * 2. Compute points from predicted_total_goals vs actual_total_goals (exact=10, ±1=7, ±2=4, ±3=2, else=0).
 * 3. Update the predictions table: set the "points" column to the calculated value for each row.
 */
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
    const { createClient } = await import('@supabase/supabase-js');
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: SERVICE_ROLE_ERROR },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: { matchDayId?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is ok
  }

  try {
    let matchDays: { id: string; actual_total_goals: number }[];

    if (body.matchDayId) {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, actual_total_goals')
        .eq('id', body.matchDayId)
        .not('actual_total_goals', 'is', null)
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      matchDays = (data || []) as { id: string; actual_total_goals: number }[];
    } else {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, actual_total_goals')
        .not('actual_total_goals', 'is', null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      matchDays = (data || []) as { id: string; actual_total_goals: number }[];
    }

    let totalUpdated = 0;

    for (const md of matchDays) {
      const actual = md.actual_total_goals;

      const { data: predictions, error: fetchErr } = await supabase
        .from('predictions')
        .select('id, predicted_total_goals')
        .eq('match_day_id', md.id);

      if (fetchErr) {
        console.error('fetch predictions error', md.id, fetchErr);
        continue;
      }

      for (const p of predictions || []) {
        const points = calculatePoints(p.predicted_total_goals, actual);
        const { error: updateErr } = await supabase
          .from('predictions')
          .update({ points })
          .eq('id', p.id);
        if (!updateErr) totalUpdated += 1;
        else console.error('Failed to update prediction', p.id, updateErr);
      }
    }

    return NextResponse.json({
      ok: true,
      matchDaysProcessed: matchDays.length,
      predictionsUpdated: totalUpdated,
    });
  } catch (err) {
    console.error('calculate-points error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
