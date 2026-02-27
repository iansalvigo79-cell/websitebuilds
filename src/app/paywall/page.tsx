"use client";

import { Box, Container, Typography, Stack, Button, Card, CardContent, CircularProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import CheckIcon from '@mui/icons-material/Check';
import { toast } from 'react-toastify';

export default function PaywallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  const fetchAuthAndProfile = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsCheckingProfile(true);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) return;
      if (!authUser) {
        router.push('/signin');
        return;
      }
      setUser(authUser);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, account_type, subscription_status, stripe_customer_id, stripe_subscription_id')
        .eq('id', authUser.id)
        .single();
      if (profileData) setProfile(profileData as Profile);
    } catch {
      // ignore
    } finally {
      if (showLoading) setIsCheckingProfile(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAuthAndProfile(true);
  }, [fetchAuthAndProfile]);

  // Refetch profile when page becomes visible so Subscribe button disables after payment
  useEffect(() => {
    if (!user) return;
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchAuthAndProfile(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [user, fetchAuthAndProfile]);

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      toast.info('Checkout was cancelled. You can subscribe anytime.');
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams]);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      if (!user) {
        toast.error('User not found');
        setIsLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in again');
        setIsLoading(false);
        return;
      }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Checkout failed');
        setIsLoading(false);
        return;
      }
      if (data.url) {
        // Always send user to Stripe payment page (Goalactico · £5.00/month); after payment they are redirected to dashboard
        window.location.href = data.url;
      } else {
        toast.error('Checkout URL not returned');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in again');
        setIsPortalLoading(false);
        return;
      }
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Could not open billing portal');
        setIsPortalLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Portal URL not returned');
        setIsPortalLoading(false);
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error('An unexpected error occurred');
      setIsPortalLoading(false);
    }
  };

  if (isCheckingProfile) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
        }}
      >
        <CircularProgress sx={{ color: '#16a34a' }} />
      </Box>
    );
  }

  console.log('profile', profile);

  const isPaid = profile?.account_type === 'paid' || Boolean(profile?.stripe_subscription_id);

  console.log('isPaid', isPaid);

  return (
    <Box sx={{ backgroundColor: '#0a0a0a' }}>
      <Box className="anim-fade-up" sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff', mb: 2 }}>
            Upgrade for £5/month
            <Box component="span" sx={{ color: '#16a34a', display: 'block' }}>
              Unlock all four prediction games
            </Box>
          </Typography>
          <Typography sx={{ color: '#999', fontSize: '1rem' }}>
            FT Goals · HT Goals · FT Corners · HT Corners
          </Typography>
        </Box>

        <Card
          sx={{
            backgroundColor: '#0a0a0a',
            border: '2px solid #16a34a',
            mb: 4,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
                Paid Player — £5 / month
              </Typography>
              <Typography sx={{ color: '#999' }}>
                Fuller, more competitive experience. Cancel anytime.
              </Typography>
            </Box>

            <Stack spacing={2} sx={{ mb: 4 }}>
              <Typography sx={{ color: '#16a34a', fontWeight: 700, fontSize: '0.9rem' }}>
                Access to all four prediction games
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 1 }}>
                <CheckIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography sx={{ color: '#fff' }}>FT Goals</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 1 }}>
                <CheckIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography sx={{ color: '#fff' }}>HT Goals</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 1 }}>
                <CheckIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography sx={{ color: '#fff' }}>FT Corners</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 1 }}>
                <CheckIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography sx={{ color: '#fff' }}>HT Corners</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ color: '#16a34a' }} />
                <Typography sx={{ color: '#fff' }}>More ways to score points and improve ranking</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ color: '#16a34a' }} />
                <Typography sx={{ color: '#fff' }}>Eligibility for weekly, monthly and seasonal prize competitions</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ color: '#16a34a' }} />
                <Typography sx={{ color: '#fff' }}>Greater depth, more strategy and more chances to stand out</Typography>
              </Box>
            </Stack>

            <Typography sx={{ color: '#bbb', fontSize: '0.9rem', mb: 3, fontStyle: 'italic' }}>
              Free players can enjoy the core experience. Paid players get a fuller, more competitive version of the game.
            </Typography>

            {isPaid ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#16a34a',
                    fontWeight: 700,
                    fontSize: '1rem',
                    mb: 2,
                  }}
                >
                  ✅ Full Access Active
                </Typography>
                <Typography sx={{ display: 'block', mt: 1 }}>
                  <Box
                    component="button"
                    onClick={handleManageBilling}
                    disabled={isPortalLoading}
                    sx={{
                      background: 'none',
                      border: 'none',
                      color: '#16a34a',
                      cursor: isPortalLoading ? 'wait' : 'pointer',
                      fontSize: '0.9rem',
                      textDecoration: 'underline',
                      '&:hover': { color: '#137f2d' },
                    }}
                  >
                    {isPortalLoading ? 'Opening...' : 'Manage Subscription'}
                  </Box>
                </Typography>
              </Box>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isLoading}
                  onClick={handleCheckout}
                  startIcon={isLoading ? <CircularProgress size={20} sx={{ color: '#0f0505' }} /> : null}
                  sx={{
                    backgroundColor: '#16a34a',
                    color: '#0f0505',
                    fontWeight: 900,
                    fontSize: '1rem',
                    padding: '14px 24px',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    transition: 'background-color 0.3s ease',
                    '&:hover': {
                      backgroundColor: '#137f2d',
                      transform: 'none',
                    },
                  }}
                >
                  {isLoading ? 'Processing...' : 'Subscribe Now'}
                </Button>
                <Typography sx={{ color: '#999', fontSize: '0.85rem', textAlign: 'center', mt: 3 }}>
                  Secure payment powered by Stripe
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: 'rgba(22, 163, 74, 0.06)', border: '1px solid rgba(22, 163, 74, 0.3)', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: '#16a34a', fontWeight: 700, mb: 2 }}>
              Prizes
            </Typography>
            <Typography sx={{ color: '#ccc', fontSize: '0.95rem', mb: 2 }}>
              Goalactico is about competition and recognition, not betting. Top performers across weekly, monthly, and seasonal rankings can win prizes such as:
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                <Typography sx={{ color: '#fff' }}>Amazon, gift & travel vouchers</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                <Typography sx={{ color: '#fff' }}>Football merchandise</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                <Typography sx={{ color: '#fff' }}>Game-related rewards and special items</Typography>
              </Box>
            </Stack>
            <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
              Prize structures will evolve over time, but the focus will always be on rewarding consistency, performance and engagement.
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#999', fontSize: '0.9rem' }}>
            Not ready to subscribe?{' '}
            <Box
              component="button"
              onClick={() => router.push('/dashboard')}
              sx={{
                background: 'none',
                border: 'none',
                color: '#16a34a',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9rem',
              }}
            >
              Back to home
            </Box>
          </Typography>
        </Box>
      </Container>
      </Box>
    </Box>
  );
}
