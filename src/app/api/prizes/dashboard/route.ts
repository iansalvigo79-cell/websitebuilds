import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface AvailablePrize {
  id: string;
  type: string;
  period: string | null;
  prize_description: string | null;
  status: string;
  created_at: string;
  prize_matchday_id?: string | null;
  prize_matchday_label?: string | null;
  prize_value?: number | null;
  prize_value_display?: string | null;
  prize_value_label?: string | null;
  season_name?: string | null;
}

interface MyWin {
  id: string;
  prize_id: string;
  type: string | null;
  period: string | null;
  prize_description: string | null;
  prize_value?: number | null;
  prize_value_display?: string | null;
  prize_value_label?: string | null;
  points_achieved?: number | null;
  match_day_id?: string | null;
  match_day_label?: string | null;
  earned_at?: string | null;
  created_at?: string | null;
  season_name?: string | null;
}

function formatMatchDayLabel(
  matchDay?: { name?: string | null; match_date?: string | null },
  earnedAt?: string | null
) {
  const name = matchDay?.name?.trim();
  if (name) return name;
  const dateStr = matchDay?.match_date || earnedAt;
  if (!dateStr) return null;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractPrizeValueInfo(description: string | null): {
  prize_value: number | null;
  prize_value_display: string | null;
  prize_value_label: string | null;
} {
  if (!description) return { prize_value: null, prize_value_display: null, prize_value_label: null };
  const trimmed = description.trim();
  if (!trimmed) return { prize_value: null, prize_value_display: null, prize_value_label: null };

  const symbolMatch = trimmed.match(/([$\u00A3\u20AC])\s*([\d,]+(?:\.\d+)?)/i);
  if (symbolMatch?.[1] && symbolMatch?.[2]) {
    const num = Number(symbolMatch[2].replace(/,/g, ''));
    const label = trimmed.replace(symbolMatch[0], '').replace(/\s{2,}/g, ' ').trim();
    return {
      prize_value: Number.isFinite(num) ? num : null,
      prize_value_display: `${symbolMatch[1]}${symbolMatch[2]}`,
      prize_value_label: label || null,
    };
  }

  const wordMatch = trimmed.match(/([\d,]+(?:\.\d+)?)\s*(usd|dollars?|gbp|pounds?|eur|euros?)/i);
  if (wordMatch?.[1] && wordMatch?.[2]) {
    const num = Number(wordMatch[1].replace(/,/g, ''));
    const currency = wordMatch[2].toLowerCase();
    const symbolMap: Record<string, string> = {
      usd: '$',
      dollar: '$',
      dollars: '$',
      gbp: '\u00A3',
      pound: '\u00A3',
      pounds: '\u00A3',
      eur: '\u20AC',
      euro: '\u20AC',
      euros: '\u20AC',
    };
    const symbol = symbolMap[currency] || '';
    const label = trimmed.replace(wordMatch[0], '').replace(/\s{2,}/g, ' ').trim();
    return {
      prize_value: Number.isFinite(num) ? num : null,
      prize_value_display: `${symbol}${wordMatch[1]}`.trim() || null,
      prize_value_label: label || null,
    };
  }

  return { prize_value: null, prize_value_display: null, prize_value_label: trimmed };
}

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

/**
 * GET /api/prizes/dashboard
 * Returns available prizes (pending) and the current user's wins.
 */
export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const prizeSelect = 'id, type, period, prize_description, status, created_at, prize_matchday_id';
  const prizeSelectFallback = 'id, type, period, prize_description, status, created_at';

  const { data: availableRows, error: availableError } = await selectPrizesWithFallback(
    supabase,
    prizeSelect,
    prizeSelectFallback,
    (query) => query.eq('status', 'pending').order('created_at', { ascending: false })
  );

  if (availableError) {
    return NextResponse.json({ error: availableError.message }, { status: 500 });
  }

  const { data: latestPrizeRow } = await supabase
    .from('prizes')
    .select('id, type, period, prize_description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const winQuery = await supabase
    .from('prize_winners')
    .select('id, prize_id, match_day_id, points, earned_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  let winRows = winQuery.data || [];
  const winRowsError = winQuery.error;
  const prizeWinnersMissing = !!winRowsError && winRowsError.message?.includes('prize_winners');

  let awardedPrizeRows: any[] = [];
  if (prizeWinnersMissing) {
    const { data: awardedRows, error: awardedError } = await selectPrizesWithFallback(
      supabase,
      'id, type, period, prize_description, prize_matchday_id, status, created_at',
      'id, type, period, prize_description, status, created_at',
      (query) => query.eq('winner_user_id', user.id).eq('status', 'awarded').order('created_at', { ascending: false })
    );
    if (awardedError) {
      return NextResponse.json({ error: awardedError.message }, { status: 500 });
    }
    awardedPrizeRows = awardedRows || [];
  } else {
    const { data: awardedRows, error: awardedError } = await selectPrizesWithFallback(
      supabase,
      'id, prize_matchday_id',
      'id',
      (query) => query.eq('winner_user_id', user.id).eq('status', 'awarded')
    );

    if (!awardedError) {
      const existingPrizeIds = new Set((winRows || []).map((row: any) => row.prize_id));
      const missingAwards = (awardedRows || []).filter((row: any) => !existingPrizeIds.has(row.id));
      if (missingAwards.length > 0) {
        const insertPayload = missingAwards.map((row: any) => ({
          prize_id: row.id,
          user_id: user.id,
          match_day_id: row.prize_matchday_id ?? null,
          earned_at: new Date().toISOString(),
        }));
        const { data: insertedRows, error: insertError } = await supabase
          .from('prize_winners')
          .insert(insertPayload)
          .select('id, prize_id, match_day_id, points, earned_at, created_at');
        if (!insertError && insertedRows) {
          winRows = [...(winRows || []), ...insertedRows];
        } else if (insertError) {
          console.warn('Failed to backfill prize winners', insertError);
        }
      }
    }
  }

  const prizeIds = prizeWinnersMissing
    ? [...new Set((awardedPrizeRows || []).map((row: any) => row.id).filter(Boolean))] as string[]
    : [...new Set((winRows || []).map((row: any) => row.prize_id).filter(Boolean))] as string[];

  const { data: prizeRows } = prizeWinnersMissing
    ? { data: awardedPrizeRows }
    : prizeIds.length
      ? await selectPrizesWithFallback(
          supabase,
          'id, type, period, prize_description, prize_matchday_id',
          'id, type, period, prize_description',
          (query) => query.in('id', prizeIds)
        )
      : { data: [] as any[] };

  const seasonIds = new Set<string>();
  (availableRows || []).forEach((prize: any) => {
    if (prize.type === 'seasonal' && prize.period) seasonIds.add(prize.period);
  });
  (prizeRows || []).forEach((prize: any) => {
    if (prize.type === 'seasonal' && prize.period) seasonIds.add(prize.period);
  });

  const { data: seasons } = seasonIds.size > 0
    ? await supabase
        .from('seasons')
        .select('id, name')
        .in('id', [...seasonIds])
    : { data: [] as any[] };

  const seasonMap = new Map((seasons || []).map((season: any) => [season.id, season.name]));

  const matchDayIds = new Set<string>();
  if (!prizeWinnersMissing) {
    (winRows || []).forEach((row: any) => {
      if (row.match_day_id) matchDayIds.add(row.match_day_id);
    });
  }
  (availableRows || []).forEach((prize: any) => {
    if (prize.prize_matchday_id) matchDayIds.add(prize.prize_matchday_id);
  });
  (prizeRows || []).forEach((prize: any) => {
    if (prize.prize_matchday_id) matchDayIds.add(prize.prize_matchday_id);
  });

  const { data: matchDays } = matchDayIds.size > 0
    ? await supabase
        .from('match_days')
        .select('id, name, match_date')
        .in('id', [...matchDayIds])
    : { data: [] as any[] };

  const matchDayMap = new Map((matchDays || []).map((md: any) => [md.id, md]));

  const availablePrizes: AvailablePrize[] = (availableRows || []).map((row: any) => {
    const valueInfo = extractPrizeValueInfo(row.prize_description);
    return {
      ...row,
      prize_matchday_label: row.prize_matchday_id
        ? formatMatchDayLabel(matchDayMap.get(row.prize_matchday_id), null)
        : null,
      prize_value: valueInfo.prize_value,
      prize_value_display: valueInfo.prize_value_display,
      prize_value_label: valueInfo.prize_value_label,
      season_name: row.type === 'seasonal' && row.period ? (seasonMap.get(row.period) ?? null) : null,
    };
  });

  const prizeMap = new Map((prizeRows || []).map((prize: any) => [prize.id, prize]));

  const myWins: MyWin[] = prizeWinnersMissing
    ? (prizeRows || []).map((prize: any) => {
        const valueInfo = extractPrizeValueInfo(prize?.prize_description ?? null);
        const matchDayLabel = prize?.prize_matchday_id
          ? formatMatchDayLabel(matchDayMap.get(prize.prize_matchday_id), prize.created_at ?? null)
          : null;
        return {
          id: prize.id,
          prize_id: prize.id,
          type: prize?.type ?? null,
          period: prize?.period ?? null,
          prize_description: prize?.prize_description ?? null,
          prize_value: valueInfo.prize_value,
          prize_value_display: valueInfo.prize_value_display,
          prize_value_label: valueInfo.prize_value_label,
          points_achieved: null,
          match_day_id: prize?.prize_matchday_id ?? null,
          match_day_label: matchDayLabel,
          earned_at: prize?.created_at ?? null,
          created_at: prize?.created_at ?? null,
          season_name: prize?.type === 'seasonal' && prize?.period ? (seasonMap.get(prize.period) ?? null) : null,
        };
      })
    : (winRows || []).map((win: any) => {
        const prize = prizeMap.get(win.prize_id) || null;
        const valueInfo = extractPrizeValueInfo(prize?.prize_description ?? null);
        const matchDayLabel = win.match_day_id
          ? formatMatchDayLabel(matchDayMap.get(win.match_day_id), win.earned_at || win.created_at)
          : prize?.prize_matchday_id
            ? formatMatchDayLabel(matchDayMap.get(prize.prize_matchday_id), win.earned_at || win.created_at)
            : null;
        return {
          id: win.id,
          prize_id: win.prize_id,
          type: prize?.type ?? null,
          period: prize?.period ?? null,
          prize_description: prize?.prize_description ?? null,
          prize_value: valueInfo.prize_value,
          prize_value_display: valueInfo.prize_value_display,
          prize_value_label: valueInfo.prize_value_label,
          points_achieved: win.points ?? null,
          match_day_id: win.match_day_id ?? null,
          match_day_label: matchDayLabel,
          earned_at: win.earned_at ?? null,
          created_at: win.created_at ?? null,
          season_name: prize?.type === 'seasonal' && prize?.period ? (seasonMap.get(prize.period) ?? null) : null,
        };
      });

  const activePrize = availablePrizes[0] || latestPrizeRow || null;

  return NextResponse.json(
    {
      activePrize,
      availablePrizes,
      myWins,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
