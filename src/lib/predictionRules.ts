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
  const now = new Date();
  const earliest = games.reduce((earliest, g) => {
    const t = new Date(g.kickoff_at).getTime();
    return t < earliest ? t : earliest;
  }, new Date(games[0].kickoff_at).getTime());
  return now.getTime() >= earliest;
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
  const now = new Date();
  const hasStarted = games.some((g) => new Date(g.kickoff_at).getTime() <= now.getTime());
  return hasStarted ? 'live' : 'upcoming';
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
