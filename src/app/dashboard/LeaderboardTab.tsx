"use client";

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  TextField,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import RemoveIcon from '@mui/icons-material/Remove';
import LockIcon from '@mui/icons-material/Lock';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { getMatchDayStatus } from '@/lib/predictionRules';
import { calculatePoints } from '@/lib/pointsCalculator';
import ModernLoader from '@/components/ui/ModernLoader';

export type LeaderboardPeriod = 'seasonal' | 'weekly' | 'monthly' | 'matchday';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  predictions_count: number;
  exact_count: number;
  rank: number;
  trend?: 'up' | 'down' | 'same';
}

export interface MatchDayOption {
  id: string;
  name?: string | null;
  match_date: string;
  cutoff_at: string;
  actual_total_goals: number | null;
  ht_goals?: number | null;
  total_corners?: number | null;
  ht_corners?: number | null;
  season_id: string;
  status: 'upcoming' | 'live' | 'completed';
  label: string;
}

// -- Helper: resolve display name with fallback chain --
// Never returns 'Unknown' -- falls back to email prefix or 'Player'
function resolveDisplayName(display_name: string | null | undefined): string {
  if (display_name && display_name.trim() !== '') return display_name.trim();
  return 'Player';
}

function getPeriodBounds(period: LeaderboardPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start: Date;
  if (period === 'weekly') {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    return { start: new Date(0), end };
  }
  return { start, end };
}

function matchDateInRange(matchDateStr: string, period: LeaderboardPeriod, start: Date, end: Date): boolean {
  if (period === 'seasonal') return true;
  const d = new Date(matchDateStr);
  d.setHours(0, 0, 0, 0);
  return d >= start && d <= end;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

function getAccuracyTag(diff: number): { label: string; color: string } {
  if (diff === 0) return { label: 'Exact', color: '#16a34a' };
  if (diff === 1) return { label: '±1', color: '#eab308' };
  if (diff === 2) return { label: '±2', color: '#f97316' };
  if (diff === 3) return { label: '±3', color: '#ef4444' };
  return { label: '±4+', color: '#991b1b' };
}

export default function LeaderboardTab() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seasonName, setSeasonName] = useState('');
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [activeSeasonName, setActiveSeasonName] = useState('');
  const [seasonOptions, setSeasonOptions] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>('seasonal');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [matchDays, setMatchDays] = useState<MatchDayOption[]>([]);
  const [selectedMatchDayId, setSelectedMatchDayId] = useState<string | null>(null);
  const [matchdayLeaderboard, setMatchdayLeaderboard] = useState<Array<{
    user_id: string;
    display_name: string;
    predicted: number;
    points: number;
    ftPoints: number;
    htPoints: number;
    cornersPoints: number;
    htCornersPoints: number;
    totalPoints: number;
    rank: number;
    diff: number;
  }>>([]);
  const [matchdayDetail, setMatchdayDetail] = useState<{
    match_date: string;
    leagueName: string;
    actual: number;
    htGoals: number | null;
    totalCorners: number | null;
    htCorners: number | null;
    games: { home: string; away: string; score: string }[];
  } | null>(null);
  const [matchdayLoading, setMatchdayLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    if (period === 'matchday') return;
    setIsLoading(true);
    try {
      const seasonFilterId = period === 'seasonal' ? (selectedSeasonId ?? activeSeasonId) : null;
      if (period === 'seasonal' && !seasonFilterId) {
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }

      const { data: predictionsRows, error: predError } = await supabase
        .from('predictions')
        .select('*');
      if (predError || !predictionsRows?.length) {
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }

      const mdIds = [...new Set(predictionsRows.map((p: any) => p.match_day_id).filter(Boolean))];
      const { data: mdList } = mdIds.length
        ? await supabase.from('match_days').select('*').in('id', mdIds)
        : { data: [] };
      const mdMap = new Map((mdList || []).map((m: any) => [m.id, m]));

      const userIds = [...new Set(predictionsRows.map((p: any) => p.user_id).filter(Boolean))] as string[];

      // fetch email so we can fall back when display_name is blank
      const profileResult = userIds.length
        ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
        : { data: [] as { id: string; display_name: string | null; }[] };
      const profileList = profileResult.data;
      if ((profileResult as any).error) console.error('Leaderboard profiles fetch error:', (profileResult as any).error);

      // store both display_name and email in profileMap
      const profileMap = new Map(
        (profileList || []).map((p: any) => [p.id, { display_name: p.display_name }])
      );

      const rawData = predictionsRows.map((p: any) => ({
        user_id: p.user_id,
        points: p.points,
        match_day_id: p.match_day_id,
        match_days: mdMap.get(p.match_day_id) || null,
      }));

      const bounds = getPeriodBounds(period);
      const filtered = rawData.filter((pred: any) => {
        const md = pred.match_days;
        if (!md) return false;
        if (period === 'seasonal' && seasonFilterId) return md.season_id === seasonFilterId;
        if (period === 'seasonal') return true;
        return matchDateInRange(md.match_date || '', period, bounds.start, bounds.end);
      });

      const grouped: Record<string, { display_name: string; total_points: number; predictions_count: number; exact_count: number }> = {};
      filtered.forEach((pred: any) => {
        const userId = pred.user_id;
        const pointsVal =
          (pred.points ?? 0) +
          (pred.ht_goals_points ?? 0) +
          (pred.corners_points ?? 0) +
          (pred.ht_corners_points ?? 0);
        if (!grouped[userId]) {
          const profileData = profileMap.get(userId);
          grouped[userId] = {
            display_name: resolveDisplayName(profileData?.display_name),
            total_points: 0,
            predictions_count: 0,
            exact_count: 0,
          };
        }
        grouped[userId].total_points += pointsVal;
        grouped[userId].predictions_count += 1;
        if (pred.points === 10) grouped[userId].exact_count += 1;
      });

      const arr: LeaderboardEntry[] = Object.entries(grouped).map(([user_id, data]) => ({
        user_id,
        display_name: data.display_name,
        total_points: data.total_points,
        predictions_count: data.predictions_count,
        exact_count: data.exact_count,
        rank: 0,
      }));
      arr.sort((a, b) => b.total_points - a.total_points);
      arr.forEach((e, i) => { e.rank = i + 1; });
      setLeaderboard(arr);
    } catch (err) {
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [period, selectedSeasonId, activeSeasonId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) {
        console.error('Supabase Season List Error (leaderboard):', error);
        return;
      }
      const list = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        is_active: Boolean(s.is_active),
      }));
      setSeasonOptions(list);
      const active = list.find((s) => s.is_active);
      setActiveSeasonId(active?.id ?? null);
      setActiveSeasonName(active?.name ?? '');
      const fallback = active?.id ?? list[0]?.id ?? null;
      setSelectedSeasonId((prev) => prev ?? fallback);
    })();
  }, []);

  useEffect(() => {
    if (period === 'seasonal') {
      const selected = seasonOptions.find((s) => s.id === selectedSeasonId);
      if (selected) setSeasonName(selected.name);
    } else if (activeSeasonName) {
      setSeasonName(activeSeasonName);
    }
  }, [period, selectedSeasonId, seasonOptions, activeSeasonName]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (period === 'matchday' && !activeSeasonId) {
      supabase.from('seasons').select('id, name').eq('is_active', true).maybeSingle().then(({ data }) => {
        if (data) {
          setActiveSeasonId(data.id);
          setActiveSeasonName(data.name);
          if (period !== 'seasonal') setSeasonName(data.name);
        }
      });
    }
  }, [period, activeSeasonId]);

  useEffect(() => {
    if (period !== 'matchday' || !activeSeasonId) return;
    (async () => {
      const { data: mdList, error } = await supabase
        .from('match_days')
        .select('*')
        .eq('season_id', activeSeasonId)
        .order('match_date', { ascending: true });
      if (error || !mdList?.length) {
        setMatchDays([]);
        return;
      }
      const withGames = await Promise.all(
        mdList.map(async (md) => {
          const { data: games } = await supabase
            .from('games')
            .select('kickoff_at')
            .eq('match_day_id', md.id)
            .order('kickoff_at', { ascending: true });
          const status = getMatchDayStatus(
            { actual_total_goals: md.actual_total_goals },
            (games || []).map((g) => ({ kickoff_at: g.kickoff_at }))
          );
          const num = mdList.indexOf(md) + 1;
          const mdName = (md as { name?: string | null }).name ?? null;
          return { ...md, name: mdName, status, label: mdName ? `MD${num} — ${mdName}` : `MD${num}` };
        })
      );
      setMatchDays(withGames);
      if (!selectedMatchDayId && withGames.length) {
        const completed = withGames.find((m) => m.status === 'completed');
        setSelectedMatchDayId(completed?.id ?? withGames[0].id);
      }
    })();
  }, [period, activeSeasonId, selectedMatchDayId]);

  useEffect(() => {
    if (period !== 'matchday' || !selectedMatchDayId) {
      setMatchdayLeaderboard([]);
      setMatchdayDetail(null);
      return;
    }
    setMatchdayLoading(true);
    (async () => {
      try {
        const { data: md, error: mdErr } = await supabase
          .from('match_days')
          .select('*, seasons(name)')
          .eq('id', selectedMatchDayId)
          .single();
        if (mdErr || !md) {
          setMatchdayLeaderboard([]);
          setMatchdayDetail(null);
          setMatchdayLoading(false);
          return;
        }
        const mdAny = md as any;
        const actual = mdAny.actual_total_goals;
        const htGoals = mdAny.ht_goals ?? null;
        const totalCorners = mdAny.total_corners ?? null;
        const htCorners = mdAny.ht_corners ?? null;
        const leagueName = mdAny.seasons?.name || 'League';

        const { data: games } = await supabase
          .from('games')
          .select('home_team, away_team, home_goals, away_goals, home_team_rel:teams!games_home_team_fkey(name), away_team_rel:teams!games_away_team_fkey(name)')
          .eq('match_day_id', selectedMatchDayId)
          .order('kickoff_at', { ascending: true });
        let gameRows: { home: string; away: string; score: string }[] = [];
        if (games) {
          gameRows = games.map((g: any) => ({
            home: g.home_team_rel?.name || g.home_team || 'TBD',
            away: g.away_team_rel?.name || g.away_team || 'TBD',
            score: g.home_goals != null && g.away_goals != null ? `${g.home_goals}-${g.away_goals}` : '–',
          }));
        } else {
          const fallback = await supabase.from('games').select('home_team, away_team, home_goals, away_goals').eq('match_day_id', selectedMatchDayId).order('kickoff_at', { ascending: true });
          gameRows = (fallback.data || []).map((g: any) => ({
            home: g.home_team || 'TBD',
            away: g.away_team || 'TBD',
            score: g.home_goals != null && g.away_goals != null ? `${g.home_goals}-${g.away_goals}` : '–',
          }));
        }

        if (actual == null) {
          setMatchdayDetail({ match_date: mdAny.match_date, leagueName, actual: 0, htGoals, totalCorners, htCorners, games: gameRows });
          setMatchdayLeaderboard([]);
          setMatchdayLoading(false);
          return;
        }

        setMatchdayDetail({ match_date: mdAny.match_date, leagueName, actual, htGoals, totalCorners, htCorners, games: gameRows });

        const { data: preds, error: predErr } = await supabase
          .from('predictions')
          .select('*')
          .eq('match_day_id', selectedMatchDayId);
        if (predErr) {
          setMatchdayLeaderboard([]);
          setMatchdayLoading(false);
          return;
        }
        if (!preds?.length) {
          setMatchdayLeaderboard([]);
          setMatchdayLoading(false);
          return;
        }

        const userIds = [...new Set((preds as any[]).map((p) => p.user_id).filter(Boolean))] as string[];

        // fetch email for matchday leaderboard
        const profileResult = userIds.length
          ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
          : { data: [] as { id: string; display_name: string | null; }[] };
        const profileList = profileResult.data;
        // store both fields in profileMap
        const profileMap = new Map(
          (profileList || []).map((p: any) => [p.id, { display_name: p.display_name }])
        );

        const computePoints = (predVal: number | null | undefined, actualVal: number | null | undefined, stored: number | null | undefined) => {
          if (stored != null) return stored;
          if (actualVal == null || predVal == null) return 0;
          return calculatePoints(predVal, actualVal);
        };

        const withDiff = (preds as any[]).map((p) => {
          const profileData = profileMap.get(p.user_id);
          const ftPoints = computePoints(p.predicted_total_goals, actual, p.points);
          const htPoints = htGoals != null ? computePoints(p.predicted_ht_goals, htGoals, p.ht_goals_points) : 0;
          const cornersPoints = totalCorners != null ? computePoints(p.predicted_total_corners, totalCorners, p.corners_points) : 0;
          const htCornersPoints = htCorners != null ? computePoints(p.predicted_ht_corners, htCorners, p.ht_corners_points) : 0;
          const totalPoints = ftPoints + htPoints + cornersPoints + htCornersPoints;
          return {
            user_id: p.user_id,
            display_name: resolveDisplayName(profileData?.display_name),
            predicted: p.predicted_total_goals,
            points: totalPoints,
            ftPoints,
            htPoints,
            cornersPoints,
            htCornersPoints,
            totalPoints,
            diff: Math.abs((p.predicted_total_goals || 0) - actual),
          };
        });
        withDiff.sort((a, b) => b.totalPoints - a.totalPoints);
        const ranked = withDiff.map((r, i) => ({ ...r, rank: i + 1 }));
        setMatchdayLeaderboard(ranked);
      } finally {
        setMatchdayLoading(false);
      }
    })();
  }, [period, selectedMatchDayId]);

  const selectedMd = matchDays.find((m) => m.id === selectedMatchDayId);
  const liveCount = matchDays.filter((m) => m.status === 'live').length;
  const doneCount = matchDays.filter((m) => m.status === 'completed').length;
  const upcomingCount = matchDays.filter((m) => m.status === 'upcoming').length;
  const myEntry = currentUserId ? leaderboard.find((e) => e.user_id === currentUserId) : null;
  const myMatchdayEntry = currentUserId ? matchdayLeaderboard.find((e) => e.user_id === currentUserId) : null;

  const tableSx = {
    '& td, & th': { borderColor: 'rgba(255,255,255,0.12)', color: '#e5e7eb' },
  };

  return (
    <Box sx={{ maxWidth: 'lg', mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Leaderboard
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', mt: 0.5 }}>
            Skill. Pattern. Consistency. That&apos;s how you climb.
          </Typography>
        </Box>
        {seasonName && (
          <Box sx={{ border: '1px solid rgba(59, 130, 246, 0.5)', borderRadius: 2, px: 2, py: 1.5, textAlign: 'center' }}>
            <Typography sx={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Season {seasonName}
            </Typography>
            <Typography sx={{ color: '#6b7280', fontSize: '0.8rem' }}>Updated after each matchday</Typography>
          </Box>
        )}
      </Box>

      <Tabs
        value={period}
        onChange={(_, v: LeaderboardPeriod) => setPeriod(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.85rem' },
          '& .Mui-selected': { color: '#60a5fa' },
          '& .MuiTabs-indicator': { backgroundColor: '#60a5fa' },
        }}
      >
        <Tab label="Weekly" value="weekly" />
        <Tab label="Monthly" value="monthly" />
        <Tab label="Seasonal" value="seasonal" />
        <Tab
          value="matchday"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              By Matchday
              {liveCount > 0 && (
                <Chip label={`${liveCount} LIVE`} size="small" sx={{ backgroundColor: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
              )}
            </Box>
          }
        />
      </Tabs>

      {period === 'seasonal' && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
            Select Season
          </Typography>
          <TextField
            select
            size="small"
            value={selectedSeasonId ?? ''}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            sx={{
              minWidth: 240,
              input: { color: '#fff' },
              label: { color: '#94a3b8' },
              '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
            }}
          >
            {seasonOptions.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ color: '#0f172a' }}>
                {s.name}{s.is_active ? '' : ' (Closed)'}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {period === 'matchday' && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
            Select Matchday
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', mr: 1 }}>
              {doneCount} done, {liveCount} live, {upcomingCount} upcoming
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', py: 0.5, flex: 1, minWidth: 0 }}>
              {matchDays.map((md) => (
                md.name ? (
                  <Tooltip key={md.id} title={md.name} placement="top">
                    <Box
                      onClick={() => setSelectedMatchDayId(md.id)}
                      sx={{
                        px: 1.5, py: 0.75, borderRadius: 1, cursor: 'pointer',
                        border: selectedMatchDayId === md.id ? '2px solid #16a34a' : '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: selectedMatchDayId === md.id ? 'rgba(22, 163, 74, 0.15)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
                      }}
                    >
                      {md.status === 'completed' && <Box component="span" sx={{ color: '#16a34a', fontSize: '0.9rem' }}>✓</Box>}
                      {md.status === 'live' && <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f97316' }} />}
                      <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{md.label}</Typography>
                    </Box>
                  </Tooltip>
                ) : (
                  <Box
                    key={md.id}
                    onClick={() => setSelectedMatchDayId(md.id)}
                    sx={{
                      px: 1.5, py: 0.75, borderRadius: 1, cursor: 'pointer',
                      border: selectedMatchDayId === md.id ? '2px solid #16a34a' : '1px solid rgba(255,255,255,0.2)',
                      backgroundColor: selectedMatchDayId === md.id ? 'rgba(22, 163, 74, 0.15)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
                    }}
                  >
                    {md.status === 'completed' && <Box component="span" sx={{ color: '#16a34a', fontSize: '0.9rem' }}>✓</Box>}
                    {md.status === 'live' && <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f97316' }} />}
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{md.label}</Typography>
                  </Box>
                )
              ))}
            </Box>
            <Typography sx={{ color: '#6b7280', fontSize: '0.8rem', ml: 1 }}>— scroll to browse —</Typography>
          </Box>
        </Box>
      )}

      {period === 'matchday' && selectedMatchDayId && (
        <>
          {matchdayLoading ? (
            <ModernLoader
              label="Loading Matchday Leaderboard"
              sublabel="Calculating ranks and points..."
              minHeight={240}
            />
          ) : selectedMd?.status === 'upcoming' ? (
            <Box sx={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, p: 6, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <LockIcon sx={{ fontSize: 64, color: '#6b7280', mb: 2 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', mb: 0.5 }}>Not Yet Played</Typography>
              <Typography sx={{ color: '#9ca3af' }}>Leaderboard available after matchday completes.</Typography>
              {matchdayDetail && (
                <Typography sx={{ color: '#6b7280', mt: 2, fontSize: '0.9rem' }}>
                  {matchdayDetail.leagueName} · {new Date(matchdayDetail.match_date).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          ) : selectedMd?.status === 'live' ? (
            <Box sx={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, p: 6, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <ScheduleIcon sx={{ fontSize: 48, color: '#f97316', mb: 2 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', mb: 0.5 }}>Match In Progress</Typography>
              <Typography sx={{ color: '#9ca3af' }}>Leaderboard updates once all games finish.</Typography>
              {matchdayDetail?.games.length ? (
                <Box sx={{ mt: 3, textAlign: 'left', maxWidth: 320, mx: 'auto' }}>
                  {matchdayDetail.games.slice(0, 5).map((g, i) => (
                    <Typography key={i} sx={{ color: '#9ca3af', fontSize: '0.9rem' }}>{g.home} – {g.away}</Typography>
                  ))}
                </Box>
              ) : null}
            </Box>
          ) : matchdayDetail && matchdayLeaderboard.length > 0 ? (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, p: 2, mb: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <span>Matchday {matchDays.findIndex((m) => m.id === selectedMatchDayId) + 1}</span>
                  <Chip label="COMPLETED" size="small" sx={{ backgroundColor: 'rgba(22,163,74,0.25)', color: '#16a34a', fontWeight: 700 }} />
                </Box>
                <Typography sx={{ color: '#9ca3af', fontSize: '0.9rem' }} component="div">
                  {matchdayDetail.leagueName} {new Date(matchdayDetail.match_date).toLocaleDateString()}
                </Typography>
                {matchdayDetail.games.slice(0, 3).map((g, i) => (
                  <Typography key={i} sx={{ color: '#6b7280', fontSize: '0.85rem' }}>{g.home} {g.score} {g.away}</Typography>
                ))}
                <Typography sx={{ color: '#60a5fa', fontWeight: 700, mt: 1 }}>{matchdayDetail.actual} FT GOALS</Typography>
              </Box>

              <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <Table size="small" sx={tableSx}>
                  <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Player</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Predicted</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Points</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Accuracy</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* -- FIX 7: removed hardcoded Jackson and Martin rows -- */}
                    {matchdayLeaderboard.map((row) => {
                      const tag = getAccuracyTag(row.diff);
                      return (
                        <TableRow key={row.user_id}>
                          <TableCell>
                            {row.rank <= 3
                              ? <EmojiEventsIcon sx={{ color: row.rank === 1 ? '#eab308' : row.rank === 2 ? '#9ca3af' : '#b45309', fontSize: '1.25rem' }} />
                              : `#${row.rank}`}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 36, height: 36, borderRadius: 1, backgroundColor: 'rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#93c5fd', fontSize: '0.8rem' }}>
                                {getInitials(row.display_name)}
                              </Box>
                              <Typography sx={{ color: '#fff', fontWeight: 600 }}>{row.display_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: '#9ca3af' }}>{row.predicted}</TableCell>
                          <TableCell align="right">
                            <Typography sx={{ color: '#60a5fa', fontWeight: 700 }}>{row.totalPoints} pts</Typography>
                            <Typography sx={{ color: '#6b7280', fontSize: '0.7rem' }}>
                              FT {row.ftPoints} · HT {row.htPoints} · COR {row.cornersPoints} · HTC {row.htCornersPoints}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${tag.label}${row.diff > 0 ? ` off by ${row.diff}` : ''}`}
                              size="small"
                              sx={{ backgroundColor: tag.color + '22', color: tag.color, fontWeight: 600 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {myMatchdayEntry && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Your Position</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 700 }}>#{myMatchdayEntry.rank}</Typography>
                      <Box sx={{ width: 32, height: 32, borderRadius: 1, backgroundColor: 'rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#93c5fd', fontSize: '0.75rem' }}>
                        {getInitials(myMatchdayEntry.display_name)}
                      </Box>
                      <Typography sx={{ color: '#fff' }}>{myMatchdayEntry.display_name} (you)</Typography>
                    </Box>
                    <Typography sx={{ color: '#60a5fa', fontWeight: 700 }}>
                      Predicted {myMatchdayEntry.predicted} · Actual {matchdayDetail.actual} · {myMatchdayEntry.totalPoints} pts · {getAccuracyTag(myMatchdayEntry.diff).label}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5 }}>
                    <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>FT Goals: {myMatchdayEntry.ftPoints} pts</Typography>
                    <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>HT Goals: {myMatchdayEntry.htPoints} pts</Typography>
                    <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>Corners: {myMatchdayEntry.cornersPoints} pts</Typography>
                    <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>HT Corners: {myMatchdayEntry.htCornersPoints} pts</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>Total: {myMatchdayEntry.totalPoints} pts</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ) : period === 'matchday' && selectedMd?.status === 'completed' ? (
            <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>No predictions for this matchday yet.</Typography>
          ) : null}
        </>
      )}

      {period !== 'matchday' && (
        <>
          {isLoading ? (
            <ModernLoader
              label="Loading Leaderboard"
              sublabel="Aggregating score data..."
              minHeight={280}
            />
          ) : leaderboard.length === 0 ? (
            <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 6 }}>
              No predictions in this period yet. Make predictions or run &quot;Calculate points&quot; in Admin → Scores.
            </Typography>
          ) : (
            <>
              {/* Podium */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                {[
                  { offset: 1, order: 0, emoji: '🏆', color: '#9ca3af', height: 110 },
                  { offset: 0, order: 1, emoji: '👑', color: '#eab308', height: 150 },
                  { offset: 2, order: 2, emoji: '🔥', color: '#f97316', height: 90 },
                ].map(({ offset, order, emoji, color, height }) => {
                  const entry = leaderboard[offset];
                  if (!entry) return null;
                  return (
                    <Box key={entry.user_id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', order, flex: '0 0 auto' }}>
                      <Box sx={{ fontSize: '1.5rem', lineHeight: 1, mb: 0.5 }}>{emoji}</Box>
                      <Box sx={{ width: 52, height: 52, borderRadius: 2, border: `2px solid ${color}`, backgroundColor: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#e5e7eb', fontSize: '1rem' }}>
                        {getInitials(entry.display_name)}
                      </Box>
                      <Typography component="span" sx={{ color: '#fff', fontWeight: 700, mt: 0.75, maxWidth: 100, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {entry.display_name}
                      </Typography>
                      <Typography component="span" sx={{ color, fontWeight: 800, fontSize: '1rem', mt: 0.25 }}>
                        {entry.total_points} pts
                      </Typography>
                      <Box sx={{ width: 64, height, mt: 1.5, borderRadius: 2, backgroundColor: offset === 0 ? 'rgba(234,179,8,0.35)' : 'rgba(75,85,99,0.6)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', pb: 0.5 }}>
                        <Typography component="span" sx={{ color, fontWeight: 900, fontSize: '1.75rem' }}>{offset + 1}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Rankings table */}
              <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <Table size="small" sx={tableSx}>
                  <TableHead sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Player</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Points</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Exact</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Trend</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaderboard.map((entry) => (
                      <TableRow key={entry.user_id} sx={{ backgroundColor: entry.user_id === currentUserId ? 'rgba(34,211,238,0.08)' : 'transparent' }}>
                        <TableCell sx={{ color: '#e5e7eb', fontWeight: entry.rank <= 3 ? 700 : 400 }}>
                          {entry.rank <= 3
                            ? <EmojiEventsIcon sx={{ color: entry.rank === 1 ? '#eab308' : entry.rank === 2 ? '#9ca3af' : '#b45309', fontSize: '1.25rem' }} />
                            : `#${entry.rank}`}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: 1, backgroundColor: 'rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#93c5fd', fontSize: '0.85rem' }}>
                              {getInitials(entry.display_name)}
                            </Box>
                            <Box>
                              <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                {entry.display_name}{entry.user_id === currentUserId ? ' (you)' : ''}
                              </Typography>
                              <Typography sx={{ color: '#6b7280', fontSize: '0.8rem' }}>{entry.predictions_count} played</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#60a5fa', fontWeight: 700 }}>{entry.total_points} pts</TableCell>
                        <TableCell align="right">
                          <Box sx={{ px: 1, py: 0.25, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.06)', display: 'inline-block', color: '#9ca3af', fontWeight: 600 }}>
                            {entry.exact_count}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <RemoveIcon sx={{ color: '#6b7280', fontSize: '1.2rem' }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {myEntry && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Your Position</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 700 }}>#{myEntry.rank}</Typography>
                      <Box sx={{ width: 36, height: 36, borderRadius: 1, backgroundColor: 'rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#93c5fd', fontSize: '0.85rem' }}>
                        {getInitials(myEntry.display_name)}
                      </Box>
                      <Typography sx={{ color: '#fff' }}>{myEntry.display_name} (you)</Typography>
                      <Typography sx={{ color: '#6b7280', fontSize: '0.85rem' }}>{myEntry.predictions_count} played</Typography>
                    </Box>
                    <Typography sx={{ color: '#60a5fa', fontWeight: 700 }}>{myEntry.total_points} pts</Typography>
                    <Box sx={{ px: 1, py: 0.25, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.06)', color: '#9ca3af', fontWeight: 600 }}>{myEntry.exact_count} exact</Box>
                    <RemoveIcon sx={{ color: '#6b7280', fontSize: '1.2rem' }} />
                  </Box>
                </Box>
              )}
            </>
          )}
        </>
      )}

      <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
          Points Scale
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Typography component="span" sx={{ color: '#16a34a', fontWeight: 600 }}>Exact 10pts</Typography>
          <Typography component="span" sx={{ color: '#60a5fa', fontWeight: 600 }}>±1 7pts</Typography>
          <Typography component="span" sx={{ color: '#f97316', fontWeight: 600 }}>±2 4pts</Typography>
          <Typography component="span" sx={{ color: '#ef4444', fontWeight: 600 }}>±3 2pts</Typography>
          <Typography component="span" sx={{ color: '#991b1b', fontWeight: 600 }}>±4+ 0pts</Typography>
        </Box>
      </Box>
    </Box>
  );
}
