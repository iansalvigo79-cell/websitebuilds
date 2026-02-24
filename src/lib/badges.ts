/**
 * Goalactico badges: labels and display info.
 * Badges can be stored on profiles (e.g. badges: BadgeType[]) or computed from predictions/leaderboard.
 */
import type { BadgeType } from '@/types/database';

export const BADGE_INFO: Record<BadgeType, { label: string; description: string }> = {
  exact_prediction: { label: 'Exact', description: 'Nailed the total exactly' },
  streak_3: { label: '3-match streak', description: '3 match days in a row with points' },
  streak_5: { label: '5-match streak', description: '5 match days in a row with points' },
  streak_10: { label: '10-match streak', description: '10 match days in a row with points' },
  top_weekly: { label: 'Top weekly', description: 'Top of the weekly leaderboard' },
  top_monthly: { label: 'Top monthly', description: 'Top of the monthly leaderboard' },
  top_season: { label: 'Top season', description: 'Top of the seasonal leaderboard' },
  first_prediction: { label: 'First prediction', description: 'Submitted your first prediction' },
};

export function getBadgeLabel(type: BadgeType): string {
  return BADGE_INFO[type]?.label ?? type;
}

export function getBadgeDescription(type: BadgeType): string {
  return BADGE_INFO[type]?.description ?? '';
}
