"use client";

import { Box, Container, Typography, Stack, Button, Card, CardContent } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CheckIcon from '@mui/icons-material/Check';
import { toast } from 'react-toastify';

export default function PaywallPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      } catch (err) {
        console.error('Unexpected Error (paywall checkAuth):', err);
      }
    };

    checkAuth();
  }, [router]);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      // Get session for authorization
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Supabase Session Error (paywall):', sessionError);
      }

      // Call Edge Function to create Stripe Checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error creating checkout session (paywall):', err);
      toast.error('Error creating checkout session');
      setIsLoading(false);
    }
  };

  return (
    <Box className="anim-fade-up" sx={{ minHeight: '100vh', backgroundColor: '#0a0a0a', py: 6 }}>
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
            backgroundColor: 'rgba(30, 10, 10, 0.6)',
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
              disabled={isLoading}
              onClick={handleCheckout}
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
                '&:disabled': {
                  backgroundColor: '#666',
                  color: '#0a0a0a',
                },
              }}
            >
              {isLoading ? 'Processing...' : 'Subscribe Now'}
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
              onClick={() => router.push('/')}
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
  );
}
