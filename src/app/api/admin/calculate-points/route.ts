import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePoints } from '@/lib/pointsCalculator';

/**
 * POST /api/admin/calculate-points
 * Body: { matchDayId?: string } - optional; if omitted, runs for all match days that have scores set.
 * Header: x-admin-secret - optional; set to ADMIN_SECRET env to protect the endpoint.
 *
 * For each match day with scores set:
 * 1. Load all predictions for that match day.
 * 2. Compute points for each game type where actual scores exist.
 * 3. Update the predictions table with points per game type.
 */
const SERVICE_ROLE_ERROR =
  'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard  †’ Project Settings  †’ API  †’ service_role secret). Restart the dev server after saving.';

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
    let matchDays: { id: string; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null }[];

    if (body.matchDayId) {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, actual_total_goals, ht_goals, total_corners, ht_corners')
        .eq('id', body.matchDayId)
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      matchDays = (data || []) as { id: string; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null }[];
    } else {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, actual_total_goals, ht_goals, total_corners, ht_corners')
        .or('actual_total_goals.not.is.null,ht_goals.not.is.null,total_corners.not.is.null,ht_corners.not.is.null');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      matchDays = (data || []) as { id: string; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null }[];
    }

    let totalUpdated = 0;

    for (const md of matchDays) {
      const actual = md.actual_total_goals;
      const htGoals = md.ht_goals;
      const totalCorners = md.total_corners;
      const htCorners = md.ht_corners;

      const { data: predictions, error: fetchErr } = await supabase
        .from('predictions')
        .select('id, predicted_total_goals, predicted_half_time_goals, predicted_ft_corners, predicted_ht_corners')
        .eq('match_day_id', md.id);

      if (fetchErr) {
        console.error('fetch predictions error', md.id, fetchErr);
        continue;
      }

      for (const p of predictions || []) {
        const update: Record<string, number | null> = {};
        if (actual != null) {
          update.points = p.predicted_total_goals != null ? calculatePoints(p.predicted_total_goals, actual) : null;
        }
        if (htGoals != null) {
          update.ht_goals_points = p.predicted_half_time_goals != null ? calculatePoints(p.predicted_half_time_goals, htGoals) : null;
        }
        if (totalCorners != null) {
          update.corners_points = p.predicted_ft_corners != null ? calculatePoints(p.predicted_ft_corners, totalCorners) : null;
        }
        if (htCorners != null) {
          update.ht_corners_points = p.predicted_ht_corners != null ? calculatePoints(p.predicted_ht_corners, htCorners) : null;
        }
        if (Object.keys(update).length === 0) continue;
        const { error: updateErr } = await supabase
          .from('predictions')
          .update(update)
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

