'use client';

import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import StarIcon from '@mui/icons-material/Star';
import Link from 'next/link';

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
}

function FeatureCard({ title, description, icon, href }: FeatureProps) {
  return (
    <Card
      sx={{
        backgroundColor: '#0a0a0a',
        border: '1px solid #cecece',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        cursor: href ? 'pointer' : 'default',
        '&:hover': {
          borderColor: '#ffffff',
          boxShadow: '0 0 20px rgba(22, 163, 74, 0.12)',
          backgroundColor: 'rgba(11, 36, 9, 0.8)',
        },
      }}
    >
      {href ? (
        <CardActionArea component={Link} href={href} sx={{ height: '100%' }}>
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
        </CardActionArea>
      ) : (
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
      )}
    </Card>
  );
}

export default function Features() {
  const features = [
    {
      title: 'PLAY FOR FREE',
      description:
        'Analyse the fixtures and make your prediction for the total number of goals scored across all the games in a matchday.',
      icon: <TrendingUpIcon sx={{ fontSize: '2.5rem' }} />,
      href: '/signup',
    },
    {
      title: 'Climb The Ranks',
      description:
        'Earn points based on prediction accuracy. The closer your prediction the more points you score. Can you be the greatest of all time!',
      icon: <LeaderboardIcon sx={{ fontSize: '2.5rem' }} />,
    },
    {
      title: 'SUBSCRIBE TO WIN PRIZES',
      description:
        'Unlock more prediction games, exclusive features and your chance to win exciting prizes.',
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
            THINK YOU KNOW FOOTBALL?!
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
            Simple to play, endless excitement. Can you predict the outcome of the next matchday?
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
