"use client";

import { Box, Typography, Stack, Button, Card, CardContent, Grid, CircularProgress, IconButton, Paper, Collapse, Skeleton } from '@mui/material';
import { League, Season, MatchDay, Game } from '@/types/database';
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
import Image from 'next/image';
import Link from 'next/link';
import PrizeWidget from './PrizeWidget';
import './DashboardTab.css';
// import './DashboardTab.css';

// Fallback logo mapping for leagues without logo_url in DB
const LEAGUE_LOGO_FALLBACK: Record<string, string> = {
  'England Premier League': '/assets/images/League logo/england-premier-league-logo.jpg',
  'Spain La Liga': '/assets/images/League logo/spain-la-liga.png',
  'Europe UEFA Champions League': '/assets/images/League logo/europe-uefa-champions-league.png',
  'Europe UEFA Europa League': '/assets/images/League logo/europe-uefa-europa-league.png',
  'Europe UEFA Europa Conference League': '/assets/images/League logo/europe-uefa-europa-conference-league.png',
  'International WC Qualification Europe': '/assets/images/League logo/international-wc-qualification-europe.png',
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
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [matchDayGroups, setMatchDayGroups] = useState<MatchDayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Helper: get league logo (DB url or local fallback)
  const getLeagueLogo = (league: League) => {
    return league.logo_url || LEAGUE_LOGO_FALLBACK[league.name] || '/assets/images/logo.png';
  };

  // ─── Fetch leagues on mount ───
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error fetching leagues:', error);
          toast.error('Failed to load leagues');
          setIsLoading(false);
          return;
        }

        const fetchedLeagues: League[] = data || [];
        setLeagues(fetchedLeagues);

        if (fetchedLeagues.length > 0) {
          setSelectedLeague(fetchedLeagues[0]);
        }
      } catch (err) {
        console.error('Unexpected error fetching leagues:', err);
        toast.error('Failed to load leagues');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  // ─── Fetch season → matchdays → games when league changes ───
  const fetchMatchData = useCallback(async (league: League) => {
    setIsLoadingMatches(true);
    setMatchDayGroups([]);
    setCurrentPredictionIndex(0);

    try {
      // 1. Fetch active season for this league (fallback: any active season)
      let seasonResult = await supabase
        .from('seasons')
        .select('*')
        .eq('league_id', league.id)
        .eq('is_active', true)
        .maybeSingle();
      // If league_id column doesn't exist yet, fall back to any active season
      if (seasonResult.error) {
        console.warn('Seasons league_id query failed, falling back:', seasonResult.error);
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
        .order('kickoff_at', { ascending: true });

      // If join query fails, fallback to plain query
      if (gamesResult.error) {
        console.error('Games join query failed, trying plain query:', gamesResult.error);
        gamesResult = await supabase
          .from('games')
          .select('*')
          .in('match_day_id', matchDayIds)
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
    if (selectedLeague) {
      fetchMatchData(selectedLeague);
    }
  }, [selectedLeague, fetchMatchData]);

  // ─── Collapse toggle ───
  const toggleCollapse = (matchDayId: string) => {
    setCollapsedDays((prev) => ({ ...prev, [matchDayId]: !prev[matchDayId] }));
  };

  // ─── Loading state ───
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#0f5d1f' }} />
      </Box>
    );
  }

  // ─── Derived data ───
  // Featured games: first 3 games from the first matchday whose cutoff is before now
  const now = new Date();
  const firstCutoffMatchDay = matchDayGroups
    .filter((g) => g.matchDay.cutoff_at && new Date(g.matchDay.cutoff_at) > now)
    .sort((a, b) => new Date(a.matchDay.cutoff_at).getTime() - new Date(b.matchDay.cutoff_at).getTime())[0] || null;
  const featuredGames: GameWithTeams[] = firstCutoffMatchDay
    ? firstCutoffMatchDay.games.slice(0, 3)
    : [];

  const featuredGame = featuredGames.length > 0 ? featuredGames[currentPredictionIndex] || featuredGames[0] : null;
  const totalPredictions = featuredGames.length;

  const formatTime = (dateString: string | null | undefined) => {
    console.log('dateString', dateString);
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

  const handleLeagueSelect = (league: League) => {
    setSelectedLeague(league);
  };

  return (
    <Box>
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
                        {selectedLeague?.name || ''}
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

          {/* Football Leagues */}
          <Card sx={{ backgroundColor: '#24262F', borderRadius: '12px', border: '1px solid rgb(77, 77, 77)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
                <SportsSoccerIcon sx={{ color: '#fff', fontSize: '1.6rem' }} />
                <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                  Football Leagues
                </Typography>
              </Box>
              <Stack spacing={1}>
                {leagues.map((league) => (
                  <Box
                    key={league.id}
                    onClick={() => handleLeagueSelect(league)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedLeague?.id === league.id ? 'rgba(15, 93, 31, 0.1)' : 'transparent',
                      border: selectedLeague?.id === league.id ? '1px solid #0f5d1f' : '1px solid transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(15, 93, 31, 0.05)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 48, height: 48, position: 'relative', flexShrink: 0, borderRadius: '50%', overflow: 'hidden' }}>
                        <Image
                          src={getLeagueLogo(league)}
                          alt={league.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="48px"
                        />
                      </Box>
                      <Box>
                        <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{league.name}</Typography>
                        <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>{league.country}</Typography>
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
            {selectedLeague?.name || 'League'} Predictions
            {activeSeason && (
              <Typography component="span" sx={{ fontSize: '1rem', fontWeight: 400, color: '#999', ml: 2 }}>
                {activeSeason.name}
              </Typography>
            )}
          </Typography>

          {/* Loading matches indicator */}
          {isLoadingMatches && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: '#0f5d1f' }} />
            </Box>
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
                    {selectedLeague && (
                      <Box sx={{ width: 24, height: 24, position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                        <Image
                          src={getLeagueLogo(selectedLeague)}
                          alt={selectedLeague.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="24px"
                        />
                      </Box>
                    )}
                    <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
                      {selectedLeague?.name || 'League'}
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
                  {selectedLeague
                    ? `No matches available for ${selectedLeague.name} at the moment`
                    : 'No leagues available'}
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
