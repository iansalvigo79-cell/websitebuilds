"use client";

import { Box, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Card } from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/types/database';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seasonName, setSeasonName] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get active season
      const { data: seasonData, error: seasonError } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (seasonError && seasonError.code !== 'PGRST116') {
        console.error('Supabase Season Error (leaderboard):', seasonError);
      }

      if (seasonData) {
        setSeasonName(seasonData.name);
      }

      // Fetch leaderboard data - team name and total points
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('predictions')
        .select(`
          user_id,
          points,
          profiles!inner(team_name)
        `)
        .not('points', 'is', null);

      if (leaderboardError) {
        console.error('Supabase Leaderboard Error:', leaderboardError);
      }

      if (leaderboardData && leaderboardData.length > 0) {
        // Group by user and sum points
        const grouped: { [key: string]: { team_name: string; total_points: number; predictions_count: number } } = {};

        leaderboardData.forEach((pred: any) => {
          const userId = pred.user_id;
          if (!grouped[userId]) {
            grouped[userId] = {
              team_name: pred.profiles?.team_name || 'Unknown Team',
              total_points: 0,
              predictions_count: 0,
            };
          }
          grouped[userId].total_points += pred.points || 0;
          grouped[userId].predictions_count += 1;
        });

        // Convert to array and sort by points
        const leaderboardArray: LeaderboardEntry[] = Object.entries(grouped).map(([userId, data], index) => ({
          user_id: userId,
          team_name: data.team_name,
          total_points: data.total_points,
          predictions_count: data.predictions_count,
          rank: index + 1,
        }));

        leaderboardArray.sort((a, b) => b.total_points - a.total_points);

        // Update ranks after sorting
        leaderboardArray.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        setLeaderboard(leaderboardArray);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setIsLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return rank;
    }
  };

  return (
    <Box className="anim-fade-up" sx={{ minHeight: '100vh', backgroundColor: '#0a0a0a', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <EmojiEventsIcon sx={{ fontSize: '2.5rem', color: '#16a34a' }} />
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff' }}>
              Season Leaderboard
            </Typography>
          </Box>
          {seasonName && (
            <Typography sx={{ color: '#999', fontSize: '1.1rem' }}>
              {seasonName}
            </Typography>
          )}
        </Box>

        {isLoading ? (
          <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>Loading leaderboard...</Typography>
        ) : leaderboard.length === 0 ? (
          <Typography sx={{ color: '#16a34a', textAlign: 'center', py: 4, fontSize: '1rem' }}>
            No predictions scored yet. Check back soon!
          </Typography>
        ) : (
          <Card sx={{ backgroundColor: 'rgba(30, 10, 10, 0.6)', border: '2px solid #ffffff', overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#16a34a', fontWeight: 700, fontSize: '0.95rem' }}>Rank</TableCell>
                    <TableCell sx={{ color: '#16a34a', fontWeight: 700, fontSize: '0.95rem' }}>Team Name</TableCell>
                    <TableCell align="right" sx={{ color: '#16a34a', fontWeight: 700, fontSize: '0.95rem' }}>Total Points</TableCell>
                    <TableCell align="right" sx={{ color: '#16a34a', fontWeight: 700, fontSize: '0.95rem' }}>Predictions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboard.map((entry) => (
                    <TableRow
                      key={entry.user_id}
                      sx={{
                        backgroundColor: entry.rank <= 3 ? 'rgba(22, 163, 74, 0.05)' : 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                          backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        },
                      }}
                    >
                      <TableCell sx={{ color: '#fff', fontWeight: entry.rank <= 3 ? 700 : 400, fontSize: '1.1rem' }}>
                        {getMedalIcon(entry.rank)}
                      </TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 600 }}>{entry.team_name}</TableCell>
                      <TableCell align="right" sx={{ color: '#16a34a', fontWeight: 700, fontSize: '1.1rem' }}>
                        {entry.total_points}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#999' }}>{entry.predictions_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Container>
    </Box>
  );
}
