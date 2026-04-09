"use client";

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BadgeType } from '@/types/database';
import { BADGE_CATALOG, getBadgeLabel, getBadgeDescription, getBadgeIcon } from '@/lib/badges';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import LockIcon from '@mui/icons-material/Lock';
import ModernLoader from '@/components/ui/ModernLoader';

interface PredictionRow {
  id: string;
  match_day_id: string;
  match_date: string;
  matchdayLabel: string;
  matchdayName: string;
  predicted_total_goals: number;
  predicted_half_time_goals?: number | null;
  predicted_ft_corners?: number | null;
  predicted_ht_corners?: number | null;
  actual_total_goals: number | null;
  actual_ht_goals?: number | null;
  actual_total_corners?: number | null;
  actual_ht_corners?: number | null;
  points: number | null;
  ft_points: number | null;
  ht_goals_points?: number | null;
  corners_points?: number | null;
  ht_corners_points?: number | null;
  isExact: boolean;
}

interface ProfileInfo {
  created_at: string;
  subscription_status: string;
  account_type?: 'free' | 'paid';
  display_name: string;
}

type HistoryFilter = 'all' | 'exact' | 'last5';


const cardSx = { backgroundColor: '#161a23', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' };

const fmtMember = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const initials = (n?: string) => (n || 'Goalactico').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const weekStart = (d: Date) => { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day + (day === 0 ? -6 : 1)); x.setHours(0, 0, 0, 0); return x; };

type AccuracyField =
  | 'predicted_total_goals'
  | 'predicted_half_time_goals'
  | 'predicted_ft_corners'
  | 'predicted_ht_corners'
  | 'actual_total_goals'
  | 'actual_ht_goals'
  | 'actual_total_corners'
  | 'actual_ht_corners';

const calcAccuracyRatio = (
  rows: PredictionRow[],
  predictedField: AccuracyField,
  actualField: AccuracyField
): number | null => {
  const valid = rows.filter((r) => r[predictedField] != null && r[actualField] != null);
  if (valid.length === 0) return null;
  const totalAccuracy = valid.reduce((sum, r) => {
    const predicted = Number(r[predictedField] ?? 0);
    const actual = Number(r[actualField] ?? 0);
    if (actual === 0) {
      return sum + (predicted === 0 ? 1 : 0);
    }
    const error = Math.abs(predicted - actual);
    const accuracy = Math.max(0, 1 - error / actual);
    return sum + accuracy;
  }, 0);

  return Math.round((totalAccuracy / valid.length) * 100);
};

function useAnimatedNumber(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const end = Math.max(0, target);
    const start = value;
    const delta = end - start;
    if (Math.abs(delta) < 0.1) {
      setValue(end);
      return;
    }

    let raf = 0;
    const startedAt = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const p = Math.min(1, (now - startedAt) / durationMs);
      setValue(start + delta * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

export default function MyPredictionsTab() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [thisWeekPoints, setThisWeekPoints] = useState(0);
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const allBadges = BADGE_CATALOG;

  const fetchData = useCallback(async () => {
    try {

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        fetch('/api/badges/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('Supabase profile fetch error (MyPredictions):', profileError);
    }
    if (profileData) setProfile(profileData as ProfileInfo);

    const { data: seasonData, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle();
    if (seasonError) {
      console.error('Supabase season fetch error (MyPredictions):', seasonError);
    }
    const { data: predRows, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id);
    if (predError) {
      console.error('Supabase predictions fetch error (MyPredictions):', predError);
      setLoading(false);
      return;
    }
    const list = predRows || [];
    const mdIds = [...new Set(list.map((p: any) => p.match_day_id).filter(Boolean))] as string[];
    const { data: mdList, error: mdError } = mdIds.length
      ? await supabase.from('match_days').select('*').in('id', mdIds)
      : { data: [], error: null };
    if (mdError) {
      console.error('Supabase match days fetch error (MyPredictions):', mdError);
      setLoading(false);
      return;
    }
    const mdMap = new Map((mdList || []).map((m: any) => [m.id, m]));

    let rank: number | null = null;
    const seasonId = seasonData?.id;
    if (seasonId) {
      const { data: sDays, error: sDaysError } = await supabase
        .from('match_days')
        .select('id')
        .eq('season_id', seasonId);
      if (sDaysError) {
        console.error('Supabase season match days fetch error (MyPredictions):', sDaysError);
      }
      const seasonMdIds = (sDays || []).map((m: any) => m.id);
      if (seasonMdIds.length) {
        const { data: allPredData, error: allPredError } = await supabase
          .from('predictions')
          .select('*')
          .in('match_day_id', seasonMdIds);
        if (allPredError) {
          console.error('Supabase season predictions fetch error (MyPredictions):', allPredError);
        }
        const totals: Record<string, number> = {};
        (allPredData || []).forEach((p: any) => {
          const totalPoints =
            (p.points ?? 0) +
            (p.ht_goals_points ?? 0) +
            (p.corners_points ?? 0) +
            (p.ht_corners_points ?? 0);
          totals[p.user_id] = (totals[p.user_id] || 0) + totalPoints;
        });
        const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
        const idx = ranked.findIndex(([uid]) => uid === user.id);
        rank = idx >= 0 ? idx + 1 : null;
      }
    }

    const sortedMd = mdIds.map((id) => ({ id, d: mdMap.get(id)?.match_date })).filter((x) => x.d).sort((a, b) => (a.d! > b.d! ? 1 : -1)).map((x) => x.id);
    const start = weekStart(new Date());
    let total = 0;
    let week = 0;
    let exact = 0;
    const rows: PredictionRow[] = [];
    list.forEach((p: any) => {
      const md = mdMap.get(p.match_day_id); if (!md) return;
      const ftPoints = p.points ?? 0;
      const totalPoints =
        ftPoints +
        (p.ht_goals_points ?? 0) +
        (p.corners_points ?? 0) +
        (p.ht_corners_points ?? 0);
      total += totalPoints;
      if (new Date(md.match_date) >= start) week += totalPoints;
      const isExact = md.actual_total_goals != null && p.predicted_total_goals === md.actual_total_goals && ftPoints === 10;
      if (isExact) exact += 1;
      rows.push({
        id: p.id,
        match_day_id: p.match_day_id,
        match_date: md.match_date,
        matchdayLabel: `MD ${sortedMd.indexOf(p.match_day_id) + 1}`,
        matchdayName: md.name?.trim() || 'Matchday',
        predicted_total_goals: p.predicted_total_goals,
        predicted_half_time_goals: p.predicted_half_time_goals ?? null,
        predicted_ft_corners: p.predicted_ft_corners ?? null,
        predicted_ht_corners: p.predicted_ht_corners ?? null,
        actual_total_goals: md.actual_total_goals,
        actual_ht_goals: md.ht_goals ?? null,
        actual_total_corners: md.total_corners ?? null,
        actual_ht_corners: md.ht_corners ?? null,
        points: totalPoints,
        ft_points: ftPoints,
        ht_goals_points: p.ht_goals_points ?? null,
        corners_points: p.corners_points ?? null,
        ht_corners_points: p.ht_corners_points ?? null,
        isExact,
      });
    });
    rows.sort((a, b) => (b.match_date > a.match_date ? 1 : -1));
    setPredictions(rows);
    setTotalPoints(total);
    setThisWeekPoints(week);

    let streak = 0, max = 0;
    const pointsByMatchDay = new Map<string, number>();
    list.forEach((p: any) => {
      const totalPoints =
        (p.points ?? 0) +
        (p.ht_goals_points ?? 0) +
        (p.corners_points ?? 0) +
        (p.ht_corners_points ?? 0);
      pointsByMatchDay.set(p.match_day_id, totalPoints);
    });
    sortedMd.map((id) => pointsByMatchDay.get(id) ?? 0).forEach((p) => { if (p > 0) { streak += 1; max = Math.max(max, streak); } else streak = 0; });

        let badges: BadgeType[] = [];
    try {
      const { data: userBadges, error: badgeErr } = await supabase
        .from('user_badges')
        .select('badge_id, badges:badge_id (slug)')
        .eq('user_id', user.id);
      if (!badgeErr && userBadges) {
        badges = userBadges
          .map((row: any) => row.badges?.slug)
          .filter(Boolean);
      }
    } catch (err) {
      console.warn('Badge fetch error (MyPredictions):', err);
    }

    const badgeSet = new Set<BadgeType>(badges);
    if (list.length >= 1) badgeSet.add('first_prediction');
    if (exact >= 1) badgeSet.add('exact_prediction');
    if (max >= 3) badgeSet.add('streak_3');
    if (max >= 5) badgeSet.add('streak_5');
    if (max >= 10) badgeSet.add('streak_10');
    if (rank === 1) {
      badgeSet.add('top_weekly');
      badgeSet.add('top_monthly');
      badgeSet.add('top_season');
    }
    if (total >= 1) {
      badgeSet.add('total-points-first');
      if (total >= 25) badgeSet.add('total-points-25');
      if (total >= 50) badgeSet.add('total-points-50');
      if (total >= 100) badgeSet.add('total-points-100');
      if (total >= 250) badgeSet.add('total-points-250');
      if (total >= 500) badgeSet.add('total-points-500');
      if (total >= 1000) badgeSet.add('total-points-1000');
    }

    setEarnedBadges(Array.from(badgeSet));
      setLoading(false);
    } catch (err) {
      console.error('MyPredictionsTab fetch error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const completed = useMemo(() => predictions.filter((p) => p.actual_total_goals != null), [predictions]);
  const completedSorted = useMemo(
    () => [...completed].sort((a, b) => (a.match_date > b.match_date ? -1 : 1)),
    [completed]
  );
  const totalAccuracy = useMemo(
    () => calcAccuracyRatio(completed, 'predicted_total_goals', 'actual_total_goals') ?? 0,
    [completed]
  );
  const isPaid = profile?.account_type === 'paid' || profile?.subscription_status === 'active';
  const last3Accuracy = useMemo(() => {
    const slice = completedSorted.slice(0, 3);
    return calcAccuracyRatio(slice, 'predicted_total_goals', 'actual_total_goals') ?? 0;
  }, [completedSorted]);
  const thisMonthAccuracy = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const rows = completed.filter((p) => {
      const d = new Date(p.match_date);
      return d >= start && d <= end;
    });
    return calcAccuracyRatio(rows, 'predicted_total_goals', 'actual_total_goals') ?? 0;
  }, [completed]);
  const lastWeekAccuracy = useMemo(() => {
    const now = new Date();
    const thisWeekStart = weekStart(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    const rows = completed.filter((p) => {
      const d = new Date(p.match_date);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });
    return calcAccuracyRatio(rows, 'predicted_total_goals', 'actual_total_goals') ?? 0;
  }, [completed]);
  const totalGoalAccuracy = totalAccuracy;
  const htGoalAccuracy = useMemo(
    () => calcAccuracyRatio(completed, 'predicted_half_time_goals', 'actual_ht_goals'),
    [completed]
  );
  const ftCornerAccuracy = useMemo(
    () => calcAccuracyRatio(completed, 'predicted_ft_corners', 'actual_total_corners'),
    [completed]
  );
  const htCornerAccuracy = useMemo(
    () => calcAccuracyRatio(completed, 'predicted_ht_corners', 'actual_ht_corners'),
    [completed]
  );
  const avg = completed.length ? (completed.reduce((a, b) => a + (b.points ?? 0), 0) / completed.length).toFixed(1) : '0.0';
  const best = useMemo(() => completed.length ? [...completed].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0] : null, [completed]);
  const worst = useMemo(() => completed.length ? [...completed].sort((a, b) => (a.points ?? 0) - (b.points ?? 0))[0] : null, [completed]);

  const chartData = useMemo(() => [...predictions].sort((a, b) => (a.match_date > b.match_date ? 1 : -1)).slice(-12).map((p) => ({ label: p.matchdayLabel, pts: p.points ?? 0 })), [predictions]);
  const history = useMemo(() => historyFilter === 'exact' ? predictions.filter((p) => p.isExact) : historyFilter === 'last5' ? predictions.slice(0, 5) : predictions, [historyFilter, predictions]);
  const animatedTotalAccuracy = useAnimatedNumber(totalAccuracy, 900);
  const totalAccuracyDisplay = completed.length ? Math.round(animatedTotalAccuracy) : 0;
  const totalAccuracyMuted = completed.length === 0;
  const totalAccuracyColor = totalAccuracyMuted ? 'rgba(148,163,184,0.7)' : '#16a34a';
  const totalAccuracyTrack = totalAccuracyMuted ? 'rgba(148,163,184,0.2)' : 'rgba(22,163,74,0.18)';
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(history.length / pageSize));
  const paged = history.slice(page * pageSize, page * pageSize + pageSize);
  useEffect(() => { setPage(0); }, [historyFilter]);

  if (loading) {
    return (
      <ModernLoader
        label="Loading Performance Data"
        sublabel="Preparing your prediction analytics..."
        minHeight={320}
      />
    );
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 2, gap: 1 }}>
        <Box>
          <Typography sx={{ color: '#fff', fontSize: { xs: '1.2rem', md: '1.55rem' }, fontWeight: 900 }}>PERFORMANCE <Box component="span" sx={{ color: '#22c55e' }}>ANALYTICS</Box></Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.82rem' }}>Deep insights into your prediction journey</Typography>
        </Box>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}>
          <Card sx={cardSx}><CardContent sx={{ p: 2.2 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Avatar sx={{ width: 54, height: 54, bgcolor: '#fef3c7', color: '#0f172a', fontWeight: 900 }}>{initials(profile?.display_name)}</Avatar>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ color: '#fff', fontWeight: 800 }}>{profile?.display_name || 'Goalactico'}</Typography>
                  {(profile?.account_type === 'paid' || profile?.subscription_status === 'active') && <Chip label="PRO MEMBER" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(22,163,74,0.2)', color: '#4ade80', border: '1px solid rgba(22,163,74,0.45)' }} />}
                </Stack>
                <Typography sx={{ color: '#6b7280', fontSize: '0.74rem' }}>Member since {profile?.created_at ? fmtMember(profile.created_at) : '-'}</Typography>
              </Box>
            </Stack>
            <Grid container spacing={2} sx={{ mt: 1.5 }}>
              <Grid item xs={4}><Typography className="ga-label">Total Points</Typography><Typography sx={{ color: '#fff', fontSize: '1.75rem', fontWeight: 900 }}>{totalPoints.toLocaleString()}</Typography></Grid>
              <Grid item xs={4}><Typography className="ga-label">This Week</Typography><Typography sx={{ color: '#22c55e', fontSize: '1.75rem', fontWeight: 900 }}>+{thisWeekPoints}</Typography></Grid>
              <Grid item xs={4}><Typography className="ga-label">Badges</Typography><Typography sx={{ color: '#fff', fontSize: '1.75rem', fontWeight: 900 }}>{earnedBadges.length}</Typography></Grid>
            </Grid>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={cardSx}><CardContent sx={{ p: 2.2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={86}
                  thickness={4}
                  sx={{ color: totalAccuracyTrack }}
                />
                <CircularProgress
                  variant="determinate"
                  value={Math.min(100, totalAccuracyDisplay)}
                  size={86}
                  thickness={4}
                  sx={{ color: totalAccuracyColor, position: 'absolute', left: 0 }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ color: totalAccuracyMuted ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: '1rem' }}>
                    {totalAccuracyDisplay}%
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem', mt: 1 }}>Total Accuracy</Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.7rem' }}>All FT goal predictions</Typography>
            </Box>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Card sx={{ ...cardSx, mb: 2 }}><CardContent sx={{ p: 2.2 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800 }}>POINTS PERFORMANCE</Typography>
        <Typography sx={{ color: '#6b7280', fontSize: '0.72rem', mb: 1.2 }}>Your progression through the season</Typography>
        <Box sx={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1e2330', border: '1px solid rgba(22,163,74,0.5)', borderRadius: 10, color: '#fff' }} />
              <Area type="monotone" dataKey="pts" fill="rgba(22,163,74,0.14)" stroke="none" />
              <Line type="monotone" dataKey="pts" stroke="#16a34a" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent></Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>Recent Accuracy</Typography>
              {[
                { label: 'Last 3 Predictions', value: `${last3Accuracy}%` },
                { label: 'This Month', value: `${thisMonthAccuracy}%` },
                { label: 'Last Week', value: `${lastWeekAccuracy}%` },
              ].map((row) => (
                <Stack key={row.label} direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>{row.label}</Typography>
                  <Typography sx={{ color: '#d1d5db', fontSize: '0.72rem', fontWeight: 700 }}>{row.value}</Typography>
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>Game Type Accuracy</Typography>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>Total Goals Accuracy</Typography>
                <Typography sx={{ color: '#d1d5db', fontSize: '0.72rem', fontWeight: 700 }}>{totalGoalAccuracy}%</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>HT Goals Accuracy</Typography>
                {isPaid ? (
                  <Typography sx={{ color: '#d1d5db', fontSize: '0.72rem', fontWeight: 700 }}>
                    {htGoalAccuracy == null ? '—' : `${htGoalAccuracy}%`}
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <LockIcon sx={{ color: '#fbbf24', fontSize: '0.9rem' }} />
                    <Typography sx={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700 }}>Pro only</Typography>
                  </Stack>
                )}
              </Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>FT Corners Accuracy</Typography>
                {isPaid ? (
                  <Typography sx={{ color: '#d1d5db', fontSize: '0.72rem', fontWeight: 700 }}>
                    {ftCornerAccuracy == null ? '—' : `${ftCornerAccuracy}%`}
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <LockIcon sx={{ color: '#fbbf24', fontSize: '0.9rem' }} />
                    <Typography sx={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700 }}>Pro only</Typography>
                  </Stack>
                )}
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>HT Corners Accuracy</Typography>
                {isPaid ? (
                  <Typography sx={{ color: '#d1d5db', fontSize: '0.72rem', fontWeight: 700 }}>
                    {htCornerAccuracy == null ? '—' : `${htCornerAccuracy}%`}
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <LockIcon sx={{ color: '#fbbf24', fontSize: '0.9rem' }} />
                    <Typography sx={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700 }}>Pro only</Typography>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>Performance Highlights</Typography>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>Average Score</Typography>
              <Typography sx={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>{avg}</Typography>
              <Box sx={{ p: 1, borderRadius: 1.5, mt: 1, backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.35)' }}>
                <Typography sx={{ color: '#6b7280', fontSize: '0.66rem' }}>BEST MATCHDAY</Typography>
                <Typography sx={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 700 }}>
                  {best ? `${best.matchdayLabel} (${best.points ?? 0} pts)` : '-'}
                </Typography>
              </Box>
              <Box sx={{ p: 1, borderRadius: 1.5, mt: 1, backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)' }}>
                <Typography sx={{ color: '#6b7280', fontSize: '0.66rem' }}>WORST MATCHDAY</Typography>
                <Typography sx={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700 }}>
                  {worst ? `${worst.matchdayLabel} (${worst.points ?? 0} pts)` : '-'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ ...cardSx, mb: 2 }}><CardContent sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800 }}>Prediction History</Typography>
          <ToggleButtonGroup
            value={historyFilter}
            exclusive
            onChange={(_e, v: HistoryFilter | null) => v && setHistoryFilter(v)}
            size="small"
            sx={{
              p: 0.4,
              gap: 0.6,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.03)',
              '& .MuiToggleButton-root': {
                px: 1.35,
                py: 0.45,
                minHeight: 30,
                color: '#d1d5db',
                backgroundColor: 'rgba(30,35,48,0.9)',
                border: '1px solid rgba(255,255,255,0.16)',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.74rem',
                letterSpacing: '0.01em',
                borderRadius: '999px !important',
                '&:hover': {
                  backgroundColor: 'rgba(59,130,246,0.14)',
                  borderColor: 'rgba(59,130,246,0.5)',
                },
              },
              '& .MuiToggleButton-root.Mui-selected': {
                color: '#fff',
                borderColor: 'rgba(22,163,74,0.75)',
                backgroundColor: '#16a34a',
                boxShadow: '0 0 0 1px rgba(22,163,74,0.2) inset',
              },
              '& .MuiToggleButton-root.Mui-selected:hover': {
                backgroundColor: '#15803d',
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="exact">Exact only</ToggleButton>
            <ToggleButton value="last5">Last 5</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
          <Table size="small"><TableHead sx={{ backgroundColor: 'rgba(255,255,255,0.02)' }}><TableRow><TableCell>Matchday</TableCell><TableCell>Matchday Name</TableCell><TableCell>Prediction</TableCell><TableCell>Result</TableCell><TableCell>Points</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{paged.map((r) => { const totalPoints = r.points ?? 0; const ftPoints = r.ft_points ?? 0; const status = r.actual_total_goals == null ? 'PENDING' : totalPoints === 0 ? 'MISS' : ftPoints === 10 ? 'EXACT' : 'CLOSE'; const sx = status === 'EXACT' ? { bgcolor: 'rgba(22,163,74,0.18)', color: '#4ade80', border: '1px solid rgba(22,163,74,0.45)' } : status === 'CLOSE' ? { bgcolor: 'rgba(234,179,8,0.18)', color: '#fcd34d', border: '1px solid rgba(234,179,8,0.45)' } : status === 'MISS' ? { bgcolor: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.45)' } : { bgcolor: 'rgba(107,114,128,0.22)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.45)' }; return <TableRow key={r.id}><TableCell sx={{ color: '#fff', fontWeight: 700 }}>{r.matchdayLabel}</TableCell><TableCell sx={{ color: '#d1d5db' }}>{r.matchdayName}</TableCell><TableCell sx={{ color: '#fff' }}>{r.predicted_total_goals}</TableCell><TableCell sx={{ color: '#9ca3af' }}>{r.actual_total_goals ?? '-'}</TableCell><TableCell sx={{ color: '#22c55e', fontWeight: 700 }}>{r.points ?? '-'}</TableCell><TableCell><Chip label={status} size="small" sx={{ ...sx, fontWeight: 800 }} /></TableCell></TableRow>; })}</TableBody></Table>
        </TableContainer>
        <Stack direction="row" justifyContent="flex-end" spacing={0.6} sx={{ mt: 1.2 }}>{Array.from({ length: pages }).map((_, i) => <Button key={i} size="small" onClick={() => setPage(i)} sx={{ minWidth: 28, color: i === page ? '#fff' : '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: i === page ? '#16a34a' : 'transparent' }}>{i + 1}</Button>)}</Stack>
      </CardContent></Card>

      <Card sx={cardSx}><CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ color: '#fff', fontWeight: 800 }}>Achievement Badges</Typography>
        </Stack>
        <Grid container spacing={1.2}>
          {allBadges.map((badge) => {
            const unlocked = earnedBadges.includes(badge.slug);
            const lockedPaidOnly = badge.is_paid_only && !isPaid;
            const showLocked = !unlocked;
            const subtitle = lockedPaidOnly ? 'Upgrade to Pro to unlock' : getBadgeDescription(badge.slug);
            return (
              <Grid item xs={6} sm={4} md={3} key={badge.slug}>
                <Box
                  sx={{
                    p: 1.1,
                    borderRadius: 2,
                    border: unlocked ? '1px solid rgba(22,163,74,0.42)' : '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: unlocked ? 'rgba(22,163,74,0.08)' : 'rgba(255,255,255,0.02)',
                    opacity: unlocked ? 1 : 0.45,
                  }}
                  title={subtitle}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        backgroundColor: unlocked ? 'rgba(22,163,74,0.22)' : 'rgba(107,114,128,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                    >
                      {showLocked ? <LockIcon sx={{ color: '#6b7280', fontSize: '0.95rem' }} /> : getBadgeIcon(badge.slug)}
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#fff', fontSize: '0.74rem', fontWeight: 700 }}>
                        {getBadgeLabel(badge.slug)}
                      </Typography>
                      <Typography sx={{ color: '#6b7280', fontSize: '0.63rem' }}>
                        {lockedPaidOnly ? 'Pro only' : badge.category.toUpperCase()}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </CardContent></Card>
    </Box>
  );
}

















