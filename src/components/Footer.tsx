'use client';

import { Box, Container, Typography, Link, Grid, Divider } from '@mui/material';

export default function Footer() {
  return (
    <Box sx={{ backgroundColor: '#050202', color: '#fff', mt: 0 }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 3, md: 4 }} sx={{ py: { xs: 4, md: 6 } }}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', md: '1.1rem' } }}>
              GamePredict
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
              AI-powered football game predictions and analysis.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              Product
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Features
              </Link>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Pricing
              </Link>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                API Docs
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              Company
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                About Us
              </Link>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Blog
              </Link>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Contact
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '0.95rem', md: '1rem' } }}>
              Legal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Privacy
              </Link>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Terms
              </Link>
              <Link href="#" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, fontSize: { xs: '0.85rem', md: '0.875rem' }, '&:hover': { opacity: 1 } }}>
                Disclaimer
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <Box sx={{ py: { xs: 2, md: 3 }, textAlign: 'center' }}>
          <Typography variant="body2" color="rgba(255,255,255,0.6)" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
            © 2026 GamePredict. All rights reserved. | Responsible Gaming Notice: Gambling involves risk. Please play responsibly.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
