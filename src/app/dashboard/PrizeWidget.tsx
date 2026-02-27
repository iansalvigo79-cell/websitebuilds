"use client";

import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export interface PrizeWithProfile {
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
  const [recentWinners, setRecentWinners] = useState<PrizeWithProfile[]>([]);
  const [userPrize, setUserPrize] = useState<PrizeWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrizes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }
      const res = await fetch('/api/prizes/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActivePrize(data.activePrize ?? null);
        setRecentWinners(Array.isArray(data.recentWinners) ? data.recentWinners : []);
        setUserPrize(data.userPrize ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  const displayName = (p: PrizeWithProfile): string =>
    p.profiles?.display_name ?? (p.winner_user_id ? `${p.winner_user_id.slice(0, 8)}…` : '—');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress sx={{ color: '#16a34a' }} size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {userPrize && (
        <Alert
          severity="success"
          icon={<span role="img" aria-label="trophy">🏆</span>}
          sx={{
            mb: 3,
            backgroundColor: 'rgba(22, 163, 74, 0.15)',
            border: '1px solid rgba(22, 163, 74, 0.5)',
            color: '#fff',
            '& .MuiAlert-message': { color: '#fff' },
          }}
        >
          <Typography component="span" sx={{ fontWeight: 600 }}>
            Congratulations! You won a prize. We will contact you by email soon.
          </Typography>
        </Alert>
      )}

      {activePrize && (
        <Card
          sx={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            mb: 3,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsIcon sx={{ color: '#eab308' }} />
              Active Prize
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Chip label={activePrize.type} size="small" sx={{ backgroundColor: 'rgba(22, 163, 74, 0.2)', color: '#16a34a', textTransform: 'capitalize' }} />
                <Typography sx={{ color: '#ccc', fontSize: '0.95rem' }}>{activePrize.period}</Typography>
              </Box>
              {activePrize.prize_description && (
                <Typography sx={{ color: '#fff', fontSize: '0.95rem' }}>{activePrize.prize_description}</Typography>
              )}
              <Typography sx={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                Current Leader: {displayName(activePrize)}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!activePrize && !loading && (
        <Card
          sx={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            mb: 3,
          }}
        >
          <CardContent sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem' }}>
              No active prize at the moment. Check back soon.
            </Typography>
          </CardContent>
        </Card>
      )}

      {recentWinners.length > 0 && (
        <Card
          sx={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsIcon sx={{ color: '#16a34a', fontSize: '1.2rem' }} />
              Recent Winners
            </Typography>
            <Stack spacing={1.5}>
              {recentWinners.map((p) => (
                <Box
                  key={p.id}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1,
                    py: 1,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    '&:last-of-type': { borderBottom: 'none' },
                  }}
                >
                  <Typography component="span" sx={{ color: '#9ca3af', fontSize: '0.9rem', minWidth: 140 }}>
                    {p.period}
                  </Typography>
                  <Typography component="span" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                    {displayName(p)}
                  </Typography>
                  {p.prize_description && (
                    <Typography component="span" sx={{ color: '#16a34a', fontSize: '0.9rem' }}>
                      · {p.prize_description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
