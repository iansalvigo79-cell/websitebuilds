"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Handles Supabase auth redirect (magic link, password recovery).
 * URL hash contains access_token, refresh_token, type=recovery etc.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const type = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          setStatus('error');
          return;
        }
        if (type === 'recovery') {
          router.replace('/reset-password');
          return;
        }
        router.replace('/dashboard');
        return;
      }

      setStatus('error');
    };

    run();
  }, [router]);

  if (status === 'error') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, backgroundColor: '#0a0a0a' }}>
        <Typography sx={{ color: '#fff' }}>Invalid or expired link.</Typography>
        <Typography component="a" href="/signin" sx={{ color: '#16a34a' }}>Back to Sign in</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
      <CircularProgress sx={{ color: '#16a34a' }} />
    </Box>
  );
}
