'use client';

import { Box, Container, Typography, Link, Grid, Divider } from '@mui/material';
import { usePathname } from 'next/navigation';

// Pages where the footer should be hidden
const HIDDEN_ROUTES = ['/signin', '/signup'];

export default function Footer() {
  const pathname = usePathname();

  const isHidden = HIDDEN_ROUTES.includes(pathname) || pathname.startsWith('/admin');

  if (isHidden) {
    return null;
  }

  return (
    <Box sx={{ backgroundColor: '#050202', color: '#fff', mt: 0 }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 3, md: 4 }} sx={{ py: { xs: 4, md: 6 } }}>
          <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', md: '1.1rem' } }}>
              GamePredict ---- GOALACTICO
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
              Put your football knowledge to the test. Play free forever or subscribe to unlock full challenges and prove you're a genuine prediction expert.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              Product
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: { xs: 'center', sm: 'flex-start' } }}>
              <Link href="/how-to-play" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                How to Play
              </Link>
              <Link href="/prize-games" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Prizes
              </Link>
              <Link href="/paywall" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Subscription
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              Company
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: { xs: 'center', sm: 'flex-start' } }}>
              <Link href="/blog" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Blog
              </Link>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Contact
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              Legal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: { xs: 'center', sm: 'flex-start' } }}>
              <Link href="/privacy" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Privacy
              </Link>
              <Link href="/term-of-service" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Terms
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ py: { xs: 2, md: 3 }, textAlign: 'center' }}>
          <Typography variant="body2" color="rgba(255,255,255,0.6)" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
            © 2026 Goalactico. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

