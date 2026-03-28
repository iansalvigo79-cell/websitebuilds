'use client';

import { Box, Container, Stack, Typography } from '@mui/material';
import AmbientBackground from '@/components/ui/AmbientBackground';

export default function PrivacyPolicyPage() {
  return (
    <Box sx={{ position: 'relative', backgroundColor: '#050505', overflow: 'hidden' }}>
      <AmbientBackground />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, py: { xs: 7, md: 10 } }}>
        <Box className="anim-fade-up" sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900 }}>
            Privacy Policy
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
                1. What data we collect
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8, mb: 1 }}>
                When you use Goalactico, we may collect the following:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#d1d5db', lineHeight: 1.9, m: 0 }}>
                <Typography component="li">Name and email address</Typography>
                <Typography component="li">Account details including username</Typography>
                <Typography component="li">Payment-related details (processed securely via Stripe)</Typography>
                <Typography component="li">Predictions submitted, points, scores and league participation</Typography>
                <Typography component="li">IP address, device and browser type, log and usage data</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                2. How we use your data
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#d1d5db', lineHeight: 1.9, m: 0 }}>
                <Typography component="li">Create and manage your account</Typography>
                <Typography component="li">Provide access to Goalactico games and features</Typography>
                <Typography component="li">Process subscriptions and payments</Typography>
                <Typography component="li">Track predictions, scores and rankings</Typography>
                <Typography component="li">Communicate important updates</Typography>
                <Typography component="li">Improve the platform and prevent fraud</Typography>
              </Box>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8, mt: 1 }}>
                We do not sell your personal data.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                3. Payments
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                All payments are processed securely via Stripe. Goalactico does not store your full payment card details.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                4. Legal basis for processing (GDPR)
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#d1d5db', lineHeight: 1.9, m: 0 }}>
                <Typography component="li">Contractual necessity — to provide the Goalactico service</Typography>
                <Typography component="li">Legal obligations — including fraud prevention and compliance</Typography>
                <Typography component="li">Legitimate interests — improving and protecting our platform</Typography>
                <Typography component="li">Consent — where required (e.g. marketing communications)</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                5. Data sharing
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                We only share your data where necessary — with payment providers (Stripe), hosting providers, and legal
                authorities if required by law. We do not share your data with third parties for marketing purposes.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                6. Data retention
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                We keep your data only for as long as necessary to maintain your account, provide the service, and meet
                legal requirements. If you close your account, we will delete or anonymise your data unless legally
                required to retain it.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                7. Your rights (UK GDPR)
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#d1d5db', lineHeight: 1.9, m: 0 }}>
                <Typography component="li">Access your personal data</Typography>
                <Typography component="li">Correct inaccurate data</Typography>
                <Typography component="li">Request deletion of your data</Typography>
                <Typography component="li">Restrict or object to processing</Typography>
                <Typography component="li">Request data portability</Typography>
              </Box>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8, mt: 1 }}>
                To exercise any of these rights, contact us at team@goalactico.net
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                8. Age requirement
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                Goalactico is only available to users aged 18 or over. We do not knowingly collect data from individuals
                under 18.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                9. Contact
              </Typography>
              <Typography sx={{ color: '#d1d5db', lineHeight: 1.8 }}>
                For questions about this Privacy Policy contact: team@goalactico.net
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
