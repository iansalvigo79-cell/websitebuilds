"use client";

import { Box, Container, Tabs, Tab, CircularProgress, Alert, Typography } from '@mui/material';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardTab from './DashboardTab';
import MyPredictionsTab from './MyPredictionsTab';
import LeaderboardTab from './LeaderboardTab';
import LeaguesTab from './LeaguesTab';
import BlogsTab from './BlogsTab';

// ── Separate component for useSearchParams ────────────────────────────────────
// useSearchParams() MUST be in its own component wrapped in <Suspense>
function SubscriptionSuccessBanner({ onShow }: { onShow: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('subscription');
    if (success === 'success') {
      onShow();
      // Remove query param from URL without full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('subscription');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams, onShow]);

  return null; // This component only handles the side effect
}

// ── Main dashboard content ────────────────────────────────────────────────────
function DashboardPageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showSubscriptionSuccess, setShowSubscriptionSuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/signin');
          return;
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/signin');
        return;
      }
      setIsAuthChecking(false);
    };

    checkAuth();
  }, [router]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':      return <DashboardTab />;
      case 'my-predictions': return <MyPredictionsTab />;
      case 'leaderboard':    return <LeaderboardTab />;
      case 'leagues':        return <LeaguesTab />;
      case 'blogs':          return <BlogsTab />;
      default:               return <DashboardTab />;
    }
  };

  if (isAuthChecking) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', backgroundColor: '#24262F' }}>
        <CircularProgress sx={{ color: '#0f5d1f' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#24262F' }}>

      {/* ── useSearchParams wrapped in its own Suspense ── */}
      <Suspense fallback={null}>
        <SubscriptionSuccessBanner onShow={() => setShowSubscriptionSuccess(true)} />
      </Suspense>

      {/* Sub Navigation Bar */}
      <Box sx={{ backgroundColor: '#24262F', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Container maxWidth="xl">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#16a34a',
                height: 2,
              },
              '& .MuiTab-root': {
                color: '#999',
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                minHeight: 48,
                padding: '12px 24px',
                flexDirection: 'row',
                gap: '8px',
                '&:hover': { color: '#fff' },
                '&.Mui-selected': { color: '#16a34a' },
              },
            }}
          >
            <Tab value="dashboard"       label="Dashboard" />
            <Tab value="my-predictions"  label="My Predictions" />
            <Tab value="leaderboard"     label="Leaderboard" />
            <Tab value="leagues"         label="Leagues" />
            <Tab value="blogs"           label="Blogs" />
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* ── Subscription success alert ── */}
        {showSubscriptionSuccess && (
          <Alert
            severity="success"
            onClose={() => setShowSubscriptionSuccess(false)}
            sx={{
              mb: 3,
              backgroundColor: 'rgba(22, 163, 74, 0.15)',
              border: '1px solid rgba(22, 163, 74, 0.5)',
              color: '#fff',
              '& .MuiAlert-message': { color: '#fff' },
            }}
          >
            <Typography component="span" sx={{ fontWeight: 600 }}>
              Payment successful. You now have full access to all 4 games — FT Goals, HT Goals, FT Corners, HT Corners.
            </Typography>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>

      </Container>
    </Box>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', backgroundColor: '#24262F' }}>
          <CircularProgress sx={{ color: '#0f5d1f' }} />
        </Box>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
