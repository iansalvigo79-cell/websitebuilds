"use client";

import { Box, Container, Typography, Stack, Button, Card, CardContent, TextField, Button as MuiButton } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchDay, Game, Prediction, Profile } from '@/types/database';
import { toast } from 'react-toastify';


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentMatchDay, setCurrentMatchDay] = useState<MatchDay | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [prediction, setPrediction] = useState<string>('');
  const [existingPrediction, setExistingPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [predictionError, setPredictionError] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/signin');
          return;
        }

        setUser(authUser);

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profileData) {
          console.error('Supabase Profile Error (dashboard):', profileError);
          toast.error('Error loading profile');
          setIsLoading(false);
          return;
        }

        setProfile(profileData);

        // Check subscription status
        if (profileData.subscription_status !== 'active') {
          router.push('/paywall');
          return;
        }

        // Fetch today's match day
        const { data: matchDayData, error: matchDayError } = await supabase
          .from('match_days')
          .select('*')
          .eq('is_open', true)
          .order('match_date', { ascending: false })
          .limit(1)
          .single();

        if (matchDayError || !matchDayData) {
          console.error('Supabase MatchDay Error (dashboard):', matchDayError);
          toast.error('No active match day at the moment');
          setIsLoading(false);
          return;
        }

        setCurrentMatchDay(matchDayData);

        // Fetch games for this match day
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .eq('match_day_id', matchDayData.id)
          .order('kickoff_at');

        if (gamesError) {
          console.error('Supabase Games Error (dashboard):', gamesError);
        }

        if (gamesData) {
          setGames(gamesData);
        }

        // Check if user already has a prediction for this match day
        const { data: existingPred, error: predictionFetchError } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('match_day_id', matchDayData.id)
          .single();

        if (predictionFetchError && predictionFetchError.code !== 'PGRST116') {
          console.error('Supabase Prediction Fetch Error (dashboard):', predictionFetchError);
        }

        if (existingPred) {
          setExistingPrediction(existingPred);
          setPrediction(existingPred.predicted_total_goals.toString());
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Unexpected Error (dashboard checkAuth):', err);
        toast.error('An error occurred');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentMatchDay) {
      const isClosed = new Date(currentMatchDay.cutoff_at) <= new Date();
      if (isClosed) {
        toast.warning('This match day has closed. Predictions are locked.');
      }
    }
  }, [currentMatchDay]);

  const handleSubmitPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredictionError('');

    if (!user || !currentMatchDay || !prediction) {
      setPredictionError('Please enter a prediction');
      return;
    }

    const predictedGoals = parseInt(prediction);
    if (isNaN(predictedGoals) || predictedGoals < 0) {
      setPredictionError('Please enter a valid number');
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingPrediction) {
        // Update existing prediction
        const { error } = await supabase
          .from('predictions')
          .update({ predicted_total_goals: predictedGoals })
          .eq('id', existingPrediction.id);

        if (error) {
          console.error('Supabase Prediction Update Error (dashboard):', error);
          toast.error('Error updating prediction: ' + error.message);
          setIsSubmitting(false);
          return;
        }

        toast.success('Prediction updated successfully!');
      } else {
        // Create new prediction
        const { error } = await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            match_day_id: currentMatchDay.id,
            predicted_total_goals: predictedGoals,
          });

        if (error) {
          console.error('Supabase Prediction Create Error (dashboard):', error);
          toast.error('Error creating prediction: ' + error.message);
          setIsSubmitting(false);
          return;
        }

        toast.success('Prediction submitted successfully!');
        setExistingPrediction({
          id: '',
          user_id: user.id,
          match_day_id: currentMatchDay.id,
          predicted_total_goals: predictedGoals,
          points: null,
          created_at: new Date().toISOString()
        });
      }

    } catch (err) {
      console.error('Unexpected Error (dashboard prediction):', err);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
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

  const isMatchDayClosed = currentMatchDay && new Date(currentMatchDay.cutoff_at) <= new Date();

  return (
    <Box className="anim-fade-up" sx={{ minHeight: '100vh', backgroundColor: '#0a0a0a', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#fff', mb: 1 }}>
              {profile?.team_name}
            </Typography>
            <Typography sx={{ color: '#999' }}>Welcome back, {profile?.display_name}</Typography>
          </Box>
          <MuiButton
            variant="outlined"
            sx={{ color: '#16a34a', borderColor: '#16a34a' }}
            onClick={handleLogout}
          >
            Logout
          </MuiButton>
        </Box>


        {currentMatchDay && (
          <Card sx={{ backgroundColor: 'rgba(30, 10, 10, 0.6)', border: '2px solid #ffffff', mb: 4 }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#16a34a', mb: 2 }}>
                Match Day - {new Date(currentMatchDay.match_date).toLocaleDateString()}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: '#999', fontSize: '0.9rem', mb: 2 }}>
                  {games.length} games happening
                </Typography>
                <Stack spacing={1}>
                  {games.map((game) => (
                    <Box key={game.id} sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                        {game.home_team} vs {game.away_team}
                      </Typography>
                      <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
                        Kickoff: {new Date(game.kickoff_at).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {isMatchDayClosed ? (
                <Typography sx={{ mb: 3, color: '#ffa500', fontSize: '0.9rem' }}>
                  This match day has closed. Predictions are locked.
                </Typography>
              ) : (
                <form onSubmit={handleSubmitPrediction}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, mb: 1, textTransform: 'uppercase' }}>
                        Predict Total Goals
                      </Typography>
                      <TextField
                        type="number"
                        placeholder="Enter total goals prediction"
                        value={prediction}
                        onChange={(e) => {
                          setPrediction(e.target.value);
                          if (predictionError) {
                            setPredictionError('');
                          }
                        }}
                        disabled={isMatchDayClosed || !!existingPrediction}
                        error={!!predictionError}
                        helperText={predictionError}
                        inputProps={{ min: '0' }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#1a1a1a',
                            borderRadius: '8px',
                            border: predictionError ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            '&:hover': {
                              borderColor: predictionError ? '#ff6b6b' : 'rgba(255, 255, 255, 0.3)',
                            },
                            '&.Mui-focused': {
                              borderColor: predictionError ? '#ff6b6b' : '#16a34a',
                            },
                            '&.Mui-disabled': {
                              backgroundColor: '#0a0a0a',
                              color: '#666',
                            },
                          },
                          '& .MuiFormHelperText-root': {
                            color: predictionError ? '#ff6b6b' : '#16a34a',
                            marginTop: '4px',
                          },
                        }}
                        fullWidth
                      />
                      {!predictionError && (
                        <Typography sx={{ color: '#999', fontSize: '0.75rem', mt: 1 }}>
                          Predictions close at {new Date(currentMatchDay.cutoff_at).toLocaleString()}
                        </Typography>
                      )}
                    </Box>

                    {!isMatchDayClosed && (
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting || !prediction}
                        sx={{
                          backgroundColor: '#16a34a',
                          color: '#0f0505',
                          fontWeight: 900,
                          '&:hover': { backgroundColor: '#137f2d' },
                        }}
                      >
                        {isSubmitting ? 'Submitting...' : existingPrediction ? 'Update Prediction' : 'Submit Prediction'}
                      </Button>
                    )}
                  </Stack>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
}
