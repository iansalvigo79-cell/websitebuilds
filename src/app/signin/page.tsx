"use client";

import { Box, Button, Container, TextField, Typography, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

export default function SignInPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
    };

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

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Supabase Auth Error (signin):', error);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        toast.success('Success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (err) {
      console.error('Unexpected Error (signin):', err);
      toast.error('An unexpected error occurred');
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
            Welcome{' '}
            <Box
              component="span"
              sx={{
                color: '#16a34a',
                textShadow: '0 0 20px rgba(22, 163, 74, 0.38)',
              }}
            >
              BACK
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
            Sign in to continue predicting and winning
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
                placeholder="Enter your password"
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

            <Box sx={{ textAlign: 'right' }}>
              <Link href="#" style={{ color: '#16a34a', textDecoration: 'none', fontSize: '0.85rem' }}>
                Forgot password?
              </Link>
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
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Typography variant="body2" sx={{ color: '#999', fontSize: '0.9rem' }}>
                Don&apos;t have an account?{' '}
                <Link href="/signup" style={{ color: '#16a34a', textDecoration: 'none' }}>
                  Join Now
                </Link>
              </Typography>
            </Box>
          </Stack>
        </form>
      </Container>
    </Box>
  );
}
