"use client";

import {
  Box, Typography, Card, CardContent, Grid, Stack, Avatar,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import { useState } from 'react';

interface LeaderboardPlayer {
  rank: number;
  name: string;
  isYou: boolean;
  correct: number;
  exact: number;
  points: number;
  avatarColor: string;
}

const testPlayers: LeaderboardPlayer[] = [
  { rank: 1, name: 'Alex Champion', isYou: false, correct: 89, exact: 23, points: 342, avatarColor: '#4a90e2' },
  { rank: 2, name: 'Sarah Winner', isYou: false, correct: 82, exact: 19, points: 318, avatarColor: '#9b59b6' },
  { rank: 3, name: 'Mike Striker', isYou: false, correct: 78, exact: 17, points: 305, avatarColor: '#e67e22' },
  { rank: 4, name: 'Emma Goals', isYou: false, correct: 74, exact: 15, points: 289, avatarColor: '#1abc9c' },
  { rank: 5, name: 'James Keeper', isYou: false, correct: 71, exact: 14, points: 276, avatarColor: '#e74c3c' },
  { rank: 6, name: 'Don', isYou: true, correct: 68, exact: 12, points: 256, avatarColor: '#3498db' },
];

const getRankIcon = (rank: number) => {
  if (rank === 1) return <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: '1.3rem' }} />;
  if (rank === 2) return <EmojiEventsIcon sx={{ color: '#94a3b8', fontSize: '1.3rem' }} />;
  if (rank === 3) return <EmojiEventsIcon sx={{ color: '#cd7f32', fontSize: '1.3rem' }} />;
  return null;
};

const getRowBg = (rank: number) => {
  if (rank === 1) return 'rgba(245, 158, 11, 0.08)';
  if (rank === 2) return 'rgba(148, 163, 184, 0.06)';
  if (rank === 3) return 'rgba(205, 127, 50, 0.06)';
  return 'transparent';
};

export default function LeaderboardTab() {
  const [timeframe, setTimeframe] = useState('season');

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Avatar sx={{ width: 48, height: 48, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
          <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
        Leaderboard
      </Typography>
          <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
            See how you rank against other predictors
          </Typography>
        </Box>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3, mt: 2 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: '1rem' }} />
                <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>Your Rank</Typography>
              </Stack>
              <Typography sx={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>#6</Typography>
              <Typography sx={{ color: '#16a34a', fontSize: '0.8rem', mt: 0.5 }}>Top 10%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <TrendingUpIcon sx={{ color: '#3b82f6', fontSize: '1rem' }} />
                <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>Points Behind Leader</Typography>
              </Stack>
              <Typography sx={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>86 pts</Typography>
              <Typography sx={{ color: '#999', fontSize: '0.8rem', mt: 0.5 }}>Keep going!</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <PeopleIcon sx={{ color: '#a855f7', fontSize: '1rem' }} />
                <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>Total Players</Typography>
              </Stack>
              <Typography sx={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1 }}>1,247</Typography>
              <Typography sx={{ color: '#999', fontSize: '0.8rem', mt: 0.5 }}>This season</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Timeframe Toggle */}
      <ToggleButtonGroup
        value={timeframe}
        exclusive
        onChange={(_e, val) => val && setTimeframe(val)}
        sx={{ mb: 3 }}
      >
        <ToggleButton
          value="season"
          sx={{
            color: timeframe === 'season' ? '#fff' : '#999',
            backgroundColor: timeframe === 'season' ? '#1a1a1a' : 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            px: 2.5,
            py: 0.8,
            '&.Mui-selected': { backgroundColor: '#1a1a1a', color: '#fff' },
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
          }}
        >
          Season Rankings
        </ToggleButton>
        <ToggleButton
          value="week"
          sx={{
            color: timeframe === 'week' ? '#fff' : '#999',
            backgroundColor: timeframe === 'week' ? '#1a1a1a' : 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            px: 2.5,
            py: 0.8,
            '&.Mui-selected': { backgroundColor: '#1a1a1a', color: '#fff' },
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
          }}
        >
          This Week
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Table Header */}
      <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.5, mb: 1 }}>
        <Typography sx={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, width: 50 }}>#</Typography>
        <Typography sx={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, flex: 1 }}>Player</Typography>
        <Typography sx={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, width: 100, textAlign: 'center' }}>Correct</Typography>
        <Typography sx={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, width: 100, textAlign: 'center' }}>Exact</Typography>
        <Typography sx={{ color: '#999', fontSize: '0.8rem', fontWeight: 600, width: 100, textAlign: 'right' }}>Points</Typography>
      </Stack>

      {/* Player Rows */}
      <Stack spacing={1}>
        {testPlayers.map((player) => (
          <Card
            key={player.rank}
            sx={{
              backgroundColor: player.isYou ? 'rgba(22, 163, 74, 0.06)' : getRowBg(player.rank),
              borderRadius: '10px',
              border: player.isYou ? '1px solid #16a34a' : `1px solid rgba(255, 255, 255, 0.06)`,
            }}
          >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.5 }}>
                {/* Rank */}
                <Box sx={{ width: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  {getRankIcon(player.rank) || (
                    <Typography sx={{ color: '#999', fontSize: '0.9rem', fontWeight: 700 }}>
                      {player.rank}
                    </Typography>
                  )}
                </Box>

                {/* Player */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, backgroundColor: player.avatarColor, fontSize: '0.8rem', fontWeight: 700 }}>
                    {player.name[0]}
                  </Avatar>
                  <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                    {player.name}
                    {player.isYou && (
                      <Box component="span" sx={{ color: '#999', fontWeight: 400, ml: 0.5, fontSize: '0.8rem' }}>(You)</Box>
                    )}
                  </Typography>
                </Stack>

                {/* Correct */}
                <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500, width: 100, textAlign: 'center' }}>
                  {player.correct}
                </Typography>

                {/* Exact */}
                <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500, width: 100, textAlign: 'center' }}>
                  {player.exact}
                </Typography>

                {/* Points */}
                <Typography sx={{
                  color: player.rank <= 3 || player.isYou ? '#16a34a' : '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  width: 100,
                  textAlign: 'right',
                }}>
                  {player.points}
                </Typography>
              </Stack>
        </CardContent>
      </Card>
        ))}
      </Stack>
    </Box>
  );
}
