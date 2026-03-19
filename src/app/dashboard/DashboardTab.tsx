"use client";

import { Box, Typography, Stack, Button, Card, CardContent } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import PrizeWidget from './PrizeWidget';
import ModernLoader from '@/components/ui/ModernLoader';
import { getUKTimestamp } from '@/lib/timezoneUtils';

interface CompetitionInfo {
  name?: string | null;
  short_name?: string | null;
  icon?: string | null;
}

interface OpenMatchdayGame {
  id: string;
  kickoff_at: string | null;
  home_team: string | number | null;
  away_team: string | number | null;
  home_team_rel?: { name?: string | null } | null;
  away_team_rel?: { name?: string | null } | null;
  competitions?: CompetitionInfo | CompetitionInfo[] | null;
}

interface OpenMatchday {
  id: string;
  name?: string | null;
  match_date: string;
  cutoff_at: string;
  seasons?: { name?: string | null } | null;
  games?: OpenMatchdayGame[] | null;
}

interface PredictionInputs {
  ftGoals: string;
  htGoals: string;
  ftCorners: string;
  htCorners: string;
}

const defaultPredictionInputs: PredictionInputs = {
  ftGoals: '',
  htGoals: '',
  ftCorners: '',
  htCorners: '',
};

export default function DashboardTab() {
  const router = useRouter();
  const [openMatchdays, setOpenMatchdays] = useState<OpenMatchday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [predictionInputs, setPredictionInputs] = useState<Record<string, PredictionInputs>>({});
  const [isSavingPredictions, setIsSavingPredictions] = useState<Record<string, boolean>>({});
  const [teamNameMap, setTeamNameMap] = useState<Record<string, string>>({});
  const nowTs = now.getTime();

  const getGameCompetition = (game: OpenMatchdayGame): CompetitionInfo | null => {
    const rel = game.competitions;
    if (Array.isArray(rel)) return rel[0] ?? null;
    return rel ?? null;
  };

  const getTeamName = (value: string | number | null | undefined, rel?: { name?: string | null } | null) => {
    if (rel?.name) return rel.name;
    if (value !== null && value !== undefined) {
      const key = String(value);
      if (teamNameMap[key]) return teamNameMap[key];
    }
    return 'TBD';
  };
  const matchdayIdsKey = openMatchdays.map((matchday) => matchday.id).join('|');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!user) {
        setIsPaidUser(false);
        setSubscriptionStatus(null);
        setCurrentUserId(null);
        return;
      }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, stripe_subscription_id, subscription_status')
        .eq('id', user.id)
        .single();
      if (!isMounted) return;
      const paid = profile?.account_type === 'paid'
        || Boolean(profile?.stripe_subscription_id)
        || profile?.subscription_status === 'active';
      setIsPaidUser(Boolean(paid));
      setSubscriptionStatus(profile?.subscription_status ?? null);
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!openMatchdays.length) {
      setTeamNameMap({});
      return;
    }
    let isMounted = true;
    const fetchTeamNames = async () => {
      const ids = new Set<string>();
      openMatchdays.forEach((matchday) => {
        matchday.games?.forEach((game) => {
          if (!game.home_team_rel?.name && game.home_team !== null && game.home_team !== undefined) {
            ids.add(String(game.home_team));
          }
          if (!game.away_team_rel?.name && game.away_team !== null && game.away_team !== undefined) {
            ids.add(String(game.away_team));
          }
        });
      });

      if (ids.size === 0) {
        if (isMounted) setTeamNameMap({});
        return;
      }

      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', Array.from(ids));

      if (!isMounted) return;
      if (error) {
        console.warn('Failed to fetch team names:', error);
        setTeamNameMap({});
        return;
      }

      const map: Record<string, string> = {};
      (data || []).forEach((row: { id: string | number; name?: string | null }) => {
        if (row.name) {
          map[String(row.id)] = row.name;
        }
      });
      setTeamNameMap(map);
    };

    fetchTeamNames();
    return () => {
      isMounted = false;
    };
  }, [openMatchdays]);

  useEffect(() => {
    let isMounted = true;
    const fetchOpenMatchdays = async () => {
      try {
        const { data, error } = await supabase
          .from('match_days')
          .select(`
            id, name, match_date, cutoff_at, is_open,
            seasons ( name ),
            games (
              id, kickoff_at,
              home_team, away_team,
              home_team_rel:teams!games_home_team_fkey(name),
              away_team_rel:teams!games_away_team_fkey(name),
              competitions ( name, short_name, icon )
            )
          `)
          .eq('is_open', true)
          .gt('cutoff_at', new Date().toISOString())
          .order('match_date', { ascending: true });

        if (!isMounted) return;
        if (error) {
          console.error('Error fetching open matchdays:', error);
          setOpenMatchdays([]);
          return;
        }
        setOpenMatchdays((data as OpenMatchday[]) ?? []);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOpenMatchdays();
    const interval = setInterval(fetchOpenMatchdays, 60_000);
    const channel = supabase
      .channel('matchdays-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_days' }, () => {
        fetchOpenMatchdays();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        fetchOpenMatchdays();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const matchdayIds = matchdayIdsKey ? matchdayIdsKey.split('|') : [];
    if (!currentUserId || matchdayIds.length === 0) {
      setPredictionInputs({});
      return;
    }

    let isMounted = true;
    const fetchExisting = async () => {
      let existingData: Array<Record<string, unknown>> | null = null;

      const { data: primaryData, error: primaryError } = await supabase
        .from('predictions')
        .select('match_day_id, predicted_total_goals, predicted_half_time_goals, predicted_ft_corners, predicted_ht_corners')
        .eq('user_id', currentUserId)
        .in('match_day_id', matchdayIds);

      if (primaryError) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('predictions')
          .select('match_day_id, predicted_total_goals, predicted_ht_goals, predicted_total_corners, predicted_ht_corners')
          .eq('user_id', currentUserId)
          .in('match_day_id', matchdayIds);

        if (fallbackError) {
          console.error('Predictions fetch error:', fallbackError);
          toast.error('Failed to load predictions');
          return;
        }
        existingData = (fallbackData as Array<Record<string, unknown>>) ?? [];
      } else {
        existingData = (primaryData as Array<Record<string, unknown>>) ?? [];
      }

      if (!isMounted) return;

      setPredictionInputs((prev) => {
        const next: Record<string, PredictionInputs> = {};
        matchdayIds.forEach((id) => {
          next[id] = prev[id] ?? { ...defaultPredictionInputs };
        });

        (existingData || []).forEach((row) => {
          const rowAny = row as Record<string, unknown>;
          const htGoalsValue = rowAny.predicted_half_time_goals ?? rowAny.predicted_ht_goals;
          const ftCornersValue = rowAny.predicted_ft_corners ?? rowAny.predicted_total_corners;
          next[rowAny.match_day_id as string] = {
            ftGoals: rowAny.predicted_total_goals !== null && rowAny.predicted_total_goals !== undefined
              ? String(rowAny.predicted_total_goals)
              : '',
            htGoals: htGoalsValue !== null && htGoalsValue !== undefined
              ? String(htGoalsValue)
              : '',
            ftCorners: ftCornersValue !== null && ftCornersValue !== undefined
              ? String(ftCornersValue)
              : '',
            htCorners: rowAny.predicted_ht_corners !== null && rowAny.predicted_ht_corners !== undefined
              ? String(rowAny.predicted_ht_corners)
              : '',
          };
        });

        return next;
      });
    };

    fetchExisting();
    return () => {
      isMounted = false;
    };
  }, [currentUserId, matchdayIdsKey]);

  const handleSavePredictions = async (matchdayId: string) => {
    if (!currentUserId || !matchdayId) {
      toast.error('Failed to save predictions');
      return;
    }

    const inputs = predictionInputs[matchdayId] ?? defaultPredictionInputs;

    setIsSavingPredictions((prev) => ({ ...prev, [matchdayId]: true }));
    const basePayload = {
      user_id: currentUserId,
      match_day_id: matchdayId,
      predicted_total_goals: inputs.ftGoals !== '' ? parseInt(inputs.ftGoals, 10) : null,
      predicted_ht_corners: inputs.htCorners !== '' ? parseInt(inputs.htCorners, 10) : null,
    };

    const { error: primaryError } = await supabase
      .from('predictions')
      .upsert({
        ...basePayload,
        predicted_half_time_goals: inputs.htGoals !== '' ? parseInt(inputs.htGoals, 10) : null,
        predicted_ft_corners: inputs.ftCorners !== '' ? parseInt(inputs.ftCorners, 10) : null,
      },
      { onConflict: 'user_id, match_day_id' });

    if (primaryError) {
      const { error: fallbackError } = await supabase
        .from('predictions')
        .upsert({
          ...basePayload,
          predicted_ht_goals: inputs.htGoals !== '' ? parseInt(inputs.htGoals, 10) : null,
          predicted_total_corners: inputs.ftCorners !== '' ? parseInt(inputs.ftCorners, 10) : null,
        },
        { onConflict: 'user_id, match_day_id' });

      if (fallbackError) {
        console.error('Predictions save error:', fallbackError);
        toast.error(fallbackError.message || 'Failed to save predictions');
        setIsSavingPredictions((prev) => ({ ...prev, [matchdayId]: false }));
        return;
      }
    }

    setIsSavingPredictions((prev) => ({ ...prev, [matchdayId]: false }));
    toast.success(`Predictions saved! \u2705`);
  };

  const formatGameDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '--/--/----, --:--:--';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '--/--/----, --:--:--';
    const d = date.toLocaleDateString('en-GB');
    const t = date.toLocaleTimeString('en-GB', { hour12: false });
    return `${d}, ${t}`;
  };

  const formatMatchdayDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMatchdayCountdown = (cutoffAt: string | null | undefined) => {
    if (!cutoffAt) {
      return {
        countdownLabel: 'Closes soon',
        countdownColor: '#9ca3af',
        isClosingHour: false,
        isClosingSoon: false,
        isClosed: false,
      };
    }

    const timeRemainingMs = getUKTimestamp(cutoffAt) - nowTs;
    if (timeRemainingMs <= 0) {
      return {
        countdownLabel: 'Predictions Closed',
        countdownColor: '#9ca3af',
        isClosingHour: false,
        isClosingSoon: false,
        isClosed: true,
      };
    }
    const remainingMinutes = Math.max(0, Math.ceil(timeRemainingMs / 60000));
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;
    const countdownLabel = `Closes in ${remainingHours}h ${remainingMins}m`;
    const isClosingHour = remainingMinutes > 0 && remainingMinutes <= 60;
    const isClosingSoon = remainingMinutes > 0 && remainingMinutes <= 15;
    const countdownColor = isClosingSoon ? '#ef4444' : isClosingHour ? '#f97316' : '#9ca3af';

    return { countdownLabel, countdownColor, isClosingHour, isClosingSoon, isClosed: false };
  };

  const getSortedMatchdayGames = (games?: OpenMatchdayGame[] | null) => (games ?? [])
    .slice()
    .sort((a, b) => {
      const aTime = a.kickoff_at ? new Date(a.kickoff_at).getTime() : 0;
      const bTime = b.kickoff_at ? new Date(b.kickoff_at).getTime() : 0;
      return aTime - bTime;
    });

  const handleLockedClick = () => router.push('/subscription');

  const updatePredictionValue = (matchdayId: string, field: keyof PredictionInputs, value: string) => {
    setPredictionInputs((prev) => ({
      ...prev,
      [matchdayId]: {
        ...defaultPredictionInputs,
        ...prev[matchdayId],
        [field]: value,
      },
    }));
  };

  const renderPredictionBox = (
    label: string,
    value: string,
    onChange: (next: string) => void,
    locked: boolean,
    tierLabel?: string,
    lockReason?: 'upgrade' | 'closed'
  ) => {
    if (locked) {
      const isUpgrade = lockReason === 'upgrade';
      return (
        <Box
          role={isUpgrade ? 'button' : undefined}
          tabIndex={isUpgrade ? 0 : undefined}
          onClick={isUpgrade ? handleLockedClick : undefined}
          onKeyDown={isUpgrade ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleLockedClick();
            }
          } : undefined}
          sx={{
            position: 'relative',
            backgroundColor: '#111',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            p: 2.25,
            overflow: 'hidden',
            cursor: isUpgrade ? 'pointer' : 'default',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.015) 6px, rgba(255,255,255,0.015) 12px)',
              pointerEvents: 'none',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </Typography>
              <Box
                sx={{
                  px: 1.1,
                  py: 0.2,
                  borderRadius: 999,
                  background: isUpgrade ? 'rgba(251,191,36,0.2)' : 'rgba(107,114,128,0.2)',
                  color: isUpgrade ? '#fbbf24' : '#9ca3af',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                {isUpgrade ? 'PRO' : 'CLOSED'}
              </Box>
            </Box>

            <Stack spacing={0.8} sx={{ mt: 1.4 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(251,191,36,0.12)',
                  border: '1px solid rgba(251,191,36,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LockIcon sx={{ fontSize: '1rem', color: '#fbbf24' }} />
              </Box>
              <Typography sx={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                {isUpgrade ? 'Upgrade to predict' : 'Predictions closed'}
              </Typography>
              {isUpgrade && (
                <Typography sx={{ fontSize: '10px', color: '#fbbf24', fontWeight: 600, cursor: 'pointer' }}>
                  {`Unlock for \u00A35/mo \u2192`}
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          position: 'relative',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          p: 2.25,
          cursor: 'text',
        }}
      >
        <Typography sx={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </Typography>
        <Box
          sx={{
            mt: 1.2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 56,
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 8px 18px rgba(0,0,0,0.25)',
          }}
        >
          <Box
            component="input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            sx={{
              width: '100%',
              maxWidth: '140px',
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#ffffff',
              textAlign: 'center',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              appearance: 'textfield',
              MozAppearance: 'textfield',
              '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
              '::placeholder': {
                color: 'rgba(255,255,255,0.35)',
              },
            }}
          />
        </Box>
        {tierLabel && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              px: 1.2,
              py: 0.2,
              borderRadius: 999,
              background: tierLabel === 'FREE' ? 'rgba(22,163,74,0.18)' : 'rgba(234,179,8,0.18)',
              color: tierLabel === 'FREE' ? '#16a34a' : '#eab308',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            {tierLabel}
          </Box>
        )}
      </Box>
    );
  };

  if (isLoading) {
    return (
      <ModernLoader
        label="Loading Matchdays"
        sublabel="Preparing prediction inputs..."
        minHeight="60vh"
      />
    );
  }

  const showUpgradeBanner = !isPaidUser && subscriptionStatus !== 'active';

  return (
    <Box>
      {openMatchdays.length > 0 ? (
        <Stack spacing={3} sx={{ mb: 3 }}>
          {openMatchdays.map((matchday) => {
            const matchdayTitle = matchday.name || 'GoalPrize MatchDay';
            const seasonName = matchday.seasons?.name;
            const matchdayGames = getSortedMatchdayGames(matchday.games);
            const { countdownLabel, countdownColor, isClosingSoon, isClosingHour, isClosed } = getMatchdayCountdown(matchday.cutoff_at);
            const inputs = predictionInputs[matchday.id] ?? defaultPredictionInputs;
            const isSaving = Boolean(isSavingPredictions[matchday.id]);
            const getLockReason = (field: keyof PredictionInputs) => {
              if (isClosed) return 'closed' as const;
              if (!isPaidUser && field !== 'ftGoals') return 'upgrade' as const;
              return undefined;
            };
            const ftGoalsLock = getLockReason('ftGoals');
            const htGoalsLock = getLockReason('htGoals');
            const ftCornersLock = getLockReason('ftCorners');
            const htCornersLock = getLockReason('htCorners');

            return (
              <Card
                key={matchday.id}
                sx={{
                  background: 'rgba(12, 14, 18, 0.96)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.35), 0 0 0 1px rgba(22,163,74,0.18) inset',
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                  <Stack spacing={2.5}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.2,
                        py: 0.4,
                        borderRadius: 999,
                        background: isClosed ? 'rgba(107,114,128,0.2)' : 'rgba(34,197,94,0.18)',
                        color: isClosed ? '#9ca3af' : '#22c55e',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        width: 'fit-content',
                      }}
                    >
                      {isClosed ? 'MATCHDAY CLOSED' : 'MATCHDAY OPEN'}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box component="span" sx={{ fontSize: '1.2rem' }}>{`\u{1F310}`}</Box>
                          <Typography sx={{ color: '#ffffff', fontWeight: 900, fontSize: '1.05rem' }}>
                            {matchdayTitle}
                          </Typography>
                        </Stack>
                        <Typography sx={{ color: '#9ca3af', fontSize: '0.9rem', mt: 0.6 }}>
                          {seasonName && (
                            <>
                              {seasonName}
                              <Box component="span" sx={{ color: '#6b7280', mx: 1 }}>
                                {`\u00B7`}
                              </Box>
                            </>
                          )}
                          {formatMatchdayDate(matchday.match_date)}
                          <Box component="span" sx={{ color: '#6b7280', mx: 1 }}>
                            {`\u00B7`}
                          </Box>
                          {matchdayGames.length} {matchdayGames.length === 1 ? 'game' : 'games'}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          px: 1.6,
                          py: 0.6,
                          borderRadius: 999,
                          background: isClosed
                            ? 'rgba(107,114,128,0.2)'
                            : isClosingSoon
                              ? 'rgba(239,68,68,0.2)'
                              : isClosingHour
                                ? 'rgba(249,115,22,0.2)'
                                : 'rgba(107,114,128,0.2)',
                          color: isClosed ? '#9ca3af' : countdownColor,
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {countdownLabel}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                      {renderPredictionBox(
                        'FT Goals',
                        inputs.ftGoals,
                        (next) => updatePredictionValue(matchday.id, 'ftGoals', next),
                        Boolean(ftGoalsLock),
                        'FREE',
                        ftGoalsLock
                      )}
                      {renderPredictionBox(
                        'HT Goals',
                        inputs.htGoals,
                        (next) => updatePredictionValue(matchday.id, 'htGoals', next),
                        Boolean(htGoalsLock),
                        !isPaidUser ? 'PRO' : undefined,
                        htGoalsLock
                      )}
                      {renderPredictionBox(
                        'FT Corners',
                        inputs.ftCorners,
                        (next) => updatePredictionValue(matchday.id, 'ftCorners', next),
                        Boolean(ftCornersLock),
                        !isPaidUser ? 'PRO' : undefined,
                        ftCornersLock
                      )}
                      {renderPredictionBox(
                        'HT Corners',
                        inputs.htCorners,
                        (next) => updatePredictionValue(matchday.id, 'htCorners', next),
                        Boolean(htCornersLock),
                        !isPaidUser ? 'PRO' : undefined,
                        htCornersLock
                      )}
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                        MATCHES IN THIS MATCHDAY
                      </Typography>
                      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        {matchdayGames.length === 0 ? (
                          <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', py: 1.5 }}>
                            No games added yet.
                          </Typography>
                        ) : (
                          matchdayGames.map((game) => {
                            const competition = getGameCompetition(game);
                            const badgeLabel = competition?.name || competition?.short_name || '-';
                            const kickoffLabel = formatGameDateTime(game.kickoff_at);
                            return (
                              <Box
                                key={game.id}
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1.2fr 1fr 1fr' },
                                  alignItems: 'center',
                                  gap: 1,
                                  py: 1.1,
                                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                                  transition: 'background-color 0.2s ease',
                                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
                                  '&:last-child': { borderBottom: 'none' },
                                }}
                              >
                                <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>
                                  {getTeamName(game.home_team, game.home_team_rel)}
                                </Typography>
                                <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>
                                  {getTeamName(game.away_team, game.away_team_rel)}
                                </Typography>
                                <Box>
                                  {badgeLabel === '-' ? (
                                    <Typography sx={{ color: '#6b7280', fontSize: '0.8rem', textAlign: { xs: 'left', sm: 'center' } }}>
                                      -
                                    </Typography>
                                  ) : (
                                    <Box
                                      sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        borderRadius: '999px',
                                        px: 1,
                                        py: '4px',
                                        fontSize: '0.7rem',
                                        color: '#ffffff',
                                        textAlign: 'center',
                                        lineHeight: 1.2,
                                        letterSpacing: '0.01em',
                                      }}
                                    >
                                      <Box component="span" sx={{ px: 0.5 }}>
                                        {badgeLabel}
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                                <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: { xs: 'left', sm: 'right' } }}>
                                  {kickoffLabel}
                                </Typography>
                              </Box>
                            );
                          })
                        )}
                      </Box>
                    </Box>

                    <Button
                      fullWidth
                      onClick={() => handleSavePredictions(matchday.id)}
                      disabled={isSaving || isClosed}
                      sx={{
                        background: isClosed ? '#374151' : 'linear-gradient(135deg, #16a34a, #22c55e)',
                        color: isClosed ? '#e5e7eb' : '#000',
                        fontWeight: 800,
                        fontSize: '1rem',
                        py: 1.75,
                        borderRadius: '10px',
                        textTransform: 'none',
                        '&:hover': { backgroundColor: isClosed ? '#374151' : '#15803d' },
                      }}
                    >
                      {isClosed ? 'PREDICTIONS CLOSED' : `SAVE PREDICTIONS \u2192`}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <Card
          sx={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            p: 2.5,
            mb: 3,
          }}
        >
          <Typography sx={{ color: '#6b7280' }}>
            No open matchdays available right now. Check back soon.
          </Typography>
        </Card>
      )}

      {showUpgradeBanner && (
        <Box
          sx={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.35)',
            borderRadius: '14px',
            p: { xs: 2.5, md: 3 },
            mb: 3,
          }}
        >
          <Typography sx={{ color: '#fbbf24', fontWeight: 800, fontSize: '14px', mb: 1 }}>
            {`\u{1F451} Unlock All 4 Prediction Games`}
          </Typography>
          <Stack spacing={1.1} sx={{ mb: 1.5 }}>
            {[
              { name: 'FT Goals', pill: '✓ Free', type: 'free' },
              { name: 'HT Goals', pill: '🔒 Pro', type: 'pro' },
              { name: 'FT Corners', pill: '🔒 Pro', type: 'pro' },
              { name: 'HT Corners', pill: '🔒 Pro', type: 'pro' },
            ].map((game) => (
              <Box key={game.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{game.name}</Typography>
                <Box
                  sx={{
                    backgroundColor: game.type === 'free' ? 'rgba(22,163,74,0.2)' : 'rgba(251,191,36,0.2)',
                    color: game.type === 'free' ? '#22c55e' : '#fbbf24',
                    borderRadius: 999,
                    px: 1.2,
                    py: 0.4,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                  }}
                >
                  {game.pill}
                </Box>
              </Box>
            ))}
          </Stack>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', mb: 2 }}>
            {`Upgrade for just \u00A35/month and earn 4x more points every matchday`}
          </Typography>
          <Button
            fullWidth
            onClick={() => router.push('/subscription')}
            sx={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#0a0a0a',
              fontWeight: 800,
              fontSize: '0.95rem',
              py: 1.5,
              borderRadius: '10px',
              textTransform: 'uppercase',
            }}
          >
            {`\u{1F451} Upgrade Now \u2014 \u00A35/Month \u2192`}
          </Button>
        </Box>
      )}

      <PrizeWidget />
    </Box>
  );
}


