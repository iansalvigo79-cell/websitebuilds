'use client';

import { Box } from '@mui/material';

export default function PixelStarfield() {
  return (
    <Box className="pixel-starfield" aria-hidden>
      <Box className="pixel-starfield__layer layer-1" />
      <Box className="pixel-starfield__layer layer-2" />
      <Box className="pixel-starfield__layer layer-3" />
      <Box className="pixel-starfield__glow" />
    </Box>
  );
}
