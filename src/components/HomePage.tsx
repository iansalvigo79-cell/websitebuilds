'use client';

import { Box } from '@mui/material';
import { Hero, Features, FAQ } from '@/components';

export default function HomePage() {
  return (
    <Box sx={{ backgroundColor: '#0a0a0a' }}>
      <Hero />
      <Features />
      <FAQ />
    </Box>
  );
}
