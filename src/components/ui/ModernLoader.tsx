"use client";

import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

type ModernLoaderProps = {
  size?: number;
  label?: string;
  sublabel?: string;
  minHeight?: number | string;
  inline?: boolean;
  showIcon?: boolean;
  sx?: SxProps<Theme>;
};

export default function ModernLoader({
  size = 88,
  label = 'Loading Data',
  sublabel = 'Syncing latest results from database...',
  minHeight = '50vh',
  inline = false,
  showIcon,
  sx,
}: ModernLoaderProps) {
  const iconVisible = showIcon ?? true;
  const iconSize = Math.max(10, Math.round(size * 0.2));
  const centerSize = Math.max(14, Math.round(size * 0.56));
  const ringBorder = Math.max(1, Math.round(size * 0.03));
  const spinBorder = Math.max(2, Math.round(size * 0.045));
  const pulseGrow = Math.max(6, Math.round(size * 0.11));
  const core = (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        '@keyframes gaOrbitSpin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        '@keyframes gaOrbitPulse': {
          '0%': { transform: 'scale(0.92)', opacity: 0.75 },
          '100%': { transform: 'scale(1.12)', opacity: 0 },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${ringBorder}px solid rgba(255,255,255,0.08)`,
          background: 'radial-gradient(circle at 30% 30%, rgba(22,163,74,0.16), rgba(22,163,74,0.03) 60%, transparent 100%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: -(pulseGrow / 2),
          borderRadius: '50%',
          border: '1px solid rgba(34,197,94,0.35)',
          animation: 'gaOrbitPulse 1.6s ease-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${spinBorder}px solid transparent`,
          borderTopColor: '#22c55e',
          borderRightColor: '#10b981',
          animation: 'gaOrbitSpin 1.05s linear infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: centerSize,
          height: centerSize,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          bgcolor: '#161a23',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iconVisible ? (
          <EmojiEventsIcon sx={{ color: '#4ade80', fontSize: `${iconSize}px`, display: 'block', lineHeight: 1 }} />
        ) : (
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ade80' }} />
        )}
      </Box>
    </Box>
  );

  if (inline) {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0, ...sx }}>
        {core}
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', ...sx }}>
      <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {core}
        {label ? (
          <Typography sx={{ color: '#e5e7eb', fontWeight: 800, letterSpacing: '0.015em', fontSize: '0.9rem', lineHeight: 1.2, mt: 1.7 }}>
            {label}
          </Typography>
        ) : null}
        {sublabel ? (
          <Typography sx={{ color: '#6b7280', fontSize: '0.74rem', lineHeight: 1.35, mt: 0.45 }}>
            {sublabel}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
