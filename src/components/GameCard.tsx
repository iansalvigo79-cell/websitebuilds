'use client';

import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  Typography,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import { Game } from '@/types/game';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const { homeTeam, awayTeam, predictions, odds, league, date, status } = game;

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'home':
        return '#00ff00';
      case 'away':
        return '#ff6b6b';
      case 'draw':
        return '#ffa500';
      case 'over':
        return '#00ff00';
      case 'under':
        return '#6b7fff';
      default:
        return '#999';
    }
  };

  const formatDate = (d: Date) => {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card
      className="anim-fade-up card-glow"
      style={{ ['--delay' as any]: '80ms' }}
      sx={{
        height: '100%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        backgroundColor: 'rgba(26, 10, 10, 0.8)',
        border: '1px solid rgba(255, 107, 53, 0.2)',
        transition: 'all 0.3s ease, box-shadow 2s ease-in-out',
        '&:hover': {
          boxShadow: '0 8px 20px rgba(0, 255, 0, 0.2)',
          transform: 'translateY(-4px)',
          borderColor: '#00ff00',
          backgroundColor: 'rgba(26, 15, 10, 0.9)',
        },
      }}
    >
      <CardHeader
        title={league}
        subheader={formatDate(date)}
        sx={{
          backgroundColor: 'rgba(10, 5, 5, 0.6)',
          borderBottom: '1px solid rgba(255, 107, 53, 0.1)',
          color: '#fff',
        }}
        titleTypographyProps={{ sx: { color: '#fff', fontWeight: 600 } }}
        subheaderTypographyProps={{ sx: { color: '#ff6b35' } }}
      />
      <CardContent>
        <Stack spacing={3}>
          {/* Teams */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                {homeTeam.name}
              </Typography>
              {homeTeam.form && (
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                  {homeTeam.form.map((result, i) => (
                    <Chip
                      key={i}
                      label={result}
                      size="small"
                      sx={{
                        backgroundColor: result === 'W' ? '#00ff00' : result === 'L' ? '#ff6b6b' : '#ffa500',
                        color: result === 'W' ? '#000' : '#fff',
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            <Box sx={{ textAlign: 'center', mx: 2 }}>
              <Typography variant="body2" color="textSecondary">
                vs
              </Typography>
              <Chip
                label={status.toUpperCase()}
                size="small"
                color={status === 'upcoming' ? 'default' : 'primary'}
                sx={{ mt: 1 }}
              />
            </Box>
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                {awayTeam.name}
              </Typography>
              {awayTeam.form && (
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                  {awayTeam.form.map((result, i) => (
                    <Chip
                      key={i}
                      label={result}
                      size="small"
                      sx={{
                        backgroundColor: result === 'W' ? '#00ff00' : result === 'L' ? '#ff6b6b' : '#ffa500',
                        color: result === 'W' ? '#000' : '#fff',
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Predictions */}
          <Box sx={{ backgroundColor: 'rgba(10, 5, 5, 0.6)', p: 2, borderRadius: 1, border: '1px solid rgba(255, 107, 53, 0.2)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
                Win Probabilities
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUpIcon sx={{ fontSize: 18, color: '#00ff00' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#00ff00' }}>
                  {predictions.confidence}% Confidence
                </Typography>
              </Box>
            </Box>

              <Grid item xs={4}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#fff' }}>Home Win</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#00ff00' }}>
                      {predictions.homeWinProb}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={predictions.homeWinProb}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      backgroundColor: '#1a0a0a',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#00ff00',
                      },
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#fff' }}>Draw</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#ff6b35' }}>
                      {predictions.drawProb}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={predictions.drawProb}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      backgroundColor: '#1a0a0a',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#ff6b35',
                      },
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#fff' }}>Away Win</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#ff6b6b' }}>
                      {predictions.awayWinProb}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={predictions.awayWinProb}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      backgroundColor: '#1a0a0a',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#ff6b6b',
                      },
                    }}
                  />
                </Box>
              </Grid>
          </Box>

          {/* Predicted Score */}
          {predictions.predictedScore && (
            <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: 'rgba(0, 255, 0, 0.1)', borderLeft: '4px solid #00ff00', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ color: '#ff6b35' }}>
                Predicted Score
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff' }}>
                {predictions.predictedScore.home} - {predictions.predictedScore.away}
              </Typography>
            </Box>
          )}

          {/* Odds */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
            <Box sx={{ p: 1, backgroundColor: 'rgba(10, 5, 5, 0.6)', borderRadius: 1, textAlign: 'center', border: '1px solid rgba(255, 107, 53, 0.2)' }}>
              <Typography variant="caption" sx={{ color: '#ff6b35' }}>
                1 (Home)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                {odds.homeWin.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ p: 1, backgroundColor: 'rgba(10, 5, 5, 0.6)', borderRadius: 1, textAlign: 'center', border: '1px solid rgba(255, 107, 53, 0.2)' }}>
              <Typography variant="caption" sx={{ color: '#ff6b35' }}>
                X (Draw)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                {odds.draw.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ p: 1, backgroundColor: 'rgba(10, 5, 5, 0.6)', borderRadius: 1, textAlign: 'center', border: '1px solid rgba(255, 107, 53, 0.2)' }}>
              <Typography variant="caption" sx={{ color: '#ff6b35' }}>
                2 (Away)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                {odds.awayWin.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Recommendation */}
          <Box
            sx={{
              p: 1.5,
              backgroundColor: getRecommendationColor(predictions.recommendation),
              borderRadius: 1,
              color: predictions.recommendation === 'home' || predictions.recommendation === 'over' ? '#000' : '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <ThumbUpIcon sx={{ fontSize: 20 }} />
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', color: 'inherit' }}>
                Best Pick
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'inherit' }}>
                {predictions.recommendation.toUpperCase()}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
