'use client';

import {
  Box,
  Button,
  Container,
  Typography,
  Stack,
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Image from 'next/image';

export default function Hero() {
  return (
    <Box
      className="anim-fade-up anim-stagger-parent hero-bg-pulse"
      sx={{
        position: 'relative',
        minHeight: { xs: '70vh', md: '90vh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Background Image */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100%',
          height: '100%',
          opacity: 0.4,
          zIndex: 0,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(15, 5, 5, 0.9) 0%, rgba(15, 5, 5, 0.4) 100%)',
          },
        }}
      >
        <Image
          src="/assets/images/background.jpg"
          alt="Stadium Background"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, px: { xs: 2, md: 3 } }}>
          <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 700 }}>
          {/* Main Heading */}
          <Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '5.5rem', lg: '6.5rem' },
                fontWeight: 900,
                letterSpacing: '-1px',
                lineHeight: 0.95,
                mb: 2,
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              Predict
              <Box component="span" sx={{ display: 'block' }}>
                <motion.span
                  className="hero-title-part"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                >
                  THE
                </motion.span>
                <motion.span
                  className="hero-title-part"
                  style={{ marginLeft: 6, display: 'inline-block', color: '#16a34a', fontWeight: 900, fontSize: 'inherit' }}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                >
                  {' '}GAME
                </motion.span>
              </Box>
            </Typography>
          </Box>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1rem' },
              color: '#ffffff',
              lineHeight: 2,
              fontWeight: 400,
              maxWidth: 500,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            The ultimate football prediction platform. Guess total goals, climb the leaderboard, and prove your ball knowledge.
          </Typography>

          {/* CTA Buttons */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, md: 2 }} sx={{ pt: 2, width: '100%' }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            >
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#0f0505',
                  fontWeight: 900,
                  fontSize: { xs: '0.9rem', md: '1.05rem' },
                  padding: { xs: '14px 24px', md: '16px 40px' },
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                  width: { xs: '100%', sm: 'fit-content' },
                  '&:hover': {
                    backgroundColor: '#137f2d',
                    transform: 'none',
                    boxShadow: '0 8px 20px rgba(22, 163, 74, 0.3)',
                  },
                  '&:active': {
                    transform: 'none',
                  },
                  '&:focus-visible': {
                    transform: 'none',
                  },
                }}
              >
                Start Predicting
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
            >
              <Button
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  outline: '2px solid #ffffff',
                  fontWeight: 900,
                fontSize: { xs: '0.9rem', md: '1.05rem' },
                padding: { xs: '14px 24px', md: '16px 40px' },
                borderRadius: '10px',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                transition: 'background-color 0.3s ease',
                width: { xs: '100%', sm: 'fit-content' },
                '&:hover': {
                  backgroundColor: 'transparent',
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
              How it works
              </Button>
            </motion.div>
          </Stack>
        </Stack>
      </Container>

      {/* Gradient Overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: 'linear-gradient(to bottom, transparent, #0a0a0a)',
          zIndex: 0,
        }}
      />
    </Box>
  );
}
