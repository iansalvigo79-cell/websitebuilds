"use client";

import {
  Box, Typography, Card, CardContent, Grid, Stack, Avatar, Button,
  ToggleButton, ToggleButtonGroup, LinearProgress,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useState } from 'react';

interface League {
  id: string;
  name: string;
  creator: string;
  yourRank: number;
  members: number;
  maxMembers: number;
  isCrowned: boolean;
}

const testLeagues: League[] = [
  { id: '1', name: 'Premier League Fans', creator: 'Alex Champion', yourRank: 3, members: 45, maxMembers: 50, isCrowned: false },
  { id: '2', name: 'Office Predictions', creator: 'Don', yourRank: 1, members: 12, maxMembers: 20, isCrowned: true },
  { id: '3', name: 'University Mates', creator: 'Sarah Winner', yourRank: 8, members: 28, maxMembers: 50, isCrowned: false },
];

export default function LeaguesTab() {
  const [view, setView] = useState('my-leagues');

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 48, height: 48, backgroundColor: 'rgba(22, 163, 74, 0.15)' }}>
            <PeopleIcon sx={{ color: '#16a34a', fontSize: '1.5rem' }} />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
        Leagues
      </Typography>
            <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
              Compete with friends in private leagues
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{
            color: '#16a34a',
            borderColor: '#16a34a',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '8px',
            px: 2.5,
            '&:hover': { borderColor: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.08)' },
          }}
        >
          Create League
        </Button>
      </Stack>

      {/* View Toggle */}
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(_e, val) => val && setView(val)}
        sx={{ mb: 3, mt: 2 }}
      >
        <ToggleButton
          value="my-leagues"
          sx={{
            color: view === 'my-leagues' ? '#fff' : '#999',
            backgroundColor: view === 'my-leagues' ? '#1a1a1a' : 'transparent',
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
          My Leagues
        </ToggleButton>
        <ToggleButton
          value="discover"
          sx={{
            color: view === 'discover' ? '#fff' : '#999',
            backgroundColor: view === 'discover' ? '#1a1a1a' : 'transparent',
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
          Discover
        </ToggleButton>
      </ToggleButtonGroup>

      {/* League Cards */}
      <Grid container spacing={2}>
        {testLeagues.map((league) => (
          <Grid item xs={12} sm={6} md={4} key={league.id}>
            <Card sx={{
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                {/* Top: Icon + Name + Rank */}
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{ width: 40, height: 40, backgroundColor: 'rgba(22, 163, 74, 0.15)' }}>
                      <PeopleIcon sx={{ color: '#16a34a', fontSize: '1.2rem' }} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
                          {league.name}
                        </Typography>
                        {league.isCrowned && (
                          <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: '1rem' }} />
                        )}
                      </Stack>
                      <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>
                        by {league.creator}
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ color: '#999', fontSize: '0.7rem' }}>Your Rank</Typography>
                    <Typography sx={{ color: '#16a34a', fontSize: '1.1rem', fontWeight: 800 }}>
                      #{league.yourRank}
                    </Typography>
                  </Box>
                </Stack>

                {/* Members Progress */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <PeopleIcon sx={{ color: '#999', fontSize: '1rem' }} />
                  <Typography sx={{ color: '#999', fontSize: '0.8rem' }}>
                    {league.members}/{league.maxMembers} members
          </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(league.members / league.maxMembers) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    mb: 2,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#16a34a',
                      borderRadius: 3,
                    },
                  }}
                />

                {/* View League Button */}
                <Button
                  fullWidth
                  endIcon={<ArrowForwardIcon sx={{ fontSize: '1rem' }} />}
                  sx={{
                    color: '#fff',
                    backgroundColor: '#2a2a2a',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    py: 1,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:hover': { backgroundColor: '#333' },
                  }}
                >
                  View League
                </Button>
        </CardContent>
      </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
