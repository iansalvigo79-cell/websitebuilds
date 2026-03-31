"use client";

import { Box, Container, Typography, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, MenuItem, Tooltip, IconButton, Switch, Autocomplete } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AddIcon from '@mui/icons-material/Add';
import CalculateIcon from '@mui/icons-material/Calculate';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import { toast } from 'react-toastify';
import { Prize, Blog, BlogCategory } from '@/types/database';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import ModernLoader from '@/components/ui/ModernLoader';

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
  const [setActiveOnCreate, setSetActiveOnCreate] = useState(true);
  const [closeSeasonDialogOpen, setCloseSeasonDialogOpen] = useState(false);
  const [seasonToClose, setSeasonToClose] = useState<{ id: string; name: string } | null>(null);
  const [closingSeason, setClosingSeason] = useState(false);
  const [seasonActionId, setSeasonActionId] = useState<string | null>(null);
  const [seasonDeleteId, setSeasonDeleteId] = useState<string | null>(null);
  const [isCalculatingPoints, setIsCalculatingPoints] = useState(false);
  const [matchDaysForScores, setMatchDaysForScores] = useState<{ id: string; name?: string | null; match_date: string; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null; season_name?: string }[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoreInputs, setScoreInputs] = useState<Record<string, { ftGoals: string; htGoals: string; totalCorners: string; htCorners: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [computingId, setComputingId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<{ id: string; name: string; start_date: string; end_date: string; is_active: boolean }[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [competitions, setCompetitions] = useState<{ id: string; name: string; short_name: string | null; country: string | null; icon?: string | null; is_active: boolean }[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [competitionForm, setCompetitionForm] = useState({ name: '', shortName: '', country: '', icon: '' });
  const [creatingCompetition, setCreatingCompetition] = useState(false);
  const [competitionActionId, setCompetitionActionId] = useState<string | null>(null);
  const [matchDaysList, setMatchDaysList] = useState<{ id: string; name?: string | null; match_date: string; cutoff_at: string; season_id?: string; season_name?: string }[]>([]);
  const [matchDaysLoading, setMatchDaysLoading] = useState(false);
  const [gamesList, setGamesList] = useState<{ id: string; match_day_id: string; match_day_date?: string; home_team_name: string; away_team_name: string; competition_short_name?: string | null; kickoff_at: string; home_goals: number | null; away_goals: number | null }[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  // creation helpers for games tab
  const [availableMatchDays, setAvailableMatchDays] = useState<{ id: string; name?: string | null; match_date: string; season_name: string }[]>([]);
  const [teamsList, setTeamsList] = useState<{ id: string; name: string }[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [bulkTeamsInput, setBulkTeamsInput] = useState('');
  const [teamSearchInput, setTeamSearchInput] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [createGameForm, setCreateGameForm] = useState({ matchDayId: '', competitionId: '', homeTeamId: '', awayTeamId: '', kickoffAt: '' });
  const [creatingGame, setCreatingGame] = useState(false);
  const [prizesList, setPrizesList] = useState<Prize[]>([]);
  const [prizesLoading, setPrizesLoading] = useState(false);
  const [prizeForm, setPrizeForm] = useState({
    type: 'weekly' as 'weekly' | 'monthly' | 'seasonal' | 'player',
    period: '',
    points_threshold: '',
    prize_matchday_id: '',
    winner_user_id: '',
    suggested_name: '',
    prize_description: '',
  });
  const [playerCandidates, setPlayerCandidates] = useState<Array<{ user_id: string; display_name: string; total_points: number; exact_hits: number; reached_at: string | null }>>([]);
  const [suggestingWinner, setSuggestingWinner] = useState(false);
  const [suggestNoPredictionsMessage, setSuggestNoPredictionsMessage] = useState<string | null>(null);
  const [creatingPrize, setCreatingPrize] = useState(false);
  const [confirmingWinner, setConfirmingWinner] = useState(false);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [winnerNames, setWinnerNames] = useState<Record<string, string>>({});
  const [matchDayDialogOpen, setMatchDayDialogOpen] = useState(false);
  const [matchDayForm, setMatchDayForm] = useState<{ name: string; seasonId: string; matchDate: string; cutoffAt: string }>({
    name: '',
    seasonId: '',
    matchDate: '',
    cutoffAt: '',
  });
  const [editingMatchDayId, setEditingMatchDayId] = useState<string | null>(null);
  const [matchDayNameDraft, setMatchDayNameDraft] = useState('');
  const [savingMatchDayNameId, setSavingMatchDayNameId] = useState<string | null>(null);
  const [matchDaySeasonId, setMatchDaySeasonId] = useState<string>('');
  const [deleteMatchDayDialogOpen, setDeleteMatchDayDialogOpen] = useState(false);
  const [matchDayToDelete, setMatchDayToDelete] = useState<{ id: string; name?: string | null; match_date: string; cutoff_at: string; season_name?: string } | null>(null);
  const [deletingMatchDay, setDeletingMatchDay] = useState(false);
  const [blogsList, setBlogsList] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [publishingBlogId, setPublishingBlogId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState({
    title: '',
    description: '',
    content: '',
    category: 'Strategy' as BlogCategory,
    author: '',
    image_url: '',
    is_published: false,
  });

  const selectMenuProps = {
    PaperProps: {
      sx: {
        backgroundColor: '#0b1220',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        color: '#e2e8f0',
        boxShadow: '0 16px 32px rgba(0,0,0,0.4)',
      },
    },
    MenuListProps: {
      sx: { py: 0 },
    },
  };

  const selectMenuItemSx = {
    color: '#e2e8f0',
    fontWeight: 600,
    '&.Mui-selected': {
      backgroundColor: 'rgba(22, 163, 74, 0.2)',
      color: '#f8fafc',
    },
    '&.Mui-selected:hover': {
      backgroundColor: 'rgba(22, 163, 74, 0.28)',
    },
    '&:hover': {
      backgroundColor: 'rgba(148, 163, 184, 0.15)',
    },
    '&.Mui-disabled': {
      color: 'rgba(148, 163, 184, 0.5)',
    },
  };

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
        .select('id, name, match_date, actual_total_goals, ht_goals, total_corners, ht_corners, season_id, seasons(name)')
        .order('match_date', { ascending: false })
        .limit(60);
      if (mdErr) {
        toast.error(mdErr.message);
        setMatchDaysForScores([]);
        return;
      }
      const rows = (mdList || []).map((md: any) => ({
        id: md.id,
        name: md.name ?? null,
        match_date: md.match_date,
        actual_total_goals: md.actual_total_goals,
        ht_goals: md.ht_goals ?? null,
        total_corners: md.total_corners ?? null,
        ht_corners: md.ht_corners ?? null,
        season_name: md.seasons?.name ?? '-',
      }));
      setMatchDaysForScores(rows);
      setScoreInputs((prev) => {
        const next = { ...prev };
        rows.forEach((r: { id: string; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null }) => {
          if (!next[r.id]) {
            next[r.id] = { ftGoals: '', htGoals: '', totalCorners: '', htCorners: '' };
          }
          if (r.actual_total_goals != null && next[r.id].ftGoals === '') next[r.id].ftGoals = String(r.actual_total_goals);
          if (r.ht_goals != null && next[r.id].htGoals === '') next[r.id].htGoals = String(r.ht_goals);
          if (r.total_corners != null && next[r.id].totalCorners === '') next[r.id].totalCorners = String(r.total_corners);
          if (r.ht_corners != null && next[r.id].htCorners === '') next[r.id].htCorners = String(r.ht_corners);
        });
        return next;
      });
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabValue === 5) fetchMatchDaysForScores();
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

  const fetchCompetitionsList = useCallback(async () => {
    setCompetitionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('id, name, short_name, country, icon, is_active')
        .order('name', { ascending: true });
      if (error) {
        toast.error(error.message);
        setCompetitions([]);
      } else {
        setCompetitions((data || []) as { id: string; name: string; short_name: string | null; country: string | null; icon?: string | null; is_active: boolean }[]);
      }
    } finally {
      setCompetitionsLoading(false);
    }
  }, []);

  const fetchMatchDaysList = useCallback(async () => {
    setMatchDaysLoading(true);
    try {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, name, match_date, cutoff_at, season_id, seasons(name)')
        .order('match_date', { ascending: false })
        .limit(100);
      if (error) {
        toast.error(error.message);
        setMatchDaysList([]);
      } else {
        setMatchDaysList((data || []).map((md: any) => ({
          id: md.id,
          name: md.name ?? null,
          match_date: md.match_date,
          cutoff_at: md.cutoff_at,
          season_id: md.season_id,
          season_name: md.seasons?.name ?? '-',
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
          match_days(match_date),
          competitions(short_name)
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
            competition_short_name: null,
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
          competition_short_name: g.competitions?.short_name ?? null,
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
      .select('id, name, match_date, season_id, seasons(name)')
      .eq('is_open', true)
      .order('match_date', { ascending: true });
    if (error) {
      toast.error(error.message);
      setAvailableMatchDays([]);
    } else {
      setAvailableMatchDays((data || []).map((md: any) => ({
        id: md.id,
        name: md.name ?? null,
        match_date: md.match_date,
        season_name: md.seasons?.name ?? '-',
      })));
    }
  }, []);

  const fetchTeamsList = useCallback(async () => {
    setTeamsLoading(true);
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
    setTeamsLoading(false);
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
      const res = await fetch('/api/admin/prizes', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.prizes)) {
        setPrizesList(data.prizes);
        const userIds = [...new Set(data.prizes.map((p: Prize) => p.winner_user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
          const names: Record<string, string> = {};
          (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
            names[p.id] = p.display_name || p.id.slice(0, 8) + '...';
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

  const fetchBlogsList = useCallback(async () => {
    setBlogsLoading(true);
    try {
      const token = await getSession();
      const res = await fetch('/api/blogs?limit=100&includeDrafts=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch blogs');
      const { blogs } = await res.json();
      setBlogsList(blogs || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      toast.error('Failed to load blogs');
      setBlogsList([]);
    } finally {
      setBlogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabValue === 0 || tabValue === 2) fetchSeasons();
  }, [tabValue, fetchSeasons]);
  useEffect(() => {
    if (!matchDaySeasonId && seasons.length) {
      const active = seasons.find((s) => s.is_active) ?? seasons[0];
      if (active) setMatchDaySeasonId(active.id);
    }
  }, [seasons, matchDaySeasonId]);
  useEffect(() => {
    if (tabValue === 1) fetchCompetitionsList();
  }, [tabValue, fetchCompetitionsList]);
  useEffect(() => {
    if (tabValue === 2 || tabValue === 6) fetchMatchDaysList();
  }, [tabValue, fetchMatchDaysList]);
  useEffect(() => {
    if (tabValue === 3) {
      fetchGamesList();
      fetchMatchDaysForGames();
      fetchTeamsList();
      fetchCompetitionsList();
    } else if (tabValue === 4) {
      fetchTeamsList();
    }
  }, [tabValue, fetchGamesList, fetchMatchDaysForGames, fetchTeamsList, fetchCompetitionsList]);
  useEffect(() => {
    if (tabValue === 6) fetchPrizesList();
  }, [tabValue, fetchPrizesList]);
  useEffect(() => {
    if (tabValue === 7) fetchBlogsList();
  }, [tabValue, fetchBlogsList]);

  const handleSaveActualGoals = async (matchDayId: string) => {
    const inputs = scoreInputs[matchDayId] || { ftGoals: '', htGoals: '', totalCorners: '', htCorners: '' };
    const parseNullable = (raw: string, label: string) => {
      if (raw === '') return null;
      const val = parseInt(raw, 10);
      if (Number.isNaN(val) || val < 0) {
        throw new Error(`Enter a valid non-negative number for ${label}`);
      }
      return val;
    };
    let ftGoals: number | null = null;
    let htGoals: number | null = null;
    let totalCorners: number | null = null;
    let htCorners: number | null = null;
    try {
      ftGoals = parseNullable(inputs.ftGoals, 'FT Goals');
      htGoals = parseNullable(inputs.htGoals, 'HT Goals');
      totalCorners = parseNullable(inputs.totalCorners, 'Total Corners');
      htCorners = parseNullable(inputs.htCorners, 'HT Corners');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enter valid numbers');
      return;
    }
    setSavingId(matchDayId);
    try {
      const { error } = await supabase
        .from('match_days')
        .update({
          actual_total_goals: ftGoals,
          ht_goals: htGoals,
          total_corners: totalCorners,
          ht_corners: htCorners,
        })
        .eq('id', matchDayId);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Scores saved successfully');
      fetchMatchDaysForScores();
    } finally {
      setSavingId(null);
    }
  };

  const handleComputePoints = async (matchDayId: string) => {
    const inputs = scoreInputs[matchDayId] || { ftGoals: '', htGoals: '', totalCorners: '', htCorners: '' };
    const parseNullable = (raw: string, label: string) => {
      if (raw === '') return null;
      const val = parseInt(raw, 10);
      if (Number.isNaN(val) || val < 0) {
        throw new Error(`Enter a valid non-negative number for ${label}`);
      }
      return val;
    };
    let ftGoals: number | null = null;
    let htGoals: number | null = null;
    let totalCorners: number | null = null;
    let htCorners: number | null = null;
    try {
      ftGoals = parseNullable(inputs.ftGoals, 'FT Goals');
      htGoals = parseNullable(inputs.htGoals, 'HT Goals');
      totalCorners = parseNullable(inputs.totalCorners, 'Total Corners');
      htCorners = parseNullable(inputs.htCorners, 'HT Corners');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enter valid numbers');
      return;
    }

    if (ftGoals == null && htGoals == null && totalCorners == null && htCorners == null) {
      toast.error('Enter at least one actual score to compute points');
      return;
    }

    setComputingId(matchDayId);
    try {
      const token = await getSession();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }

      const res = await fetch('/api/admin/calculate-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          matchDayId,
          actual_total_goals: ftGoals,
          ht_goals: htGoals,
          total_corners: totalCorners,
          ht_corners: htCorners,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to calculate points');
        return;
      }

      toast.success(`Points awarded: ${data.predictionsUpdated ?? 0} prediction(s) updated.`);
      fetchMatchDaysForScores();
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
      if (setActiveOnCreate) {
        const { error: deactivateError } = await supabase
          .from('seasons')
          .update({ is_active: false })
          .eq('is_active', true);
        if (deactivateError) {
          console.error('Supabase Season Deactivate Error (admin):', deactivateError);
          toast.error('Error deactivating seasons: ' + deactivateError.message);
          return;
        }
      }

      const { error } = await supabase.from('seasons').insert({
        name: seasonForm.name,
        start_date: seasonForm.startDate,
        end_date: seasonForm.endDate,
        is_active: setActiveOnCreate,
      });

      if (error) {
        console.error('Supabase Season Error (admin):', error);
        toast.error('Error creating season: ' + error.message);
        return;
      }

      toast.success('Season created successfully!');
      setSeasonForm({ name: '', startDate: '', endDate: '' });
      setSetActiveOnCreate(true);
      setOpenDialog(false);
      fetchSeasons();
    } catch (err) {
      console.error('Unexpected Error (admin createSeason):', err);
      toast.error('An error occurred');
    }
  };

  const handleOpenCloseSeasonDialog = (season: { id: string; name: string }) => {
    setSeasonToClose(season);
    setCloseSeasonDialogOpen(true);
  };

  const handleCloseSeasonDialog = () => {
    setCloseSeasonDialogOpen(false);
    setSeasonToClose(null);
  };

  const handleConfirmCloseSeason = async () => {
    if (!seasonToClose) return;
    setClosingSeason(true);
    try {
      const { error } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', seasonToClose.id);
      if (error) {
        console.error('Supabase Season Close Error (admin):', error);
        toast.error('Error closing season: ' + error.message);
        return;
      }
      toast.success('Season closed successfully');
      handleCloseSeasonDialog();
      fetchSeasons();
    } catch (err) {
      console.error('Unexpected Error (admin closeSeason):', err);
      toast.error('An error occurred');
    } finally {
      setClosingSeason(false);
    }
  };

  const handleSetActiveSeason = async (seasonId: string) => {
    setSeasonActionId(seasonId);
    try {
      const { error: deactivateError } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', seasonId);
      if (deactivateError) {
        console.error('Supabase Season Deactivate Error (admin):', deactivateError);
        toast.error('Error deactivating seasons: ' + deactivateError.message);
        return;
      }

      const { error: activateError } = await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', seasonId);
      if (activateError) {
        console.error('Supabase Season Activate Error (admin):', activateError);
        toast.error('Error activating season: ' + activateError.message);
        return;
      }

      toast.success('Season activated successfully');
      fetchSeasons();
    } catch (err) {
      console.error('Unexpected Error (admin setActiveSeason):', err);
      toast.error('An error occurred');
    } finally {
      setSeasonActionId(null);
    }
  };

  const handleDeleteSeason = (season: { id: string; name: string }) => {
    const toastId = toast(
      ({ closeToast }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontWeight: 700, color: '#fff' }}>
            Delete &quot;{season.name}&quot;?
          </Typography>
          <Typography sx={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            This will delete the season and all of its match days.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
            <Button
              variant="outlined"
              onClick={() => closeToast?.()}
              sx={{
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#e2e8f0',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                closeToast?.();
                setSeasonDeleteId(season.id);
                try {
                  const { data: matchDays, error: matchDaysError } = await supabase
                    .from('match_days')
                    .select('id')
                    .eq('season_id', season.id);
                  if (matchDaysError) {
                    console.error('Supabase Match Day Fetch Error (admin):', matchDaysError);
                    toast.error('Error checking match days: ' + matchDaysError.message);
                    return;
                  }

                  const matchDayIds = (matchDays || []).map((md) => md.id);

                  if (matchDayIds.length > 0) {
                    const { error: predictionsError } = await supabase
                      .from('predictions')
                      .delete()
                      .in('match_day_id', matchDayIds);
                    if (predictionsError) {
                      console.warn('Supabase Predictions Delete Warning:', predictionsError);
                    }

                    const { error: gamesError } = await supabase
                      .from('games')
                      .delete()
                      .in('match_day_id', matchDayIds);
                    if (gamesError) {
                      console.warn('Supabase Games Delete Warning:', gamesError);
                    }

                    const { error: matchDayDeleteError } = await supabase
                      .from('match_days')
                      .delete()
                      .eq('season_id', season.id);
                    if (matchDayDeleteError) {
                      console.error('Supabase Match Day Delete Error (admin):', matchDayDeleteError);
                      toast.error('Error deleting match days: ' + matchDayDeleteError.message);
                      return;
                    }
                  }

                  const { error } = await supabase
                    .from('seasons')
                    .delete()
                    .eq('id', season.id);
                  if (error) {
                    console.error('Supabase Season Delete Error (admin):', error);
                    toast.error('Error deleting season: ' + error.message);
                    return;
                  }
                  toast.success('Season deleted successfully');
                  fetchSeasons();
                } catch (err) {
                  console.error('Unexpected Error (admin deleteSeason):', err);
                  toast.error('An error occurred');
                } finally {
                  setSeasonDeleteId(null);
                }
              }}
              sx={{
                backgroundColor: '#ef4444',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 800,
                '&:hover': { backgroundColor: '#dc2626' },
              }}
            >
              Yes, Delete
            </Button>
          </Stack>
        </Box>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }
    );
    return toastId;
  };

  const handleCreateMatchDay = async () => {
    if (!matchDayForm.seasonId || !matchDayForm.matchDate || !matchDayForm.cutoffAt) {
      toast.error('Please select a season, match date and cutoff time');
      return;
    }
    const selectedSeason = seasons.find((s) => s.id === matchDayForm.seasonId);
    if (selectedSeason && !selectedSeason.is_active) {
      toast.error('Season is closed. Match days cannot be created.');
      return;
    }
    try {
      const { data: existingMatchDay, error: existingError } = await supabase
        .from('match_days')
        .select('id')
        .eq('season_id', matchDayForm.seasonId)
        .eq('match_date', matchDayForm.matchDate)
        .limit(1)
        .maybeSingle();
      if (existingError) {
        toast.error('Error checking match day: ' + existingError.message);
        return;
      }
      if (existingMatchDay) {
        toast.error('Match day already exists for this season and date.');
        return;
      }
      const { error } = await supabase.from('match_days').insert({
        season_id: matchDayForm.seasonId,
        match_date: matchDayForm.matchDate,
        cutoff_at: matchDayForm.cutoffAt,
        name: matchDayForm.name ? matchDayForm.name.trim() : null,
        is_open: true,
      });
      if (error) {
        const message = error.message.includes('match_days_season_date_unique')
          ? 'Match day already exists for this season and date.'
          : error.message;
        toast.error('Error creating match day: ' + message);
        return;
      }
      toast.success('Match day created');
      setMatchDayForm({ name: '', seasonId: '', matchDate: '', cutoffAt: '' });
      setMatchDayDialogOpen(false);
      fetchMatchDaysList();
    } catch (err) {
      console.error('Unexpected Error (admin createMatchDay):', err);
      toast.error('An error occurred');
    }
  };

  const handleOpenDeleteMatchDayDialog = (matchDay: { id: string; name?: string | null; match_date: string; cutoff_at: string; season_name?: string }) => {
    setMatchDayToDelete(matchDay);
    setDeleteMatchDayDialogOpen(true);
  };

  const handleCloseDeleteMatchDayDialog = () => {
    if (deletingMatchDay) return;
    setDeleteMatchDayDialogOpen(false);
    setMatchDayToDelete(null);
  };

  const handleConfirmDeleteMatchDay = async () => {
    if (!matchDayToDelete) return;
    setDeletingMatchDay(true);
    try {
      const { error } = await supabase
        .from('match_days')
        .delete()
        .eq('id', matchDayToDelete.id);
      if (error) {
        toast.error('Error deleting match day: ' + error.message);
        return;
      }
      toast.success('Match day deleted');
      fetchMatchDaysList();
      handleCloseDeleteMatchDayDialog();
    } catch (err) {
      console.error('Unexpected Error (admin deleteMatchDay):', err);
      toast.error('An error occurred');
    } finally {
      setDeletingMatchDay(false);
    }
  };

  const handleEditMatchDayName = (matchDay: { id: string; name?: string | null }) => {
    setEditingMatchDayId(matchDay.id);
    setMatchDayNameDraft(matchDay.name ?? '');
  };

  const handleSaveMatchDayName = async (matchDayId: string) => {
    setSavingMatchDayNameId(matchDayId);
    try {
      const nextName = matchDayNameDraft.trim();
      const { error } = await supabase
        .from('match_days')
        .update({ name: nextName || null })
        .eq('id', matchDayId);
      if (error) {
        toast.error('Error updating match day: ' + error.message);
        return;
      }
      toast.success('Matchday name updated');
      setEditingMatchDayId(null);
      setMatchDayNameDraft('');
      fetchMatchDaysList();
    } catch (err) {
      console.error('Unexpected Error (admin updateMatchDayName):', err);
      toast.error('An error occurred');
    } finally {
      setSavingMatchDayNameId(null);
    }
  };

  const handleCreateCompetition = async () => {
    const name = competitionForm.name.trim();
    if (!name) {
      toast.error('Competition name is required');
      return;
    }
    const icon = competitionForm.icon.trim().slice(0, 4) || '?';
    setCreatingCompetition(true);
    try {
      const { error } = await supabase
        .from('competitions')
        .insert({
          name,
          short_name: competitionForm.shortName.trim() || null,
          country: competitionForm.country.trim() || null,
          icon,
        });
      if (error) {
        toast.error('Error adding competition: ' + error.message);
        return;
      }
      toast.success('Competition added');
      setCompetitionForm({ name: '', shortName: '', country: '', icon: '' });
      fetchCompetitionsList();
    } catch (err) {
      console.error('Unexpected Error (admin addCompetition):', err);
      toast.error('An error occurred');
    } finally {
      setCreatingCompetition(false);
    }
  };

  const handleToggleCompetition = async (competition: { id: string; is_active: boolean }) => {
    setCompetitionActionId(competition.id);
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ is_active: !competition.is_active })
        .eq('id', competition.id);
      if (error) {
        toast.error('Error updating competition: ' + error.message);
        return;
      }
      fetchCompetitionsList();
    } catch (err) {
      console.error('Unexpected Error (admin toggleCompetition):', err);
      toast.error('An error occurred');
    } finally {
      setCompetitionActionId(null);
    }
  };

  const handleDeleteCompetition = async (competitionId: string) => {
    if (!window.confirm('Delete this competition?')) return;
    setCompetitionActionId(competitionId);
    try {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', competitionId);
      if (error) {
        toast.error('Error deleting competition: ' + error.message);
        return;
      }
      toast.success('Competition deleted');
      fetchCompetitionsList();
    } catch (err) {
      console.error('Unexpected Error (admin deleteCompetition):', err);
      toast.error('An error occurred');
    } finally {
      setCompetitionActionId(null);
    }
  };

  const handleAddTeam = async () => {
    const name = teamNameInput.trim();
    if (!name) {
      toast.error('Please enter a team name');
      return;
    }
    try {
      const { error } = await supabase.from('teams').insert({ name });
      if (error) {
        toast.error('Error adding team: ' + error.message);
        return;
      }
      toast.success('Team added successfully');
      setTeamNameInput('');
      fetchTeamsList();
    } catch (err) {
      console.error('Unexpected Error (admin addTeam):', err);
      toast.error('An error occurred');
    }
  };

  const handleBulkAddTeams = async () => {
    const names = bulkTeamsInput
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) {
      toast.error('Please enter at least one team name');
      return;
    }
    try {
      const { error } = await supabase
        .from('teams')
        .insert(names.map((name) => ({ name })));
      if (error) {
        toast.error('Error adding teams: ' + error.message);
        return;
      }
      toast.success(`${names.length} teams added successfully`);
      setBulkTeamsInput('');
      fetchTeamsList();
    } catch (err) {
      console.error('Unexpected Error (admin bulkAddTeams):', err);
      toast.error('An error occurred');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) {
        toast.error('Error deleting team: ' + error.message);
        return;
      }
      toast.success('Team deleted');
      fetchTeamsList();
    } catch (err) {
      console.error('Unexpected Error (admin deleteTeam):', err);
      toast.error('An error occurred');
    }
  };

  const handleStartEditTeam = (team: { id: string; name: string }) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const handleCancelEditTeam = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const handleSaveTeamName = async () => {
    if (!editingTeamId) return;
    const name = editingTeamName.trim();
    if (!name) {
      toast.error('Team name must not be empty');
      return;
    }
    const normalized = name.toLowerCase();
    const localDuplicate = teamsList.some((t) => t.id !== editingTeamId && t.name.trim().toLowerCase() === normalized);
    if (localDuplicate) {
      toast.error('A team with this name already exists');
      return;
    }
    setSavingTeamId(editingTeamId);
    try {
      const { data: existing, error: existingError } = await supabase
        .from('teams')
        .select('id')
        .ilike('name', name)
        .neq('id', editingTeamId)
        .limit(1);
      if (existingError) {
        console.warn('Team duplicate check failed:', existingError);
      }
      if (existing && existing.length > 0) {
        toast.error('A team with this name already exists');
        return;
      }

      const { error } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', editingTeamId);
      if (error) {
        toast.error('Error updating team: ' + error.message);
        return;
      }
      toast.success('Team name updated successfully');
      setEditingTeamId(null);
      setEditingTeamName('');
      fetchTeamsList();
    } catch (err) {
      console.error('Unexpected Error (admin updateTeam):', err);
      toast.error('An error occurred');
    } finally {
      setSavingTeamId(null);
    }
  };

  const handleSaveBlog = async () => {
    if (!blogForm.title || !blogForm.description || !blogForm.content || !blogForm.category || !blogForm.author) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Get the session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session expired. Please login again.');
      }

      const method = editingBlogId ? 'PUT' : 'POST';
      const url = editingBlogId ? `/api/blogs/${editingBlogId}` : '/api/blogs';

      const payload = editingBlogId ? blogForm : { ...blogForm, is_published: false };

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('response', res);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save blog');
      }

      toast.success(editingBlogId ? 'Blog updated successfully!' : 'Blog created successfully!');
      setBlogForm({
        title: '',
        description: '',
        content: '',
        category: 'Strategy',
        author: '',
        image_url: '',
        is_published: false,
      });
      setEditingBlogId(null);
      setBlogDialogOpen(false);
      fetchBlogsList();
    } catch (err) {
      console.error('Error saving blog:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save blog');
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;

    try {
      // Get the session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session expired. Please login again.');
      }

      const res = await fetch(`/api/blogs/${blogId}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete blog');
      }

      toast.success('Blog deleted successfully!');
      fetchBlogsList();
    } catch (err) {
      console.error('Error deleting blog:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete blog');
    }
  };

  const handlePublishBlog = async (blogId: string) => {
    try {
      setPublishingBlogId(blogId);
      const token = await getSession();
      if (!token) {
        throw new Error('Session expired. Please login again.');
      }

      const res = await fetch(`/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_published: true }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to publish blog');
      }

      toast.success('Blog published successfully!');
      fetchBlogsList();
    } catch (err) {
      console.error('Error publishing blog:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to publish blog');
    } finally {
      setPublishingBlogId(null);
    }
  };

  const handleEditBlog = (blog: Blog) => {
    setBlogForm({
      title: blog.title,
      description: blog.description,
      content: blog.content,
      category: blog.category,
      author: blog.author,
      image_url: blog.image_url || '',
      is_published: blog.is_published,
    });
    setEditingBlogId(blog.id);
    setBlogDialogOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const selectedMatchDaySeason = seasons.find((s) => s.id === matchDaySeasonId) || null;
  const isMatchDaySeasonClosed = selectedMatchDaySeason ? !selectedMatchDaySeason.is_active : false;
  const visibleMatchDays = matchDaySeasonId
    ? matchDaysList.filter((md) => md.season_id === matchDaySeasonId)
    : matchDaysList;
  const isPlayerPrize = prizeForm.type === 'player';
  const filteredTeams = teamsList
    .filter((t) => t.name.toLowerCase().includes(teamSearchInput.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const pendingBlogs = blogsList.filter((blog) => !blog.is_published);
  const publishedBlogs = blogsList.filter((blog) => blog.is_published);

  if (isLoading) {
    return (
      <ModernLoader
        label="Loading Admin Panel"
        sublabel="Checking admin access..."
        minHeight="100vh"
        sx={{ backgroundColor: '#0a0a0a' }}
      />
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
            <Tab label="Competitions" icon={<EmojiEventsIcon />} iconPosition="start" />
            <Tab label="Match Days" />
            <Tab label="Games" />
            <Tab label="Teams" icon={<GroupsIcon />} iconPosition="start" />
            <Tab label="Scores" />
            <Tab label="Prizes" icon={<EmojiEventsIcon />} iconPosition="start" />
            <Tab label="Blogs" />
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
                onClick={() => {
                  setSetActiveOnCreate(true);
                  setOpenDialog(true);
                }}
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
              <ModernLoader
                label="Loading Seasons"
                sublabel="Fetching season records..."
                minHeight={220}
              />
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
                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Status:</Typography>
                        <Box
                          component="span"
                          sx={{
                            backgroundColor: s.is_active ? 'rgba(22,163,74,0.15)' : 'rgba(107,114,128,0.15)',
                            color: s.is_active ? '#16a34a' : '#9ca3af',
                            border: s.is_active ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(107,114,128,0.3)',
                            borderRadius: '999px',
                            px: 1.5,
                            py: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {s.is_active ? '? ACTIVE' : 'CLOSED'}
                        </Box>
                      </Box>
                      {!s.is_active && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                          <Tooltip title="Delete season">
                            <span>
                              <IconButton
                                onClick={() => handleDeleteSeason({ id: s.id, name: s.name })}
                                disabled={seasonDeleteId === s.id}
                                sx={{
                                  border: '1px solid rgba(239,68,68,0.6)',
                                  color: '#ef4444',
                                  borderRadius: '8px',
                                  '&:hover': { backgroundColor: 'rgba(239,68,68,0.12)' },
                                }}
                                aria-label={`Delete ${s.name}`}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      )}
                      <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                        {s.is_active ? (
                          <Button
                            variant="outlined"
                            onClick={() => handleOpenCloseSeasonDialog({ id: s.id, name: s.name })}
                            sx={{
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              borderRadius: '8px',
                              fontWeight: 700,
                              textTransform: 'none',
                              '&:hover': { backgroundColor: 'rgba(239,68,68,0.1)' },
                            }}
                          >
                            Close Season
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            onClick={() => handleSetActiveSeason(s.id)}
                            disabled={seasonActionId === s.id}
                            sx={{
                              border: '1px solid #16a34a',
                              color: '#16a34a',
                              borderRadius: '8px',
                              fontWeight: 700,
                              textTransform: 'none',
                              '&:hover': { backgroundColor: 'rgba(22,163,74,0.1)' },
                            }}
                          >
                            Set Active
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                Competitions
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                Add and manage competitions linked to games.
              </Typography>
            </Box>

            <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.08)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', mb: 3 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
                  <TextField
                    label="Name"
                    placeholder="Premier League"
                    size="small"
                    value={competitionForm.name}
                    onChange={(e) => setCompetitionForm((p) => ({ ...p, name: e.target.value }))}
                    fullWidth
                    sx={{
                      input: { color: '#fff' },
                      label: { color: '#94a3b8' },
                      '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    }}
                  />
                  <TextField
                    label="Short Name"
                    placeholder="PL"
                    size="small"
                    value={competitionForm.shortName}
                    onChange={(e) => setCompetitionForm((p) => ({ ...p, shortName: e.target.value }))}
                    fullWidth
                    sx={{
                      input: { color: '#fff' },
                      label: { color: '#94a3b8' },
                      '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    }}
                  />
                  <TextField
                    label="ICON (emoji)"
                    placeholder="e.g. ???? ?? ?"
                    size="small"
                    value={competitionForm.icon}
                    onChange={(e) => setCompetitionForm((p) => ({ ...p, icon: e.target.value }))}
                    fullWidth
                    inputProps={{ maxLength: 4 }}
                    sx={{
                      input: { color: '#fff' },
                      label: { color: '#94a3b8' },
                      '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    }}
                  />
                  <TextField
                    label="Country"
                    placeholder="England"
                    size="small"
                    value={competitionForm.country}
                    onChange={(e) => setCompetitionForm((p) => ({ ...p, country: e.target.value }))}
                    fullWidth
                    sx={{
                      input: { color: '#fff' },
                      label: { color: '#94a3b8' },
                      '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleCreateCompetition}
                    disabled={creatingCompetition}
                    sx={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 2.5,
                      py: 1.25,
                      whiteSpace: 'nowrap',
                      '&:hover': { backgroundColor: '#15803d' },
                    }}
                  >
                    {creatingCompetition ? 'Adding...' : '+ Add'}
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {competitionsLoading ? (
              <ModernLoader
                label="Loading Competitions"
                sublabel="Fetching competition list..."
                minHeight={220}
              />
            ) : competitions.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                <Typography sx={{ color: '#64748b' }}>No competitions found.</Typography>
              </Box>
            ) : (
              <TableContainer component={Box} sx={{ backgroundColor: 'rgba(100, 116, 139, 0.05)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                <Table sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0', padding: '14px' } }}>
                  <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Icon</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Short Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Country</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {competitions.map((c) => (
                      <TableRow key={c.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>
                          <span style={{ fontSize: '1.4rem' }}>{c.icon || '?'}</span>
                        </TableCell>
                        <TableCell>{c.short_name || '-'}</TableCell>
                        <TableCell>{c.country || '-'}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Switch
                              checked={c.is_active}
                              onChange={() => handleToggleCompetition({ id: c.id, is_active: c.is_active })}
                              disabled={competitionActionId === c.id}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                              }}
                            />
                            <Typography sx={{ color: c.is_active ? '#16a34a' : '#94a3b8', fontWeight: 700, fontSize: '0.8rem' }}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCompetition(c.id)}
                            disabled={competitionActionId === c.id}
                            sx={{ color: '#ef4444' }}
                          >
                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                    Match Days
                  </Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Create and manage match day schedules with cutoff times.</Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <TextField
                    select
                    label="Season"
                    size="small"
                    value={matchDaySeasonId}
                    onChange={(e) => setMatchDaySeasonId(e.target.value)}
                    SelectProps={{ MenuProps: selectMenuProps }}
                    sx={{
                      minWidth: 200,
                      input: { color: '#fff' },
                      label: { color: '#94a3b8' },
                      '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    }}
                  >
                    {seasons.map((s) => (
                      <MenuItem key={s.id} value={s.id} sx={selectMenuItemSx}>
                        {s.name}{s.is_active ? '' : ' (Closed)'}
                      </MenuItem>
                    ))}
                  </TextField>
                  {isMatchDaySeasonClosed ? (
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        backgroundColor: 'rgba(107,114,128,0.2)',
                        color: '#9ca3af',
                        fontWeight: 700,
                        textTransform: 'none',
                        textAlign: 'center',
                      }}
                    >
                      Season Closed
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        if (!matchDaySeasonId) {
                          toast.error('Please select a season');
                          return;
                        }
                        setMatchDayForm({ name: '', seasonId: matchDaySeasonId, matchDate: '', cutoffAt: '' });
                        setMatchDayDialogOpen(true);
                      }}
                      sx={{
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 2.5,
                        whiteSpace: 'nowrap',
                        '&:hover': { backgroundColor: '#15803d' },
                      }}
                    >
                      New Match Day
                    </Button>
                  )}
                </Stack>
              </Box>
            {matchDaysLoading ? (
              <ModernLoader
                label="Loading Matchdays"
                sublabel="Fetching matchday records..."
                minHeight={220}
              />
            ) : visibleMatchDays.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                <Typography sx={{ color: '#64748b' }}>No match days found. Create one to get started.</Typography>
              </Box>
            ) : (
              <TableContainer component={Box} sx={{ backgroundColor: 'rgba(100, 116, 139, 0.05)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                <Table sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0', padding: '16px' } }}>
                    <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Match Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Season</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Cutoff Time</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleMatchDays.map((md) => (
                        <TableRow key={md.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                          <TableCell>{md.match_date}</TableCell>
                          <TableCell>
                            {editingMatchDayId === md.id ? (
                              <TextField
                                size="small"
                                value={matchDayNameDraft}
                                onChange={(e) => setMatchDayNameDraft(e.target.value)}
                                placeholder="Matchday name"
                                sx={{
                                  minWidth: 180,
                                  input: { color: '#fff' },
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                                  },
                                }}
                              />
                            ) : md.name ? (
                              <Typography sx={{ color: '#e2e8f0', fontWeight: 600 }}>{md.name}</Typography>
                            ) : (
                              <Typography sx={{ color: '#94a3b8', fontStyle: 'italic' }}>No name set</Typography>
                            )}
                          </TableCell>
                          <TableCell>{md.season_name}</TableCell>
                          <TableCell>{md.cutoff_at ? new Date(md.cutoff_at).toLocaleString('en-GB') : '-'}</TableCell>
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
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {editingMatchDayId === md.id ? (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleSaveMatchDayName(md.id)}
                                disabled={savingMatchDayNameId === md.id}
                                sx={{
                                  borderColor: '#16a34a',
                                  color: '#16a34a',
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  px: 2,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {savingMatchDayNameId === md.id ? 'Saving...' : 'Save'}
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleEditMatchDayName(md)}
                                sx={{
                                  borderColor: 'rgba(148, 163, 184, 0.5)',
                                  color: '#9ca3af',
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  px: 2,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Edit
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenDeleteMatchDayDialog(md)}
                              sx={{
                                borderColor: 'rgba(239, 68, 68, 0.6)',
                                color: '#ef4444',
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Remove
                            </Button>
                          </Stack>
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
              <Typography sx={{ color: '#e0e7ff', fontWeight: 800, mb: 2, fontSize: '1.2rem', letterSpacing: '0.5px' }}>Create New Game</Typography>
              <Typography sx={{ color: '#a78bfa', fontSize: '0.85rem', mb: 3 }}>Add a new match to the schedule</Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="COMPETITION"
                  select
                  value={createGameForm.competitionId}
                  onChange={(e) => setCreateGameForm({ ...createGameForm, competitionId: e.target.value })}
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
                  <MenuItem value="" disabled sx={{ color: '#94a3b8', backgroundColor: '#111827' }}>
                    Select competition
                  </MenuItem>
                  {competitions
                    .filter((c) => c.is_active)
                    .map((c) => (
                      <MenuItem key={c.id} value={c.id} sx={{ color: '#e2e8f0', backgroundColor: '#111827', '&:hover': { backgroundColor: '#1e293b' }, '&.Mui-selected': { backgroundColor: '#1e293b !important', color: '#8b5cf6' } }}>
                        {c.name}{c.short_name ? ` (${c.short_name})` : ''}
                      </MenuItem>
                    ))}
                </TextField>
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
                      {md.season_name} - {md.name ? `${md.name} · ${md.match_date}` : md.match_date}
                    </MenuItem>
                  ))}
                </TextField>
                <Autocomplete
                  options={teamsList}
                  value={teamsList.find((t) => t.id === createGameForm.homeTeamId) || null}
                  onChange={(_event, newValue) => {
                    const nextHomeId = newValue?.id ?? '';
                    setCreateGameForm((prev) => ({
                      ...prev,
                      homeTeamId: nextHomeId,
                      awayTeamId: prev.awayTeamId === nextHomeId ? '' : prev.awayTeamId,
                    }));
                  }}
                  getOptionLabel={(option) => option.name || ''}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText="No teams found"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Home Team"
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
                    />
                  )}
                />
                <Autocomplete
                  options={teamsList.filter((t) => t.id !== createGameForm.homeTeamId)}
                  value={teamsList.find((t) => t.id === createGameForm.awayTeamId) || null}
                  onChange={(_event, newValue) => {
                    const nextAwayId = newValue?.id ?? '';
                    setCreateGameForm((prev) => ({ ...prev, awayTeamId: nextAwayId }));
                  }}
                  getOptionLabel={(option) => option.name || ''}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText="No teams found"
                  disabled={!createGameForm.homeTeamId}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Away Team"
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
                    />
                  )}
                />
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
                    if (!createGameForm.competitionId || !createGameForm.matchDayId || !createGameForm.homeTeamId || !createGameForm.awayTeamId || !createGameForm.kickoffAt) {
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
                        competition_id: createGameForm.competitionId,
                        home_team: createGameForm.homeTeamId,
                        away_team: createGameForm.awayTeamId,
                        kickoff_at: kickoffUTC,
                      });
                      if (error) {
                        toast.error('Error creating game: ' + error.message);
                      } else {
                        toast.success('Game created successfully');
                        setCreateGameForm({ matchDayId: '', competitionId: '', homeTeamId: '', awayTeamId: '', kickoffAt: '' });
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
                  {creatingGame ? 'Creating...' : 'Create Game'}
                </Button>
              </Stack>
            </Box>
            {gamesLoading ? (
              <ModernLoader
                label="Loading Games"
                sublabel="Fetching fixture data..."
                minHeight={220}
              />
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
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Competition</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Kickoff</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gamesList.map((g) => (
                      <TableRow key={g.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                        <TableCell>{g.home_team_name}</TableCell>
                        <TableCell>{g.away_team_name}</TableCell>
                        <TableCell>
                          {g.competition_short_name ? (
                            <Box
                              component="span"
                              sx={{
                                backgroundColor: 'rgba(59,130,246,0.15)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59,130,246,0.3)',
                                borderRadius: '999px',
                                px: 1,
                                py: '2px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              {g.competition_short_name}
                            </Box>
                          ) : (
                            <Typography sx={{ color: '#64748b' }}>-</Typography>
                          )}
                        </TableCell>
                        <TableCell>{g.kickoff_at ? new Date(g.kickoff_at).toLocaleString('en-GB') : '-'}</TableCell>
                        <TableCell align="right">
                          {g.home_goals != null && g.away_goals != null ? (
                            <Box sx={{ fontWeight: 700, color: '#16a34a' }}>{g.home_goals} - {g.away_goals}</Box>
                          ) : (
                            <Typography sx={{ color: '#64748b' }}>-</Typography>
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

        <TabPanel value={tabValue} index={4}>
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                Teams
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                Add teams individually or in bulk, then manage your full list.
              </Typography>
            </Box>

            <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.08)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', mb: 3 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
                  <TextField
                    label="Team Name"
                    placeholder="e.g. Arsenal"
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    fullWidth
                    sx={{
                      input: { color: '#fff' },
                      label: { color: '#94a3b8' },
                      '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddTeam}
                    sx={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 3,
                      '&:hover': { backgroundColor: '#15803d' },
                    }}
                  >
                    + Add Team
                  </Button>
                </Stack>

                <TextField
                  label="BULK ADD TEAMS"
                  placeholder={`One team per line:\nArsenal\nChelsea\nLiverpool`}
                  value={bulkTeamsInput}
                  onChange={(e) => setBulkTeamsInput(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  sx={{
                    input: { color: '#fff' },
                    '& .MuiInputBase-input': { color: '#fff' },
                    label: { color: '#94a3b8' },
                    '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleBulkAddTeams}
                  sx={{
                    borderColor: 'rgba(234, 179, 8, 0.5)',
                    color: '#eab308',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&:hover': { borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)' },
                  }}
                >
                  Add All Teams
                </Button>
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Search Teams"
                value={teamSearchInput}
                onChange={(e) => setTeamSearchInput(e.target.value)}
                sx={{
                  minWidth: 220,
                  input: { color: '#fff' },
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                }}
              />
              <Typography sx={{ color: '#94a3b8', fontWeight: 600 }}>
                {filteredTeams.length} teams
              </Typography>
            </Box>

            {teamsLoading ? (
              <ModernLoader
                label="Loading Teams"
                sublabel="Fetching team list..."
                minHeight={220}
              />
            ) : filteredTeams.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                <Typography sx={{ color: '#64748b' }}>No teams found.</Typography>
              </Box>
            ) : (
              <TableContainer component={Box} sx={{ backgroundColor: 'rgba(100, 116, 139, 0.05)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                <Table sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0', padding: '14px' } }}>
                  <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTeams.map((team) => (
                      <TableRow key={team.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                        <TableCell>
                          {editingTeamId === team.id ? (
                            <TextField
                              size="small"
                              value={editingTeamName}
                              onChange={(e) => setEditingTeamName(e.target.value)}
                              sx={{
                                minWidth: 220,
                                input: { color: '#fff' },
                                '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                              }}
                            />
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ color: '#e2e8f0', fontWeight: 600 }}>{team.name}</Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleStartEditTeam(team)}
                                sx={{ color: '#38bdf8' }}
                                aria-label={`Edit ${team.name}`}
                              >
                                <EditIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {editingTeamId === team.id ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={handleSaveTeamName}
                                disabled={savingTeamId === team.id}
                                sx={{ backgroundColor: '#16a34a', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: '#15803d' } }}
                              >
                                {savingTeamId === team.id ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={handleCancelEditTeam}
                                sx={{ borderColor: 'rgba(148, 163, 184, 0.6)', color: '#cbd5e1', textTransform: 'none', fontWeight: 600 }}
                              >
                                Cancel
                              </Button>
                            </Stack>
                          ) : (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteTeam(team.id)}
                              sx={{ color: '#ef4444' }}
                            >
                              <DeleteIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
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

        <TabPanel value={tabValue} index={5}>
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                Enter Final Scores
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                Set actual scores for all game types, then calculate player points.
              </Typography>
            </Box>

            {/* Scores Table */}
            {scoresLoading ? (
              <ModernLoader
                label="Loading Scores"
                sublabel="Fetching score rows..."
                minHeight={220}
              />
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
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Matchday</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Season</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#16a34a' }}>FT Goals</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#3b82f6' }}>HT Goals</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#f97316' }}>Total Corners</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#a855f7' }}>HT Corners</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#cbd5e1' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matchDaysForScores.map((md) => (
                      <TableRow key={md.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.15)' } }}>
                        <TableCell>{md.match_date}</TableCell>
                        <TableCell>{md.name || '-'}</TableCell>
                        <TableCell>{md.season_name}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={scoreInputs[md.id]?.ftGoals ?? (md.actual_total_goals != null ? String(md.actual_total_goals) : '')}
                            onChange={(e) => setScoreInputs((prev) => ({ ...prev, [md.id]: { ...(prev[md.id] || { ftGoals: '', htGoals: '', totalCorners: '', htCorners: '' }), ftGoals: e.target.value } }))}
                            inputProps={{ min: 0, style: { textAlign: 'center' } }}
                            sx={{
                              width: 80,
                              '& .MuiInputBase-root': { backgroundColor: '#111827', borderRadius: '6px' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
                              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#16a34a' },
                              input: { color: '#fff', fontWeight: 700 },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={scoreInputs[md.id]?.htGoals ?? (md.ht_goals != null ? String(md.ht_goals) : '')}
                            onChange={(e) => setScoreInputs((prev) => ({ ...prev, [md.id]: { ...(prev[md.id] || { ftGoals: '', htGoals: '', totalCorners: '', htCorners: '' }), htGoals: e.target.value } }))}
                            inputProps={{ min: 0, style: { textAlign: 'center' } }}
                            sx={{
                              width: 80,
                              '& .MuiInputBase-root': { backgroundColor: '#111827', borderRadius: '6px' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
                              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                              input: { color: '#fff', fontWeight: 700 },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={scoreInputs[md.id]?.totalCorners ?? (md.total_corners != null ? String(md.total_corners) : '')}
                            onChange={(e) => setScoreInputs((prev) => ({ ...prev, [md.id]: { ...(prev[md.id] || { ftGoals: '', htGoals: '', totalCorners: '', htCorners: '' }), totalCorners: e.target.value } }))}
                            inputProps={{ min: 0, style: { textAlign: 'center' } }}
                            sx={{
                              width: 80,
                              '& .MuiInputBase-root': { backgroundColor: '#111827', borderRadius: '6px' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
                              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f97316' },
                              input: { color: '#fff', fontWeight: 700 },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={scoreInputs[md.id]?.htCorners ?? (md.ht_corners != null ? String(md.ht_corners) : '')}
                            onChange={(e) => setScoreInputs((prev) => ({ ...prev, [md.id]: { ...(prev[md.id] || { ftGoals: '', htGoals: '', totalCorners: '', htCorners: '' }), htCorners: e.target.value } }))}
                            inputProps={{ min: 0, style: { textAlign: 'center' } }}
                            sx={{
                              width: 80,
                              '& .MuiInputBase-root': { backgroundColor: '#111827', borderRadius: '6px' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
                              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7' },
                              input: { color: '#fff', fontWeight: 700 },
                            }}
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
                              {savingId === md.id ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="small"
                              startIcon={computingId === md.id ? <ModernLoader inline size={16} label="" sublabel="" /> : <SportsScoreIcon />}
                              onClick={() => handleComputePoints(md.id)}
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
                startIcon={isCalculatingPoints ? <ModernLoader inline size={18} label="" sublabel="" /> : <CalculateIcon />}
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
                {isCalculatingPoints ? 'Calculating...' : 'Calculate Points for All Match Days'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                Prize Competitions
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                Create, manage, and award prizes for weekly, monthly, seasonal, and player competitions.
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
                      setPlayerCandidates([]);
                      const nextType = e.target.value as 'weekly' | 'monthly' | 'seasonal' | 'player';
                      setPrizeForm((p) => ({
                        ...p,
                        type: nextType,
                        period: nextType === 'player' ? '' : p.period,
                        points_threshold: nextType === 'player' ? p.points_threshold : '',
                        prize_matchday_id: nextType === 'player' ? p.prize_matchday_id : '',
                        winner_user_id: '',
                        suggested_name: '',
                      }));
                    }}
                    SelectProps={{ native: true }}
                    sx={{ minWidth: 140, input: { color: '#fff' }, label: { color: '#06d6d0', fontWeight: 600 }, '& .MuiNativeSelect-select': { color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.7)' }, '& .MuiNativeSelect-select:focus': { backgroundColor: 'rgba(6, 182, 212, 0.2)' } }}
                  >
                    <option value="weekly" style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>Weekly</option>
                    <option value="monthly" style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>Monthly</option>
                    <option value="seasonal" style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>Seasonal</option>
                    <option value="player" style={{ backgroundColor: '#111827', color: '#e2e8f0' }}>Player</option>
                  </TextField>
                  {isPlayerPrize ? (
                    <TextField
                      size="small"
                      label="Points Threshold"
                      value={prizeForm.points_threshold}
                      onChange={(e) => {
                        setSuggestNoPredictionsMessage(null);
                        setPlayerCandidates([]);
                        setPrizeForm((p) => ({ ...p, points_threshold: e.target.value, winner_user_id: '', suggested_name: '' }));
                      }}
                      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                      sx={{ minWidth: 200, input: { color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.7)' }, label: { color: '#06d6d0', fontWeight: 600 }, '& .MuiOutlinedInput-root': { borderColor: 'rgba(6, 182, 212, 0.3)' }, '& .MuiOutlinedInput-root:hover': { borderColor: 'rgba(6, 182, 212, 0.5)' } }}
                    />
                  ) : (
                    <TextField
                      size="small"
                      label={prizeForm.type === 'seasonal' ? 'Period (Season UUID)' : prizeForm.type === 'monthly' ? 'Period (YYYY-MM)' : 'Period (YYYY-Wnn)'}
                      value={prizeForm.period}
                      onChange={(e) => {
                        setSuggestNoPredictionsMessage(null);
                        setPlayerCandidates([]);
                        setPrizeForm((p) => ({ ...p, period: e.target.value, winner_user_id: '', suggested_name: '' }));
                      }}
                      sx={{ minWidth: 200, input: { color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.7)' }, label: { color: '#06d6d0', fontWeight: 600 }, '& .MuiOutlinedInput-root': { borderColor: 'rgba(6, 182, 212, 0.3)' }, '& .MuiOutlinedInput-root:hover': { borderColor: 'rgba(6, 182, 212, 0.5)' } }}
                    />
                  )}
                  <Button
                    variant="outlined"
                    disabled={suggestingWinner || (isPlayerPrize ? !prizeForm.points_threshold.trim() : !prizeForm.period.trim())}
                    onClick={async () => {
                      setSuggestingWinner(true);
                      setSuggestNoPredictionsMessage(null);
                      try {
                        const token = await getSession();
                        if (!token) {
                          toast.error('Please sign in again');
                          return;
                        }
                        if (isPlayerPrize) {
                          const res = await fetch(
                            `/api/admin/suggested-winner?type=player&threshold=${encodeURIComponent(prizeForm.points_threshold.trim())}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          const data = await res.json().catch(() => ({}));
                          if (res.ok && Array.isArray(data.qualifiers)) {
                            setPrizeForm((p) => ({ ...p, winner_user_id: '', suggested_name: '' }));
                            setPlayerCandidates(data.qualifiers);
                            if (data.qualifiers.length === 0) {
                              const message = data.message || 'No paid players have reached this threshold yet.';
                              setSuggestNoPredictionsMessage(message);
                              toast.error(message);
                            } else {
                              toast.success(`Found ${data.qualifiers.length} qualifying players`);
                            }
                          } else {
                            const message = data.message || data.error || 'Could not load qualifying players';
                            setPlayerCandidates([]);
                            setSuggestNoPredictionsMessage(message);
                            toast.error(message);
                          }
                        } else {
                          const res = await fetch(
                            `/api/admin/suggested-winner?type=${encodeURIComponent(prizeForm.type)}&period=${encodeURIComponent(prizeForm.period.trim())}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          const data = await res.json().catch(() => ({}));
                          if (res.ok && data.suggested) {
                            setSuggestNoPredictionsMessage(null);
                            setPlayerCandidates([]);
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
                        }
                      } finally {
                        setSuggestingWinner(false);
                      }
                    }}
                    sx={{ borderColor: '#06b6d4', color: '#06b6d4', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: 'rgba(6, 182, 212, 0.15)', borderColor: '#06b6d4' } }}
                  >
                    {suggestingWinner ? 'Loading..' : 'Suggest Winner'}
                  </Button>
                </Stack>
                {isPlayerPrize && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                    <TextField
                      size="small"
                      select
                      label="Match Day (optional)"
                      value={prizeForm.prize_matchday_id}
                      onChange={(e) => {
                        setPrizeForm((p) => ({ ...p, prize_matchday_id: e.target.value }));
                      }}
                      sx={{
                        minWidth: 260,
                        input: { color: '#fff' },
                        label: { color: '#06d6d0', fontWeight: 600 },
                        '& .MuiOutlinedInput-root': { borderColor: 'rgba(6, 182, 212, 0.3)' },
                        '& .MuiOutlinedInput-root:hover': { borderColor: 'rgba(6, 182, 212, 0.5)' },
                      }}
                      SelectProps={{ MenuProps: selectMenuProps }}
                    >
                      <MenuItem value="" sx={selectMenuItemSx}>No specific match day</MenuItem>
                      {matchDaysList.map((md) => {
                        const label = md.name?.trim()
                          ? `${md.name} · ${new Date(md.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : new Date(md.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <MenuItem key={md.id} value={md.id} sx={selectMenuItemSx}>
                            {label}{md.season_name ? ` (${md.season_name})` : ''}
                          </MenuItem>
                        );
                      })}
                    </TextField>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.82rem', mb: { xs: 0, sm: 0.6 } }}>
                      Optional: tie this player prize to a specific match day.
                    </Typography>
                  </Stack>
                )}
                {prizeForm.suggested_name && (
                  <Box sx={{ p: 2.5, backgroundColor: 'rgba(6, 182, 212, 0.15)', borderRadius: 2, border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                    <Typography sx={{ color: '#06b6d4', fontWeight: 700, fontSize: '0.95rem' }}>
                      Suggested: {prizeForm.suggested_name}
                    </Typography>
                  </Box>
                )}
                {suggestNoPredictionsMessage && (
                  <Typography sx={{ color: '#f97316', fontSize: '0.9rem', fontWeight: 600 }}>
                    {suggestNoPredictionsMessage}
                  </Typography>
                )}
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Step 1: Create Prize to make it live. Step 2: Suggest Winner and Confirm Winner once players qualify.
                </Typography>
                {isPlayerPrize && playerCandidates.length > 0 && (
                  <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                    <Typography sx={{ color: '#e2e8f0', fontWeight: 700, mb: 1 }}>
                      Qualifying Players
                    </Typography>
                    <TableContainer sx={{ maxHeight: 220, overflow: 'auto' }}>
                      <Table size="small" sx={{ '& td, & th': { borderColor: 'rgba(100, 116, 139, 0.2)', color: '#e2e8f0' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Player</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Total Points</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Exact Hits</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Reached Threshold</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {playerCandidates.map((candidate) => {
                            const reachedLabel = candidate.reached_at
                              ? new Date(candidate.reached_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '-';
                            const selected = prizeForm.winner_user_id === candidate.user_id;
                            return (
                              <TableRow key={candidate.user_id}>
                                <TableCell>{candidate.display_name}</TableCell>
                                <TableCell>{candidate.total_points}</TableCell>
                                <TableCell>{candidate.exact_hits}</TableCell>
                                <TableCell>{reachedLabel}</TableCell>
                                <TableCell align="right">
                                  <Button
                                    size="small"
                                    variant={selected ? 'contained' : 'outlined'}
                                    onClick={() => {
                                      setPrizeForm((p) => ({
                                        ...p,
                                        winner_user_id: candidate.user_id,
                                        suggested_name: `${candidate.display_name} (${candidate.total_points} pts)`,
                                      }));
                                    }}
                                    sx={{
                                      textTransform: 'none',
                                      fontWeight: 700,
                                      ...(selected
                                        ? { backgroundColor: '#16a34a', color: '#fff', '&:hover': { backgroundColor: '#15803d' } }
                                        : { borderColor: 'rgba(22, 163, 74, 0.6)', color: '#22c55e' }),
                                    }}
                                  >
                                    {selected ? 'Selected' : 'Select'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
                <TextField
                  size="small"
                  label="Prize Description"
                  placeholder="e.g. Amazon GBP20 gift card"
                  value={prizeForm.prize_description}
                  onChange={(e) => setPrizeForm((p) => ({ ...p, prize_description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ input: { color: '#fff', backgroundColor: 'rgba(15, 23, 42, 0.7)' }, label: { color: '#06d6d0', fontWeight: 600 }, '& .MuiOutlinedInput-root textarea': { color: '#fff' }, '& .MuiOutlinedInput-root': { borderColor: 'rgba(6, 182, 212, 0.3)' }, '& .MuiOutlinedInput-root:hover': { borderColor: 'rgba(6, 182, 212, 0.5)' } }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    disabled={
                      creatingPrize
                      || (isPlayerPrize ? !prizeForm.points_threshold.trim() : !prizeForm.period.trim())
                    }
                    onClick={async () => {
                      setCreatingPrize(true);
                      try {
                        const token = await getSession();
                        if (!token) {
                          toast.error('Please sign in again');
                          return;
                        }
                        if (isPlayerPrize) {
                          const threshold = parseInt(prizeForm.points_threshold.trim(), 10);
                          if (!Number.isFinite(threshold) || threshold <= 0) {
                            toast.error('Please enter a valid points threshold');
                            return;
                          }
                        } else if (!prizeForm.period.trim()) {
                          toast.error('Please enter a period');
                          return;
                        }
                        const res = await fetch('/api/admin/prizes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            type: prizeForm.type,
                            period: isPlayerPrize ? '' : prizeForm.period.trim(),
                            points_threshold: isPlayerPrize ? prizeForm.points_threshold.trim() : undefined,
                            prize_matchday_id: isPlayerPrize ? (prizeForm.prize_matchday_id || null) : null,
                            winner_user_id: null,
                            prize_description: prizeForm.prize_description || null,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok) {
                          toast.success('Prize created successfully');
                          setPrizeForm((p) => ({
                            ...p,
                            winner_user_id: '',
                            suggested_name: '',
                            prize_matchday_id: '',
                          }));
                          setPlayerCandidates([]);
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
                    {creatingPrize ? 'Creating...' : 'Create Prize'}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={
                      confirmingWinner
                      || !prizeForm.winner_user_id
                      || (isPlayerPrize ? !prizeForm.points_threshold.trim() : !prizeForm.period.trim())
                    }
                    onClick={async () => {
                      setConfirmingWinner(true);
                      try {
                        const token = await getSession();
                        if (!token) {
                          toast.error('Please sign in again');
                          return;
                        }
                        if (isPlayerPrize) {
                          const threshold = parseInt(prizeForm.points_threshold.trim(), 10);
                          if (!Number.isFinite(threshold) || threshold <= 0) {
                            toast.error('Please enter a valid points threshold');
                            return;
                          }
                        } else if (!prizeForm.period.trim()) {
                          toast.error('Please enter a period');
                          return;
                        }
                        if (!prizeForm.winner_user_id) {
                          toast.error('Please select a winner');
                          return;
                        }
                        const periodKey = isPlayerPrize ? prizeForm.points_threshold.trim() : prizeForm.period.trim();
                        const pendingCandidates = prizesList.filter((p) =>
                          p.type === prizeForm.type
                          && (p.period ?? '') === periodKey
                          && !p.winner_user_id
                        );
                        if (pendingCandidates.length === 0) {
                          toast.error('Create the prize first (no pending prize found for this period).');
                          return;
                        }
                        const pendingPrize = pendingCandidates
                          .slice()
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                        const res = await fetch(`/api/admin/prizes/${pendingPrize.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            winner_user_id: prizeForm.winner_user_id,
                            prize_description: prizeForm.prize_description || null,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok) {
                          toast.success('Winner confirmed and prize saved');
                          setPrizeForm((p) => ({
                            ...p,
                            winner_user_id: '',
                            suggested_name: '',
                          }));
                          setPlayerCandidates([]);
                          fetchPrizesList();
                        } else {
                          toast.error(data.error || 'Failed to confirm winner');
                        }
                      } finally {
                        setConfirmingWinner(false);
                      }
                    }}
                    sx={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '1rem',
                      py: 1.5,
                      borderRadius: 2,
                      boxShadow: '0 6px 20px rgba(22, 163, 74, 0.35)',
                      '&:hover': { backgroundColor: '#15803d' },
                      '&:disabled': { opacity: 0.6 }
                    }}
                  >
                    {confirmingWinner ? 'Confirming...' : 'Confirm Winner'}
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {/* Prizes List */}
            <Box>
              <Typography sx={{ color: '#e2e8f0', fontWeight: 700, mb: 2 }}>All Prize Competitions</Typography>
              {prizesLoading ? (
                <ModernLoader
                  label="Loading Prizes"
                  sublabel="Fetching prize competitions..."
                  minHeight={220}
                />
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
                        <TableCell sx={{ fontWeight: 700, color: '#cbd5e1' }}>Matchday</TableCell>
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
                          <TableCell sx={{ fontWeight: 500 }}>
                            {p.type === 'player' ? (p.period ? `${p.period} pts threshold` : '—') : p.period}
                          </TableCell>
                          <TableCell>{(p as Prize & { winner_display_name?: string | null }).winner_display_name || (p.winner_user_id ? (winnerNames[p.winner_user_id] || (p.winner_user_id.slice(0, 8) + '...')) : '—')}</TableCell>
                          <TableCell>
                            {p.type === 'player'
                              ? ((p as Prize & { winner_match_day_label?: string | null; prize_match_day_label?: string | null }).winner_match_day_label
                                || (p as Prize & { prize_match_day_label?: string | null }).prize_match_day_label
                                || '—')
                              : '—'}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, fontSize: '0.9rem' }}>{p.prize_description || ''}</TableCell>
                          <TableCell>
                            {p.status === 'awarded' ? (
                              <Chip size="small" icon={<CheckCircleIcon />} label="Awarded" sx={{ backgroundColor: 'rgba(22, 163, 74, 0.25)', color: '#16a34a', fontWeight: 600 }} />
                            ) : !p.winner_user_id ? (
                              <Chip size="small" label="Active" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }} />
                            ) : (
                              <Chip size="small" label="Pending" sx={{ backgroundColor: 'rgba(249, 115, 22, 0.25)', color: '#f97316', fontWeight: 600 }} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                              {p.status !== 'awarded' && p.winner_user_id ? (
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
                                  {awardingId === p.id ? '...' : 'Award'}
                                </Button>
                              ) : !p.winner_user_id ? (
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                                  Awaiting winner
                                </Typography>
                              ) : null}
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

        <TabPanel value={tabValue} index={7}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
              <Box>
                <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                  Manage Blogs
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Create, edit, and publish blog posts.</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingBlogId(null);
                  setBlogForm({
                    title: '',
                    description: '',
                    content: '',
                    category: 'Strategy',
                    author: '',
                    image_url: '',
                    is_published: false,
                  });
                  setBlogDialogOpen(true);
                }}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#15803d' },
                }}
              >
                New Blog
              </Button>
            </Box>

            {blogsLoading ? (
              <ModernLoader
                label="Loading Blogs"
                sublabel="Fetching admin blog list..."
                minHeight={220}
              />
            ) : blogsList.length === 0 ? (
              <Box sx={{ p: 3, backgroundColor: 'rgba(100, 116, 139, 0.1)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.2)', textAlign: 'center' }}>
                <Typography sx={{ color: '#64748b' }}>No blogs yet. Create one to get started.</Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                <Box>
                  <Typography sx={{ color: '#e2e8f0', fontWeight: 700, mb: 1.5 }}>Pending Blogs</Typography>
                  {pendingBlogs.length === 0 ? (
                    <Box sx={{ p: 2.5, backgroundColor: 'rgba(100, 116, 139, 0.08)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.18)', textAlign: 'center' }}>
                      <Typography sx={{ color: '#64748b' }}>No pending blogs right now.</Typography>
                    </Box>
                  ) : (
                    <TableContainer sx={{ border: '1px solid rgba(100, 116, 139, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
                      <Table>
                        <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                          <TableRow>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Title</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Category</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Author</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Status</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pendingBlogs.map((blog) => (
                            <TableRow key={blog.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.05)' } }}>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {blog.title}
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                <Chip label={blog.category} size="small" sx={{ backgroundColor: 'rgba(100, 116, 139, 0.25)', color: '#e2e8f0' }} />
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                {blog.author}
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                <Chip
                                  label="Pending"
                                  size="small"
                                  sx={{ backgroundColor: 'rgba(100, 116, 139, 0.25)', color: '#94a3b8' }}
                                />
                              </TableCell>
                              <TableCell sx={{ borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<CheckCircleIcon sx={{ fontSize: '1rem' }} />}
                                    onClick={() => handlePublishBlog(blog.id)}
                                    disabled={publishingBlogId === blog.id}
                                    sx={{
                                      backgroundColor: '#16a34a',
                                      color: '#fff',
                                      fontWeight: 700,
                                      textTransform: 'none',
                                      '&:hover': { backgroundColor: '#15803d' },
                                    }}
                                  >
                                    {publishingBlogId === blog.id ? 'Publishing...' : 'Publish'}
                                  </Button>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditBlog(blog)}
                                    sx={{ color: '#3b82f6' }}
                                  >
                                    <EditIcon sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteBlog(blog.id)}
                                    sx={{ color: '#ef4444' }}
                                  >
                                    <DeleteIcon sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                <Box>
                  <Typography sx={{ color: '#e2e8f0', fontWeight: 700, mb: 1.5 }}>Published Blogs</Typography>
                  {publishedBlogs.length === 0 ? (
                    <Box sx={{ p: 2.5, backgroundColor: 'rgba(100, 116, 139, 0.08)', borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.18)', textAlign: 'center' }}>
                      <Typography sx={{ color: '#64748b' }}>No published blogs yet.</Typography>
                    </Box>
                  ) : (
                    <TableContainer sx={{ border: '1px solid rgba(100, 116, 139, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
                      <Table>
                        <TableHead sx={{ backgroundColor: 'rgba(100, 116, 139, 0.1)' }}>
                          <TableRow>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Title</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Category</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Author</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Views</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Status</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700, borderColor: 'rgba(100, 116, 139, 0.2)' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {publishedBlogs.map((blog) => (
                            <TableRow key={blog.id} sx={{ '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.05)' } }}>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {blog.title}
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                <Chip label={blog.category} size="small" sx={{ backgroundColor: 'rgba(100, 116, 139, 0.25)', color: '#e2e8f0' }} />
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                {blog.author}
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                {blog.views}
                              </TableCell>
                              <TableCell sx={{ color: '#e2e8f0', borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                <Chip
                                  label="Published"
                                  size="small"
                                  sx={{ backgroundColor: 'rgba(22, 163, 74, 0.25)', color: '#16a34a' }}
                                />
                              </TableCell>
                              <TableCell sx={{ borderColor: 'rgba(100, 116, 139, 0.2)' }}>
                                <Stack direction="row" spacing={1}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditBlog(blog)}
                                    sx={{ color: '#3b82f6' }}
                                  >
                                    <EditIcon sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteBlog(blog.id)}
                                    sx={{ color: '#ef4444' }}
                                  >
                                    <DeleteIcon sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Stack>
            )}
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

        <Dialog
          open={closeSeasonDialogOpen}
          onClose={handleCloseSeasonDialog}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { backgroundColor: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)' } }}
        >
          <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
            Close Season
          </DialogTitle>
          <DialogContent sx={{ color: '#9ca3af' }}>
            <Typography sx={{ color: '#9ca3af', mb: 2 }}>
              Are you sure you want to close this season? This will lock all matchdays and predictions. This action cannot be undone.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1 }}>
              <Button
                variant="outlined"
                onClick={handleCloseSeasonDialog}
                sx={{
                  borderColor: 'rgba(148, 163, 184, 0.5)',
                  color: '#9ca3af',
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmCloseSeason}
                disabled={closingSeason}
                sx={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: '#dc2626' },
                }}
              >
                Yes, Close Season
              </Button>
            </Box>
          </DialogContent>
        </Dialog>

        <Dialog open={matchDayDialogOpen} onClose={() => setMatchDayDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#1e293b', color: '#fff', fontWeight: 700 }}>Create New Match Day</DialogTitle>
          <DialogContent sx={{ backgroundColor: '#0f172a', pt: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="MATCHDAY NAME"
                placeholder="e.g. The Weekender, Midweek Madness"
                value={matchDayForm.name}
                onChange={(e) => setMatchDayForm({ ...matchDayForm, name: e.target.value })}
                fullWidth
                sx={{
                  input: { color: '#fff' },
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                }}
              />
              <TextField
                label="Season"
                select
                value={matchDayForm.seasonId}
                onChange={(e) => setMatchDayForm({ ...matchDayForm, seasonId: e.target.value })}
                SelectProps={{ MenuProps: selectMenuProps }}
                fullWidth
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              >
                {seasons.map((s) => (
                  <MenuItem key={s.id} value={s.id} disabled={!s.is_active} sx={selectMenuItemSx}>
                    {s.name} ({s.start_date} to {s.end_date}){s.is_active ? '' : ' (Closed)'}
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

        <Dialog
          open={deleteMatchDayDialogOpen}
          onClose={handleCloseDeleteMatchDayDialog}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ backgroundColor: '#1e293b', color: '#fff', fontWeight: 800 }}>
            Delete Match Day?
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: '#0f172a', pt: 3 }}>
            <Typography sx={{ color: '#cbd5f5', fontSize: '0.95rem', mb: 2 }}>
              This will permanently remove the match day and any related games. This action cannot be undone.
            </Typography>
            <Box
              sx={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                p: 2,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                {matchDayToDelete?.name || 'Match Day'}
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', mt: 0.5 }}>
                {matchDayToDelete?.match_date ? new Date(matchDayToDelete.match_date).toLocaleDateString('en-GB') : 'Date not set'}
              </Typography>
              {matchDayToDelete?.season_name && (
                <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mt: 0.5 }}>
                  Season: {matchDayToDelete.season_name}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ backgroundColor: '#0f172a', px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseDeleteMatchDayDialog}
              disabled={deletingMatchDay}
              sx={{ color: '#94a3b8', textTransform: 'none', fontWeight: 700 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteMatchDay}
              disabled={deletingMatchDay}
              variant="contained"
              sx={{
                backgroundColor: '#ef4444',
                color: '#fff',
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#dc2626' },
              }}
            >
              {deletingMatchDay ? 'Deleting...' : 'Delete Match Day'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={blogDialogOpen} onClose={() => setBlogDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ backgroundColor: '#1e293b', color: '#fff', fontWeight: 700 }}>
            {editingBlogId ? 'Edit Blog' : 'Create New Blog'}
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: '#0f172a', pt: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Title"
                value={blogForm.title}
                onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                fullWidth
                variant="outlined"
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <TextField
                label="Description (Short summary)"
                value={blogForm.description}
                onChange={(e) => setBlogForm({ ...blogForm, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                sx={{ 
                  input: { color: '#fff' }, 
                  '& .MuiInputBase-input': { color: '#fff' },
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <TextField
                label="Content (Markdown supported)"
                value={blogForm.content}
                onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                fullWidth
                multiline
                rows={8}
                variant="outlined"
                sx={{ 
                  input: { color: '#fff' }, 
                  '& .MuiInputBase-input': { color: '#fff' },
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <TextField
                label="Category"
                select
                value={blogForm.category}
                onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value as BlogCategory })}
                fullWidth
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              >
                <MenuItem value="Strategy" sx={{ color: '#0f172a' }}>Strategy</MenuItem>
                <MenuItem value="Preview" sx={{ color: '#0f172a' }}>Preview</MenuItem>
                <MenuItem value="Analysis" sx={{ color: '#0f172a' }}>Analysis</MenuItem>
              </TextField>
              <TextField
                label="Author"
                value={blogForm.author}
                onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                fullWidth
                variant="outlined"
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <TextField
                label="Image URL (Optional)"
                value={blogForm.image_url}
                onChange={(e) => setBlogForm({ ...blogForm, image_url: e.target.value })}
                fullWidth
                variant="outlined"
                sx={{ 
                  input: { color: '#fff' }, 
                  label: { color: '#94a3b8' },
                  '& .MuiOutlinedInput-root': { borderColor: 'rgba(148, 163, 184, 0.3)' }
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={blogForm.is_published ? 'Published' : 'Pending'}
                  sx={{
                    backgroundColor: blogForm.is_published ? 'rgba(22, 163, 74, 0.25)' : 'rgba(100, 116, 139, 0.25)',
                    color: blogForm.is_published ? '#16a34a' : '#94a3b8',
                    fontWeight: 700,
                  }}
                />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  {blogForm.is_published
                    ? 'Published blogs are live on the public blog page.'
                    : 'Pending blogs can be published from the Pending table.'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                <Button 
                  onClick={() => setBlogDialogOpen(false)} 
                  sx={{ color: '#94a3b8' }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBlog}
                  variant="contained"
                  sx={{ backgroundColor: '#16a34a', color: '#fff', fontWeight: 700, '&:hover': { backgroundColor: '#15803d' } }}
                >
                  {editingBlogId ? 'Update Blog' : 'Create Blog'}
                </Button>
              </Box>
            </Stack>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}













