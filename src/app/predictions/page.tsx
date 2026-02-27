"use client";

import {
  Box,
  Typography,
  Stack,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  TextField,
  Chip,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MatchDay } from '@/types/database';
import { isMatchDayLocked, isAfterCutoff, getMatchDayStatus } from '@/lib/predictionRules';
import Link from 'next/link';

interface GameRow {
  id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
}

interface MatchDayWithMeta extends MatchDay {
  leagueName: string;
  matchDayLabel: string;
  games: GameRow[];
}
function formatTime(dateString: string | null | undefined) {
  if (!dateString) return '--:--';
  return dateString.replace(/.*T(\d\d:\d\d).*/, '$1');
}

function formatCutoff(cutoffString: string | null | undefined) {
  if (!cutoffString) return '';
  const d = new Date(cutoffString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PredictionRow({
  label,
  desc,
  value,
  onChange,
  disabled,
  showUpgrade,
}: {
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  showUpgrade: boolean;
}) {
  return (
    <Card sx={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, minWidth: 0 }}>
          <CheckCircleIcon sx={{ color: '#16a34a', fontSize: '1.25rem', mt: 0.25, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>{label}</Typography>
            <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>{desc}</Typography>
          </Box>
        </Box>
        {showUpgrade ? (
          <Link
            href="/paywall"
            style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: 600 }}
          >
            Upgrade to unlock
          </Link>
        ) : (
          <TextField
            size="small"
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            inputProps={{ min: 0, style: { color: '#fff', textAlign: 'right' } }}
            sx={{
              width: 80,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#111',
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function PredictionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchDayIdFromUrl = searchParams.get('matchDayId');

  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [matchDays, setMatchDays] = useState<MatchDayWithMeta[]>([]);
  const [selectedMatchDay, setSelectedMatchDay] = useState<MatchDayWithMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ftGoals, setFtGoals] = useState<string>('');
  const [htGoals, setHtGoals] = useState<string>('');
  const [ftCorners, setFtCorners] = useState<string>('');
  const [htCorners, setHtCorners] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPaidUser, setIsPaidUser] = useState(false);

  const fetchMatchDays = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, league_id, name')
        .eq('is_active', true);

      if (seasonsError || !seasonsData?.length) {
        setMatchDays([]);
        setIsLoading(false);
        return;
      }

      const leagueIds = [...new Set(seasonsData.map((s: { league_id: string }) => s.league_id))];
      const { data: leaguesData } = await supabase
        .from('leagues')
        .select('id, name')
        .in('id', leagueIds);

      const leaguesMap = new Map((leaguesData || []).map((l: { id: string; name: string }) => [l.id, l.name]));

      const allMatchDays: MatchDayWithMeta[] = [];
      const now = new Date();
      const futureEnd = new Date(now);
      futureEnd.setDate(futureEnd.getDate() + 60);

      for (const season of seasonsData) {
        const { data: mdList, error: mdError } = await supabase
          .from('match_days')
          .select('*')
          .eq('season_id', season.id)
          .gte('match_date', now.toISOString().slice(0, 10))
          .lte('match_date', futureEnd.toISOString().slice(0, 10))
          .order('match_date', { ascending: true });

        if (mdError || !mdList?.length) continue;

        const leagueName = leaguesMap.get(season.league_id) || 'League';
        const seasonName = season.name || '';
        const matchDayNum = seasonName.replace(/\D/g, '') || mdList.length;

        for (const md of mdList) {
          const gamesResult = await supabase
            .from('games')
            .select(`
              id,
              kickoff_at,
              home_team_rel:teams!games_home_team_fkey(name),
              away_team_rel:teams!games_away_team_fkey(name)
            `)
            .eq('match_day_id', md.id)
            .order('kickoff_at', { ascending: true });

          let rawGames: Array<Record<string, unknown>> = [];
          if (gamesResult.error) {
            const fallback = await supabase
              .from('games')
              .select('id, kickoff_at, home_team, away_team')
              .eq('match_day_id', md.id)
              .order('kickoff_at', { ascending: true });
            rawGames = (fallback.data as Array<Record<string, unknown>>) || [];
          } else {
            rawGames = (gamesResult.data as Array<Record<string, unknown>>) || [];
          }

          const games: GameRow[] = rawGames.map((g) => {
            const row = g as Record<string, unknown> & {
              home_team_rel?: { name?: string };
              away_team_rel?: { name?: string };
              home_team?: string;
              away_team?: string;
            };
            return {
              id: row.id as string,
              home_team_name: row.home_team_rel?.name ?? (row.home_team as string) ?? 'TBD',
              away_team_name: row.away_team_rel?.name ?? (row.away_team as string) ?? 'TBD',
              kickoff_at: (row.kickoff_at as string) || '',
            };
          });

          allMatchDays.push({
            ...md,
            leagueName,
            matchDayLabel: `${leagueName} — Matchday ${matchDayNum}`,
            games,
          });
        }
      }

      allMatchDays.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
      setMatchDays(allMatchDays);

      const toSelect = matchDayIdFromUrl
        ? allMatchDays.find((md) => md.id === matchDayIdFromUrl) ?? null
        : allMatchDays[0] ?? null;
      setSelectedMatchDay(toSelect);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load match days');
      setMatchDays([]);
    } finally {
      setIsLoading(false);
    }
  }, [matchDayIdFromUrl]);

  useEffect(() => {
    fetchMatchDays();
  }, [fetchMatchDays]);

  // Profile is updated by /api/stripe/webhook after checkout (paywall → checkout → Stripe → webhook → profiles)
  const fetchProfilePaidStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, subscription_status')
      .eq('id', user.id)
      .maybeSingle();
    setIsPaidUser(profile?.account_type === 'paid' || profile?.subscription_status === 'active');
  }, []);

  // Load user profile (subscription) on mount and when returning from payment
  useEffect(() => {
    fetchProfilePaidStatus();
  }, [fetchProfilePaidStatus]);

  // Refetch profile when page becomes visible (e.g. after returning from Stripe/paywall) or when subscription=success
  useEffect(() => {
    if (searchParams.get('subscription') === 'success') fetchProfilePaidStatus();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchProfilePaidStatus(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [searchParams, fetchProfilePaidStatus]);

  useEffect(() => {
    if (!selectedMatchDay) {
      setFtGoals('');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('predictions')
        .select('predicted_total_goals')
        .eq('user_id', user.id)
        .eq('match_day_id', selectedMatchDay.id)
        .maybeSingle();
      if (!cancelled && data?.predicted_total_goals != null) {
        setFtGoals(String(data.predicted_total_goals));
      } else if (!cancelled) {
        setFtGoals('');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMatchDay?.id]);

  const afterCutoff = selectedMatchDay
    ? isAfterCutoff(selectedMatchDay.cutoff_at, selectedMatchDay.games)
    : false;
  const lockedByKickoff = selectedMatchDay ? isMatchDayLocked(selectedMatchDay.games) : false;

  const handleUpdatePrediction = async () => {
    if (!selectedMatchDay) return;
    if (afterCutoff) {
      toast.error('Predictions are locked after the cutoff time.');
      return;
    }
    const locked = lockedByKickoff;
    if (locked) {
      toast.error('Predictions are locked after the first match kicks off.');
      return;
    }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/signin');
        setIsSaving(false);
        return;
      }
      const value = parseInt(ftGoals, 10);
      if (Number.isNaN(value) || value < 0) {
        toast.error('Enter a valid number for Full-Time Goals');
        setIsSaving(false);
        return;
      }
      const res = await fetch('/api/predictions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ matchDayId: selectedMatchDay.id, predicted_total_goals: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to save prediction');
      } else {
        toast.success('Prediction updated');
      }
    } catch (err) {
      toast.error('Failed to save prediction');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#24262F', minHeight: '100vh', py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2 }}>
        {/* Go back */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ color: '#9ca3af', mb: 2, '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}
        >
          Go back
        </Button>
        {/* Header */}
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
          Predictions
        </Typography>
        <Typography sx={{ color: '#999', fontSize: '0.95rem', mb: 1 }}>
          Make your predictions before the cutoff and earn points.
        </Typography>
        {!isPaidUser && (
          <Typography sx={{ color: '#f59e0b', fontSize: '0.85rem', mb: 2 }}>
            Free plan: Full-Time Goals only. Upgrade for HT Goals, Corners and more.
          </Typography>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v: 'open' | 'history') => setActiveTab(v)}
          sx={{
            mb: 3,
            '& .MuiTabs-indicator': { backgroundColor: '#16a34a' },
            '& .MuiTab-root': { color: '#999', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: '#16a34a' },
          }}
        >
          <Tab value="open" label="Open Predictions" />
          <Tab value="history" label="History" />
        </Tabs>

        {activeTab === 'history' ? (
          <Card sx={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <CardContent>
              <Typography sx={{ color: '#999', textAlign: 'center', py: 4 }}>
                Prediction history will appear here.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {/* Left: Match day list */}
            <Grid item xs={12} md={4}>
              <Typography sx={{ color: '#999', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                Select Match Day
              </Typography>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: '#16a34a' }} />
                </Box>
              ) : (
                <Stack spacing={1}>
                  {matchDays.map((md) => {
                    const isSelected = selectedMatchDay?.id === md.id;
                    return (
                      <Box
                        key={md.id}
                        onClick={() => setSelectedMatchDay(md)}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(22, 163, 74, 0.2)' : 'transparent',
                          border: isSelected ? '1px solid rgba(22, 163, 74, 0.5)' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                        }}
                      >
                        <Box>
                          <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                            {md.matchDayLabel}
                          </Typography>
                          <Typography sx={{ color: '#999', fontSize: '0.8rem' }}>
                            {formatShortDate(md.match_date)}
                          </Typography>
                        </Box>
                        {isSelected && <CheckCircleIcon sx={{ color: '#16a34a', fontSize: '1.2rem' }} />}
                      </Box>
                    );
                  })}
                  {!isLoading && matchDays.length === 0 && (
                    <Typography sx={{ color: '#999', py: 2 }}>No open match days.</Typography>
                  )}
                </Stack>
              )}
            </Grid>

            {/* Right: Match day detail + predictions */}
            <Grid item xs={12} md={8}>
              {selectedMatchDay && (
                <Stack spacing={3}>
                  {/* Match day header */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                        {selectedMatchDay.matchDayLabel}
                      </Typography>
                      <Typography sx={{ color: '#999', fontSize: '0.9rem' }}>
                        {formatLongDate(selectedMatchDay.match_date)}
                      </Typography>
                      <Typography sx={{ color: '#f59e0b', fontSize: '0.85rem', mt: 0.5 }}>
                        Cutoff: {formatCutoff(selectedMatchDay.cutoff_at)}
                      </Typography>
                    </Box>
                    <Chip
                      label={getMatchDayStatus(selectedMatchDay, selectedMatchDay.games)}
                      size="small"
                      sx={{
                        backgroundColor:
                          getMatchDayStatus(selectedMatchDay, selectedMatchDay.games) === 'completed'
                            ? 'rgba(107, 114, 128, 0.3)'
                            : getMatchDayStatus(selectedMatchDay, selectedMatchDay.games) === 'live'
                              ? 'rgba(234, 179, 8, 0.25)'
                              : 'rgba(22, 163, 74, 0.25)',
                        color:
                          getMatchDayStatus(selectedMatchDay, selectedMatchDay.games) === 'completed'
                            ? '#9ca3af'
                            : getMatchDayStatus(selectedMatchDay, selectedMatchDay.games) === 'live'
                              ? '#eab308'
                              : '#16a34a',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  </Box>

                  {/* Matches */}
                  <Box>
                    <Typography sx={{ color: '#999', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                      Matches
                    </Typography>
                    <Stack spacing={1}>
                      {selectedMatchDay.games.map((g) => (
                        <Box
                          key={g.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 1,
                            px: 1.5,
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>{g.home_team_name}</Typography>
                            <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>vs</Typography>
                            <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>{g.away_team_name}</Typography>
                          </Box>
                          <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
                            {formatTime(g.kickoff_at)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  {/* Your predictions */}
                  <Box>
                    <Typography sx={{ color: '#999', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                      Your Predictions
                    </Typography>
                    <Stack spacing={2}>
                      {/* Full-Time Goals: always show input; disabled after cutoff */}
                      <PredictionRow
                        label="Full-Time Goals"
                        desc="Total combined FT goals across all matches."
                        value={ftGoals}
                        onChange={setFtGoals}
                        disabled={afterCutoff}
                        showUpgrade={false}
                      />
                      {/* Half-Time Goals: paid before cutoff = input; free = Upgrade to unlock; after cutoff = disabled input */}
                      <PredictionRow
                        label="Half-Time Goals"
                        desc="Total combined HT goals across all matches."
                        value={htGoals}
                        onChange={setHtGoals}
                        disabled={afterCutoff}
                        showUpgrade={!isPaidUser && !afterCutoff}
                      />
                      <PredictionRow
                        label="Full-Time Corners"
                        desc="Total combined FT corners across all matches."
                        value={ftCorners}
                        onChange={setFtCorners}
                        disabled={afterCutoff}
                        showUpgrade={!isPaidUser && !afterCutoff}
                      />
                      <PredictionRow
                        label="Half-Time Corners"
                        desc="Total combined HT corners across all matches."
                        value={htCorners}
                        onChange={setHtCorners}
                        disabled={afterCutoff}
                        showUpgrade={!isPaidUser && !afterCutoff}
                      />
                    </Stack>
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isSaving || afterCutoff}
                    onClick={handleUpdatePrediction}
                    sx={{
                      py: 1.5,
                      backgroundColor: afterCutoff ? '#555' : '#16a34a',
                      fontWeight: 700,
                      '&:hover': { backgroundColor: afterCutoff ? '#555' : '#15803d' },
                    }}
                  >
                    {afterCutoff ? 'PREDICTIONS LOCKED' : isSaving ? 'Saving…' : 'Save Predictions'}
                  </Button>
                </Stack>
              )}
              {!selectedMatchDay && !isLoading && (
                <Typography sx={{ color: '#999', py: 4 }}>Select a match day to make predictions.</Typography>
              )}
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
}
