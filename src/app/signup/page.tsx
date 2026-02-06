"use client";

import { Box, Button, Container, TextField, Typography, Stack, Checkbox, FormControlLabel, Select, MenuItem, FormControl } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Team } from '@/types/database';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    displayName: '',
    teamName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({
    displayName: '',
    teamName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Supabase Teams Error (signup):', error);
          toast.error('Error loading teams: ' + error.message);
          setLoadingTeams(false);
          return;
        }

        if (data) {
          setTeams(data);
        }
      } catch (err) {
        console.error('Unexpected Error loading teams (signup):', err);
        toast.error('An error occurred while loading teams');
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      displayName: '',
      teamName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: '',
    };

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 3) {
      newErrors.displayName = 'Display name must be at least 3 characters';
    }

    if (!formData.teamName) {
      newErrors.teamName = 'Please select a team';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and privacy policy';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    const type = 'type' in e.target ? e.target.type : undefined;
    const checked = 'checked' in e.target ? e.target.checked : undefined;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (typeof value === 'string' ? value : String(value)),
    }));
    // Clear error when user changes value
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        console.error('Supabase Auth Error (signup):', authError);
        toast.error(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // Create profile in profiles table
        // Display name is always "Player"
        // Save team_id (the selected team's ID)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            display_name: 'Player',
            team_id: formData.teamName,
            subscription_status: 'inactive',
          });

        if (profileError) {
          console.error('Supabase Profile Error (signup):', profileError);
          toast.error('Error creating profile: ' + profileError.message);
          setIsLoading(false);
          return;
        }

        toast.success('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/signin');
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected Error (signup):', err);
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Box
      className="anim-fade-up"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2rem', md: '2.5rem' },
              mb: 1,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Join{' '}
            <Box
              component="span"
              sx={{
                color: '#16a34a',
                textShadow: '0 0 20px rgba(22, 163, 74, 0.38)',
              }}
            >
              THE GAME
            </Box>
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#999',
              fontSize: '0.95rem',
              letterSpacing: 0.5,
            }}
          >
            Create your account and start predicting
          </Typography>
        </Box>

        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Display Name
              </Typography>
              <TextField
                name="displayName"
                placeholder="Enter your display name"
                variant="outlined"
                fullWidth
                value={formData.displayName}
                onChange={handleChange}
                error={!!errors.displayName}
                helperText={errors.displayName}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: errors.displayName ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.displayName ? '#ff6b6b' : 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.displayName ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.displayName ? '#ff6b6b' : '#16a34a',
                    marginTop: '4px',
                  },
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Team
              </Typography>
              <FormControl
                fullWidth
                error={!!errors.teamName}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: errors.teamName ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.teamName ? '#ff6b6b' : 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.teamName ? '#ff6b6b' : '#16a34a',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#888',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#16a34a',
                  },
                  '& .MuiSelect-icon': {
                    color: '#fff',
                  },
                }}
              >
                <Select
                  name="teamName"
                  value={formData.teamName}
                  onChange={(e) => handleChange({ target: { name: 'teamName', value: e.target.value } })}
                  displayEmpty
                  disabled={loadingTeams}
                  sx={{
                    color: '#fff',
                    '& .MuiSelect-select': {
                      padding: '14px',
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    <em>Select a team</em>
                  </MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id} sx={{ color: '#fff' }}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {errors.teamName && (
                <Typography sx={{ color: '#ff6b6b', fontSize: '0.75rem', mt: 0.5 }}>
                  {errors.teamName}
                </Typography>
              )}
              {!errors.teamName && (
                <Typography sx={{ color: '#999', fontSize: '0.75rem', mt: 0.5 }}>
                  This will be displayed on the leaderboard
                </Typography>
              )}
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Email Address
              </Typography>
              <TextField
                name="email"
                placeholder="Enter your email"
                type="email"
                variant="outlined"
                fullWidth
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: errors.email ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.email ? '#ff6b6b' : 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.email ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.email ? '#ff6b6b' : '#16a34a',
                    marginTop: '4px',
                  },
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Password
              </Typography>
              <TextField
                name="password"
                placeholder="Create a password"
                type="password"
                variant="outlined"
                fullWidth
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: errors.password ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.password ? '#ff6b6b' : 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.password ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.password ? '#ff6b6b' : '#16a34a',
                    marginTop: '4px',
                  },
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mb: 1,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Confirm Password
              </Typography>
              <TextField
                name="confirmPassword"
                placeholder="Confirm your password"
                type="password"
                variant="outlined"
                fullWidth
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: errors.confirmPassword ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    '&:hover': {
                      borderColor: errors.confirmPassword ? '#ff6b6b' : 'rgba(255, 255, 255, 0.3)',
                    },
                    '&.Mui-focused': {
                      borderColor: errors.confirmPassword ? '#ff6b6b' : '#16a34a',
                    },
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#888',
                    opacity: 1,
                  },
                  '& .MuiFormHelperText-root': {
                    color: errors.confirmPassword ? '#ff6b6b' : '#16a34a',
                    marginTop: '4px',
                  },
                }}
              />
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    sx={{
                      color: errors.termsAccepted ? '#ff6b6b' : '#16a34a',
                      '&.Mui-checked': {
                        color: errors.termsAccepted ? '#ff6b6b' : '#16a34a',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>
                    I agree to the{' '}
                    <Box
                      component="span"
                      sx={{ color: '#16a34a', cursor: 'pointer', textDecoration: 'none' }}
                    >
                      Terms of Service
                    </Box>
                    {' '}and{' '}
                    <Box
                      component="span"
                      sx={{ color: '#16a34a', cursor: 'pointer', textDecoration: 'none' }}
                    >
                      Privacy Policy
                    </Box>
                  </Typography>
                }
              />
              {errors.termsAccepted && (
                <Typography sx={{ color: '#ff6b6b', fontSize: '0.75rem', mt: 0.5 }}>
                  {errors.termsAccepted}
                </Typography>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              disabled={isLoading}
              sx={{
                backgroundColor: isLoading ? '#666' : '#16a34a',
                color: '#0f0505',
                fontWeight: 900,
                fontSize: '1rem',
                padding: '14px 24px',
                borderRadius: '8px',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                transition: 'background-color 0.3s ease',
                mt: 2,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: isLoading ? '#666' : '#137f2d',
                  transform: 'none',
                },
                '&:active': {
                  transform: 'none',
                },
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Typography variant="body2" sx={{ color: '#999', fontSize: '0.9rem' }}>
                Already have an account?{' '}
                <Link href="/signin" style={{ color: '#16a34a', textDecoration: 'none' }}>
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Stack>
        </form>
      </Container>
    </Box>
  );
}
