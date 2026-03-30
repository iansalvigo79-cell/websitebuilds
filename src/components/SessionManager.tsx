'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const REFRESH_INTERVAL_MS = 1000 * 60 * 50;

export default function SessionManager() {
  useEffect(() => {
    let isActive = true;

    const refreshSession = async () => {
      if (!isActive) return;
      try {
        await supabase.auth.getSession();
      } catch {
        // ignore refresh failures; auth state will update if session is invalid
      }
    };

    refreshSession();
    const interval = window.setInterval(refreshSession, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isActive = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}
