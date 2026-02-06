export interface Team {
  id: string;
  name: string;
  logo?: string;
  form?: string[]; // Recent results: 'W', 'L', 'D'
}

export interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: Date;
  league: string;
  predictions: Prediction;
  odds: Odds;
  status: 'upcoming' | 'live' | 'completed';
}

export interface Prediction {
  homeWinProb: number; // 0-100
  drawProb: number; // 0-100
  awayWinProb: number; // 0-100
  predictedScore?: {
    home: number;
    away: number;
  };
  confidence: number; // 0-100
  recommendation: 'home' | 'away' | 'draw' | 'over' | 'under';
}

export interface Odds {
  homeWin: number;
  draw: number;
  awayWin: number;
  over25: number;
  under25: number;
}
