export interface Profile {
  id: string;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  whatsapp?: string | null;
  team_id: string;
  team_name?: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'inactive' | 'active' | 'cancelled';
  /** Set by Stripe webhooks: 'paid' = full access, 'free' = core only */
  account_type: 'free' | 'paid';
  /** User role: 1 = admin, 0 = regular user */
  role: 0 | 1;
  created_at: string;
}

/** Badge slug type (dynamic badges are defined in the badges table). */
export type BadgeType = string;

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  requirement_type: string;
  requirement_value: number | null;
  requirement_secondary_value: number | null;
  is_paid_only: boolean | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface League {
  id: string;
  name: string;
  country: string;
  logo_url: string | null;
  created_at: string;
}

export interface Season {
  id: string;
  league_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface MatchDay {
  id: string;
  season_id: string;
  name?: string | null;
  match_date: string;
  cutoff_at: string;
  is_open: boolean;
  actual_total_goals: number | null;
  ht_goals?: number | null;
  total_corners?: number | null;
  ht_corners?: number | null;
  created_at: string;
}

export interface Game {
  id: string;
  match_day_id: string;
  home_team: string;
  away_team: string;
  competition_id?: string | null;
  kickoff_at: string;
  home_goals: number | null;
  away_goals: number | null;
  is_selected: boolean;
  created_at: string;
}

export interface Competition {
  id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_day_id: string;
  predicted_total_goals: number;
  predicted_half_time_goals?: number | null;
  predicted_ft_corners?: number | null;
  predicted_ht_corners?: number | null;
  points: number | null;
  ht_goals_points?: number | null;
  corners_points?: number | null;
  ht_corners_points?: number | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  team_name: string;
  total_points: number;
  predictions_count: number;
  rank: number;
}

export interface Team {
  id: string;
  name: string;
}

/** Prize winner record (supports multiple winners per prize). */
export interface PrizeWinner {
  id: string;
  user_id: string;
  prize_id: string;
  match_day_id?: string | null;
  points?: number | null;
  earned_at?: string | null;
  created_at: string;
}

/** Prize competition: admin creates after period ends, confirms winner, marks awarded when sent. */
export type PrizeType = 'weekly' | 'monthly' | 'seasonal' | 'player';
export type PrizeStatus = 'pending' | 'awarded';

export interface Prize {
  id: string;
  type: PrizeType;
  period: string | null;
  points_threshold?: number | null;
  winner_user_id: string | null;
  prize_description: string | null;
  status: PrizeStatus;
  created_at: string;
}

/** Blog post for publishing insights and analysis. */
export type BlogCategory = 'Strategy' | 'Preview' | 'Analysis';

export interface Blog {
  id: string;
  title: string;
  description: string;
  content: string;
  category: BlogCategory;
  author: string;
  image_url: string | null;
  views: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
