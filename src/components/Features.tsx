'use client';

import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import StarIcon from '@mui/icons-material/Star';

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureProps) {
  return (
    <Card
      sx={{
        backgroundColor: '#0a0a0a',
        border: '1px solid #cecece',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: '#ffffff',
          boxShadow: '0 0 20px rgba(22, 163, 74, 0.12)',
          backgroundColor: 'rgba(11, 36, 9, 0.8)',
        },
      }}
    >
      <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', p: { xs: 2, md: 3 } }}>
        <Box sx={{ color: '#16a34a', mb: 2, fontSize: { xs: 32, md: 40 } }}>
          {icon}
        </Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#fff',
            mb: 1.5,
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontSize: { xs: '1rem', md: '1.25rem' },
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#ffffff',
            lineHeight: 1.6,
            fontSize: { xs: '0.85rem', md: '0.95rem' },
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Features() {
  const features = [
    {
      title: 'Predict Total Goals',
      description:
        'Analyze the fixtures and predict the total number of goals scored across all games in a match day.',
      icon: <TrendingUpIcon sx={{ fontSize: '2.5rem' }} />,
    },
    {
      title: 'Climb The Ranks',
      description:
        'Earn points based on accuracy. The closer you get, the more points you get. The winner leaderboard.',
      icon: <LeaderboardIcon sx={{ fontSize: '2.5rem' }} />,
    },
    {
      title: 'Pro Access',
      description:
        'Unlock advanced stats, history tracking, and exclusive features with our pro subscription.',
      icon: <StarIcon sx={{ fontSize: '2.5rem' }} />,
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 6, md: 8 },
        backgroundColor: 'transparent',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              color: '#fff',
              mb: 2,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Master The Game
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#ffffff',
              fontSize: { xs: '0.95rem', md: '1.1rem' },
              maxWidth: 500,
              mx: 'auto',
              lineHeight: 1.8,
            }}
          >
            Simple rules, endless excitement. Can you predict the flow of the match day?
          </Typography>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <FeatureCard
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
