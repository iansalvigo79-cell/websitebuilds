"use client";

import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ModernLoader from '@/components/ui/ModernLoader';

interface AvailablePrize {
  id: string;
  type: string;
  period: string | null;
  prize_description: string | null;
  status: string;
  created_at: string;
  prize_matchday_id?: string | null;
  prize_matchday_label?: string | null;
  prize_value?: number | null;
  prize_value_display?: string | null;
  prize_value_label?: string | null;
  season_name?: string | null;
}

interface MyWin {
  id: string;
  prize_id: string;
  type: string | null;
  period: string | null;
  prize_description: string | null;
  prize_value?: number | null;
  prize_value_display?: string | null;
  prize_value_label?: string | null;
  points_achieved?: number | null;
  match_day_id?: string | null;
  match_day_label?: string | null;
  earned_at?: string | null;
  created_at?: string | null;
  season_name?: string | null;
}

const badgeStyles: Record<string, { background: string; color: string; border: string }> = {
  player: {
    background: 'rgba(139,92,246,0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.25)',
  },
  weekly: {
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.25)',
  },
  monthly: {
    background: 'rgba(251,191,36,0.12)',
    color: '#fbbf24',
    border: '1px solid rgba(251,191,36,0.2)',
  },
  seasonal: {
    background: 'rgba(16,185,129,0.12)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.2)',
  },
};

const statusLabels: Record<string, string> = {
  player: 'Open - ongoing',
  weekly: 'Resets every Monday',
  monthly: 'Resets 1st of each month',
  seasonal: 'Current season active',
};

const prizeOrder: Record<string, number> = {
  player: 0,
  weekly: 1,
  monthly: 2,
  seasonal: 3,
};

function formatMonthLabel(period: string | null) {
  if (!period) return 'Monthly prize';
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return period;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const date = new Date(Date.UTC(year, monthIndex, 1));
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatAwardedDate(dateStr?: string | null) {
  if (!dateStr) return '--';
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return '--';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function prizeTitle(type: string | null) {
  if (!type) return 'Prize';
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} prize`;
}

function prizeSubtitle(prize: AvailablePrize) {
  if (prize.type === 'weekly') return prize.period ? `Week of ${prize.period}` : 'Weekly prize';
  if (prize.type === 'monthly') return formatMonthLabel(prize.period);
  if (prize.type === 'seasonal') {
    return prize.season_name ? `Season ${prize.season_name}` : 'Seasonal prize';
  }
  if (prize.type === 'player') {
    return prize.prize_matchday_label ? `Matchday ${prize.prize_matchday_label}` : 'Ongoing player target';
  }
  return prize.period || 'Prize details';
}

function playerTarget(prize: AvailablePrize) {
  if (prize.type !== 'player') return null;
  const parsed = prize.period ? parseInt(prize.period, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export default function PrizesTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [availablePrizes, setAvailablePrizes] = useState<AvailablePrize[]>([]);
  const [myWins, setMyWins] = useState<MyWin[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'wins'>('available');
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .maybeSingle();
        const active = profile?.subscription_status === 'active';
        setIsPaidUser(active);
        setSubscriptionStatus(profile?.subscription_status ?? null);
      }

      const res = await fetch('/api/prizes/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAvailablePrizes(Array.isArray(data.availablePrizes) ? data.availablePrizes : []);
        setMyWins(Array.isArray(data.myWins) ? data.myWins : []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedAvailable = useMemo(() => {
    return [...availablePrizes].sort((a, b) => {
      const orderA = prizeOrder[a.type] ?? 99;
      const orderB = prizeOrder[b.type] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [availablePrizes]);

  if (isLoading) {
    return (
      <ModernLoader
        label="Loading Prizes"
        sublabel="Fetching the latest prize data..."
        minHeight="55vh"
      />
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ color: '#fff', fontSize: '1.4rem', fontWeight: 600 }}>Prizes</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
          Compete and win rewards for your prediction performance
        </Typography>
      </Box>

      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 2, mb: 2 }}>
        {[
          { key: 'available', label: 'Available prizes' },
          { key: 'wins', label: 'My wins' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Box
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'available' | 'wins')}
              sx={{
                cursor: 'pointer',
                pb: 1.2,
                color: isActive ? '#4ade80' : 'rgba(255,255,255,0.4)',
                borderBottom: isActive ? '2px solid #4ade80' : '2px solid transparent',
                marginBottom: '-1px',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {tab.label}
            </Box>
          );
        })}
      </Box>

      {activeTab === 'available' && (
        <Box>
          {!isPaidUser && (
            <Card
              sx={{
                backgroundColor: '#1a1000',
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '12px',
                mb: 2,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Box>
                    <Typography sx={{ color: '#fbbf24', fontSize: '13px', fontWeight: 500 }}>
                      Upgrade to Pro to compete for prizes
                    </Typography>
                    <Typography sx={{ color: 'rgba(251,191,36,0.5)', fontSize: '12px' }}>
                      All prizes below are available to paid subscribers only
                    </Typography>
                  </Box>
                  <Button
                    href="/subscription"
                    sx={{
                      background: '#fbbf24',
                      color: '#1a0a00',
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      px: 2.5,
                      '&:hover': { background: '#f59e0b' },
                    }}
                  >
                    Upgrade - \u00A35/month
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '1px',
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              mb: 1.5,
            }}
          >
            Open prizes
          </Typography>

          {sortedAvailable.length === 0 ? (
            <Card sx={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ color: '#d1d5db', fontWeight: 600 }}>
                  No active prizes right now. Check back soon.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {sortedAvailable.map((prize) => {
                const badge = badgeStyles[prize.type] || badgeStyles.weekly;
                const isLocked = !isPaidUser;
                const valueDisplay = prize.prize_value_display || '--';
                const valueLabel = prize.prize_value_label || prize.prize_description || 'Prize value';
                const target = playerTarget(prize);
                const conditionLabel = prize.prize_matchday_label
                  ? `Matchday ${prize.prize_matchday_label}`
                  : 'Matchday total';

                return (
                  <Grid item xs={12} sm={6} lg={4} key={prize.id}>
                    <Card
                      sx={{
                        backgroundColor: isLocked ? '#111' : '#141414',
                        border: isLocked ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '14px',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': isLocked
                          ? {
                              content: '""',
                              position: 'absolute',
                              inset: 0,
                              background:
                                'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.012) 8px, rgba(255,255,255,0.012) 16px)',
                              pointerEvents: 'none',
                              zIndex: 0,
                            }
                          : undefined,
                      }}
                    >
                      <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
                        <Box sx={{ opacity: isLocked ? 0.4 : 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                            <Box>
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  px: 1.2,
                                  py: 0.4,
                                  borderRadius: 999,
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                  ...badge,
                                }}
                              >
                                {prize.type} prize
                              </Box>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500, mt: 1 }}>
                                {prizeTitle(prize.type)}
                              </Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', mt: 0.5 }}>
                                {prizeSubtitle(prize)}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1.3rem', fontWeight: 600 }}>
                                {valueDisplay}
                              </Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                                {valueLabel}
                              </Typography>
                            </Box>
                          </Stack>

                          {prize.type === 'player' && (
                            <Box sx={{ mt: 1.4 }}>
                              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                                Target:{' '}
                                <Box component="span" sx={{ color: '#fbbf24', fontWeight: 600 }}>
                                  {target != null ? `${target} pts` : 'Target points'}
                                </Box>
                                {' '}· {conditionLabel} · Multiple winners possible
                              </Typography>
                            </Box>
                          )}

                          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.07)', mt: 1.4, mb: 1.4 }} />

                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#4ade80' }} />
                              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>
                                {statusLabels[prize.type] || 'Open'}
                              </Typography>
                            </Stack>
                            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
                              Paid players only
                            </Typography>
                          </Stack>
                        </Box>

                        {isLocked && (
                          <Box
                            sx={{
                              borderTop: '1px solid rgba(255,255,255,0.07)',
                              pt: 1.4,
                              mt: 1.4,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                              Upgrade to Pro to compete for this prize
                            </Typography>
                            <Button
                              size="small"
                              href="/subscription"
                              sx={{
                                border: '1px solid #fbbf24',
                                color: '#fbbf24',
                                textTransform: 'none',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                px: 1.6,
                                '&:hover': { borderColor: '#f59e0b', backgroundColor: 'rgba(251,191,36,0.08)' },
                              }}
                            >
                              Upgrade to unlock
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          <Card sx={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, mb: 1.6 }}>
                How prizes work
              </Typography>
              <Grid container spacing={2}>
                {[
                  {
                    n: '01',
                    title: 'Make predictions',
                    desc: 'Submit your combined totals before each matchday cutoff',
                  },
                  {
                    n: '02',
                    title: 'Earn points',
                    desc: 'The more accurate your predictions the more points you score',
                  },
                  {
                    n: '03',
                    title: 'Win prizes',
                    desc: 'Top scorers in each period are awarded by the admin',
                  },
                ].map((step) => (
                  <Grid item xs={12} sm={4} key={step.n}>
                    <Box
                      sx={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        p: 1.6,
                        height: '100%',
                      }}
                    >
                      <Typography sx={{ fontSize: '11px', color: '#4ade80', mb: 0.6 }}>
                        Step {step.n}
                      </Typography>
                      <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#fff', mb: 0.6 }}>
                        {step.title}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                        {step.desc}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === 'wins' && (
        <Box>
          {myWins.length === 0 ? (
            <Card
              sx={{
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    mx: 'auto',
                    mb: 1.5,
                  }}
                />
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                  No wins yet
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.25)', mt: 0.6 }}>
                  Keep predicting - your wins will appear here when awarded
                </Typography>
                {!isPaidUser && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      href="/subscription"
                      sx={{
                        border: '1px solid #fbbf24',
                        color: '#fbbf24',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 2.2,
                        '&:hover': { borderColor: '#f59e0b', backgroundColor: 'rgba(251,191,36,0.08)' },
                      }}
                    >
                      Upgrade to compete
                    </Button>
                    {subscriptionStatus && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', mt: 0.8 }}>
                        Your account is {subscriptionStatus}.
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {myWins.map((win) => {
                const badge = badgeStyles[win.type || 'weekly'] || badgeStyles.weekly;
                const valueDisplay = win.prize_value_display || '--';
                const valueLabel = win.prize_value_label || win.prize_description || 'Prize value';
                const pointsLabel = win.points_achieved != null ? `${win.points_achieved} pts` : 'Points not available';
                let meta = `${pointsLabel}`;
                if (win.type === 'player') {
                  const matchLabel = win.match_day_label ? win.match_day_label : 'matchday';
                  meta = `Achieved on: ${matchLabel} · ${pointsLabel} scored`;
                } else if (win.type === 'weekly') {
                  meta = `Week of ${win.period || 'current week'} · ${pointsLabel}`;
                } else if (win.type === 'monthly') {
                  meta = `${formatMonthLabel(win.period)} · ${pointsLabel}`;
                } else if (win.type === 'seasonal') {
                  const seasonLabel = win.season_name ? `Season ${win.season_name}` : `Season ${win.period || ''}`.trim();
                  meta = `${seasonLabel} · ${pointsLabel}`;
                }

                return (
                  <Grid item xs={12} sm={6} lg={4} key={win.id}>
                    <Card
                      sx={{
                        backgroundColor: '#141414',
                        border: '1px solid rgba(74,222,128,0.2)',
                        borderRadius: '14px',
                      }}
                    >
                      <CardContent sx={{ p: 2.4 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 1.2,
                                py: 0.4,
                                borderRadius: 999,
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                ...badge,
                              }}
                            >
                              {win.type || 'prize'}
                            </Box>
                            <Typography sx={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500, mt: 1 }}>
                              {prizeTitle(win.type)}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', mt: 0.4 }}>
                              {meta}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ color: '#4ade80', fontSize: '1.25rem', fontWeight: 600 }}>
                              {valueDisplay}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>
                              {valueLabel}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', mt: 0.6 }}>
                              {formatAwardedDate(win.earned_at || win.created_at || null)}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}
