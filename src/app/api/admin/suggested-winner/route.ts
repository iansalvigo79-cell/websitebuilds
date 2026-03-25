import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type PeriodType = 'weekly' | 'monthly' | 'seasonal' | 'player';

/**
 * Parse period key into date range or season id for filtering.
 * - weekly: "2026-W08" -> ISO week Monâ€“Sun
 * - monthly: "2026-02" -> 1stâ€“last of month
 * - seasonal: UUID -> use season_id
 */
function getPeriodFilter(
  type: PeriodType,
  period: string
): { seasonId?: string; startDate?: string; endDate?: string } {
  if (type === 'seasonal') {
    return { seasonId: period };
  }
  if (type === 'monthly') {
    const match = period.match(/^(\d{4})-(\d{2})$/);
    if (!match) return {};
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }
  if (type === 'weekly') {
    const match = period.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return {};
    const year = parseInt(match[1], 10);
    const week = parseInt(match[2], 10);
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const firstMonday = new Date(year, 0, 1 + mondayOffset + (week - 1) * 7);
    const sunday = new Date(firstMonday);
    sunday.setDate(sunday.getDate() + 6);
    return {
      startDate: firstMonday.toISOString().slice(0, 10),
      endDate: sunday.toISOString().slice(0, 10),
    };
  }
  return {};
}

/**
 * GET /api/admin/suggested-winner?type=weekly|monthly|seasonal&period=...
 * GET /api/admin/suggested-winner?type=player&threshold=...
 * Returns top ranked user for the given period (by total points) or a list of player prize qualifiers.
 * Uses service role to read all predictions and match_days.
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || '').trim() as PeriodType;
  const period = (searchParams.get('period') || '').trim();
  const thresholdParam = (searchParams.get('threshold') || '').trim();

  if (!['weekly', 'monthly', 'seasonal', 'player'].includes(type)) {
    return NextResponse.json(
      { error: 'Query params required: type (weekly|monthly|seasonal|player)' },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: paidProfiles, error: paidErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('subscription_status', 'active');
  if (paidErr) {
    return NextResponse.json({ error: paidErr.message }, { status: 500 });
  }

  const paidIds = (paidProfiles || []).map((p: { id: string }) => p.id);
  const paidNameMap = new Map(
    (paidProfiles || []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name?.trim() || 'Player'])
  );

  const fetchPredictions = async (filters: { matchDayIds?: string[]; userIds?: string[] }) => {
    const baseSelect = 'user_id, points, ht_goals_points, predicted_half_time_goals, corners_points, ht_corners_points, match_day_id, created_at';
    let query = supabase.from('predictions').select(baseSelect);
    if (filters.matchDayIds?.length) {
      query = query.in('match_day_id', filters.matchDayIds);
    }
    if (filters.userIds?.length) {
      query = query.in('user_id', filters.userIds);
    }
    const { data, error } = await query;
    if (!error) return { data: data as any[], error: null };

    const msg = (error as { message?: string }).message || '';
    if (
      (msg.includes('ht_goals_points') && msg.includes('does not exist')) ||
      (msg.includes('corners_points') && msg.includes('does not exist')) ||
      (msg.includes('ht_corners_points') && msg.includes('does not exist'))
    ) {
      let fallbackQuery = supabase
        .from('predictions')
        .select('user_id, points, predicted_half_time_goals, match_day_id, created_at');
      if (filters.matchDayIds?.length) {
        fallbackQuery = fallbackQuery.in('match_day_id', filters.matchDayIds);
      }
      if (filters.userIds?.length) {
        fallbackQuery = fallbackQuery.in('user_id', filters.userIds);
      }
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) return { data: null, error: fallbackError };
      const normalized = (fallbackData || []).map((row: any) => ({
        ...row,
        ht_goals_points: null,
        corners_points: null,
        ht_corners_points: null,
      }));
      return { data: normalized, error: null };
    }

    return { data: null, error };
  };

  if (type === 'player') {
    const threshold = parseInt(thresholdParam, 10);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      return NextResponse.json({ error: 'threshold must be a positive number' }, { status: 400 });
    }
    if (paidIds.length === 0) {
      return NextResponse.json({ qualifiers: [], message: 'No paid subscribers found.' });
    }

    const { data: predictions, error: predErr } = await fetchPredictions({ userIds: paidIds });
    if (predErr) {
      return NextResponse.json({ error: predErr.message || String(predErr) }, { status: 500 });
    }

    const matchDayIds = [...new Set((predictions || []).map((p: any) => p.match_day_id).filter(Boolean))];
    const { data: mdRows } = matchDayIds.length
      ? await supabase.from('match_days').select('id, match_date').in('id', matchDayIds)
      : { data: [] };
    const matchDayMap = new Map((mdRows || []).map((m: { id: string; match_date: string | null }) => [m.id, m.match_date]));

    const byUser: Record<string, { best_points: number; exact: number; reached_at: string | null }> = {};
    (predictions || []).forEach((p: any) => {
      const uid = p.user_id;
      if (!uid) return;
      const pointsVal =
        (p.points ?? 0) +
        (p.ht_goals_points ?? 0) +
        (p.corners_points ?? 0) +
        (p.ht_corners_points ?? 0);
      if (pointsVal < threshold) return;

      const reachedAt = (p.match_day_id && matchDayMap.get(p.match_day_id)) || p.created_at || null;
      const exactHits = [p.points, p.ht_goals_points, p.corners_points, p.ht_corners_points]
        .filter((val) => val === 10).length;

      const current = byUser[uid];
      if (!current) {
        byUser[uid] = { best_points: pointsVal, exact: exactHits, reached_at: reachedAt };
        return;
      }

      const currentTime = current.reached_at ? new Date(current.reached_at).getTime() : Number.MAX_SAFE_INTEGER;
      const nextTime = reachedAt ? new Date(reachedAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (pointsVal > current.best_points || (pointsVal === current.best_points && nextTime < currentTime)) {
        byUser[uid] = { best_points: pointsVal, exact: exactHits, reached_at: reachedAt };
      }
    });

    const qualifiers = Object.entries(byUser)
      .map(([user_id, data]) => ({
        user_id,
        display_name: paidNameMap.get(user_id) || 'Player',
        total_points: data.best_points,
        exact_hits: data.exact,
        reached_at: data.reached_at,
      }))
      .sort((a, b) => {
        const aTime = a.reached_at ? new Date(a.reached_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.reached_at ? new Date(b.reached_at).getTime() : Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) return aTime - bTime;
        return b.total_points - a.total_points;
      });

    return NextResponse.json({
      qualifiers,
      threshold,
      message: qualifiers.length === 0 ? 'No paid players have reached this threshold yet.' : undefined,
    });
  }
  if (!period) {
    return NextResponse.json(
      { error: 'Query params required: type (weekly|monthly|seasonal) and period (e.g. 2026-W08, 2026-02, or season UUID)' },
      { status: 400 }
    );
  }

  const filter = getPeriodFilter(type, period);
  if (type !== 'seasonal' && (!filter.startDate || !filter.endDate)) {
    return NextResponse.json(
      { error: 'Invalid period format. Use 2026-W08 for weekly, 2026-02 for monthly.' },
      { status: 400 }
    );
  }

  if (paidIds.length === 0) {
    return NextResponse.json({ suggested: null, message: 'No paid subscribers found.' });
  }

  let matchDayIds: string[];

  if (filter.seasonId) {
    const { data: mdList, error: mdErr } = await supabase
      .from('match_days')
      .select('id')
      .eq('season_id', filter.seasonId);
    if (mdErr) {
      return NextResponse.json({ error: mdErr.message }, { status: 500 });
    }
    matchDayIds = (mdList || []).map((m: { id: string }) => m.id);
  } else {
    const { data: mdList, error: mdErr } = await supabase
      .from('match_days')
      .select('id')
      .gte('match_date', filter.startDate!)
      .lte('match_date', filter.endDate!);
    if (mdErr) {
      return NextResponse.json({ error: mdErr.message }, { status: 500 });
    }
    matchDayIds = (mdList || []).map((m: { id: string }) => m.id);
  }

  if (matchDayIds.length === 0) {
    return NextResponse.json({ suggested: null, message: 'No predictions found for this period' });
  }

  const { data: predictions, error: predErr } = await fetchPredictions({ matchDayIds, userIds: paidIds });
  if (predErr) {
    return NextResponse.json({ error: predErr.message || String(predErr) }, { status: 500 });
  }

  const byUser: Record<string, { total_points: number; predictions_count: number }> = {};
(predictions || []).forEach((p: { user_id: string; points: number | null; ht_goals_points: number | null; predicted_half_time_goals: number | null; corners_points: number | null; ht_corners_points: number | null }) => {
    const uid = p.user_id;
    if (!byUser[uid]) byUser[uid] = { total_points: 0, predictions_count: 0 };
    byUser[uid].total_points +=
      (p.points ?? 0) +
      (p.ht_goals_points ?? 0) +
      (p.corners_points ?? 0) +
      (p.ht_corners_points ?? 0);
    byUser[uid].predictions_count += 1;
  });

  const sorted = Object.entries(byUser)
    .sort((a, b) => b[1].total_points - a[1].total_points);
  const top = sorted[0];
  if (!top) {
    return NextResponse.json({ suggested: null, message: 'No predictions found for this period' });
  }

  const [winner_user_id, data] = top;

  return NextResponse.json({
    suggested: {
      user_id: winner_user_id,
      display_name: paidNameMap.get(winner_user_id) || 'Player',
      total_points: data.total_points,
      predictions_count: data.predictions_count,
    },
  });
}



