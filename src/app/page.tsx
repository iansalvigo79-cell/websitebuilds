'use client';

import { Box } from '@mui/material';
import { Header, Hero, Features, Footer } from '@/components';

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a' }}>
      <Header />
      <Box sx={{ flex: 1 }}>
        <Hero />
        <Features />
      </Box>
      <Footer />
    </Box>
  );
}
