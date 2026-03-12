"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Redirects to /paywall if the current user is not a paid subscriber.
 * Use in layout or page for paid-only routes.
 * Returns { isPaid, isLoading } so the UI can show loading or content.
 */
export function useRequirePaid(): { isPaid: boolean; isLoading: boolean } {
  const router = useRouter();
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) {
          setIsLoading(false);
          router.replace('/signin');
        }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const paid = profile?.account_type === 'paid' || profile?.subscription_status === 'active';
      setIsPaid(paid);
      setIsLoading(false);

      if (!paid) {
        router.replace('/paywall');
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  return { isPaid, isLoading };
}
