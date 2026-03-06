"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CloseIcon from '@mui/icons-material/Close';
import ModernLoader from '@/components/ui/ModernLoader';

interface PrizeWithProfile {
  id: string;
  type: 'weekly' | 'monthly' | 'seasonal' | string;
  period: string;
  winner_user_id: string;
  prize_description: string | null;
  status: 'pending' | 'awarded' | string;
  created_at: string;
  profiles?: { display_name: string | null } | null;
  winner_points?: number | null;
  prize_value?: number | null;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  predictions_count: number;
  rank: number;
}

interface ActivePrizeContext {
  participants: number;
  leader: LeaderboardEntry | null;
  currentUser: LeaderboardEntry | null;
  gapToLeader: number | null;
  progressToLeaderPct: number | null;
  periodLabel: string;
  countdownTarget: string | null;
}

interface PrizeSummary {
  totalPrizes: number;
  totalWinners: number;
  totalValue: number;
  averageValue: number;
  currentMonthPrizes: number;
  previousMonthPrizes: number;
  currentMonthWinners: number;
  previousMonthWinners: number;
  currentMonthAverageValue: number;
  previousMonthAverageValue: number;
}

const shellSx = { backgroundColor: '#161a23', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' };

function formatCountdown(target: Date) {
  const now = Date.now();
  const diff = Math.max(0, target.getTime() - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
}

function formatCurrency(value: number, compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

function countDeltaLabel(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) return 'No change vs last month';
  return `${delta > 0 ? '+' : ''}${delta} vs last month`;
}

function avgValueDeltaLabel(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 'New average this month' : 'No value yet';
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% vs last month`;
}

export default function PrizesTab() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activePrize, setActivePrize] = useState<PrizeWithProfile | null>(null);
  const [recentWinners, setRecentWinners] = useState<PrizeWithProfile[]>([]);
  const [userPrize, setUserPrize] = useState<PrizeWithProfile | null>(null);
  const [summary, setSummary] = useState<PrizeSummary | null>(null);
  const [activeContext, setActiveContext] = useState<ActivePrizeContext | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [filter, setFilter] = useState<'all' | 'monthly' | 'weekly' | 'seasonal'>('all');
  const [showAllWinners, setShowAllWinners] = useState(false);
  const [countdown, setCountdown] = useState('-- : -- : --');

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }
      const res = await fetch('/api/prizes/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActivePrize(data.activePrize ?? null);
        setRecentWinners(Array.isArray(data.recentWinners) ? data.recentWinners : []);
        setUserPrize(data.userPrize ?? null);
        setSummary(data.summary ?? null);
        setActiveContext(data.activeContext ?? null);
      }
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchData();
    }, 5000);
    return () => window.clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    if (!activeContext?.countdownTarget) {
      setCountdown('-- : -- : --');
      return;
    }
    const end = new Date(activeContext.countdownTarget);
    if (Number.isNaN(end.getTime())) {
      setCountdown('-- : -- : --');
      return;
    }
    const tick = () => setCountdown(formatCountdown(end));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeContext?.countdownTarget]);

  const filteredWinners = useMemo(
    () => (filter === 'all' ? recentWinners : recentWinners.filter((w) => w.type === filter)),
    [filter, recentWinners]
  );

  const winnerName = (prize: PrizeWithProfile | null | undefined) => {
    const name = prize?.profiles?.display_name?.trim();
    return name && name.length > 0 ? name : null;
  };

  const leaderName = activeContext?.leader?.display_name || winnerName(activePrize) || winnerName(recentWinners[0]) || 'No leader yet';
  const hasLeader = leaderName !== 'No leader yet';
  const leaderPoints = activeContext?.leader?.total_points ?? activePrize?.winner_points ?? null;
  const myRank = activeContext?.currentUser?.rank ?? null;
  const myPoints = activeContext?.currentUser?.total_points ?? null;
  const gapToLeader = activeContext?.gapToLeader ?? null;
  const progressToLeader = activeContext?.progressToLeaderPct ?? 0;
  const participants = activeContext?.participants ?? 0;
  const periodLabel = activeContext?.periodLabel || activePrize?.period || 'N/A';
  const winnersToRender = filter === 'all' ? recentWinners : filteredWinners;
  const visibleWinners = showAllWinners ? winnersToRender : winnersToRender.slice(0, 6);
  const prizeHeadline = activePrize?.prize_description?.trim() || 'Prize details will appear after admin creates a contest.';
  const liveLabel = !activePrize
    ? 'NO ACTIVE CONTEST'
    : activePrize.status === 'pending'
      ? 'LIVE CONTEST'
      : 'LATEST RESULT';

  const currentMonthValue = (summary?.currentMonthAverageValue ?? 0) * (summary?.currentMonthPrizes ?? 0);
  const previousMonthValue = (summary?.previousMonthAverageValue ?? 0) * (summary?.previousMonthPrizes ?? 0);
  const valueDelta = currentMonthValue - previousMonthValue;

  const stats = useMemo(() => ([
    {
      label: 'Total Prizes',
      value: String(summary?.totalPrizes ?? 0),
      trend: countDeltaLabel(summary?.currentMonthPrizes ?? 0, summary?.previousMonthPrizes ?? 0),
    },
    {
      label: 'Total Value',
      value: formatCurrency(summary?.totalValue ?? 0, true),
      trend: `${valueDelta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(valueDelta), true)} vs last month`,
    },
    {
      label: 'Total Winners',
      value: String(summary?.totalWinners ?? 0),
      trend: countDeltaLabel(summary?.currentMonthWinners ?? 0, summary?.previousMonthWinners ?? 0),
    },
    {
      label: 'Avg Prize Value',
      value: formatCurrency(summary?.averageValue ?? 0, true),
      trend: avgValueDeltaLabel(summary?.currentMonthAverageValue ?? 0, summary?.previousMonthAverageValue ?? 0),
    },
  ]), [
    summary?.totalPrizes,
    summary?.currentMonthPrizes,
    summary?.previousMonthPrizes,
    summary?.totalValue,
    summary?.totalWinners,
    summary?.currentMonthWinners,
    summary?.previousMonthWinners,
    summary?.averageValue,
    summary?.currentMonthAverageValue,
    summary?.previousMonthAverageValue,
    valueDelta,
  ]);

  if (isInitialLoading) {
    return (
      <ModernLoader
        label="Loading Prize Data"
        sublabel="Syncing latest results from database..."
        minHeight="55vh"
      />
    );
  }

  return (
    <Box
      sx={{
        '& .MuiButton-root': {
          fontSize: '0.74rem',
        },
        '& .MuiChip-label': {
          fontSize: '0.66rem',
        },
        '& .ga-label': {
          color: '#6b7280',
          fontSize: '0.64rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        },
      }}
    >
      {userPrize && showBanner && (
        <Card sx={{ ...shellSx, mb: 2, background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none' }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Box sx={{ width: 42, height: 42, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EmojiEventsIcon sx={{ color: '#fff' }} />
                </Box>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={userPrize.status.toUpperCase()}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 800 }}
                    />
                    <Typography sx={{ color: '#dcfce7', fontSize: '0.78rem', fontWeight: 700 }}>
                      {userPrize.type.toUpperCase()} | {userPrize.period}
                    </Typography>
                  </Stack>
                   <Typography sx={{ color: '#dcfce7', fontSize: '0.78rem' }}>
                     Created {new Date(userPrize.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                   </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setShowBanner(false)} sx={{ minWidth: 0, p: 0.7, color: '#fff' }}>
                  <CloseIcon />
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
        <Typography sx={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900 }}>Active Prizes</Typography>
        <Chip
          label={liveLabel}
          size="small"
          sx={{
            bgcolor: activePrize ? 'rgba(22,163,74,0.16)' : 'rgba(148,163,184,0.16)',
            color: activePrize ? '#4ade80' : '#cbd5e1',
            fontWeight: 700,
          }}
        />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={shellSx}>
            <CardContent sx={{ p: 2.2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ color: '#22c55e', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.12em' }}>
                    {(activePrize?.type || 'prize').toUpperCase()} PRIZE | {periodLabel}
                  </Typography>
                  <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: { xs: '1.45rem', md: '1.95rem' }, lineHeight: 1.04, mt: 0.8 }}>
                    {prizeHeadline}
                  </Typography>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.84rem', mt: 1.3, maxWidth: 360 }}>
                    {activePrize?.status === 'pending'
                      ? 'Leaderboard values for this prize period are loaded directly from predictions data.'
                      : activePrize?.status === 'awarded'
                        ? 'Showing the latest awarded prize period from database records.'
                        : 'No pending prize exists right now. Ask admin to create a new prize period.'}
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={6}>
                      <Typography className="ga-label">Time remaining</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '1.45rem', fontWeight: 800 }}>{countdown}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography className="ga-label">Participants</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '1.45rem', fontWeight: 800 }}>{participants.toLocaleString('en-US')}</Typography>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#1e2330', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', height: '100%' }}>
                    <Box sx={{ width: 90, height: 90, borderRadius: '50%', mx: 'auto', backgroundColor: '#fde68a', border: '3px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', fontWeight: 900, fontSize: '1.2rem' }}>
                      {hasLeader ? leaderName.slice(0, 2).toUpperCase() : '--'}
                    </Box>
                    <Chip label="#1" size="small" sx={{ mt: 1, bgcolor: 'rgba(22,163,74,0.2)', color: '#4ade80', fontWeight: 800 }} />
                    <Typography sx={{ color: '#fff', fontSize: '1.65rem', fontWeight: 800, mt: 0.8 }}>{leaderName}</Typography>
                    <Typography sx={{ color: '#22c55e', fontSize: '1.7rem', fontWeight: 900, mt: 0.2 }}>
                      {hasLeader && leaderPoints != null ? leaderPoints.toLocaleString('en-US') : '--'}
                    </Typography>
                    <Typography sx={{ color: '#6b7280', fontSize: '0.67rem' }}>POINTS EARNED</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            <Card sx={shellSx}>
              <CardContent sx={{ p: 1.8 }}>
                <Typography className="ga-label" sx={{ mb: 0.7 }}>Current Leader</Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e7eb', fontSize: '0.72rem' }}>
                      {hasLeader ? leaderName.slice(0, 2).toUpperCase() : '--'}
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>{leaderName}</Typography>
                  </Stack>
                  <Typography sx={{ color: '#22c55e', fontWeight: 800 }}>
                    {hasLeader && leaderPoints != null ? leaderPoints.toLocaleString('en-US') : '--'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={shellSx}>
              <CardContent sx={{ p: 1.8 }}>
                <Typography className="ga-label" sx={{ mb: 1 }}>Your Position</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1.2, borderRadius: 1.5, backgroundColor: '#1e2330', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <Typography sx={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900 }}>{myRank != null ? `#${myRank}` : '--'}</Typography>
                      <Typography sx={{ color: '#6b7280', fontSize: '0.68rem' }}>RANK</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1.2, borderRadius: 1.5, backgroundColor: '#1e2330', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                      <Typography sx={{ color: '#22c55e', fontSize: '1.6rem', fontWeight: 900 }}>{myPoints != null ? myPoints.toLocaleString('en-US') : '--'}</Typography>
                      <Typography sx={{ color: '#6b7280', fontSize: '0.68rem' }}>POINTS</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Typography sx={{ color: '#6b7280', fontSize: '0.7rem', mt: 1 }}>GAP TO LEADER</Typography>
                <LinearProgress
                  variant="determinate"
                  value={progressToLeader}
                  sx={{
                    mt: 0.5,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#16a34a' },
                  }}
                />
                <Typography sx={{ color: '#6b7280', fontSize: '0.62rem', mt: 0.6 }}>
                  {myRank != null && gapToLeader != null
                    ? `Gap to leader: ${gapToLeader.toLocaleString('en-US')} points (${progressToLeader}% progress).`
                    : 'No prediction entry yet for this prize period.'}
                </Typography>
                <Button variant="contained" fullWidth href="/predictions" sx={{ mt: 1.2 }}>
                  Start Predicting To Win
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stats.map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={shellSx}>
              <CardContent sx={{ p: 1.6 }}>
                <Typography sx={{ color: '#fff', fontSize: '1.65rem', fontWeight: 900 }}>{s.value}</Typography>
                <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem' }}>{s.label}</Typography>
                <Chip label={s.trend} size="small" sx={{ mt: 0.8, bgcolor: 'rgba(22,163,74,0.15)', color: '#4ade80', fontWeight: 700, fontSize: '0.64rem' }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ ...shellSx, mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
             <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem' }}>How to Win Prizes</Typography>
            <Button size="small" href="/predictions" sx={{ color: '#22c55e', fontWeight: 700 }}>Start Predicting</Button>
          </Stack>
          <Grid container spacing={2} sx={{ mt: 0.8 }}>
            {[
              { n: '01', title: 'Make Predictions', color: '#22c55e', desc: 'Predict match scores before kick-off. The more accurate your predictions, the more points you earn.' },
              { n: '02', title: 'Climb the Leaderboard', color: '#eab308', desc: 'Accumulate points throughout the month or week to climb the rankings and compete for top positions.' },
              { n: '03', title: 'Win Amazing Prizes', color: '#a855f7', desc: 'Winners are determined from database-backed leaderboard scores for each prize period.' },
            ].map((s) => (
              <Grid item xs={12} md={4} key={s.n}>
                <Box sx={{ p: 1.4, borderRadius: 2, backgroundColor: '#1e2330', border: '1px solid rgba(255,255,255,0.06)', height: '100%' }}>
                  <Chip label={s.n} size="small" sx={{ bgcolor: `${s.color}22`, color: s.color, fontWeight: 800, mb: 1.2 }} />
                  <Typography sx={{ color: '#fff', fontWeight: 700 }}>{s.title}</Typography>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.74rem', mt: 0.8, lineHeight: 1.55 }}>{s.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={shellSx}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 1.2, gap: 1 }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem' }}>Recent Winners</Typography>
            <Stack direction="row" spacing={0.8}>
              {[
                { key: 'all', label: 'All Time' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'weekly', label: 'Weekly' },
                { key: 'seasonal', label: 'Seasonal' },
              ].map((f) => (
                <Button
                  key={f.key}
                  size="small"
                  onClick={() => setFilter(f.key as 'all' | 'monthly' | 'weekly' | 'seasonal')}
                  sx={{
                    px: 1.2,
                    minWidth: 0,
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.12)',
                     color: filter === f.key ? '#fff' : '#9ca3af',
                     backgroundColor: filter === f.key ? '#16a34a' : 'transparent',
                     fontSize: '0.7rem',
                   }}
                 >
                  {f.label}
                </Button>
              ))}
            </Stack>
          </Stack>

          <Grid container spacing={2}>
            {visibleWinners.length === 0 ? (
              <Grid item xs={12}>
                <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#1e2330', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <Typography sx={{ color: '#d1d5db', fontWeight: 700 }}>No winner yet</Typography>
                </Box>
              </Grid>
            ) : (
              visibleWinners.map((winner) => {
                const nm = winner.profiles?.display_name?.trim() || 'No winner yet';
                return (
                  <Grid item xs={12} md={6} lg={4} key={winner.id}>
                    <Box sx={{ p: 1.6, borderRadius: 2, backgroundColor: '#1e2330', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', fontWeight: 800, fontSize: '0.72rem' }}>
                            {nm.slice(0, 2).toUpperCase()}
                          </Box>
                          <Box>
                            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>{nm}</Typography>
                            <Typography sx={{ color: '#6b7280', fontSize: '0.68rem' }}>Winner</Typography>
                          </Box>
                        </Stack>
                        <Chip label={winner.type} size="small" sx={{ bgcolor: 'rgba(22,163,74,0.15)', color: '#4ade80', fontWeight: 700, textTransform: 'capitalize' }} />
                      </Stack>
                      <Typography sx={{ color: '#6b7280', fontSize: '0.68rem', mt: 1 }}>Prize Won</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem' }}>{winner.prize_description || 'Premium Reward'}</Typography>
                      <Typography sx={{ color: '#22c55e', fontWeight: 700, mt: 0.5, fontSize: '0.9rem' }}>
                        {winner.prize_value != null ? formatCurrency(winner.prize_value) : 'Value not specified'}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.68rem' }}>
                          {winner.winner_points != null ? `Points ${winner.winner_points}` : 'Points not available'}
                        </Typography>
                        <Typography sx={{ color: '#6b7280', fontSize: '0.68rem' }}>
                          {new Date(winner.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                      </Stack>
                    </Box>
                  </Grid>
                );
              })
            )}
          </Grid>

          {winnersToRender.length > 6 && (
            <Box sx={{ textAlign: 'center', mt: 1.6 }}>
              <Button
                onClick={() => setShowAllWinners((value) => !value)}
                sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, px: 2.2 }}
              >
                {showAllWinners ? 'SHOW LESS' : 'VIEW ALL WINNERS'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
