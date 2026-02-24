"use client";

import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import BarChartIcon from '@mui/icons-material/BarChart';
import PercentIcon from '@mui/icons-material/Percent';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LockIcon from '@mui/icons-material/Lock';
import { BADGE_INFO } from '@/lib/badges';
import type { BadgeType } from '@/types/database';

interface PredictionRow {
  id: string;
  match_day_id: string;
  match_date: string;
  matchdayLabel: string;
  predicted_total_goals: number;
  actual_total_goals: number | null;
  points: number | null;
  isExact: boolean;
}

interface ProfileInfo {
  created_at: string;
  subscription_status: string;
  display_name: string;
}

const CHART_MAX_PTS = 30;
const CHART_BAR_COLOR = '#3b82f6';
const CHART_FT_COLOR = '#eab308';

function formatMemberSince(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function MyPredictionsTab() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [seasonName, setSeasonName] = useState('');
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [thisWeekPoints, setThisWeekPoints] = useState(0);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [matchdaysPlayed, setMatchdaysPlayed] = useState(0);
  const [exactCount, setExactCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'exact' | 'zero'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('created_at, subscription_status, display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (profileData) setProfile(profileData as ProfileInfo);

    const { data: seasonData } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle();
    if (seasonData) setSeasonName(seasonData.name || '');

    const { data: predRows } = await supabase
      .from('predictions')
      .select('id, match_day_id, predicted_total_goals, points')
      .eq('user_id', user.id);
    const predList = predRows || [];

    const mdIds = [...new Set(predList.map((p: any) => p.match_day_id))];
    const { data: mdList } = mdIds.length
      ? await supabase.from('match_days').select('id, match_date, actual_total_goals, season_id').in('id', mdIds)
      : { data: [] };
    const mdMap = new Map((mdList || []).map((m: any) => [m.id, m]));

    const seasonId = seasonData?.id;
    let globalRankVal: number | null = null;
    if (seasonId) {
      const { data: seasonMatchDays } = await supabase
        .from('match_days')
        .select('id')
        .eq('season_id', seasonId);
      const seasonMdIds = (seasonMatchDays || []).map((m: any) => m.id);
      if (seasonMdIds.length > 0) {
        const { data: allPredData } = await supabase
          .from('predictions')
          .select('user_id, points, match_day_id')
          .in('match_day_id', seasonMdIds);
        const userTotals: Record<string, number> = {};
        (allPredData || []).forEach((p: any) => {
          userTotals[p.user_id] = (userTotals[p.user_id] || 0) + (p.points ?? 0);
        });
        const ranked = Object.entries(userTotals).sort((a, b) => b[1] - a[1]);
        const rankIndex = ranked.findIndex(([uid]) => uid === user.id);
        globalRankVal = rankIndex >= 0 ? rankIndex + 1 : null;
      }
    }
    setGlobalRank(globalRankVal);

    const weekStart = getWeekStart(new Date());
    const isFirstRank = globalRankVal === 1;
    let total = 0;
    let weekPts = 0;
    let exact = 0;
    const rows: PredictionRow[] = [];
    const sortedMdIds = mdIds
      .map((id) => ({ id, match_date: mdMap.get(id)?.match_date }))
      .filter((x) => x.match_date)
      .sort((a, b) => (a.match_date! > b.match_date! ? -1 : 1))
      .map((x) => x.id);

    predList.forEach((p: any) => {
      const md = mdMap.get(p.match_day_id);
      if (!md) return;
      const pts = p.points ?? 0;
      total += pts;
      const matchDate = new Date(md.match_date);
      if (matchDate >= weekStart) weekPts += pts;
      const actual = md.actual_total_goals;
      const isExact = actual != null && p.predicted_total_goals === actual && pts === 10;
      if (isExact) exact += 1;
      const mdNum = sortedMdIds.indexOf(p.match_day_id) + 1;
      rows.push({
        id: p.id,
        match_day_id: p.match_day_id,
        match_date: md.match_date,
        matchdayLabel: `MD ${mdNum}`,
        predicted_total_goals: p.predicted_total_goals,
        actual_total_goals: actual,
        points: p.points,
        isExact,
      });
    });
    rows.sort((a, b) => (b.match_date > a.match_date ? 1 : -1));
    setTotalPoints(total);
    setThisWeekPoints(weekPts);
    setExactCount(exact);
    setMatchdaysPlayed(rows.length);
    setPredictions(rows);

    const ptsOrdered = sortedMdIds.map((id) => {
      const p = predList.find((x: any) => x.match_day_id === id);
      const pts = p?.points ?? 0;
      return pts;
    });
    let streak = 0;
    let maxStreak = 0;
    ptsOrdered.forEach((pts) => {
      if (pts > 0) {
        streak += 1;
        maxStreak = Math.max(maxStreak, streak);
      } else streak = 0;
    });
    setBestStreak(maxStreak);

    const badges: BadgeType[] = [];
    if (predList.length >= 1) badges.push('first_prediction');
    if (exact >= 1) badges.push('exact_prediction');
    if (maxStreak >= 3) badges.push('streak_3');
    if (maxStreak >= 5) badges.push('streak_5');
    if (maxStreak >= 10) badges.push('streak_10');
    if (isFirstRank) {
      badges.push('top_weekly');
      badges.push('top_monthly');
      badges.push('top_season');
    }
    setEarnedBadges(badges);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = predictions
    .slice(0, 12)
    .reverse()
    .map((p) => ({
      label: p.matchdayLabel,
      pts: p.points ?? 0,
    }));

  const filteredHistory =
    historyFilter === 'exact'
      ? predictions.filter((p) => p.isExact)
      : historyFilter === 'zero'
        ? predictions.filter((p) => (p.points ?? 0) === 0)
        : predictions;

  const accuracy = matchdaysPlayed > 0 ? Math.round((exactCount / matchdaysPlayed) * 100) : 0;
  const allBadgeTypes: BadgeType[] = [
    'first_prediction',
    'exact_prediction',
    'streak_3',
    'streak_5',
    'streak_10',
    'top_weekly',
    'top_monthly',
    'top_season',
  ];
  const lockedBadges = allBadgeTypes.filter((b) => !earnedBadges.includes(b));

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#16a34a' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 'lg', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 4 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'rgba(22, 163, 74, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontWeight: 800, color: '#16a34a', fontSize: '1rem' }}>GO</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
              Goalactico
            </Typography>
            {profile?.subscription_status === 'active' && (
              <Chip icon={<StarIcon sx={{ fontSize: '0.9rem' }} />} label="PAID" size="small" sx={{ bgcolor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', fontWeight: 700 }} />
            )}
          </Stack>
          {profile?.created_at && (
            <Typography sx={{ color: '#9ca3af', fontSize: '0.85rem', mb: 0.5 }}>
              Member since {formatMemberSince(profile.created_at)}
            </Typography>
          )}
          <Stack direction="row" flexWrap="wrap" alignItems="center" sx={{ mt: 1, gap: 2 }}>
            {globalRank != null && (
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem' }}>
                #{globalRank} GLOBAL RANK
              </Typography>
            )}
            <Typography sx={{ color: '#eab308', fontWeight: 700, fontSize: '1.1rem' }}>
              {totalPoints}pts TOTAL POINTS
            </Typography>
            <Typography sx={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
              {thisWeekPoints}pts THIS WEEK
            </Typography>
            <Typography sx={{ color: '#a855f7', fontWeight: 700, fontSize: '1rem' }}>
              {earnedBadges.length} BADGES
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            SEASON {seasonName}
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            Matchdays played: <strong style={{ color: '#fff' }}>{matchdaysPlayed}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Points per matchday chart */}
      <Card sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
            Points Per Matchday
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.85rem', mb: 2 }}>
            Last {chartData.length} matchdays – FT Goals
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: CHART_BAR_COLOR }} />
            <Typography sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>Total pts</Typography>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: CHART_FT_COLOR, ml: 1 }} />
            <Typography sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>FT Goals pts</Typography>
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 180, mt: 2 }}>
            {chartData.map((d, i) => (
              <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: '100%',
                    height: `${Math.min(100, (d.pts / CHART_MAX_PTS) * 100)}%`,
                    minHeight: d.pts > 0 ? 8 : 0,
                    borderRadius: '4px 4px 0 0',
                    bgcolor: CHART_FT_COLOR,
                  }}
                />
                <Typography sx={{ color: '#6b7280', fontSize: '0.7rem', mt: 0.5 }}>{d.label}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <BarChartIcon sx={{ color: '#ec4899', fontSize: '1.1rem' }} />
              </Box>
              <Typography sx={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>{matchdaysPlayed}</Typography>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>Matchdays played</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <EmojiEventsIcon sx={{ color: '#ec4899', fontSize: '1.1rem' }} />
              </Box>
              <Typography sx={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>{exactCount}</Typography>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>Exact hits (out of {matchdaysPlayed})</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <PercentIcon sx={{ color: '#3b82f6', fontSize: '1.1rem' }} />
              </Box>
              <Typography sx={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>{accuracy}%</Typography>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>Exact hit rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <WhatshotIcon sx={{ color: '#f97316', fontSize: '1.1rem' }} />
              </Box>
              <Typography sx={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>{bestStreak}</Typography>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>Consecutive with pts</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Badges */}
      <Card sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>Badges</Typography>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                {earnedBadges.length} earned – {lockedBadges.length} locked
              </Typography>
            </Box>
            <Button size="small" sx={{ color: '#60a5fa', textTransform: 'none' }}>View all</Button>
          </Box>
          <Grid container spacing={2}>
            {allBadgeTypes.map((type) => {
              const earned = earnedBadges.includes(type);
              const info = BADGE_INFO[type];
              return (
                <Grid item xs={12} sm={6} md={4} key={type}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.08)',
                      bgcolor: earned ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                      opacity: earned ? 1 : 0.7,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: earned ? 'rgba(234,179,8,0.2)' : 'rgba(107,114,128,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {earned ? (
                          <EmojiEventsIcon sx={{ color: '#eab308', fontSize: '1.25rem' }} />
                        ) : (
                          <LockIcon sx={{ color: '#6b7280', fontSize: '1.1rem' }} />
                        )}
                      </Box>
                      <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{info?.label ?? type}</Typography>
                        <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>{info?.description ?? ''}</Typography>
                        {earned && (
                          <Typography sx={{ color: '#16a34a', fontSize: '0.75rem', mt: 0.5 }}>Earned</Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Prediction history */}
      <Card sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
            Prediction History
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup
              value={historyFilter}
              exclusive
              onChange={(_, v) => v != null && setHistoryFilter(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': { color: '#9ca3af', borderColor: 'rgba(255,255,255,0.12)', textTransform: 'none' },
                '& .Mui-selected': { color: '#60a5fa', borderColor: '#60a5fa', bgcolor: 'rgba(96,165,250,0.1)' },
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="exact">Exact only</ToggleButton>
              <ToggleButton value="zero">0 pts</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <TableContainer sx={{ borderRadius: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                <TableRow>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Matchday</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Date</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>FT Goals</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.map((row) => {
                  const diff = row.actual_total_goals != null ? row.predicted_total_goals - row.actual_total_goals : null;
                  const pts = row.points ?? 0;
                  return (
                    <TableRow key={row.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                      <TableCell sx={{ color: '#fff', fontWeight: 600 }}>
                        {row.matchdayLabel}
                        {row.isExact && <FavoriteIcon sx={{ fontSize: '0.9rem', color: '#ec4899', ml: 0.5, verticalAlign: 'middle' }} />}
                      </TableCell>
                      <TableCell sx={{ color: '#9ca3af' }}>{new Date(row.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell sx={{ color: '#e5e7eb' }}>
                        {row.predicted_total_goals}
                        {row.actual_total_goals != null && (
                          <Typography component="span" sx={{ color: row.isExact ? '#16a34a' : '#9ca3af', fontSize: '0.8rem', ml: 0.5 }}>
                            {row.isExact ? '(Exact)' : diff != null && diff !== 0 ? `(${diff > 0 ? '+' : ''}${diff})` : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: pts > 0 ? '#16a34a' : '#f97316', fontWeight: 700 }}>
                          {pts > 0 ? `+${pts}` : pts}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ color: '#6b7280', fontSize: '0.8rem', textAlign: 'center', mt: 2 }}>
            Click any row to see full breakdown per game type
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
