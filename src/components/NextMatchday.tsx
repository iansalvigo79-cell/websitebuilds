'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface MatchDay {
  id: string;
  name?: string | null;
  match_date?: string | null;
  cutoff_at?: string | null;
}

interface Game {
  id: string;
  home_team: string | number;
  away_team: string | number;
  kickoff_at: string;
  is_selected: boolean;
  home_team_rel?: { name?: string | null } | null;
  away_team_rel?: { name?: string | null } | null;
}

function formatLongDate(dateString?: string | null) {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatUtcDateTime(dateString?: string | null) {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleString('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function NextMatchday() {
  const [nextMatchday, setNextMatchday] = useState<MatchDay | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadMatchday = async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('match_days')
          .select('id, name, match_date, cutoff_at')
          .is('actual_total_goals', null)
          .gte('match_date', now)
          .order('match_date', { ascending: true })
          .limit(1);

        if (error) {
          console.error('Failed to load next matchday:', error);
          return;
        }

        const matchday = data?.[0] ?? null;
        if (active) {
          setNextMatchday(matchday);
        }

        // Fetch games for this matchday
        if (matchday) {
          const { data: gamesData, error: gamesError } = await supabase
            .from('games')
            .select('id, home_team, away_team, kickoff_at, is_selected')
            .eq('match_day_id', matchday.id)
            .order('kickoff_at', { ascending: true });

          if (gamesError) {
            console.error('Failed to load games:', gamesError);
          } else if (active) {
            // Fetch team names separately
            const gameIds = (gamesData || []).map(g => ({ home: g.home_team, away: g.away_team }));
            const allTeamIds = [...new Set(gameIds.flatMap(g => [g.home, g.away]).filter(Boolean))];
            
            const { data: teamsData } = await supabase
              .from('teams')
              .select('id, name')
              .in('id', allTeamIds);

            const teamMap = new Map((teamsData || []).map((t: any) => [t.id, t.name]));

            const mappedGames = (gamesData || []).map((game: any) => ({
              ...game,
              home_team_rel: { name: teamMap.get(game.home_team) || null },
              away_team_rel: { name: teamMap.get(game.away_team) || null },
            }));

            setGames(mappedGames);
          }
        }
      } catch (err) {
        console.error('Next matchday fetch error:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadMatchday();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Box
      sx={{
        backgroundColor: '#040404',
        py: { xs: 5, md: 7 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            background: 'linear-gradient(180deg, rgba(22, 163, 74, 0.12), rgba(255,255,255,0.02))',
            border: '1px solid rgba(22, 163, 74, 0.18)',
            borderRadius: '24px',
            p: { xs: 3, md: 4 },
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2.5, md: 4 }}
            alignItems="center"
            justifyContent="space-between"
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: '#ffffff',
                  mb: 1,
                  fontSize: { xs: '1.5rem', md: '2.25rem' },
                  textTransform: 'uppercase',
                }}
              >
                Next matchday
              </Typography>
              <Typography sx={{ color: '#d1d5db', fontSize: { xs: '0.95rem', md: '1rem' }, mb: 2 }}>
                Stay on top of the next matchday and submit your predictions before the deadline.
              </Typography>

              {isLoading ? (
                <Typography sx={{ color: '#9ca3af' }}>Loading upcoming matchday...</Typography>
              ) : nextMatchday ? (
                <Box>
                  <Typography sx={{ color: '#ffffff', fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 700 }}>
                    {nextMatchday.name?.trim() || formatLongDate(nextMatchday.match_date)}
                  </Typography>
                  <Typography sx={{ color: '#9ca3af', mt: 0.75 }}>
                    {formatLongDate(nextMatchday.match_date)}
                  </Typography>
                  <Typography sx={{ color: '#9ca3af', mt: 0.5, fontSize: '0.95rem' }}>
                    Cutoff: {formatUtcDateTime(nextMatchday.cutoff_at)} GMT
                  </Typography>
                  {games.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600, mb: 1.5 }}>
                        Featured Games:
                      </Typography>
                      <Stack spacing={1}>
                        {games.map((game) => (
                          <Box
                            key={game.id}
                            sx={{
                              backgroundColor: game.is_selected ? 'rgba(22, 163, 74, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                              border: game.is_selected ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              p: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>
                                {game.home_team_rel?.name ?? String(game.home_team)}
                              </Typography>
                              <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>vs</Typography>
                              <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>
                                {game.away_team_rel?.name ?? String(game.away_team)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ color: '#d1d5db', fontSize: '0.75rem' }}>
                                {new Date(game.kickoff_at).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                  timeZone: 'UTC'
                                })} GMT
                              </Typography>
                              {game.is_selected && (
                                <Box
                                  sx={{
                                    backgroundColor: '#16a34a',
                                    color: '#ffffff',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Selected
                                </Box>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography sx={{ color: '#9ca3af' }}>
                  There isn \`t a next matchday available yet. Check back soon for the latest schedule.
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button
                component={Link}
                href="/dashboard"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#0f0505',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: 1.1,
                  px: 4,
                  py: 1.5,
                  borderRadius: '10px',
                  '&:hover': {
                    backgroundColor: '#137f2d',
                  },
                }}
              >
                Start Predicting
              </Button>
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
