"use client";

import { Box, Container, Typography, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, TextField, Stack } from '@mui/material';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [seasonForm, setSeasonForm] = useState({ name: '', startDate: '', endDate: '' });

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/signin');
          return;
        }

        // In production, check if user has admin role
        // For now, we'll allow access based on email domain or manual admin setup
        setIsLoading(false);
      } catch (err) {
        console.error('Supabase Auth Error (admin checkAuth):', err);
        toast.error('Authentication failed');
        setIsLoading(false);
      }
    };

    checkAdminAuth();
  }, [router]);

  const handleCreateSeason = async () => {
    if (!seasonForm.name || !seasonForm.startDate || !seasonForm.endDate) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase.from('seasons').insert({
        name: seasonForm.name,
        start_date: seasonForm.startDate,
        end_date: seasonForm.endDate,
        is_active: true,
      });

      if (error) {
        console.error('Supabase Season Error (admin):', error);
        toast.error('Error creating season: ' + error.message);
        return;
      }

      toast.success('Season created successfully!');
      setSeasonForm({ name: '', startDate: '', endDate: '' });
      setOpenDialog(false);
    } catch (err) {
      console.error('Unexpected Error (admin createSeason):', err);
      toast.error('An error occurred');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
        <Typography sx={{ color: '#fff' }}>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box className="anim-fade-up" sx={{ minHeight: '100vh', backgroundColor: '#0a0a0a', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff' }}>
            Admin Panel
          </Typography>
          <Button onClick={handleLogout} sx={{ color: '#16a34a', borderColor: '#16a34a' }} variant="outlined">
            Logout
          </Button>
        </Box>


        <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': { color: '#999' },
              '& .Mui-selected': { color: '#16a34a' },
              '& .MuiTabs-indicator': { backgroundColor: '#16a34a' },
            }}
          >
            <Tab label="Seasons" />
            <Tab label="Match Days" />
            <Tab label="Games" />
            <Tab label="Scores" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                Manage Seasons
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#0f0505',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: '#137f2d' },
                }}
              >
                New Season
              </Button>
            </Box>
            <Typography sx={{ color: '#999' }}>Create and manage football seasons.</Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Match Days
            </Typography>
            <Typography sx={{ color: '#999' }}>Create match days and set cutoff times for predictions.</Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Games
            </Typography>
            <Typography sx={{ color: '#999' }}>Add games to match days and specify teams.</Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Enter Final Scores
            </Typography>
            <Typography sx={{ color: '#999' }}>
              Enter final match scores. This will trigger automatic scoring and leaderboard updates.
            </Typography>
          </Box>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#1a1a1a', color: '#fff' }}>Create New Season</DialogTitle>
          <DialogContent sx={{ backgroundColor: '#0a0a0a', pt: 2 }}>
            <Stack spacing={2}>
              <TextField
                label="Season Name"
                value={seasonForm.name}
                onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                fullWidth
                sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
              />
              <TextField
                label="Start Date"
                type="date"
                value={seasonForm.startDate}
                onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ input: { color: '#fff' } }}
              />
              <TextField
                label="End Date"
                type="date"
                value={seasonForm.endDate}
                onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ input: { color: '#fff' } }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button onClick={() => setOpenDialog(false)} sx={{ color: '#999' }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSeason}
                  variant="contained"
                  sx={{ backgroundColor: '#16a34a', color: '#0f0505' }}
                >
                  Create
                </Button>
              </Box>
            </Stack>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}
