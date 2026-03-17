"use client";

import { Box, Typography, Stack, Button, Card, CardContent, Grid, IconButton, Paper, Collapse, Skeleton } from '@mui/material';
import { Competition, Season, MatchDay, Game } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BarChartIcon from '@mui/icons-material/BarChart';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PrizeWidget from './PrizeWidget';
import './DashboardTab.css';
import ModernLoader from '@/components/ui/ModernLoader';
// import './DashboardTab.css';

// Fallback emoji mapping for competitions without an icon in DB
const COMPETITION_ICON_FALLBACK: Record<string, string> = {
  'England Premier League': '🏴',
  'Premier League': '🏴',
  'UEFA Champions League': '⭐',
  'Champions League': '⭐',
  'Europe UEFA Champions League': '⭐',
  'UEFA Europa League': '🌟',
  'Europa League': '🌟',
  'Europe UEFA Europa League': '🌟',
  'UEFA Europa Conference League': '🌍',
  'Europa Conference League': '🌍',
  'Europe UEFA Europa Conference League': '🌍',
  'Spain La Liga': '🇪🇸',
  'La Liga': '🇪🇸',
  'Germany Bundesliga': '🇩🇪',
  'Bundesliga': '🇩🇪',
  'France Ligue 1': '🇫🇷',
  'Ligue 1': '🇫🇷',
  'Italy Serie A': '🇮🇹',
  'Serie A': '🇮🇹',
  'Brazil Serie A': '🇧🇷',
  'World Cup': '🏆',
  'International / Qualifying': '🌐',
  'International WC Qualification Europe': '🌐',
  'WC Qualification Europe': '🌐',
  'World Cup Qualification Europe': '🌐',
  'International': '🌐',
  'Qualifying': '🌐',
};

interface GameWithTeams extends Game {
  home_team_name: string;
  away_team_name: string;
}

interface MatchDayGroup {
  matchDay: MatchDay;
  games: GameWithTeams[];
}

export default function DashboardTab() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [matchDayGroups, setMatchDayGroups] = useState<MatchDayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [openMatchday, setOpenMatchday] = useState<{
    id: string;
    name?: string | null;
    match_date: string;
    cutoff_at: string;
    seasons?: { name?: string | null } | null;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isPaidUser, setIsPaidUser] = useState(false);

  // Helper: get competition icon (DB icon or emoji fallback)
  const getCompetitionIcon = (competition: Competition | null | undefined) => {
    if (!competition) return '⚽';
    const icon = competition.icon?.trim();
    return icon || COMPETITION_ICON_FALLBACK[competition.name] || '⚽';
  };

  // ─── Fetch competitions on mount ───
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        let competitionsResult = await supabase
          .from('competitions')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (competitionsResult.error) {
          console.error('Error fetching competitions (active filter):', competitionsResult.error);
          competitionsResult = await supabase
            .from('competitions')
            .select('*')
            .order('name');
        }

        if (competitionsResult.error) {
          console.error('Error fetching competitions:', competitionsResult.error);
          toast.error('Failed to load competitions');
          setIsLoading(false);
          return;
        }

        const fetchedCompetitions: Competition[] = competitionsResult.data || [];
        setCompetitions(fetchedCompetitions);

        if (fetchedCompetitions.length > 0) {
          setSelectedCompetition(fetchedCompetitions[0]);
        }
      } catch (err) {
        console.error('Unexpected error fetching competitions:', err);
        toast.error('Failed to load competitions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  // ─── Fetch season → matchdays → games when competition changes ───
  const fetchMatchData = useCallback(async (competition: Competition) => {
    setIsLoadingMatches(true);
    setMatchDayGroups([]);
    setCurrentPredictionIndex(0);

    try {
      // 1. Fetch active season for this competition (fallback: any active season)
      let seasonResult = await supabase
        .from('seasons')
        .select('*')
        .eq('league_id', competition.id)
        .eq('is_active', true)
        .maybeSingle();
      // If league_id isn't available or no season found, fall back to any active season
      if (seasonResult.error || !seasonResult.data) {
        if (seasonResult.error) {
          console.warn('Seasons competition lookup failed, falling back:', seasonResult.error);
        }
        seasonResult = await supabase
          .from('seasons')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();
      }

      if (seasonResult.error) {
        console.error('Error fetching season:', seasonResult.error);
        toast.error('Failed to load season');
        setIsLoadingMatches(false);
        return;
      }

      const seasonData = seasonResult.data;

      if (!seasonData) {
        setActiveSeason(null);
        setMatchDayGroups([]);
        setIsLoadingMatches(false);
        return;
      }
      setActiveSeason(seasonData);

      // 2. Fetch matchdays this week for this season
      const currentDate = new Date();
      const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
      const endOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 6));

      const { data: matchDays, error: matchDayError } = await supabase
        .from('match_days')
        .select('*')
        .eq('season_id', seasonData.id)
        .gte('match_date', startOfWeek.toISOString())
        .lte('match_date', endOfWeek.toISOString())
        .order('match_date', { ascending: true });

      if (matchDayError) {
        console.error('Error fetching match days:', matchDayError);
        toast.error('Failed to load match days');
        setIsLoadingMatches(false);
        return;
      }

      if (!matchDays || matchDays.length === 0) {
        setMatchDayGroups([]);
        setIsLoadingMatches(false);
        return;
      }

      // 3. Fetch games for all matchdays (try with team joins first)
      const matchDayIds = matchDays.map((md: MatchDay) => md.id);

      let gamesResult = await supabase
        .from('games')
        .select(`
          *,
          home_team_rel:teams!games_home_team_fkey(id, name),
          away_team_rel:teams!games_away_team_fkey(id, name)
        `)
        .in('match_day_id', matchDayIds)
        .eq('competition_id', competition.id)
        .order('kickoff_at', { ascending: true });

      // If join query fails, fallback to plain query
      if (gamesResult.error) {
        console.error('Games join query failed, trying plain query:', gamesResult.error);
        gamesResult = await supabase
          .from('games')
          .select('*')
          .in('match_day_id', matchDayIds)
          .eq('competition_id', competition.id)
          .order('kickoff_at', { ascending: true });
      }

      if (gamesResult.error) {
        console.error('Error fetching games:', gamesResult.error);
        toast.error('Failed to load games');
        setIsLoadingMatches(false);
        return;
      }

      const gamesData = gamesResult.data || [];

      // 4. Group games by matchday
      const groups: MatchDayGroup[] = matchDays
        .map((md: MatchDay) => ({
          matchDay: md,
          games: gamesData
            .filter((g: Record<string, unknown>) => g.match_day_id === md.id)
            .map((g: Record<string, unknown>) => {
              const game = g as unknown as Game & {
                home_team_rel?: { name?: string };
                away_team_rel?: { name?: string };
              };
              return {
                ...game,
                home_team_name: game.home_team_rel?.name || game.home_team || 'TBD',
                away_team_name: game.away_team_rel?.name || game.away_team || 'TBD',
              };
            }),
        }))
        .filter((g: MatchDayGroup) => g.games.length > 0);

      setMatchDayGroups(groups);
    } catch (err) {
      console.error('Unexpected error fetching match data:', err);
      toast.error('Failed to load match data');
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCompetition) {
      fetchMatchData(selectedCompetition);
    }
  }, [selectedCompetition, fetchMatchData]);

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
        return;
      }
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
    if (!activeSeason?.id) {
      setOpenMatchday(null);
      return;
    }
    let isMounted = true;
    const fetchOpenMatchday = async () => {
      const { data } = await supabase
        .from('match_days')
        .select('id, name, match_date, cutoff_at, seasons(name)')
        .eq('season_id', activeSeason.id)
        .gt('cutoff_at', new Date().toISOString())
        .order('match_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!isMounted) return;
      if (!data) {
        setOpenMatchday(null);
        return;
      }
      const seasonsRel = Array.isArray((data as any).seasons)
        ? (data as any).seasons[0] ?? null
        : (data as any).seasons ?? null;
      setOpenMatchday({ ...(data as any), seasons: seasonsRel });
    };
    fetchOpenMatchday();
    const interval = setInterval(fetchOpenMatchday, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeSeason?.id]);

  // ─── Collapse toggle ───
  const toggleCollapse = (matchDayId: string) => {
    setCollapsedDays((prev) => ({ ...prev, [matchDayId]: !prev[matchDayId] }));
  };

  // ─── Loading state ───
  if (isLoading) {
    return (
      <ModernLoader
        label="Loading Dashboard Data"
        sublabel="Syncing competitions and matchday info..."
        minHeight="60vh"
      />
    );
  }

  // ─── Derived data ───
  // Featured games: first 3 games from the first matchday whose cutoff is before now
  const firstCutoffMatchDay = matchDayGroups
    .filter((g) => g.matchDay.cutoff_at && new Date(g.matchDay.cutoff_at) > now)
    .sort((a, b) => new Date(a.matchDay.cutoff_at).getTime() - new Date(b.matchDay.cutoff_at).getTime())[0] || null;
  const featuredGames: GameWithTeams[] = firstCutoffMatchDay
    ? firstCutoffMatchDay.games.slice(0, 3)
    : [];

  const featuredGame = featuredGames.length > 0 ? featuredGames[currentPredictionIndex] || featuredGames[0] : null;
  const totalPredictions = featuredGames.length;
  const timeRemainingMs = openMatchday ? new Date(openMatchday.cutoff_at).getTime() - now.getTime() : 0;
  const remainingMinutes = openMatchday ? Math.max(0, Math.ceil(timeRemainingMs / 60000)) : 0;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;
  const countdownLabel = openMatchday ? `Closes in ${remainingHours}h ${remainingMins}m` : '';
  const isClosingHour = remainingMinutes > 0 && remainingMinutes <= 60;
  const isClosingSoon = remainingMinutes > 0 && remainingMinutes <= 15;
  const countdownColor = isClosingSoon ? '#ef4444' : isClosingHour ? '#f97316' : '#9ca3af';

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '16:00';
    return dateString.replace(/.*T(\d\d:\d\d).*/, '$1')
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const formatOpenMatchdayDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPredictionText = (game: GameWithTeams) => {
    if (game.away_goals && game.home_goals) {
      return `${game.home_team_name} ${game.home_goals} - ${game.away_goals} ${game.away_team_name}`;
    }
    // Placeholder – replace with real prediction data later
    return `${game.home_team_name} vs ${game.away_team_name}`;
  };

  const handlePrevPrediction = () => {
    setCurrentPredictionIndex((prev) => (prev > 0 ? prev - 1 : totalPredictions - 1));
  };

  const handleNextPrediction = () => {
    setCurrentPredictionIndex((prev) => (prev < totalPredictions - 1 ? prev + 1 : 0));
  };

  const handleCompetitionSelect = (competition: Competition) => {
    setSelectedCompetition(competition);
  };

  return (
    <Box>
      {openMatchday ? (
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgba(22,163,74,0.2), rgba(22,163,74,0.05))',
            border: '1px solid rgba(22,163,74,0.4)',
            borderRadius: '14px',
            p: { xs: 3, md: '28px 32px' },
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            ⚽ MATCHDAY OPEN — MAKE YOUR PREDICTION NOW!
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', fontWeight: 600 }}>
              {openMatchday.name || formatOpenMatchdayDate(openMatchday.match_date)}
            </Typography>
            <Typography sx={{ color: '#6b7280', fontSize: '0.95rem' }}>•</Typography>
            <Typography sx={{ color: countdownColor, fontSize: '0.95rem', fontWeight: 700 }}>
              {countdownLabel}
            </Typography>
            {isClosingSoon && (
              <Typography sx={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 800 }}>
                CLOSING SOON!
              </Typography>
            )}
          </Box>
          <Button
            onClick={() => router.push('/predictions')}
            sx={{
              mt: 2.5,
              backgroundColor: '#16a34a',
              color: '#000',
              fontWeight: 900,
              fontSize: '1.1rem',
              px: 4,
              py: 1.75,
              borderRadius: '10px',
              textTransform: 'none',
              animation: 'pulse-green 2s infinite',
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              '@keyframes pulse-green': {
                '0%, 100%': { boxShadow: '0 0 0 0 rgba(22,163,74,0.4)' },
                '50%': { boxShadow: '0 0 0 12px rgba(22,163,74,0)' },
              },
              '&:hover': { backgroundColor: '#15803d', transform: 'scale(1.02)' },
            }}
          >
            PREDICT NOW →
          </Button>
        </Box>
      ) : (
        <Box
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
        </Box>
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
            👑 UNLOCK ALL 4 PREDICTION GAMES
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
                    ✅ FREE
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
                    🔒 PRO
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', mb: 2 }}>
            Upgrade for just £5/month and earn 4x more points every matchday!
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
            👑 UPGRADE NOW — £5/MONTH →
          </Button>
        </Box>
      )}
      <PrizeWidget />
      <Grid container spacing={3}>
      {/* Left Sidebar */}
      <Grid item xs={12} md={3}>
        <Stack spacing={3}>
          {/* Prediction of the Day */}
          {featuredGame ? (
            <Card
              className="prediction-outer-card"
              sx={{
                backgroundImage: 'url(/assets/images/card_back.jpeg)',
                border: 'none',
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative', zIndex: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 2.5 }}>
                  <SportsSoccerIcon className="prediction-title-icon" />
                  <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                    Prediction of the Day
                  </Typography>
                </Stack>

                <Paper
                  className="prediction-inner-card"
                  elevation={0}
                  sx={{
                    backgroundColor: 'rgba(30, 30, 30, 0.92)',
                    borderRadius: '12px',
                    p: 2,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Stack spacing={0.5} sx={{ mb: 2 }}>
                    <Box className="prediction-info-row">
                      <EmojiEventsIcon className="prediction-info-icon" />
                      <Typography className="prediction-info-text">
                        {selectedCompetition?.name || ''}
                      </Typography>
                    </Box>
                    <Box className="prediction-info-row">
                      <AccessTimeIcon className="prediction-info-icon" />
                      <Typography className="prediction-info-text">
                        {formatTime(featuredGame.kickoff_at)}
                      </Typography>
                    </Box>
                    <Box className="prediction-info-row">
                      <CalendarTodayIcon className="prediction-info-icon" />
                      <Typography className="prediction-info-text">
                        {formatDate(firstCutoffMatchDay?.matchDay.match_date)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box className="prediction-teams-wrapper">
                    <Box className="prediction-team-block">
                      <Box className="prediction-team-logo">
                        <Typography sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
                          {featuredGame.home_team_name.substring(0, 2).toUpperCase()}
                        </Typography>
                      </Box>
                      <Typography className="prediction-team-name">
                        {featuredGame.home_team_name}
                      </Typography>
                    </Box>

                    <Typography className="prediction-vs-text" sx={{ mx: 2 }}>
                      V.S
                    </Typography>

                    <Box className="prediction-team-block">
                      <Box className="prediction-team-logo">
                        <Typography sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
                          {featuredGame.away_team_name.substring(0, 2).toUpperCase()}
                        </Typography>
                      </Box>
                      <Typography className="prediction-team-name">
                        {featuredGame.away_team_name}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    component={Link}
                    href={firstCutoffMatchDay ? `/predictions?matchDayId=${firstCutoffMatchDay.matchDay.id}` : '/predictions'}
                    fullWidth
                    variant="contained"
                    className="prediction-see-btn"
                    sx={{ mt: 2 }}
                  >
                    See Prediction
                  </Button>
                </Paper>

                {totalPredictions > 1 && (
                  <Box className="prediction-carousel-wrapper" sx={{ mt: 1.5 }}>
                    <IconButton
                      onClick={handlePrevPrediction}
                      className="prediction-carousel-arrow"
                      size="small"
                    >
                      <ChevronLeftIcon />
                    </IconButton>

                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {Array.from({ length: totalPredictions }).map((_, index) => (
                          <Box
                            key={index}
                            className={`prediction-carousel-dot ${currentPredictionIndex === index
                              ? 'prediction-carousel-dot-active'
                              : 'prediction-carousel-dot-inactive'
                              }`}
                          />
                        ))}
                      </Stack>
                      <Typography className="prediction-carousel-count">
                        {currentPredictionIndex + 1} / {totalPredictions}
                      </Typography>
                    </Stack>

                    <IconButton
                      onClick={handleNextPrediction}
                      className="prediction-carousel-arrow"
                      size="small"
                    >
                      <ChevronRightIcon />
                    </IconButton>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Skeleton placeholder when no featured games */
            <Card
              className="prediction-outer-card"
              sx={{
                backgroundImage: 'url(/assets/images/card_back.jpeg)',
                border: 'none',
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, position: 'relative', zIndex: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 2.5 }}>
                  <SportsSoccerIcon className="prediction-title-icon" />
                  <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                    Prediction of the Day
                  </Typography>
                </Stack>

                <Paper
                  className="prediction-inner-card"
                  elevation={0}
                  sx={{
                    backgroundColor: 'rgba(30, 30, 30, 0.92)',
                    borderRadius: '12px',
                    p: 2,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Stack spacing={0.5} sx={{ mb: 2 }}>
                    <Box className="prediction-info-row">
                      <EmojiEventsIcon className="prediction-info-icon" />
                      <Skeleton variant="text" width="60%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    </Box>
                    <Box className="prediction-info-row">
                      <AccessTimeIcon className="prediction-info-icon" />
                      <Skeleton variant="text" width="40%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    </Box>
                    <Box className="prediction-info-row">
                      <CalendarTodayIcon className="prediction-info-icon" />
                      <Skeleton variant="text" width="50%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    </Box>
                  </Stack>

                  <Box className="prediction-teams-wrapper">
                    <Box className="prediction-team-block">
                      <Skeleton variant="circular" width={56} height={56} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                      <Skeleton variant="text" width="60%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    </Box>

                    <Typography className="prediction-vs-text" sx={{ mx: 2 }}>
                      V.S
                    </Typography>

                    <Box className="prediction-team-block">
                      <Skeleton variant="circular" width={56} height={56} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                      <Skeleton variant="text" width="60%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    disabled
                    variant="contained"
                    className="prediction-see-btn"
                    sx={{ mt: 2 }}
                  >
                    No Matches
                  </Button>
                </Paper>
              </CardContent>
            </Card>
          )}

          {/* Competitions */}
          <Card sx={{ backgroundColor: '#24262F', borderRadius: '12px', border: '1px solid rgb(77, 77, 77)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                <SportsSoccerIcon sx={{ color: '#fff', fontSize: '1.6rem' }} />
                <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                  Competitions
                </Typography>
              </Box>
              <Stack spacing={1}>
                {competitions.map((competition) => (
                  <Box
                    key={competition.id}
                    onClick={() => handleCompetitionSelect(competition)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedCompetition?.id === competition.id ? 'rgba(15, 93, 31, 0.1)' : 'transparent',
                      border: selectedCompetition?.id === competition.id ? '1px solid #0f5d1f' : '1px solid transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(15, 93, 31, 0.05)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <span style={{ fontSize: '1.8rem' }}>{getCompetitionIcon(competition)}</span>
                      </Box>
                      <Box>
                        <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{competition.name}</Typography>
                        <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>{competition.country || competition.short_name || ''}</Typography>
                      </Box>
                    </Box>
                    <ArrowForwardIcon sx={{ color: '#0f5d1f', fontSize: '1rem' }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* Main Content */}
      <Grid item xs={12} md={9}>
        <Stack spacing={3}>
          {/* Title */}
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#00a54e', textTransform: 'uppercase' }}>
            {selectedCompetition?.name || 'Competition'} Predictions
          </Typography>

          {/* Loading matches indicator */}
          {isLoadingMatches && (
            <ModernLoader
              label="Loading Matches"
              sublabel="Updating selected competition fixtures..."
              minHeight={220}
            />
          )}

          {/* Match Day Sections */}
          {!isLoadingMatches && matchDayGroups.map((group) => {
            const isCollapsed = collapsedDays[group.matchDay.id] || false;

            return (
              <Stack key={group.matchDay.id} spacing={2}>
                {/* Match Day Header Bar */}
                <Box
                  sx={{
                    backgroundColor: '#46E3514D',
                    borderRadius: '8px',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleCollapse(group.matchDay.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {selectedCompetition && (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <span style={{ fontSize: '1.8rem' }}>{getCompetitionIcon(selectedCompetition)}</span>
                      </Box>
                    )}
                    <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
                      {selectedCompetition?.name || 'Competition'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                      <CalendarTodayIcon sx={{ color: '#fff', fontSize: '1rem' }} />
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>
                        {formatDate(group.matchDay.match_date)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" sx={{ color: '#fff' }} onClick={(e) => { e.stopPropagation(); toggleCollapse(group.matchDay.id); }}>
                    {isCollapsed ? <AddIcon /> : <RemoveIcon />}
                  </IconButton>
                </Box>

                {/* Collapsible Match Cards */}
                <Collapse in={!isCollapsed} timeout="auto">
                  <Stack spacing={1.5}>
                    {group.games.map((game) => (
                      <Card key={game.id} className="match-card">
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                          {/* Top Row: Time | Teams | Chart */}
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ px: 2, pt: 1.5, pb: 1 }}
                          >
                            {/* Time */}
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 70 }}>
                              <AccessTimeIcon className="match-time-icon" />
                              <Typography className="match-time-text">
                                {formatTime(game.kickoff_at)}
                              </Typography>
                            </Stack>

                            {/* Teams */}
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, justifyContent: 'center' }}>
                              <Typography className="match-team-text">
                                {game.home_team_name}
                              </Typography>
                              <Box className="match-team-logo-sm">
                                <Typography sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>
                                  {game.home_team_name.substring(0, 2).toUpperCase()}
                                </Typography>
                              </Box>
                              <Typography className="match-vs-text">
                                v.s
                              </Typography>
                              <Box className="match-team-logo-sm">
                                <Typography sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>
                                  {game.away_team_name.substring(0, 2).toUpperCase()}
                                </Typography>
                              </Box>
                              <Typography className="match-team-text">
                                {game.away_team_name}
                              </Typography>
                            </Stack>

                            {/* Chart Icon */}
                            <IconButton size="small" className="match-chart-btn">
                              <BarChartIcon sx={{ fontSize: '1.2rem' }} />
                            </IconButton>
                          </Stack>

                          {/* Bottom Row: Prediction + View Button */}
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                            spacing={1.5}
                            sx={{ px: 2, pb: 1.5, pt: 0.5 }}
                          >
                            <Button
                              variant="contained"
                              size="small"
                              className="match-prediction-chip"
                              sx={{
                                backgroundColor: '#0f5d1f',
                                '&:hover': { backgroundColor: '#0a4a18' },
                              }}
                            >
                              {getPredictionText(game)}
                            </Button>
                            {(!game.away_goals && !game.home_goals) && (
                              <Button
                                component={Link}
                                href={`/predictions?matchDayId=${group.matchDay.id}`}
                                variant="outlined"
                                size="small"
                                className="match-view-btn"
                              >
                                View Prediction
                              </Button>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Collapse>
              </Stack>
            );
          })}

          {/* No matches fallback */}
          {!isLoadingMatches && matchDayGroups.length === 0 && (
            <Card sx={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
              <CardContent>
                <Typography sx={{ color: '#999', textAlign: 'center', py: 4 }}>
                  {selectedCompetition
                    ? `No matches available for ${selectedCompetition.name} at the moment`
                    : 'No competitions available'}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Grid>
    </Grid>
    </Box>
  );
}
