"use client";

import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface PrizeWithProfile {
  id: string;
  type: string;
  period: string;
  winner_user_id: string;
  prize_description: string | null;
  status: string;
  created_at: string;
  profiles?: { display_name: string | null } | null;
}

export default function PrizeWidget() {
  const [activePrize, setActivePrize] = useState<PrizeWithProfile | null>(null);
  const [userPrize, setUserPrize] = useState<PrizeWithProfile | null>(null);

  const fetchPrizes = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return;
    }
    const res = await fetch('/api/prizes/dashboard', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setActivePrize(data.activePrize ?? null);
      setUserPrize(data.userPrize ?? null);
    }
  }, []);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchPrizes();
    }, 5000);
    return () => window.clearInterval(id);
  }, [fetchPrizes]);

  return (
    <Box sx={{ mb: 2 }}>
      {activePrize && (
        <Card sx={{ backgroundColor: '#161a23', border: '1px solid rgba(255,255,255,0.08)' }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 800, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <EmojiEventsIcon sx={{ color: '#eab308' }} /> {activePrize.status === 'pending' ? 'Active Prize' : 'Latest Prize Result'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.7 }} alignItems="center">
                  <Chip label={activePrize.type} size="small" sx={{ bgcolor: 'rgba(22,163,74,0.2)', color: '#4ade80', textTransform: 'capitalize' }} />
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.84rem' }}>{activePrize.period}</Typography>
                </Stack>
                <Typography sx={{ color: '#d1d5db', mt: 0.7 }}>{activePrize.prize_description || 'Monthly Reward'}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
