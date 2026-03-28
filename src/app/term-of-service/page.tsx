'use client';

import { Box, Container, Stack, Typography } from '@mui/material';
import AmbientBackground from '@/components/ui/AmbientBackground';

export default function TermsOfServicePage() {
  return (
    <Box sx={{ position: 'relative', backgroundColor: '#050505', overflow: 'hidden' }}>
      <AmbientBackground />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, py: { xs: 7, md: 10 } }}>
        <Box className="anim-fade-up" sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900 }}>
            Terms of Service
          </Typography>
          <Typography sx={{ color: '#9ca3af', mt: 1 }}>Last updated: 26 March 2026</Typography>
        </Box>

        <Box
          className="anim-fade-up"
          sx={{
            backgroundColor: 'rgba(10, 10, 10, 0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
          }}
        >
          <Stack spacing={4}>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                1. About Goalactico
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                Goalactico is a skill-based prediction game platform where users forecast aggregated match statistics for
                entertainment purposes. Goalactico is not a gambling service. No betting or wagering is involved. Any
                prizes awarded are based on user performance within prediction-based games.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                2. Eligibility
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#d1d5db', lineHeight: 1.9, m: 0 }}>
                <Typography component="li">Be at least 18 years of age</Typography>
                <Typography component="li">Provide accurate and complete registration details</Typography>
                <Typography component="li">Be legally permitted to participate in your jurisdiction</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                3. Game rules &amp; predictions
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                Predictions must be submitted before the official matchday cut-off time. Any prediction submitted after
                the cut-off is invalid. All cut-off times operate in GMT. Predictions relate to aggregated match
                statistics — not individual match results. Points are awarded based on prediction accuracy only.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                4. Data &amp; results integrity
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                All official match data including goals and corners is sourced from Flashscore, which acts as the sole
                source of truth for all match statistics. All scoring, results and outcomes are final based on this data
                source.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                5. Free vs paid participation
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                Free players may play the FT Goals game free of charge indefinitely but are not eligible for prizes.
                Paid subscribers gain access to additional game types and are eligible for prize competitions subject to
                these Terms.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                6. Subscriptions &amp; payments
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                Subscription fees are charged monthly and processed via Stripe. If payment fails, the account will be
                suspended within 7 days. You may cancel at any time — cancellation takes effect at the end of the
                current billing period. No partial refunds unless required by law.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                7. Prizes
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                Prizes for weekly, monthly, or seasonal leagues are only awarded when there are more than 100 active
                players in the relevant competition period. All prize winners are subject to identity verification, age
                verification and account compliance checks. Goalactico reserves the right to substitute prizes of equal
                or greater value.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                8. Prohibited use
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#d1d5db', lineHeight: 1.9, m: 0 }}>
                <Typography component="li">Using multiple accounts to gain unfair advantage</Typography>
                <Typography component="li">Attempting to manipulate results or platform functionality</Typography>
                <Typography component="li">Using automated systems or bots</Typography>
                <Typography component="li">Engaging in fraudulent or abusive behaviour</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                9. Governing law
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the
                exclusive jurisdiction of the courts of England and Wales.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                10. Contact
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                For questions regarding these Terms contact: team@goalactico.net
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
