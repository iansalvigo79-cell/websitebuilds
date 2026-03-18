"use client";

import { Box, Typography, Stack, Button, Card, CardContent } from '@mui/material';
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
  games?: OpenMatchdayGame[] | null;
}

export default function DashboardTab() {
  const router = useRouter();
  const [openMatchday, setOpenMatchday] = useState<OpenMatchday | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ftGoals, setFtGoals] = useState('');
  const [htGoals, setHtGoals] = useState('');
  const [ftCorners, setFtCorners] = useState('');
  const [htCorners, setHtCorners] = useState('');
  const [isSavingPredictions, setIsSavingPredictions] = useState(false);
  const [teamNameMap, setTeamNameMap] = useState<Record<string, string>>({});
  const nowTs = now.getTime();

  const getCompetitionIcon = (competition: CompetitionInfo | null | undefined) => {
    const icon = competition?.icon?.trim();
    return icon || '\u26BD';
  };

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
        setCurrentUserId(null);
        return;
      }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, stripe_subscription_id')
        .eq('id', user.id)
        .single();
      if (!isMounted) return;
      const paid = profile?.account_type === 'paid' || Boolean(profile?.stripe_subscription_id);
      setIsPaidUser(Boolean(paid));
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!openMatchday?.games || openMatchday.games.length === 0) {
      setTeamNameMap({});
      return;
    }
    let isMounted = true;
    const fetchTeamNames = async () => {
      const ids = new Set<string>();
      openMatchday.games?.forEach((game) => {
        if (!game.home_team_rel?.name && game.home_team !== null && game.home_team !== undefined) {
          ids.add(String(game.home_team));
        }
        if (!game.away_team_rel?.name && game.away_team !== null && game.away_team !== undefined) {
          ids.add(String(game.away_team));
        }
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
  }, [openMatchday?.games]);

  useEffect(() => {
    let isMounted = true;
    const fetchOpenMatchday = async () => {
      try {
        const { data, error } = await supabase
          .from('match_days')
          .select(`
            id, name, match_date, cutoff_at,
            games (
              id, kickoff_at,
              home_team, away_team,
              home_team_rel:teams!games_home_team_fkey(name),
              away_team_rel:teams!games_away_team_fkey(name),
              competitions ( name, short_name, icon )
            )
          `)
          .gt('cutoff_at', new Date().toISOString())
          .order('match_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;
        if (error) {
          console.error('Error fetching open matchday:', error);
          setOpenMatchday(null);
          return;
        }
        setOpenMatchday((data as OpenMatchday) ?? null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOpenMatchday();
    const interval = setInterval(fetchOpenMatchday, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || !openMatchday?.id) {
      setFtGoals('');
      setHtGoals('');
      setFtCorners('');
      setHtCorners('');
      return;
    }

    let isMounted = true;
    const fetchExisting = async () => {
      const { data: existing } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('match_day_id', openMatchday.id)
        .maybeSingle();

      if (!isMounted) return;
      if (existing) {
        setFtGoals(existing.predicted_total_goals !== null && existing.predicted_total_goals !== undefined
          ? String(existing.predicted_total_goals)
          : '');
        setHtGoals(existing.predicted_ht_goals !== null && existing.predicted_ht_goals !== undefined
          ? String(existing.predicted_ht_goals)
          : '');
        setFtCorners(existing.predicted_total_corners !== null && existing.predicted_total_corners !== undefined
          ? String(existing.predicted_total_corners)
          : '');
        setHtCorners(existing.predicted_ht_corners !== null && existing.predicted_ht_corners !== undefined
          ? String(existing.predicted_ht_corners)
          : '');
        return;
      }
      setFtGoals('');
      setHtGoals('');
      setFtCorners('');
      setHtCorners('');
    };

    fetchExisting();
    return () => {
      isMounted = false;
    };
  }, [currentUserId, openMatchday?.id]);

  const handleSavePredictions = async () => {
    if (!currentUserId || !openMatchday?.id) {
      toast.error('Failed to save predictions');
      return;
    }

    setIsSavingPredictions(true);
    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: currentUserId,
        match_day_id: openMatchday.id,
        predicted_total_goals: ftGoals !== '' ? parseInt(ftGoals, 10) : null,
        predicted_ht_goals: htGoals !== '' ? parseInt(htGoals, 10) : null,
        predicted_total_corners: ftCorners !== '' ? parseInt(ftCorners, 10) : null,
        predicted_ht_corners: htCorners !== '' ? parseInt(htCorners, 10) : null,
      },
      { onConflict: 'user_id, match_day_id' });

    setIsSavingPredictions(false);

    if (error) {
      toast.error('Failed to save predictions');
      return;
    }
    toast.success('Predictions saved! \u2705');
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '00:00';
    return dateString.replace(/.*T(\d\d:\d\d).*/, '$1');
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

  const timeRemainingMs = openMatchday ? getUKTimestamp(openMatchday.cutoff_at) - nowTs : 0;
  const remainingMinutes = openMatchday ? Math.max(0, Math.ceil(timeRemainingMs / 60000)) : 0;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;
  const countdownLabel = openMatchday ? `Closes in ${remainingHours}h ${remainingMins}m` : '';
  const isClosingHour = remainingMinutes > 0 && remainingMinutes <= 60;
  const isClosingSoon = remainingMinutes > 0 && remainingMinutes <= 15;
  const countdownColor = isClosingSoon ? '#ef4444' : isClosingHour ? '#f97316' : '#9ca3af';

  const matchdayTitle = openMatchday?.name || 'GoalPrize MatchDay';
  const matchdayGames = (openMatchday?.games ?? [])
    .slice()
    .sort((a, b) => {
      const aTime = a.kickoff_at ? new Date(a.kickoff_at).getTime() : 0;
      const bTime = b.kickoff_at ? new Date(b.kickoff_at).getTime() : 0;
      return aTime - bTime;
    });

  const handleLockedClick = () => router.push('/paywall');

  const renderPredictionBox = (
    label: string,
    value: string,
    onChange: (next: string) => void,
    locked: boolean,
    tierLabel?: string
  ) => (
    <Box
      onClick={locked ? handleLockedClick : undefined}
      sx={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        p: 2.25,
        opacity: locked ? 0.4 : 1,
        cursor: locked ? 'not-allowed' : 'text',
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
          background: locked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
          border: locked ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.35)',
          boxShadow: locked
            ? 'inset 0 0 0 1px rgba(255,255,255,0.04)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 8px 18px rgba(0,0,0,0.25)',
        }}
      >
        {locked ? (
          <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: '#9ca3af', textAlign: 'center' }}>
            \u2014
          </Typography>
        ) : (
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
        )}
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

  if (isLoading) {
    return (
      <ModernLoader
        label="Loading Matchday"
        sublabel="Preparing prediction inputs..."
        minHeight="60vh"
      />
    );
  }

  return (
    <Box>
      {openMatchday ? (
        <Card
          sx={{
            background: 'rgba(12, 14, 18, 0.96)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35), 0 0 0 1px rgba(22,163,74,0.18) inset',
            mb: 3,
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Stack spacing={2.5}>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                MATCHDAY OPEN
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box component="span" sx={{ fontSize: '1.2rem' }}>{`\u{1F310}`}</Box>
                    <Typography sx={{ color: '#ffffff', fontWeight: 900, fontSize: '1.05rem' }}>
                      {matchdayTitle}
                    </Typography>
                  </Stack>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.9rem', mt: 0.6 }}>
                    {formatMatchdayDate(openMatchday.match_date)}
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
                    background: isClosingSoon
                      ? 'rgba(239,68,68,0.2)'
                      : isClosingHour
                        ? 'rgba(249,115,22,0.2)'
                        : 'rgba(107,114,128,0.2)',
                    color: countdownColor,
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {countdownLabel}
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                {renderPredictionBox('FT Goals', ftGoals, setFtGoals, false, 'FREE')}
                {renderPredictionBox('HT Goals', htGoals, setHtGoals, !isPaidUser, !isPaidUser ? 'PRO' : undefined)}
                {renderPredictionBox('FT Corners', ftCorners, setFtCorners, !isPaidUser, !isPaidUser ? 'PRO' : undefined)}
                {renderPredictionBox('HT Corners', htCorners, setHtCorners, !isPaidUser, !isPaidUser ? 'PRO' : undefined)}
              </Box>

              <Box>
                <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                  MATCHES IN THIS MATCHDAY
                </Typography>
                <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  {matchdayGames.length === 0 ? (
                    <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', py: 1.5 }}>
                      No matches listed yet.
                    </Typography>
                  ) : (
                    matchdayGames.map((game) => {
                      const competition = getGameCompetition(game);
                      const badgeLabel = competition?.short_name || competition?.name || '-';
                      const kickoffLabel = formatGameDateTime(game.kickoff_at);
                      return (
                        <Box
                          key={game.id}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1.2fr 0.6fr 1fr' },
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
                                  gap: 0.5,
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.18)',
                                  borderRadius: '999px',
                                  px: 1,
                                  py: '2px',
                                  fontSize: '0.7rem',
                                  color: '#ffffff',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                <Box component="span" sx={{ fontSize: '0.85rem' }}>
                                  {getCompetitionIcon(competition)}
                                </Box>
                                <Box component="span">
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
                onClick={handleSavePredictions}
                disabled={isSavingPredictions}
                sx={{
                  background: '#16a34a',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '1rem',
                  py: 1.75,
                  borderRadius: '10px',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#15803d' },
                }}
              >
                {`SAVE PREDICTIONS \u2192`}
              </Button>
            </Stack>
          </CardContent>
        </Card>
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
            No open matchday right now. Check back soon!
          </Typography>
        </Card>
      )}

      {!isPaidUser && (
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.03))',
            border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: '14px',
            p: { xs: 3, md: '24px 28px' },
            mb: 3,
          }}
        >
          <Typography sx={{ color: '#eab308', fontWeight: 900, fontSize: '1.1rem', mb: 1 }}>
            {`\u{1F451} UNLOCK ALL 4 PREDICTION GAMES`}
          </Typography>
          <Stack spacing={1.25} sx={{ mb: 2 }}>
            {[
              { name: 'FT Goals', tier: 'free' },
              { name: 'HT Goals', tier: 'pro' },
              { name: 'Corners', tier: 'pro' },
              { name: 'Cards', tier: 'pro' },
            ].map((game) => (
              <Box key={game.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ color: '#fff', fontWeight: 700 }}>{game.name}</Typography>
                {game.tier === 'free' ? (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(22,163,74,0.15)',
                      color: '#16a34a',
                      borderRadius: 999,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    {`\u2705 FREE`}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      backgroundColor: 'rgba(234,179,8,0.15)',
                      color: '#eab308',
                      borderRadius: 999,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    {`\u{1F512} PRO`}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', mb: 2 }}>
            {`Upgrade for just \u00A35/month and earn 4x more points every matchday!`}
          </Typography>
          <Button
            fullWidth
            onClick={() => router.push('/paywall')}
            sx={{
              background: 'linear-gradient(135deg, #eab308, #d97706)',
              color: '#000000',
              fontWeight: 900,
              fontSize: '1rem',
              py: 1.75,
              borderRadius: '10px',
              textTransform: 'none',
            }}
          >
            {`\u{1F451} UPGRADE NOW \u2014 \u00A35/MONTH \u2192`}
          </Button>
        </Box>
      )}

      <PrizeWidget />
    </Box>
  );
}
