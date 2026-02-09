"use client";

import { Box, Container, Typography, Stack, Button, Card, CardContent, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import CheckIcon from '@mui/icons-material/Check';
import { toast } from 'react-toastify';

export default function PaywallPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('Supabase Auth Error (paywall):', authError);
        }
      
      if (!authUser) {
        router.push('/signin');
        return;
      }

      setUser(authUser);

        // Fetch user profile to check subscription status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Supabase Profile Error (paywall):', profileError);
        }

        if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Unexpected Error (paywall checkAuth):', err);
      } finally {
        setIsCheckingProfile(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      if (!user) {
        toast.error('User not found');
        setIsLoading(false);
        return;
      }

      // For testing: Update profile with test Stripe IDs and set subscription to active
      const testCustomerId = `cus_test_${Date.now()}`;
      const testSubscriptionId = `sub_test_${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: testCustomerId,
          stripe_subscription_id: testSubscriptionId,
          subscription_status: 'active',
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Supabase Profile Update Error (paywall):', profileError);
        toast.error('Error updating subscription: ' + profileError.message);
        setIsLoading(false);
        return;
      }

      toast.success('Subscription activated successfully!');

      // Navigate to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Error processing subscription (paywall):', err);
      toast.error('An unexpected error occurred');
      setIsLoading(false);
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

  return (
    <Box sx={{ backgroundColor: '#0a0a0a' }}>
      <Box className="anim-fade-up" sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff', mb: 2 }}>
            Unlock
            <Box component="span" sx={{ color: '#16a34a', display: 'block' }}>
              THE GAME
            </Box>
          </Typography>
          <Typography sx={{ color: '#999', fontSize: '1rem' }}>
            Subscribe to start predicting and competing
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
                £5 / Month
              </Typography>
              <Typography sx={{ color: '#999' }}>
                Get unlimited predictions and compete for glory
              </Typography>
            </Box>

            <Stack spacing={2} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ color: '#16a34a' }} />
                <Typography sx={{ color: '#fff' }}>Unlimited predictions per match day</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ color: '#16a34a' }} />
                <Typography sx={{ color: '#fff' }}>Access to season leaderboard</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ color: '#16a34a' }} />
                <Typography sx={{ color: '#fff' }}>Real-time scoring updates</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckIcon sx={{ color: '#16a34a' }} />
                <Typography sx={{ color: '#fff' }}>Cancel anytime, no lock-in</Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              size="large"
              fullWidth
                disabled={isLoading || (profile?.stripe_subscription_id !== null)}
              onClick={handleCheckout}
                startIcon={isLoading ? <CircularProgress size={20} sx={{ color: '#0f0505' }} /> : null}
              sx={{
                  backgroundColor: profile?.stripe_subscription_id !== null ? '#666' : '#16a34a',
                  color: profile?.stripe_subscription_id !== null ? '#999' : '#0f0505',
                fontWeight: 900,
                fontSize: '1rem',
                padding: '14px 24px',
                textTransform: 'uppercase',
                letterSpacing: 1,
                transition: 'background-color 0.3s ease',
                '&:hover': {
                    backgroundColor: profile?.stripe_subscription_id !== null ? '#666' : '#137f2d',
                  transform: 'none',
                },
                '&:disabled': {
                  backgroundColor: '#666',
                    color: profile?.stripe_subscription_id !== null ? '#999' : '#0a0a0a',
                },
              }}
            >
                {isLoading ? 'Processing...' : profile?.stripe_subscription_id !== null ? 'Subscribed' : 'Subscribe Now'}
            </Button>

            <Typography sx={{ color: '#999', fontSize: '0.85rem', textAlign: 'center', mt: 3 }}>
              Secure payment powered by Stripe
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
