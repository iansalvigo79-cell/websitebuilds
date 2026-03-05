"use client";

import { Alert, Box, Container, Tab, Tabs, Typography } from '@mui/material';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardTab from './DashboardTab';
import MyPredictionsTab from './MyPredictionsTab';
import LeaderboardTab from './LeaderboardTab';
import BlogsTab from './BlogsTab';
import PrizesTab from './PrizesTab';
import ModernLoader from '@/components/ui/ModernLoader';

function SubscriptionSuccessBanner({ onShow }: { onShow: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      onShow();
      const url = new URL(window.location.href);
      url.searchParams.delete('subscription');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams, onShow]);

  return null;
}

function DashboardPageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [authChecking, setAuthChecking] = useState(true);
  const [showSubscriptionSuccess, setShowSubscriptionSuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/signin');
          return;
        }
      } catch {
        router.push('/signin');
        return;
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, [router]);

  if (authChecking) {
    return (
      <ModernLoader
        label="Checking Access"
        sublabel="Validating your session..."
        minHeight="80vh"
        sx={{ backgroundColor: '#0a0a0f' }}
      />
    );
  }

  const tabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'my-predictions':
        return <MyPredictionsTab />;
      case 'leaderboard':
        return <LeaderboardTab />;
      case 'prizes':
        return <PrizesTab />;
      case 'blogs':
        return <BlogsTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <Box sx={{ backgroundColor: '#0a0a0f' }}>
      <Suspense fallback={null}>
        <SubscriptionSuccessBanner onShow={() => setShowSubscriptionSuccess(true)} />
      </Suspense>

      <Box sx={{ backgroundColor: '#0a0a0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Container maxWidth="xl">
          <Tabs
            value={activeTab}
            onChange={(_event, newValue: string) => setActiveTab(newValue)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: '#16a34a', height: 2 },
              '& .MuiTab-root': {
                color: '#9ca3af',
                textTransform: 'none',
                fontSize: '0.92rem',
                fontWeight: 700,
                minHeight: 48,
                padding: '12px 20px',
                '&:hover': { color: '#fff' },
                '&.Mui-selected': { color: '#16a34a' },
              },
            }}
          >
            <Tab value="dashboard" label="Dashboard" />
            <Tab value="my-predictions" label="My Predictions" />
            <Tab value="leaderboard" label="Leaderboard" />
            <Tab value="prizes" label="Prizes" />
            <Tab value="blogs" label="Blogs" />
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {showSubscriptionSuccess && (
          <Alert
            severity="success"
            onClose={() => setShowSubscriptionSuccess(false)}
            sx={{
              mb: 3,
              backgroundColor: 'rgba(22,163,74,0.12)',
              border: '1px solid rgba(22,163,74,0.5)',
              color: '#fff',
              '& .MuiAlert-message': { color: '#fff' },
            }}
          >
            <Typography component="span" sx={{ fontWeight: 700 }}>
              Payment successful. You now have full access to all 4 games - FT Goals, HT Goals, FT Corners, HT Corners.
            </Typography>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
          >
            {tabContent()}
          </motion.div>
        </AnimatePresence>
      </Container>
    </Box>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <ModernLoader
          label="Loading Dashboard"
          sublabel="Preparing your workspace..."
          minHeight="80vh"
          sx={{ backgroundColor: '#0a0a0f' }}
        />
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
