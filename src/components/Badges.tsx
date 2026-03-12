"use client";

import { Box, Typography, Tooltip } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { BadgeType } from '@/types/database';
import { getBadgeLabel, getBadgeDescription } from '@/lib/badges';

interface BadgesProps {
  badges: BadgeType[];
  max?: number;
}

export function Badges({ badges, max = 6 }: BadgesProps) {
  const show = badges.slice(0, max);
  if (show.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      {show.map((type) => (
        <Tooltip key={type} title={getBadgeDescription(type) || getBadgeLabel(type)}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              backgroundColor: 'rgba(22, 163, 74, 0.2)',
              border: '1px solid rgba(22, 163, 74, 0.4)',
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: '1rem', color: '#16a34a' }} />
            <Typography sx={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
              {getBadgeLabel(type)}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
