'use client';

import { Box, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import AmbientBackground from '@/components/ui/AmbientBackground';

export default function HowToPlayPage() {
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
            How to Play
          </Typography>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900, mb: 1.5 }}>
            How to Play
          </Typography>
        </Box>

        <Stack spacing={5}>
          <Box
            className="anim-fade-up"
            sx={{
              backgroundColor: 'rgba(12, 12, 12, 0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
              ⚽ The Basics
            </Typography>
            <Typography sx={{ color: '#cbd5f5', lineHeight: 1.8 }}>
              Each Match Day includes a set of games from different leagues. Your job is simple:
            </Typography>
            <Typography sx={{ color: '#fff', fontWeight: 700, mt: 2 }}>
              👉 Predict the TOTAL number across all games combined — not individual matches.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
              🔢 Example Predictions
            </Typography>
            <Grid container spacing={3} className="anim-stagger-parent">
              {[
                {
                  badge: 'FT Goals',
                  badgeTone: 'free',
                  title: 'Full-Time Goals',
                  lines: ['If a Match Day has 10 games:', 'Total goals across all matches = 28', 'Your prediction = 28'],
                },
                {
                  badge: 'HT Goals',
                  badgeTone: 'pro',
                  title: 'Half-Time Goals',
                  lines: ['Predict the total half-time goals across all matches.', 'Example:', 'Total = 12', 'Your prediction = 12'],
                },
                {
                  badge: 'FT Corners',
                  badgeTone: 'pro',
                  title: 'Full-Time Corners',
                  lines: ['Predict the total corners across all matches.', 'Example:', 'Total = 95', 'Your prediction = 95'],
                },
                {
                  badge: 'HT Corners',
                  badgeTone: 'pro',
                  title: 'Half-Time Corners',
                  lines: ['Predict the total half-time corners across all matches.', 'Example:', 'Total = 42', 'Your prediction = 42'],
                },
              ].map((card, index) => (
                <Grid item xs={12} md={6} key={card.title}>
                  <Card
                    className="anim-fade-up"
                    sx={{
                      height: '100%',
                      backgroundColor: 'rgba(10, 10, 10, 0.9)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 3,
                    }}
                    style={{ ['--delay' as any]: `${index * 80}ms` }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.2,
                          py: 0.4,
                          borderRadius: 999,
                          border: '1px solid',
                          borderColor: card.badgeTone === 'free' ? 'rgba(34,197,94,0.5)' : 'rgba(251,191,36,0.45)',
                          color: card.badgeTone === 'free' ? '#22c55e' : '#fbbf24',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          mb: 1.5,
                        }}
                      >
                        {card.badge}
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.1,
                            borderRadius: 999,
                            backgroundColor: card.badgeTone === 'free' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            letterSpacing: 0.4,
                          }}
                        >
                          {card.badgeTone === 'free' ? 'FREE' : 'PRO'}
                        </Box>
                      </Box>
                      <Typography sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>{card.title}</Typography>
                      <Stack spacing={0.5}>
                        {card.lines.map((line) => (
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
          </Box>

          <Box
            className="anim-fade-up"
            sx={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 3,
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography variant="h5" sx={{ color: '#16a34a', fontWeight: 800, mb: 2 }}>
              🎯 Scoring System
            </Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr' },
                  backgroundColor: 'rgba(22,163,74,0.15)',
                  color: '#a7f3d0',
                  fontWeight: 700,
                  px: 2,
                  py: 1,
                }}
              >
                <Box>Accuracy</Box>
                <Box>Points</Box>
              </Box>
              {[
                ['Exact match', '10 points'],
                ['±1', '7 points'],
                ['±2', '4 points'],
                ['±3', '2 points'],
                ['±4+ or more', '0 points'],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr' },
                    px: 2,
                    py: 1.1,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    color: '#e5e7eb',
                  }}
                >
                  <Box>{label}</Box>
                  <Box sx={{ color: '#22c55e', fontWeight: 700 }}>{value}</Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'stretch', '& > *': { flex: 1 } }}>
            <Card
              className="anim-fade-up"
              sx={{
                height: '100%',
                backgroundColor: 'rgba(10, 10, 10, 0.9)',
                border: '1px solid rgba(34,197,94,0.35)',
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 800, mb: 1 }}>
                  Free Players
                </Typography>
                <Stack spacing={0.6} sx={{ color: '#cbd5f5' }}>
                  <Typography>Play FT Goals only</Typography>
                  <Typography>Maximum 10 points per Match Day</Typography>
                </Stack>
              </CardContent>
            </Card>
            <Card
              className="anim-fade-up"
              sx={{
                height: '100%',
                backgroundColor: 'rgba(10, 10, 10, 0.9)',
                border: '1px solid rgba(251,191,36,0.35)',
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#fbbf24', fontWeight: 800, mb: 1 }}>
                  Subscribers
                </Typography>
                <Stack spacing={0.6} sx={{ color: '#cbd5f5' }}>
                  <Typography>Play all 4 game types</Typography>
                  <Typography>Maximum 40 points per Match Day</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>

          <Box
            className="anim-fade-up"
            sx={{
              backgroundColor: 'rgba(10, 10, 10, 0.9)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 3,
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography variant="h6" sx={{ color: '#16a34a', fontWeight: 800, mb: 1 }}>
              ⏰ Cut-Off Time
            </Typography>
            <Stack spacing={0.6} sx={{ color: '#cbd5f5' }}>
              <Typography>Predictions must be submitted before the Match Day cut-off time</Typography>
              <Typography>Late predictions are invalid</Typography>
              <Typography>All times are shown in GMT</Typography>
            </Stack>
          </Box>

          <Box
            className="anim-fade-up"
            sx={{
              backgroundColor: 'rgba(10, 10, 10, 0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 3,
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
              🔄 Match Day Variety
            </Typography>
            <Typography sx={{ color: '#cbd5f5', lineHeight: 1.8, mb: 1 }}>
              To keep things interesting:
            </Typography>
            <Stack spacing={0.5} sx={{ color: '#cbd5f5' }}>
              <Typography>Some Match Days include 5, 7, or 10 games</Typography>
              <Typography>Others may include 20+ games</Typography>
              <Typography>More games = more unpredictable totals 👀</Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 2 }}>
              Winning Strategy
            </Typography>
            <Grid container spacing={3} className="anim-stagger-parent">
              {[
                {
                  title: '🧠 Think Totals, Not Matches',
                  lines: ['Focus on the combined outcome, not individual results.'],
                },
                {
                  title: '📊 Start with Averages',
                  lines: ['Use a baseline:', 'Goals → ~2.5–3 per game', 'Corners → ~9–11 per game', 'Multiply by the number of games, then adjust.'],
                },
                {
                  title: '⚖️ Adjust for the Match Mix',
                  lines: ['Big teams → More goals', 'Defensive leagues → Lower totals', 'Mixed fixtures → Expect variation'],
                },
                {
                  title: '🔄 Factor in Match Day Size',
                  lines: ['5–7 games → Potentially easier to predict', '15–20+ games → Potentially more volatile'],
                },
                {
                  title: '📉 Play for Consistency',
                  lines: ['You don’t need to be exact all the time.', '±1 or ±2 regularly = strong scores', 'Avoid wild guesses'],
                },
                {
                  title: '⏱️ Check Before Kick-Off',
                  lines: ['Last-minute changes (line-ups, injuries) can shift totals.'],
                },
                {
                  title: '🎯 Play the Long Game',
                  lines: ['Weekly = fun', 'Monthly & Season = where winners are made', 'Consistency beats luck.'],
                },
                {
                  title: '🔥 Final Edge',
                  lines: ['Most players guess.', 'Top players calculate, adjust and are statistics gurus.'],
                },
              ].map((tip, index) => (
                <Grid item xs={12} md={6} key={tip.title}>
                  <Card
                    className="anim-fade-up"
                    sx={{
                      height: '100%',
                      backgroundColor: 'rgba(10, 10, 10, 0.9)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 3,
                    }}
                    style={{ ['--delay' as any]: `${index * 70}ms` }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>{tip.title}</Typography>
                      <Stack spacing={0.4} sx={{ color: '#cbd5f5' }}>
                        {tip.lines.map((line) => (
                          <Typography key={line}>{line}</Typography>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
