"use client";

import { Box, Button, Container, TextField, Typography, Stack, CircularProgress } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        toast.error(err.message);
        setError(err.message);
        setIsLoading(false);
        return;
      }
      toast.success('Password updated. Sign in with your new password.');
      router.push('/signin');
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
            Set new password
          </Typography>
          <Typography sx={{ color: '#999', fontSize: '0.95rem' }}>
            Enter your new password below.
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              inputProps={{ minLength: 8 }}
              sx={{
                '& .MuiOutlinedInput-root': { backgroundColor: '#1a1a1a', color: '#fff' },
                '& .MuiInputLabel-root': { color: '#999' },
              }}
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={!!error}
              helperText={error}
              fullWidth
              required
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
              sx={{
                backgroundColor: '#16a34a',
                color: '#0f0505',
                fontWeight: 700,
                '&:hover': { backgroundColor: '#137f2d' },
              }}
            >
              {isLoading ? <CircularProgress size={24} sx={{ color: '#0f0505' }} /> : 'Update password'}
            </Button>
            <Button component={Link} href="/signin" sx={{ color: '#999', textTransform: 'none' }}>
              ← Back to Sign in
            </Button>
          </Stack>
        </form>
      </Container>
    </Box>
  );
}
