import { getUKTimestamp } from '@/lib/timezoneUtils';

/**
 * Goalactico prediction rules: lock and matchday status.
 */

export type MatchDayStatus = 'upcoming' | 'live' | 'completed';

export interface GameForLock {
  kickoff_at: string;
}

export interface MatchDayForStatus {
  actual_total_goals: number | null;
}

/**
 * Predictions are locked once the first match of the matchday has kicked off.
 */

export function isMatchDayLocked(games: GameForLock[]): boolean {
  if (!games?.length) return false;
  const now = Date.now();
  const earliest = games.reduce((earliest, g) => {
    const t = getUKTimestamp(g.kickoff_at);
    return t < earliest ? t : earliest;
  }, getUKTimestamp(games[0].kickoff_at));
  return now >= earliest;
}

/**
 * Matchday status: upcoming (no game started), live (at least one started, not all scored), completed (actual totals set).
 */
export function getMatchDayStatus(
  matchDay: MatchDayForStatus,
  games: GameForLock[]
): MatchDayStatus {
  if (matchDay.actual_total_goals != null) return 'completed';
  if (!games?.length) return 'upcoming';
  const now = Date.now();
  const hasStarted = games.some((g) => getUKTimestamp(g.kickoff_at) <= now);
  return hasStarted ? 'live' : 'upcoming';
}

/**
 * Whether the matchday is past cutoff (no more edits allowed).
 * Uses cutoff_at from match_days when present; otherwise falls back to first game kickoff.
 */
export function isAfterCutoff(
  cutoffAt: string | null | undefined,
  games: GameForLock[]
): boolean {
  if (cutoffAt) {
    return Date.now() >= getUKTimestamp(cutoffAt);
  }
  return isMatchDayLocked(games);
}

/**
 * Whether the user can edit predictions (not locked, and optionally only FT goals for free users).
 */
export function canUpdatePrediction(
  locked: boolean,
  _isPaid: boolean
): boolean {
  return !locked;
}
