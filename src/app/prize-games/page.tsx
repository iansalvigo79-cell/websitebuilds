'use client';

import { Box, Card, CardContent, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import AmbientBackground from '@/components/ui/AmbientBackground';

export default function PrizeGamesPage() {
  return (
    <Box sx={{ position: 'relative', backgroundColor: '#050505', overflow: 'hidden' }}>
      <AmbientBackground />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 7, md: 10 } }}>
        <Box className="anim-fade-up" sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 0.5,
              borderRadius: 999,
              border: '1px solid rgba(34,197,94,0.35)',
              color: '#16a34a',
              fontSize: '0.75rem',
              letterSpacing: 1,
              textTransform: 'uppercase',
              mb: 1.5,
            }}
          >
            Prizes
          </Typography>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900 }}>
            Prizes
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
            Prize competitions
          </Typography>
        </Box>

        <Grid container spacing={3} className="anim-stagger-parent">
          {[
            {
              label: 'Player prize',
              title: '🎯 Match Day Rewards',
              body: [
                'Score 40 points in a single Match Day and unlock a prize.',
                'Simple. Hit the target, win the reward.',
              ],
              color: 'rgba(251,191,36,0.35)',
              accent: '#fbbf24',
            },
            {
              label: 'Weekly league',
              title: '🏆 Weekly League',
              body: ['Top the weekly leaderboard and earn bragging rights.', 'No prizes — just pure competition.'],
              color: 'rgba(59,130,246,0.35)',
              accent: '#60a5fa',
            },
            {
              label: 'Monthly league',
              title: '📅 Monthly League',
              body: ['Finish top of the monthly table and qualify for prizes.', 'Consistency pays over time.'],
              color: 'rgba(245,158,11,0.35)',
              accent: '#f59e0b',
            },
            {
              label: 'Season league',
              title: '🥇 Season League',
              body: ['Dominate across the full season and win bigger prizes.', 'This is where the real players stand out.'],
              color: 'rgba(34,197,94,0.35)',
              accent: '#22c55e',
            },
          ].map((card, index) => (
            <Grid item xs={12} md={6} key={card.title}>
              <Card
                className="anim-fade-up"
                sx={{
                  height: '100%',
                  backgroundColor: 'rgba(10, 10, 10, 0.9)',
                  border: `1px solid ${card.color}`,
                  borderRadius: 3,
                }}
                style={{ ['--delay' as any]: `${index * 80}ms` }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: 999,
                      border: `1px solid ${card.color}`,
                      color: card.accent,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      mb: 1.5,
                    }}
                  >
                    {card.label}
                  </Box>
                  <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', mb: 1 }}>
                    {card.title}
                  </Typography>
                  <Stack spacing={0.6}>
                    {card.body.map((line) => (
                      <Typography key={line} sx={{ color: '#cbd5f5', lineHeight: 1.7 }}>
                        {line}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box
          className="anim-fade-up"
          sx={{
            mt: 5,
            backgroundColor: 'rgba(12, 12, 12, 0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
          }}
        >
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
            Prize pool
          </Typography>
          <Typography sx={{ color: '#cbd5f5', mb: 2 }}>
            We keep it exciting. Prizes may include:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            {['Amazon vouchers', 'TVs', 'Laptops', 'Holidays', 'Football-related rewards'].map((label) => (
              <Chip
                key={label}
                label={label}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              />
            ))}
          </Stack>
          <Typography sx={{ color: '#9ca3af' }}>More players = bigger and better prizes.</Typography>
        </Box>

        <Box
          className="anim-fade-up"
          sx={{
            mt: 4,
            backgroundColor: 'rgba(25, 20, 8, 0.9)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
          }}
        >
          <Typography variant="h6" sx={{ color: '#fbbf24', fontWeight: 800, mb: 1 }}>
            ⚠️ Prize Eligibility
          </Typography>
          <Typography sx={{ color: '#e5e7eb', lineHeight: 1.8 }}>
            League prizes are only awarded when there are 100+ active players in the relevant competition period.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
