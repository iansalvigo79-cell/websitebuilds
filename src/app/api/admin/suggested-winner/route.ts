import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type PeriodType = 'weekly' | 'monthly' | 'seasonal';

/**
 * Parse period key into date range or season id for filtering.
 * - weekly: "2026-W08" -> ISO week Mon–Sun
 * - monthly: "2026-02" -> 1st–last of month
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
 * Returns top ranked user for the given period (by total points).
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
  if (!['weekly', 'monthly', 'seasonal'].includes(type) || !period) {
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

  const supabase = createClient(supabaseUrl, serviceKey);

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

  const { data: predictions, error: predErr } = await supabase
    .from('predictions')
    .select('user_id, points')
    .in('match_day_id', matchDayIds);
  if (predErr) {
    return NextResponse.json({ error: predErr.message }, { status: 500 });
  }

  const byUser: Record<string, number> = {};
  (predictions || []).forEach((p: { user_id: string; points: number | null }) => {
    const uid = p.user_id;
    if (!byUser[uid]) byUser[uid] = 0;
    byUser[uid] += p.points != null ? p.points : 0;
  });

  const sorted = Object.entries(byUser)
    .sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) {
    return NextResponse.json({ suggested: null, message: 'No predictions found for this period' });
  }

  const [winner_user_id, total_points] = top;
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', winner_user_id)
    .single();

  return NextResponse.json({
    suggested: {
      user_id: winner_user_id,
      display_name: (profile as { display_name: string } | null)?.display_name ?? 'Unknown',
      total_points,
    },
  });
}
