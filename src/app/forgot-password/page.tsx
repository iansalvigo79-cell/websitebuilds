"use client";

import { Box, Button, Container, TextField, Typography, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import ModernLoader from '@/components/ui/ModernLoader';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      });
      if (err) {
        toast.error(err.message);
        setError(err.message);
        setIsLoading(false);
        return;
      }
      setSent(true);
      toast.success('Check your email for the reset link.');
    } catch (err) {
      toast.error('Something went wrong');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
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
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
            Reset password
          </Typography>
          <Typography sx={{ color: '#999', fontSize: '0.95rem' }}>
            Enter your email and we&apos;ll send you a link to reset your password.
          </Typography>
        </Box>

        {sent ? (
          <Stack spacing={2}>
            <Typography sx={{ color: '#16a34a' }}>
              If an account exists for that email, you will receive a reset link shortly.
            </Typography>
            <Button component={Link} href="/signin" variant="contained" sx={{ backgroundColor: '#16a34a', color: '#fff' }}>
              Back to Sign in
            </Button>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!error}
                helperText={error}
                fullWidth
                autoFocus
                sx={{
                  '& .MuiOutlinedInput-root': { backgroundColor: '#1a1a1a', color: '#fff' },
                  '& .MuiInputLabel-root': { color: '#999' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                endIcon={isLoading ? <ModernLoader inline size={20} label="" sublabel="" /> : <ArrowForwardIcon />}
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#0f0505',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: '#137f2d' },
                }}
              >
                {isLoading ? 'Sending…' : 'Send reset link'}
              </Button>
              <Button component={Link} href="/signin" sx={{ color: '#999', textTransform: 'none' }}>
                ← Back to Sign in
              </Button>
            </Stack>
          </form>
        )}
      </Container>
    </Box>
  );
}
