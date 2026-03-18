"use client";

import {
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ModernLoader from '@/components/ui/ModernLoader';

interface CompetitionInfo {
  name?: string | null;
  short_name?: string | null;
  icon?: string | null;
}

interface GameRow {
  id: string;
  kickoff_at: string | null;
  home_team: string | null;
  away_team: string | null;
  competitions?: CompetitionInfo | CompetitionInfo[] | null;
}

interface MatchDayRow {
  id: string;
  name?: string | null;
  match_date: string;
  cutoff_at: string;
  actual_total_goals: number | null;
  ht_goals: number | null;
  total_corners: number | null;
  ht_corners: number | null;
  games?: GameRow[] | null;
}

interface PastPredictionRow {
  id: string;
  predicted_total_goals: number | null;
  predicted_ht_goals: number | null;
  predicted_total_corners: number | null;
  predicted_ht_corners: number | null;
  points: number | null;
  ht_goals_points: number | null;
  corners_points: number | null;
  ht_corners_points: number | null;
  match_days: MatchDayRow | MatchDayRow[] | null;
}

function formatTime(dateString: string | null | undefined) {
  if (!dateString) return '--:--';
  return dateString.replace(/.*T(\d\d:\d\d).*/, '$1');
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCompetitionIcon(icon?: string | null) {
  const trimmed = icon?.trim();
  return trimmed ? trimmed : '\u26BD';
}

function getMatchDay(row: MatchDayRow | MatchDayRow[] | null) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

function getGameCompetition(game: GameRow): CompetitionInfo | null {
  const rel = game.competitions;
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function getPointsColor(points: number | null | undefined) {
  if (points === null || points === undefined) return '#6b7280';
  if (points === 10 || points === 7) return '#16a34a';
  if (points === 4 || points === 2) return '#f97316';
  if (points === 0) return '#ef4444';
  return '#6b7280';
}

function PredictionStatBox({
  label,
  predicted,
  actual,
  points,
  locked,
}: {
  label: string;
  predicted: number | null;
  actual: number | null;
  points: number | null;
  locked: boolean;
}) {
  const displayPredicted = locked ? '\u2014' : (predicted ?? '\u2014');
  const displayActual = actual ?? null;
  const actualText = displayActual === null ? 'TBD' : String(displayActual);
  const actualColor = displayActual === null ? '#6b7280' : '#16a34a';
  const pointsText = locked ? '\u2014' : points === null || points === undefined ? '\u2014' : `${points} pts`;
  const pointsColor = locked ? '#6b7280' : getPointsColor(points);

  return (
    <Box
      sx={{
        position: 'relative',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        p: 2,
        minHeight: 120,
      }}
    >
      <Typography sx={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </Typography>
      <Stack spacing={0.6} sx={{ mt: 1 }}>
        <Typography sx={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 600 }}>
          You: {displayPredicted}
        </Typography>
        <Typography sx={{ color: actualColor, fontSize: '0.85rem', fontWeight: 600 }}>
          Act: {actualText}
        </Typography>
        <Typography sx={{ color: pointsColor, fontSize: '0.8rem', fontWeight: 700 }}>
          {pointsText}
        </Typography>
      </Stack>
      {locked && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            px: 1,
            py: 0.2,
            borderRadius: 999,
            background: 'rgba(234,179,8,0.2)',
            color: '#eab308',
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
          }}
        >
          PRO
        </Box>
      )}
    </Box>
  );
}

function PredictionsContent() {
  const router = useRouter();
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [pastPredictions, setPastPredictions] = useState<PastPredictionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPastPredictions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPastPredictions([]);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, stripe_subscription_id')
        .eq('id', user.id)
        .maybeSingle();

      const paid = profile?.account_type === 'paid' || Boolean(profile?.stripe_subscription_id);
      setIsPaidUser(Boolean(paid));

      const { data: pastData, error } = await supabase
        .from('predictions')
        .select(`
          id,
          predicted_total_goals,
          predicted_ht_goals,
          predicted_total_corners,
          predicted_ht_corners,
          points,
          ht_goals_points,
          corners_points,
          ht_corners_points,
          match_days (
            id, name, match_date, cutoff_at,
            actual_total_goals,
            ht_goals,
            total_corners,
            ht_corners,
            games (
              id, kickoff_at,
              home_team, away_team,
              competitions ( name, short_name, icon )
            )
          )
        `)
        .eq('user_id', user.id)
        .lt('match_days.cutoff_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase predictions fetch error (Past Predictions):', error);
        toast.error('Failed to load prediction history');
        setPastPredictions([]);
        setIsLoading(false);
        return;
      }

      setPastPredictions((pastData as PastPredictionRow[]) ?? []);
    } catch (err) {
      console.error('Past predictions fetch error:', err);
      toast.error('Failed to load prediction history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPastPredictions();
  }, [fetchPastPredictions]);

  if (isLoading) {
    return (
      <ModernLoader
        label="Loading Prediction History"
        sublabel="Fetching your past matchdays..."
        minHeight="70vh"
      />
    );
  }

  const renderPointsBadge = (points: number | null, totalPoints: number) => {
    if (points === null || points === undefined) {
      return (
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 999,
            background: 'rgba(249,115,22,0.2)',
            color: '#f97316',
            fontWeight: 800,
            fontSize: '0.75rem',
          }}
        >
          {`Pending \u23F3`}
        </Box>
      );
    }

    if (totalPoints > 0) {
      return (
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 999,
            background: 'rgba(22,163,74,0.2)',
            color: '#16a34a',
            fontWeight: 800,
            fontSize: '0.75rem',
          }}
        >
          {`+${totalPoints} pts \u2705`}
        </Box>
      );
    }

    return (
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          borderRadius: 999,
          background: 'rgba(107,114,128,0.2)',
          color: '#9ca3af',
          fontWeight: 800,
          fontSize: '0.75rem',
        }}
      >
        0 pts
      </Box>
    );
  };

  return (
    <Box sx={{ backgroundColor: '#24262F', minHeight: '100vh', py: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ color: '#9ca3af', mb: 2, '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}
        >
          Go back
        </Button>

        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
          My Prediction History
        </Typography>
        <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', mb: 3 }}>
          See what you predicted, the games that were played, and your points scored.
        </Typography>

        {pastPredictions.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              px: 2,
              borderRadius: 3,
              border: '1px dashed rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <Typography sx={{ fontSize: '2rem', mb: 1 }}>{`\u{1F4CB}`}</Typography>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', mb: 0.6 }}>
              No predictions yet
            </Typography>
            <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', mb: 2.5 }}>
              Your prediction history will appear here after your first matchday closes.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/dashboard')}
              sx={{
                backgroundColor: '#16a34a',
                color: '#000',
                fontWeight: 800,
                px: 3,
                py: 1.4,
                borderRadius: '10px',
                textTransform: 'none',
              }}
            >
              {`Make Your First Prediction \u2192`}
            </Button>
          </Box>
        ) : (
          <Stack spacing={3}>
            {pastPredictions.map((prediction) => {
              const matchDay = getMatchDay(prediction.match_days);
              if (!matchDay) return null;

              const matchdayTitle = matchDay.name || formatLongDate(matchDay.match_date);
              const matchdayDate = formatLongDate(matchDay.match_date);
              const totalPoints =
                (prediction.points ?? 0) +
                (prediction.ht_goals_points ?? 0) +
                (prediction.corners_points ?? 0) +
                (prediction.ht_corners_points ?? 0);

              const hasAnyPoints = [
                prediction.points,
                prediction.ht_goals_points,
                prediction.corners_points,
                prediction.ht_corners_points,
              ].some((value) => value !== null && value !== undefined);

              const games = (matchDay.games ?? [])
                .slice()
                .sort((a, b) => {
                  const aTime = a.kickoff_at ? new Date(a.kickoff_at).getTime() : 0;
                  const bTime = b.kickoff_at ? new Date(b.kickoff_at).getTime() : 0;
                  return aTime - bTime;
                });

              return (
                <Card
                  key={prediction.id}
                  sx={{
                    backgroundColor: '#111217',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                    <Stack spacing={2.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box>
                          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>
                            {matchdayTitle}
                          </Typography>
                          <Typography sx={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                            {matchdayDate}
                          </Typography>
                        </Box>
                        {renderPointsBadge(hasAnyPoints ? totalPoints : null, totalPoints)}
                      </Box>

                      <Box>
                        <Typography sx={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                          YOUR PREDICTIONS vs ACTUAL
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                          <PredictionStatBox
                            label="FT GOALS"
                            predicted={prediction.predicted_total_goals}
                            actual={matchDay.actual_total_goals}
                            points={prediction.points}
                            locked={false}
                          />
                          <PredictionStatBox
                            label="HT GOALS"
                            predicted={prediction.predicted_ht_goals}
                            actual={matchDay.ht_goals}
                            points={prediction.ht_goals_points}
                            locked={!isPaidUser}
                          />
                          <PredictionStatBox
                            label="FT CORNERS"
                            predicted={prediction.predicted_total_corners}
                            actual={matchDay.total_corners}
                            points={prediction.corners_points}
                            locked={!isPaidUser}
                          />
                          <PredictionStatBox
                            label="HT CORNERS"
                            predicted={prediction.predicted_ht_corners}
                            actual={matchDay.ht_corners}
                            points={prediction.ht_corners_points}
                            locked={!isPaidUser}
                          />
                        </Box>
                      </Box>

                      <Box>
                        <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                          GAMES IN THIS MATCHDAY
                        </Typography>
                        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          {games.length === 0 ? (
                            <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', py: 1.5 }}>
                              No matches listed yet.
                            </Typography>
                          ) : (
                            games.map((game) => {
                              const competition = getGameCompetition(game);
                              const badgeLabel = competition?.short_name || competition?.name || 'COMP';
                              return (
                                <Box
                                  key={game.id}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    py: 1.25,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    '&:last-child': { borderBottom: 'none' },
                                  }}
                                >
                                  <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600 }}>
                                    {(game.home_team || 'TBD')} vs {(game.away_team || 'TBD')}
                                  </Typography>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        background: 'rgba(255,255,255,0.08)',
                                        borderRadius: '999px',
                                        px: 1,
                                        py: '2px',
                                        fontSize: '0.7rem',
                                        color: '#ffffff',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      <Box component="span" sx={{ fontSize: '0.85rem' }}>
                                        {getCompetitionIcon(competition?.icon)}
                                      </Box>
                                      <Box component="span">
                                        {badgeLabel}
                                      </Box>
                                    </Box>
                                    <Typography sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                                      {formatTime(game.kickoff_at)}
                                    </Typography>
                                  </Stack>
                                </Box>
                              );
                            })
                          )}
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

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
