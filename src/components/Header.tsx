'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {


  return (
    <AppBar
      position="sticky"
      className="anim-slide-down"
      sx={{
        backgroundColor: 'transparent',
        boxShadow: '0 1px 5px rgba(133, 133, 133, 0.5)',
        borderBottom: '0.5px solid #4b4b4b',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Logo as image make bigger and center and good layout */}
            <Box
              sx={{
                width: 80,
                height: 40,
                position: 'relative',
              }}
            >
              <Link href="/" aria-label="Home">
                <Image
                  src="/assets/images/logo.png"
                  alt="Goalactico Logo"
                  width={80}
                  height={40}
                  priority
                />
              </Link>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                letterSpacing: 1,
                color: '#fff',
                fontSize: { xs: '0.9rem', md: '1.2rem' },
                textTransform: 'uppercase',
              }}
            >
              Goalactico
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.5 } }}>
            <Button
              component={Link}
              href="/signin"
              variant="text"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#fff',
                fontSize: { xs: '0.8rem', md: '0.95rem' },
                '&:hover': {
                  color: '#16a34a',
                },
              }}
            >
              Log In
            </Button>
            <Button
              component={Link}
              href="/signup"
              variant="contained"
              sx={{
                backgroundColor: '#16a34a',
                color: '#000',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '25px',
                padding: { xs: '8px 16px', md: '10px 24px' },
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)',
                fontSize: { xs: '0.8rem', md: '0.95rem' },
                transition: 'background-color 0.3s ease',
                '&:hover': {
                  backgroundColor: '#137f2d',
                  transform: 'none',
                },
                '&:active': {
                  transform: 'none',
                },
                '&:focus-visible': {
                  transform: 'none',
                },
              }}
            >
              Join Now
            </Button>

            {/* menu removed as requested */}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
