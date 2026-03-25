/**
 * Goalactico badges: canonical catalog used for display and DB seeding.
 */

export type BadgeCategory = 'accuracy' | 'consistency' | 'matchday' | 'points' | 'competitive';
export type RequirementType =
  | 'exact_predictions_total'
  | 'exact_predictions_consecutive'
  | 'exact_predictions_consecutive_matchdays'
  | 'predictions_within_margin'
  | 'predictions_within_margin_2'
  | 'points_scoring_streak'
  | 'submission_streak'
  | 'submissions_total'
  | 'full_season_participation'
  | 'matchday_points_single'
  | 'points_in_n_of_m_matchdays'
  | 'consecutive_matchdays_min_points'
  | 'total_points_over_n_matchdays'
  | 'total_points_all_time'
  | 'total_points_single_season'
  | 'matchday_leaderboard_rank'
  | 'weekly_leaderboard_rank'
  | 'monthly_leaderboard_rank'
  | 'season_leaderboard_rank'
  | 'ranking_improvement_single'
  | 'season_personal_best';

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  requirement_type: RequirementType;
  requirement_value: number;
  requirement_secondary_value?: number | null;
  is_paid_only?: boolean;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  // Existing badges (kept for compatibility)
  {
    slug: 'first_prediction',
    name: 'First Prediction',
    description: 'Submitted your first prediction',
    category: 'consistency',
    icon: '🟢',
    requirement_type: 'submissions_total',
    requirement_value: 1,
  },
  {
    slug: 'exact_prediction',
    name: 'First Bull\'s-Eye',
    description: 'Achieve an exact prediction for the first time',
    category: 'accuracy',
    icon: '🎯',
    requirement_type: 'exact_predictions_total',
    requirement_value: 1,
  },
  {
    slug: 'streak_3',
    name: '3-match streak',
    description: '3 matchdays in a row with points',
    category: 'consistency',
    icon: '🔥',
    requirement_type: 'points_scoring_streak',
    requirement_value: 3,
  },
  {
    slug: 'streak_5',
    name: '5-match streak',
    description: '5 matchdays in a row with points',
    category: 'consistency',
    icon: '🔥',
    requirement_type: 'points_scoring_streak',
    requirement_value: 5,
  },
  {
    slug: 'streak_10',
    name: '10-match streak',
    description: '10 matchdays in a row with points',
    category: 'consistency',
    icon: '🔥',
    requirement_type: 'points_scoring_streak',
    requirement_value: 10,
  },
  {
    slug: 'top_weekly',
    name: 'Top Weekly',
    description: 'Top of the weekly leaderboard',
    category: 'competitive',
    icon: '🏅',
    requirement_type: 'weekly_leaderboard_rank',
    requirement_value: 1,
  },
  {
    slug: 'top_monthly',
    name: 'Top Monthly',
    description: 'Top of the monthly leaderboard',
    category: 'competitive',
    icon: '🏆',
    requirement_type: 'monthly_leaderboard_rank',
    requirement_value: 1,
  },
  {
    slug: 'top_season',
    name: 'Top Season',
    description: 'Top of the seasonal leaderboard',
    category: 'competitive',
    icon: '👑',
    requirement_type: 'season_leaderboard_rank',
    requirement_value: 1,
  },

  // Accuracy
  {
    slug: 'exact-hit-2',
    name: 'Double Bull\'s-Eye',
    description: 'Achieve 2 exact predictions',
    category: 'accuracy',
    icon: '🎯',
    requirement_type: 'exact_predictions_total',
    requirement_value: 2,
  },
  {
    slug: 'exact-hit-5',
    name: 'Sharpshooter',
    description: 'Achieve 5 exact predictions',
    category: 'accuracy',
    icon: '🏹',
    requirement_type: 'exact_predictions_total',
    requirement_value: 5,
  },
  {
    slug: 'exact-hit-10',
    name: 'Sniper',
    description: 'Achieve 10 exact predictions',
    category: 'accuracy',
    icon: '🔫',
    requirement_type: 'exact_predictions_total',
    requirement_value: 10,
  },
  {
    slug: 'exact-hit-20',
    name: 'Laser Guided',
    description: 'Achieve 20 exact predictions',
    category: 'accuracy',
    icon: '⚡',
    requirement_type: 'exact_predictions_total',
    requirement_value: 20,
  },
  {
    slug: 'exact-streak-3',
    name: 'Hat-Trick Hero',
    description: 'Achieve 3 exact predictions in a row',
    category: 'accuracy',
    icon: '🔥',
    requirement_type: 'exact_predictions_consecutive',
    requirement_value: 3,
  },
  {
    slug: 'exact-consecutive-matchdays-2',
    name: 'Back to Back',
    description: 'Achieve exact predictions in 2 consecutive matchdays',
    category: 'accuracy',
    icon: '📅',
    requirement_type: 'exact_predictions_consecutive_matchdays',
    requirement_value: 2,
  },
  {
    slug: 'close-hit-5-within-1',
    name: 'Close Call',
    description: 'Achieve 5 predictions within 1 goal',
    category: 'accuracy',
    icon: '👌',
    requirement_type: 'predictions_within_margin',
    requirement_value: 5,
    requirement_secondary_value: 1,
  },
  {
    slug: 'close-hit-10-within-1',
    name: 'Near Miss Master',
    description: 'Achieve 10 predictions within 1 goal',
    category: 'accuracy',
    icon: '🎪',
    requirement_type: 'predictions_within_margin',
    requirement_value: 10,
    requirement_secondary_value: 1,
  },
  {
    slug: 'close-hit-20-within-2',
    name: 'Margin of Error',
    description: 'Achieve 20 predictions within 2 goals',
    category: 'accuracy',
    icon: '📐',
    requirement_type: 'predictions_within_margin_2',
    requirement_value: 20,
    requirement_secondary_value: 2,
  },

  // Consistency & Streaks
  {
    slug: 'points-streak-2',
    name: 'Getting Started',
    description: 'Score points in 2 consecutive matchdays',
    category: 'consistency',
    icon: '✌️',
    requirement_type: 'points_scoring_streak',
    requirement_value: 2,
  },
  {
    slug: 'points-streak-7',
    name: 'Week Warrior',
    description: 'Score points in 7 consecutive matchdays',
    category: 'consistency',
    icon: '⚔️',
    requirement_type: 'points_scoring_streak',
    requirement_value: 7,
  },
  {
    slug: 'submission-streak-5',
    name: 'Committed',
    description: 'Submit predictions for 5 consecutive matchdays',
    category: 'consistency',
    icon: '📝',
    requirement_type: 'submission_streak',
    requirement_value: 5,
  },
  {
    slug: 'submission-streak-10',
    name: 'Dedicated',
    description: 'Submit predictions for 10 consecutive matchdays',
    category: 'consistency',
    icon: '🏅',
    requirement_type: 'submission_streak',
    requirement_value: 10,
  },
  {
    slug: 'submission-streak-20',
    name: 'Iron Will',
    description: 'Submit predictions for 20 consecutive matchdays',
    category: 'consistency',
    icon: '🦾',
    requirement_type: 'submission_streak',
    requirement_value: 20,
  },
  {
    slug: 'submission-total-50',
    name: 'Veteran',
    description: 'Submit predictions for 50 total matchdays',
    category: 'consistency',
    icon: '🎖️',
    requirement_type: 'submissions_total',
    requirement_value: 50,
  },
  {
    slug: 'full-season-participation',
    name: 'Season Stalwart',
    description: 'Participate in every matchday in a season',
    category: 'consistency',
    icon: '🏆',
    requirement_type: 'full_season_participation',
    requirement_value: 1,
  },

  // Matchday Performance
  {
    slug: 'matchday-points-5',
    name: 'Points on the Board',
    description: 'Score 5 or more points in a single matchday',
    category: 'matchday',
    icon: '5️⃣',
    requirement_type: 'matchday_points_single',
    requirement_value: 5,
  },
  {
    slug: 'matchday-points-7',
    name: 'Strong Performance',
    description: 'Score 7 or more points in a single matchday',
    category: 'matchday',
    icon: '7️⃣',
    requirement_type: 'matchday_points_single',
    requirement_value: 7,
  },
  {
    slug: 'matchday-points-10',
    name: 'Perfect Round',
    description: 'Score the maximum 10 points in a single matchday',
    category: 'matchday',
    icon: '💯',
    requirement_type: 'matchday_points_single',
    requirement_value: 10,
  },
  {
    slug: 'matchday-points-15',
    name: 'Pro Scorer',
    description: 'Score 15 or more points in a single matchday',
    category: 'matchday',
    icon: '⭐',
    requirement_type: 'matchday_points_single',
    requirement_value: 15,
    is_paid_only: true,
  },
  {
    slug: 'matchday-points-25',
    name: 'Elite Performer',
    description: 'Score 25 or more points in a single matchday',
    category: 'matchday',
    icon: '🌟',
    requirement_type: 'matchday_points_single',
    requirement_value: 25,
    is_paid_only: true,
  },
  {
    slug: 'matchday-points-40',
    name: 'Flawless',
    description: 'Score the maximum 40 points in a single matchday',
    category: 'matchday',
    icon: '💎',
    requirement_type: 'matchday_points_single',
    requirement_value: 40,
    is_paid_only: true,
  },
  {
    slug: 'points-3-of-4-matchdays',
    name: 'Reliable',
    description: 'Score points in 3 out of 4 matchdays',
    category: 'matchday',
    icon: '📊',
    requirement_type: 'points_in_n_of_m_matchdays',
    requirement_value: 3,
    requirement_secondary_value: 4,
  },
  {
    slug: 'points-4-of-5-matchdays',
    name: 'Consistent Scorer',
    description: 'Score points in 4 out of 5 matchdays',
    category: 'matchday',
    icon: '📈',
    requirement_type: 'points_in_n_of_m_matchdays',
    requirement_value: 4,
    requirement_secondary_value: 5,
  },
  {
    slug: 'consecutive-5pts-3-matchdays',
    name: 'Triple Threat',
    description: 'Score at least 5 points across 3 consecutive matchdays',
    category: 'matchday',
    icon: '🎳',
    requirement_type: 'consecutive_matchdays_min_points',
    requirement_value: 3,
    requirement_secondary_value: 5,
  },
  {
    slug: 'total-20pts-5-matchdays',
    name: 'Volume Scorer',
    description: 'Score at least 20 points across 5 matchdays',
    category: 'matchday',
    icon: '📦',
    requirement_type: 'total_points_over_n_matchdays',
    requirement_value: 5,
    requirement_secondary_value: 20,
  },

  // Total Points
  {
    slug: 'total-points-first',
    name: 'First Points',
    description: 'Score your first ever points',
    category: 'points',
    icon: '🌱',
    requirement_type: 'total_points_all_time',
    requirement_value: 1,
  },
  {
    slug: 'total-points-25',
    name: 'Rising Star',
    description: 'Reach 25 total points',
    category: 'points',
    icon: '⭐',
    requirement_type: 'total_points_all_time',
    requirement_value: 25,
  },
  {
    slug: 'total-points-50',
    name: 'Fifty Up',
    description: 'Reach 50 total points',
    category: 'points',
    icon: '🥈',
    requirement_type: 'total_points_all_time',
    requirement_value: 50,
  },
  {
    slug: 'total-points-100',
    name: 'Century',
    description: 'Reach 100 total points',
    category: 'points',
    icon: '💯',
    requirement_type: 'total_points_all_time',
    requirement_value: 100,
  },
  {
    slug: 'total-points-250',
    name: 'Quarter Grand',
    description: 'Reach 250 total points',
    category: 'points',
    icon: '🥇',
    requirement_type: 'total_points_all_time',
    requirement_value: 250,
  },
  {
    slug: 'total-points-500',
    name: 'Five Hundred Club',
    description: 'Reach 500 total points',
    category: 'points',
    icon: '🏅',
    requirement_type: 'total_points_all_time',
    requirement_value: 500,
  },
  {
    slug: 'total-points-1000',
    name: 'Legend',
    description: 'Reach 1000 total points',
    category: 'points',
    icon: '👑',
    requirement_type: 'total_points_all_time',
    requirement_value: 1000,
  },
  {
    slug: 'season-points-250',
    name: 'Season Earner',
    description: 'Score 250 points within a single season',
    category: 'points',
    icon: '🌿',
    requirement_type: 'total_points_single_season',
    requirement_value: 250,
  },
  {
    slug: 'season-points-500',
    name: 'Season Grinder',
    description: 'Score 500 points within a single season',
    category: 'points',
    icon: '⚙️',
    requirement_type: 'total_points_single_season',
    requirement_value: 500,
  },
  {
    slug: 'season-points-1000',
    name: 'Season Legend',
    description: 'Score 1000 points within a single season',
    category: 'points',
    icon: '🔱',
    requirement_type: 'total_points_single_season',
    requirement_value: 1000,
  },

  // League & Competitive Performance
  {
    slug: 'matchday-rank-1',
    name: 'Matchday Champion',
    description: 'Finish first in a matchday leaderboard',
    category: 'competitive',
    icon: '🥇',
    requirement_type: 'matchday_leaderboard_rank',
    requirement_value: 1,
  },
  {
    slug: 'matchday-rank-top3',
    name: 'Matchday Podium',
    description: 'Finish in the top 3 for a matchday',
    category: 'competitive',
    icon: '🥉',
    requirement_type: 'matchday_leaderboard_rank',
    requirement_value: 3,
  },
  {
    slug: 'matchday-rank-top10',
    name: 'Top Ten',
    description: 'Finish in the top 10 for a matchday',
    category: 'competitive',
    icon: '🔟',
    requirement_type: 'matchday_leaderboard_rank',
    requirement_value: 10,
  },
  {
    slug: 'rank-improve-5',
    name: 'Climbing Fast',
    description: 'Improve overall ranking by 5 or more places in one matchday',
    category: 'competitive',
    icon: '📈',
    requirement_type: 'ranking_improvement_single',
    requirement_value: 5,
  },
  {
    slug: 'rank-improve-10',
    name: 'Rocket Rise',
    description: 'Improve overall ranking by 10 or more places in one matchday',
    category: 'competitive',
    icon: '🚀',
    requirement_type: 'ranking_improvement_single',
    requirement_value: 10,
  },
  {
    slug: 'monthly-rank-1',
    name: 'Monthly Champion',
    description: 'Finish first in a monthly leaderboard',
    category: 'competitive',
    icon: '🏆',
    requirement_type: 'monthly_leaderboard_rank',
    requirement_value: 1,
  },
  {
    slug: 'monthly-rank-top3',
    name: 'Monthly Podium',
    description: 'Finish in the top 3 in a monthly leaderboard',
    category: 'competitive',
    icon: '🎖️',
    requirement_type: 'monthly_leaderboard_rank',
    requirement_value: 3,
  },
  {
    slug: 'season-rank-1',
    name: 'Season Champion',
    description: 'Finish first in a season leaderboard',
    category: 'competitive',
    icon: '👑',
    requirement_type: 'season_leaderboard_rank',
    requirement_value: 1,
  },
  {
    slug: 'season-rank-top5',
    name: 'Season Elite',
    description: 'Finish in the top 5 in a season leaderboard',
    category: 'competitive',
    icon: '🌟',
    requirement_type: 'season_leaderboard_rank',
    requirement_value: 5,
  },
  {
    slug: 'season-best-total',
    name: 'Personal Best',
    description: 'Outperform your previous best season total',
    category: 'competitive',
    icon: '📊',
    requirement_type: 'season_personal_best',
    requirement_value: 1,
  },
];

export const BADGE_MAP = new Map(BADGE_CATALOG.map((badge) => [badge.slug, badge]));

export function getBadgeLabel(slug: string): string {
  return BADGE_MAP.get(slug)?.name ?? slug;
}

export function getBadgeDescription(slug: string): string {
  return BADGE_MAP.get(slug)?.description ?? '';
}

export function getBadgeIcon(slug: string): string {
  return BADGE_MAP.get(slug)?.icon ?? '🏆';
}