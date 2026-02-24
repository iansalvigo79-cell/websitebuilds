'use server';

import { createClient } from '@supabase/supabase-js';
import { calculatePoints } from '@/lib/pointsCalculator';

export type CalculatePointsResult =
  | { ok: true; matchDaysProcessed: number; predictionsUpdated: number }
  | { ok: false; error: string };

export type SetActualGoalsResult = { ok: true } | { ok: false; error: string };

/** Set actual_total_goals for a match day (e.g. after entering game scores). */
export async function setMatchDayActualGoals(matchDayId: string, actualTotalGoals: number): Promise<SetActualGoalsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { ok: false, error: 'Server misconfiguration' };
  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase
    .from('match_days')
    .update({ actual_total_goals: actualTotalGoals })
    .eq('id', matchDayId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Compute actual_total_goals from games (sum of home_goals + away_goals) and save to match_days. */
export async function computeMatchDayActualFromGames(matchDayId: string): Promise<SetActualGoalsResult & { total?: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { ok: false, error: 'Server misconfiguration' };
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: games, error: fetchErr } = await supabase
    .from('games')
    .select('home_goals, away_goals')
    .eq('match_day_id', matchDayId);
  if (fetchErr) return { ok: false, error: fetchErr.message };
  const total = (games || []).reduce((sum, g) => sum + (g.home_goals ?? 0) + (g.away_goals ?? 0), 0);
  const { error: updateErr } = await supabase
    .from('match_days')
    .update({ actual_total_goals: total })
    .eq('id', matchDayId);
  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true, total };
}

export type MarkWinnerResult = { ok: true } | { ok: false; error: string };

/** Mark a user as winner for a period. Requires prize_winners table (user_id, period_type, period_key). */
export async function markPrizeWinner(
  userId: string,
  periodType: 'weekly' | 'monthly' | 'seasonal',
  periodKey: string
): Promise<MarkWinnerResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { ok: false, error: 'Server misconfiguration' };
  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase.from('prize_winners').insert({
    user_id: userId,
    period_type: periodType,
    period_key: periodKey,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function calculatePointsForMatchDays(matchDayId?: string): Promise<CalculatePointsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: 'Server misconfiguration: Supabase service role not set' };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let matchDays: { id: string; actual_total_goals: number }[];

  if (matchDayId) {
    const { data, error } = await supabase
      .from('match_days')
      .select('id, actual_total_goals')
      .eq('id', matchDayId)
      .not('actual_total_goals', 'is', null)
      .limit(1);

    if (error) return { ok: false, error: error.message };
    matchDays = (data || []) as { id: string; actual_total_goals: number }[];
  } else {
    const { data, error } = await supabase
      .from('match_days')
      .select('id, actual_total_goals')
      .not('actual_total_goals', 'is', null);

    if (error) return { ok: false, error: error.message };
    matchDays = (data || []) as { id: string; actual_total_goals: number }[];
  }

  let totalUpdated = 0;

  for (const md of matchDays) {
    const actual = md.actual_total_goals;

    const { data: predictions, error: fetchErr } = await supabase
      .from('predictions')
      .select('id, predicted_total_goals')
      .eq('match_day_id', md.id);

    if (fetchErr) continue;

    for (const p of predictions || []) {
      const points = calculatePoints(p.predicted_total_goals, actual);
      const { error: updateErr } = await supabase
        .from('predictions')
        .update({ points })
        .eq('id', p.id);

      if (!updateErr) totalUpdated += 1;
    }
  }

  return {
    ok: true,
    matchDaysProcessed: matchDays.length,
    predictionsUpdated: totalUpdated,
  };
}
