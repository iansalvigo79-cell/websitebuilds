"use client";

import {
  Box, Typography, Card, CardContent, Grid, Stack, Avatar,
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AdjustIcon from '@mui/icons-material/Adjust';
import PercentIcon from '@mui/icons-material/Percent';

type PredictionStatus = 'won' | 'lost' | 'partial' | 'pending';

interface PredictionCard {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  yourPick: string;
  yourScore: string;
  points: number;
  status: PredictionStatus;
}

const testStats = [
  { label: 'Total Points', value: '156', icon: <TrendingUpIcon sx={{ fontSize: '1rem' }} />, color: '#16a34a' },
  { label: 'Accuracy', value: '68%', icon: <PercentIcon sx={{ fontSize: '1rem' }} />, color: '#f59e0b' },
  { label: 'Exact Scores', value: '12', icon: <EmojiEventsIcon sx={{ fontSize: '1rem' }} />, color: '#f59e0b' },
  { label: 'Total Predictions', value: '48', icon: <AdjustIcon sx={{ fontSize: '1rem' }} />, color: '#16a34a' },
];

const testPredictions: PredictionCard[] = [
  { id: '1', date: 'Feb 1, 2025', homeTeam: 'Liverpool', awayTeam: 'Manchester United', homeScore: 2, awayScore: 1, yourPick: 'Liverpool', yourScore: '2 - 1', points: 5, status: 'won' },
  { id: '2', date: 'Feb 1, 2025', homeTeam: 'Chelsea', awayTeam: 'Arsenal', homeScore: 1, awayScore: 2, yourPick: 'Draw', yourScore: '1 - 1', points: 0, status: 'lost' },
  { id: '3', date: 'Feb 1, 2025', homeTeam: 'Tottenham', awayTeam: 'Manchester City', homeScore: 0, awayScore: 2, yourPick: 'Manchester City', yourScore: '1 - 3', points: 3, status: 'partial' },
  { id: '4', date: 'Feb 8, 2025', homeTeam: 'Brighton', awayTeam: 'Newcastle', homeScore: null, awayScore: null, yourPick: 'Brighton', yourScore: '2 - 0', points: 0, status: 'pending' },
  { id: '5', date: 'Feb 8, 2025', homeTeam: 'West Ham', awayTeam: 'Aston Villa', homeScore: null, awayScore: null, yourPick: 'Aston Villa', yourScore: '1 - 2', points: 0, status: 'pending' },
];

const getStatusConfig = (status: PredictionStatus) => {
  switch (status) {
    case 'won':
      return { icon: <EmojiEventsIcon sx={{ fontSize: '0.9rem' }} />, color: '#f59e0b', label: '' };
    case 'lost':
      return { icon: <CancelIcon sx={{ fontSize: '0.9rem' }} />, color: '#ef4444', label: '' };
    case 'partial':
      return { icon: <CheckCircleIcon sx={{ fontSize: '0.9rem' }} />, color: '#16a34a', label: '' };
    case 'pending':
      return { icon: <AccessTimeIcon sx={{ fontSize: '0.9rem' }} />, color: '#999', label: 'Pending' };
  }
};

export default function MyPredictionsTab() {
  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Avatar sx={{ width: 48, height: 48, backgroundColor: 'rgba(22, 163, 74, 0.15)' }}>
          <SportsSoccerIcon sx={{ color: '#16a34a', fontSize: '1.5rem' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
        My Predictions
      </Typography>
          <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
            Track your prediction history and performance
          </Typography>
        </Box>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4, mt: 2 }}>
        {testStats.map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card sx={{ backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                  <Typography sx={{ color: '#999', fontSize: '0.75rem', fontWeight: 500 }}>
                    {stat.label}
                  </Typography>
                </Stack>
                <Typography sx={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Predictions */}
      <Typography sx={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, mb: 2 }}>
        Recent Predictions
      </Typography>

      <Grid container spacing={2}>
        {testPredictions.map((prediction) => {
          const statusConfig = getStatusConfig(prediction.status);
          const borderColor = prediction.status === 'won' ? '#f59e0b'
            : prediction.status === 'partial' ? '#16a34a'
            : prediction.status === 'lost' ? '#ef4444'
            : 'rgba(255, 255, 255, 0.1)';

          return (
            <Grid item xs={12} md={6} key={prediction.id}>
              <Card sx={{
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
              }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {/* Top Row: Date + Status */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography sx={{ color: '#999', fontSize: '0.8rem' }}>
                      {prediction.date}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ color: statusConfig.color }}>{statusConfig.icon}</Box>
                      <Typography sx={{ color: statusConfig.color, fontSize: '0.85rem', fontWeight: 700 }}>
                        {prediction.status === 'pending'
                          ? 'Pending'
                          : prediction.status === 'lost'
                            ? `${prediction.points} pts`
                            : `+${prediction.points} pts`
                        }
                      </Typography>
                    </Stack>
                  </Stack>

                  {/* Teams Row */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 32, height: 32, backgroundColor: '#2a2a2a', fontSize: '0.7rem', fontWeight: 700 }}>
                        {prediction.homeTeam[0]}
                      </Avatar>
                      <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                        {prediction.homeTeam}
                      </Typography>
                    </Stack>

                    <Typography sx={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, mx: 2 }}>
                      {prediction.homeScore !== null && prediction.awayScore !== null
                        ? `${prediction.homeScore} - ${prediction.awayScore}`
                        : 'vs'
                      }
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                        {prediction.awayTeam}
                      </Typography>
                      <Avatar sx={{ width: 32, height: 32, backgroundColor: '#2a2a2a', fontSize: '0.7rem', fontWeight: 700 }}>
                        {prediction.awayTeam[0]}
                      </Avatar>
                    </Stack>
                  </Stack>

                  {/* Bottom Row: Pick + Score */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center"
                    sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', pt: 1.5 }}
                  >
                    <Typography sx={{ color: '#999', fontSize: '0.8rem' }}>
                      Your pick: <Box component="span" sx={{ color: '#fff', fontWeight: 700 }}>{prediction.yourPick}</Box>
                    </Typography>
                    <Typography sx={{ color: '#999', fontSize: '0.8rem' }}>
                      Score: <Box component="span" sx={{ color: '#fff', fontWeight: 700 }}>{prediction.yourScore}</Box>
                    </Typography>
                  </Stack>
        </CardContent>
      </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
