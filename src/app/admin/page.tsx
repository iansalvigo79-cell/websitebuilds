"use client";

import { Box, Container, Typography, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, TextField, Stack, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, MenuItem, Tooltip } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AddIcon from '@mui/icons-material/Add';
import CalculateIcon from '@mui/icons-material/Calculate';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import { toast } from 'react-toastify';
import { Prize } from '@/types/database';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
  const [isCalculatingPoints, setIsCalculatingPoints] = useState(false);
  const [matchDaysForScores, setMatchDaysForScores] = useState<{ id: string; match_date: string; actual_total_goals: number | null; season_name?: string }[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [actualGoalsInputs, setActualGoalsInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [computingId, setComputingId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<{ id: string; name: string; start_date: string; end_date: string; is_active: boolean }[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [matchDaysList, setMatchDaysList] = useState<{ id: string; match_date: string; cutoff_at: string; season_id?: string; season_name?: string }[]>([]);
  const [matchDaysLoading, setMatchDaysLoading] = useState(false);
  const [gamesList, setGamesList] = useState<{ id: string; match_day_id: string; match_day_date?: string; home_team_name: string; away_team_name: string; kickoff_at: string; home_goals: number | null; away_goals: number | null }[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  // creation helpers for games tab
  const [availableMatchDays, setAvailableMatchDays] = useState<{ id: string; match_date: string; season_name: string }[]>([]);
  const [teamsList, setTeamsList] = useState<{ id: string; name: string }[]>([]);
  const [createGameForm, setCreateGameForm] = useState({ matchDayId: '', homeTeamId: '', awayTeamId: '', kickoffAt: '' });
  const [creatingGame, setCreatingGame] = useState(false);
  const [prizesList, setPrizesList] = useState<Prize[]>([]);
  const [prizesLoading, setPrizesLoading] = useState(false);
  const [prizeForm, setPrizeForm] = useState({
    type: 'weekly' as 'weekly' | 'monthly' | 'seasonal',
    period: '',
    winner_user_id: '',
    suggested_name: '',
    prize_description: '',
  });
  const [suggestingWinner, setSuggestingWinner] = useState(false);
  const [suggestNoPredictionsMessage, setSuggestNoPredictionsMessage] = useState<string | null>(null);
  const [creatingPrize, setCreatingPrize] = useState(false);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [winnerNames, setWinnerNames] = useState<Record<string, string>>({});
  const [matchDayDialogOpen, setMatchDayDialogOpen] = useState(false);
  const [matchDayForm, setMatchDayForm] = useState<{ seasonId: string; matchDate: string; cutoffAt: string }>({
    seasonId: '',
    matchDate: '',
    cutoffAt: '',
  });

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/signin');
          return;
        }

        // Check if user has admin role (role = 1)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (error || !profile || profile.role !== 1) {
          toast.error('Access denied. Admin privileges required.');
          router.push('/dashboard');
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Supabase Auth Error (admin checkAuth):', err);
        toast.error('Authentication failed');
        router.push('/dashboard');
        setIsLoading(false);
      }
    };

    checkAdminAuth();
  }, [router]);

  const fetchMatchDaysForScores = useCallback(async () => {
    setScoresLoading(true);
    try {
      const { data: mdList, error: mdErr } = await supabase
        .from('match_days')
        .select('id, match_date, actual_total_goals, season_id, seasons(name)')
        .order('match_date', { ascending: false })
        .limit(60);
      if (mdErr) {
        toast.error(mdErr.message);
        setMatchDaysForScores([]);
        return;
      }
      const rows = (mdList || []).map((md: any) => ({
        id: md.id,
        match_date: md.match_date,
        actual_total_goals: md.actual_total_goals,
        season_name: md.seasons?.name ?? '—',
      }));
      setMatchDaysForScores(rows);
      setActualGoalsInputs((prev) => {
        const next = { ...prev };
        rows.forEach((r: { id: string; actual_total_goals: number | null }) => {
          if (r.actual_total_goals != null && next[r.id] === undefined) next[r.id] = String(r.actual_total_goals);
        });
        return next;
      });
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabValue === 3) fetchMatchDaysForScores();
  }, [tabValue, fetchMatchDaysForScores]);

  const fetchSeasons = useCallback(async () => {
    setSeasonsLoading(true);
    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, start_date, end_date, is_active')
        .order('start_date', { ascending: false });
      if (error) {
        toast.error(error.message);
        setSeasons([]);
      } else {
        setSeasons((data as { id: string; name: string; start_date: string; end_date: string; is_active: boolean }[]) || []);
      }
    } finally {
      setSeasonsLoading(false);
    }
  }, []);

  const fetchMatchDaysList = useCallback(async () => {
    setMatchDaysLoading(true);
    try {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, match_date, cutoff_at, season_id, seasons(name)')
        .order('match_date', { ascending: false })
        .limit(100);
      if (error) {
        toast.error(error.message);
        setMatchDaysList([]);
      } else {
        setMatchDaysList((data || []).map((md: any) => ({
          id: md.id,
          match_date: md.match_date,
          cutoff_at: md.cutoff_at,
          season_id: md.season_id,
          season_name: md.seasons?.name ?? '—',
        })));
      }
    } finally {
      setMatchDaysLoading(false);
    }
  }, []);

  const fetchGamesList = useCallback(async () => {
    setGamesLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          match_day_id,
          kickoff_at,
          home_goals,
          away_goals,
          home_team_rel:teams!games_home_team_fkey(name),
          away_team_rel:teams!games_away_team_fkey(name),
          match_days(match_date)
        `)
        .order('kickoff_at', { ascending: false })
        .limit(200);
      if (error) {
        const fallback = await supabase
          .from('games')
          .select('id, match_day_id, kickoff_at, home_goals, away_goals, home_team, away_team')
          .order('kickoff_at', { ascending: false })
          .limit(200);
        if (fallback.error) {
          toast.error(fallback.error.message);
          setGamesList([]);
        } else {
          setGamesList((fallback.data || []).map((g: any) => ({
            id: g.id,
            match_day_id: g.match_day_id,
            home_team_name: g.home_team || 'TBD',
            away_team_name: g.away_team || 'TBD',
            kickoff_at: g.kickoff_at || '',
            home_goals: g.home_goals,
            away_goals: g.away_goals,
          })));
        }
      } else {
        setGamesList((data || []).map((g: any) => ({
          id: g.id,
          match_day_id: g.match_day_id,
          home_team_name: g.home_team_rel?.name ?? g.home_team ?? 'TBD',
          away_team_name: g.away_team_rel?.name ?? g.away_team ?? 'TBD',
          kickoff_at: g.kickoff_at || '',
          home_goals: g.home_goals,
          away_goals: g.away_goals,
        })));
      }
    } finally {
      setGamesLoading(false);
    }
  }, []);

  const fetchMatchDaysForGames = useCallback(async () => {
    const { data, error } = await supabase
      .from('match_days')
      .select('id, match_date, season_id, seasons(name)')
      .eq('is_open', true)
      .order('match_date', { ascending: true });
    if (error) {
      toast.error(error.message);
      setAvailableMatchDays([]);
    } else {
      setAvailableMatchDays((data || []).map((md: any) => ({
        id: md.id,
        match_date: md.match_date,
        season_name: md.seasons?.name ?? '—',
      })));
    }
  }, []);

  const fetchTeamsList = useCallback(async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) {
      toast.error(error.message);
      setTeamsList([]);
    } else {
      setTeamsList(data || []);
    }
  }, []);

  const getSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  const fetchPrizesList = useCallback(async () => {
    setPrizesLoading(true);
    try {
      const token = await getSession();
      if (!token) {
        setPrizesList([]);
        return;
      }
      const res = await fetch('/api/admin/prizes', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.prizes)) {
        setPrizesList(data.prizes);
        const userIds = [...new Set(data.prizes.map((p: Prize) => p.winner_user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
          const names: Record<string, string> = {};
          (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
            names[p.id] = p.display_name || p.id.slice(0, 8) + '…';
          });
          setWinnerNames(names);
        }
      } else {
        setPrizesList([]);
      }
    } finally {
      setPrizesLoading(false);
    }
  }, [getSession]);

  useEffect(() => {
    if (tabValue === 0 || tabValue === 1) fetchSeasons();
  }, [tabValue, fetchSeasons]);
  useEffect(() => {
    if (tabValue === 1) fetchMatchDaysList();
  }, [tabValue, fetchMatchDaysList]);
  useEffect(() => {
    if (tabValue === 2) {
      fetchGamesList();
      fetchMatchDaysForGames();
      fetchTeamsList();
    }
  }, [tabValue, fetchGamesList, fetchMatchDaysForGames, fetchTeamsList]);
  useEffect(() => {
    if (tabValue === 4) fetchPrizesList();
  }, [tabValue, fetchPrizesList]);

  const handleSaveActualGoals = async (matchDayId: string) => {
    const raw = actualGoalsInputs[matchDayId];
    const val = raw === '' ? null : parseInt(raw, 10);
    if (val === null || Number.isNaN(val) || val < 0) {
      toast.error('Enter a valid non-negative number');
      return;
    }
    setSavingId(matchDayId);
    try {
      const token = await getSession();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      const res = await fetch('/api/admin/set-actual-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchDayId, actualTotalGoals: val }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Actual goals saved');
        fetchMatchDaysForScores();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleComputeFromGames = async (matchDayId: string) => {
    setComputingId(matchDayId);
    try {
      const token = await getSession();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      const res = await fetch('/api/admin/compute-from-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchDayId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const total = data.total != null ? data.total : 0;
        toast.success(`Computed total: ${total}`);
        setActualGoalsInputs((prev) => ({ ...prev, [matchDayId]: String(total) }));
        fetchMatchDaysForScores();
      } else {
        toast.error(data.error || 'Failed to compute');
      }
    } finally {
      setComputingId(null);
    }
  };

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
      fetchSeasons();
    } catch (err) {
      console.error('Unexpected Error (admin createSeason):', err);
      toast.error('An error occurred');
    }
  };

  const handleCreateMatchDay = async () => {
    if (!matchDayForm.seasonId || !matchDayForm.matchDate || !matchDayForm.cutoffAt) {
      toast.error('Please select a season, match date and cutoff time');
      return;
    }
    try {
      const { error } = await supabase.from('match_days').insert({
        season_id: matchDayForm.seasonId,
        match_date: matchDayForm.matchDate,
        cutoff_at: matchDayForm.cutoffAt,
        is_open: true,
      });
      if (error) {
        toast.error('Error creating match day: ' + error.message);
        return;
      }
      toast.success('Match day created');
      setMatchDayForm({ seasonId: '', matchDate: '', cutoffAt: '' });
      setMatchDayDialogOpen(false);
      fetchMatchDaysList();
    } catch (err) {
      console.error('Unexpected Error (admin createMatchDay):', err);
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
        <CircularProgress sx={{ color: '#16a34a' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0f172a', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6, pb: 4, borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff', mb: 0.5 }}>
              Admin Panel
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Manage seasons, match days, games, scores, and prizes
            </Typography>
          </Box>
          <Button 
            onClick={handleLogout} 
            variant="outlined"
            sx={{ 
              color: '#f87171', 
              borderColor: '#f87171',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { backgroundColor: 'rgba(248, 113, 113, 0.1)', borderColor: '#f87171' }
            }}
          >
            Logout
          </Button>
        </Box>

        {/* Tabs Navigation */}
        <Box sx={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)', mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': { 
                color: '#64748b',
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                minHeight: 48,
                '&:hover': { color: '#16a34a' }
              },
              '& .Mui-selected': { color: '#16a34a' },
              '& .MuiTabs-indicator': { backgroundColor: '#16a34a', height: 3 },
            }}
          >
            <Tab label="Seasons" />
            <Tab label="Match Days" />
            <Tab label="Games" />
            <Tab label="Scores" />
            <Tab label="Prizes" icon={<EmojiEventsIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                  Manage Seasons
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Create and manage football seasons for the league.</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#15803d' },
                }}
              >
                New Season
              </Button>
            </Box>
            {seasonsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: '#16a34a' }} />
              </Box>
            ) : seasons.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                <Typography sx={{ color: '#64748b' }}>No seasons yet. Create one to get started.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {seasons.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      p: 2.5,
                      backgroundColor: 'rgba(100, 116, 139, 0.08)',
                      border: '1px solid rgba(100, 116, 139, 0.2)',
                      borderRadius: 2,
                      '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.12)' }
                    }}
                  >
                    <Typography sx={{ color: '#fff', fontWeight: 700, mb: 1.5 }}>{s.name}</Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Start:</Typography>
                        <Typography sx={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>{s.start_date}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>End:</Typography>
                        <Typography sx={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>{s.end_date}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid rgba(100, 116, 139, 0.2)' }}>
                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Active:</Typography>
                        <Chip
                          label={s.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            backgroundColor: s.is_active ? 'rgba(22, 163, 74, 0.25)' : 'rgba(100, 116, 139, 0.25)',
                            color: s.is_active ? '#16a34a' : '#64748b',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                  Match Days
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Create and manage match day schedules with cutoff times.</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setMatchDayDialogOpen(true)}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#15803d' },
                }}
              >
                New Match Day
              </Button>
            </Box>
            {matchDaysLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: '#16a34a' }} />
              </Box>
            ) : matchDaysList.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                <Typography sx={{ color: '#64748b' }}>No match days found. Create one to get started.</Typography>
              </Box>
            ) : (
              <TableContainer component={Box} sx={{ backgroundColor: 'rgba(100, 116, 139, 0.05)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                <Table sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0', padding: '16px' } }}>
                  <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Match Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Season</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Cutoff Time</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matchDaysList.map((md) => (
                      <TableRow key={md.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                        <TableCell>{md.match_date}</TableCell>
                        <TableCell>{md.season_name}</TableCell>
                        <TableCell>{md.cutoff_at ? new Date(md.cutoff_at).toLocaleString('en-GB') : '—'}</TableCell>
                        <TableCell align="right">
                          {md.cutoff_at ? (
                            <Chip
                              size="small"
                              label={new Date(md.cutoff_at).getTime() > Date.now() ? 'Open' : 'Closed'}
                              sx={{
                                backgroundColor: new Date(md.cutoff_at).getTime() > Date.now() ? 'rgba(22, 163, 74, 0.25)' : 'rgba(148, 163, 184, 0.25)',
                                color: new Date(md.cutoff_at).getTime() > Date.now() ? '#16a34a' : '#94a3b8',
                                fontWeight: 600
                              }}
                            />
                          ) : (
                            <Chip size="small" label="No cutoff" sx={{ backgroundColor: 'rgba(100, 116, 139, 0.25)', color: '#64748b' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                Games
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>View all games assigned to match days.</Typography>
            </Box>

            {/* create game form */}
            <Box sx={{ 
              mb: 6, 
              p: 4, 
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
              borderRadius: 3, 
              border: '1px solid rgba(139, 92, 246, 0.3)',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Accent line */}
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981)' }} />
              <Typography sx={{ color: '#e0e7ff', fontWeight: 800, mb: 2, fontSize: '1.2rem', letterSpacing: '0.5px' }}>✨ Create New Game</Typography>
              <Typography sx={{ color: '#a78bfa', fontSize: '0.85rem', mb: 3 }}>Add a new match to the schedule</Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Match Day"
                  select
                  value={createGameForm.matchDayId}
                  onChange={(e) => setCreateGameForm({ ...createGameForm, matchDayId: e.target.value })}
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': { 
                      backgroundColor: 'rgba(15, 23, 42, 0.6)', 
                      color: '#e2e8f0', 
                      borderRadius: 2, 
                      border: '1.5px solid rgba(139, 92, 246, 0.4)',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'rgba(139, 92, 246, 0.6)', backgroundColor: 'rgba(15, 23, 42, 0.8)' },
                      '&.Mui-focused': { borderColor: '#8b5cf6', boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)' }
                    },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputLabel-root': { color: '#a78bfa', fontWeight: 500 },
                    '& .MuiInputLabel-shrink': { color: '#8b5cf6' }
                  }}
                >
                  {availableMatchDays.map((md) => (
                    <MenuItem key={md.id} value={md.id} sx={{ color: '#e2e8f0', backgroundColor: '#111827', '&:hover': { backgroundColor: '#1e293b' }, '&.Mui-selected': { backgroundColor: '#1e293b !important', color: '#8b5cf6' } }}>
                      {md.season_name} — {md.match_date}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Home Team"
                  select
                  value={createGameForm.homeTeamId}
                  onChange={(e) => setCreateGameForm({ ...createGameForm, homeTeamId: e.target.value })}
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': { 
                      backgroundColor: 'rgba(15, 23, 42, 0.6)', 
                      color: '#e2e8f0', 
                      borderRadius: 2, 
                      border: '1.5px solid rgba(139, 92, 246, 0.4)',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'rgba(139, 92, 246, 0.6)', backgroundColor: 'rgba(15, 23, 42, 0.8)' },
                      '&.Mui-focused': { borderColor: '#8b5cf6', boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)' }
                    },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputLabel-root': { color: '#a78bfa', fontWeight: 500 },
                    '& .MuiInputLabel-shrink': { color: '#8b5cf6' }
                  }}
                >
                  {teamsList.map((t) => (
                    <MenuItem key={t.id} value={t.id} sx={{ color: '#e2e8f0', backgroundColor: '#111827', '&:hover': { backgroundColor: '#1e293b' }, '&.Mui-selected': { backgroundColor: '#1e293b !important', color: '#8b5cf6' } }}>
                      {t.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Away Team"
                  select
                  value={createGameForm.awayTeamId}
                  onChange={(e) => setCreateGameForm({ ...createGameForm, awayTeamId: e.target.value })}
                  fullWidth
                  disabled={!createGameForm.homeTeamId}
                  sx={{
                    '& .MuiInputBase-root': { 
                      backgroundColor: 'rgba(15, 23, 42, 0.6)', 
                      color: '#e2e8f0', 
                      borderRadius: 2, 
                      border: '1.5px solid rgba(139, 92, 246, 0.4)',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'rgba(139, 92, 246, 0.6)', backgroundColor: 'rgba(15, 23, 42, 0.8)' },
                      '&.Mui-focused': { borderColor: '#8b5cf6', boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)' }
                    },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputLabel-root': { color: '#a78bfa', fontWeight: 500 },
                    '& .MuiInputLabel-shrink': { color: '#8b5cf6' }
                  }}
                >
                  {teamsList
                    .filter((t) => t.id !== createGameForm.homeTeamId)
                    .map((t) => (
                      <MenuItem key={t.id} value={t.id} sx={{ color: '#e2e8f0', backgroundColor: '#111827', '&:hover': { backgroundColor: '#1e293b' }, '&.Mui-selected': { backgroundColor: '#1e293b !important', color: '#8b5cf6' } }}>
                        {t.name}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  label="Kickoff Time"
                  type="datetime-local"
                  value={createGameForm.kickoffAt}
                  onChange={(e) => setCreateGameForm({ ...createGameForm, kickoffAt: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiInputBase-root': { 
                      backgroundColor: 'rgba(15, 23, 42, 0.6)', 
                      color: '#e2e8f0', 
                      borderRadius: 2, 
                      border: '1.5px solid rgba(139, 92, 246, 0.4)',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'rgba(139, 92, 246, 0.6)', backgroundColor: 'rgba(15, 23, 42, 0.8)' },
                      '&.Mui-focused': { borderColor: '#8b5cf6', boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)' }
                    },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputLabel-root': { color: '#a78bfa', fontWeight: 500 },
                    '& .MuiInputLabel-shrink': { color: '#8b5cf6' }
                  }}
                />
                <Button
                  variant="contained"
                  disabled={creatingGame}
                  onClick={async () => {
                    if (!createGameForm.matchDayId || !createGameForm.homeTeamId || !createGameForm.awayTeamId || !createGameForm.kickoffAt) {
                      toast.error('Please fill out all fields');
                      return;
                    }
                    if (createGameForm.homeTeamId === createGameForm.awayTeamId) {
                      toast.error('Home and away team must be different');
                      return;
                    }
                    setCreatingGame(true);
                    try {
                      const kickoffUTC = new Date(createGameForm.kickoffAt).toISOString();
                      const { error } = await supabase.from('games').insert({
                        match_day_id: createGameForm.matchDayId,
                        home_team: createGameForm.homeTeamId,
                        away_team: createGameForm.awayTeamId,
                        kickoff_at: kickoffUTC,
                      });
                      if (error) {
                        toast.error('Error creating game: ' + error.message);
                      } else {
                        toast.success('Game created successfully');
                        setCreateGameForm({ matchDayId: '', homeTeamId: '', awayTeamId: '', kickoffAt: '' });
                        fetchGamesList();
                      }
                    } catch (err) {
                      console.error('Unexpected error creating game', err);
                      toast.error('An error occurred');
                    } finally {
                      setCreatingGame(false);
                    }
                  }}
                  sx={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    py: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                      boxShadow: '0 8px 28px rgba(139, 92, 246, 0.6)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': { opacity: 0.6, transform: 'none' }
                  }}
                >
                  {creatingGame ? '⏳ Creating…' : '🎮 Create Game'}
                </Button>
              </Stack>
            </Box>
            {gamesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: '#16a34a' }} />
              </Box>
            ) : gamesList.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                <Typography sx={{ color: '#64748b' }}>No games found.</Typography>
              </Box>
            ) : (
              <TableContainer component={Box} sx={{ backgroundColor: 'rgba(100, 116, 139, 0.05)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', maxHeight: '60vh', overflow: 'auto' }}>
                <Table stickyHeader sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0', padding: '16px' } }}>
                  <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Home Team</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Away Team</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Kickoff</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gamesList.map((g) => (
                      <TableRow key={g.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                        <TableCell>{g.home_team_name}</TableCell>
                        <TableCell>{g.away_team_name}</TableCell>
                        <TableCell>{g.kickoff_at ? new Date(g.kickoff_at).toLocaleString('en-GB') : '—'}</TableCell>
                        <TableCell align="right">
                          {g.home_goals != null && g.away_goals != null ? (
                            <Box sx={{ fontWeight: 700, color: '#16a34a' }}>{g.home_goals} – {g.away_goals}</Box>
                          ) : (
                            <Typography sx={{ color: '#64748b' }}>—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                Enter Final Scores
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                Set actual total goals, compute from game scores, and calculate player points.
              </Typography>
            </Box>

            {/* Scores Table */}
            {scoresLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: '#16a34a' }} />
              </Box>
            ) : matchDaysForScores.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center', mb: 3 }}>
                <Typography sx={{ color: '#64748b' }}>No match days found. Create match days first.</Typography>
              </Box>
            ) : (
              <Box sx={{ mb: 4, backgroundColor: 'rgba(100, 116, 139, 0.05)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', overflow: 'auto' }}>
                <Table sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0', padding: '16px' } }}>
                  <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Match Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Season</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Total Goals</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matchDaysForScores.map((md) => (
                      <TableRow key={md.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                        <TableCell>{md.match_date}</TableCell>
                        <TableCell>{md.season_name}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={actualGoalsInputs[md.id] ?? (md.actual_total_goals != null ? String(md.actual_total_goals) : '')}
                            onChange={(e) => setActualGoalsInputs((prev) => ({ ...prev, [md.id]: e.target.value }))}
                            inputProps={{ min: 0 }}
                            sx={{ width: 100, input: { color: '#fff', fontSize: '0.9rem' } }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              onClick={() => handleSaveActualGoals(md.id)}
                              disabled={savingId === md.id}
                              sx={{ color: '#16a34a', textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                              {savingId === md.id ? 'Saving…' : 'Save'}
                            </Button>
                            <Button
                              size="small"
                              startIcon={computingId === md.id ? <CircularProgress size={14} sx={{ color: '#f59e0b' }} /> : <SportsScoreIcon />}
                              onClick={() => handleComputeFromGames(md.id)}
                              disabled={computingId === md.id}
                              sx={{ color: '#f59e0b', textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                              Compute
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* Calculate Points Button */}
            <Box sx={{ p: 3, backgroundColor: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)', borderRadius: 2 }}>
              <Typography sx={{ color: '#e2e8f0', fontWeight: 600, mb: 2 }}>
                Calculate Points
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 2 }}>
                Run the points calculation for all match days with final scores set.
              </Typography>
              <Button
                variant="contained"
                startIcon={isCalculatingPoints ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <CalculateIcon />}
                disabled={isCalculatingPoints}
                onClick={async () => {
                  setIsCalculatingPoints(true);
                  try {
                    const token = await getSession();
                    if (!token) {
                      toast.error('Please sign in again');
                      return;
                    }
                    const res = await fetch('/api/admin/calculate-points', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({}),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      toast.success(`Points calculated: ${data.predictionsUpdated} predictions updated across ${data.matchDaysProcessed} match day(s).`);
                    } else {
                      toast.error(data.error || 'Failed to calculate points');
                    }
                  } catch (e) {
                    toast.error('Failed to calculate points');
                  } finally {
                    setIsCalculatingPoints(false);
                  }
                }}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#15803d' },
                }}
              >
                {isCalculatingPoints ? 'Calculating…' : 'Calculate Points for All Match Days'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                Prize Competitions
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                Create, manage, and award prizes for weekly, monthly, and seasonal competitions.
              </Typography>
            </Box>

            {/* Create Prize Form */}
            <Box sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, rgba(13, 110, 107, 0.15) 0%, rgba(15, 118, 110, 0.15) 100%)',
              border: '1.5px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 3, 
              mb: 4,
              boxShadow: '0 8px 24px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Accent line */}
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #06b6d4, #10b981, #f59e0b)' }} />
              <Typography sx={{ color: '#e0f2fe', fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '1.2rem', letterSpacing: '0.5px' }}>
                <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: '1.6rem' }} />
                New Prize Competition
              </Typography>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                  <TextField
                    size="small"
                    select
                    label="Type"
                    value={prizeForm.type}
                    onChange={(e) => {
                      setSuggestNoPredictionsMessage(null);
                      setPrizeForm((p) => ({ ...p, type: e.target.value as 'weekly' | 'monthly' | 'seasonal' }));
                    }}
                    SelectProps={{ native: true }}
                    sx={{ minWidth: 140, input: { color: '#fff' }, label: { color: '#06d6d0', fontWeight: 600 }, '& .MuiNativeSelect-select': { color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.7)' }, '& .MuiNativeSelect-select:focus': { backgroundColor: 'rgba(6, 182, 212, 0.2)' } }}
                  >
                    <option value="weekly" style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>Weekly</option>
                    <option value="monthly" style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>Monthly</option>
                    <option value="seasonal" style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>Seasonal</option>
                  </TextField>
                  <TextField
                    size="small"
                    label={prizeForm.type === 'seasonal' ? 'Period (Season UUID)' : prizeForm.type === 'monthly' ? 'Period (YYYY-MM)' : 'Period (YYYY-Wnn)'}
                    value={prizeForm.period}
                    onChange={(e) => {
                      setSuggestNoPredictionsMessage(null);
                      setPrizeForm((p) => ({ ...p, period: e.target.value }));
                    }}
                    sx={{ minWidth: 200, input: { color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.7)' }, label: { color: '#06d6d0', fontWeight: 600 }, '& .MuiOutlinedInput-root': { borderColor: 'rgba(6, 182, 212, 0.3)' }, '& .MuiOutlinedInput-root:hover': { borderColor: 'rgba(6, 182, 212, 0.5)' } }}
                  />
                  <Button
                    variant="outlined"
                    disabled={suggestingWinner || !prizeForm.period}
                    onClick={async () => {
                      setSuggestingWinner(true);
                      setSuggestNoPredictionsMessage(null);
                      try {
                        const token = await getSession();
                        if (!token) {
                          toast.error('Please sign in again');
                          return;
                        }
                        const res = await fetch(
                          `/api/admin/suggested-winner?type=${encodeURIComponent(prizeForm.type)}&period=${encodeURIComponent(prizeForm.period.trim())}`,
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data.suggested) {
                          setSuggestNoPredictionsMessage(null);
                          setPrizeForm((p) => ({
                            ...p,
                            winner_user_id: data.suggested.user_id,
                            suggested_name: `${data.suggested.display_name} (${data.suggested.total_points} pts)`,
                          }));
                          toast.success('Top-ranked user suggested');
                        } else {
                          const message = data.message || data.error || 'Could not get suggested winner';
                          setPrizeForm((p) => ({ ...p, winner_user_id: '', suggested_name: '' }));
                          setSuggestNoPredictionsMessage(message);
                          toast.error(message);
                        }
                      } finally {
                        setSuggestingWinner(false);
                      }
                    }}
                    sx={{ borderColor: '#06b6d4', color: '#06b6d4', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: 'rgba(6, 182, 212, 0.15)', borderColor: '#06b6d4' } }}
                  >
                    {suggestingWinner ? '⏳ Loading…' : '✨ Suggest Winner'}
                  </Button>
                </Stack>
                {prizeForm.suggested_name && (
                  <Box sx={{ p: 2.5, backgroundColor: 'rgba(6, 182, 212, 0.15)', borderRadius: 2, border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                    <Typography sx={{ color: '#06b6d4', fontWeight: 700, fontSize: '0.95rem' }}>
                      ✓ Suggested: {prizeForm.suggested_name}
                    </Typography>
                  </Box>
                )}
                {suggestNoPredictionsMessage && (
                  <Typography sx={{ color: '#f97316', fontSize: '0.9rem', fontWeight: 600 }}>
                    ⚠ {suggestNoPredictionsMessage}
                  </Typography>
                )}
                <TextField
                  size="small"
                  label="Prize Description"
                  placeholder="e.g. Amazon £20 gift card"
                  value={prizeForm.prize_description}
                  onChange={(e) => setPrizeForm((p) => ({ ...p, prize_description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ input: { color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.7)' }, label: { color: '#06d6d0', fontWeight: 600 }, '& .MuiOutlinedInput-root textarea': { color: '#fff' }, '& .MuiOutlinedInput-root': { borderColor: 'rgba(6, 182, 212, 0.3)' }, '& .MuiOutlinedInput-root:hover': { borderColor: 'rgba(6, 182, 212, 0.5)' } }}
                />
                <Button
                  variant="contained"
                  disabled={!prizeForm.winner_user_id || creatingPrize}
                  onClick={async () => {
                    setCreatingPrize(true);
                    try {
                      const token = await getSession();
                      if (!token) {
                        toast.error('Please sign in again');
                        return;
                      }
                      const res = await fetch('/api/admin/prizes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          type: prizeForm.type,
                          period: prizeForm.period,
                          winner_user_id: prizeForm.winner_user_id,
                          prize_description: prizeForm.prize_description || null,
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok) {
                        toast.success('Prize created successfully');
                        setPrizeForm({ type: 'weekly', period: '', winner_user_id: '', suggested_name: '', prize_description: '' });
                        fetchPrizesList();
                      } else {
                        toast.error(data.error || 'Failed to create prize');
                      }
                    } finally {
                      setCreatingPrize(false);
                    }
                  }}
                  sx={{ 
                    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                    color: '#fff', 
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    py: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 6px 20px rgba(6, 182, 212, 0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                      boxShadow: '0 8px 28px rgba(6, 182, 212, 0.6)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': { opacity: 0.6, transform: 'none' }
                  }}
                >
                  {creatingPrize ? '⏳ Creating…' : '🏆 Create Prize'}
                </Button>
              </Stack>
            </Box>

            {/* Prizes List */}
            <Box>
              <Typography sx={{ color: '#e2e8f0', fontWeight: 700, mb: 2 }}>All Prize Competitions</Typography>
              {prizesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: '#16a34a' }} />
                </Box>
              ) : prizesList.length === 0 ? (
                <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                  <Typography sx={{ color: '#64748b' }}>No prizes yet. Create one above to get started.</Typography>
                </Box>
              ) : (
                <TableContainer component={Box} sx={{ backgroundColor: 'rgba(100, 116, 139, 0.05)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                  <Table sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0', padding: '14px' } }}>
                    <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Period</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Winner</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Prize</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prizesList.map((p) => (
                        <TableRow key={p.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                          <TableCell>
                            <Chip 
                              label={p.type.charAt(0).toUpperCase() + p.type.slice(1)} 
                              size="small"
                              sx={{ backgroundColor: 'rgba(100, 116, 139, 0.3)', color: '#cbd5e1' }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{p.period}</TableCell>
                          <TableCell>{winnerNames[p.winner_user_id] ?? p.winner_user_id.slice(0, 8) + '…'}</TableCell>
                          <TableCell sx={{ maxWidth: 200, fontSize: '0.9rem' }}>{p.prize_description || '—'}</TableCell>
                          <TableCell>
                            {p.status === 'awarded' ? (
                              <Chip size="small" icon={<CheckCircleIcon />} label="Awarded" sx={{ backgroundColor: 'rgba(22, 163, 74, 0.25)', color: '#16a34a', fontWeight: 600 }} />
                            ) : (
                              <Chip size="small" label="Pending" sx={{ backgroundColor: 'rgba(249, 115, 22, 0.25)', color: '#f97316', fontWeight: 600 }} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {p.status === 'pending' && (
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  disabled={awardingId === p.id}
                                  onClick={async () => {
                                    setAwardingId(p.id);
                                    try {
                                      const token = await getSession();
                                      if (!token) {
                                        toast.error('Please sign in again');
                                        return;
                                      }
                                      const res = await fetch(`/api/admin/prizes/${p.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ status: 'awarded' }),
                                      });
                                      const data = await res.json().catch(() => ({}));
                                      if (res.ok) {
                                        toast.success('Marked as awarded');
                                        fetchPrizesList();
                                      } else {
                                        toast.error(data.error || 'Failed');
                                      }
                                    } finally {
                                      setAwardingId(null);
                                    }
                                  }}
                                  sx={{ color: '#16a34a', textTransform: 'none', fontWeight: 600 }}
                                >
                                  {awardingId === p.id ? '…' : 'Award'}
                                </Button>
                                <Tooltip title="Delete this prize entry">
                                  <Button
                                    size="small"
                                    sx={{ color: '#f87171', textTransform: 'none', fontWeight: 600 }}
                                    onClick={async () => {
                                      if (!window.confirm('Delete this prize entry?')) return;
                                      try {
                                        const token = await getSession();
                                        if (!token) {
                                          toast.error('Please sign in again');
                                          return;
                                        }
                                        const res = await fetch(`/api/admin/prizes/${p.id}`, {
                                          method: 'DELETE',
                                          headers: { Authorization: `Bearer ${token}` },
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (res.ok) {
                                          toast.success('Prize entry deleted');
                                          fetchPrizesList();
                                        } else {
                                          toast.error(data.error || 'Failed to delete');
                                        }
                                      } catch {
                                        toast.error('Failed to delete prize');
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </Tooltip>
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        </TabPanel>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#1e293b', color: '#fff', fontWeight: 700 }}>Create New Season</DialogTitle>
          <DialogContent sx={{ backgroundColor: '#0f172a', pt: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Season Name"
                value={seasonForm.name}
                onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                fullWidth
                variant="outlined"
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <TextField
                label="Start Date"
                type="date"
                value={seasonForm.startDate}
                onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <TextField
                label="End Date"
                type="date"
                value={seasonForm.endDate}
                onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                <Button onClick={() => setOpenDialog(false)} sx={{ color: '#94a3b8' }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSeason}
                  variant="contained"
                  sx={{ backgroundColor: '#16a34a', color: '#fff', fontWeight: 700, '&:hover': { backgroundColor: '#15803d' } }}
                >
                  Create Season
                </Button>
              </Box>
            </Stack>
          </DialogContent>
        </Dialog>

        <Dialog open={matchDayDialogOpen} onClose={() => setMatchDayDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#1e293b', color: '#fff', fontWeight: 700 }}>Create New Match Day</DialogTitle>
          <DialogContent sx={{ backgroundColor: '#0f172a', pt: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Season"
                select
                value={matchDayForm.seasonId}
                onChange={(e) => setMatchDayForm({ ...matchDayForm, seasonId: e.target.value })}
                fullWidth
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              >
                {seasons.map((s) => (
                  <MenuItem key={s.id} value={s.id} sx={{ color: '#0f172a' }}>
                    {s.name} ({s.start_date} → {s.end_date})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Match Date"
                type="date"
                value={matchDayForm.matchDate}
                onChange={(e) => setMatchDayForm({ ...matchDayForm, matchDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <TextField
                label="Cutoff Time"
                type="datetime-local"
                value={matchDayForm.cutoffAt}
                onChange={(e) => setMatchDayForm({ ...matchDayForm, cutoffAt: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                Cutoff time should be before the first match starts to prevent predictions after kickoff.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                <Button onClick={() => setMatchDayDialogOpen(false)} sx={{ color: '#94a3b8' }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMatchDay}
                  variant="contained"
                  sx={{ backgroundColor: '#16a34a', color: '#fff', fontWeight: 700, '&:hover': { backgroundColor: '#15803d' } }}
                >
                  Create Match Day
                </Button>
              </Box>
            </Stack>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}
