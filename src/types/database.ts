export interface Profile {
  id: string;
  display_name: string;
  team_id: string;
  team_name?: string;
  stripe_customer_id: string | null;
  subscription_status: 'inactive' | 'active' | 'cancelled';
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface MatchDay {
  id: string;
  season_id: string;
  match_date: string;
  cutoff_at: string;
  is_open: boolean;
  actual_total_goals: number | null;
  created_at: string;
}

export interface Game {
  id: string;
  match_day_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_goals: number | null;
  away_goals: number | null;
  is_selected: boolean;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_day_id: string;
  predicted_total_goals: number;
  points: number | null;
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