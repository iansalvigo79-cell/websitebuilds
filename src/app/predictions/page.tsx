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
  Grid,
  Tooltip,
} from '@mui/material';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MatchDay } from '@/types/database';
import { isMatchDayLocked, isAfterCutoff, getMatchDayStatus } from '@/lib/predictionRules';
import { formatUKTime } from '@/lib/timezoneUtils';
import ModernLoader from '@/components/ui/ModernLoader';

interface GameRow {
  id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
  competition_name?: string | null;
  competition_short_name?: string | null;
}

interface MatchDayWithMeta extends MatchDay {
  competitionName: string;
  matchDayLabel: string;
  games: GameRow[];
  seasonIsActive: boolean;
  seasonName: string;
}

function formatTime(dateString: string | null | undefined) {
  if (!dateString) return '--:--';
  return dateString.replace(/.*T(\d\d:\d\d).*/, '$1');
}

function formatCutoff(cutoffString: string | null | undefined) {
  if (!cutoffString) return '';
  return formatUKTime(cutoffString);
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PredictionRow({
  label,
  badgeText,
  badgeColor,
  badgeBackground,
  value,
  onChange,
  disabled,
  accentColor,
}: {
  label: string;
  badgeText: string;
  badgeColor: string;
  badgeBackground: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  accentColor: string;
}) {
  return (
    <Card sx={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
            {label}
          </Typography>
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              mt: 0.75,
              px: 1,
              py: 0.3,
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 800,
              backgroundColor: badgeBackground,
              color: badgeColor,
              letterSpacing: '0.04em',
            }}
          >
            {badgeText}
          </Box>
        </Box>
        <TextField
          size="small"
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          inputProps={{ min: 0, style: { color: '#fff', textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 } }}
          sx={{
            width: 100,
            '& .MuiInputBase-root': {
              backgroundColor: '#111827',
              borderRadius: '8px',
            },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor },
          }}
        />
      </CardContent>
    </Card>
  );
}

function UpgradeCard({
  title,
  description,
  onUpgrade,
}: {
  title: string;
  description: string;
  onUpgrade: () => void;
}) {
  return (
    <Box
      sx={{
        backgroundColor: 'rgba(234,179,8,0.05)',
        border: '1px solid rgba(234,179,8,0.3)',
        borderRadius: '10px',
        p: 2.5,
      }}
    >
      <Typography sx={{ color: '#eab308', fontSize: '1rem', fontWeight: 800, mb: 1 }}>
        🔒 {title} — UPGRADE TO UNLOCK
      </Typography>
      <Typography sx={{ color: '#9ca3af', fontSize: '0.9rem', mb: 2 }}>
        {description}
      </Typography>
      <Button
        onClick={onUpgrade}
        sx={{
          background: 'linear-gradient(135deg, #eab308, #d97706)',
          color: '#000',
          fontWeight: 900,
          borderRadius: '8px',
          px: 3,
          py: 1.5,
          textTransform: 'none',
        }}
      >
        UPGRADE FOR £5/MONTH →
      </Button>
    </Box>
  );
}

// â”€â”€ Isolated component for useSearchParams â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MUST be its own component wrapped directly in <Suspense>
function SearchParamsHandler({
  onMatchDayId,
  onSubscriptionSuccess,
  onProfileRefetch,
}: {
  onMatchDayId: (id: string | null) => void;
  onSubscriptionSuccess: () => void;
  onProfileRefetch: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Pass matchDayId up to parent
    onMatchDayId(searchParams.get('matchDayId'));

    // Refetch profile if returning from successful payment
    if (searchParams.get('subscription') === 'success') {
      onSubscriptionSuccess();
      onProfileRefetch();
    }
  }, [searchParams, onMatchDayId, onSubscriptionSuccess, onProfileRefetch]);

  return null;
}

// â”€â”€ Main predictions content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PredictionsContent() {
  const router = useRouter();

  const [matchDayIdFromUrl, setMatchDayIdFromUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab]                 = useState<'open' | 'history'>('open');
  const [matchDays, setMatchDays]                 = useState<MatchDayWithMeta[]>([]);
  const [selectedMatchDay, setSelectedMatchDay]   = useState<MatchDayWithMeta | null>(null);
  const [isLoading, setIsLoading]                 = useState(true);
  const [ftGoals, setFtGoals]                     = useState<string>('');
  const [htGoals, setHtGoals]                     = useState<string>('');
  const [ftCorners, setFtCorners]                 = useState<string>('');
  const [htCorners, setHtCorners]                 = useState<string>('');
  const [isSaving, setIsSaving]                   = useState(false);
  const [isPaidUser, setIsPaidUser]               = useState(false);

  // â”€â”€ Fetch profile / paid status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchProfilePaidStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_type, stripe_subscription_id')
        .eq('id', user.id)
        .single();                              // â† use single() not maybeSingle()

      if (error) {
        console.error('Profile fetch error:', error.message);
        return;
      }

      const paid =
        profile?.account_type === 'paid' ||     // â† primary check
        Boolean(profile?.stripe_subscription_id); // â† fallback check

      console.log('account_type:', profile?.account_type, '| isPaid:', paid);
      setIsPaidUser(paid);
    } catch (err) {
      console.error('fetchProfilePaidStatus error:', err);
    }
  }, []);

  useEffect(() => {
    fetchProfilePaidStatus();
  }, [fetchProfilePaidStatus]);

  // Refetch profile when tab becomes visible (e.g. returning from Stripe)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchProfilePaidStatus();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchProfilePaidStatus]);

  // â”€â”€ Fetch match days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchMatchDays = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, league_id, name, is_active');

      if (seasonsError || !seasonsData?.length) {
        setMatchDays([]);
        setIsLoading(false);
        return;
      }

      const competitionIds = [...new Set(seasonsData.map((s: { league_id: string }) => s.league_id).filter(Boolean))] as string[];
      const competitionsData = competitionIds.length
        ? await supabase
          .from('competitions')
          .select('id, name')
          .in('id', competitionIds)
        : { data: [] as { id: string; name: string }[] };

      const competitionsMap = new Map(
        (competitionsData.data || []).map((c: { id: string; name: string }) => [c.id, c.name])
      );

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

        const competitionName = competitionsMap.get(season.league_id) || 'Competition';
        const seasonName   = season.name || '';
        const matchDayNum  = seasonName.replace(/\D/g, '') || mdList.length;

        for (const md of mdList) {
          const gamesResult = await supabase
            .from('games')
            .select(`
              id,
              kickoff_at,
              home_team_rel:teams!games_home_team_fkey(name),
              away_team_rel:teams!games_away_team_fkey(name),
              competitions(id, name, short_name)
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
              competitions?: { name?: string; short_name?: string | null };
            };
            return {
              id:             row.id as string,
              home_team_name: row.home_team_rel?.name ?? (row.home_team as string) ?? 'TBD',
              away_team_name: row.away_team_rel?.name ?? (row.away_team as string) ?? 'TBD',
              kickoff_at:     (row.kickoff_at as string) || '',
              competition_name: row.competitions?.name ?? null,
              competition_short_name: row.competitions?.short_name ?? null,
            };
          });

          allMatchDays.push({
            ...md,
            competitionName,
            matchDayLabel: `${competitionName} - Matchday ${matchDayNum}`,
            games,
            name: (md as { name?: string | null }).name ?? null,
            seasonIsActive: Boolean((season as { is_active?: boolean }).is_active),
            seasonName,
          });
        }
      }

      allMatchDays.sort((a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );
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

  // â”€â”€ Load existing prediction for selected matchday â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!selectedMatchDay) { setFtGoals(''); return; }
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('predictions')
        .select('predicted_total_goals, predicted_ht_goals, predicted_total_corners, predicted_ht_corners')
        .eq('user_id', user.id)
        .eq('match_day_id', selectedMatchDay.id)
        .maybeSingle();
      if (cancelled) return;
      setFtGoals(data?.predicted_total_goals != null ? String(data.predicted_total_goals) : '');
      setHtGoals(data?.predicted_ht_goals != null ? String(data.predicted_ht_goals) : '');
      setFtCorners(data?.predicted_total_corners != null ? String(data.predicted_total_corners) : '');
      setHtCorners(data?.predicted_ht_corners != null ? String(data.predicted_ht_corners) : '');
    })();
    return () => { cancelled = true; };
  }, [selectedMatchDay?.id]);

  const isSeasonClosed = selectedMatchDay ? !selectedMatchDay.seasonIsActive : false;
  const afterCutoff    = selectedMatchDay ? isAfterCutoff(selectedMatchDay.cutoff_at, selectedMatchDay.games) : false;
  const lockedByKickoff = selectedMatchDay ? isMatchDayLocked(selectedMatchDay.games) : false;
  const matchDayStatus = selectedMatchDay ? getMatchDayStatus(selectedMatchDay, selectedMatchDay.games) : 'upcoming';
  const isOpenStatus = !isSeasonClosed && matchDayStatus === 'upcoming';
  const competitionSections = selectedMatchDay ? (() => {
    const sections: { name: string; shortName: string | null; games: GameRow[] }[] = [];
    const seen = new Map<string, { name: string; shortName: string | null; games: GameRow[] }>();
    selectedMatchDay.games.forEach((game) => {
      const name = game.competition_name || 'Other';
      if (!seen.has(name)) {
        const entry = { name, shortName: game.competition_short_name ?? null, games: [] as GameRow[] };
        seen.set(name, entry);
        sections.push(entry);
      }
      seen.get(name)?.games.push(game);
    });
    return sections;
  })() : [];

  // â”€â”€ Save prediction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleUpdatePrediction = async () => {
    if (!selectedMatchDay) return;
    if (isSeasonClosed) { toast.error('Season has ended. Predictions are locked.'); return; }
    if (afterCutoff) { toast.error('Predictions are locked after the cutoff time.'); return; }
    if (lockedByKickoff) { toast.error('Predictions are locked after the first match kicks off.'); return; }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push('/signin'); setIsSaving(false); return; }

      const value = parseInt(ftGoals, 10);
      if (Number.isNaN(value) || value < 0) {
        toast.error('Enter a valid number for Full-Time Goals');
        setIsSaving(false);
        return;
      }
      const parseOptional = (raw: string, label: string) => {
        if (!raw) return null;
        const val = parseInt(raw, 10);
        if (Number.isNaN(val) || val < 0) {
          throw new Error(`Enter a valid number for ${label}`);
        }
        return val;
      };
      let htVal: number | null = null;
      let cornersVal: number | null = null;
      let htCornersVal: number | null = null;
      try {
        htVal = parseOptional(htGoals, 'Half Time Goals');
        cornersVal = parseOptional(ftCorners, 'Total Corners');
        htCornersVal = parseOptional(htCorners, 'Half Time Corners');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Invalid input');
        setIsSaving(false);
        return;
      }
      const res = await fetch('/api/predictions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          matchDayId: selectedMatchDay.id,
          predicted_total_goals: value,
          predicted_ht_goals: htVal,
          predicted_total_corners: cornersVal,
          predicted_ht_corners: htCornersVal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to save prediction');
      } else {
        toast.success('Prediction updated');
      }
    } catch {
      toast.error('Failed to save prediction');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#24262F', minHeight: '100vh', py: 4 }}>

      {/* â”€â”€ useSearchParams isolated here in its own Suspense â”€â”€ */}
      <Suspense fallback={null}>
        <SearchParamsHandler
          onMatchDayId={setMatchDayIdFromUrl}
          onSubscriptionSuccess={() => {}}
          onProfileRefetch={fetchProfilePaidStatus}
        />
      </Suspense>

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
          <Tab value="open"    label="Open Predictions" />
          <Tab value="history" label="History" />
        </Tabs>

        {/* History tab */}
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
                <ModernLoader
                  label="Loading Matchdays"
                  sublabel="Syncing available fixtures..."
                  minHeight={220}
                />
              ) : (
                <Stack spacing={1}>
                  {matchDays.map((md) => {
                    const isSelected = selectedMatchDay?.id === md.id;
                    const content = (
                      <Box
                        key={md.id}
                        onClick={() => setSelectedMatchDay(md)}
                        sx={{
                          p: 1.5, borderRadius: 1, cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(22,163,74,0.2)' : 'transparent',
                          border: isSelected ? '1px solid rgba(22,163,74,0.5)' : '1px solid transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                        }}
                      >
                        <Box>
                          <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                            {md.name || md.matchDayLabel}
                          </Typography>
                          <Typography sx={{ color: '#999', fontSize: '0.8rem' }}>
                            {formatShortDate(md.match_date)}
                          </Typography>
                        </Box>
                        {isSelected && <CheckCircleIcon sx={{ color: '#16a34a', fontSize: '1.2rem' }} />}
                      </Box>
                    );
                    return md.name ? (
                      <Tooltip key={md.id} title={md.name} placement="right">
                        <Box>{content}</Box>
                      </Tooltip>
                    ) : (
                      content
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      {selectedMatchDay.name ? (
                        <>
                          <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: { xs: '1.6rem', md: '2rem' } }}>
                            {selectedMatchDay.name}
                          </Typography>
                          <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem' }}>
                            {formatLongDate(selectedMatchDay.match_date)}
                          </Typography>
                        </>
                      ) : (
                        <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: { xs: '1.6rem', md: '2rem' } }}>
                          {formatLongDate(selectedMatchDay.match_date)}
                        </Typography>
                      )}
                      <Typography sx={{ color: '#f59e0b', fontSize: '0.9rem', mt: 0.75 }}>
                        Cutoff: {formatCutoff(selectedMatchDay.cutoff_at)}
                      </Typography>
                      <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', mt: 1 }}>
                        Enter your predictions below before the cutoff time. The closer you are to the actual score, the more points you earn!
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderRadius: 999,
                        border: isOpenStatus ? '1px solid rgba(22,163,74,0.5)' : '1px solid rgba(107,114,128,0.4)',
                        backgroundColor: isOpenStatus ? 'rgba(22,163,74,0.2)' : 'rgba(107,114,128,0.2)',
                      }}
                    >
                      {isOpenStatus && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#16a34a',
                            boxShadow: '0 0 0 0 rgba(22,163,74,0.6)',
                            animation: 'pulse-open 1.5s infinite',
                            '@keyframes pulse-open': {
                              '0%': { boxShadow: '0 0 0 0 rgba(22,163,74,0.6)' },
                              '70%': { boxShadow: '0 0 0 8px rgba(22,163,74,0)' },
                              '100%': { boxShadow: '0 0 0 0 rgba(22,163,74,0)' },
                            },
                          }}
                        />
                      )}
                      <Typography sx={{ color: isOpenStatus ? '#16a34a' : '#9ca3af', fontWeight: 800, fontSize: '0.85rem' }}>
                        {isOpenStatus ? 'OPEN' : 'CLOSED'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Matches */}
                  <Box>
                    <Typography sx={{ color: '#999', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                      Matches
                    </Typography>
                    <Stack spacing={2}>
                      {competitionSections.map((section) => (
                        <Box key={section.name}>
                          <Box
                            sx={{
                              backgroundColor: 'rgba(255,255,255,0.03)',
                              borderLeft: '3px solid #16a34a',
                              px: 2,
                              py: 1,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                          >
                            <Typography sx={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700 }}>
                              {section.name}
                            </Typography>
                          </Box>
                          <Stack spacing={1} sx={{ mt: 1 }}>
                            {section.games.map((g) => (
                              <Box
                                key={g.id}
                                sx={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  py: 1, px: 1.5, borderRadius: 1,
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
                      ))}
                    </Stack>
                  </Box>

                  {/* Prediction inputs */}
                  <Box>
                    <Typography sx={{ color: '#999', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', mb: 1.5 }}>
                      Your Predictions
                    </Typography>
                    <Stack spacing={2}>
                      <PredictionRow
                        label="⚽ FULL TIME GOALS"
                        badgeText="FREE"
                        badgeColor="#16a34a"
                        badgeBackground="rgba(22,163,74,0.15)"
                        value={ftGoals}
                        onChange={setFtGoals}
                        disabled={afterCutoff || isSeasonClosed}
                        accentColor="#16a34a"
                      />
                      {!isPaidUser ? (
                        <>
                          <UpgradeCard
                            title="HALF TIME GOALS"
                            description="Predict HT Goals and earn bonus points every matchday!"
                            onUpgrade={() => router.push('/paywall')}
                          />
                          <UpgradeCard
                            title="TOTAL CORNERS"
                            description="Predict total corners and rack up extra points every matchday!"
                            onUpgrade={() => router.push('/paywall')}
                          />
                          <UpgradeCard
                            title="HALF TIME CORNERS"
                            description="Predict HT corners and unlock even more ways to score big."
                            onUpgrade={() => router.push('/paywall')}
                          />
                        </>
                      ) : (
                        <>
                          <PredictionRow
                            label="🕐 HALF TIME GOALS"
                            badgeText="PRO"
                            badgeColor="#eab308"
                            badgeBackground="rgba(234,179,8,0.15)"
                            value={htGoals}
                            onChange={setHtGoals}
                            disabled={afterCutoff || isSeasonClosed}
                            accentColor="#3b82f6"
                          />
                          <PredictionRow
                            label="🚩 TOTAL CORNERS"
                            badgeText="PRO"
                            badgeColor="#eab308"
                            badgeBackground="rgba(234,179,8,0.15)"
                            value={ftCorners}
                            onChange={setFtCorners}
                            disabled={afterCutoff || isSeasonClosed}
                            accentColor="#f97316"
                          />
                          <PredictionRow
                            label="🔺 HALF TIME CORNERS"
                            badgeText="PRO"
                            badgeColor="#eab308"
                            badgeBackground="rgba(234,179,8,0.15)"
                            value={htCorners}
                            onChange={setHtCorners}
                            disabled={afterCutoff || isSeasonClosed}
                            accentColor="#a855f7"
                          />
                        </>
                      )}
                    </Stack>
                  </Box>

                  {/* Save button */}
                  <Box
                    sx={{
                      position: { xs: 'sticky', md: 'static' },
                      bottom: { xs: 16, md: 'auto' },
                      zIndex: 3,
                      pt: 1,
                      backgroundColor: { xs: '#24262F', md: 'transparent' },
                    }}
                  >
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={isSaving || afterCutoff || isSeasonClosed}
                      onClick={handleUpdatePrediction}
                      sx={{
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 900,
                        borderRadius: 2,
                        backgroundColor: afterCutoff || isSeasonClosed ? '#555' : '#16a34a',
                        '&:hover': { backgroundColor: afterCutoff || isSeasonClosed ? '#555' : '#15803d' },
                      }}
                    >
                      {isSeasonClosed ? 'SEASON ENDED' : afterCutoff ? 'PREDICTIONS LOCKED' : isSaving ? 'Savingâ€¦' : 'Save Predictions'}
                    </Button>
                  </Box>
                </Stack>
              )}
              {!selectedMatchDay && !isLoading && (
                <Typography sx={{ color: '#999', py: 4 }}>
                  Select a match day to make predictions.
                </Typography>
              )}
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
}

// â”€â”€ Page export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function PredictionsPage() {
  return (
    <Suspense
      fallback={
        <ModernLoader
          label="Loading Predictions"
          sublabel="Preparing matchday data..."
          minHeight="100vh"
          sx={{ backgroundColor: '#24262F' }}
        />
      }
    >
      <PredictionsContent />
    </Suspense>
  );
}

