import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function selectPrizesWithFallback(
  supabase: any,
  selectWithMatchday: string,
  selectFallback: string,
  applyFilter: (query: any) => any
) {
  const withQuery = applyFilter(supabase.from('prizes').select(selectWithMatchday));
  const { data, error } = await withQuery;
  if (error && error.message && error.message.includes('prize_matchday_id')) {
    const fallbackQuery = applyFilter(supabase.from('prizes').select(selectFallback));
    const fallback = await fallbackQuery;
    return { data: fallback.data as any[] | null, error: fallback.error, usedFallback: true };
  }
  return { data: data as any[] | null, error, usedFallback: false };
}

async function insertPrizeWithFallback(
  supabase: any,
  payloadWithMatchday: Record<string, any>,
  payloadFallback: Record<string, any>
) {
  const { data, error } = await supabase
    .from('prizes')
    .insert(payloadWithMatchday)
    .select('id, type, period, prize_matchday_id, winner_user_id, prize_description, status, created_at')
    .single();
  if (error && error.message && error.message.includes('prize_matchday_id')) {
    const fallback = await supabase
      .from('prizes')
      .insert(payloadFallback)
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .single();
    return { data: fallback.data as any | null, error: fallback.error, usedFallback: true };
  }
  return { data: data as any | null, error, usedFallback: false };
}

/**
 * GET /api/admin/prizes
 * List all prizes (admin). Uses service role to bypass RLS.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await selectPrizesWithFallback(
    supabase,
    'id, type, period, prize_matchday_id, winner_user_id, prize_description, status, created_at',
    'id, type, period, winner_user_id, prize_description, status, created_at',
    (query) => query.order('created_at', { ascending: false }).limit(100)
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prizes = data || [];
  const winnerIds = [...new Set(prizes.map((p: { winner_user_id?: string | null }) => p.winner_user_id).filter(Boolean))];
  const winnerNames: Record<string, string> = {};

  if (winnerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', winnerIds);
    (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
      const trimmed = p.display_name?.trim();
      winnerNames[p.id] = trimmed && trimmed.length > 0 ? trimmed : p.id.slice(0, 8) + '...';
    });
  }

  const prizeIds = prizes.map((p: { id: string }) => p.id);
  const { data: prizeWinnerData } = prizeIds.length
    ? await supabase
        .from('prize_winners')
        .select('prize_id, match_day_id, earned_at')
        .in('prize_id', prizeIds)
    : { data: [] as any[] };

  const prizeWinnerMap = new Map(
    (prizeWinnerData || []).map((row: any) => [row.prize_id, row])
  );
  const matchDayIds = [
    ...new Set(
      [
        ...(prizeWinnerData || []).map((row: any) => row.match_day_id).filter(Boolean),
        ...(prizes || []).map((p: any) => p.prize_matchday_id).filter(Boolean),
      ]
    ),
  ] as string[];
  const { data: matchDayData } = matchDayIds.length
    ? await supabase
        .from('match_days')
        .select('id, name, match_date')
        .in('id', matchDayIds)
    : { data: [] as any[] };
  const matchDayMap = new Map((matchDayData || []).map((md: any) => [md.id, md]));
  const formatMatchDayLabel = (matchDay: any, earnedAt?: string | null) => {
    const name = matchDay?.name?.trim();
    if (name) return name;
    const dateStr = matchDay?.match_date || earnedAt;
    if (!dateStr) return null;
    const dt = new Date(dateStr);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const withNames = prizes.map((prize: any) => {
    const winnerId = prize.winner_user_id;
    const winnerRow = prizeWinnerMap.get(prize.id);
    const matchDay = winnerRow?.match_day_id ? matchDayMap.get(winnerRow.match_day_id) : null;
    const winnerMatchDayLabel = winnerRow ? formatMatchDayLabel(matchDay, winnerRow.earned_at) : null;
    const prizeMatchDay = prize.prize_matchday_id ? matchDayMap.get(prize.prize_matchday_id) : null;
    const prizeMatchDayLabel = prizeMatchDay ? formatMatchDayLabel(prizeMatchDay, null) : null;
    return {
      ...prize,
      winner_display_name: winnerId ? (winnerNames[winnerId] ?? winnerId.slice(0, 8) + '...') : null,
      winner_match_day_label: winnerMatchDayLabel,
      prize_match_day_label: prizeMatchDayLabel,
    };
  });
  return NextResponse.json({ prizes: withNames });
}

/**
 * POST /api/admin/prizes
 * Create a new prize (pending). Body: { type, period, winner_user_id, prize_description? }
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  let body: {
    type?: string;
    period?: string;
    winner_user_id?: string | null;
    prize_description?: string;
    points_threshold?: string | number;
    prize_matchday_id?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type?.trim();
  let period = body.period?.trim();
  const winner_user_id = body.winner_user_id?.trim() || null;
  const prize_description = body.prize_description ?? null;
  const prize_matchday_id = body.prize_matchday_id?.trim() || null;

  if (!type) {
    return NextResponse.json(
      { error: 'Missing required fields: type' },
      { status: 400 }
    );
  }
  if (!['weekly', 'monthly', 'seasonal', 'player'].includes(type)) {
    return NextResponse.json({ error: 'type must be weekly, monthly, seasonal, or player' }, { status: 400 });
  }
  if (type === 'player') {
    const rawThreshold = body.points_threshold ?? period ?? '';
    const parsed = parseInt(String(rawThreshold).trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'points_threshold must be a positive number' }, { status: 400 });
    }
    period = String(parsed);
  } else if (!period) {
    return NextResponse.json(
      { error: 'Missing required fields: period' },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const insertPayloadBase = {
    type,
    period,
    winner_user_id,
    prize_description,
    status: 'pending',
  };
  const insertPayloadWithMatchday = {
    ...insertPayloadBase,
    prize_matchday_id,
  };

  const { data, error } = await insertPrizeWithFallback(
    supabase,
    insertPayloadWithMatchday,
    insertPayloadBase
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && type === 'player' && winner_user_id) {
    const threshold = parseInt(String(period ?? ''), 10);
    if (Number.isFinite(threshold) && threshold > 0) {
      try {
        const fetchPredictionsForUser = async () => {
          const baseSelect = 'match_day_id, created_at, points, ht_goals_points, corners_points, ht_corners_points';
          let query = supabase
            .from('predictions')
            .select(baseSelect)
            .eq('user_id', winner_user_id);
          const { data: predData, error: predError } = await query;
          if (!predError) return { data: predData as any[], error: null };

          const msg = (predError as { message?: string }).message || '';
          if (
            (msg.includes('ht_goals_points') && msg.includes('does not exist')) ||
            (msg.includes('corners_points') && msg.includes('does not exist')) ||
            (msg.includes('ht_corners_points') && msg.includes('does not exist'))
          ) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('predictions')
              .select('match_day_id, created_at, points')
              .eq('user_id', winner_user_id);
            if (fallbackError) return { data: null, error: fallbackError };
            const normalized = (fallbackData || []).map((row: any) => ({
              ...row,
              ht_goals_points: 0,
              corners_points: 0,
              ht_corners_points: 0,
            }));
            return { data: normalized, error: null };
          }

          return { data: null, error: predError };
        };

        const { data: predictions, error: predErr } = await fetchPredictionsForUser();
        if (!predErr && predictions && predictions.length > 0) {
          const candidates = (predictions || [])
            .map((p: any) => {
              const pointsVal =
                (p.points ?? 0) +
                (p.ht_goals_points ?? 0) +
                (p.corners_points ?? 0) +
                (p.ht_corners_points ?? 0);
              if (pointsVal < threshold) return null;
              return {
                match_day_id: p.match_day_id ?? null,
                created_at: p.created_at ?? null,
                points: pointsVal,
              };
            })
            .filter(Boolean) as Array<{ match_day_id: string | null; created_at: string | null; points: number }>;

          if (candidates.length > 0) {
            const matchDayIds = [...new Set(candidates.map((c) => c.match_day_id).filter(Boolean))] as string[];
            const { data: matchDayRows } = matchDayIds.length
              ? await supabase
                  .from('match_days')
                  .select('id, match_date')
                  .in('id', matchDayIds)
              : { data: [] as any[] };
            const matchDayMap = new Map((matchDayRows || []).map((md: any) => [md.id, md]));

            const prizeCreatedAt = new Date(data.created_at).getTime();
            const datedCandidates = candidates.map((c) => {
              const dateStr = c.match_day_id ? matchDayMap.get(c.match_day_id)?.match_date || c.created_at : c.created_at;
              const ts = dateStr ? new Date(dateStr).getTime() : Number.MAX_SAFE_INTEGER;
              return { ...c, dateStr, ts };
            });

            const beforeOrEqual = datedCandidates.filter((c) => c.ts <= prizeCreatedAt);
            const selected = (beforeOrEqual.length > 0
              ? beforeOrEqual.sort((a, b) => b.ts - a.ts)[0]
              : datedCandidates.sort((a, b) => a.ts - b.ts)[0]) || null;

            if (selected) {
              await supabase.from('prize_winners').insert({
                prize_id: data.id,
                user_id: winner_user_id,
                match_day_id: selected.match_day_id,
                earned_at: selected.dateStr ?? data.created_at,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to attach prize winner matchday:', err);
      }
    }
  }

  return NextResponse.json(data);
}






















