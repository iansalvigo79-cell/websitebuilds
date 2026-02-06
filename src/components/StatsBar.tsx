'use client';

import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import { useState } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card
      sx={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        backgroundColor: 'rgba(26, 10, 10, 0.8)',
        border: '1px solid rgba(255, 107, 53, 0.2)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 20px rgba(0, 255, 0, 0.2)',
          borderColor: '#00ff00',
          backgroundColor: 'rgba(26, 15, 10, 0.9)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 600, color: '#ff6b35' }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function StatsBar() {
  const [view, setView] = useState('upcoming');

  return (
    <Box sx={{ my: 4 }}>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Accuracy Rate"
            value="87.5%"
            icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
            color="#00ff00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Matches Today"
            value="24"
            icon={<EmojiEventsIcon sx={{ fontSize: 28 }} />}
            color="#ff6b35"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value="15.2K"
            icon={<GroupsIcon sx={{ fontSize: 28 }} />}
            color="#00ff00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Best Picks"
            value="92%"
            icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
            color="#00ff00"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)', backgroundColor: 'rgba(26, 10, 10, 0.8)', border: '1px solid rgba(255, 107, 53, 0.2)' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#fff' }}>
                Match Status
              </Typography>
              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(_e, newView) => newView && setView(newView)}
                size="small"
              >
                <ToggleButton value="upcoming">Upcoming</ToggleButton>
                <ToggleButton value="live">Live</ToggleButton>
                <ToggleButton value="completed">Completed</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small">
                All Leagues
              </Button>
              <Button variant="outlined" size="small">
                High Confidence
              </Button>
              <Button variant="outlined" size="small">
                Best Picks Only
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
