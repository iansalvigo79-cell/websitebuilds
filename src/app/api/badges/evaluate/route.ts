import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BADGE_CATALOG } from '@/lib/badges';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = body.userId || user.id;

    // Get user's predictions with match day info
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select(`
        *,
        match_days!inner(
          id,
          match_date,
          season_id,
          actual_total_goals,
          ht_goals,
          total_corners,
          ht_corners
        )
      `)
      .eq('user_id', userId);

    if (predError) {
      console.error('Predictions fetch error:', predError);
      return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
    }

    // Get active season
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    const activeSeasonId = seasonData?.id;

    // Calculate stats
    const stats = calculateUserStats(predictions || [], activeSeasonId);

    // Evaluate badges
    const earnedBadges = await evaluateBadges(stats, userId, supabase);

    // Save to user_badges
    await saveUserBadges(userId, earnedBadges, supabase);

    return NextResponse.json({ success: true, badges: earnedBadges });
  } catch (error) {
    console.error('Badge evaluation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateUserStats(predictions: any[], activeSeasonId: string | null) {
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  let totalPoints = 0;
  let exactPredictions = 0;
  let consecutivePointsStreak = 0;
  let maxPointsStreak = 0;
  let submissionStreak = 0;
  let maxSubmissionStreak = 0;
  let totalSubmissions = 0;
  let weeklyPoints = 0;
  let monthlyPoints = 0;
  let seasonalPoints = 0;
  let matchdayPoints: number[] = [];
  let pointsByMatchday: { [key: string]: number } = {};
  let maxExactConsecutiveStreak = 0;
  let predictionsWithin1 = 0;
  let predictionsWithin2 = 0;
  let fullSeasonParticipation = false;

  // Sort predictions by match date
  const sortedPreds = predictions.sort((a, b) =>
    new Date(a.match_days.match_date).getTime() - new Date(b.match_days.match_date).getTime()
  );

  let currentStreak = 0;
  let currentSubStreak = 0;
  let currentExactStreak = 0;

  // Group by season for full season participation
  const seasonMatchdays: { [seasonId: string]: Set<string> } = {};
  const userMatchdaysBySeason: { [seasonId: string]: Set<string> } = {};

  for (const pred of sortedPreds) {
    const matchDate = new Date(pred.match_days.match_date);
    const week = getWeekNumber(matchDate);
    const month = matchDate.getMonth() + 1;
    const year = matchDate.getFullYear();
    const seasonId = pred.match_days.season_id;

    const points = (pred.points || 0) + (pred.ht_goals_points || 0) + (pred.corners_points || 0) + (pred.ht_corners_points || 0);
    const isExact = pred.predicted_total_goals === pred.match_days.actual_total_goals;
    const diff = Math.abs((pred.predicted_total_goals || 0) - (pred.match_days.actual_total_goals || 0));

    totalPoints += points;
    totalSubmissions++;

    if (isExact) {
      exactPredictions++;
      currentExactStreak++;
      maxExactConsecutiveStreak = Math.max(maxExactConsecutiveStreak, currentExactStreak);
    } else {
      currentExactStreak = 0;
    }

    if (diff <= 1) predictionsWithin1++;
    if (diff <= 2) predictionsWithin2++;

    // Points streak
    if (points > 0) {
      currentStreak++;
      maxPointsStreak = Math.max(maxPointsStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    // Submission streak
    currentSubStreak++;
    maxSubmissionStreak = Math.max(maxSubmissionStreak, currentSubStreak);

    // Period points
    if (week === currentWeek && year === currentYear) {
      weeklyPoints += points;
    }
    if (month === currentMonth && year === currentYear) {
      monthlyPoints += points;
    }
    if (seasonId === activeSeasonId) {
      seasonalPoints += points;
    }

    // Matchday points
    matchdayPoints.push(points);
    pointsByMatchday[pred.match_day_id] = points;

    // For full season participation
    if (!seasonMatchdays[seasonId]) seasonMatchdays[seasonId] = new Set();
    if (!userMatchdaysBySeason[seasonId]) userMatchdaysBySeason[seasonId] = new Set();
    seasonMatchdays[seasonId].add(pred.match_day_id);
    userMatchdaysBySeason[seasonId].add(pred.match_day_id);
  }

  consecutivePointsStreak = maxPointsStreak;
  submissionStreak = maxSubmissionStreak;

  // Check full season participation
  for (const seasonId in seasonMatchdays) {
    const totalMatchdays = seasonMatchdays[seasonId].size;
    const userMatchdays = userMatchdaysBySeason[seasonId].size;
    if (userMatchdays === totalMatchdays) {
      fullSeasonParticipation = true;
      break;
    }
  }

  return {
    totalPoints,
    exactPredictions,
    consecutivePointsStreak,
    submissionStreak,
    totalSubmissions,
    weeklyPoints,
    monthlyPoints,
    seasonalPoints,
    matchdayPoints,
    pointsByMatchday,
    sortedPreds,
    maxExactConsecutiveStreak,
    predictionsWithin1,
    predictionsWithin2,
    fullSeasonParticipation,
  };
}

async function evaluateBadges(stats: any, userId: string, supabase: any) {
  const earned: string[] = [];

  for (const badge of BADGE_CATALOG) {
    if (await checkBadgeRequirement(badge, stats, userId, supabase)) {
      earned.push(badge.slug);
    }
  }

  return earned;
}

async function checkBadgeRequirement(badge: any, stats: any, userId: string, supabase: any) {
  const { requirement_type, requirement_value, requirement_secondary_value } = badge;

  switch (requirement_type) {
    case 'submissions_total':
      return stats.totalSubmissions >= requirement_value;

    case 'exact_predictions_total':
      return stats.exactPredictions >= requirement_value;

    case 'exact_predictions_consecutive':
      return stats.maxExactConsecutiveStreak >= requirement_value;

    case 'exact_predictions_consecutive_matchdays':
      // Simplified: assume consecutive matchdays if consecutive predictions
      return stats.maxExactConsecutiveStreak >= requirement_value;

    case 'predictions_within_margin':
      return stats.predictionsWithin1 >= requirement_value;

    case 'predictions_within_margin_2':
      return stats.predictionsWithin2 >= requirement_value;

    case 'points_scoring_streak':
      return stats.consecutivePointsStreak >= requirement_value;

    case 'submission_streak':
      return stats.submissionStreak >= requirement_value;

    case 'full_season_participation':
      return stats.fullSeasonParticipation;

    case 'matchday_points_single':
      return stats.matchdayPoints.some((p: number) => p >= requirement_value);

    case 'points_in_n_of_m_matchdays':
      // Simplified: check if points in at least n of last m matchdays
      const lastM = stats.sortedPreds.slice(-requirement_secondary_value);
      const withPoints = lastM.filter((p: any) => (p.points || 0) + (p.ht_goals_points || 0) + (p.corners_points || 0) + (p.ht_corners_points || 0) > 0).length;
      return withPoints >= requirement_value;

    case 'consecutive_matchdays_min_points':
      // Check for consecutive matchdays with at least secondary_value points
      let consec = 0;
      for (const p of stats.sortedPreds) {
        const pts = (p.points || 0) + (p.ht_goals_points || 0) + (p.corners_points || 0) + (p.ht_corners_points || 0);
        if (pts >= requirement_secondary_value) {
          consec++;
          if (consec >= requirement_value) return true;
        } else {
          consec = 0;
        }
      }
      return false;

    case 'total_points_over_n_matchdays':
      // Sum points over last n matchdays >= secondary_value
      const lastN = stats.sortedPreds.slice(-requirement_value);
      const sum = lastN.reduce((acc: number, pred: any) =>
        acc + (pred.points || 0) + (pred.ht_goals_points || 0) + (pred.corners_points || 0) + (pred.ht_corners_points || 0), 0);
      return sum >= requirement_secondary_value;

    case 'total_points_all_time':
      return stats.totalPoints >= requirement_value;

    case 'total_points_single_season':
      return stats.seasonalPoints >= requirement_value;

    case 'matchday_leaderboard_rank':
      return await getUserMatchdayRank(userId, requirement_value, supabase);

    case 'weekly_leaderboard_rank':
      return await getUserRank(userId, 'weekly', supabase) <= requirement_value;

    case 'monthly_leaderboard_rank':
      return await getUserRank(userId, 'monthly', supabase) <= requirement_value;

    case 'season_leaderboard_rank':
      return await getUserRank(userId, 'season', supabase) <= requirement_value;

    case 'ranking_improvement_single':
      // Simplified: not implemented
      return false;

    case 'season_personal_best':
      // Simplified: not implemented
      return false;

    default:
      return false;
  }
}

async function getUserRank(userId: string, period: 'weekly' | 'monthly' | 'season', supabase: any) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'weekly') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    startDate = weekStart;
    endDate = new Date(weekStart);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else { // season
    const { data: season } = await supabase
      .from('seasons')
      .select('start_date, end_date')
      .eq('is_active', true)
      .single();
    if (!season) return 999;
    startDate = new Date(season.start_date);
    endDate = new Date(season.end_date);
  }

  // Get all users' points in the period
  const { data: periodPreds, error } = await supabase
    .from('predictions')
    .select(`
      user_id,
      points,
      ht_goals_points,
      corners_points,
      ht_corners_points,
      match_days!inner(match_date)
    `)
    .gte('match_days.match_date', startDate.toISOString().split('T')[0])
    .lte('match_days.match_date', endDate.toISOString().split('T')[0]);

  if (error || !periodPreds) return 999;

  const userPoints: { [key: string]: number } = {};
  periodPreds.forEach((pred: any) => {
    const uid = pred.user_id;
    if (!userPoints[uid]) userPoints[uid] = 0;
    userPoints[uid] += (pred.points || 0) + (pred.ht_goals_points || 0) + (pred.corners_points || 0) + (pred.ht_corners_points || 0);
  });

  const sortedUsers = Object.entries(userPoints)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const userRank = sortedUsers.findIndex(([uid]) => uid === userId) + 1;
  return userRank || 999;
}

async function getUserMatchdayRank(userId: string, targetRank: number, supabase: any) {
  // Get all matchdays the user has predictions for
  const { data: userPreds, error } = await supabase
    .from('predictions')
    .select('match_day_id')
    .eq('user_id', userId);

  if (error || !userPreds) return false;

  const matchdayIds = [...new Set(userPreds.map((p: any) => p.match_day_id))];

  for (const mdId of matchdayIds) {
    // Get all predictions for this matchday
    const { data: mdPreds } = await supabase
      .from('predictions')
      .select('user_id, points, ht_goals_points, corners_points, ht_corners_points')
      .eq('match_day_id', mdId);

    if (!mdPreds) continue;

    // Calculate points per user
    const userPoints: { [uid: string]: number } = {};
    mdPreds.forEach((p: any) => {
      const uid = p.user_id;
      if (!userPoints[uid]) userPoints[uid] = 0;
      userPoints[uid] += (p.points || 0) + (p.ht_goals_points || 0) + (p.corners_points || 0) + (p.ht_corners_points || 0);
    });

    // Sort and find rank
    const sorted = Object.entries(userPoints).sort(([, a], [, b]) => b - a);
    const userRank = sorted.findIndex(([uid]) => uid === userId) + 1;
    if (userRank > 0 && userRank <= targetRank) return true;
  }

  return false;
}

async function saveUserBadges(userId: string, badgeSlugs: string[], supabase: any) {
  // Get existing badges
  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_id, badges(slug)')
    .eq('user_id', userId);

  const existingSlugs = new Set(existing?.map((ub: any) => ub.badges?.slug).filter(Boolean) || []);

  // Get badge IDs
  const { data: badges } = await supabase
    .from('badges')
    .select('id, slug')
    .in('slug', badgeSlugs);

  const badgeMap = new Map(badges?.map((b: any) => [b.slug, b.id]) || []);

  // Insert new badges
  const toInsert = badgeSlugs
    .filter(slug => !existingSlugs.has(slug))
    .map(slug => ({
      user_id: userId,
      badge_id: badgeMap.get(slug),
      earned_at: new Date().toISOString(),
    }))
    .filter(item => item.badge_id);

  if (toInsert.length > 0) {
    await supabase.from('user_badges').insert(toInsert);
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}