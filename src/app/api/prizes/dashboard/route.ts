import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export interface PrizeWithProfile {
  id: string;
  type: string;
  period: string;
  winner_user_id: string;
  prize_description: string | null;
  status: string;
  created_at: string;
  profiles?: { display_name: string | null } | null;
  winner_points?: number | null;
  prize_value?: number | null;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  predictions_count: number;
  rank: number;
}

interface ActivePrizeContext {
  participants: number;
  leader: LeaderboardEntry | null;
  currentUser: LeaderboardEntry | null;
  gapToLeader: number | null;
  progressToLeaderPct: number | null;
  periodLabel: string;
  countdownTarget: string | null;
}

interface PrizeSummary {
  totalPrizes: number;
  totalWinners: number;
  totalValue: number;
  averageValue: number;
  currentMonthPrizes: number;
  previousMonthPrizes: number;
  currentMonthWinners: number;
  previousMonthWinners: number;
  currentMonthAverageValue: number;
  previousMonthAverageValue: number;
}

interface PeriodContext {
  matchDayIds: string[];
  periodLabel: string;
  countdownTarget: string | null;
}

function parseMoney(value: string | null): number | null {
  if (!value) return null;
  const txt = value.trim();
  if (!txt) return null;

  const symbolMatch = txt.match(/[$\u00A3\u20AC]\s*([\d,]+(?:\.\d+)?)/i);
  if (symbolMatch?.[1]) {
    const num = Number(symbolMatch[1].replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
  }

  const wordMatch = txt.match(/([\d,]+(?:\.\d+)?)\s*(usd|dollars?|gbp|pounds?|eur|euros?)/i);
  if (wordMatch?.[1]) {
    const num = Number(wordMatch[1].replace(/,/g, ''));
    return Number.isFinite(num) ? num : null;
  }

  return null;
}

function startOfCurrentMonthUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfPreviousMonthUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
}

function getIsoWeekBoundsUtc(year: number, week: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1..7, Monday=1
  const firstIsoMonday = new Date(jan4);
  firstIsoMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const start = new Date(firstIsoMonday);
  start.setUTCDate(firstIsoMonday.getUTCDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

async function getPeriodContext(
  supabase: any,
  type: string,
  period: string
): Promise<PeriodContext> {
  if (type === 'seasonal') {
    const { data: seasonRaw } = await supabase
      .from('seasons')
      .select('id, name, end_date')
      .eq('id', period)
      .maybeSingle();
    const seasonRow = seasonRaw as { id: string; name: string | null; end_date: string | null } | null;

    const { data: mdRows } = await supabase
      .from('match_days')
      .select('id')
      .eq('season_id', period);

    return {
      matchDayIds: (mdRows || []).map((m: { id: string }) => m.id),
      periodLabel: seasonRow?.name || 'Season',
      countdownTarget: seasonRow?.end_date ? `${seasonRow.end_date}T23:59:59Z` : null,
    };
  }

  if (type === 'monthly') {
    const m = period.match(/^(\d{4})-(\d{2})$/);
    if (!m) return { matchDayIds: [], periodLabel: period, countdownTarget: null };
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0));
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: mdRows } = await supabase
      .from('match_days')
      .select('id')
      .gte('match_date', startStr)
      .lte('match_date', endStr);

    const periodLabel = start.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

    return {
      matchDayIds: (mdRows || []).map((mday: { id: string }) => mday.id),
      periodLabel,
      countdownTarget: `${endStr}T23:59:59Z`,
    };
  }

  if (type === 'weekly') {
    const m = period.match(/^(\d{4})-W(\d{2})$/);
    if (!m) return { matchDayIds: [], periodLabel: period, countdownTarget: null };
    const year = Number(m[1]);
    const week = Number(m[2]);
    const { start, end } = getIsoWeekBoundsUtc(year, week);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: mdRows } = await supabase
      .from('match_days')
      .select('id')
      .gte('match_date', startStr)
      .lte('match_date', endStr);

    return {
      matchDayIds: (mdRows || []).map((mday: { id: string }) => mday.id),
      periodLabel: `Week ${period}`,
      countdownTarget: `${endStr}T23:59:59Z`,
    };
  }

  return { matchDayIds: [], periodLabel: period || 'Period', countdownTarget: null };
}

async function getLeaderboardForMatchDays(
  supabase: any,
  matchDayIds: string[],
  currentUserId: string
): Promise<{
  entries: LeaderboardEntry[];
  participants: number;
  leader: LeaderboardEntry | null;
  currentUser: LeaderboardEntry | null;
  gapToLeader: number | null;
  progressToLeaderPct: number | null;
}> {
  if (matchDayIds.length === 0) {
    return {
      entries: [],
      participants: 0,
      leader: null,
      currentUser: null,
      gapToLeader: null,
      progressToLeaderPct: null,
    };
  }

  const { data: predictionsRows } = await supabase
    .from('predictions')
    .select('user_id, points')
    .in('match_day_id', matchDayIds);

  const grouped: Record<string, { total_points: number; predictions_count: number }> = {};
  (predictionsRows || []).forEach((row: { user_id: string; points: number | null }) => {
    if (!grouped[row.user_id]) {
      grouped[row.user_id] = { total_points: 0, predictions_count: 0 };
    }
    grouped[row.user_id].total_points += row.points ?? 0;
    grouped[row.user_id].predictions_count += 1;
  });

  const userIds = Object.keys(grouped);
  if (userIds.length === 0) {
    return {
      entries: [],
      participants: 0,
      leader: null,
      currentUser: null,
      gapToLeader: null,
      progressToLeaderPct: null,
    };
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  const profileMap: Record<string, string | null> = {};
  (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
    profileMap[p.id] = p.display_name ?? null;
  });

  const entries: LeaderboardEntry[] = userIds.map((userId) => ({
    user_id: userId,
    display_name: profileMap[userId]?.trim() || 'Player',
    total_points: grouped[userId].total_points,
    predictions_count: grouped[userId].predictions_count,
    rank: 0,
  }));

  entries.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return b.predictions_count - a.predictions_count;
  });
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const leader = entries[0] ?? null;
  const currentUser = entries.find((entry) => entry.user_id === currentUserId) ?? null;
  const gapToLeader = leader && currentUser ? Math.max(0, leader.total_points - currentUser.total_points) : null;
  const progressToLeaderPct =
    leader && currentUser && leader.total_points > 0
      ? Math.max(0, Math.min(100, Math.round((currentUser.total_points / leader.total_points) * 100)))
      : null;

  return {
    entries,
    participants: entries.length,
    leader,
    currentUser,
    gapToLeader,
    progressToLeaderPct,
  };
}

/**
 * GET /api/prizes/dashboard
 * Returns active prize, recent awarded winners, current user prize, and derived stats from DB.
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

  const [{ data: activePrizeRow }, { data: latestPrizeRow }, { data: recentRows }, { data: userPrizeRow }, { data: allPrizeRows }] =
    await Promise.all([
    supabase
      .from('prizes')
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('prizes')
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('prizes')
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .eq('status', 'awarded')
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('prizes')
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .eq('winner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('prizes')
      .select('id, winner_user_id, prize_description, status, created_at'),
  ]);

  const currentPrizeRow = activePrizeRow ?? latestPrizeRow ?? null;

  const winnerIds = new Set<string>();
  if (currentPrizeRow?.winner_user_id) winnerIds.add(currentPrizeRow.winner_user_id);
  (recentRows || []).forEach((r) => r.winner_user_id && winnerIds.add(r.winner_user_id));
  if (userPrizeRow?.winner_user_id) winnerIds.add(userPrizeRow.winner_user_id);

  const profilesMap: Record<string, string | null> = {};
  if (winnerIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', [...winnerIds]);
    (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
      profilesMap[p.id] = p.display_name ?? null;
    });
  }

  const periodContextCache = new Map<string, Promise<PeriodContext>>();
  const leaderboardCache = new Map<
    string,
    Promise<{
      entries: LeaderboardEntry[];
      participants: number;
      leader: LeaderboardEntry | null;
      currentUser: LeaderboardEntry | null;
      gapToLeader: number | null;
      progressToLeaderPct: number | null;
    }>
  >();

  const cacheKeyFor = (type: string, period: string) => `${type}:${period}`;

  const getPeriodContextCached = (type: string, period: string) => {
    const key = cacheKeyFor(type, period);
    const existing = periodContextCache.get(key);
    if (existing) return existing;
    const promise = getPeriodContext(supabase, type, period);
    periodContextCache.set(key, promise);
    return promise;
  };

  const getLeaderboardForPeriodCached = (type: string, period: string) => {
    const key = cacheKeyFor(type, period);
    const existing = leaderboardCache.get(key);
    if (existing) return existing;
    const promise = (async () => {
      const context = await getPeriodContextCached(type, period);
      return getLeaderboardForMatchDays(supabase, context.matchDayIds, user.id);
    })();
    leaderboardCache.set(key, promise);
    return promise;
  };

  let activeContext: ActivePrizeContext | null = null;
  if (currentPrizeRow) {
    const [periodContext, leaderboard] = await Promise.all([
      getPeriodContextCached(currentPrizeRow.type, currentPrizeRow.period),
      getLeaderboardForPeriodCached(currentPrizeRow.type, currentPrizeRow.period),
    ]);
    activeContext = {
      participants: leaderboard.participants,
      leader: leaderboard.leader,
      currentUser: leaderboard.currentUser,
      gapToLeader: leaderboard.gapToLeader,
      progressToLeaderPct: leaderboard.progressToLeaderPct,
      periodLabel: periodContext.periodLabel,
      countdownTarget: periodContext.countdownTarget,
    };
  }

  const activePrize: PrizeWithProfile | null = currentPrizeRow
    ? {
        ...currentPrizeRow,
        profiles: currentPrizeRow.winner_user_id
          ? { display_name: profilesMap[currentPrizeRow.winner_user_id] ?? null }
          : null,
        winner_points: currentPrizeRow.winner_user_id && currentPrizeRow.type && currentPrizeRow.period
          ? (await getLeaderboardForPeriodCached(currentPrizeRow.type, currentPrizeRow.period)).entries
              .find((e) => e.user_id === currentPrizeRow.winner_user_id)?.total_points ?? null
          : null,
        prize_value: parseMoney(currentPrizeRow.prize_description),
      }
    : null;

  const recentWinners: PrizeWithProfile[] = await Promise.all(
    (recentRows || []).map(async (r) => {
      const leaderboard = await getLeaderboardForPeriodCached(r.type, r.period);
      const winnerPoints = leaderboard.entries.find((e) => e.user_id === r.winner_user_id)?.total_points ?? null;
      return {
        ...r,
        profiles: r.winner_user_id ? { display_name: profilesMap[r.winner_user_id] ?? null } : null,
        winner_points: winnerPoints,
        prize_value: parseMoney(r.prize_description),
      };
    })
  );

  const userPrize: PrizeWithProfile | null = userPrizeRow
    ? {
        ...userPrizeRow,
        profiles: userPrizeRow.winner_user_id
          ? { display_name: profilesMap[userPrizeRow.winner_user_id] ?? null }
          : null,
        prize_value: parseMoney(userPrizeRow.prize_description),
      }
    : null;

  const now = new Date();
  const currentMonthStart = startOfCurrentMonthUtc(now);
  const previousMonthStart = startOfPreviousMonthUtc(now);

  const currentMonthRows = (allPrizeRows || []).filter((row: { created_at: string }) => {
    const created = new Date(row.created_at);
    return created >= currentMonthStart;
  });

  const previousMonthRows = (allPrizeRows || []).filter((row: { created_at: string }) => {
    const created = new Date(row.created_at);
    return created >= previousMonthStart && created < currentMonthStart;
  });

  const allValues = (allPrizeRows || []).map((r: { prize_description: string | null }) => parseMoney(r.prize_description)).filter((v): v is number => v != null);
  const currentValues = currentMonthRows.map((r: { prize_description: string | null }) => parseMoney(r.prize_description)).filter((v): v is number => v != null);
  const previousValues = previousMonthRows.map((r: { prize_description: string | null }) => parseMoney(r.prize_description)).filter((v): v is number => v != null);

  const totalValue = allValues.reduce((sum, val) => sum + val, 0);
  const averageValue = allValues.length > 0 ? totalValue / allValues.length : 0;
  const currentMonthAverageValue = currentValues.length > 0 ? currentValues.reduce((sum, val) => sum + val, 0) / currentValues.length : 0;
  const previousMonthAverageValue = previousValues.length > 0 ? previousValues.reduce((sum, val) => sum + val, 0) / previousValues.length : 0;

  const currentWinnerSet = new Set(
    currentMonthRows
      .map((r: { winner_user_id: string | null }) => r.winner_user_id)
      .filter((id: string | null): id is string => Boolean(id))
  );
  const previousWinnerSet = new Set(
    previousMonthRows
      .map((r: { winner_user_id: string | null }) => r.winner_user_id)
      .filter((id: string | null): id is string => Boolean(id))
  );
  const totalWinnerSet = new Set(
    (allPrizeRows || [])
      .map((r: { winner_user_id: string | null }) => r.winner_user_id)
      .filter((id: string | null): id is string => Boolean(id))
  );

  const summary: PrizeSummary = {
    totalPrizes: (allPrizeRows || []).length,
    totalWinners: totalWinnerSet.size,
    totalValue,
    averageValue,
    currentMonthPrizes: currentMonthRows.length,
    previousMonthPrizes: previousMonthRows.length,
    currentMonthWinners: currentWinnerSet.size,
    previousMonthWinners: previousWinnerSet.size,
    currentMonthAverageValue,
    previousMonthAverageValue,
  };

  return NextResponse.json(
    {
      activePrize,
      recentWinners,
      userPrize,
      summary,
      activeContext,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

