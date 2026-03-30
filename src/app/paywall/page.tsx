"use client";

import { Box, Container, Typography, Stack, Button, Card, CardContent, useMediaQuery } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import CheckIcon from '@mui/icons-material/Check';
import { toast } from 'react-toastify';
import ModernLoader from '@/components/ui/ModernLoader';

const GBP_PRICE = 5;
const GBP_CURRENCY = 'GBP';
const GEO_CACHE_KEY = 'geo_currency_cache_v1';
const RATE_CACHE_KEY = 'gbp_rates_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

// ---- Separate component for useSearchParams ----
// Must be isolated so it can be wrapped in its own <Suspense>
function CancelledToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('canceled') === '1') {
      toast.info('Checkout was cancelled. You can subscribe anytime.');
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams]);

  return null;
}

// ---- Main paywall content ----
function PaywallContent() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [detectedCurrency, setDetectedCurrency] = useState(GBP_CURRENCY);
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width:600px)');

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
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchAuthAndProfile(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [user, fetchAuthAndProfile]);

  const readCache = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { timestamp?: number };
      if (!parsed?.timestamp || Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeCache = (key: string, value: Record<string, unknown>) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...value, timestamp: Date.now() }));
    } catch {
      // ignore cache failures
    }
  };

  const formatCurrency = (value: number, currency: string, digits?: number) => {
    const options: Intl.NumberFormatOptions = { style: 'currency', currency };
    if (typeof digits === 'number') {
      options.minimumFractionDigits = digits;
      options.maximumFractionDigits = digits;
    }
    return new Intl.NumberFormat(undefined, options).format(value);
  };

  const formatRoundedCurrency = (value: number, currency: string) => {
    const resolved = new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions();
    const digits = resolved.maximumFractionDigits ?? 2;
    const rounded = Number(value.toFixed(digits));
    return formatCurrency(rounded, currency, digits);
  };

  useEffect(() => {
    let isMounted = true;

    const resolvePricingCurrency = async () => {
      let currency = GBP_CURRENCY;
      let countryName: string | null = null;

      try {
        const cachedGeo = readCache(GEO_CACHE_KEY) as { currency?: string } | null;
        if (cachedGeo?.currency) {
          currency = cachedGeo.currency;
          countryName = (cachedGeo as { country?: string }).country ?? null;
        } else {
          const geoRes = await fetch('https://ipapi.co/json/');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData?.currency) {
              currency = geoData.currency;
              countryName = geoData.country_name ?? null;
              writeCache(GEO_CACHE_KEY, { currency: geoData.currency, country: geoData.country_name });
            }
          }
        }
      } catch {
        currency = GBP_CURRENCY;
      }

      if (!isMounted) return;
      setDetectedCurrency(currency || GBP_CURRENCY);
      setDetectedCountry(countryName);

      if (!currency || currency === GBP_CURRENCY) {
        setConvertedPrice(null);
        return;
      }

      try {
        let rates: Record<string, number> | null = null;
        const cachedRates = readCache(RATE_CACHE_KEY) as { rates?: Record<string, number> } | null;
        if (cachedRates?.rates) {
          rates = cachedRates.rates;
        } else {
          const rateRes = await fetch('https://open.er-api.com/v6/latest/GBP');
          if (rateRes.ok) {
            const rateData = await rateRes.json();
            if (rateData?.rates) {
              rates = rateData.rates as Record<string, number>;
              writeCache(RATE_CACHE_KEY, { rates: rateData.rates });
            }
          }
        }

        const rate = rates?.[currency];
        if (!isMounted) return;
        if (rate) {
          setConvertedPrice(GBP_PRICE * rate);
        } else {
          setConvertedPrice(null);
        }
      } catch {
        if (isMounted) setConvertedPrice(null);
      }
    };

    resolvePricingCurrency();
    return () => {
      isMounted = false;
    };
  }, []);

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Checkout failed');
        setIsLoading(false);
        return;
      }
      if (data.url) {
        // inform webhook endpoint of pending subscription event (await so request completes)
        try {
          await fetch('/api/stripe/webhook');
        } catch { }
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
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
      <ModernLoader
        label="Loading Subscription"
        sublabel="Checking your account status..."
        minHeight="100vh"
        sx={{ backgroundColor: '#0a0a0a' }}
      />
    );
  }

  const isPaid = profile?.account_type === 'paid' || Boolean(profile?.stripe_subscription_id);
  const showConverted = detectedCurrency !== GBP_CURRENCY && convertedPrice !== null;
  const primaryPriceLabel = showConverted
    ? `~${formatRoundedCurrency(convertedPrice as number, detectedCurrency)}`
    : formatCurrency(GBP_PRICE, GBP_CURRENCY, 0);
  const billedPriceLabel = formatCurrency(GBP_PRICE, GBP_CURRENCY, 2);
  const showConversionBlock = showConverted;
  const currencyMeta = detectedCurrency !== GBP_CURRENCY
    ? `Detected currency: ${detectedCurrency}${detectedCountry ? ` (${detectedCountry})` : ''}`
    : null;

  return (
    <Box sx={{ backgroundColor: '#0a0a0a' }}>
      <Box className="anim-fade-up" sx={{ py: 6 }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>PRO</Typography>
            <Typography sx={{ fontWeight: 900, color: '#fff', fontSize: '2.5rem', mb: 1 }}>
              UNLOCK FULL ACCESS
            </Typography>
            <Typography sx={{ color: '#9ca3af', fontSize: '1rem' }}>
              Join thousands of predictors competing for prizes every matchday
            </Typography>
          </Box>

          <Card
            sx={{
              backgroundColor: '#1a1d27',
              border: '2px solid #16a34a',
              boxShadow: '0 0 40px rgba(22,163,74,0.2)',
              borderRadius: '16px',
              mb: 4,
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: { xs: '2.6rem', md: '4rem' }, fontWeight: 900, color: '#fff' }}>
                  {primaryPriceLabel}
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.9rem', md: '1.2rem' }, color: '#9ca3af' }}>/month</Typography>
              </Box>
              {showConversionBlock && (
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.95rem', fontWeight: 600 }}>
                    {`Billed as ${billedPriceLabel} GBP`}
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.8rem', mt: 0.5 }}>
                    {`Price shown is an estimate; you will be charged ${billedPriceLabel} GBP and your bank may apply exchange rate fees.`}
                  </Typography>
                  {currencyMeta && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', mt: 0.6 }}>
                      {currencyMeta}
                    </Typography>
                  )}
                </Box>
              )}

              <Stack spacing={1.5} sx={{ mb: 4 }}>
                {[
                  'FT Goals Predictions (Free)',
                  'Half Time Goals Predictions',
                  'Total Corners Predictions',
                  'Cards Predictions',
                  'Compete for monthly prizes',
                  'Full leaderboard access',
                ].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>{item}</Typography>
                  </Box>
                ))}
              </Stack>

              {isPaid ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    component="span"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: '#16a34a', fontWeight: 800, fontSize: '1rem', mb: 2 }}
                  >
                    Full Access Active
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
                    startIcon={isLoading ? <ModernLoader inline size={20} label="" sublabel="" /> : null}
                    sx={{
                      backgroundColor: '#16a34a',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '1.2rem',
                      padding: '18px',
                      borderRadius: '10px',
                      textTransform: 'none',
                      animation: 'pulse-green 2s infinite',
                      '@keyframes pulse-green': {
                        '0%, 100%': { boxShadow: '0 0 0 0 rgba(22,163,74,0.4)' },
                        '50%': { boxShadow: '0 0 0 12px rgba(22,163,74,0)' },
                      },
                      '&:hover': { backgroundColor: '#137f2d', transform: 'none' },
                    }}
                  >
                    {isLoading ? 'Processing...' : 'START PREDICTING NOW ->'}
                  </Button>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.8rem', textAlign: 'center', mt: 2 }}>
                    Cancel anytime - Secure payment by Stripe
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          {/* Prizes card */}
          <Card sx={{ backgroundColor: 'rgba(22, 163, 74, 0.06)', border: '1px solid rgba(22, 163, 74, 0.3)', mb: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: '#16a34a', fontWeight: 700, mb: 2 }}>Prizes</Typography>
              <Typography sx={{ color: '#ccc', fontSize: '0.95rem', mb: 2 }}>
                Goalactico is about competition and recognition, not betting. Top performers across weekly, monthly, and seasonal rankings can win prizes such as:
              </Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                {[
                  'Amazon, gift & travel vouchers',
                  'Football merchandise',
                  'Game-related rewards and special items',
                ].map(prize => (
                  <Box key={prize} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                    <Typography sx={{ color: '#fff' }}>{prize}</Typography>
                  </Box>
                ))}
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
                sx={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
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

// ---- Page export ----
export default function PaywallPage() {
  return (
    <>
      {/* useSearchParams isolated in its own Suspense - fixes Vercel build error */}
      <Suspense fallback={null}>
        <CancelledToast />
      </Suspense>

      {/* Main page content in its own Suspense */}
      <Suspense
        fallback={
          <ModernLoader
            label="Loading Paywall"
            sublabel="Preparing subscription options..."
            minHeight="100vh"
            sx={{ backgroundColor: '#0a0a0a' }}
          />
        }
      >
        <PaywallContent />
      </Suspense>
    </>
  );
}




