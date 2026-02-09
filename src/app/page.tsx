'use client';

import { Box } from '@mui/material';
import { Hero, Features } from '@/components';

export default function Home() {
  return (
    <Box sx={{ backgroundColor: '#0a0a0a' }}>
      <Hero />
      <Features />
    </Box>
  );
}
