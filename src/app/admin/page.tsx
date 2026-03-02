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
  const [gamesList, setGamesList] = useState<{ id: string; match_day_id: string; home_team_name: string; away_team_name: string; kickoff_at: string; home_goals: number | null; away_goals: number | null }[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
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
          away_team_rel:teams!games_away_team_fkey(name)
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
    if (tabValue === 2) fetchGamesList();
  }, [tabValue, fetchGamesList]);
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
            <Tab label="Prizes" icon={<EmojiEventsIcon />} iconPosition="start" />
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
            <Typography sx={{ color: '#999', mb: 2 }}>Create and manage football seasons.</Typography>
            {seasonsLoading ? (
              <CircularProgress sx={{ color: '#16a34a' }} />
            ) : (
              <TableContainer component={Box} sx={{ mb: 2 }}>
                <Table size="small" sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.1)', color: '#fff' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Start date</TableCell>
                      <TableCell>End date</TableCell>
                      <TableCell>Active</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {seasons.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.start_date}</TableCell>
                        <TableCell>{s.end_date}</TableCell>
                        <TableCell>{s.is_active ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!seasonsLoading && seasons.length === 0 && (
              <Typography sx={{ color: '#999' }}>No seasons yet. Create one above.</Typography>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                  Match Days
                </Typography>
                <Typography sx={{ color: '#999', mt: 0.5 }}>Configure match days and cutoff times for predictions.</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setMatchDayDialogOpen(true)}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#0f0505',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: '#137f2d' },
                }}
              >
                New Match Day
              </Button>
            </Box>
            {matchDaysLoading ? (
              <CircularProgress sx={{ color: '#16a34a' }} />
            ) : (
              <TableContainer component={Box} sx={{ mb: 2 }}>
                <Table size="small" sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.1)', color: '#fff' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Match date</TableCell>
                      <TableCell>Season</TableCell>
                      <TableCell>Cutoff</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matchDaysList.map((md) => (
                      <TableRow key={md.id}>
                        <TableCell>{md.match_date}</TableCell>
                        <TableCell>{md.season_name}</TableCell>
                        <TableCell>{md.cutoff_at ? new Date(md.cutoff_at).toLocaleString() : '—'}</TableCell>
                        <TableCell align="right">
                          {md.cutoff_at ? (
                            <Chip
                              size="small"
                              label={new Date(md.cutoff_at).getTime() > Date.now() ? 'Open' : 'Past cutoff'}
                              sx={{
                                backgroundColor:
                                  new Date(md.cutoff_at).getTime() > Date.now()
                                    ? 'rgba(22,163,74,0.25)'
                                    : 'rgba(148,163,184,0.35)',
                                color:
                                  new Date(md.cutoff_at).getTime() > Date.now()
                                    ? '#16a34a'
                                    : '#e5e7eb',
                              }}
                            />
                          ) : (
                            <Chip size="small" label="No cutoff" sx={{ backgroundColor: '#4b5563', color: '#e5e7eb' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!matchDaysLoading && matchDaysList.length === 0 && (
              <Typography sx={{ color: '#999' }}>No match days in the database.</Typography>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Games
            </Typography>
            <Typography sx={{ color: '#999', mb: 2 }}>Games per match day.</Typography>
            {gamesLoading ? (
              <CircularProgress sx={{ color: '#16a34a' }} />
            ) : (
              <TableContainer component={Box} sx={{ mb: 2, maxHeight: 440, overflow: 'auto' }}>
                <Table size="small" stickyHeader sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.1)', color: '#fff' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Home</TableCell>
                      <TableCell>Away</TableCell>
                      <TableCell>Kickoff</TableCell>
                      <TableCell align="right">Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gamesList.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{g.home_team_name}</TableCell>
                        <TableCell>{g.away_team_name}</TableCell>
                        <TableCell>{g.kickoff_at ? new Date(g.kickoff_at).toLocaleString() : '—'}</TableCell>
                        <TableCell align="right">
                          {g.home_goals != null && g.away_goals != null ? `${g.home_goals} – ${g.away_goals}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!gamesLoading && gamesList.length === 0 && (
              <Typography sx={{ color: '#999' }}>No games in the database.</Typography>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Enter Final Scores
            </Typography>
            <Typography sx={{ color: '#999', mb: 2 }}>
              Set actual total goals per match day (manually or compute from game scores), then run the points calculation.
            </Typography>
            {scoresLoading ? (
              <CircularProgress sx={{ color: '#16a34a' }} />
            ) : matchDaysForScores.length === 0 ? (
              <Typography sx={{ color: '#999', mb: 2 }}>No match days found. Add match days in the Match Days tab (or ensure seasons exist).</Typography>
            ) : (
              <Table size="small" sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }, mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Match date</TableCell>
                    <TableCell>Season</TableCell>
                    <TableCell>Actual total goals</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matchDaysForScores.map((md) => (
                    <TableRow key={md.id}>
                      <TableCell>{md.match_date}</TableCell>
                      <TableCell>{md.season_name}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={actualGoalsInputs[md.id] ?? (md.actual_total_goals != null ? String(md.actual_total_goals) : '')}
                          onChange={(e) => setActualGoalsInputs((prev) => ({ ...prev, [md.id]: e.target.value }))}
                          inputProps={{ min: 0 }}
                          sx={{ width: 80, input: { color: '#fff' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => handleSaveActualGoals(md.id)}
                          disabled={savingId === md.id}
                          sx={{ mr: 1, color: '#16a34a' }}
                        >
                          {savingId === md.id ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          size="small"
                          startIcon={computingId === md.id ? <CircularProgress size={14} sx={{ color: '#16a34a' }} /> : <SportsScoreIcon />}
                          onClick={() => handleComputeFromGames(md.id)}
                          disabled={computingId === md.id}
                          sx={{ color: '#f59e0b' }}
                        >
                          From games
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Typography sx={{ color: '#999', fontSize: '0.8rem', mb: 1 }}>
              Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Project Settings → API → service_role).
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
                '&:hover': { backgroundColor: '#137f2d' },
              }}
            >
              {isCalculatingPoints ? 'Calculating…' : 'Calculate points for all match days'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Prize competitions
            </Typography>
            <Typography sx={{ color: '#999', mb: 2 }}>
              After each week/month/season ends, suggest the top-ranked user as winner, confirm and enter prize description. Mark as awarded once the prize is sent. No automated payouts — you contact winners by email.
            </Typography>

            <Stack spacing={2} sx={{ mb: 4, p: 2, backgroundColor: 'rgba(22, 163, 74, 0.08)', borderRadius: 1, border: '1px solid rgba(22, 163, 74, 0.25)' }}>
              <Typography sx={{ color: '#16a34a', fontWeight: 600 }}>Create new prize</Typography>
              <Stack direction="row" flexWrap="wrap" spacing={2} alignItems="center">
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
                  sx={{ minWidth: 120, input: { color: '#fff' }, label: { color: '#999' } }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="seasonal">Seasonal</option>
                </TextField>
                <TextField
                  size="small"
                  label={prizeForm.type === 'seasonal' ? 'Period (season UUID)' : prizeForm.type === 'monthly' ? 'Period (e.g. 2026-02)' : 'Period (e.g. 2026-W08)'}
                  value={prizeForm.period}
                  onChange={(e) => {
                    setSuggestNoPredictionsMessage(null);
                    setPrizeForm((p) => ({ ...p, period: e.target.value }));
                  }}
                  placeholder={prizeForm.type === 'seasonal' ? 'Season ID' : prizeForm.type === 'monthly' ? 'YYYY-MM' : 'YYYY-Wnn'}
                  sx={{ minWidth: 180, input: { color: '#fff' }, label: { color: '#999' } }}
                />
                <Button
                  variant="outlined"
                  size="small"
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
                        toast.success('Top ranked user suggested');
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
                  sx={{ borderColor: '#16a34a', color: '#16a34a' }}
                >
                  {suggestingWinner ? '…' : 'SUGGEST WINNER'}
                </Button>
              </Stack>
              {prizeForm.suggested_name && (
                <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>
                  Suggested winner: <strong>{prizeForm.suggested_name}</strong>
                </Typography>
              )}
              {suggestNoPredictionsMessage && (
                <Typography sx={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                  {suggestNoPredictionsMessage}
                </Typography>
              )}
              <TextField
                size="small"
                label="Prize description (e.g. Amazon £20 voucher)"
                value={prizeForm.prize_description}
                onChange={(e) => setPrizeForm((p) => ({ ...p, prize_description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                sx={{ input: { color: '#fff' }, label: { color: '#999' }, textarea: { color: '#fff' } }}
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
                      toast.success('Prize created');
                      setPrizeForm({ type: 'weekly', period: '', winner_user_id: '', suggested_name: '', prize_description: '' });
                      fetchPrizesList();
                    } else {
                      toast.error(data.error || 'Failed to create prize');
                    }
                  } finally {
                    setCreatingPrize(false);
                  }
                }}
                sx={{ backgroundColor: '#16a34a', color: '#fff', alignSelf: 'flex-start' }}
              >
                {creatingPrize ? 'Creating…' : 'Create prize'}
              </Button>
            </Stack>

            <Typography sx={{ color: '#999', mb: 1 }}>All prizes</Typography>
            {prizesLoading ? (
              <CircularProgress sx={{ color: '#16a34a', mb: 2 }} />
            ) : prizesList.length > 0 ? (
              <TableContainer component={Box} sx={{ mb: 2 }}>
                <Table size="small" sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.1)', color: '#fff' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Winner</TableCell>
                      <TableCell>Prize description</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {prizesList.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.type}</TableCell>
                        <TableCell>{p.period}</TableCell>
                        <TableCell>{winnerNames[p.winner_user_id] ?? p.winner_user_id.slice(0, 8) + '…'}</TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>{p.prize_description || '—'}</TableCell>
                        <TableCell>
                          {p.status === 'awarded' ? (
                            <Chip size="small" icon={<CheckCircleIcon />} label="Awarded" sx={{ backgroundColor: '#16a34a', color: '#fff' }} />
                          ) : (
                            <Chip size="small" label="Pending" sx={{ backgroundColor: '#666', color: '#fff' }} />
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
                                sx={{ color: '#16a34a' }}
                              >
                                {awardingId === p.id ? '…' : 'Mark as awarded'}
                              </Button>
                              <Tooltip title="Cancel this prize record (it will be removed).">
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={async () => {
                                    if (!window.confirm('Cancel this prize? This will remove it from the list.')) return;
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
                                        toast.success('Prize cancelled');
                                        fetchPrizesList();
                                      } else {
                                        toast.error(data.error || 'Failed to cancel prize');
                                      }
                                    } catch {
                                      toast.error('Failed to cancel prize');
                                    }
                                  }}
                                >
                                  Cancel
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
            ) : (
              <Typography sx={{ color: '#999' }}>No prizes yet. Create one above using Suggest winner for a period.</Typography>
            )}
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

        <Dialog open={matchDayDialogOpen} onClose={() => setMatchDayDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#1a1a1a', color: '#fff' }}>Create New Match Day</DialogTitle>
          <DialogContent sx={{ backgroundColor: '#0a0a0a', pt: 2 }}>
            <Stack spacing={2}>
              <TextField
                label="Season"
                select
                value={matchDayForm.seasonId}
                onChange={(e) => setMatchDayForm({ ...matchDayForm, seasonId: e.target.value })}
                fullWidth
                sx={{ '& .MuiInputBase-input': { color: '#fff' }, '& .MuiInputLabel-root': { color: '#999' } }}
              >
                {seasons.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
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
                sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
              />
              <TextField
                label="Cutoff time"
                type="datetime-local"
                value={matchDayForm.cutoffAt}
                onChange={(e) => setMatchDayForm({ ...matchDayForm, cutoffAt: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ input: { color: '#fff' }, label: { color: '#999' } }}
              />
              <Typography sx={{ color: '#777', fontSize: '0.8rem' }}>
                Cutoff should be before the first kickoff so players cannot submit predictions once matches are underway.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button onClick={() => setMatchDayDialogOpen(false)} sx={{ color: '#999' }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMatchDay}
                  variant="contained"
                  sx={{ backgroundColor: '#16a34a', color: '#0f0505', fontWeight: 700 }}
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
