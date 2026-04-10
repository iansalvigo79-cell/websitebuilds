'use client';

import { Box } from '@mui/material';
import { Hero, NextMatchday, Features, FAQ } from '@/components';
import { createPageMetadata } from '@/lib/seo';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata('home');
}

export default function HomePage() {
  return (
    <Box sx={{ backgroundColor: '#0a0a0a' }}>
      <Hero />
      <NextMatchday />
      <Features />
      <FAQ />
    </Box>
  );
}
